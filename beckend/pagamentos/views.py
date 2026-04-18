import logging
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Pagamento, Comprovante, Cartao, PAGAMENTO_APROVADO, PAGAMENTO_RECUSADO
from .serializers import (
    PagamentoSerializer,
    CriarPagamentoSerializer,
    StatusPagamentoSerializer,
)
from .mercado_pago_service import mercado_pago_service

logger = logging.getLogger(__name__)


class CriarPagamentoAPIView(APIView):
    """
    Cria um novo pagamento.
    
    POST /api/pagamento/
    
    Body esperado:
    {
        "valor": 100.00,
        "tipo_pagamento": "pix",  # pix, cartao ou boleto
        "items": [...],
        "notas_cliente": "...",
        "endereco_entrega": {...}
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Cria um novo pagamento."""
        try:
            # Valida os dados de entrada
            serializer = CriarPagamentoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            valor = serializer.validated_data['valor']
            tipo_pagamento = serializer.validated_data['tipo_pagamento']
            items = serializer.validated_data.get('items', [])
            notas_cliente = serializer.validated_data.get('notas_cliente', '')
            endereco_entrega = serializer.validated_data.get('endereco_entrega', {})
            
            usuario = request.user
            
            # Cria o pagamento no banco de dados
            pagamento = Pagamento.objects.create(
                usuario=usuario,
                valor=valor,
                tipo_pagamento=tipo_pagamento,
                metadata={
                    'items': items,
                    'endereco_entrega': endereco_entrega,
                }
            )
            
            # Chama o serviço apropriado
            if tipo_pagamento == 'pix':
                sucesso, dados = mercado_pago_service.criar_pagamento_pix(
                    valor=valor,
                    usuario_id=usuario.id,
                    email=usuario.email,
                    metadata={'pagamento_id': str(pagamento.id_pagamento)}
                )
            elif tipo_pagamento == 'cartao':
                # Para cartão, seria necessário um token do cliente
                sucesso, dados = False, {'erro': 'Token de cartão não fornecido'}
            elif tipo_pagamento == 'boleto':
                sucesso, dados = mercado_pago_service.criar_pagamento_boleto(
                    valor=valor,
                    usuario_id=usuario.id,
                    email=usuario.email,
                    metadata={'pagamento_id': str(pagamento.id_pagamento)}
                )
            else:
                return Response(
                    {'erro': 'Tipo de pagamento inválido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if sucesso:
                # Atualiza o pagamento com os dados do Mercado Pago
                pagamento.mercado_pago_id = dados.get('mercado_pago_id')
                pagamento.qr_code_url = dados.get('qr_code_url')
                pagamento.copia_cola = dados.get('copia_cola')
                
                # Tenta converter a imagem para base64
                if pagamento.qr_code_url:
                    base64_img = mercado_pago_service.converter_imagem_para_base64(
                        pagamento.qr_code_url
                    )
                    if base64_img:
                        pagamento.qr_code_base64 = base64_img
                
                pagamento.dados_adicionais = dados
                pagamento.save()
                
                # Cria o comprovante
                if items:
                    Comprovante.objects.create(
                        pagamento=pagamento,
                        usuario=usuario,
                        dados_compra=endereco_entrega,
                        itens=items,
                        valor_total=valor,
                        notas_cliente=notas_cliente,
                    )
                
                # Serializa e retorna a resposta
                serializer_response = PagamentoSerializer(pagamento)
                return Response(
                    serializer_response.data,
                    status=status.HTTP_201_CREATED
                )
            else:
                # Erro ao criar pagamento
                pagamento.mensagem_erro = str(dados.get('erro', 'Erro desconhecido'))
                pagamento.save()
                
                return Response(
                    {
                        'erro': 'Erro ao processar pagamento',
                        'detalhes': dados.get('erro'),
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            logger.exception(f"Erro ao criar pagamento: {e}")
            return Response(
                {'erro': 'Erro ao processar a solicitação'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StatusPagamentoAPIView(APIView):
    """
    Verifica o status de um pagamento.
    
    GET /api/pagamento/status/{id_pagamento}/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, id_pagamento, *args, **kwargs):
        """Verifica o status de um pagamento."""
        try:
            # Busca o pagamento
            try:
                pagamento = Pagamento.objects.get(
                    id_pagamento=id_pagamento,
                    usuario=request.user
                )
            except Pagamento.DoesNotExist:
                return Response(
                    {'erro': 'Pagamento não encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Se o pagamento não foi verificado no Mercado Pago ainda
            if pagamento.mercado_pago_id:
                sucesso, dados = mercado_pago_service.verificar_status_pagamento(
                    pagamento.mercado_pago_id
                )
                
                if sucesso:
                    novo_status = dados.get('status')
                    
                    # Atualiza o status no banco de dados
                    if novo_status == 'approved':
                        pagamento.marcar_como_aprovado()
                    elif novo_status == 'rejected':
                        pagamento.marcar_como_recusado(dados.get('status_detail', ''))
                    else:
                        pagamento.status = 'pendente'
                        pagamento.save()
            
            # Retorna os dados do pagamento
            serializer = PagamentoSerializer(pagamento)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.exception(f"Erro ao verificar status: {e}")
            return Response(
                {'erro': 'Erro ao verificar status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ListarPagamentosAPIView(APIView):
    """
    Lista todos os pagamentos do usuário.
    
    GET /api/pagamento/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """Lista os pagamentos do usuário autenticado."""
        try:
            pagamentos = Pagamento.objects.filter(usuario=request.user)
            serializer = PagamentoSerializer(pagamentos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.exception(f"Erro ao listar pagamentos: {e}")
            return Response(
                {'erro': 'Erro ao listar pagamentos'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
def webhook_mercado_pago(request):
    """
    Webhook para notificações do Mercado Pago.
    Atualiza o status do pagamento quando recebe notificações.
    """
    try:
        # Verifica o tipo de notificação
        tipo_notificacao = request.data.get('type')
        dados = request.data.get('data', {})
        
        if tipo_notificacao == 'payment':
            mercado_pago_id = dados.get('id')
            
            # Busca o pagamento no banco
            try:
                pagamento = Pagamento.objects.get(mercado_pago_id=mercado_pago_id)
            except Pagamento.DoesNotExist:
                return Response(
                    {'status': 'pagamento não encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verifica o status no Mercado Pago
            sucesso, dados_status = mercado_pago_service.verificar_status_pagamento(
                mercado_pago_id
            )
            
            if sucesso:
                status_mp = dados_status.get('status')
                
                if status_mp == 'approved':
                    pagamento.marcar_como_aprovado()
                    logger.info(f"Pagamento {mercado_pago_id} aprovado via webhook")
                elif status_mp == 'rejected':
                    pagamento.marcar_como_recusado(dados_status.get('status_detail', ''))
                    logger.info(f"Pagamento {mercado_pago_id} recusado via webhook")
        
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.exception(f"Erro no webhook: {e}")
        return Response(
            {'erro': 'Erro ao processar webhook'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

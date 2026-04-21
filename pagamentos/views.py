import logging
from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Pagamento, Comprovante, Cartao, TransacaoAuditoria
from .serializers import (
    PagamentoListSerializer,
    PagamentoDetailSerializer,
    PagamentoCreateSerializer,
    ComprovanteSerializer,
    CartaoSerializer,
    CartaoCreateSerializer,
    TransacaoAuditoriaSerializer,
    PagamentoStatusResponseSerializer,
    PagamentoQRCodeResponseSerializer,
)

logger = logging.getLogger(__name__)

# Tentar usar serviço real, com fallback para Mock
def get_mercado_pago_service():
    """
    Retorna MercadoPagoService real ou Mock dependendo da disponibilidade
    Em ambiente sem internet real, usa Mock automaticamente
    """
    import os
    
    # Se estiver em desenvolvimento/teste, usa sempre Mock
    if os.getenv('DEBUG') == 'True' or os.getenv('ENVIRONMENT') == 'development':
        logger.warning('🧪 MODO DESENVOLVIMENTO: Usando MercadoPagoServiceMock')
        from .services_mock import MercadoPagoServiceMock
        return MercadoPagoServiceMock()
    
    try:
        from .services import MercadoPagoService
        logger.info('✅ Usando MercadoPagoService REAL')
        return MercadoPagoService()
    except Exception as e:
        logger.warning(f'⚠️  Falha ao usar MercadoPagoService real: {str(e)}')
        logger.warning('📦 Usando MercadoPagoServiceMock (simulação)')
        from .services_mock import MercadoPagoServiceMock
        return MercadoPagoServiceMock()


class StandardResultsSetPagination(PageNumberPagination):
    """Paginação padrão para as APIs"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PagamentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar pagamentos
    
    Endpoints:
    - POST /api/pagamentos/ - Criar novo pagamento (gera QR Code)
    - GET /api/pagamentos/ - Listar pagamentos do usuário
    - GET /api/pagamentos/{id}/ - Detalhes de um pagamento
    - GET /api/pagamentos/{id}/status/ - Consultar status do pagamento
    - POST /api/pagamentos/{id}/cancelar/ - Cancelar pagamento
    - GET /api/pagamentos/webhook/ - Receber webhook do Mercado Pago
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Retornar apenas pagamentos do usuário autenticado"""
        return Pagamento.objects.filter(usuario=self.request.user)
    
    def get_serializer_class(self):
        """Usar serializer apropriado para cada ação"""
        if self.action == 'create':
            return PagamentoCreateSerializer
        elif self.action == 'retrieve':
            return PagamentoDetailSerializer
        else:
            return PagamentoListSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Criar novo pagamento com QR Code
        
        Body esperado:
        {
            "valor": "150.00",
            "metodo_pagamento": "pix",
            "items": [
                {"product_id": 1, "quantity": 2},
                {"product_id": 2, "quantity": 1}
            ],
            "descricao": "Compra de produtos"
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Validar dados
            valor = serializer.validated_data.get('valor')
            metodo = serializer.validated_data.get('metodo_pagamento', 'pix')
            items = request.data.get('items', [])
            descricao = serializer.validated_data.get('descricao', '')
            pedido_id = serializer.validated_data.get('pedido_id')
            
            # Validações
            if not valor or valor <= 0:
                return Response(
                    {'erro': 'Valor deve ser maior que zero'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar limite máximo (99999999.99)
            if valor > 99999999.99:
                return Response(
                    {'erro': f'Valor R$ {valor:.2f} excede o limite máximo de R$ 99.999.999,99'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not items:
                return Response(
                    {'erro': 'Pelo menos um item é necessário'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f'📊 Pagamento validado: R$ {valor:.2f} via {metodo}')
            
            # Criar pagamento no banco de dados
            pagamento = Pagamento.objects.create(
                usuario=request.user,
                valor=valor,
                metodo_pagamento=metodo,
                status='pendente',
                descricao=descricao,
                pedido_id=str(pedido_id) if pedido_id not in (None, '') else None,
                data_expiracao=timezone.now() + timezone.timedelta(minutes=15),
            )
            
            # Registrar auditoria
            TransacaoAuditoria.objects.create(
                pagamento=pagamento,
                tipo_evento='criacao',
                status_novo='pendente',
                mensagem='Pagamento criado',
            )
            
            # Integrar com Mercado Pago (com fallback para Mock)
            mercado_pago_service = get_mercado_pago_service()
            
            if metodo == 'pix':
                try:
                    pix_data = mercado_pago_service.criar_pagamento_pix(
                        valor=valor,
                        email_usuario=request.user.email,
                        items=items,
                        descricao=descricao,
                    )
                    
                    # Gerar QR Code em base64
                    qr_code_base64 = mercado_pago_service.gerar_qr_code_base64(
                        pix_data.get('copia_cola')
                    )
                    
                    # Atualizar pagamento com dados do Mercado Pago
                    pagamento.mercado_pago_id = pix_data['mercado_pago_id']
                    pagamento.qr_code_base64 = qr_code_base64
                    pagamento.copia_cola = pix_data['copia_cola']
                    pagamento.data_expiracao = pix_data['expiracao']
                    pagamento.status = 'processando'
                    pagamento.save()
                    
                    logger.info(f'Pagamento PIX criado: {pagamento.id}')
                    
                    # Retornar dados
                    response_data = {
                        'pagamento_id': str(pagamento.id),
                        'mercado_pago_id': pagamento.mercado_pago_id,
                        'qr_code_base64': f'data:image/png;base64,{qr_code_base64}',
                        'copia_cola': pagamento.copia_cola,
                        'expiracao': pagamento.data_expiracao,
                        'valor': str(pagamento.valor),
                        'status': pagamento.status,
                    }
                    
                    return Response(response_data, status=status.HTTP_201_CREATED)
                
                except Exception as e:
                    logger.error(f'Erro ao criar pagamento PIX: {str(e)}')
                    pagamento.status = 'recusado'
                    pagamento.save()
                    
                    TransacaoAuditoria.objects.create(
                        pagamento=pagamento,
                        tipo_evento='erro',
                        status_anterior='pendente',
                        status_novo='recusado',
                        mensagem=f'Erro ao integrar com Mercado Pago: {str(e)}',
                    )
                    
                    return Response(
                        {'erro': f'Erro ao processar pagamento: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'erro': f'Método de pagamento {metodo} ainda não implementado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            logger.error(f'Erro geral ao criar pagamento: {str(e)}')
            return Response(
                {'erro': f'Erro ao criar pagamento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Consultar status do pagamento
        
        GET /api/pagamentos/{id}/status/
        """
        try:
            pagamento = self.get_object()
            
            # Se está processando, consultar status no Mercado Pago
            if pagamento.status in ['pendente', 'processando'] and pagamento.mercado_pago_id:
                mercado_pago_service = get_mercado_pago_service()
                status_data = mercado_pago_service.consultar_status_pagamento(
                    pagamento.mercado_pago_id
                )
                
                # Atualizar status local se mudou
                novo_status = status_data['status']
                if novo_status != pagamento.status:
                    status_anterior = pagamento.status
                    pagamento.status = novo_status
                    
                    if novo_status == 'aprovado':
                        pagamento.data_pagamento = timezone.now()
                    
                    pagamento.save()

                    # Se o pagamento está ligado a um pedido, atualiza status do pedido
                    if novo_status == 'aprovado' and pagamento.pedido_id:
                        try:
                            from beckend.models import Order
                            from beckend.order_lifecycle import order_is_unpaid_expired

                            order = Order.objects.filter(pk=int(pagamento.pedido_id)).first()
                            if order and order.status == 'pendente' and order.paid_at is None and not order_is_unpaid_expired(order):
                                order.status = 'pago'
                                order.paid_at = timezone.now()
                                order.save(update_fields=['status', 'paid_at', 'updated_at'])
                        except Exception as e:
                            logger.warning(f'Falha ao atualizar pedido pago: {str(e)}')
                    
                    # Registrar auditoria
                    TransacaoAuditoria.objects.create(
                        pagamento=pagamento,
                        tipo_evento='consulta',
                        status_anterior=status_anterior,
                        status_novo=novo_status,
                        mensagem='Status atualizado via consulta',
                        dados_evento=status_data,
                    )
                    
                    logger.info(f'Status do pagamento {pagamento.id} atualizado para {novo_status}')
            
            serializer = PagamentoDetailSerializer(pagamento)
            return Response(serializer.data)
        
        except Pagamento.DoesNotExist:
            return Response(
                {'erro': 'Pagamento não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Erro ao consultar status: {str(e)}')
            return Response(
                {'erro': f'Erro ao consultar status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """
        Cancelar um pagamento
        
        POST /api/pagamentos/{id}/cancelar/
        """
        try:
            pagamento = self.get_object()
            
            if pagamento.status == 'aprovado':
                return Response(
                    {'erro': 'Não é possível cancelar um pagamento aprovado. Use reembolso.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if pagamento.status == 'cancelado':
                return Response(
                    {'erro': 'Pagamento já foi cancelado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            status_anterior = pagamento.status
            pagamento.status = 'cancelado'
            pagamento.save()
            
            TransacaoAuditoria.objects.create(
                pagamento=pagamento,
                tipo_evento='atualizacao_manual',
                status_anterior=status_anterior,
                status_novo='cancelado',
                mensagem='Pagamento cancelado pelo usuário',
            )
            
            logger.info(f'Pagamento {pagamento.id} cancelado')
            
            return Response({
                'mensagem': 'Pagamento cancelado com sucesso',
                'pagamento_id': str(pagamento.id),
                'status': pagamento.status,
            })
        
        except Pagamento.DoesNotExist:
            return Response(
                {'erro': 'Pagamento não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Erro ao cancelar pagamento: {str(e)}')
            return Response(
                {'erro': f'Erro ao cancelar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ComprovanteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet somente leitura para comprovantes
    
    Endpoints:
    - GET /api/comprovantes/ - Listar comprovantes
    - GET /api/comprovantes/{id}/ - Detalhes do comprovante
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = ComprovanteSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Retornar apenas comprovantes do usuário autenticado"""
        return Comprovante.objects.filter(usuario=self.request.user)


class CartaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar cartões do usuário
    
    Endpoints:
    - GET /api/cartoes/ - Listar cartões
    - POST /api/cartoes/ - Criar novo cartão (apenas token)
    - DELETE /api/cartoes/{id}/ - Remover cartão
    - POST /api/cartoes/{id}/definir_padrao/ - Definir como cartão padrão
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Retornar apenas cartões do usuário autenticado"""
        return Cartao.objects.filter(usuario=self.request.user, ativo=True)
    
    def get_serializer_class(self):
        """Usar serializer apropriado"""
        if self.action == 'create':
            return CartaoCreateSerializer
        else:
            return CartaoSerializer
    
    @action(detail=True, methods=['post'])
    def definir_padrao(self, request, pk=None):
        """Definir cartão como padrão do usuário"""
        try:
            cartao = self.get_object()
            
            # Remover padrão de outros cartões
            Cartao.objects.filter(usuario=request.user, padrao=True).update(padrao=False)
            
            # Definir este como padrão
            cartao.padrao = True
            cartao.save()
            
            serializer = self.get_serializer(cartao)
            return Response(serializer.data)
        
        except Cartao.DoesNotExist:
            return Response(
                {'erro': 'Cartão não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete de cartão (marcar como inativo)"""
        try:
            cartao = self.get_object()
            cartao.ativo = False
            cartao.save()
            
            return Response({'mensagem': 'Cartão removido com sucesso'})
        
        except Cartao.DoesNotExist:
            return Response(
                {'erro': 'Cartão não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


class TransacaoAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet somente leitura para auditoria de transações
    
    Endpoints:
    - GET /api/auditoria/ - Listar eventos de auditoria
    - GET /api/auditoria/{id}/ - Detalhes do evento
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = TransacaoAuditoriaSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Retornar apenas auditoria de pagamentos do usuário"""
        return TransacaoAuditoria.objects.filter(pagamento__usuario=self.request.user)

import os
import json
import base64
import qrcode
from io import BytesIO
import requests
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Configurações do Mercado Pago - CARREGA COM VALIDAÇÃO
from dotenv import load_dotenv
load_dotenv()

# Carrega e valida o token
MERCADO_PAGO_ACCESS_TOKEN = os.getenv('MERCADO_PAGO_ACCESS_TOKEN', '').strip()

if MERCADO_PAGO_ACCESS_TOKEN:
    logger.info(f'✅ Token Mercado Pago encontrado: {MERCADO_PAGO_ACCESS_TOKEN[:50]}...')
    MERCADO_PAGO_API_URL = 'https://api.mercadopago.com/v1'
else:
    logger.warning('⚠️  Token Mercado Pago NÃO ENCONTRADO no .env')
    MERCADO_PAGO_API_URL = 'https://api.mercadopago.com/v1'


class MercadoPagoService:
    """
    Serviço de integração com API Mercado Pago
    Responsável por criar pagamentos PIX, consultar status e processar webhooks
    """
    
    def __init__(self):
        # Recarrega token fresh a cada instância
        self.access_token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN', '').strip()
        self.base_url = MERCADO_PAGO_API_URL
        
        # Validação rigorosa
        if not self.access_token:
            msg = '❌ MERCADO_PAGO_ACCESS_TOKEN não configurado em .env!'
            logger.error(msg)
            raise ValueError(msg)
        
        if len(self.access_token) < 20:
            msg = f'❌ Token suspeito (muito curto: {len(self.access_token)} chars)'
            logger.error(msg)
            raise ValueError(msg)
        
        # Validar que começa com APP_USR
        if not self.access_token.startswith('APP_USR'):
            logger.warning(f'⚠️  Token não começa com APP_USR: {self.access_token[:30]}...')
        
        # Prepara headers
        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
        }
        
        logger.info(f'✅ MercadoPagoService inicializado com sucesso')
        logger.info(f'   Token length: {len(self.access_token)} chars')
        logger.info(f'   Token starts: {self.access_token[:20]}...')
        logger.info(f'   Auth header: Bearer {self.access_token[:20]}...')
        logger.info(f'   Headers keys: {list(self.headers.keys())}')
    
    def criar_pagamento_pix(self, valor, email_usuario, items, descricao=''):
        """
        Cria um pagamento PIX no Mercado Pago
        
        Args:
            valor (Decimal): Valor em reais
            email_usuario (str): Email do usuário
            items (list): Lista de itens do pedido
            descricao (str): Descrição adicional
        
        Returns:
            dict: Dados do pagamento (id, qr_code, copia_cola, expiracao)
        """
        try:
            payload = {
                'transaction_amount': float(valor),
                'description': descricao or 'Compra na loja',
                'payment_method_id': 'pix',
                'payer': {
                    'email': email_usuario,
                },
                'external_reference': f'pedido-{timezone.now().timestamp()}',
            }
            
            # Apenas adiciona notification_url se configurada com URL pública
            webhook_url = os.getenv('WEBHOOK_URL', '').strip()
            if webhook_url and webhook_url.startswith(('http://', 'https://')) and 'localhost' not in webhook_url:
                payload['notification_url'] = webhook_url
            
            # ===== LOGGING DETALHADO ANTES DO REQUEST =====
            logger.info('🔍 VALIDAÇÃO PRÉ-REQUISIÇÃO:')
            logger.info(f'   Token exists: {bool(self.access_token)}')
            logger.info(f'   Token length: {len(self.access_token) if self.access_token else 0}')
            logger.info(f'   Token starts: {self.access_token[:25]}... (valid: {self.access_token.startswith("APP_USR")})')
            logger.info(f'   Headers: {dict(self.headers)}')
            logger.info(f'   Auth header: {self.headers.get("Authorization", "MISSING")[:40]}...')
            logger.info(f'   Content-Type: {self.headers.get("Content-Type")}')
            logger.info('')
            logger.info('📤 PAYLOAD ENVIADO:')
            logger.info(f'   URL: {self.base_url}/payments')
            logger.info(f'   Method: POST')
            logger.info(f'   Payload: {json.dumps(payload, indent=2)}')
            
            # ===== FAZER A REQUISIÇÃO =====
            logger.info('🚀 Enviando requisição para Mercado Pago...')
            response = requests.post(
                f'{self.base_url}/payments',
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            logger.info(f'📥 Response Status: {response.status_code}')
            
            # Se não for sucesso (201), loga detalhes
            if response.status_code != 201:
                logger.error(f'❌ Erro Mercado Pago (HTTP {response.status_code}):')
                logger.error(f'   Body: {response.text}')
            
            response.raise_for_status()
            
            dados = response.json()
            
            logger.info(f'✅ Pagamento PIX criado com sucesso: ID {dados.get("id")}')
            
            # Extrair dados do QR Code e copia e cola
            qr_code_data = None
            copia_cola = None
            
            if 'point_of_interaction' in dados:
                point_of_interaction = dados['point_of_interaction']
                if 'transaction_data' in point_of_interaction:
                    transaction_data = point_of_interaction['transaction_data']
                    qr_code_data = transaction_data.get('qr_code')
                    copia_cola = transaction_data.get('copy_paste_qr')
            
            return {
                'mercado_pago_id': str(dados.get('id')),
                'status': dados.get('status'),
                'qr_code': qr_code_data,
                'copia_cola': copia_cola,
                'expiracao': self._calcular_expiracao(),
                'valor': float(valor),
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f'❌ Erro ao criar pagamento PIX: {str(e)}')
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f'💥 Detalhes: {e.response.text}')
            raise Exception(f'Erro ao criar pagamento: {str(e)}')
    
    def consultar_status_pagamento(self, mercado_pago_id):
        """
        Consulta o status de um pagamento no Mercado Pago
        
        Args:
            mercado_pago_id (str): ID do pagamento no Mercado Pago
        
        Returns:
            dict: Status e dados do pagamento
        """
        try:
            response = requests.get(
                f'{self.base_url}/payments/{mercado_pago_id}',
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            
            dados = response.json()
            
            status_mapeamento = {
                'pending': 'pendente',
                'approved': 'aprovado',
                'authorized': 'processando',
                'in_process': 'processando',
                'rejected': 'recusado',
                'cancelled': 'cancelado',
                'refunded': 'recusado',
                'charged_back': 'recusado',
            }
            
            status_local = status_mapeamento.get(dados.get('status'), 'pendente')
            
            return {
                'mercado_pago_id': str(dados.get('id')),
                'status': status_local,
                'status_mercado_pago': dados.get('status'),
                'valor': float(dados.get('transaction_amount')),
                'data_criacao': dados.get('date_created'),
                'data_aprovacao': dados.get('date_approved'),
                'referencia_externa': dados.get('external_reference'),
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f'Erro ao consultar status: {str(e)}')
            raise Exception(f'Erro ao consultar status: {str(e)}')
    
    def gerar_qr_code_base64(self, qr_code_data):
        """
        Converte dados do QR Code em imagem base64
        
        Args:
            qr_code_data (str): Dados do QR Code (copia e cola)
        
        Returns:
            str: QR Code em base64
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )
            qr.add_data(qr_code_data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
        
        except Exception as e:
            logger.error(f'Erro ao gerar QR Code: {str(e)}')
            raise Exception(f'Erro ao gerar QR Code: {str(e)}')
    
    @staticmethod
    def _calcular_expiracao(minutos=15):
        """
        Calcula data de expiração do PIX (padrão: 15 minutos)
        
        Args:
            minutos (int): Minutos até expiração
        
        Returns:
            datetime: Data/hora de expiração
        """
        return timezone.now() + timedelta(minutes=minutos)
    
    def processar_webhook(self, dados_webhook):
        """
        Processa webhook do Mercado Pago
        
        Args:
            dados_webhook (dict): Dados recebidos do webhook
        
        Returns:
            dict: Resultado do processamento
        """
        try:
            # Validar assinatura do webhook (em produção, importante!)
            
            if dados_webhook.get('type') == 'payment':
                payment_id = dados_webhook.get('data', {}).get('id')
                action = dados_webhook.get('action')
                
                logger.info(f'Webhook recebido - Payment: {payment_id}, Action: {action}')
                
                return {
                    'sucesso': True,
                    'mensagem': 'Webhook processado com sucesso',
                    'payment_id': payment_id,
                    'action': action,
                }
            
            return {
                'sucesso': False,
                'mensagem': 'Tipo de webhook não reconhecido',
            }
        
        except Exception as e:
            logger.error(f'Erro ao processar webhook: {str(e)}')
            return {
                'sucesso': False,
                'mensagem': f'Erro ao processar webhook: {str(e)}',
            }
    
    def reembolsar_pagamento(self, mercado_pago_id, valor=None):
        """
        Solicita reembolso de um pagamento
        
        Args:
            mercado_pago_id (str): ID do pagamento no Mercado Pago
            valor (Decimal): Valor a reembolsar (None = reembolso total)
        
        Returns:
            dict: Resultado do reembolso
        """
        try:
            payload = {}
            if valor:
                payload['amount'] = float(valor)
            
            response = requests.post(
                f'{self.base_url}/payments/{mercado_pago_id}/refunds',
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            
            dados = response.json()
            
            logger.info(f'Reembolso solicitado: {mercado_pago_id}')
            
            return {
                'sucesso': True,
                'mensagem': 'Reembolso solicitado com sucesso',
                'refund_id': str(dados.get('id')),
                'valor': float(dados.get('amount')),
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f'Erro ao reembolsar pagamento: {str(e)}')
            return {
                'sucesso': False,
                'mensagem': f'Erro ao reembolsar: {str(e)}',
            }


class MercadoPagoServiceMock:
    """
    Serviço MOCK de Mercado Pago para testes (sem necessidade de credenciais reais)
    Retorna dados simulados de pagamento PIX
    """
    
    def __init__(self):
        logger.info('✅ Usando MercadoPagoServiceMock')
        self.base_url = 'https://mock.mercadopago.com/v1'
    
    def criar_pagamento_pix(self, valor, email_usuario, items, descricao=''):
        """
        Cria um pagamento PIX simulado
        
        Returns:
            dict: Dados de pagamento mock (com QR Code gerado)
        """
        try:
            logger.info(f'📤 Criando pagamento PIX MOCK para {email_usuario}')
            
            # Gera dados mock
            mercado_pago_id = f'mock-{int(timezone.now().timestamp())}'
            copia_cola = f'00020126580014br.gov.bcb.pix0136xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx520400005303986540510.005802BR5913MOCK6009SAO PAULO62410503***63041234'
            
            # Gera QR Code simulado
            qr_code_b64 = self._gerar_qr_code(copia_cola)
            
            resultado = {
                'sucesso': True,
                'mercado_pago_id': mercado_pago_id,
                'status': 'pending',
                'qr_code': qr_code_b64,
                'copia_cola': copia_cola,
                'expiracao': (timezone.now() + timedelta(minutes=15)).isoformat(),
                'valor': float(valor),
                'email': email_usuario,
            }
            
            logger.info(f'✅ Pagamento PIX criado (MOCK): {mercado_pago_id}')
            return resultado
            
        except Exception as e:
            logger.error(f'Erro ao criar pagamento PIX: {str(e)}')
            raise Exception(f'Erro ao criar pagamento: {str(e)}')
    
    def consultar_pagamento(self, mercado_pago_id):
        """Consulta status de um pagamento (mock)"""
        return {
            'sucesso': True,
            'status': 'pending',
            'id': mercado_pago_id,
        }
    
    def gerar_qr_code(self, copia_cola):
        """Gera QR Code em Base64 para o código PIX"""
        return self._gerar_qr_code(copia_cola)
    
    def _gerar_qr_code(self, copia_cola):
        """
        Gera QR Code em formato Base64
        """
        try:
            # Cria QR Code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=5,
                border=2,
            )
            qr.add_data(copia_cola)
            qr.make(fit=True)
            
            # Converte para imagem
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Converte para Base64
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
        
        except Exception as e:
            logger.error(f'Erro ao gerar QR Code: {str(e)}')
            raise Exception(f'Erro ao gerar QR Code: {str(e)}')
    
    def processar_webhook(self, dados_webhook):
        """Mock de webhook"""
        return {'sucesso': True, 'mensagem': 'Webhook mock processado'}
    
    def reembolsar_pagamento(self, mercado_pago_id, valor=None):
        """Mock de reembolso"""
        return {'sucesso': True, 'mensagem': 'Reembolso simulado com sucesso'}

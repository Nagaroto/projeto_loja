"""
Mock do Mercado Pago para testes
Simula respostas da API do Mercado Pago sem precisar de internet
"""
import qrcode
import json
import base64
from io import BytesIO
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class MercadoPagoServiceMock:
    """Mock do MercadoPagoService para testes sem internet"""
    
    def __init__(self):
        self.base_url = 'MOCK://mercadopago'
        logger.warning('⚠️  USANDO MOCK DO MERCADO PAGO - SEM INTERNET REAL')
    
    @staticmethod
    def _get_idempotency_key():
        import uuid
        return str(uuid.uuid4())
    
    def gerar_qr_code_base64(self, qr_code_data):
        """Gera QR Code em base64"""
        if not qr_code_data:
            qr_code_data = "https://loja.local/pagamento/simulado"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_code_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str
    
    def criar_pagamento_pix(self, valor, email_usuario, items, descricao=''):
        """Mock: Cria um pagamento PIX simulado"""
        try:
            import uuid
            import time
            
            mock_id = str(uuid.uuid4())[:8]
            
            # Simular QR Code (em produção viria do Mercado Pago)
            qr_code_simulado = f"00020126580014br.gov.bcb.pix0136{mock_id}-{int(time.time())}"
            qr_code_base64 = self.gerar_qr_code_base64(qr_code_simulado)
            
            copia_cola = (
                f"00020126580014br.gov.bcb.brcode01051.0.0"
                f"0520865413910048R$100.002310406111234567890123456780706"
                f"20231305802BR5913NOME BANCO6009SAO PAULO62410503"
                f"***63041D3D"
            )
            
            logger.info(f'✅ Mock: Pagamento PIX simulado criado')
            
            return {
                'mercado_pago_id': f'mock-{mock_id}',
                'status': 'pending',
                'qr_code': qr_code_simulado,
                'copia_cola': copia_cola,
                'expiracao': timezone.now(),
                'valor': float(valor),
            }
        
        except Exception as e:
            logger.error(f'❌ Erro ao criar mock: {str(e)}')
            raise Exception(f'Erro ao criar pagamento: {str(e)}')
    
    def consultar_status_pagamento(self, mercado_pago_id):
        """Mock: Consulta status simulado"""
        try:
            logger.info(f'Mock: Consultando status de {mercado_pago_id}')
            
            status_mapeamento = {
                'pending': 'pendente',
                'approved': 'aprovado',
                'rejected': 'recusado',
                'cancelled': 'cancelado',
                'refunded': 'reembolsado',
            }
            
            return {
                'status': 'pendente',
                'mercado_pago_id': mercado_pago_id,
                'mock': True,
            }
        
        except Exception as e:
            logger.error(f'❌ Erro ao consultar status: {str(e)}')
            raise Exception(f'Erro ao consultar status: {str(e)}')
    
    def processar_webhook(self, dados_webhook):
        """Mock: Processa webhook simulado"""
        logger.info('Mock: Webhook recebido')
        return True
    
    def reembolsar_pagamento(self, mercado_pago_id, valor=None):
        """Mock: Reembolso simulado"""
        logger.info(f'Mock: Reembolso processado para {mercado_pago_id}')
        return {'status': 'refunded'}
    
    def _calcular_expiracao(self, minutos=15):
        """Calcula expiração"""
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() + timedelta(minutes=minutos)

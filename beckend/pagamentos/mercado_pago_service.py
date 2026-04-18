import os
import logging
import requests
import base64
from io import BytesIO
from typing import Dict, Optional, Tuple
from decimal import Decimal

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """
    Serviço para integração com API do Mercado Pago.
    Gerencia a criação e confirmação de pagamentos PIX, Cartão e Boleto.
    """
    
    BASE_URL = "https://api.mercadopago.com"
    
    def __init__(self):
        """Inicializa o serviço com as credenciais do Mercado Pago."""
        self.access_token = os.getenv('MERCADO_PAGO_TOKEN')
        
        if not self.access_token:
            logger.warning("MERCADO_PAGO_TOKEN não configurado nas variáveis de ambiente")
        
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
    
    def criar_pagamento_pix(
        self,
        valor: Decimal,
        usuario_id: int,
        email: str,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Cria um pagamento PIX no Mercado Pago e retorna QR Code + Cópia e Cola.
        
        Args:
            valor: Valor do pagamento em reais
            usuario_id: ID do usuário
            email: Email do usuário
            metadata: Dados adicionais para rastreamento
        
        Returns:
            Tupla (sucesso, dados) onde dados contém QR Code e Cópia e Cola
        """
        try:
            payload = {
                "transaction_amount": float(valor),
                "description": f"Pagamento PIX - Pedido #{usuario_id}",
                "payment_method_id": "pix",
                "payer": {
                    "email": email,
                },
                "notification_url": os.getenv('WEBHOOK_URL', 'http://localhost:8000/api/pagamento/webhook/'),
            }
            
            if metadata:
                payload["metadata"] = metadata
            
            response = requests.post(
                f"{self.BASE_URL}/v1/payments",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Extrai QR Code e Cópia e Cola da resposta
                qr_code = data.get('point_of_interaction', {}).get('qr_code', {})
                
                return True, {
                    'mercado_pago_id': data.get('id'),
                    'qr_code_url': qr_code.get('image'),
                    'qr_code_base64': qr_code.get('image'),
                    'copia_cola': qr_code.get('in_store_order_id'),
                    'status': data.get('status'),
                    'transaction_details': data.get('transaction_details', {}),
                }
            else:
                erro = response.json() if response.text else response.reason
                logger.error(f"Erro ao criar PIX no Mercado Pago: {erro}")
                return False, {'erro': erro}
        
        except Exception as e:
            logger.exception(f"Exceção ao criar PIX: {e}")
            return False, {'erro': str(e)}
    
    def criar_pagamento_cartao(
        self,
        valor: Decimal,
        token_cartao: str,
        usuario_id: int,
        email: str,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Cria um pagamento com cartão de crédito no Mercado Pago.
        
        Args:
            valor: Valor do pagamento em reais
            token_cartao: Token do cartão gerado pelo Mercado Pago
            usuario_id: ID do usuário
            email: Email do usuário
            metadata: Dados adicionais para rastreamento
        
        Returns:
            Tupla (sucesso, dados)
        """
        try:
            payload = {
                "transaction_amount": float(valor),
                "token": token_cartao,
                "description": f"Pagamento Cartão - Pedido #{usuario_id}",
                "installments": 1,
                "payment_method_id": "credit_card",
                "payer": {
                    "email": email,
                },
                "notification_url": os.getenv('WEBHOOK_URL', 'http://localhost:8000/api/pagamento/webhook/'),
            }
            
            if metadata:
                payload["metadata"] = metadata
            
            response = requests.post(
                f"{self.BASE_URL}/v1/payments",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return True, {
                    'mercado_pago_id': data.get('id'),
                    'status': data.get('status'),
                    'transaction_details': data.get('transaction_details', {}),
                }
            else:
                erro = response.json() if response.text else response.reason
                logger.error(f"Erro ao criar pagamento com cartão: {erro}")
                return False, {'erro': erro}
        
        except Exception as e:
            logger.exception(f"Exceção ao criar pagamento com cartão: {e}")
            return False, {'erro': str(e)}
    
    def criar_pagamento_boleto(
        self,
        valor: Decimal,
        usuario_id: int,
        email: str,
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Cria um pagamento com boleto no Mercado Pago.
        
        Args:
            valor: Valor do pagamento em reais
            usuario_id: ID do usuário
            email: Email do usuário
            metadata: Dados adicionais para rastreamento
        
        Returns:
            Tupla (sucesso, dados)
        """
        try:
            payload = {
                "transaction_amount": float(valor),
                "description": f"Pagamento Boleto - Pedido #{usuario_id}",
                "payment_method_id": "bolbradesco",
                "payer": {
                    "email": email,
                },
                "notification_url": os.getenv('WEBHOOK_URL', 'http://localhost:8000/api/pagamento/webhook/'),
            }
            
            if metadata:
                payload["metadata"] = metadata
            
            response = requests.post(
                f"{self.BASE_URL}/v1/payments",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return True, {
                    'mercado_pago_id': data.get('id'),
                    'status': data.get('status'),
                    'boleto_barcode': data.get('barcode'),
                    'boleto_barcode_url': data.get('barcode_url'),
                    'transaction_details': data.get('transaction_details', {}),
                }
            else:
                erro = response.json() if response.text else response.reason
                logger.error(f"Erro ao criar boleto: {erro}")
                return False, {'erro': erro}
        
        except Exception as e:
            logger.exception(f"Exceção ao criar boleto: {e}")
            return False, {'erro': str(e)}
    
    def verificar_status_pagamento(self, mercado_pago_id: str) -> Tuple[bool, Dict]:
        """
        Verifica o status de um pagamento no Mercado Pago.
        
        Args:
            mercado_pago_id: ID do pagamento no Mercado Pago
        
        Returns:
            Tupla (sucesso, dados)
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/v1/payments/{mercado_pago_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, {
                    'id': data.get('id'),
                    'status': data.get('status'),
                    'status_detail': data.get('status_detail'),
                    'transaction_amount': data.get('transaction_amount'),
                }
            else:
                erro = response.json() if response.text else response.reason
                logger.error(f"Erro ao verificar status: {erro}")
                return False, {'erro': erro}
        
        except Exception as e:
            logger.exception(f"Exceção ao verificar status: {e}")
            return False, {'erro': str(e)}
    
    def converter_imagem_para_base64(self, url_imagem: str) -> Optional[str]:
        """
        Baixa uma imagem de uma URL e a converte para base64.
        
        Args:
            url_imagem: URL da imagem
        
        Returns:
            String base64 da imagem ou None se houver erro
        """
        try:
            if not url_imagem:
                return None
            
            response = requests.get(url_imagem, timeout=5)
            if response.status_code == 200:
                # Converte para base64
                base64_string = base64.b64encode(response.content).decode('utf-8')
                return f"data:image/png;base64,{base64_string}"
            return None
        
        except Exception as e:
            logger.warning(f"Erro ao converter imagem para base64: {e}")
            return None


# Instância global do serviço
mercado_pago_service = MercadoPagoService()

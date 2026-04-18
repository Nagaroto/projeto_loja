#!/usr/bin/env python
"""
Script para testar conexão com Mercado Pago
IMPORTANTE: Carrega .env ANTES do django!
"""
import os
from dotenv import load_dotenv

# CARREGAR .env PRIMEIRO!
load_dotenv()

import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone

TOKEN = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')

# Detecta se é sandbox
if TOKEN and 'sandbox' in TOKEN.lower():
    MERCADO_PAGO_API_URL = 'https://api.sandbox.mercadopago.com/v1'
    ENV = '🧪 SANDBOX'
else:
    MERCADO_PAGO_API_URL = 'https://api.mercadopago.com/v1'
    ENV = '🚀 PRODUÇÃO'

print("=" * 80)
print(f"🧪 TESTE DE CONEXÃO COM MERCADO PAGO [{ENV}]")
print("=" * 80)

if not TOKEN:
    print("❌ Token não configurado!")
    exit(1)

print(f"✅ Token: {TOKEN[:50]}...")
print(f"📡 URL: {MERCADO_PAGO_API_URL}")

# Payload
payload = {
    'transaction_amount': 100.00,
    'description': 'Teste de PIX',
    'payment_method_id': 'pix',
    'payer': {'email': 'teste@teste.com'},
    'external_reference': f'teste-{timezone.now().timestamp()}',
}

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}

try:
    print("\n📤 Enviando...")
    response = requests.post(
        f'{MERCADO_PAGO_API_URL}/payments',
        json=payload,
        headers=headers,
        timeout=10
    )
    
    print(f"📊 Status: {response.status_code}")
    resposta = response.json()
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
    
    if response.status_code == 201:
        print("\n✅ SUCESSO! QR Code gerado!")
        if 'point_of_interaction' in resposta:
            copia = resposta['point_of_interaction']['transaction_data'].get('copy_paste_qr')
            if copia:
                print(f"Cópia e Cola: {copia[:60]}...")

except Exception as e:
    print(f"\n❌ Erro: {str(e)}")

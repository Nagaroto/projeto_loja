#!/usr/bin/env python
"""
Script para testar conexão com Mercado Pago
"""
import os
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
    print("   Configure a variável MERCADO_PAGO_ACCESS_TOKEN")
    exit(1)

print(f"✅ Token encontrado: {TOKEN[:50]}...")
print(f"📡 URL: {MERCADO_PAGO_API_URL}")

# Payload de teste
payload = {
    'transaction_amount': 100.00,
    'description': 'Teste de PIX',
    'payment_method_id': 'pix',
    'payer': {
        'email': 'teste@teste.com',
    },
    'external_reference': f'teste-{timezone.now().timestamp()}',
}

print("\n📤 Enviando payload:")
print(json.dumps(payload, indent=2))

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}

try:
    response = requests.post(
        f'{MERCADO_PAGO_API_URL}/payments',
        json=payload,
        headers=headers,
        timeout=10
    )
    
    print(f"\n📊 Status: {response.status_code}")
    print(f"📥 Resposta:")
    resposta = response.json()
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
    
    if response.status_code == 201:
        print("\n✅ SUCESSO! Pagamento criado com PIX.")
        print(f"   ID: {resposta.get('id')}")
        
        # Extrair QR Code
        if 'point_of_interaction' in resposta:
            qr = resposta['point_of_interaction']['transaction_data'].get('qr_code')
            copia = resposta['point_of_interaction']['transaction_data'].get('copy_paste_qr')
            print(f"   QR Code: {'✅ SIM' if qr else '❌ NÃO'}")
            print(f"   Cópia e Cola: {'✅ SIM' if copia else '❌ NÃO'}")
            if copia:
                print(f"   Código: {copia[:50]}...")
    else:
        print(f"\n❌ ERRO {response.status_code}")
        if 'error' in resposta:
            print(f"   Erro: {resposta['error']}")
        if 'message' in resposta:
            print(f"   Mensagem: {resposta['message']}")
        if 'cause' in resposta:
            print(f"   Detalhes: {resposta['cause']}")

except Exception as e:
    print(f"\n❌ EXCEÇÃO: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)


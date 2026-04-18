#!/usr/bin/env python
"""
Script para testar conexão com Mercado Pago - CORRIGIDO
"""
import os
import django
import requests
import json
from dotenv import load_dotenv

# Load .env ANTES de tudo
load_dotenv()

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

# Tenta com Authorization header primeiro
headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}

print("\n🔹 Tentativa 1: Authorization header")
try:
    response = requests.post(
        f'{MERCADO_PAGO_API_URL}/payments',
        json=payload,
        headers=headers,
        timeout=10
    )
    
    print(f"📊 Status: {response.status_code}")
    resposta = response.json()
    
    if response.status_code == 201:
        print("✅ SUCESSO com Authorization header!")
        resultado = resposta
    elif response.status_code == 401:
        print("❌ ERRO 401 com header. Tentando como query parameter...")
        resultado = None
    else:
        print(f"❌ ERRO {response.status_code}")
        resultado = resposta
except Exception as e:
    print(f"❌ EXCEÇÃO: {str(e)}")
    resultado = None

# Se falhou com header, tenta com query parameter
if resultado is None:
    print("\n🔹 Tentativa 2: Token como query parameter")
    headers = {
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.post(
            f'{MERCADO_PAGO_API_URL}/payments?access_token={TOKEN}',
            json=payload,
            headers=headers,
            timeout=10
        )
        
        print(f"📊 Status: {response.status_code}")
        resposta = response.json()
        
        if response.status_code == 201:
            print("✅ SUCESSO com query parameter!")
            resultado = resposta
        else:
            print(f"❌ ERRO {response.status_code}")
            resultado = resposta
    except Exception as e:
        print(f"❌ EXCEÇÃO: {str(e)}")
        resultado = None

# Processa resultado
if resultado:
    print(f"\n📥 Resposta completa:")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
    
    if 'id' in resultado:
        print(f"\n✅ SUCESSO! Pagamento criado com PIX.")
        print(f"   ID: {resultado.get('id')}")
        
        # Extrair QR Code
        if 'point_of_interaction' in resultado:
            qr = resultado['point_of_interaction']['transaction_data'].get('qr_code')
            copia = resultado['point_of_interaction']['transaction_data'].get('copy_paste_qr')
            print(f"   QR Code: {'✅ SIM' if qr else '❌ NÃO'}")
            print(f"   Cópia e Cola: {'✅ SIM' if copia else '❌ NÃO'}")
            if copia:
                print(f"   Código: {copia[:50]}...")
    else:
        print(f"\n❌ ERRO na resposta")
        if 'error' in resultado:
            print(f"   Erro: {resultado['error']}")
        if 'message' in resultado:
            print(f"   Mensagem: {resultado['message']}")
        if 'cause' in resultado:
            print(f"   Detalhes: {resultado['cause']}")

print("\n" + "=" * 80)

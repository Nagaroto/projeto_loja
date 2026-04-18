#!/usr/bin/env python
"""
Script para testar Mercado Pago Sandbox
"""
import os
from dotenv import load_dotenv
load_dotenv()

import requests
import json
from django.utils import timezone
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

TOKEN = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')
print(f"Token: {TOKEN}")

payload = {
    'transaction_amount': 100.00,
    'description': 'Teste',
    'payment_method_id': 'pix',
    'payer': {'email': 'teste@test.com'},
    'external_reference': f'teste-{timezone.now().timestamp()}',
}

print("\n=== Tentando SANDBOX ===")
response = requests.post(
    'https://api.sandbox.mercadopago.com/v1/payments',
    json=payload,
    headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
    timeout=10
)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))

print("\n=== Tentando PRODUÇÃO ===")
response = requests.post(
    'https://api.mercadopago.com/v1/payments',
    json=payload,
    headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
    timeout=10
)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))

#!/usr/bin/env python
"""
Teste direto de autenticação com Mercado Pago (usando MOCK para testes)
"""
import os
import sys

# Adiciona o path do projeto
sys.path.insert(0, '/home/destwarrio/projetos_1/projeto_loja')

# Configura Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from pagamentos.services import MercadoPagoServiceMock
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

print("=" * 80)
print("🧪 TESTE DE PAGAMENTO PIX")
print("=" * 80)

try:
    # Criar usuário de teste
    user, created = User.objects.get_or_create(
        email='teste@pagamento.com',
        defaults={'username': 'teste_pagamento'}
    )
    print(f"\n✅ Usuário: {user.email}")
    
    # Tentar criar pagamento
    print("\n📤 Criando pagamento PIX...")
    service = MercadoPagoServiceMock()
    
    items = [
        {'id': 1, 'name': 'Produto Teste', 'quantity': 1, 'price': '100.00'}
    ]
    
    resultado = service.criar_pagamento_pix(
        valor=Decimal('100.00'),
        email_usuario=user.email,
        items=items,
        descricao='Teste de PIX'
    )
    
    print("\n✅ SUCESSO!")
    print(f"   ID: {resultado.get('mercado_pago_id')}")
    print(f"   Status: {resultado.get('status')}")
    print(f"   QR Code gerado: {'SIM ✓' if resultado.get('qr_code') else 'NÃO ✗'}")
    qr_len = len(resultado.get('qr_code', '')) if resultado.get('qr_code') else 0
    print(f"   Tamanho QR Code: {qr_len} caracteres")
    print(f"   Cópia e Cola: {resultado.get('copia_cola', '')[:60]}...")
    print(f"   Expiração: {resultado.get('expiracao')}")
    
except Exception as e:
    print(f"\n❌ ERRO: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)

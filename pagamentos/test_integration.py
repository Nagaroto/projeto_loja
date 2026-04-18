"""
Script de teste para validar a integração de pagamentos
Execute com: python manage.py shell < pagamentos/test_integration.py
"""

import os
import sys
from decimal import Decimal
from django.contrib.auth.models import User
from pagamentos.models import Pagamento, TransacaoAuditoria
from pagamentos.services import MercadoPagoService

print("\n" + "="*60)
print("TESTE DE INTEGRAÇÃO - APP PAGAMENTOS")
print("="*60 + "\n")

# 1. Verificar se os tokens estão configurados
print("1️⃣  Verificando tokens do Mercado Pago...")
token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN')
if token:
    print(f"   ✅ Token encontrado: {token[:20]}...")
else:
    print("   ❌ Token NÃO encontrado em MERCADO_PAGO_ACCESS_TOKEN")
    sys.exit(1)

# 2. Verificar se o usuário de teste existe
print("\n2️⃣  Verificando usuário de teste...")
user, created = User.objects.get_or_create(
    username='teste_pagamento',
    defaults={
        'email': 'teste@pagamento.com',
        'first_name': 'Teste',
        'last_name': 'Pagamento'
    }
)
print(f"   ✅ Usuário: {user.email} ({'criado' if created else 'já existia'})")

# 3. Testar criação de pagamento (sem integração Mercado Pago)
print("\n3️⃣  Testando criação de pagamento...")
try:
    pagamento = Pagamento.objects.create(
        usuario=user,
        valor=Decimal('100.00'),
        metodo_pagamento='pix',
        status='pendente',
        descricao='Teste de integração'
    )
    print(f"   ✅ Pagamento criado: {pagamento.id}")
    print(f"      Status: {pagamento.status}")
    print(f"      Valor: R$ {pagamento.valor}")
except Exception as e:
    print(f"   ❌ Erro ao criar pagamento: {str(e)}")
    sys.exit(1)

# 4. Testar registro de auditoria
print("\n4️⃣  Testando auditoria...")
try:
    auditoria = TransacaoAuditoria.objects.create(
        pagamento=pagamento,
        tipo_evento='criacao',
        status_novo='pendente',
        mensagem='Teste de auditoria'
    )
    print(f"   ✅ Auditoria registrada: {auditoria.id}")
except Exception as e:
    print(f"   ❌ Erro ao registrar auditoria: {str(e)}")
    sys.exit(1)

# 5. Testar serviço Mercado Pago (sem fazer requisição real)
print("\n5️⃣  Testando serviço Mercado Pago...")
try:
    service = MercadoPagoService()
    print("   ✅ Serviço inicializado com sucesso")
    print(f"      Token carregado: {service.access_token[:20]}...")
except Exception as e:
    print(f"   ❌ Erro ao inicializar serviço: {str(e)}")
    sys.exit(1)

# 6. Testar geração de QR Code
print("\n6️⃣  Testando geração de QR Code...")
try:
    qr_code_data = "00020126360014br.gov.bcb.pix0136a1234567-89ab-cdef-0123-456789abcdef5204000053039865802BR5913Fulano de Tal6009Sao Paulo62070503***63048DB4"
    qr_code_base64 = service.gerar_qr_code_base64(qr_code_data)
    print("   ✅ QR Code gerado com sucesso")
    print(f"      Tamanho (base64): {len(qr_code_base64)} caracteres")
except Exception as e:
    print(f"   ❌ Erro ao gerar QR Code: {str(e)}")
    sys.exit(1)

# 7. Testar consulta de status (pode falhar sem token válido)
print("\n7️⃣  Testando consulta de status...")
try:
    # Simular um ID válido de teste
    result = service.consultar_status_pagamento('123456789')
    print("   ✅ Serviço respondeu (esperado: erro de pagamento não encontrado)")
except Exception as e:
    error_msg = str(e)
    if "404" in error_msg or "Not Found" in error_msg:
        print("   ✅ Serviço respondeu corretamente (pagamento não existe)")
    else:
        print(f"   ⚠️  Resposta: {error_msg}")

# 8. Resumo de pagamentos do usuário
print("\n8️⃣  Resumo de pagamentos do usuário...")
pagamentos = Pagamento.objects.filter(usuario=user).order_by('-data_criacao')
print(f"   Total de pagamentos: {pagamentos.count()}")
for pag in pagamentos[:5]:
    print(f"   - {pag.id}: R$ {pag.valor} ({pag.status})")

# 9. Resumo de auditoria
print("\n9️⃣  Resumo de auditoria...")
auditorias = TransacaoAuditoria.objects.filter(pagamento__usuario=user).order_by('-data_criacao')
print(f"   Total de eventos: {auditorias.count()}")
for aud in auditorias[:5]:
    print(f"   - {aud.tipo_evento}: {aud.status_anterior} → {aud.status_novo}")

print("\n" + "="*60)
print("✅ TESTES CONCLUÍDOS COM SUCESSO!")
print("="*60 + "\n")

print("Próximos passos:")
print("1. Acessar http://localhost:8000/admin/")
print("2. Fazer login como superusuário")
print("3. Verificar pagamentos e auditoria")
print("4. Testar endpoints via Postman/Thunder Client")
print("5. Validar integração com frontend")

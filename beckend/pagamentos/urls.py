from django.urls import path
from . import views

app_name = 'pagamentos'

urlpatterns = [
    # Criar pagamento
    path('', views.CriarPagamentoAPIView.as_view(), name='criar_pagamento'),
    
    # Listar pagamentos do usuário
    path('listar/', views.ListarPagamentosAPIView.as_view(), name='listar_pagamentos'),
    
    # Verificar status de um pagamento
    path('status/<uuid:id_pagamento>/', views.StatusPagamentoAPIView.as_view(), name='status_pagamento'),
    
    # Webhook do Mercado Pago
    path('webhook/', views.webhook_mercado_pago, name='webhook_mercado_pago'),
]

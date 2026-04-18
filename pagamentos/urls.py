from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PagamentoViewSet,
    ComprovanteViewSet,
    CartaoViewSet,
    TransacaoAuditoriaViewSet,
)

# Criar router para os ViewSets
router = DefaultRouter()
router.register(r'', PagamentoViewSet, basename='pagamento')
router.register(r'comprovantes', ComprovanteViewSet, basename='comprovante')
router.register(r'cartoes', CartaoViewSet, basename='cartao')
router.register(r'auditoria', TransacaoAuditoriaViewSet, basename='auditoria')

app_name = 'pagamentos'

urlpatterns = [
    path('', include(router.urls)),
]

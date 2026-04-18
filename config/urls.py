# Rotas principais: admin Django, API em /api/, refresh JWT.

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('beckend.urls')),
    path('api/pagamentos/', include('pagamentos.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

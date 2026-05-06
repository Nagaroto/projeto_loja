# Rotas principais: admin Django, API em /api/, refresh JWT.

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('beckend.urls')),
    path('api/pagamentos/', include('pagamentos.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    # Serve imagens salvas em "products/" durante desenvolvimento local.
    urlpatterns += static('/products/', document_root=settings.BASE_DIR / 'products')

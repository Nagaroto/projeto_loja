from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('beckend.urls')),
    path('api/login/', TokenObtainPairView.as_view(), name='login'),
]
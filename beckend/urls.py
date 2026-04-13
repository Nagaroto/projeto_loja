from django.urls import path
from .views import EmailTokenObtainView, RegisterView

urlpatterns = [
    # Rota que o seu React chama no axios.post('/api/login/')
    path('login/', EmailTokenObtainView.as_view(), name='token_obtain_pair'),
    
    # Rota que o seu React chama no axios.post('/api/register/')
    path('register/', RegisterView.as_view(), name='register'),
]

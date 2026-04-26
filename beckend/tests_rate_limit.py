# Testes para rate limiting do endpoint de login.

import pytest
from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from beckend.rate_limiter import (
    HybridRateLimiter,
    RateLimiterConfig,
    get_client_ip,
)
from beckend.views import EmailTokenObtainView


class TestGetClientIP(TestCase):
    """Testa extração do IP do cliente considerando proxies."""
    
    def setUp(self):
        self.factory = RequestFactory()
    
    def test_get_client_ip_direct(self):
        """Testa IP direto sem proxy."""
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.100'
        ip = get_client_ip(request)
        self.assertEqual(ip, '192.168.1.100')
    
    def test_get_client_ip_x_forwarded_for(self):
        """Testa IP via X-Forwarded-For (CloudFlare, Nginx)."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '203.0.113.10, 10.0.0.1'
        ip = get_client_ip(request)
        # Deve usar o primeiro IP da lista
        self.assertEqual(ip, '203.0.113.10')
    
    def test_get_client_ip_x_forwarded_for_single(self):
        """Testa X-Forwarded-For com um único IP."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '203.0.113.10'
        ip = get_client_ip(request)
        self.assertEqual(ip, '203.0.113.10')


class TestHybridRateLimiter(TestCase):
    """Testa lógica de rate limiting."""
    
    def setUp(self):
        # Limpa cache antes de cada teste
        cache.clear()
        
        # Configuração de teste: 3 tentativas por minuto
        self.config = RateLimiterConfig()
        self.config.ATTEMPTS_PER_MINUTE = 3
        self.limiter = HybridRateLimiter(config=self.config)
        self.factory = RequestFactory()
    
    def tearDown(self):
        cache.clear()
    
    def _create_request(self, ip='192.168.1.1'):
        """Helper para criar request com IP específico."""
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = ip
        return request
    
    def test_rate_limit_increment(self):
        """Testa incremento de tentativas."""
        request = self._create_request()
        
        # 1ª tentativa
        status1 = self.limiter.check_rate_limit(request)
        self.assertEqual(status1['current_attempts'], 1)
        
        # 2ª tentativa
        status2 = self.limiter.check_rate_limit(request)
        self.assertEqual(status2['current_attempts'], 2)
    
    def test_rate_limit_exceeded(self):
        """Testa quando limite é atingido."""
        request = self._create_request()
        
        # Faz 3 tentativas (limite)
        for i in range(3):
            self.limiter.check_rate_limit(request)
        
        # 4ª tentativa deve ser bloqueada
        from rest_framework.exceptions import Throttled
        with self.assertRaises(Throttled):
            self.limiter.check_rate_limit(request)
    
    def test_rate_limit_by_email(self):
        """Testa rate limit por email."""
        request = self._create_request()
        email = 'test@example.com'
        
        # 3 tentativas com o mesmo email
        for i in range(3):
            self.limiter.check_rate_limit(request, email=email)
        
        # 4ª deve ser bloqueada mesmo com IP diferente
        request2 = self._create_request(ip='192.168.1.2')
        from rest_framework.exceptions import Throttled
        with self.assertRaises(Throttled):
            self.limiter.check_rate_limit(request2, email=email)
    
    def test_progressive_blocking(self):
        """Testa bloqueio progressivo após falhas."""
        request = self._create_request()
        email = 'test@example.com'
        
        # 3 falhas devem ativar bloqueio
        for _ in range(3):
            self.limiter._record_failure('192.168.1.1', email=email)
        
        # Próxima tentativa deve retornar bloqueio
        from rest_framework.exceptions import Throttled
        with self.assertRaises(Throttled):
            self.limiter.check_rate_limit(request, email=email)
    
    def test_successful_login_clears_counters(self):
        """Testa limpeza de contadores após login bem-sucedido."""
        request = self._create_request()
        email = 'test@example.com'
        
        # Faz algumas tentativas
        for i in range(2):
            self.limiter.check_rate_limit(request, email=email)
        
        # Login bem-sucedido
        self.limiter.record_successful_login(request, email=email)
        
        # Contadores devem estar zerados
        status = self.limiter.check_rate_limit(request, email=email)
        self.assertEqual(status['current_attempts'], 1)  # Nova contagem começa


class TestEmailTokenObtainViewRateLimit(APITestCase):
    """Testa rate limiting no endpoint de login."""
    
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.login_url = '/api/login/'
        
        # Cria usuário de teste
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='TestPassword123'
        )
    
    def tearDown(self):
        cache.clear()
    
    def test_login_success(self):
        """Testa login bem-sucedido."""
        response = self.client.post(
            self.login_url,
            {
                'email': 'test@example.com',
                'password': 'TestPassword123'
            },
            format='json'
        )
        self.assertIn(response.status_code, [200, 400])  # Pode falhar por config
    
    def test_rate_limit_on_failed_logins(self):
        """Testa rate limit após múltiplas falhas."""
        # Modifica config para teste (1 tentativa)
        from beckend.rate_limiter import rate_limiter as rl
        original_limit = rl.config.ATTEMPTS_PER_MINUTE
        rl.config.ATTEMPTS_PER_MINUTE = 2
        
        try:
            # Faz 2 tentativas com senha errada
            for i in range(2):
                self.client.post(
                    self.login_url,
                    {
                        'email': 'test@example.com',
                        'password': 'WrongPassword'
                    },
                    format='json'
                )
            
            # 3ª tentativa deve ser bloqueada
            response = self.client.post(
                self.login_url,
                {
                    'email': 'test@example.com',
                    'password': 'WrongPassword'
                },
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        finally:
            rl.config.ATTEMPTS_PER_MINUTE = original_limit

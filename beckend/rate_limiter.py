# Rate limiter híbrido: por IP e por usuário com bloqueio progressivo.

import logging
from django.core.cache import cache
from django.utils import timezone
from rest_framework.exceptions import Throttled
from datetime import timedelta

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Obtém o IP do cliente considerando proxies.
    Suporta X-Forwarded-For (CloudFlare, Nginx, etc).
    """
    # Tenta X-Forwarded-For primeiro (proxies)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    # Fallback para REMOTE_ADDR
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


class RateLimiterConfig:
    """Configuração do rate limiter."""
    
    # Limite de tentativas por minuto
    ATTEMPTS_PER_MINUTE = 10
    
    # Duração da janela de rate limit (em segundos)
    RATE_LIMIT_WINDOW = 60
    
    # Configuração de bloqueio progressivo
    ENABLE_PROGRESSIVE_BLOCKING = True
    
    # Após N tentativas falhadas, aumenta o tempo de bloqueio
    FAIL_THRESHOLD = 3
    BLOCK_DURATION_SECONDS = 300  # 5 minutos
    
    # Máximo de bloqueios antes de banimento longo
    MAX_BLOCKS = 5
    LONG_BLOCK_DURATION_SECONDS = 3600  # 1 hora


class HybridRateLimiter:
    """
    Rate limiter híbrido que controla por IP e por usuário.
    
    Estratégia:
    - Identifica tentativas por IP
    - Identifica tentativas por email/username
    - Aplica limite mais restritivo
    - Bloqueio progressivo após falhas consecutivas
    """
    
    def __init__(self, config=None):
        self.config = config or RateLimiterConfig()
    
    def _get_cache_key(self, identifier_type, identifier):
        """Gera chave única para cache."""
        return f"login_ratelimit:{identifier_type}:{identifier}"
    
    def _get_fail_cache_key(self, identifier_type, identifier):
        """Gera chave para contagem de falhas."""
        return f"login_failures:{identifier_type}:{identifier}"
    
    def _get_block_cache_key(self, identifier_type, identifier):
        """Gera chave para bloqueio progressivo."""
        return f"login_blocked:{identifier_type}:{identifier}"
    
    def _get_attempts_count(self, cache_key):
        """Retorna tentativas atuais."""
        return cache.get(cache_key, 0)
    
    def _increment_attempts(self, cache_key):
        """Incrementa contador de tentativas."""
        current = self._get_attempts_count(cache_key)
        new_count = current + 1
        cache.set(
            cache_key,
            new_count,
            self.config.RATE_LIMIT_WINDOW
        )
        return new_count
    
    def _record_failure(self, ip, email=None):
        """Registra tentativa de login falhada."""
        if self.config.ENABLE_PROGRESSIVE_BLOCKING and email:
            fail_key = self._get_fail_cache_key('email', email)
            failures = cache.get(fail_key, 0) + 1
            cache.set(fail_key, failures, self.config.RATE_LIMIT_WINDOW * 5)
            
            # Se excedeu limite de falhas, ativa bloqueio
            if failures >= self.config.FAIL_THRESHOLD:
                block_key = self._get_block_cache_key('email', email)
                block_count = cache.get(block_key, 0) + 1
                
                # Duração aumenta gradualmente: 60s, 80s, 100s, etc.
                duration = 60 + (block_count - 1) * 20
                if block_count > self.config.MAX_BLOCKS:
                    duration = self.config.LONG_BLOCK_DURATION_SECONDS
                
                cache.set(block_key, block_count, duration)
                logger.warning(
                    f"Bloqueio progressivo para email {email} (tentativa {block_count}). "
                    f"Duração: {duration}s. IP: {ip}"
                )
    
    def _is_blocked(self, ip, email=None):
        """Verifica se está bloqueado por progresso de falhas."""
        if email and self.config.ENABLE_PROGRESSIVE_BLOCKING:
            block_key = self._get_block_cache_key('email', email)
            return cache.get(block_key, 0) > 0
        return False
    
    def check_rate_limit(self, request, email=None):
        """
        Verifica rate limit híbrido: por IP e por email.
        
        Args:
            request: Request HTTP
            email: Email do usuário (opcional)
        
        Raises:
            Throttled: Se limite foi atingido
        
        Returns:
            dict com informações do status
        """
        ip = get_client_ip(request)
        
        # Verifica bloqueio progressivo (prioridade máxima)
        if email and self._is_blocked(ip, email):
            block_key = self._get_block_cache_key('email', email)
            block_count = cache.get(block_key, 1)
            duration = self.config.LONG_BLOCK_DURATION_SECONDS \
                if block_count > self.config.MAX_BLOCKS \
                else self.config.BLOCK_DURATION_SECONDS
            
            logger.warning(
                f"Tentativa de login para {email} bloqueada (bloqueio #{block_count}). IP: {ip}"
            )
            raise Throttled(
                wait=duration,
                detail=f"Conta temporariamente bloqueada por múltiplas tentativas. "
                       f"Tente novamente em {duration} segundos."
            )
        
        # Rate limit por IP
        ip_cache_key = self._get_cache_key('ip', ip)
        ip_attempts = self._increment_attempts(ip_cache_key)
        
        # Rate limit por email (se fornecido)
        if email:
            email_cache_key = self._get_cache_key('email', email)
            email_attempts = self._increment_attempts(email_cache_key)
            
            # Usa o limite mais restritivo
            current_attempts = max(ip_attempts, email_attempts)
        else:
            current_attempts = ip_attempts
        
        # Verifica se excedeu limite
        if current_attempts > self.config.ATTEMPTS_PER_MINUTE:
            identifier = email if email else ip
            logger.warning(
                f"Rate limit atingido para {identifier} (tentativa {current_attempts}). IP: {ip}"
            )
            raise Throttled(
                wait=self.config.RATE_LIMIT_WINDOW,
                detail=f"Muitas tentativas de login. Tente novamente em {self.config.RATE_LIMIT_WINDOW} segundos."
            )
        
        return {
            'ip': ip,
            'email': email,
            'current_attempts': current_attempts,
            'max_attempts': self.config.ATTEMPTS_PER_MINUTE,
            'remaining': self.config.ATTEMPTS_PER_MINUTE - current_attempts,
        }
    
    def record_successful_login(self, request, email=None):
        """Limpa contadores após login bem-sucedido."""
        ip = get_client_ip(request)
        
        # Limpa tentativas por IP
        ip_cache_key = self._get_cache_key('ip', ip)
        cache.delete(ip_cache_key)
        
        # Limpa tentativas e falhas por email
        if email:
            email_cache_key = self._get_cache_key('email', email)
            fail_key = self._get_fail_cache_key('email', email)
            cache.delete(email_cache_key)
            cache.delete(fail_key)
            logger.info(f"Login bem-sucedido para {email}. Contadores limpos.")


# Instância global
rate_limiter = HybridRateLimiter()

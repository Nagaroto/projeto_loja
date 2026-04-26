# Admin utilities para gerenciar rate limiting.

from django.core.cache import cache
from django.contrib.auth.models import User
from .rate_limiter import rate_limiter


class RateLimitAdmin:
    """Utilitários para administrar rate limiting."""
    
    @staticmethod
    def get_user_status(email):
        """Obtém status de rate limit para um usuário específico."""
        ip_key = rate_limiter._get_cache_key('email', email)
        fail_key = rate_limiter._get_fail_cache_key('email', email)
        block_key = rate_limiter._get_block_cache_key('email', email)
        
        return {
            'email': email,
            'attempts': cache.get(ip_key, 0),
            'failures': cache.get(fail_key, 0),
            'blocks': cache.get(block_key, 0),
            'is_blocked': cache.get(block_key, 0) > 0,
        }
    
    @staticmethod
    def get_ip_status(ip):
        """Obtém status de rate limit para um IP específico."""
        ip_key = rate_limiter._get_cache_key('ip', ip)
        
        return {
            'ip': ip,
            'attempts': cache.get(ip_key, 0),
        }
    
    @staticmethod
    def reset_user(email):
        """Reseta todos os contadores de um usuário."""
        ip_key = rate_limiter._get_cache_key('email', email)
        fail_key = rate_limiter._get_fail_cache_key('email', email)
        block_key = rate_limiter._get_block_cache_key('email', email)
        
        cache.delete(ip_key)
        cache.delete(fail_key)
        cache.delete(block_key)
        
        return f"Rate limit resetado para {email}"
    
    @staticmethod
    def reset_ip(ip):
        """Reseta contadores de um IP."""
        ip_key = rate_limiter._get_cache_key('ip', ip)
        cache.delete(ip_key)
        
        return f"Rate limit resetado para IP {ip}"
    
    @staticmethod
    def reset_all():
        """Reseta TODOS os contadores de rate limiting."""
        # Isso é uma operação perigosa em produção
        # Melhor seria usar um padrão com cache.delete_pattern() se disponível
        return "Use reset_user() ou reset_ip() para evitar apagar dados importantes"
    
    @staticmethod
    def list_blocked_users():
        """Lista todos os usuários bloqueados (usando cache key patterns)."""
        # Nota: Django cache não tem pattern matching built-in
        # Esta é uma limitation do design. Para produção, use Redis
        return "Para listar bloqueados, use Redis com pattern matching"

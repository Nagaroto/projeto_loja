# Comando Django para gerenciar rate limiting via CLI.

from django.core.management.base import BaseCommand
from beckend.rate_limit_admin import RateLimitAdmin


class Command(BaseCommand):
    """
    Gerencia rate limiting do endpoint de login.
    
    Uso:
        python manage.py ratelimit --status email@example.com
        python manage.py ratelimit --reset email@example.com
        python manage.py ratelimit --status-ip 192.168.1.1
        python manage.py ratelimit --reset-ip 192.168.1.1
    """
    
    help = 'Gerenciar rate limiting de login'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--status',
            type=str,
            help='Verifica status de rate limit para um email'
        )
        parser.add_argument(
            '--status-ip',
            type=str,
            help='Verifica status de rate limit para um IP'
        )
        parser.add_argument(
            '--reset',
            type=str,
            help='Reseta rate limit para um email'
        )
        parser.add_argument(
            '--reset-ip',
            type=str,
            help='Reseta rate limit para um IP'
        )
    
    def handle(self, *args, **options):
        if options['status']:
            email = options['status']
            status = RateLimitAdmin.get_user_status(email)
            self.stdout.write(self.style.SUCCESS(f"\nStatus para {email}:"))
            self.stdout.write(f"  Tentativas: {status['attempts']}")
            self.stdout.write(f"  Falhas: {status['failures']}")
            self.stdout.write(f"  Bloqueios: {status['blocks']}")
            self.stdout.write(f"  Bloqueado: {'Sim' if status['is_blocked'] else 'Não'}")
        
        elif options['status_ip']:
            ip = options['status_ip']
            status = RateLimitAdmin.get_ip_status(ip)
            self.stdout.write(self.style.SUCCESS(f"\nStatus para IP {ip}:"))
            self.stdout.write(f"  Tentativas: {status['attempts']}")
        
        elif options['reset']:
            email = options['reset']
            msg = RateLimitAdmin.reset_user(email)
            self.stdout.write(self.style.SUCCESS(f"\n✓ {msg}"))
        
        elif options['reset_ip']:
            ip = options['reset_ip']
            msg = RateLimitAdmin.reset_ip(ip)
            self.stdout.write(self.style.SUCCESS(f"\n✓ {msg}"))
        
        else:
            self.stdout.write(self.style.WARNING(
                "\nUse: --status, --status-ip, --reset ou --reset-ip\n"
            ))

# Cria usuário cliente fictício para testes locais.

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Cria usuário de teste cliente: user@email.com / user123 (não é staff).'

    def handle(self, *args, **options):
        email = 'user@email.com'
        password = 'user123'
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'Usuário {email} já existe.'))
            return
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
        )
        user.is_staff = False
        user.is_superuser = False
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Cliente criado: {email} / {password}'))

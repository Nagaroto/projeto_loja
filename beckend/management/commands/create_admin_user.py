# Cria superusuário local de desenvolvimento (não usar em produção).

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Cria usuário admin de teste para desenvolvimento'

    def handle(self, *args, **options):
        if User.objects.filter(email='admin@teste.com').exists():
            self.stdout.write(self.style.WARNING('Admin já existe: admin@teste.com'))
            return

        User.objects.create_superuser(
            username='admin_teste',
            email='admin@teste.com',
            password='admin123',
        )

        self.stdout.write(self.style.SUCCESS('Admin criado: admin@teste.com / admin123'))

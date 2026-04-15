from django.core.management.base import BaseCommand

from beckend.order_lifecycle import purge_expired_unpaid_orders


class Command(BaseCommand):
    help = 'Remove pedidos pendentes não pagos após o prazo (24h) e devolve estoque ao catálogo.'

    def handle(self, *args, **options):
        n = purge_expired_unpaid_orders()
        self.stdout.write(self.style.SUCCESS(f'Pedidos expirados removidos: {n}.'))

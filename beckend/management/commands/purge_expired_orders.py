from django.core.management.base import BaseCommand

from beckend.order_lifecycle import purge_expired_unpaid_orders


class Command(BaseCommand):
    help = 'Marca pedidos pendentes não pagos como expirados após o prazo (1h) e devolve estoque ao catálogo.'

    def handle(self, *args, **options):
        n = purge_expired_unpaid_orders()
        self.stdout.write(self.style.SUCCESS(f'Pedidos marcados como expirados: {n}.'))

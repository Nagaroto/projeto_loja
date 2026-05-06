from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Remove notificações expiradas (Notification.expires_at <= now).'

    def handle(self, *args, **options):
        # Importa aqui para não carregar models ao iniciar Django desnecessariamente
        from beckend.views import purge_expired_notifications

        purge_expired_notifications()
        self.stdout.write(self.style.SUCCESS('Notificações expiradas removidas.'))


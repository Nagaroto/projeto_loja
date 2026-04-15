from django.apps import AppConfig


class BeckendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'beckend'

    def ready(self):
        """Registra signals ao carregar a app."""
        import beckend.signals  # noqa: F401

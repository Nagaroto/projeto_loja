# Atualiza image_url de todos os produtos para o asset estático cereon.webp.

from django.core.management.base import BaseCommand
from beckend.models import Product


class Command(BaseCommand):
    help = 'Define image_url de todos os produtos como /imgs/cereon.webp'

    def handle(self, *args, **options):
        cereon_image_url = '/imgs/cereon.webp'
        updated = 0
        for product in Product.objects.all():
            if product.image_url != cereon_image_url:
                product.image_url = cereon_image_url
                product.save()
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'Atualizado: {product.name}'))
        self.stdout.write(self.style.SUCCESS(f'{updated} produto(s) atualizado(s).'))

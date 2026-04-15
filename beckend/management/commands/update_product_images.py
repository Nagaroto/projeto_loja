# Substitui placeholders ou URLs vazias por imagem estável (loremflickr).

from django.core.management.base import BaseCommand
from beckend.models import Product


class Command(BaseCommand):
    help = 'Preenche image_url ausente ou via.placeholder.com com loremflickr'

    def handle(self, *args, **options):
        updated = 0
        for product in Product.objects.all():
            if not product.image_url or 'via.placeholder.com' in product.image_url:
                product.image_url = f'https://loremflickr.com/300/300?lock={product.id}'
                product.save()
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'Atualizado: {product.name} ({product.id})'))
        self.stdout.write(self.style.SUCCESS(f'{updated} produto(s) atualizado(s).'))

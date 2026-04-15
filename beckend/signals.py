# Signals: desativa produtos antes da exclusão de categoria; cria perfil ao registrar User.

from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import Category, Product, UserProfile


@receiver(pre_delete, sender=Category)
def deactivate_products_on_category_delete(sender, instance, **kwargs):
    """Evita vitrine com produtos órfãos: inativa itens da categoria removida."""
    Product.objects.filter(category=instance).update(is_active=False)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

# Código do pedido, expiração 24h, devolução de estoque e remoção de pendentes não pagos.

import secrets
from datetime import timedelta

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

ORDER_CODE_PREFIX = 'qwrt'
UNPAID_RETENTION = timedelta(hours=24)


def generate_public_code():
    from .models import Order

    for _ in range(100):
        suffix = ''.join(secrets.choice('0123456789') for _ in range(6))
        code = f'{ORDER_CODE_PREFIX}-{suffix}'
        if not Order.objects.filter(public_code=code).exists():
            return code
    raise RuntimeError('Não foi possível gerar código único do pedido.')


def default_expires_at():
    return timezone.now() + UNPAID_RETENTION


def restore_stock_for_order(order):
    from .models import Product

    for item in order.items.select_related('product'):
        Product.objects.filter(pk=item.product_id).update(stock=F('stock') + item.quantity)


def order_is_unpaid_expired(order, now=None):
    now = now or timezone.now()
    if order.status != 'pendente' or order.paid_at is not None:
        return False
    if order.expires_at:
        return order.expires_at < now
    return order.created_at < now - UNPAID_RETENTION


def purge_expired_unpaid_orders(now=None):
    """Remove pedidos pendentes não pagos após o prazo; devolve estoque."""
    from .models import Order

    now = now or timezone.now()
    qs = (
        Order.objects.filter(status='pendente', paid_at__isnull=True)
        .filter(
            Q(expires_at__isnull=False, expires_at__lt=now)
            | Q(expires_at__isnull=True, created_at__lt=now - UNPAID_RETENTION),
        )
        .prefetch_related('items__product')
    )
    deleted = 0
    for order in qs:
        with transaction.atomic():
            restore_stock_for_order(order)
            order.delete()
            deleted += 1
    return deleted

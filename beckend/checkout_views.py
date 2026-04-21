# Checkout autenticado: totais e frete calculados no servidor; estoque conferido.

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Order, OrderItem, Address, Coupon, CouponRedemption, UserProfile
from .serializers import OrderSerializer
from .checkout_service import (
    sanitize_customer_notes,
    quote_shipping_fee,
    format_address_snapshot,
    delivery_dict_to_summary,
)
from .order_lifecycle import (
    default_expires_at,
    generate_public_code,
    purge_expired_unpaid_orders,
)


VALID_PAYMENT = {'pix', 'cartao', 'boleto'}


class ShippingQuoteView(APIView):
    """Cota frete só a partir do CEP (valor sempre recalculado no checkout)."""

    permission_classes = [AllowAny]

    def post(self, request):
        cep = request.data.get('cep', '')
        try:
            fee = quote_shipping_fee(cep)
        except ValidationError as e:
            return Response({'detail': e.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'shipping_fee': str(fee),
            'currency': 'BRL',
        })


class CheckoutView(APIView):
    """Fecha pedido com preços do banco; ignora total enviado pelo cliente."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        purge_expired_unpaid_orders()
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if not (profile.cpf or '').strip():
            return Response({'detail': 'CPF é obrigatório para finalizar a compra.'}, status=400)

        items_data = request.data.get('items')
        if not isinstance(items_data, list) or len(items_data) == 0:
            return Response(
                {'detail': 'Envie ao menos um item com product_id e quantity.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(items_data) > 50:
            return Response({'detail': 'Quantidade máxima de linhas excedida.'}, status=400)

        payment_method = (request.data.get('payment_method') or 'pix').lower()
        if payment_method not in VALID_PAYMENT:
            return Response({'detail': 'Método de pagamento inválido.'}, status=400)

        notes = sanitize_customer_notes(request.data.get('customer_notes', ''))
        coupon_code = (request.data.get('coupon_code') or '').strip().upper()

        address_id = request.data.get('address_id')
        delivery = request.data.get('delivery')
        cep_for_quote = None
        delivery_summary = ''

        if address_id not in (None, ''):
            addr = Address.objects.filter(pk=address_id, user=user).first()
            if not addr:
                return Response({'detail': 'Endereço não encontrado.'}, status=400)
            delivery_summary = format_address_snapshot(addr)
            cep_for_quote = addr.cep
        elif isinstance(delivery, dict):
            try:
                delivery_summary, cep_for_quote = delivery_dict_to_summary(delivery)
            except ValidationError as e:
                return Response({'detail': e.messages[0]}, status=400)
        else:
            return Response(
                {'detail': 'Informe address_id (endereço salvo) ou delivery (objeto com CEP e rua).'},
                status=400,
            )

        try:
            shipping_fee = quote_shipping_fee(cep_for_quote)
        except ValidationError as e:
            return Response({'detail': e.messages[0]}, status=400)

        try:
            with transaction.atomic():
                merged = defaultdict(int)
                for row in items_data:
                    try:
                        pid = int(row['product_id'])
                        qty = int(row['quantity'])
                    except (KeyError, TypeError, ValueError):
                        raise ValidationError('Cada item precisa de product_id e quantity inteiros.')
                    if qty < 1 or qty > 999:
                        raise ValidationError('Quantidade deve estar entre 1 e 999.')
                    merged[pid] += qty

                id_qty = list(merged.items())
                if sum(q for _, q in id_qty) > 500:
                    raise ValidationError('Quantidade total no pedido excede o limite.')

                pids = [t[0] for t in id_qty]
                products = {
                    p.id: p
                    for p in Product.objects.select_for_update().filter(id__in=pids)
                }

                subtotal = Decimal('0')
                lines = []
                for pid, qty in id_qty:
                    p = products.get(pid)
                    if not p:
                        raise ValidationError(f'Produto {pid} não encontrado.')
                    if not p.is_active:
                        raise ValidationError(f'Produto indisponível: {p.name}.')
                    if p.stock < qty:
                        raise ValidationError(f'Estoque insuficiente para {p.name}.')

                    line_total = p.price * qty
                    subtotal += line_total
                    lines.append((p, qty, p.price))

                coupon = None
                discount_amount = Decimal('0')
                if coupon_code:
                    coupon = Coupon.objects.select_for_update().filter(code__iexact=coupon_code).first()
                    if not coupon:
                        raise ValidationError('Cupom inválido.')
                    if not coupon.is_valid():
                        raise ValidationError('Cupom expirado ou indisponível.')
                    # 1 uso por CPF (regra de negócio)
                    if CouponRedemption.objects.filter(coupon=coupon, cpf=profile.cpf).exists():
                        raise ValidationError('Este cupom já foi utilizado para este CPF.')
                    if coupon.max_uses and coupon.uses_count >= coupon.max_uses:
                        raise ValidationError('Cupom atingiu o limite total de usos.')

                    eligible_ids = list(
                        coupon.eligible_products.values_list('id', flat=True)
                    )
                    eligible_required = len(eligible_ids) > 0
                    eligible_subtotal = Decimal('0')
                    for p, qty, unit_price in lines:
                        if (not eligible_required) or (p.id in eligible_ids):
                            eligible_subtotal += unit_price * qty
                    if eligible_required and eligible_subtotal <= 0:
                        raise ValidationError('Cupom não se aplica aos produtos do carrinho.')

                    pct = int(coupon.discount_percent or 0)
                    if pct < 1 or pct > 100:
                        raise ValidationError('Cupom com percentual inválido.')

                    discount_amount = (eligible_subtotal * Decimal(pct) / Decimal('100')).quantize(Decimal('0.01'))
                    if discount_amount < 0:
                        discount_amount = Decimal('0')
                    if discount_amount > subtotal:
                        discount_amount = subtotal

                total = (subtotal - discount_amount) + shipping_fee

                order = Order.objects.create(
                    customer_email=user.email,
                    user=user,
                    total=total,
                    shipping_fee=shipping_fee,
                    payment_method=payment_method,
                    customer_notes=notes,
                    delivery_summary=delivery_summary,
                    coupon=coupon,
                    status='pendente',
                    public_code=generate_public_code(),
                    expires_at=default_expires_at(),
                )

                for p, qty, unit_price in lines:
                    OrderItem.objects.create(
                        order=order,
                        product=p,
                        quantity=qty,
                        price=unit_price,
                    )
                    p.stock -= qty
                    p.save(update_fields=['stock'])

                if coupon:
                    Coupon.objects.filter(pk=coupon.pk).update(uses_count=F('uses_count') + 1)
                    CouponRedemption.objects.create(
                        coupon=coupon,
                        cpf=profile.cpf,
                        order=order,
                    )

        except ValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            return Response({'detail': msg}, status=400)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

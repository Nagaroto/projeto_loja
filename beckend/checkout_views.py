# Checkout autenticado: totais e frete calculados no servidor; estoque conferido.

from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Order, OrderItem, Address
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

                total = subtotal + shipping_fee

                order = Order.objects.create(
                    customer_email=user.email,
                    user=user,
                    total=total,
                    shipping_fee=shipping_fee,
                    payment_method=payment_method,
                    customer_notes=notes,
                    delivery_summary=delivery_summary,
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

        except ValidationError as e:
            msg = e.messages[0] if e.messages else str(e)
            return Response({'detail': msg}, status=400)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

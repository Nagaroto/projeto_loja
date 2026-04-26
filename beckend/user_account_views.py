# Endpoints autenticados: perfil, endereços, credenciais e pedidos do cliente.

from collections import Counter

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Address, Order, UserProfile, Cart, CartItem, Product
from .order_lifecycle import (
    order_is_unpaid_expired,
    purge_expired_unpaid_orders,
    restore_stock_for_order,
)
from .serializers import AddressSerializer, OrderSerializer, UserProfileSerializer, CartSerializer


class UserProfileMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        ser = UserProfileSerializer(profile)
        return Response({
            'user_id': request.user.id,
            'email': request.user.email,
            **ser.data,
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        ser = UserProfileSerializer(profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response({
            'user_id': request.user.id,
            'email': request.user.email,
            **UserProfileSerializer(profile).data,
        })


class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by('-is_default', 'id')

    def perform_create(self, serializer):
        inst = serializer.save(user=self.request.user)
        if inst.is_default:
            Address.objects.filter(user=self.request.user).exclude(pk=inst.pk).update(is_default=False)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        inst = serializer.save()
        if inst.is_default:
            Address.objects.filter(user=self.request.user).exclude(pk=inst.pk).update(is_default=False)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response(
                {'detail': 'Informe a senha atual e a nova senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(old_password):
            return Response(
                {'detail': 'Senha atual incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 6:
            return Response(
                {'detail': 'A nova senha deve ter pelo menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new_password)
        request.user.save()
        return Response({'detail': 'Senha alterada com sucesso.'})


class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = (request.data.get('new_email') or '').strip().lower()
        password = request.data.get('password')
        if not new_email or not password:
            return Response(
                {'detail': 'Informe o novo e-mail e sua senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response(
                {'detail': 'Este e-mail já está em uso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(password):
            return Response(
                {'detail': 'Senha incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.email = new_email
        request.user.username = new_email
        request.user.save()
        return Response({'detail': 'E-mail atualizado com sucesso.', 'email': new_email})


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response(
                {'detail': 'Informe sua senha para excluir a conta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(password):
            return Response(
                {'detail': 'Senha incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        user.delete()
        return Response({'detail': 'Conta excluída com sucesso.'})


def _normalize_cart_items(items):
    if not isinstance(items, list):
        raise ValueError('items precisa ser uma lista de objetos com product_id e quantity')

    counts = Counter()
    for item in items:
        if isinstance(item, dict):
            product_id = item.get('product_id') or item.get('id') or item.get('product')
            quantity = item.get('quantity') or item.get('qty') or 1
        else:
            product_id = item
            quantity = 1

        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            continue

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 1

        if product_id <= 0 or quantity <= 0:
            continue

        counts[product_id] += quantity

    if not counts:
        raise ValueError('Nenhum item válido foi fornecido para verificação de duplicação.')

    return counts


def _order_items_to_counter(order):
    counts = Counter()
    for item in order.items.all():
        counts[int(item.product_id)] += int(item.quantity or 1)
    return counts


def _find_duplicate_order(user, current_items):
    purge_expired_unpaid_orders()
    current_counts = _normalize_cart_items(current_items)

    active_statuses = {'pendente', 'pago', 'confirmado', 'enviado'}
    orders = (
        Order.objects.filter(Q(user=user) | Q(customer_email=user.email))
        .distinct()
        .prefetch_related('items__product')
        .order_by('-created_at')
    )

    for order in orders:
        if order.status not in active_statuses:
            continue
        if _order_items_to_counter(order) == current_counts:
            return order

    return None


class MyOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purge_expired_unpaid_orders()
        u = request.user
        orders = (
            Order.objects.filter(Q(user=u) | Q(customer_email=u.email))
            .distinct()
            .prefetch_related('items__product')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(orders, many=True).data)


class DuplicateOrderCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            items = request.data.get('items')
            duplicate_order = _find_duplicate_order(request.user, items)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if duplicate_order is not None:
            return Response({
                'duplicate': True,
                'order_id': duplicate_order.id,
                'order_code': duplicate_order.public_code or f'#{duplicate_order.id}',
                'message': (
                    f'Este pedido já existe em "Minhas Compras" ' 
                    f'({duplicate_order.public_code or f"#{duplicate_order.id}"}). '
                    'Por favor, finalize o pedido existente antes de criar um novo.'
                ),
            })

        return Response({'duplicate': False})


class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        purge_expired_unpaid_orders()
        u = request.user
        order = (
            Order.objects.filter(pk=pk)
            .filter(Q(user=u) | Q(customer_email=u.email))
            .prefetch_related('items__product')
            .first()
        )
        if not order:
            return Response({'detail': 'Pedido não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if order.status != 'pendente':
            return Response(
                {'detail': 'Somente pedidos pendentes podem ser cancelados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.paid_at is not None:
            return Response(
                {'detail': 'Este pedido já consta como pago.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order_is_unpaid_expired(order):
            return Response(
                {'detail': 'Este pedido expirou e não pode mais ser cancelado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            restore_stock_for_order(order)
            order.status = 'cancelado'
            order.save(update_fields=['status', 'updated_at'])
        return Response(OrderSerializer(order).data)


class MyCartView(APIView):
    """Carrinho persistido do usuário autenticado."""

    permission_classes = [IsAuthenticated]

    @staticmethod
    def _get_cart(user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def get(self, request):
        cart = self._get_cart(request.user)
        cart = Cart.objects.filter(pk=cart.pk).prefetch_related('items__product').first()
        return Response(CartSerializer(cart).data)


class CartAddItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        try:
            product_id = int(request.data.get('product_id'))
            quantity = int(request.data.get('quantity') or 1)
        except (TypeError, ValueError):
            return Response({'detail': 'product_id e quantity devem ser inteiros.'}, status=400)
        if quantity < 1 or quantity > 999:
            return Response({'detail': 'Quantidade deve estar entre 1 e 999.'}, status=400)

        product = Product.objects.filter(pk=product_id).first()
        if not product or not product.is_active:
            return Response({'detail': 'Produto não encontrado ou indisponível.'}, status=400)

        size = (request.data.get('size') or '').strip()
        color = (request.data.get('color') or '').strip()
        cart_item_key = (request.data.get('cart_item_key') or request.data.get('cartId') or '').strip()

        with transaction.atomic():
            if cart_item_key:
                item = CartItem.objects.select_for_update().filter(cart=cart, cart_item_key=cart_item_key).first()
            else:
                item = CartItem.objects.select_for_update().filter(cart=cart, product=product, size=size, color=color, cart_item_key='').first()

            if item:
                item.quantity = item.quantity + quantity
                item.size = size
                item.color = color
                if cart_item_key:
                    item.cart_item_key = cart_item_key
                item.save(update_fields=['quantity', 'size', 'color', 'cart_item_key', 'updated_at'])
            else:
                CartItem.objects.create(
                    cart=cart,
                    product=product,
                    quantity=quantity,
                    size=size,
                    color=color,
                    cart_item_key=cart_item_key,
                )

        cart.refresh_from_db()
        cart = Cart.objects.filter(pk=cart.pk).prefetch_related('items__product').first()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartRemoveItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            return Response({'detail': 'Carrinho vazio.'}, status=200)

        cart_item_key = (request.data.get('cart_item_key') or request.data.get('cartId') or '').strip()
        item_id = request.data.get('item_id')

        qs = CartItem.objects.filter(cart=cart)
        if cart_item_key:
            qs = qs.filter(cart_item_key=cart_item_key)
        elif item_id not in (None, ''):
            qs = qs.filter(pk=item_id)
        else:
            return Response({'detail': 'Informe cart_item_key (ou item_id) para remover.'}, status=400)

        qs.delete()
        cart = Cart.objects.filter(pk=cart.pk).prefetch_related('items__product').first()
        return Response(CartSerializer(cart).data, status=200)


class CartSyncView(APIView):
    """Sincroniza carrinho persistido com estado final enviado pelo cliente."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        items = request.data.get('items')
        if not isinstance(items, list):
            return Response({'detail': 'Envie items como lista.'}, status=400)
        if len(items) > 200:
            return Response({'detail': 'Quantidade máxima de itens excedida.'}, status=400)

        cart, _ = Cart.objects.get_or_create(user=request.user)

        normalized_map = {}
        for row in items:
            if not isinstance(row, dict):
                continue
            try:
                product_id = int(row.get('product_id') or row.get('id'))
                quantity = int(row.get('quantity') or 1)
            except (TypeError, ValueError):
                continue
            if quantity < 1:
                continue
            if quantity > 999:
                quantity = 999
            cart_item_key = (row.get('cart_item_key') or row.get('cartId') or '').strip()
            size = (row.get('size') or '').strip()
            color = (row.get('color') or '').strip()
            identity = f'key:{cart_item_key}' if cart_item_key else f'raw:{product_id}:{size}:{color}'
            # Em sync, o payload representa o estado final do carrinho.
            normalized_map[identity] = (product_id, quantity, cart_item_key, size, color)

        normalized = list(normalized_map.values())

        pids = sorted({pid for pid, *_ in normalized})
        products = {p.id: p for p in Product.objects.filter(id__in=pids, is_active=True)}

        with transaction.atomic():
            existing_items = list(CartItem.objects.select_for_update().filter(cart=cart))
            existing_by_identity = {}
            for item in existing_items:
                key = (item.cart_item_key or '').strip()
                identity = f'key:{key}' if key else f'raw:{item.product_id}:{item.size}:{item.color}'
                existing_by_identity[identity] = item

            desired_identities = set(normalized_map.keys())
            existing_identities = set(existing_by_identity.keys())
            stale_identities = existing_identities - desired_identities
            stale_item_ids = [existing_by_identity[i].id for i in stale_identities]
            if stale_item_ids:
                CartItem.objects.filter(cart=cart, id__in=stale_item_ids).delete()

            for pid, qty, key, size, color in normalized:
                p = products.get(pid)
                if not p:
                    continue
                identity = f'key:{key}' if key else f'raw:{pid}:{size}:{color}'
                item = existing_by_identity.get(identity)
                if item:
                    item.quantity = qty
                    item.size = size
                    item.color = color
                    if key:
                        item.cart_item_key = key
                    item.save(update_fields=['quantity', 'size', 'color', 'cart_item_key', 'updated_at'])
                else:
                    CartItem.objects.create(
                        cart=cart,
                        product=p,
                        quantity=qty,
                        size=size,
                        color=color,
                        cart_item_key=key,
                    )

        cart = Cart.objects.filter(pk=cart.pk).prefetch_related('items__product').first()
        return Response(CartSerializer(cart).data, status=200)

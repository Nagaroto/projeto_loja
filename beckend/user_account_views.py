# Endpoints autenticados: perfil, endereços, credenciais e pedidos do cliente.

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Address, Order, UserProfile
from .order_lifecycle import (
    order_is_unpaid_expired,
    purge_expired_unpaid_orders,
    restore_stock_for_order,
)
from .serializers import AddressSerializer, OrderSerializer, UserProfileSerializer


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

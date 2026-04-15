# Serializers DRF: validação e representação JSON dos modelos da loja.

from rest_framework import serializers
from django.utils.text import slugify
from .models import Product, Coupon, Order, OrderItem, Category, UserProfile, Address


class CategorySerializer(serializers.ModelSerializer):
    """Categoria com slug gerado a partir do nome na criação/edição."""

    @staticmethod
    def _unique_slug_for_name(name, exclude_pk=None):
        base = slugify(name.strip()) or 'categoria'
        slug = base
        n = 0
        qs = Category.objects.filter(slug=slug)
        if exclude_pk is not None:
            qs = qs.exclude(pk=exclude_pk)
        while qs.exists():
            n += 1
            slug = f'{base}-{n}'
            qs = Category.objects.filter(slug=slug)
            if exclude_pk is not None:
                qs = qs.exclude(pk=exclude_pk)
        return slug

    def create(self, validated_data):
        validated_data['slug'] = self._unique_slug_for_name(validated_data['name'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'name' in validated_data and validated_data['name'] != instance.name:
            validated_data['slug'] = self._unique_slug_for_name(
                validated_data['name'],
                exclude_pk=instance.pk,
            )
        return super().update(instance, validated_data)

    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['full_name', 'cpf', 'phone']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'label', 'cep', 'street', 'number', 'complement',
            'neighborhood', 'city', 'state', 'is_default',
        ]
        read_only_fields = ['id']


class ProductSerializer(serializers.ModelSerializer):
    """Produto com category_name somente leitura para o front."""

    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
    )

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ['id', 'uses_count', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price', 'subtotal']
        read_only_fields = ['id', 'subtotal']

    def get_subtotal(self, obj):
        return float(obj.subtotal())


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(read_only=True, many=True)
    is_cancelable = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_email',
            'user',
            'total',
            'shipping_fee',
            'payment_method',
            'customer_notes',
            'delivery_summary',
            'coupon',
            'status',
            'public_code',
            'expires_at',
            'paid_at',
            'created_at',
            'updated_at',
            'items',
            'is_cancelable',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'items',
            'public_code',
            'expires_at',
            'paid_at',
            'is_cancelable',
        ]

    def get_is_cancelable(self, obj):
        from django.utils import timezone

        from .order_lifecycle import UNPAID_RETENTION

        if obj.status != 'pendente' or obj.paid_at is not None:
            return False
        now = timezone.now()
        if obj.expires_at:
            return obj.expires_at > now
        return obj.created_at + UNPAID_RETENTION > now

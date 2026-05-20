# Serializers DRF: validação e representação JSON dos modelos da loja.

import os
from django.conf import settings
from rest_framework import serializers
from django.utils.text import slugify
import requests
from .models import (
    Product,
    ProductImage,
    Coupon,
    Promotion,
    CouponRedemption,
    Order,
    OrderItem,
    Category,
    UserProfile,
    Address,
    Cart,
    CartItem,
    Notification,
    NotificationRead,
)
from .product_image_serializer import ProductImageSerializer


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
    def validate_full_name(self, value):
        name = (value or '').strip()
        if not name:
            return ''
        if len(name) < 3:
            raise serializers.ValidationError('Nome inválido.')
        parts = [p for p in name.split(' ') if p]
        if len(parts) < 2:
            raise serializers.ValidationError('Informe nome e sobrenome.')
        return name

    def validate_cpf(self, value):
        raw = (value or '').strip()
        if raw == '':
            return ''
        digits = ''.join(c for c in raw if c.isdigit())
        if len(digits) != 11:
            raise serializers.ValidationError('CPF deve conter 11 dígitos.')
        formatted = f'{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}'
        if self.instance and self.instance.cpf and self.instance.cpf != formatted:
            raise serializers.ValidationError('CPF não pode ser alterado após cadastro.')
        return formatted

    class Meta:
        model = UserProfile
        fields = ['full_name', 'cpf', 'phone']


class AddressSerializer(serializers.ModelSerializer):
    @staticmethod
    def _validate_real_cep(cep_digits):
        try:
            r = requests.get(
                f'https://viacep.com.br/ws/{cep_digits}/json/',
                timeout=3,
            )
            if r.status_code != 200:
                raise serializers.ValidationError({'detail': 'Não foi possível validar o CEP.'})
            data = r.json() if r.content else {}
            if isinstance(data, dict) and data.get('erro') is True:
                raise serializers.ValidationError({'detail': 'CEP inválido (não encontrado).'})
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError({'detail': 'Não foi possível validar o CEP.'})

    def validate(self, attrs):
        current = {}
        if self.instance:
            for k in ('cep', 'street', 'number', 'neighborhood', 'city', 'state'):
                current[k] = getattr(self.instance, k, '')
        data = {**current, **attrs}

        required = ('cep', 'street', 'number', 'neighborhood', 'city', 'state')
        for k in required:
            v = data.get(k) or ''
            if not str(v).strip():
                raise serializers.ValidationError({'detail': f'Campo obrigatório: {k}.'})

        cep_digits = ''.join(c for c in str(data.get('cep') or '') if c.isdigit())
        if len(cep_digits) != 8:
            raise serializers.ValidationError({'detail': 'CEP deve conter 8 dígitos.'})
        self._validate_real_cep(cep_digits)
        attrs['cep'] = cep_digits

        state = (data.get('state') or '').strip().upper()
        if len(state) != 2:
            raise serializers.ValidationError({'detail': 'UF deve ter 2 letras.'})
        attrs['state'] = state

        # Validações mínimas para evitar endereços irreais/lixo
        def _min_len(field, n, msg):
            v = str(data.get(field) or '').strip()
            if len(v) < n:
                raise serializers.ValidationError({'detail': msg})

        _min_len('street', 3, 'Logradouro inválido.')
        _min_len('neighborhood', 2, 'Bairro inválido.')
        _min_len('city', 2, 'Cidade inválida.')

        return attrs

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
    image_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(
        many=True,
        read_only=True,
        source='images.all'
    )
    promotion_info = serializers.SerializerMethodField()
    is_on_promotion = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        url = obj.image_url or ''
        if url.startswith('/'):
            # Prioriza BACKEND_URL (produção), depois request.build_absolute_uri
            backend_url = os.getenv('BACKEND_URL', '')
            if backend_url:
                return f"{backend_url.rstrip('/')}{url}"
            
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            elif settings.DEBUG:
                return f"http://127.0.0.1:8000{url}"
        return url

    def get_promotion_info(self, obj):
        from datetime import date
        valid_promotions = obj.promotions.filter(
            is_active=True,
            expiry_date__gte=date.today()
        )
        if valid_promotions.exists():
            promo = valid_promotions.first()
            return {
                'id': promo.id,
                'name': promo.name,
                'discount_percent': promo.discount_percent,
                'expiry_date': promo.expiry_date.isoformat(),
            }
        return None

    def get_is_on_promotion(self, obj):
        from datetime import date
        return obj.promotions.filter(
            is_active=True,
            expiry_date__gte=date.today()
        ).exists()

    def get_discounted_price(self, obj):
        from datetime import date
        valid_promotions = obj.promotions.filter(
            is_active=True,
            expiry_date__gte=date.today()
        )
        if valid_promotions.exists():
            promo = valid_promotions.first()
            discount = float(obj.price) * (promo.discount_percent / 100)
            return round(float(obj.price) - discount, 2)
        return None


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ['id', 'uses_count', 'created_at', 'updated_at']


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class CartItemProductSerializer(serializers.ModelSerializer):
    promotional_price = serializers.SerializerMethodField()
    has_promotion = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'promotional_price', 'has_promotion', 'image_url', 'stock', 'is_active']

    def get_promotional_price(self, obj):
        return obj.get_promotional_price()

    def get_has_promotion(self, obj):
        return obj.has_active_promotion()


class CartItemSerializer(serializers.ModelSerializer):
    product = CartItemProductSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'size', 'color', 'cart_item_key']
        read_only_fields = ['id', 'product']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(read_only=True, many=True)

    class Meta:
        model = Cart
        fields = ['items', 'updated_at', 'created_at']
        read_only_fields = ['items', 'updated_at', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_name = serializers.CharField(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'subtotal']
        read_only_fields = ['id', 'subtotal']

    def get_subtotal(self, obj):
        return float(obj.subtotal())


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(read_only=True, many=True)
    is_cancelable = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_email',
            'customer_name',
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

    def get_customer_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return None


class NotificationAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'type',
            'category',
            'product',
            'is_active',
            'expires_at',
            'created_at',
            'created_by',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class NotificationMeSerializer(serializers.ModelSerializer):
    is_read = serializers.BooleanField(read_only=True)
    read_at = serializers.DateTimeField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'type',
            'created_at',
            'expires_at',
            'category',
            'category_name',
            'product',
            'product_name',
            'is_active',
            'is_read',
            'read_at',
        ]
        read_only_fields = fields

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from .models import Coupon, Promotion, Product, Category, ProductImage, Notification


class IsActiveFilter(admin.SimpleListFilter):
    """Filtro customizado para exibir 'Ativos' e 'Inativos' em português."""
    
    title = 'Status'
    parameter_name = 'is_active'

    def lookups(self, request, model_admin):
        return (
            ('sim', 'Ativos'),
            ('nao', 'Inativos'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'sim':
            return queryset.filter(is_active=True)
        elif self.value() == 'nao':
            return queryset.filter(is_active=False)
        return queryset


def notify_users_product_disabled(product, request):
    """Envia notificação para usuários que têm o produto no carrinho."""
    from django.db.models import Q
    from .models import CartItem, Notification
    
    # Encontrar todos os CartItems com este produto
    cart_items = CartItem.objects.filter(product=product).select_related('cart__user')
    
    # Criar conjunto de usuários únicos
    users = set()
    for cart_item in cart_items:
        if cart_item.cart.user:
            users.add(cart_item.cart.user)
    
    # Criar notificação para cada usuário
    for user in users:
        Notification.objects.create(
            title=f'Produto "{product.name}" foi desativado',
            message=f'O produto "{product.name}" que estava no seu carrinho foi desativado e não está mais disponível.',
            type=Notification.TYPE_NOTICE,
            product=product,
            is_active=True,
            expires_at=timezone.now() + timedelta(days=30),
        )
        # Registrar leitura automática (não mostra como não lida)
        from .models import NotificationRead
        notification = Notification.objects.filter(
            title=f'Produto "{product.name}" foi desativado',
            product=product
        ).first()
        if notification:
            NotificationRead.objects.get_or_create(
                notification=notification,
                user=user,
                defaults={'read_at': timezone.now()}
            )


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('url', 'filename', 'is_cover', 'order', 'created_at')
    ordering = ('order', 'created_at')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock', 'category', 'is_active', 'created_at')
    list_filter = ('category', IsActiveFilter, 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ProductImageInline]
    actions = ['deactivate_products']

    def deactivate_products(self, request, queryset):
        """Action para desativar produtos (marcar como inativos + notificar)."""
        count = 0
        for product in queryset:
            if product.is_active:
                product.is_active = False
                product.save()
                notify_users_product_disabled(product, request)
                count += 1
        
        self.message_user(
            request,
            f'✅ {count} produto(s) desativado(s). Usuários com o produto no carrinho foram notificados.',
            level='success'
        )
    
    deactivate_products.short_description = '🔴 Desativar produtos selecionados'

    def delete_model(self, request, obj):
        """Ao invés de deletar, desativa o produto."""
        if obj.is_active:
            obj.is_active = False
            obj.save()
            notify_users_product_disabled(obj, request)
            self.message_user(
                request,
                f'✅ Produto "{obj.name}" foi desativado. Usuários foram notificados.',
                level='success'
            )
        else:
            self.message_user(
                request,
                f'⚠️ O produto "{obj.name}" já estava desativado.',
                level='warning'
            )

    def delete_queryset(self, request, queryset):
        """Ao invés de deletar em lote, desativa os produtos."""
        count = 0
        for obj in queryset:
            if obj.is_active:
                obj.is_active = False
                obj.save()
                notify_users_product_disabled(obj, request)
                count += 1
        
        if count > 0:
            self.message_user(
                request,
                f'✅ {count} produto(s) desativado(s) em lote. Usuários foram notificados.',
                level='success'
            )



@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'filename', 'is_cover', 'order', 'created_at')
    list_filter = ('is_cover', 'created_at')
    search_fields = ('product__name', 'filename')


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'expiry_date', 'uses_count', 'max_uses', 'is_active')
    list_filter = (IsActiveFilter, 'expiry_date')
    search_fields = ('code',)
    filter_horizontal = ('eligible_products',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_percent', 'expiry_date', 'is_active', 'is_valid')
    list_filter = (IsActiveFilter, 'expiry_date')
    search_fields = ('name',)
    filter_horizontal = ('products',)
    date_hierarchy = 'expiry_date'

    def is_valid(self, obj):
        return obj.is_valid()
    is_valid.boolean = True
    is_valid.short_description = 'Válida'



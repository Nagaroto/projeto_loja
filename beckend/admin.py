from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Coupon, Promotion, Product, Category, ProductImage


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock', 'category', 'is_active', 'created_at')
    list_filter = ('is_active', 'category', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')

    def delete_model(self, request, obj):
        """Sobrescreve delete com tratamento de erro para produtos vinculados a pedidos."""
        try:
            obj.delete()
        except ValidationError as e:
            self.message_user(
                request,
                f'❌ {str(e.message) if hasattr(e, "message") else str(e)}',
                level='error'
            )

    def delete_queryset(self, request, queryset):
        """Sobrescreve delete_queryset com tratamento de erro em lote."""
        for obj in queryset:
            try:
                obj.delete()
            except ValidationError as e:
                self.message_user(
                    request,
                    f'❌ {str(e.message) if hasattr(e, "message") else str(e)}',
                    level='error'
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
    list_filter = ('is_active', 'expiry_date')
    search_fields = ('code',)
    filter_horizontal = ('eligible_products',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_percent', 'expiry_date', 'is_active', 'is_valid')
    list_filter = ('is_active', 'expiry_date')
    search_fields = ('name',)
    filter_horizontal = ('products',)
    date_hierarchy = 'expiry_date'

    def is_valid(self, obj):
        return obj.is_valid()
    is_valid.boolean = True
    is_valid.short_description = 'Válida'



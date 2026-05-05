from django.contrib import admin
from .models import Coupon, Promotion


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



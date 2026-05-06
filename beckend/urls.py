# Rotas da API: auth, conta, catálogo publicado e viewsets registrados no router.

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmailTokenObtainView,
    RegisterView,
    ProductViewSet,
    CouponViewSet,
    PromotionViewSet,
    OrderViewSet,
    CategoryViewSet,
    AdminCustomersView,
    analytics_view,
    PublishedProductsView,
    admin_customer_orders_view,
    NotificationViewSet,
    MyNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)
from .upload_views import upload_product_image, delete_product_image, list_product_images
from .checkout_views import CheckoutView, ShippingQuoteView
from .user_account_views import (
    AddressDetailView,
    AddressListCreateView,
    CartAddItemView,
    CartRemoveItemView,
    CartSyncView,
    CancelOrderView,
    ChangeEmailView,
    ChangePasswordView,
    DeleteAccountView,
    DuplicateOrderCheckView,
    MyCartView,
    MyOrdersView,
    UserProfileMeView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'coupons', CouponViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'admin/notifications', NotificationViewSet, basename='admin-notifications')

urlpatterns = [
    path('admin/customers/', AdminCustomersView.as_view(), name='admin-customers'),
    path('admin/customers/<int:user_id>/orders/', admin_customer_orders_view, name='admin-customer-orders'),
    path('me/notifications/', MyNotificationsView.as_view(), name='me-notifications'),
    path('me/notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='me-notifications-read-all'),
    path('me/notifications/<int:pk>/read/', MarkNotificationReadView.as_view(), name='me-notification-read'),
    path('upload/product-image/', upload_product_image, name='upload-product-image'),
    path('upload/product-image/<str:filename>/', delete_product_image, name='delete-product-image'),
    path('upload/product-images/', list_product_images, name='list-product-images'),
    path('checkout/shipping/', ShippingQuoteView.as_view(), name='checkout-shipping'),
    path('checkout/place/', CheckoutView.as_view(), name='checkout-place'),
    path('products/published/', PublishedProductsView.as_view(), name='published-products'),
    path('analytics/', analytics_view, name='analytics'),
    path('login/', EmailTokenObtainView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='register'),
    path('me/profile/', UserProfileMeView.as_view(), name='me-profile'),
    path('me/addresses/', AddressListCreateView.as_view(), name='me-addresses'),
    path('me/addresses/<int:pk>/', AddressDetailView.as_view(), name='me-address-detail'),
    path('me/cart/', MyCartView.as_view(), name='me-cart'),
    path('me/cart/add/', CartAddItemView.as_view(), name='me-cart-add'),
    path('me/cart/remove/', CartRemoveItemView.as_view(), name='me-cart-remove'),
    path('me/cart/sync/', CartSyncView.as_view(), name='me-cart-sync'),
    path('me/change-password/', ChangePasswordView.as_view(), name='me-change-password'),
    path('me/change-email/', ChangeEmailView.as_view(), name='me-change-email'),
    path('me/delete-account/', DeleteAccountView.as_view(), name='me-delete-account'),
    path('me/orders/check-duplicate/', DuplicateOrderCheckView.as_view(), name='me-orders-check-duplicate'),
    path('me/orders/', MyOrdersView.as_view(), name='me-orders'),
    path('me/orders/<int:pk>/cancel/', CancelOrderView.as_view(), name='me-order-cancel'),
    path('', include(router.urls)),
]

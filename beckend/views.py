# Views da API REST: auth, CRUD, catálogo público e analytics.

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from .autenticacao import EmailTokenObtainPairSerializer
from .models import Product, Coupon, Order, Category
from .serializers import (
    ProductSerializer,
    CouponSerializer,
    OrderSerializer,
    CategorySerializer,
)


class EmailTokenObtainView(APIView):
    """Autentica por e-mail e senha e devolve par de tokens JWT."""

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = EmailTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """Cria usuário; e-mail único; username padrão igual ao e-mail."""

    queryset = User.objects.all()
    permission_classes = (AllowAny,)

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')
        username = (request.data.get('username') or email or '').strip()
        if not email:
            return Response(
                {"detail": "Informe um e-mail válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not password:
            return Response(
                {"detail": "Informe a senha."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not username:
            username = email

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "E-mail já cadastrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        return Response(
            {"detail": "Usuário criado com sucesso!"},
            status=status.HTTP_201_CREATED,
        )


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD de produtos: leitura pública; escrita só staff."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()


class CouponViewSet(viewsets.ModelViewSet):
    """CRUD de cupons: leitura pública; escrita só staff."""

    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()


class OrderViewSet(viewsets.ModelViewSet):
    """CRUD de pedidos: leitura pública; escrita só staff."""

    queryset = Order.objects.all().prefetch_related('items')
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()


@api_view(['GET'])
@permission_classes([AllowAny])
def analytics_view(request):
    """Agrega totais de vendas, pedidos, destaques e receita do mês."""

    try:
        total_sales = Order.objects.aggregate(Sum('total'))['total__sum'] or 0
        total_orders = Order.objects.count()

        top_products = Product.objects.annotate(
            quantity_sold=Count('orderitem'),
        ).order_by('-quantity_sold')[:3]

        top_products_data = [
            {"product_name": p.name, "quantity_sold": p.quantity_sold}
            for p in top_products
        ]

        top_coupon = Coupon.objects.order_by('-uses_count').first()
        top_coupon_data = None
        if top_coupon:
            top_coupon_data = {
                "code": top_coupon.code,
                "uses_count": top_coupon.uses_count,
            }

        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = Order.objects.filter(
            created_at__gte=first_day_of_month,
        ).aggregate(Sum('total'))['total__sum'] or 0

        analytics_data = {
            "total_sales": float(total_sales),
            "total_orders": total_orders,
            "top_products": top_products_data,
            "top_coupon": top_coupon_data,
            "monthly_revenue": float(monthly_revenue),
        }
        return Response(analytics_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"detail": f"Erro ao buscar analytics: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class PublishedProductsView(APIView):
    """Lista produtos ativos com categoria para o catálogo público."""

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            queryset = Product.objects.filter(
                is_active=True,
                category__isnull=False,
            )

            search_term = request.query_params.get('search', '').strip()
            if search_term:
                queryset = queryset.filter(
                    Q(name__icontains=search_term)
                    | Q(description__icontains=search_term),
                )

            category_id = request.query_params.get('category', '').strip()
            if category_id:
                queryset = queryset.filter(category_id=category_id)

            serializer = ProductSerializer(queryset, many=True)
            return Response(
                {"count": queryset.count(), "results": serializer.data},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Erro ao buscar produtos publicados: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD de categorias; exclusão move produtos para categoria fallback."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        fallback_slug = 'sem-categoria'
        if instance.slug == fallback_slug:
            return Response(
                {"detail": "A categoria padrão 'Sem categoria' não pode ser deletada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fallback_name = 'Sem categoria'
        fallback_defaults = {
            "name": fallback_name,
            "description": "Categoria padrão para produtos sem categoria principal.",
        }

        try:
            with transaction.atomic():
                fallback_category, _ = Category.objects.get_or_create(
                    slug=fallback_slug,
                    defaults=fallback_defaults,
                )

                if fallback_category.name != fallback_name:
                    fallback_category.name = fallback_name
                    fallback_category.save(update_fields=["name", "updated_at"])

                linked_products_qs = Product.objects.filter(category=instance)
                moved_count = linked_products_qs.count()
                if moved_count > 0:
                    linked_products_qs.update(
                        category=fallback_category,
                        is_active=False,
                    )

                self.perform_destroy(instance)

            return Response(
                {
                    "detail": "Categoria deletada com sucesso.",
                    "products_moved": moved_count,
                    "fallback_category_id": fallback_category.id,
                },
                status=status.HTTP_200_OK,
            )
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Não foi possível deletar a categoria devido a vínculos protegidos."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

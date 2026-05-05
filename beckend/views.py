# Views da API REST: auth, CRUD, catálogo público e analytics.

import logging
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import Throttled

from .autenticacao import EmailTokenObtainPairSerializer
from .models import Product, Coupon, Promotion, Order, Category, UserProfile
from .serializers import (
    ProductSerializer,
    CouponSerializer,
    PromotionSerializer,
    OrderSerializer,
    CategorySerializer,
)
from pagamentos.models import Pagamento
from .rate_limiter import rate_limiter, get_client_ip

logger = logging.getLogger(__name__)


class EmailTokenObtainView(APIView):
    """
    Autentica por e-mail e senha com rate limiting híbrido (IP + email).
    
    Rate limits:
    - 5 tentativas por minuto (por IP ou por email)
    - Bloqueio progressivo após 3 falhas
    - Bloqueio longo após 5 bloqueios
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        
        try:
            # Aplica rate limit híbrido (por IP e por email)
            rate_status = rate_limiter.check_rate_limit(request, email=email)
            logger.info(
                f"Login attempt for {email}. "
                f"Attempts: {rate_status['current_attempts']}/{rate_status['max_attempts']}. "
                f"IP: {rate_status['ip']}"
            )
        except Throttled as e:
            # Rate limit atingido
            return Response(
                {'detail': str(e.detail)},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Tenta autenticar
        serializer = EmailTokenObtainPairSerializer(data=request.data)
        
        if serializer.is_valid():
            # Login bem-sucedido: limpa contadores
            rate_limiter.record_successful_login(request, email=email)
            logger.info(f"Successful login for {email}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Login falhou: registra falha para bloqueio progressivo
        ip = get_client_ip(request)
        rate_limiter._record_failure(ip, email=email)
        logger.warning(f"Failed login attempt for {email}. IP: {ip}")
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """Cria usuário; e-mail único; username padrão igual ao e-mail."""

    queryset = User.objects.all()
    permission_classes = (AllowAny,)

    def post(self, request):
        # Rate limit check
        rate_limiter.check_rate_limit(request)
        
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


class PromotionViewSet(viewsets.ModelViewSet):
    """CRUD de promoções: leitura pública; escrita só staff."""

    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
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
        # Usar pagamentos aprovados para métricas reais
        approved_payments = Pagamento.objects.filter(status='aprovado')
        total_sales = approved_payments.aggregate(Sum('valor'))['valor__sum'] or 0
        total_orders = approved_payments.count()

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
        monthly_revenue = approved_payments.filter(
            data_criacao__gte=first_day_of_month,
        ).aggregate(Sum('valor'))['valor__sum'] or 0

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


def _mask_email(email):
    s = (email or '').strip()
    if '@' not in s:
        return '***'
    user, domain = s.split('@', 1)
    
    # Máscara do usuário: 2 primeiras letras + resto com *
    if len(user) <= 2:
        user_masked = user + '*' * (5 - len(user))
    else:
        user_masked = user[:2] + '*' * (len(user) - 2)
    
    # Máscara do domínio: primeira letra + resto com * + extensão
    parts = domain.split('.')
    if len(parts) >= 2:
        domain_main = parts[0]
        if len(domain_main) <= 1:
            domain_masked = domain_main + '*' * 4
        else:
            domain_masked = domain_main[:1] + '*' * (len(domain_main) - 1)
        extension = parts[-1]
        return f'{user_masked}@{domain_masked}.{extension}'
    else:
        # Se não tiver extensão, mascara o domínio inteiro
        domain_main = domain
        if len(domain_main) <= 1:
            domain_masked = domain_main + '*' * 4
        else:
            domain_masked = domain_main[:1] + '*' * (len(domain_main) - 1)
        return f'{user_masked}@{domain_masked}'


def _mask_name(name):
    s = ' '.join((name or '').strip().split())
    if not s:
        return '***'
    parts = s.split(' ')
    masked = []
    for p in parts:
        if len(p) <= 1:
            masked.append('*')
        elif len(p) == 2:
            masked.append(p[0] + '*')
        else:
            masked.append(p[0] + '*' * (len(p) - 2) + p[-1])
    return ' '.join(masked)


def _mask_cpf(cpf):
    digits = ''.join(c for c in (cpf or '') if c.isdigit())
    if len(digits) != 11:
        return '***.***.***-**'
    return f'{digits[:3]}.***.***-{digits[-2:]}'


class AdminCustomersView(APIView):
    """Lista clientes com dados mascarados (admin only)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            User.objects
            .filter(is_staff=False)
            .select_related('profile')
            .order_by('-date_joined')
        )

        results = []
        for u in qs[:500]:
            profile = getattr(u, 'profile', None)
            results.append({
                'id': u.id,
                'name_masked': _mask_name(getattr(profile, 'full_name', '') or ''),
                'email_masked': _mask_email(u.email),
                'cpf_masked': _mask_cpf(getattr(profile, 'cpf', '') or ''),
                'date_joined': u.date_joined,
            })

        return Response({'count': len(results), 'results': results})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_customer_orders_view(request, user_id):
    """Retorna todos os pedidos de um cliente específico (admin only)."""
    try:
        orders = Order.objects.filter(user_id=user_id).order_by('-created_at')
        
        results = []
        for order in orders:
            results.append({
                'id': order.id,
                'public_code': order.public_code,
                'status': order.status,
                'total': float(order.total),
                'created_at': order.created_at,
                'payment_method': order.payment_method,
                'items_count': order.items.count() if order.items else 0,
            })
        
        return Response({
            'customer_id': user_id,
            'orders_count': len(results),
            'orders': results
        })
    except Exception as e:
        return Response(
            {'error': 'Erro ao carregar pedidos do cliente'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

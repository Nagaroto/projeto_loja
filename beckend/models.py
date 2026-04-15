# Modelos do domínio da loja: categorias, produtos, cupons, pedidos e conta do cliente.

from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    """Agrupa produtos; slug único para URLs e para o serializer."""

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Nome da Categoria',
        help_text='Nome único da categoria (ex: Camisetas, Calças)',
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        verbose_name='Slug',
        help_text='Nome em URL-friendly (gerado automaticamente)',
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição',
        help_text='Descrição detalhada da categoria (opcional)',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Criação',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Data de Atualização',
    )

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """Item vendável: preço, estoque, mídia, variantes JSON e flag de publicação."""

    name = models.CharField(
        max_length=255,
        verbose_name='Nome do Produto',
        help_text='Nome do produto no catálogo',
    )
    description = models.TextField(
        verbose_name='Descrição',
        help_text='Descrição completa do produto',
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Preço (BRL)',
        help_text='Preço do produto em Real Brasileiro',
    )
    stock = models.IntegerField(
        default=0,
        verbose_name='Quantidade em Estoque',
        help_text='Quantidade disponível do produto',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='Categoria',
        help_text='Categoria de classificação do produto',
    )
    image_url = models.URLField(
        blank=True,
        null=True,
        verbose_name='URL da Imagem',
        help_text='URL da imagem do produto',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Criação',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Data de Atualização',
    )
    colors = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Cores Disponíveis',
        help_text='Lista de cores disponíveis para o produto',
    )
    sizes = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Tamanhos Disponíveis',
        help_text='Lista de tamanhos disponíveis para o produto',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo',
        help_text='Se marcado, o produto aparece no catálogo. Se desmarcado, fica oculto (disponível apenas no admin)',
    )

    class Meta:
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - R$ {self.price:.2f}"

    def is_in_stock(self):
        return self.stock > 0

    def has_low_stock(self, threshold=5):
        return 0 < self.stock <= threshold


class Coupon(models.Model):
    """Desconto por código com validade, limite de uso e contagem."""

    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Código do Cupom',
        help_text='Código único do cupom (ex: PROMO20)',
    )
    discount_percent = models.IntegerField(
        default=0,
        verbose_name='Percentual de Desconto',
        help_text='Percentual de desconto que o cupom oferece (0-100)',
    )
    expiry_date = models.DateField(
        verbose_name='Data de Expiração',
        help_text='Data até a qual o cupom é válido',
    )
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Máximo de Usos',
        help_text='Limite de quantas vezes pode ser usado (deixar em branco para ilimitado)',
    )
    uses_count = models.IntegerField(
        default=0,
        verbose_name='Vezes Usado',
        help_text='Contagem de quantas vezes o cupom foi utilizado',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo',
        help_text='Indica se o cupom está ativo e pode ser usado',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Criação',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Data de Atualização',
    )

    class Meta:
        verbose_name = 'Cupom'
        verbose_name_plural = 'Cupons'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.discount_percent}% desconto)"

    def is_valid(self):
        from datetime import date
        if not self.is_active:
            return False
        if date.today() > self.expiry_date:
            return False
        if self.max_uses and self.uses_count >= self.max_uses:
            return False
        return True


class Order(models.Model):
    """Pedido: cliente, total, cupom opcional, status e itens em OrderItem."""

    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('confirmado', 'Confirmado'),
        ('enviado', 'Enviado'),
        ('entregue', 'Entregue'),
        ('cancelado', 'Cancelado'),
    ]

    PAYMENT_CHOICES = [
        ('pix', 'PIX'),
        ('cartao', 'Cartão de crédito/débito'),
        ('boleto', 'Boleto'),
    ]

    customer_email = models.EmailField(
        verbose_name='Email do Cliente',
        help_text='Email do cliente que realizou o pedido',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name='Cliente (conta)',
        help_text='Usuário logado associado ao pedido, quando houver',
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Total',
        help_text='Valor total do pedido em BRL',
    )
    shipping_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Frete',
        help_text='Valor do frete (calculado no servidor)',
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_CHOICES,
        default='pix',
        verbose_name='Meio de pagamento',
    )
    customer_notes = models.TextField(
        blank=True,
        max_length=500,
        verbose_name='Observações do cliente',
        help_text='Texto puro; sem HTML',
    )
    delivery_summary = models.TextField(
        blank=True,
        max_length=1000,
        verbose_name='Endereço de entrega (snapshot)',
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Cupom Aplicado',
        help_text='Cupom de desconto aplicado ao pedido',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente',
        verbose_name='Status do Pedido',
        help_text='Status atual do pedido',
    )
    public_code = models.CharField(
        max_length=40,
        unique=True,
        db_index=True,
        verbose_name='Código do pedido',
        help_text='Identificador amigável (ex.: qwrt-123456)',
    )
    expires_at = models.DateTimeField(
        verbose_name='Expira em (pagamento)',
        help_text='Pendentes não pagos são removidos após esta data',
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Pago em',
        help_text='Preenchido quando o pagamento é confirmado',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Criação',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Data de Atualização',
    )

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering = ['-created_at']

    def __str__(self):
        code = getattr(self, 'public_code', None) or f'#{self.id}'
        return f"Pedido {code} ({self.customer_email}) - R$ {self.total:.2f}"


class OrderItem(models.Model):
    """Linha de pedido: produto, quantidade e preço unitário congelado."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Pedido',
        help_text='Pedido ao qual este item pertence',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name='Produto',
        help_text='Produto vendido neste item',
    )
    quantity = models.IntegerField(
        default=1,
        verbose_name='Quantidade',
        help_text='Quantidade de unidades vendidas',
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Preço Unitário',
        help_text='Preço unitário no momento da compra',
    )

    class Meta:
        verbose_name = 'Item do Pedido'
        verbose_name_plural = 'Itens do Pedido'

    def __str__(self):
        return f"{self.product.name} x{self.quantity} (Pedido #{self.order.id})"

    def subtotal(self):
        return self.quantity * self.price


class UserProfile(models.Model):
    """Dados de perfil do cliente vinculados ao User."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Usuário',
    )
    full_name = models.CharField(max_length=255, blank=True, verbose_name='Nome completo')
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefone')

    class Meta:
        verbose_name = 'Perfil de usuário'
        verbose_name_plural = 'Perfis de usuário'

    def __str__(self):
        return f'Perfil de {self.user.email}'


class Address(models.Model):
    """Endereço de entrega associado a um usuário."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name='Usuário',
    )
    label = models.CharField(max_length=50, default='Principal', verbose_name='Rótulo')
    cep = models.CharField(max_length=12, blank=True, verbose_name='CEP')
    street = models.CharField(max_length=255, blank=True, verbose_name='Logradouro')
    number = models.CharField(max_length=20, blank=True, verbose_name='Número')
    complement = models.CharField(max_length=100, blank=True, verbose_name='Complemento')
    neighborhood = models.CharField(max_length=100, blank=True, verbose_name='Bairro')
    city = models.CharField(max_length=100, blank=True, verbose_name='Cidade')
    state = models.CharField(max_length=2, blank=True, verbose_name='UF')
    is_default = models.BooleanField(default=False, verbose_name='Endereço padrão')

    class Meta:
        verbose_name = 'Endereço'
        verbose_name_plural = 'Endereços'
        ordering = ['-is_default', 'id']

    def __str__(self):
        return f'{self.label} — {self.user.email}'

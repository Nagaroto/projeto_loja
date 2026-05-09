# Modelos do domínio da loja: categorias, produtos, cupons, pedidos e conta do cliente.

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.exceptions import ValidationError


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


class ProductImage(models.Model):
    """Modelo para armazenar múltiplas imagens de um produto."""
    product = models.ForeignKey(
        'Product',
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='Produto',
        help_text='Produto ao qual esta imagem pertence',
    )
    url = models.URLField(
        verbose_name='URL da Imagem',
        help_text='URL da imagem do produto',
    )
    filename = models.CharField(
        max_length=255,
        verbose_name='Nome do Arquivo',
        help_text='Nome do arquivo da imagem',
    )
    is_cover = models.BooleanField(
        default=False,
        verbose_name='Imagem de Capa',
        help_text='Se esta imagem é a capa do produto',
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Ordem',
        help_text='Ordem de exibição da imagem',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Criação',
    )

    class Meta:
        verbose_name = 'Imagem do Produto'
        verbose_name_plural = 'Imagens dos Produtos'
        ordering = ['order', 'created_at']
        unique_together = ['product', 'filename']

    def __str__(self):
        return f"{self.product.name} - {self.filename}"

    def save(self, *args, **kwargs):
        # Garantir que apenas uma imagem seja capa por produto
        if self.is_cover:
            ProductImage.objects.filter(product=self.product, is_cover=True).update(is_cover=False)
        print("DB IMAGE FIELD:", getattr(self, 'image', None))
        print("DB IMAGE FILENAME:", self.filename)
        print("DB IMAGE URL:", self.url)
        super().save(*args, **kwargs)


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
        verbose_name='URL da Imagem (Legado)',
        help_text='URL da imagem do produto (campo legado, mantido para compatibilidade)',
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

    def get_promotional_price(self):
        """
        Retorna o preço com desconto promocional aplicado, se houver promoção ativa.
        Segurança: calculado no servidor, nunca confia no frontend.
        """
        from datetime import date
        valid_promotions = self.promotions.filter(
            is_active=True,
            expiry_date__gte=date.today()
        )
        if valid_promotions.exists():
            promo = valid_promotions.first()
            discount = float(self.price) * (promo.discount_percent / 100)
            return round(float(self.price) - discount, 2)
        return float(self.price)

    def has_active_promotion(self):
        """Verifica se o produto está em promoção ativa."""
        from datetime import date
        return self.promotions.filter(
            is_active=True,
            expiry_date__gte=date.today()
        ).exists()

    def delete(self, *args, **kwargs):
        """Bloqueia exclusão de produtos vinculados a pedidos."""
        if self.orderitem_set.exists():
            raise ValidationError(
                "Este produto já está vinculado a pedidos e não pode ser excluído."
            )
        super().delete(*args, **kwargs)


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
    eligible_products = models.ManyToManyField(
        'Product',
        blank=True,
        related_name='eligible_coupons',
        verbose_name='Produtos elegíveis',
        help_text='Se vazio, o cupom pode ser aplicado a qualquer produto. Se preenchido, só vale para estes produtos.',
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


class Promotion(models.Model):
    """Promoção automática em produtos: desconto aplicado diretamente sem código."""

    name = models.CharField(
        max_length=100,
        verbose_name='Nome da Promoção',
        help_text='Nome identificador da promoção (ex: Black Friday)',
    )
    discount_percent = models.IntegerField(
        default=0,
        verbose_name='Percentual de Desconto',
        help_text='Percentual de desconto aplicado aos produtos (0-100)',
    )
    expiry_date = models.DateField(
        verbose_name='Data de Expiração',
        help_text='Data limite até a qual a promoção é válida',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativa',
        help_text='Indica se a promoção está ativa',
    )
    products = models.ManyToManyField(
        'Product',
        blank=True,
        related_name='promotions',
        verbose_name='Produtos em Promoção',
        help_text='Produtos que terão o desconto aplicado automaticamente',
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
        verbose_name = 'Promoção'
        verbose_name_plural = 'Promoções'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.discount_percent}% OFF)"

    def is_valid(self):
        from datetime import date
        if not self.is_active:
            return False
        if date.today() > self.expiry_date:
            return False
        return True


class CouponRedemption(models.Model):
    """Controle de uso: 1 uso por CPF (regra do negócio)."""

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name='redemptions',
        verbose_name='Cupom',
    )
    cpf = models.CharField(
        max_length=14,
        verbose_name='CPF',
        help_text='CPF normalizado/formatado usado na aplicação do cupom.',
    )
    order = models.ForeignKey(
        'Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupon_redemptions',
        verbose_name='Pedido',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Uso de cupom'
        verbose_name_plural = 'Usos de cupons'
        constraints = [
            models.UniqueConstraint(
                fields=['coupon', 'cpf'],
                name='uniq_coupon_cpf_redemption',
            ),
        ]

    def __str__(self):
        return f'{self.coupon.code} — {self.cpf}'


class Order(models.Model):
    """Pedido: cliente, total, cupom opcional, status e itens em OrderItem."""

    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('expirado', 'Expirado'),
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
        constraints = [
            models.UniqueConstraint(
                fields=['cpf'],
                condition=~Q(cpf=''),
                name='uniq_userprofile_cpf_nonempty',
            ),
        ]

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


class Cart(models.Model):
    """Carrinho persistido por usuário autenticado."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name='Usuário',
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')

    class Meta:
        verbose_name = 'Carrinho'
        verbose_name_plural = 'Carrinhos'

    def __str__(self):
        return f'Carrinho — {self.user.email}'


class CartItem(models.Model):
    """Item do carrinho: produto + quantidade + variantes opcionais."""

    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Carrinho',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='cart_items',
        verbose_name='Produto',
    )
    quantity = models.IntegerField(default=1, verbose_name='Quantidade')
    size = models.CharField(max_length=50, blank=True, verbose_name='Tamanho')
    color = models.CharField(max_length=50, blank=True, verbose_name='Cor')
    cart_item_key = models.CharField(
        max_length=120,
        blank=True,
        verbose_name='Chave do item',
        help_text='Chave estável vinda do front (ex.: productId-size-color) para diferenciar variantes.',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        verbose_name = 'Item do carrinho'
        verbose_name_plural = 'Itens do carrinho'
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'cart_item_key'],
                condition=~Q(cart_item_key=''),
                name='uniq_cart_item_key_per_cart',
            ),
        ]

    def __str__(self):
        return f'{self.product.name} x{self.quantity} — {self.cart.user.email}'


class Notification(models.Model):
    """Notificação enviada aos usuários (lida por usuário via NotificationRead)."""

    TYPE_PROMO = 'promocao'
    TYPE_COUPON = 'cupom'
    TYPE_NOTICE = 'aviso'
    TYPE_CHOICES = [
        (TYPE_PROMO, 'Promoção'),
        (TYPE_COUPON, 'Cupom'),
        (TYPE_NOTICE, 'Aviso'),
    ]

    title = models.CharField(max_length=120, verbose_name='Título')
    message = models.TextField(verbose_name='Mensagem')
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_NOTICE,
        verbose_name='Tipo',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='Categoria (opcional)',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='Produto (opcional)',
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativa')
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Expira em',
        help_text='Se preenchido, a notificação deixa de aparecer após esta data/hora.',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criada em')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications',
        verbose_name='Criada por',
    )

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.type}] {self.title}'


class NotificationRead(models.Model):
    """Registro de leitura por usuário (uma linha por notificação lida)."""

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='reads',
        verbose_name='Notificação',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_reads',
        verbose_name='Usuário',
    )
    read_at = models.DateTimeField(auto_now_add=True, verbose_name='Lida em')

    class Meta:
        verbose_name = 'Leitura de notificação'
        verbose_name_plural = 'Leituras de notificações'
        constraints = [
            models.UniqueConstraint(
                fields=['notification', 'user'],
                name='uniq_notification_read_per_user',
            ),
        ]

    def __str__(self):
        return f'{self.user.email} leu #{self.notification_id}'

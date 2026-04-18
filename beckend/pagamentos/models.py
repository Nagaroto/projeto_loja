from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

# Estados possíveis do pagamento
PAGAMENTO_PENDENTE = 'pendente'
PAGAMENTO_APROVADO = 'aprovado'
PAGAMENTO_RECUSADO = 'recusado'
PAGAMENTO_CANCELADO = 'cancelado'
PAGAMENTO_REEMBOLSO = 'reembolso'

STATUS_CHOICES = [
    (PAGAMENTO_PENDENTE, 'Pendente'),
    (PAGAMENTO_APROVADO, 'Aprovado'),
    (PAGAMENTO_RECUSADO, 'Recusado'),
    (PAGAMENTO_CANCELADO, 'Cancelado'),
    (PAGAMENTO_REEMBOLSO, 'Reembolso'),
]

# Tipos de pagamento
TIPO_PIX = 'pix'
TIPO_CARTAO = 'cartao'
TIPO_BOLETO = 'boleto'

TIPO_PAGAMENTO_CHOICES = [
    (TIPO_PIX, 'PIX'),
    (TIPO_CARTAO, 'Cartão de Crédito'),
    (TIPO_BOLETO, 'Boleto'),
]


class Pagamento(models.Model):
    """
    Modelo para armazenar informações de pagamento.
    Cada pagamento está vinculado a um usuário.
    """
    # ID único do pagamento
    id_pagamento = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # Chave do pagamento no Mercado Pago
    mercado_pago_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    
    # Usuário associado
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pagamentos')
    
    # Valor do pagamento
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Tipo de pagamento
    tipo_pagamento = models.CharField(
        max_length=10,
        choices=TIPO_PAGAMENTO_CHOICES,
        default=TIPO_PIX
    )
    
    # Status do pagamento
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PAGAMENTO_PENDENTE
    )
    
    # QR Code (para PIX)
    qr_code_base64 = models.TextField(null=True, blank=True)
    
    # Cópia e Cola (para PIX)
    copia_cola = models.TextField(null=True, blank=True)
    
    # URL da imagem do QR Code
    qr_code_url = models.URLField(null=True, blank=True)
    
    # Dados adicionais armazenados em JSON
    dados_adicionais = models.JSONField(default=dict, blank=True)
    
    # Mensagem de erro ou resposta
    mensagem_erro = models.TextField(null=True, blank=True)
    
    # Timestamps
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    confirmado_em = models.DateTimeField(null=True, blank=True)
    
    # Metadados para rastreamento
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['usuario', '-criado_em']),
            models.Index(fields=['status']),
            models.Index(fields=['mercado_pago_id']),
        ]
    
    def __str__(self):
        return f"Pagamento {self.id_pagamento} - {self.usuario.username} - {self.status}"
    
    def marcar_como_aprovado(self):
        """Marca o pagamento como aprovado."""
        self.status = PAGAMENTO_APROVADO
        self.confirmado_em = timezone.now()
        self.save()
    
    def marcar_como_recusado(self, motivo=''):
        """Marca o pagamento como recusado."""
        self.status = PAGAMENTO_RECUSADO
        self.mensagem_erro = motivo
        self.save()


class Comprovante(models.Model):
    """
    Modelo para armazenar comprovantes de pagamento.
    Relacionado ao Pagamento e ao Usuário.
    """
    # ID único do comprovante
    id_comprovante = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # Pagamento associado
    pagamento = models.OneToOneField(Pagamento, on_delete=models.CASCADE, related_name='comprovante')
    
    # Usuário
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='comprovantes')
    
    # Dados da compra (JSON)
    dados_compra = models.JSONField(default=dict)
    
    # Itens da compra (JSON)
    itens = models.JSONField(default=list)
    
    # Valor total
    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Taxa de envio
    taxa_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Desconto (se houver)
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Método de entrega
    metodo_entrega = models.CharField(max_length=100, blank=True)
    
    # CEP de entrega
    cep_entrega = models.CharField(max_length=20, blank=True)
    
    # Notas do cliente
    notas_cliente = models.TextField(blank=True)
    
    # Gerado em
    gerado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-gerado_em']
    
    def __str__(self):
        return f"Comprovante {self.id_comprovante} - {self.usuario.username}"


class Cartao(models.Model):
    """
    Modelo para armazenar informações de cartão de crédito de forma segura.
    NUNCA armazenar CVV em texto plano!
    """
    # ID único do cartão
    id_cartao = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # Usuário proprietário do cartão
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cartoes')
    
    # Últimos 4 dígitos do cartão (apenas para exibição)
    ultimos_digitos = models.CharField(max_length=4)
    
    # Bandeira do cartão
    bandeira = models.CharField(max_length=50)
    
    # Mês e ano de expiração
    mes_expiracao = models.IntegerField()
    ano_expiracao = models.IntegerField()
    
    # Token do Mercado Pago (nunca armazenar dados completos)
    token_mercado_pago = models.CharField(max_length=255, blank=True)
    
    # Nome do titular
    nome_titular = models.CharField(max_length=255)
    
    # É cartão padrão?
    eh_padrao = models.BooleanField(default=False)
    
    # Ativo?
    ativo = models.BooleanField(default=True)
    
    # Criado em
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-eh_padrao', '-criado_em']
    
    def __str__(self):
        return f"{self.bandeira} ***{self.ultimos_digitos} - {self.usuario.username}"
    
    @property
    def esta_expirado(self):
        """Verifica se o cartão está expirado."""
        from datetime import datetime
        hoje = datetime.now()
        return (self.ano_expiracao, self.mes_expiracao) < (hoje.year, hoje.month)

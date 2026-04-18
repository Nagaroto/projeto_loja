from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class Pagamento(models.Model):
    """
    Model para armazenar informações de pagamentos via Mercado Pago
    """
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('processando', 'Processando'),
        ('aprovado', 'Aprovado'),
        ('recusado', 'Recusado'),
        ('expirado', 'Expirado'),
        ('cancelado', 'Cancelado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pagamentos')
    
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    
    # Dados do Mercado Pago
    mercado_pago_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    qr_code_url = models.URLField(null=True, blank=True)
    qr_code_base64 = models.TextField(null=True, blank=True)  # QR Code em base64
    copia_cola = models.TextField(null=True, blank=True)  # Código PIX copia e cola
    
    # Métodos de pagamento
    METODO_CHOICES = [
        ('pix', 'PIX'),
        ('cartao', 'Cartão de Crédito'),
        ('boleto', 'Boleto'),
    ]
    metodo_pagamento = models.CharField(max_length=20, choices=METODO_CHOICES, default='pix')
    
    # Dados de auditoria
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    data_expiracao = models.DateTimeField(null=True, blank=True)
    data_pagamento = models.DateTimeField(null=True, blank=True)
    
    # Dados adicionais
    pedido_id = models.CharField(max_length=255, null=True, blank=True)  # ID do pedido relacionado
    descricao = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'pagamento'
        ordering = ['-data_criacao']
        verbose_name = 'Pagamento'
        verbose_name_plural = 'Pagamentos'
    
    def __str__(self):
        return f"Pagamento {self.id} - R${self.valor} - {self.status}"
    
    def esta_expirado(self):
        """Verifica se o pagamento expirou"""
        if self.data_expiracao:
            return timezone.now() > self.data_expiracao
        return False


class Comprovante(models.Model):
    """
    Model para armazenar comprovantes de pagamento
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pagamento = models.OneToOneField(Pagamento, on_delete=models.CASCADE, related_name='comprovante')
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='comprovantes')
    
    # Dados do comprovante
    numero_comprovante = models.CharField(max_length=255, unique=True)
    dados_compra = models.JSONField()  # Armazena detalhes do pedido
    
    # Dados do pagamento confirmado
    valor_pago = models.DecimalField(max_digits=10, decimal_places=2)
    data_confirmacao = models.DateTimeField(auto_now_add=True)
    
    # Dados adicionais
    referencia_externo = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'comprovante'
        ordering = ['-data_confirmacao']
        verbose_name = 'Comprovante'
        verbose_name_plural = 'Comprovantes'
    
    def __str__(self):
        return f"Comprovante {self.numero_comprovante}"


class Cartao(models.Model):
    """
    Model para armazenar informações de cartão de crédito de forma segura
    Nunca armazenar CVV, apenas dados necessários
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cartoes')
    
    # Dados criptografados - usar django-cryptography ou similar em produção
    numero_token = models.CharField(max_length=255)  # Token do Mercado Pago, não o número real
    nome_titular = models.CharField(max_length=255)
    
    # Informações públicas (não sensíveis)
    ultimos_digitos = models.CharField(max_length=4)  # Últimos 4 dígitos
    bandeira = models.CharField(max_length=50)  # Visa, Mastercard, Elo, etc
    mes_validade = models.IntegerField()
    ano_validade = models.IntegerField()
    
    # Status
    ativo = models.BooleanField(default=True)
    padrao = models.BooleanField(default=False)  # Cartão padrão do usuário
    
    # Auditoria
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cartao'
        ordering = ['-data_criacao']
        verbose_name = 'Cartão'
        verbose_name_plural = 'Cartões'
    
    def __str__(self):
        return f"{self.bandeira} final {self.ultimos_digitos} - {self.nome_titular}"
    
    def esta_valido(self):
        """Verifica se o cartão ainda é válido"""
        from datetime import datetime
        hoje = datetime.now()
        return (self.ano_validade > hoje.year) or (
            self.ano_validade == hoje.year and self.mes_validade >= hoje.month
        )


class TransacaoAuditoria(models.Model):
    """
    Model para registrar todas as transações e mudanças de status
    Útil para auditoria e troubleshooting
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pagamento = models.ForeignKey(Pagamento, on_delete=models.CASCADE, related_name='auditoria')
    
    STATUS_MUDANCA_CHOICES = [
        ('criacao', 'Criação'),
        ('webhook', 'Webhook'),
        ('consulta', 'Consulta de Status'),
        ('atualizacao_manual', 'Atualização Manual'),
        ('erro', 'Erro'),
    ]
    
    tipo_evento = models.CharField(max_length=50, choices=STATUS_MUDANCA_CHOICES)
    status_anterior = models.CharField(max_length=20, null=True, blank=True)
    status_novo = models.CharField(max_length=20)
    
    # Dados do evento
    dados_evento = models.JSONField(null=True, blank=True)
    mensagem = models.TextField(null=True, blank=True)
    
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transacao_auditoria'
        ordering = ['-data_criacao']
        verbose_name = 'Auditoria de Transação'
        verbose_name_plural = 'Auditorias de Transação'
    
    def __str__(self):
        return f"Auditoria {self.pagamento.id} - {self.tipo_evento}"

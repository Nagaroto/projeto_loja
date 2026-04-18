from django.contrib import admin
from .models import Pagamento, Comprovante, Cartao


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    """Admin para o modelo Pagamento."""
    list_display = (
        'id_pagamento',
        'usuario',
        'valor',
        'tipo_pagamento',
        'status',
        'criado_em',
    )
    list_filter = ('status', 'tipo_pagamento', 'criado_em')
    search_fields = ('usuario__username', 'usuario__email', 'mercado_pago_id')
    readonly_fields = (
        'id_pagamento',
        'mercado_pago_id',
        'qr_code_base64',
        'copia_cola',
        'criado_em',
        'atualizado_em',
        'confirmado_em',
    )
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id_pagamento', 'usuario', 'valor', 'tipo_pagamento', 'status')
        }),
        ('Mercado Pago', {
            'fields': ('mercado_pago_id', 'qr_code_url', 'qr_code_base64', 'copia_cola')
        }),
        ('Detalhes', {
            'fields': ('mensagem_erro', 'dados_adicionais', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('criado_em', 'atualizado_em', 'confirmado_em')
        }),
    )


@admin.register(Comprovante)
class ComprovanteAdmin(admin.ModelAdmin):
    """Admin para o modelo Comprovante."""
    list_display = (
        'id_comprovante',
        'usuario',
        'pagamento',
        'valor_total',
        'gerado_em',
    )
    list_filter = ('gerado_em', 'metodo_entrega')
    search_fields = ('usuario__username', 'usuario__email')
    readonly_fields = ('id_comprovante', 'gerado_em')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id_comprovante', 'usuario', 'pagamento')
        }),
        ('Valores', {
            'fields': ('valor_total', 'taxa_envio', 'desconto')
        }),
        ('Entrega', {
            'fields': ('metodo_entrega', 'cep_entrega')
        }),
        ('Compra', {
            'fields': ('dados_compra', 'itens', 'notas_cliente')
        }),
        ('Timestamp', {
            'fields': ('gerado_em',)
        }),
    )


@admin.register(Cartao)
class CartaoAdmin(admin.ModelAdmin):
    """Admin para o modelo Cartao."""
    list_display = (
        'id_cartao',
        'usuario',
        'bandeira',
        'ultimos_digitos',
        'eh_padrao',
        'ativo',
    )
    list_filter = ('bandeira', 'ativo', 'eh_padrao', 'criado_em')
    search_fields = ('usuario__username', 'usuario__email', 'nome_titular')
    readonly_fields = ('id_cartao', 'criado_em', 'atualizado_em')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id_cartao', 'usuario', 'nome_titular')
        }),
        ('Dados do Cartão', {
            'fields': (
                'bandeira',
                'ultimos_digitos',
                'mes_expiracao',
                'ano_expiracao',
                'esta_expirado',
            )
        }),
        ('Segurança', {
            'fields': ('token_mercado_pago', 'ativo', 'eh_padrao')
        }),
        ('Timestamps', {
            'fields': ('criado_em', 'atualizado_em')
        }),
    )

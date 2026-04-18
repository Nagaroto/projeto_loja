from django.contrib import admin
from django.utils.html import format_html
from .models import Pagamento, Comprovante, Cartao, TransacaoAuditoria


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'usuario',
        'valor',
        'status_badge',
        'metodo_pagamento',
        'data_criacao',
        'data_pagamento',
    ]
    list_filter = ['status', 'metodo_pagamento', 'data_criacao']
    search_fields = ['usuario__email', 'mercado_pago_id', 'id']
    readonly_fields = [
        'id',
        'mercado_pago_id',
        'data_criacao',
        'data_atualizacao',
        'copia_cola',
        'qr_code_preview',
    ]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id', 'usuario', 'valor', 'status', 'metodo_pagamento')
        }),
        ('Dados do Mercado Pago', {
            'fields': ('mercado_pago_id', 'copia_cola', 'qr_code_preview'),
            'classes': ('collapse',)
        }),
        ('Datas', {
            'fields': ('data_criacao', 'data_atualizacao', 'data_expiracao', 'data_pagamento'),
            'classes': ('collapse',)
        }),
        ('Adicionais', {
            'fields': ('pedido_id', 'descricao'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        """Renderizar status com cores"""
        colors = {
            'pendente': '#FFA500',
            'processando': '#3498DB',
            'aprovado': '#27AE60',
            'recusado': '#E74C3C',
            'expirado': '#95A5A6',
            'cancelado': '#34495E',
        }
        color = colors.get(obj.status, '#95A5A6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def qr_code_preview(self, obj):
        """Exibir preview do QR Code"""
        if obj.qr_code_base64:
            return format_html(
                '<img src="data:image/png;base64,{}" width="150" height="150" />',
                obj.qr_code_base64
            )
        return 'Sem QR Code'
    qr_code_preview.short_description = 'Preview do QR Code'
    
    def has_delete_permission(self, request):
        """Evitar deleção de pagamentos"""
        return False


@admin.register(Comprovante)
class ComprovanteAdmin(admin.ModelAdmin):
    list_display = [
        'numero_comprovante',
        'usuario',
        'valor_pago',
        'data_confirmacao',
    ]
    list_filter = ['data_confirmacao']
    search_fields = ['numero_comprovante', 'usuario__email']
    readonly_fields = [
        'id',
        'numero_comprovante',
        'data_confirmacao',
        'dados_compra_pretty',
    ]
    
    fieldsets = (
        ('Informações do Comprovante', {
            'fields': ('id', 'numero_comprovante', 'usuario', 'valor_pago')
        }),
        ('Relacionados', {
            'fields': ('pagamento', 'referencia_externo')
        }),
        ('Dados da Compra', {
            'fields': ('dados_compra_pretty',),
        }),
        ('Datas', {
            'fields': ('data_confirmacao',),
        }),
    )
    
    def dados_compra_pretty(self, obj):
        """Exibir dados JSON de forma legível"""
        import json
        try:
            return format_html(
                '<pre>{}</pre>',
                json.dumps(obj.dados_compra, indent=2, ensure_ascii=False)
            )
        except:
            return str(obj.dados_compra)
    dados_compra_pretty.short_description = 'Dados da Compra'
    
    def has_delete_permission(self, request):
        """Evitar deleção de comprovantes"""
        return False
    
    def has_add_permission(self, request):
        """Evitar adição manual de comprovantes"""
        return False


@admin.register(Cartao)
class CartaoAdmin(admin.ModelAdmin):
    list_display = [
        'nome_titular',
        'bandeira',
        'ultimos_digitos',
        'validade',
        'ativo',
        'padrao',
        'data_criacao',
    ]
    list_filter = ['bandeira', 'ativo', 'padrao', 'data_criacao']
    search_fields = ['usuario__email', 'nome_titular', 'ultimos_digitos']
    readonly_fields = ['id', 'data_criacao', 'data_atualizacao']
    
    fieldsets = (
        ('Informações do Cartão', {
            'fields': ('id', 'usuario', 'nome_titular', 'bandeira', 'ultimos_digitos')
        }),
        ('Validade', {
            'fields': ('mes_validade', 'ano_validade'),
        }),
        ('Status', {
            'fields': ('ativo', 'padrao'),
        }),
        ('Auditoria', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        }),
    )
    
    def validade(self, obj):
        """Exibir validade formatada"""
        return f"{obj.mes_validade:02d}/{obj.ano_validade}"
    validade.short_description = 'Validade'
    
    def has_delete_permission(self, request):
        """Evitar deleção (usar soft delete)"""
        return False


@admin.register(TransacaoAuditoria)
class TransacaoAuditoriaAdmin(admin.ModelAdmin):
    list_display = [
        'pagamento',
        'tipo_evento',
        'status_anterior',
        'status_novo',
        'data_criacao',
    ]
    list_filter = ['tipo_evento', 'data_criacao']
    search_fields = ['pagamento__id', 'mensagem']
    readonly_fields = [
        'id',
        'data_criacao',
        'dados_evento_pretty',
    ]
    
    fieldsets = (
        ('Informações', {
            'fields': ('id', 'pagamento', 'tipo_evento')
        }),
        ('Status', {
            'fields': ('status_anterior', 'status_novo'),
        }),
        ('Mensagem', {
            'fields': ('mensagem',),
        }),
        ('Dados do Evento', {
            'fields': ('dados_evento_pretty',),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('data_criacao',),
        }),
    )
    
    def dados_evento_pretty(self, obj):
        """Exibir dados JSON de forma legível"""
        import json
        if obj.dados_evento:
            try:
                return format_html(
                    '<pre>{}</pre>',
                    json.dumps(obj.dados_evento, indent=2, ensure_ascii=False)
                )
            except:
                return str(obj.dados_evento)
        return 'Sem dados'
    dados_evento_pretty.short_description = 'Dados do Evento'
    
    def has_delete_permission(self, request):
        """Evitar deleção de logs"""
        return False
    
    def has_add_permission(self, request):
        """Evitar adição manual"""
        return False

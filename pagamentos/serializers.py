from rest_framework import serializers
from .models import Pagamento, Comprovante, Cartao, TransacaoAuditoria
import base64


class PagamentoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar pagamentos"""
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    
    class Meta:
        model = Pagamento
        fields = [
            'id',
            'usuario_email',
            'valor',
            'status',
            'metodo_pagamento',
            'data_criacao',
            'data_pagamento',
            'mercado_pago_id',
        ]
        read_only_fields = fields


class PagamentoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar um novo pagamento"""
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True
    )
    valor = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    metodo_pagamento = serializers.ChoiceField(
        choices=['pix', 'cartao', 'boleto'],
        default='pix'
    )
    
    class Meta:
        model = Pagamento
        fields = ['valor', 'metodo_pagamento', 'items', 'descricao']
    
    def create(self, validated_data):
        # Remover items pois é write_only
        validated_data.pop('items', None)
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)


class PagamentoDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado para exibir informações completas de um pagamento"""
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    qr_code_base64 = serializers.SerializerMethodField()
    
    class Meta:
        model = Pagamento
        fields = [
            'id',
            'usuario_email',
            'valor',
            'status',
            'metodo_pagamento',
            'mercado_pago_id',
            'qr_code_base64',
            'copia_cola',
            'data_criacao',
            'data_atualizacao',
            'data_expiracao',
            'data_pagamento',
            'descricao',
        ]
        read_only_fields = fields
    
    def get_qr_code_base64(self, obj):
        """Retornar QR Code em base64"""
        if obj.qr_code_base64:
            return f"data:image/png;base64,{obj.qr_code_base64}"
        return None


class ComprovanteSerializer(serializers.ModelSerializer):
    """Serializer para comprovantes de pagamento"""
    pagamento_info = serializers.SerializerMethodField()
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    
    class Meta:
        model = Comprovante
        fields = [
            'id',
            'numero_comprovante',
            'usuario_email',
            'valor_pago',
            'data_confirmacao',
            'dados_compra',
            'pagamento_info',
            'referencia_externo',
        ]
        read_only_fields = fields
    
    def get_pagamento_info(self, obj):
        """Informações resumidas do pagamento relacionado"""
        return {
            'pagamento_id': str(obj.pagamento.id),
            'mercado_pago_id': obj.pagamento.mercado_pago_id,
            'status': obj.pagamento.status,
        }


class CartaoSerializer(serializers.ModelSerializer):
    """Serializer para cartões (dados não sensíveis)"""
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    
    class Meta:
        model = Cartao
        fields = [
            'id',
            'usuario_email',
            'nome_titular',
            'ultimos_digitos',
            'bandeira',
            'mes_validade',
            'ano_validade',
            'ativo',
            'padrao',
            'data_criacao',
        ]
        read_only_fields = ['id', 'usuario_email', 'data_criacao']


class CartaoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar cartão (apenas tokens, nunca números reais)"""
    numero_token = serializers.CharField(write_only=True, required=True)
    nome_titular = serializers.CharField(required=True)
    ultimos_digitos = serializers.CharField(required=True)
    bandeira = serializers.CharField(required=True)
    mes_validade = serializers.IntegerField(required=True)
    ano_validade = serializers.IntegerField(required=True)
    
    class Meta:
        model = Cartao
        fields = [
            'numero_token',
            'nome_titular',
            'ultimos_digitos',
            'bandeira',
            'mes_validade',
            'ano_validade',
            'padrao',
        ]
    
    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)


class TransacaoAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para auditoria de transações"""
    
    class Meta:
        model = TransacaoAuditoria
        fields = [
            'id',
            'tipo_evento',
            'status_anterior',
            'status_novo',
            'dados_evento',
            'mensagem',
            'data_criacao',
        ]
        read_only_fields = fields


class PagamentoStatusResponseSerializer(serializers.Serializer):
    """Serializer para resposta de status de pagamento"""
    pagamento_id = serializers.CharField()
    status = serializers.CharField()
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    mercado_pago_id = serializers.CharField(allow_null=True)
    data_pagamento = serializers.DateTimeField(allow_null=True)
    mensagem = serializers.CharField()


class PagamentoQRCodeResponseSerializer(serializers.Serializer):
    """Serializer para resposta de geração de QR Code"""
    pagamento_id = serializers.CharField()
    mercado_pago_id = serializers.CharField()
    qr_code_base64 = serializers.CharField()  # Base64 com prefixo data:image/png;base64,
    copia_cola = serializers.CharField()
    expiracao = serializers.DateTimeField()
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()

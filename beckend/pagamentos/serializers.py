from rest_framework import serializers
from .models import Pagamento, Comprovante, Cartao


class PagamentoSerializer(serializers.ModelSerializer):
    """Serializador para o modelo Pagamento."""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    
    class Meta:
        model = Pagamento
        fields = [
            'id_pagamento',
            'mercado_pago_id',
            'usuario_username',
            'valor',
            'tipo_pagamento',
            'status',
            'qr_code_base64',
            'copia_cola',
            'qr_code_url',
            'mensagem_erro',
            'criado_em',
            'atualizado_em',
            'confirmado_em',
        ]
        read_only_fields = [
            'id_pagamento',
            'mercado_pago_id',
            'qr_code_base64',
            'copia_cola',
            'qr_code_url',
            'criado_em',
            'atualizado_em',
            'confirmado_em',
        ]


class ComprovanteSerializer(serializers.ModelSerializer):
    """Serializador para o modelo Comprovante."""
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    pagamento_info = PagamentoSerializer(source='pagamento', read_only=True)
    
    class Meta:
        model = Comprovante
        fields = [
            'id_comprovante',
            'usuario_username',
            'pagamento_info',
            'dados_compra',
            'itens',
            'valor_total',
            'taxa_envio',
            'desconto',
            'metodo_entrega',
            'cep_entrega',
            'notas_cliente',
            'gerado_em',
        ]
        read_only_fields = [
            'id_comprovante',
            'usuario_username',
            'gerado_em',
        ]


class CartaoSerializer(serializers.ModelSerializer):
    """Serializador para o modelo Cartao."""
    esta_expirado = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Cartao
        fields = [
            'id_cartao',
            'ultimos_digitos',
            'bandeira',
            'mes_expiracao',
            'ano_expiracao',
            'nome_titular',
            'eh_padrao',
            'ativo',
            'esta_expirado',
            'criado_em',
        ]
        read_only_fields = [
            'id_cartao',
            'criado_em',
        ]


class CriarPagamentoSerializer(serializers.Serializer):
    """Serializador para criar um novo pagamento."""
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    tipo_pagamento = serializers.ChoiceField(choices=['pix', 'cartao', 'boleto'])
    items = serializers.ListField(child=serializers.DictField(), required=False)
    notas_cliente = serializers.CharField(required=False, allow_blank=True)
    endereco_entrega = serializers.DictField(required=False)
    
    def validate_valor(self, value):
        """Valida se o valor é maior que 0."""
        if value <= 0:
            raise serializers.ValidationError("O valor deve ser maior que 0.")
        return value


class StatusPagamentoSerializer(serializers.Serializer):
    """Serializador para resposta de status de pagamento."""
    id_pagamento = serializers.UUIDField()
    status = serializers.CharField()
    valor = serializers.DecimalField(max_digits=10, decimal_places=2)
    tipo_pagamento = serializers.CharField()
    qr_code_base64 = serializers.CharField(required=False, allow_null=True)
    copia_cola = serializers.CharField(required=False, allow_null=True)
    mensagem_erro = serializers.CharField(required=False, allow_null=True)
    confirmado_em = serializers.DateTimeField(required=False, allow_null=True)

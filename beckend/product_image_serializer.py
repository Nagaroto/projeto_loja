import os
from django.conf import settings
from rest_framework import serializers
from .models import ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer para o modelo ProductImage."""

    url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = [
            'id',
            'url',
            'filename',
            'is_cover',
            'order',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_url(self, obj):
        url = obj.url or ''
        # Se a URL já for absoluta (Cloudinary), retorna ela diretamente sem processamento extra
        if url.startswith('http://') or url.startswith('https://'):
            return url
            
        # Se for um caminho relativo (/media/...), tentamos tornar absoluto
        if url.startswith('/'):
            # 1. Tenta usar BACKEND_URL (recomendado para produção se não usar Cloudinary)
            backend_url = os.getenv('BACKEND_URL', '')
            if backend_url:
                return f"{backend_url.rstrip('/')}{url}"
            
            # 2. Tenta usar o contexto da request (DRF padrão)
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            
            # 3. Fallback para localhost em DEBUG
            if settings.DEBUG:
                return f"http://127.0.0.1:8000{url}"
        
        return url

    def validate(self, attrs):
        """Validação customizada para garantir consistência."""
        product = self.instance.product if self.instance else None
        
        # Se está definindo como capa, garantir que não haja outra capa
        if attrs.get('is_cover', False) and product:
            # Remover capa de outras imagens do mesmo produto
            ProductImage.objects.filter(
                product=product, 
                is_cover=True
            ).exclude(id=self.instance.id if self.instance else None).update(is_cover=False)
        
        return attrs


class ProductImageCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de imagens de produto."""
    
    class Meta:
        model = ProductImage
        fields = ['url', 'filename', 'is_cover', 'order']

    def create(self, validated_data):
        """Cria imagem garantindo que apenas uma seja capa."""
        product = validated_data['product']
        
        # Se esta imagem deve ser capa, remover capa das outras
        if validated_data.get('is_cover', False):
            ProductImage.objects.filter(product=product, is_cover=True).update(is_cover=False)
        
        # Se não há imagens de capa, definir esta como capa
        elif not ProductImage.objects.filter(product=product, is_cover=True).exists():
            validated_data['is_cover'] = True
        
        return super().create(validated_data)

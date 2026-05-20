from rest_framework import serializers
from .models import ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer para o modelo ProductImage com Cloudinary."""

    url = serializers.ImageField(source='image', read_only=True)
    filename = serializers.SerializerMethodField()

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

    def get_filename(self, obj):
        """Retorna o nome do arquivo do Cloudinary."""
        return obj.filename

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
    """Serializer para criação de imagens de produto com ImageField."""

    class Meta:
        model = ProductImage
        fields = ['image', 'is_cover', 'order']

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

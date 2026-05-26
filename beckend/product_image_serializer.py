from rest_framework import serializers
from .models import ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer para o modelo ProductImage com Cloudinary."""

    url = serializers.SerializerMethodField()
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

    def get_url(self, obj):
        """Retorna a URL completa da imagem do Cloudinary."""
        if obj.image:
            return obj.image.url
        return None

    def get_filename(self, obj):
        """Retorna o nome do arquivo do Cloudinary."""
        return obj.filename

    def validate(self, attrs):
        """Garante consistência de capa por produto."""
        product = getattr(self.instance, "product", None)

        if attrs.get('is_cover', False) and product:
            ProductImage.objects.filter(
                product=product,
                is_cover=True
            ).exclude(
                id=self.instance.id if self.instance else None
            ).update(is_cover=False)

        return attrs


class ProductImageCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de imagens de produto com upload Cloudinary."""

    class Meta:
        model = ProductImage
        fields = ['product', 'image', 'is_cover', 'order']  # FIX principal

    def validate(self, attrs):
        """Regras antes de salvar."""
        product = attrs.get('product')

        if not product:
            raise serializers.ValidationError("product é obrigatório")

        return attrs

    def create(self, validated_data):
        """Garante apenas uma capa por produto."""

        product = validated_data['product']

        if validated_data.get('is_cover', False):
            ProductImage.objects.filter(
                product=product,
                is_cover=True
            ).update(is_cover=False)

        elif not ProductImage.objects.filter(product=product, is_cover=True).exists():
            validated_data['is_cover'] = True

        return super().create(validated_data)
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db import transaction
from .models import Product, ProductImage
from .serializers import ProductSerializer
from .product_image_serializer import ProductImageSerializer


class ProductViewSetWithImages(viewsets.ModelViewSet):
    """
    ViewSet para produtos com suporte a múltiplas imagens.
    Extende o ProductViewSet original com funcionalidades de imagem.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        """Cria produto com imagens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Primeiro cria o produto
            product = serializer.save()
            
            # Depois processa as imagens se enviadas
            images_data = request.data.get('images', [])
            if images_data:
                self._save_product_images(product, images_data)
            
        headers = self.get_success_headers(serializer.data)
        return Response(
            self.get_serializer(product).data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """Atualiza produto e suas imagens."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Atualiza o produto
            product = serializer.save()
            
            # Processa imagens se enviadas
            images_data = request.data.get('images', [])
            if images_data is not None:  # Pode ser array vazio para remover todas
                self._update_product_images(product, images_data)
        
        return Response(self.get_serializer(product).data)

    def _save_product_images(self, product, images_data):
        """Salva as imagens do produto."""
        # Remove imagens existentes
        ProductImage.objects.filter(product=product).delete()
        
        # Cria novas imagens
        for index, image_data in enumerate(images_data):
            ProductImage.objects.create(
                product=product,
                url=image_data['url'],
                filename=image_data.get('filename', f'image_{index}.webp'),
                is_cover=image_data.get('is_cover', index == 0),
                order=index
            )

    def _update_product_images(self, product, images_data):
        """Atualiza as imagens do produto."""
        # Remove imagens existentes
        ProductImage.objects.filter(product=product).delete()
        
        # Cria novas imagens
        for index, image_data in enumerate(images_data):
            ProductImage.objects.create(
                product=product,
                url=image_data['url'],
                filename=image_data.get('filename', f'image_{index}.webp'),
                is_cover=image_data.get('is_cover', index == 0),
                order=index
            )

    @action(detail=True, methods=['post'])
    def add_image(self, request, pk=None):
        """Adiciona uma única imagem ao produto."""
        product = self.get_object()
        
        # Verifica limite de imagens
        if product.images.count() >= 5:
            return Response(
                {'error': 'Máximo de 5 imagens permitidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_data = request.data.get('image')
        if not image_data or not image_data.get('url'):
            return Response(
                {'error': 'Dados da imagem inválidos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Se não há capa, define esta como capa
        is_cover = image_data.get('is_cover', not product.images.filter(is_cover=True).exists())
        
        ProductImage.objects.create(
            product=product,
            url=image_data['url'],
            filename=image_data.get('filename', 'image.webp'),
            is_cover=is_cover,
            order=product.images.count()
        )
        
        return Response(
            ProductImageSerializer(product.images.all(), many=True).data
        )

    @action(detail=True, methods=['delete'])
    def remove_image(self, request, pk=None):
        """Remove uma imagem do produto."""
        product = self.get_object()
        image_id = request.data.get('image_id')
        
        if not image_id:
            return Response(
                {'error': 'ID da imagem não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            image = product.images.get(id=image_id)
            
            # Se removing a capa, define a primeira imagem restante como capa
            if image.is_cover:
                remaining_images = product.images.exclude(id=image_id)
                if remaining_images.exists():
                    remaining_images.first().is_cover = True
                    remaining_images.first().save()
            
            image.delete()
            return Response({'message': 'Imagem removida com sucesso.'})
            
        except ProductImage.DoesNotExist:
            return Response(
                {'error': 'Imagem não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def set_cover_image(self, request, pk=None):
        """Define uma imagem como capa do produto."""
        product = self.get_object()
        image_id = request.data.get('image_id')
        
        if not image_id:
            return Response(
                {'error': 'ID da imagem não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Remove capa de todas as imagens
            product.images.update(is_cover=False)
            
            # Define a nova capa
            image = product.images.get(id=image_id)
            image.is_cover = True
            image.save()
            
            return Response(
                ProductImageSerializer(product.images.all(), many=True).data
            )
            
        except ProductImage.DoesNotExist:
            return Response(
                {'error': 'Imagem não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

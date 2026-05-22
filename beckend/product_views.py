import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Product, ProductImage, Notification
from .serializers import ProductSerializer
from .product_image_serializer import ProductImageSerializer


logger = logging.getLogger(__name__)

class ProductViewSetWithImages(viewsets.ModelViewSet):
    """
    ViewSet para produtos com suporte a múltiplas imagens.
    Extende o ProductViewSet original com funcionalidades de imagem.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.all()
        # Apenas filtros de leitura devem esconder produtos inativos de usuários normais.
        if not self.request.user.is_staff and self.action in ['list', 'retrieve']:
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

    def perform_update(self, serializer):
        previous_is_active = serializer.instance.is_active
        product_obj = serializer.save()
        if previous_is_active and product_obj.is_active is False:
            Notification.objects.filter(product=product_obj).update(is_active=False)
        return product_obj

    def destroy(self, request, *args, **kwargs):
        logger.info('Solicitação de exclusão de produto: id=%s user=%s', kwargs.get('pk'), request.user)
        try:
            product_id = kwargs.get('pk')
            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist:
                return Response(
                    {'detail': 'Produto não encontrado.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            product.delete()
            logger.info('Produto excluído com sucesso: id=%s', product_id)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ValidationError as exc:
            logger.warning('Falha ao excluir produto: %s', exc)
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.error('Erro inesperado ao excluir produto: %s', exc, exc_info=True)
            return Response(
                {'detail': f'Erro interno: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request, *args, **kwargs):
        """Cria produto com imagens."""
        print("PRODUCT CREATE ENDPOINT:", request.method, request.path)
        print("PRODUCT CREATE IMAGES_PAYLOAD:", request.data.get('images'))
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
        response_data = self.get_serializer(product).data
        print("PRODUCT CREATE RESPONSE:", response_data)
        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """Atualiza produto e suas imagens."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        print("PRODUCT UPDATE ENDPOINT:", request.method, request.path)
        print("PRODUCT UPDATE IMAGES_PAYLOAD:", request.data.get('images'))
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Atualiza o produto usando perform_update para preservar hooks
            product = self.perform_update(serializer)

            # Processa imagens mesmo que seja lista vazia
            images_data = request.data.get('images', None)
            if images_data is not None:
                self._update_product_images(product, images_data)
        
        response_data = self.get_serializer(product).data
        print("PRODUCT UPDATE RESPONSE:", response_data)
        return Response(response_data)


    def _save_product_images(self, product, images_data):
        """Salva as imagens do produto, aceitando URLs do Cloudinary ou arquivos."""
        print("_save_product_images called with images_data:", images_data)
        # Remove imagens existentes (Cloudinary deleta automaticamente)
        ProductImage.objects.filter(product=product).delete()

        # Cria novas imagens
        for index, image_data in enumerate(images_data):
            print("SAVE PRODUCT IMAGE DATA:", image_data)
            # Verifica se temos um arquivo ou uma URL
            image_file = image_data.get('image')
            image_url = image_data.get('url')
            
            if not image_file and not image_url:
                continue
                
            # Trata tanto arquivo quanto URL
            if image_url:
                # Se temos uma URL (do Cloudinary), usamos diretamente com Cloudinary
                from cloudinary_storage.storage import MediaCloudinaryStorage
                storage = MediaCloudinaryStorage()
                # Vamos extrair o public_id da URL Cloudinary para criar o campo image
                # Ou apenas salvar a URL usando a storage
                from django.core.files.base import ContentFile
                # Vamos usar a URL diretamente - para isso, podemos usar o CloudinaryField
                # Ou, como alternativa, criar um ProductImage e usar a URL
                # Vamos usar a storage para salvar a imagem a partir da URL
                ProductImage.objects.create(
                    product=product,
                    image=image_url,  # Cloudinary ImageField aceita URLs diretamente!
                    is_cover=bool(image_data.get('is_cover', image_data.get('isCover', index == 0))),
                    order=index
                )
            else:
                # Se temos um arquivo de imagem
                ProductImage.objects.create(
                    product=product,
                    image=image_file,
                    is_cover=bool(image_data.get('is_cover', image_data.get('isCover', index == 0))),
                    order=index
                )

    def _update_product_images(self, product, images_data):
        """Atualiza as imagens do produto, aceitando URLs do Cloudinary ou arquivos."""
        print("_update_product_images called with images_data:", images_data)

        existing_images = {str(img.id): img for img in product.images.all()}
        kept_image_ids = []

        for index, image_data in enumerate(images_data):
            image_id = image_data.get('id')
            if image_id is not None:
                image_id = str(image_id)

            image_obj = None
            if image_id and image_id in existing_images:
                image_obj = existing_images[image_id]

            if image_obj:
                # Atualiza campos se necessário
                if 'image' in image_data:
                    image_obj.image = image_data['image']
                elif 'url' in image_data:
                    image_obj.image = image_data['url']
                
                # Verifica tanto is_cover quanto isCover
                is_cover_val = image_data.get('is_cover', image_data.get('isCover', image_obj.is_cover))
                image_obj.is_cover = bool(is_cover_val)
                image_obj.order = index
                image_obj.save()
            else:
                # Cria nova imagem
                image_file = image_data.get('image')
                image_url = image_data.get('url')
                
                if image_url or image_file:
                    image_obj = ProductImage.objects.create(
                        product=product,
                        image=image_url if image_url else image_file,
                        is_cover=bool(image_data.get('is_cover', image_data.get('isCover', index == 0))),
                        order=index
                    )
            if image_obj:
                kept_image_ids.append(image_obj.id)

        # Remove imagens que não foram mantidas no payload (Cloudinary deleta automaticamente)
        for image in product.images.exclude(id__in=kept_image_ids):
            image.delete()

        # Garante que existe uma imagem de capa se houver imagens restantes
        if product.images.exists() and not product.images.filter(is_cover=True).exists():
            first_image = product.images.order_by('order', 'created_at').first()
            if first_image:
                first_image.is_cover = True
                first_image.save()

    @action(detail=True, methods=['post'])
    def add_image(self, request, pk=None):
        """Adiciona uma única imagem ao produto usando ImageField do Cloudinary."""
        product = self.get_object()

        # Verifica limite de imagens
        if product.images.count() >= 5:
            return Response(
                {'error': 'Máximo de 5 imagens permitidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES.get('image')
        print("ADD IMAGE ENDPOINT:", request.method, request.path)
        print("ADD IMAGE FILE:", image_file)

        if not image_file:
            return Response(
                {'error': 'Arquivo de imagem não enviado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Se não há capa, define esta como capa
        is_cover = request.data.get('is_cover', not product.images.filter(is_cover=True).exists())

        ProductImage.objects.create(
            product=product,
            image=image_file,
            is_cover=is_cover,
            order=product.images.count()
        )

        return Response(
            ProductImageSerializer(product.images.all(), many=True).data
        )

    @action(detail=True, methods=['delete'])
    def remove_image(self, request, pk=None):
        """Remove uma imagem do produto (Cloudinary deleta automaticamente)."""
        product = self.get_object()
        image_id = request.data.get('image_id')

        if not image_id:
            return Response(
                {'error': 'ID da imagem não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image = product.images.get(id=image_id)

            # Se removendo a capa, define a primeira imagem restante como capa
            if image.is_cover:
                remaining_images = product.images.exclude(id=image_id)
                if remaining_images.exists():
                    remaining_images.first().is_cover = True
                    remaining_images.first().save()

            image.delete()  # Cloudinary deleta automaticamente

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

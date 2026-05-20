import logging
import os
import re
import uuid
import io
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import ProductImage

# Codecs extras (AVIF, HEIC/HEIF do iPhone). Falha silenciosa se não instalados.
try:
    import pillow_avif  # noqa: F401
except ImportError:
    pass
try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

logger = logging.getLogger(__name__)

IMAGE_SIZE = (600, 600)
IMAGE_QUALITY = 80
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Tipos comuns enviados por navegadores; também aceitamos application/octet-stream e type vazio
# e validamos de fato com o Pillow após ler o arquivo.
ALLOWED_CONTENT_TYPES = frozenset({
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/x-ms-bmp',
    'image/tiff',
    'image/x-tiff',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/jxl',
    'application/octet-stream',
    '',
})


def _make_safe_filename():
    random_suffix = uuid.uuid4().hex[:12]
    return f"img_{random_suffix}"


def _check_path_traversal(filename):
    """Verifica se o nome do arquivo tenta path traversal."""
    if not filename:
        return False
    # Verifica padrões de path traversal
    dangerous_patterns = ['..', '../', '..\\', '~/', '/etc/', '/var/', '\\windows\\']
    filename_lower = filename.lower()
    return any(pattern in filename_lower for pattern in dangerous_patterns)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_product_image(request):
    """
    Endpoint para upload de imagens de produtos.
    Envia o arquivo diretamente para o Cloudinary (ou storage configurado).
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Nenhuma imagem enviada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Security checks básicos
        if _check_path_traversal(image_file.name):
            return Response(
                {'error': 'Nome de arquivo inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image_file.size > MAX_IMAGE_SIZE:
            return Response(
                {'error': 'Arquivo muito grande. Tamanho máximo: 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Gera um nome seguro mantendo a extensão original
        ext = os.path.splitext(image_file.name)[1].lower()
        if not ext:
            ext = '.jpg' # Fallback
        
        safe_name = _make_safe_filename()
        final_filename = f"products/{safe_name}{ext}"

        # Salva diretamente no storage (Cloudinary em produção, FileSystem em local)
        # O Django gerencia automaticamente o upload para o Cloudinary via default_storage
        saved_path = default_storage.save(final_filename, image_file)
        
        # Obtém a URL gerada pelo Storage
        # Se for Cloudinary, retornará a URL absoluta da nuvem
        # Se for local, retornará /media/products/img_xxx.ext
        image_url = default_storage.url(saved_path)

        # Se a URL for relativa (local), garante que seja absoluta para o frontend
        if image_url.startswith('/') and not (image_url.startswith('http://') or image_url.startswith('https://')):
            # Tenta usar o BACKEND_URL definido ou o host da request
            backend_url = os.getenv('BACKEND_URL', '')
            if backend_url:
                image_url = f"{backend_url.rstrip('/')}{image_url}"
            elif request:
                image_url = request.build_absolute_uri(image_url)

        logger.info('Upload processado via Storage: %s -> %s', image_file.name, image_url)

        return Response({
            'id': str(uuid.uuid4()),
            'url': image_url,
            'filename': os.path.basename(saved_path),
            'size': image_file.size,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception('Erro no upload direto')
        return Response(
            {'error': f'Erro ao processar imagem: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_product_image(request, filename):
    """
    Endpoint para deletar uma imagem de produto.
    """
    try:
        # Primeiro, tenta deletar a entrada do banco de dados
        try:
            image_obj = ProductImage.objects.get(filename=filename)
            image_obj.delete()
        except ProductImage.DoesNotExist:
            # Se não existe no banco, continua para tentar deletar o arquivo
            pass

        # Depois, deleta o arquivo do storage
        file_path = f"products/{filename}"

        if default_storage.exists(file_path):
            default_storage.delete(file_path)
            return Response({'message': 'Imagem deletada com sucesso.'})
        else:
            return Response(
                {'error': 'Imagem não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

    except Exception as e:
        return Response(
            {'error': f'Erro ao deletar imagem: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_product_image_by_id(request, pk):
    """
    Endpoint para deletar uma imagem de produto pelo ID do ProductImage.
    """
    try:
        image = ProductImage.objects.get(pk=pk)
        filename = image.filename
        image.delete()

        file_path = f"products/{filename}"
        if default_storage.exists(file_path):
            default_storage.delete(file_path)

        return Response({'message': 'Imagem deletada com sucesso.'})

    except ProductImage.DoesNotExist:
        return Response(
            {'error': 'Imagem não encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Erro ao deletar imagem: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_product_images(request):
    """
    Endpoint para listar imagens (admin/debug).
    """
    try:
        products_dir = 'products/'

        if not default_storage.exists(products_dir):
            return Response({'images': []})

        images = []
        directories, files = default_storage.listdir(products_dir)

        for filename in files:
            # No Cloudinary, os arquivos podem não ter a extensão .webp no nome retornado pelo listdir
            # dependendo da configuração, mas geralmente o default_storage.url() resolve isso.
            file_path = f"{products_dir}{filename}"
            image_url = default_storage.url(file_path)

            if image_url.startswith('/') and not (image_url.startswith('http://') or image_url.startswith('https://')):
                # Prioriza BACKEND_URL se estiver definido (comum em produção), caso contrário usa o host da request
                backend_url = os.getenv('BACKEND_URL', '')
                if backend_url:
                    image_url = f"{backend_url.rstrip('/')}{image_url}"
                elif request:
                    image_url = request.build_absolute_uri(image_url)
                elif settings.DEBUG:
                    image_url = f"http://127.0.0.1:8000{image_url}"

            images.append({
                'filename': filename,
                'url': image_url,
                'path': file_path
            })

        return Response({'images': images})

    except Exception as e:
        return Response(
            {'error': f'Erro ao listar imagens: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

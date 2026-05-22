import logging
import uuid
import io

from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError
import cloudinary
import cloudinary.uploader

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

IMAGE_SIZE = (600, 600)
IMAGE_QUALITY = 80
MAX_IMAGE_SIZE = 10 * 1024 * 1024

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


def _convert_to_webp(image_file):
    """
    Converte imagem para WebP com tamanho e qualidade otimizados.
    Retorna um ContentFile com a imagem convertida.
    """
    try:
        img = Image.open(image_file)
        
        # Converte para RGB se necessário (PNG com alpha, etc)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Redimensiona mantendo aspect ratio
        img.thumbnail(IMAGE_SIZE, Image.Resampling.LANCZOS)
        
        # Salva em WebP
        output = io.BytesIO()
        img.save(output, format='WebP', quality=IMAGE_QUALITY, optimize=True)
        output.seek(0)
        
        return ContentFile(output.read(), name=f"{uuid.uuid4().hex[:12]}.webp")
    except UnidentifiedImageError:
        raise ValueError('Arquivo de imagem inválido ou corrompido.')
    except Exception as e:
        logger.exception('Erro ao converter imagem para WebP')
        raise ValueError(f'Erro ao converter imagem: {str(e)}')


def _check_path_traversal(filename):
    """Verifica se o nome do arquivo tenta path traversal."""
    if not filename:
        return False
    dangerous_patterns = ['..', '../', '..\\', '~/', '/etc/', '/var/', '\\windows\\']
    filename_lower = filename.lower()
    return any(pattern in filename_lower for pattern in dangerous_patterns)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_product_image(request):
    """
    Endpoint para upload de imagens de produtos.
    Pipeline: Upload → Pillow converte para WebP → Cloudinary API → Retorna URL
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Nenhuma imagem enviada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Security checks
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

        # Converte para WebP
        webp_file = _convert_to_webp(image_file)
        
        # Faz upload diretamente via Cloudinary API, sem ProductImage
        upload_result = cloudinary.uploader.upload(
            webp_file,
            folder="products/",
            resource_type="image"
        )
        
        cloudinary_url = upload_result.get('secure_url', upload_result.get('url'))
        filename = upload_result.get('public_id')
        
        logger.info('Upload convertido para WebP e enviado ao Cloudinary: %s -> %s', image_file.name, cloudinary_url)

        return Response({
            'id': str(uuid.uuid4()),
            'url': cloudinary_url,
            'filename': filename,
            'size': webp_file.size,
        }, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception('Erro no upload')
        return Response(
            {'error': f'Erro ao processar imagem: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_product_image(request, pk):
    """
    Endpoint para deletar uma imagem de produto pelo ID.
    Cloudinary deleta automaticamente quando o registro é removido.
    """
    try:
        from .models import ProductImage
        image = ProductImage.objects.get(pk=pk)
        image.delete()
        
        logger.info('Imagem deletada do Cloudinary: ID %s', pk)
        return Response({'message': 'Imagem deletada com sucesso.'})

    except ProductImage.DoesNotExist:
        return Response(
            {'error': 'Imagem não encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception('Erro ao deletar imagem')
        return Response(
            {'error': f'Erro ao deletar imagem: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

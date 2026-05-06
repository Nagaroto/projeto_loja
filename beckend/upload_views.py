from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import uuid
from PIL import Image, ImageOps, UnidentifiedImageError
import io

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

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


def _normalize_image(image_file):
    """Converte para RGB e aplica crop central quadrado 600x600."""
    img = Image.open(image_file)
    img = ImageOps.exif_transpose(img)

    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    return ImageOps.fit(
        img,
        IMAGE_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def _save_processed_webp(image_file, original_name='image'):
    img = _normalize_image(image_file)

    webp_buffer = io.BytesIO()
    img.save(webp_buffer, format='WEBP', quality=IMAGE_QUALITY, optimize=True)
    webp_buffer.seek(0)

    safe_name = os.path.splitext(original_name)[0] or 'image'
    unique_base = f"{uuid.uuid4()}_{safe_name}"
    webp_filename = f"products/{unique_base}.webp"
    saved_webp_path = default_storage.save(webp_filename, ContentFile(webp_buffer.getvalue()))

    image_url = default_storage.url(saved_webp_path)
    if settings.DEBUG:
        image_url = f"http://127.0.0.1:8000{image_url}"

    return {
        'id': str(uuid.uuid4()),
        'url': image_url,
        'filename': os.path.basename(saved_webp_path),
        'size': len(webp_buffer.getvalue()),
        'width': img.width,
        'height': img.height,
        'format': 'WebP',
    }


def _content_type_ok(uploaded):
    ct = (uploaded.content_type or '').strip().lower()
    if ct in ALLOWED_CONTENT_TYPES:
        return True
    if not ct:
        return True
    if ct.startswith('image/'):
        return True
    return False


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_product_image(request):
    """
    Endpoint para upload de imagens de produtos.
    Aceita vários formatos raster (JPEG, PNG, WebP, GIF, AVIF, HEIC, TIFF, BMP, ICO, etc.)
    e converte para WebP.
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Nenhuma imagem enviada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        if not _content_type_ok(image_file):
            return Response(
                {
                    'error': (
                        'Tipo de arquivo não reconhecido como imagem. '
                        'Use JPEG, PNG, WebP, GIF, AVIF, HEIC ou outros formatos de imagem comuns.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.size > MAX_IMAGE_SIZE:
            return Response(
                {'error': 'Arquivo muito grande. Tamanho máximo: 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw = image_file.read()
        if len(raw) > MAX_IMAGE_SIZE:
            return Response(
                {'error': 'Arquivo muito grande. Tamanho máximo: 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        buf = io.BytesIO(raw)
        try:
            data = _save_processed_webp(buf, image_file.name)
        except UnidentifiedImageError:
            return Response(
                {
                    'error': (
                        'Não foi possível ler a imagem. Formato não suportado ou arquivo corrompido. '
                        'Instale os pacotes pillow-avif-plugin e pillow-heif para AVIF/HEIC.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(data, status=status.HTTP_201_CREATED)

    except Exception as e:
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
            if filename.endswith('.webp'):
                file_path = f"{products_dir}{filename}"
                image_url = default_storage.url(file_path)

                if settings.DEBUG:
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

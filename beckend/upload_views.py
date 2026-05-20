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


def _normalize_image(image_file):
    """Converte qualquer imagem para RGB, remove metadados EXIF e aplica crop central quadrado 600x600."""
    image_file.seek(0)
    img = Image.open(image_file)
    
    # Aplica a orientação correta baseada no EXIF (ex: fotos de celular) e retorna uma cópia
    img = ImageOps.exif_transpose(img)
    
    logger.info(
        'Processando imagem: format=%s mode=%s size=%s filename=%s',
        img.format,
        img.mode,
        img.size,
        getattr(image_file, 'name', None),
    )

    # A normalização para RGBA e a composição sobre um fundo branco (Image.new)
    # criam um novo objeto de imagem que não contém os metadados EXIF da original.
    # Isso garante a privacidade do usuário (remove GPS, modelo de câmera, etc).
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Cria um fundo branco para imagens com transparência (como PNGs ou GIFs)
    background = Image.new('RGBA', img.size, (255, 255, 255, 255))
    img = Image.alpha_composite(background, img)
    # Converte para RGB final (WebP usará isso)
    img = img.convert('RGB')

    # Redimensiona e corta para preencher o quadrado 600x600
    normalized = ImageOps.fit(
        img,
        IMAGE_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )

    logger.info(
        'Imagem normalizada com sucesso: mode=%s size=%s',
        normalized.mode,
        normalized.size,
    )
    return normalized


def _make_safe_filename():
    random_suffix = uuid.uuid4().hex[:12]
    return f"img_{random_suffix}"


def _save_processed_webp(image_file, original_name=None, request=None):
    img = _normalize_image(image_file)

    webp_buffer = io.BytesIO()
    img.save(webp_buffer, format='WEBP', quality=IMAGE_QUALITY, optimize=True)
    webp_buffer.seek(0)

    safe_name = _make_safe_filename()
    final_filename = f"products/{safe_name}.webp"
    
    # Cloudinary e outros storages remotos funcionam melhor com ContentFile
    # e garantem que o arquivo seja persistente.
    saved_webp_path = default_storage.save(final_filename, ContentFile(webp_buffer.getvalue()))
    
    # Tenta obter o caminho físico apenas se o storage for local (DEBUG)
    physical_path = None
    if settings.DEBUG:
        try:
            physical_path = default_storage.path(saved_webp_path)
        except (AttributeError, NotImplementedError):
            pass

    if physical_path and not os.path.exists(physical_path):
        raise IOError(f'Arquivo salvo mas não encontrado no disco: {physical_path}')

    image_url = default_storage.url(saved_webp_path)
    
    # O CloudinaryStorage retorna uma URL que pode ser relativa ao domínio (ex: /v123/image.webp)
    # ou absoluta (http...). Se for relativa, o Django/Cloudinary espera que usemos build_absolute_uri
    # ou o domínio do Cloudinary.
    if image_url.startswith('/'):
        # Se estivermos usando Cloudinary em produção (DEBUG=False), a URL deve vir do Cloudinary
        if not settings.DEBUG:
             # O CloudinaryStorage geralmente já configura a URL correta, 
             # mas se ela vier apenas com o path, garantimos que seja absoluta.
             if not (image_url.startswith('http://') or image_url.startswith('https://')):
                # Se não tem protocolo, verificamos se o STORAGE_URL está no settings ou usamos o host
                if request:
                    image_url = request.build_absolute_uri(image_url)
        else:
            # Em desenvolvimento local, usamos a lógica de BACKEND_URL ou request
            backend_url = os.getenv('BACKEND_URL', '')
            if backend_url:
                image_url = f"{backend_url.rstrip('/')}{image_url}"
            elif request:
                image_url = request.build_absolute_uri(image_url)
            elif settings.DEBUG:
                image_url = f"http://127.0.0.1:8000{image_url}"

    logger.info('Imagem salva em %s %s', saved_webp_path, physical_path or '')

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


def _check_path_traversal(filename):
    """Verifica se o nome do arquivo tenta path traversal."""
    if not filename:
        return False
    # Verifica padrões de path traversal
    dangerous_patterns = ['..', '../', '..\\', '~/', '/etc/', '/var/', '\\windows\\']
    filename_lower = filename.lower()
    return any(pattern in filename_lower for pattern in dangerous_patterns)


def _check_double_extension(filename):
    """Verifica se o arquivo tem extensão dupla (ex: image.php.jpg)."""
    if not filename:
        return False
    parts = filename.split('.')
    # Se tiver mais de 2 partes após o split, pode ser extensão dupla
    if len(parts) > 2:
        # Verifica se as duas últimas extensões são suspeitas
        dangerous_exts = ['php', 'jsp', 'asp', 'exe', 'sh', 'bat', 'cmd', 'js', 'vbs']
        if parts[-2].lower() in dangerous_exts:
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

        # Security checks
        if _check_path_traversal(image_file.name):
            logger.warning('Tentativa de path traversal detectada: %s', image_file.name)
            return Response(
                {'error': 'Nome de arquivo inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if _check_double_extension(image_file.name):
            logger.warning('Tentativa de extensão dupla detectada: %s', image_file.name)
            return Response(
                {'error': 'Arquivo com extensão múltipla não permitido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
            data = _save_processed_webp(buf, image_file.name, request=request)
        except UnidentifiedImageError:
            logger.exception('Falha ao identificar a imagem no upload')
            return Response(
                {
                    'error': (
                        'Não foi possível ler a imagem. Formato não suportado ou arquivo corrompido. '
                        'Instale os pacotes pillow-avif-plugin e pillow-heif para AVIF/HEIC.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info('Upload de imagem processado com sucesso: %s', image_file.name)
        return Response(data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception('Erro inesperado ao processar upload de imagem')
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

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import uuid
from PIL import Image
import io

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_product_image(request):
    """
    Endpoint para upload de imagens de produtos.
    Converte automaticamente para WebP e otimiza o tamanho.
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Nenhuma imagem enviada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Validar tipo
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Tipo de arquivo inválido. Apenas JPG, JPEG e PNG são permitidos.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar tamanho
        max_size = 10 * 1024 * 1024  # 10MB
        if image_file.size > max_size:
            return Response(
                {'error': 'Arquivo muito grande. Tamanho máximo: 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Abrir imagem
        img = Image.open(image_file)

        # Converter transparência → fundo branco
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background

        # Redimensionar se muito grande
        max_dimension = 1920
        if max(img.width, img.height) > max_dimension:
            ratio = max_dimension / max(img.width, img.height)
            new_width = int(img.width * ratio)
            new_height = int(img.height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Converter para WebP
        webp_buffer = io.BytesIO()
        img.save(webp_buffer, format='WEBP', quality=85, optimize=True)
        webp_buffer.seek(0)

        # Nome único
        original_name = os.path.splitext(image_file.name)[0]
        filename = f"products/{uuid.uuid4()}_{original_name}.webp"

        # Salvar
        saved_path = default_storage.save(filename, ContentFile(webp_buffer.getvalue()))

        # URL
        image_url = default_storage.url(saved_path)

        if settings.DEBUG:
            image_url = f"http://127.0.0.1:8000{image_url}"

        return Response({
            'id': str(uuid.uuid4()),
            'url': image_url,
            'filename': os.path.basename(saved_path),
            'size': webp_buffer.tell(),
            'width': img.width,
            'height': img.height,
            'format': 'WebP'
        }, status=status.HTTP_201_CREATED)

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
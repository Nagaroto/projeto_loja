# Guia de Migração para Cloudinary - Sistema de Upload de Imagens

## Resumo das Mudanças

Refatoração completa do sistema de upload de imagens para usar Cloudinary como storage principal, eliminando dependência de filesystem local.

## Arquivos Alterados

### 1. requirements.txt
- **Adicionado**: `cloudinary==1.41.0`
- **Adicionado**: `django-cloudinary-storage==0.3.0`

### 2. config/settings.py
- **Removido**: Condicional `if not DEBUG` para Cloudinary
- **Removido**: `MEDIA_ROOT = BASE_DIR / 'media'`
- **Removido**: `MEDIA_URL = '/media/'`
- **Adicionado**: Cloudinary configurado SEMPRE ativo (dev e produção)
- **Adicionado**: `DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'`
- **Adicionado**: `MEDIA_URL` aponta para Cloudinary

### 3. beckend/models.py
- **ProductImage**: Convertido de `url` (URLField) para `image` (ImageField)
- **Removido**: Campo `url` (URLField manual)
- **Removido**: Campo `filename` (CharField manual)
- **Removido**: `unique_together = ['product', 'filename']`
- **Adicionado**: Campo `image` (ImageField com upload_to='products/')
- **Adicionado**: Propriedade `url` (retorna image.url automaticamente)
- **Adicionado**: Propriedade `filename` (retorna nome do arquivo para compatibilidade)

### 4. beckend/serializers.py
- **Removido**: Lógica complexa de URL building manual (BACKEND_URL, request.build_absolute_uri)
- **Simplificado**: `get_image_url()` agora retorna `obj.image_url` diretamente
- **Motivo**: Cloudinary retorna URLs absolutas automaticamente via ImageField.url

### 5. beckend/product_image_serializer.py
- **Removido**: Importações de `os` e `settings`
- **Removido**: Lógica manual de URL building
- **Alterado**: `url` agora usa `serializers.ImageField(source='image', read_only=True)`
- **Alterado**: `ProductImageCreateSerializer` usa campo `image` ao invés de `url` e `filename`

### 6. beckend/upload_views.py
- **Adicionado**: Função `_convert_to_webp()` para conversão automática
- **Refatorado**: `upload_product_image()` agora converte para WebP antes de salvar
- **Pipeline corrigido**: Upload → Pillow converte para WebP → ImageField.save() → Cloudinary
- **Removido**: `delete_product_image_by_id` (função obsoleta)
- **Removido**: `list_product_images` (função obsoleta)
- **Simplificado**: `delete_product_image()` agora só deleta o registro (Cloudinary deleta automaticamente)

### 7. beckend/product_views.py
- **Removido**: Importação de `default_storage`
- **Removido**: Método `_delete_product_image_file()` (não é mais necessário)
- **Refatorado**: `_save_product_images()` usa campo `image` ao invés de `url`
- **Refatorado**: `_update_product_images()` usa campo `image` ao invés de `url`
- **Refatorado**: `add_image()` usa `request.FILES.get('image')` ao invés de URL manual
- **Refatorado**: `remove_image()` remove lógica manual de deletar arquivo do storage

### 8. beckend/urls.py
- **Removido**: Importação de `delete_product_image_by_id`
- **Removido**: Importação de `list_product_images`
- **Removido**: Rota `/upload/product-image/<str:filename>/` (obsoleta)
- **Removido**: Rota `/product-images/<int:pk>/` (obsoleta)
- **Removido**: Rota `/upload/product-images/` (obsoleta)
- **Alterado**: Rota `/upload/product-image/<int:pk>/` agora usa ID ao invés de filename

### 9. beckend/migrations/0019_convert_productimage_to_cloudinary.py
- **Criado**: Migração manual para converter ProductImage de URLField para ImageField
- **Operações**: Remove `url` e `filename`, adiciona `image`, remove unique_together

## Pipeline Corrigido

### Antes (Quebrado)
```
Upload → Salva localmente → Monta URL manual → Quebra em produção
```

### Depois (Corrigido)
```
Upload → Pillow converte para WebP → ImageField.save() → Cloudinary storage → URL absoluta
```

## Instruções de Deploy

### 1. Instalar Dependências
```bash
pip install cloudinary==1.41.0 django-cloudinary-storage==0.3.0
```

### 2. Configurar Variáveis de Ambiente (Render)
No painel do Render, adicionar:
```
CLOUDINARY_CLOUD_NAME=desqxyngm
CLOUDINARY_API_KEY=815981943999871
CLOUDINARY_API_SECRET=m7ZzcQ7Q8FEI0UHJkb1GuuEfAVM
```

### 3. Rodar Migrações
```bash
python manage.py migrate
```

### 4. Deploy
```bash
git add .
git commit -m "Refatorar upload de imagens para Cloudinary"
git push
```

## Frontend - Mudanças Necessárias

O frontend precisa ser atualizado para enviar arquivos ao invés de URLs:

### Antes (URL manual)
```javascript
const imageData = {
  url: 'https://...',
  filename: 'img.webp',
  is_cover: true
};
```

### Depois (Arquivo)
```javascript
const formData = new FormData();
formData.append('image', fileObject);
formData.append('is_cover', 'true');
```

## Benefícios da Refatoração

1. **Persistência Real**: Imagens sobrevivem deploys e restarts
2. **URLs Absolutas**: Sem mais problemas de `/media/` em produção
3. **Conversão WebP Automática**: Todas as imagens são convertidas para WebP
4. **Otimização**: Redimensionamento automático para 600x600
5. **Escalabilidade**: Cloudinary escala automaticamente
6. **Simplicidade**: Removida toda lógica manual de URL building
7. **Segurança**: Cloudinary gerencia segurança e CDN

## Causa Raiz do Problema Original

O sistema anterior:
- Salvava imagens localmente no filesystem do Render
- Usava URLs relativas `/media/...`
- Montava URLs manualmente com BACKEND_URL
- Perdia imagens a cada deploy (filesystem efêmero do Render)
- Tinha lógica complexa de workaround para URLs locais vs produção

A refatoração elimina todos esses problemas usando Cloudinary como storage profissional.

## Testes Recomendados

1. Upload de imagem via endpoint `/api/upload/product-image/`
2. Verificar se URL retornada é do Cloudinary (`https://res.cloudinary.com/...`)
3. Criar produto com imagens
4. Atualizar produto com imagens
5. Deletar imagem
6. Verificar se imagens aparecem no frontend
7. Deploy no Render e verificar persistência

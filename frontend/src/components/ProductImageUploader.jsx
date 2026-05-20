import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Star, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

// Validação leve: o servidor valida e converte com Pillow (JPEG, PNG, WebP, GIF, AVIF, HEIC, etc.)
const validateImageFile = (file) => {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Máx: 10MB.');
  }
  const t = (file.type || '').toLowerCase();
  if (t && !t.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem.');
  }
  return true;
};

export function ProductImageUploader({
  images = [],
  onChange,
  maxImages = 5,
  productId = null,
  className = '',
}) {
  const [previews, setPreviews] = useState({});
  const [uploadingImages, setUploadingImages] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processImageUpload = useCallback(async (file) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const objectUrl = URL.createObjectURL(file);

    try {
      validateImageFile(file);

      if (images.length >= maxImages) {
        throw new Error(`Máximo de ${maxImages} imagens.`);
      }

      setUploadingImages((prev) => new Set(prev).add(tempId));
      setPreviews((prev) => ({ ...prev, [tempId]: objectUrl }));

      const formData = new FormData();
      formData.append('image', file);

      // ✅ USO CORRETO DO API (COM TOKEN AUTOMÁTICO)
      const response = await api.post('/upload/product-image/', formData);
      
      const newImage = {
        id: response.data.id,
        url: response.data.url,
        isCover: images.length === 0,
      };

      onChange([...images, newImage]);
      setError('');

      return newImage;
    } catch (err) {
      console.error('Erro no upload:', err);
      setError(err.response?.data?.error || err.message);
      // Limpa o preview em caso de erro
      setPreviews((prev) => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });
      URL.revokeObjectURL(objectUrl);
      throw err;
    } finally {
      setUploadingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      // Não revogamos aqui imediatamente para não quebrar o preview se o upload for muito rápido
      // A limpeza será feita quando o componente for desmontado ou após um tempo
    }
  }, [images, maxImages, onChange]);

  // Limpeza de URLs de objetos para evitar vazamento de memória
  React.useEffect(() => {
    return () => {
      Object.values(previews).forEach(URL.revokeObjectURL);
    };
  }, [previews]);

  const handleFileSelect = useCallback(async (files) => {
    const fileArray = Array.from(files);
    console.log('[UPLOAD] handleFileSelect fileArray:', fileArray);

    try {
      if (images.length + fileArray.length > maxImages) {
        throw new Error(`Máximo de ${maxImages} imagens.`);
      }

      // Processa um por um para garantir que o estado de previews seja atualizado corretamente
      for (const file of fileArray) {
        await processImageUpload(file);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [images, maxImages, processImageUpload]);

  const handleInputChange = (e) => {
    console.log('[UPLOAD] handleInputChange files:', e.target.files);
    if (e.target.files?.length) {
      handleFileSelect(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeImage = async (index) => {
    const imageToRemove = images[index];

    try {
      const imageId = Number(imageToRemove.id);
      const isPersistedImage = productId && Number.isInteger(imageId) && imageId > 0;

      if (isPersistedImage) {
        await api.delete(`/product-images/${imageId}/`);
      } else if (imageToRemove.filename) {
        await api.delete(`/upload/product-image/${imageToRemove.filename}/`);
      }

      const newImages = images.filter((_, i) => i !== index);

      if (imageToRemove.isCover && newImages.length > 0) {
        newImages[0].isCover = true;
      }

      onChange(newImages);
      setError('');
    } catch (err) {
      console.error('Erro ao remover imagem:', err);
      setError(err.response?.data?.error || 'Erro ao remover imagem');
    }
  };

  const setAsCover = (index) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));

    onChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {images.length < maxImages && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? 'border-green-500 bg-green-100' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mx-auto mb-2" />
            Enviar imagens
          </button>

          {uploadingImages.size > 0 && (
            <Loader2 className="animate-spin mx-auto mt-2" />
          )}
        </div>
      )}

      {error && (
        <div className="text-red-500 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Renderiza previews de uploads em andamento */}
        {Array.from(uploadingImages).map((tempId) => (
          <div key={tempId} className="relative opacity-70">
            <div className="aspect-square w-full overflow-hidden rounded bg-gray-100 flex items-center justify-center border-2 border-cereon-green border-dashed">
              {previews[tempId] ? (
                <img 
                  src={previews[tempId]} 
                  className="w-full h-full object-cover" 
                  alt="Preview" 
                  onLoad={() => console.log('Preview carregado com sucesso')}
                  onError={(e) => {
                    console.error('Erro no preview local:', previews[tempId]);
                    e.target.style.display = 'none'; // Se o preview local falhar, esconde a img e deixa o loader
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
                <Loader2 className="animate-spin text-cereon-green mb-2" size={32} />
                <span className="text-[10px] font-bold text-cereon-green bg-white/80 px-1 rounded">ENVIANDO...</span>
              </div>
            </div>
          </div>
        ))}

        {images.map((img, index) => (
          <div key={img.id} className="relative">
            <div className="aspect-square w-full overflow-hidden rounded border border-gray-200">
              <img 
                src={img.url} 
                className="w-full h-full object-cover" 
                alt={`Produto ${index + 1}`}
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', img.url);
                  e.target.src = '/imgs/cereon.webp'; // Fallback se a imagem quebrar
                }}
              />
            </div>

            {img.isCover && (
              <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2">
                Capa
              </span>
            )}

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setAsCover(index)}>
                <Star size={16} />
              </button>

              <button type="button" onClick={() => removeImage(index)}>
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
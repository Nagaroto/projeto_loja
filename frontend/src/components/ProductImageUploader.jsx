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
  const [uploadingImages, setUploadingImages] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processImageUpload = useCallback(async (file) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    try {
      validateImageFile(file);

      if (images.length >= maxImages) {
        throw new Error(`Máximo de ${maxImages} imagens.`);
      }

      console.log('[UPLOAD] selected file', file, {
        name: file.name,
        type: file.type,
        size: file.size,
        isFile: file instanceof File,
      });

      setUploadingImages((prev) => new Set(prev).add(tempId));

      const formData = new FormData();
      formData.append('image', file);
      console.log('[UPLOAD] FormData entries before send:', Array.from(formData.entries()));

      // ✅ USO CORRETO DO API (COM TOKEN AUTOMÁTICO)
      const response = await api.post('/upload/product-image/', formData);
      console.log('[UPLOAD] response data:', response.data);

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
      throw err;
    } finally {
      setUploadingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    }
  }, [images, maxImages, onChange]);

  const handleFileSelect = useCallback(async (files) => {
    const fileArray = Array.from(files);
    console.log('[UPLOAD] handleFileSelect fileArray:', fileArray);

    try {
      if (images.length + fileArray.length > maxImages) {
        throw new Error(`Máximo de ${maxImages} imagens.`);
      }

      await Promise.all(fileArray.map(processImageUpload));
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
        {images.map((img, index) => (
          <div key={img.id} className="relative">
            <div className="aspect-square w-full overflow-hidden rounded">
              <img src={img.url} className="w-full h-full object-cover" />
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
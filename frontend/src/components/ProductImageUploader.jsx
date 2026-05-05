import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Star, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

// Função para converter imagem para WebP
const convertToWebP = (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpFile = new File([blob], `${file.name.split('.')[0]}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          } else {
            reject(new Error('Falha na conversão para WebP'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Falha ao carregar a imagem'));

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Validação
const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!validTypes.includes(file.type)) {
    throw new Error('Formato inválido. Apenas JPG, JPEG e PNG.');
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Máx: 10MB.');
  }

  return true;
};

export function ProductImageUploader({
  images = [],
  onChange,
  maxImages = 5,
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

      setUploadingImages((prev) => new Set(prev).add(tempId));

      const webpFile = await convertToWebP(file, 0.8);

      const formData = new FormData();
      formData.append('image', webpFile);

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

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);

    if (images[index].isCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }

    onChange(newImages);
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
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            className="hidden"
          />

          <button onClick={() => fileInputRef.current?.click()}>
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
            <img src={img.url} className="rounded" />

            {img.isCover && (
              <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2">
                Capa
              </span>
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={() => setAsCover(index)}>
                <Star size={16} />
              </button>

              <button onClick={() => removeImage(index)}>
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
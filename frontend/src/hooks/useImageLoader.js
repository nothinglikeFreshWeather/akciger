import { useState, useCallback } from 'react';
import useImage from 'use-image';

/**
 * Görsel yükleme ve işleme için custom hook
 * SOLID - Single Responsibility: Sadece görsel yükleme işlemlerinden sorumlu
 */
export const useImageLoader = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  
  // use-image hook'unu kullanarak görsel yükle
  const [image, imageStatus] = useImage(imageUrl);

  /**
   * Dosya yükleme işlemi
   * @param {File} file - Yüklenecek dosya
   */
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    
    // Dosya tipini kontrol et
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError('Sadece JPG ve PNG dosyaları desteklenir.');
      return;
    }
    
    // Dosya boyutunu kontrol et (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan küçük olmalıdır.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // FileReader ile dosyayı oku
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const url = e.target.result;
        setImageUrl(url);
        setUploadedImage({
          file,
          url,
          name: file.name,
          size: file.size,
          type: file.type
        });
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        setError('Dosya okunurken hata oluştu.');
        setIsLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Dosya yüklenirken hata oluştu.');
      setIsLoading(false);
    }
  }, []);

  /**
   * Drag & drop işlemi
   * @param {Event} event - Drag event
   */
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  /**
   * Drag over işlemi
   * @param {Event} event - Drag over event
   */
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Görseli temizle
   */
  const clearImage = useCallback(() => {
    setUploadedImage(null);
    setImageUrl(null);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Görsel boyutlarını al
   */
  const getImageDimensions = useCallback(() => {
    if (image) {
      return {
        width: image.naturalWidth,
        height: image.naturalHeight
      };
    }
    return null;
  }, [image]);

  return {
    // State
    uploadedImage,
    image,
    imageStatus,
    isLoading,
    error,
    
    // Actions
    uploadFile,
    handleDrop,
    handleDragOver,
    clearImage,
    getImageDimensions,
    
    // Computed
    isImageLoaded: imageStatus === 'loaded',
    isImageLoading: imageStatus === 'loading',
    isImageError: imageStatus === 'failed'
  };
};

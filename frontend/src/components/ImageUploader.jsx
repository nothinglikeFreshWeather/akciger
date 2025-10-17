import React, { useRef } from 'react';
import { useImageLoader } from '../hooks/useImageLoader';

/**
 * Görsel yükleme bileşeni
 * SOLID - Single Responsibility: Sadece görsel yükleme işleminden sorumlu
 * 
 * @param {Object} props
 * @param {Function} props.onImageUpload - Görsel yüklendiğinde çağrılacak callback
 * @param {Function} props.onImageClear - Görsel temizlendiğinde çağrılacak callback
 */
const ImageUploader = ({ onImageUpload, onImageClear }) => {
  const fileInputRef = useRef(null);
  const {
    uploadedImage,
    isLoading,
    error,
    uploadFile,
    handleDrop,
    handleDragOver,
    clearImage
  } = useImageLoader();

  /**
   * Dosya seçici aç
   */
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  /**
   * Dosya değişikliği
   */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  /**
   * Görsel yüklendiğinde parent'a bildir
   */
  React.useEffect(() => {
    if (uploadedImage && onImageUpload) {
      onImageUpload(uploadedImage);
    }
  }, [uploadedImage, onImageUpload]);

  /**
   * Görsel temizlendiğinde parent'a bildir
   */
  const handleClearImage = () => {
    clearImage();
    if (onImageClear) {
      onImageClear();
    }
  };

  const getUploadAreaStyle = () => {
    let baseStyle = {
      position: 'relative',
      border: '2px dashed',
      borderRadius: '8px',
      padding: '32px',
      textAlign: 'center',
      transition: 'all 0.2s',
      cursor: uploadedImage ? 'default' : 'pointer'
    };

    if (isLoading) {
      baseStyle.borderColor = '#60a5fa';
      baseStyle.backgroundColor = '#eff6ff';
    } else if (error) {
      baseStyle.borderColor = '#f87171';
      baseStyle.backgroundColor = '#fef2f2';
    } else if (uploadedImage) {
      baseStyle.borderColor = '#4ade80';
      baseStyle.backgroundColor = '#f0fdf4';
    } else {
      baseStyle.borderColor = '#d1d5db';
      baseStyle.backgroundColor = '#f9fafb';
    }

    return baseStyle;
  };

  return (
    <div style={{width: '100%', maxWidth: '400px', margin: '0 auto'}}>
      {/* Görsel yükleme alanı */}
      <div
        style={getUploadAreaStyle()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={!uploadedImage ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-blue-600 font-medium">Görsel yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="text-red-500 text-4xl">⚠️</div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={openFileDialog}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        ) : uploadedImage ? (
          <div className="space-y-4">
            <div className="text-green-500 text-4xl">✅</div>
            <div className="space-y-2">
              <p className="text-green-600 font-medium">Görsel başarıyla yüklendi!</p>
              <p className="text-sm text-gray-600">{uploadedImage.name}</p>
              <p className="text-xs text-gray-500">
                {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={openFileDialog}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                Yeni Görsel
              </button>
              <button
                onClick={handleClearImage}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Temizle
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400 text-4xl">📁</div>
            <div className="space-y-2">
              <p className="text-gray-600 font-medium">
                X-ray görselini buraya sürükleyin
              </p>
              <p className="text-sm text-gray-500">
                veya tıklayarak seçin
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Görsel önizleme */}
      {uploadedImage && (
        <div className="mt-4">
          <div className="relative">
            <img
              src={uploadedImage.url}
              alt="X-ray önizleme"
              className="w-full h-48 object-contain bg-gray-100 rounded border"
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              X-ray
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

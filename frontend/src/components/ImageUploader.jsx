import React, { useState, useRef } from 'react';
import { useImageLoader } from '../hooks/useImageLoader';
import { analyzeXray } from '../services/flaskApi';

/**
 * Görsel yükleme ve analiz bileşeni
 * SOLID - Single Responsibility: Sadece görsel yükleme ve analiz işleminden sorumlu
 * 
 * @param {Object} props
 * @param {Function} props.onImageUpload - Görsel yüklendiğinde çağrılacak callback
 * @param {Function} props.onImageClear - Görsel temizlendiğinde çağrılacak callback
 * @param {Function} props.onAnalysisComplete - Analiz tamamlandığında çağrılacak callback
 */
const ImageUploader = ({ onImageUpload, onImageClear, onAnalysisComplete }) => {
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
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [result, setResult] = useState(null);

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
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalysisError(null);

    // Önizleme oluştur (PNG/JPG/JPEG için)
    // DICOM için önizleme gösterilmez
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.name.endsWith('.dcm')) {
      // DICOM dosyası
      setPreview(null);
      console.log('DICOM dosyası seçildi:', selectedFile.name);
    }

    uploadFile(selectedFile);
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
    setFile(null);
    setPreview(null);
    setResult(null);
    if (onImageClear) {
      onImageClear();
    }
  };

  /**
   * Analiz işlemi
   */
  const handleAnalyze = async () => {
    if (!file) {
      setAnalysisError('Lütfen bir görsel dosyası seçin');
      return;
    }

    setLoading(true);
    setAnalysisError(null);

    try {
      const analysisResult = await analyzeXray(file);
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      setAnalysisError(err.message);
      console.error('Analiz hatası:', err);
    } finally {
      setLoading(false);
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
          accept=".dcm,image/jpeg,image/jpg,image/png,image/tiff,image/x-dcm,application/dicom"
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
                DICOM, JPG, PNG (Max 10MB)
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

      {/* Analiz Bölümü */}
      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Analiz İşlemi</h2>

        {/* Analiz Butonu */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '⏳ Analiz Yapılıyor...' : '🔍 Analiz Yap'}
        </button>

        {/* Hata Mesajı - Hook'tan gelen error */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
            <p className="font-semibold">⚠️ Dosya Hatası</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Hata Mesajı - Analiz hatası */}
        {analysisError && (
          <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
            <p className="font-semibold">❌ Analiz Hatası</p>
            <p className="text-sm mt-1">{analysisError}</p>
          </div>
        )}

        {/* Sonuçlar */}
        {result && (
          <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded">
            <h3 className="font-bold text-lg mb-3">📊 Analiz Sonuçları</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Akciğer Alanı</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.lung_ratio_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Pnömotoraks Alanı</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.pnx_ratio_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Pnömotoraks/Akciğer</p>
                <p className="text-2xl font-bold text-orange-600">
                  {result.pnx_ratio_vs_lung_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Dice (Akciğer)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.dice_lung?.toFixed(3)}
                </p>
              </div>
            </div>

            {/* Overlay Görsel */}
            {result.overlay_image_url && (
              <div>
                <p className="text-sm font-medium mb-2">Segmentasyon Sonucu:</p>
                <img
                  src={result.overlay_image_url}
                  alt="Segmentasyon Overlay"
                  className="max-w-full border border-gray-300 rounded"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;

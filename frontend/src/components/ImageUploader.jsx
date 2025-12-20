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
    if (selectedFile.type && selectedFile.type.startsWith('image/') && !selectedFile.name.match(/\.(dcm|dicom)$/i)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // DICOM dosyası veya bilinmeyen format (DICOM olarak işlenecek)
      setPreview(null);
      console.log('DICOM veya medikal görüntü dosyası seçildi:', selectedFile.name);
    }

    uploadFile(selectedFile);
  };

  /**
   * Görsel yüklendiğinde parent'a bildir
   */
  React.useEffect(() => {
    if (uploadedImage && onImageUpload && !uploadedImage.isDicom) {
      // Image objesi oluştur ve parent'a gönder
      const img = new Image();
      img.onload = () => {
        onImageUpload({
          file: uploadedImage.file,
          url: uploadedImage.url,
          name: uploadedImage.name,
          size: uploadedImage.size,
          type: uploadedImage.type
        });
      };
      img.src = uploadedImage.url;
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
      borderRadius: '4px',
      padding: '32px',
      textAlign: 'center',
      transition: 'all 0.2s',
      cursor: uploadedImage ? 'default' : 'pointer'
    };

    if (isLoading) {
      baseStyle.borderColor = '#2B579A';
      baseStyle.backgroundColor = '#E6F2FF';
    } else if (error) {
      baseStyle.borderColor = '#F44336';
      baseStyle.backgroundColor = '#FFEBEE';
    } else if (uploadedImage) {
      baseStyle.borderColor = '#4CAF50';
      baseStyle.backgroundColor = '#E8F5E9';
    } else {
      baseStyle.borderColor = '#D0D0D0';
      baseStyle.backgroundColor = '#F5F5F5';
    }

    return baseStyle;
  };

  return (
    <div style={{width: '100%', maxWidth: '600px', margin: '0 auto'}}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
          accept=".dcm,.dicom,image/*,application/dicom,image/x-dcm,*/*"
          onChange={handleFileChange}
          style={{display: 'none'}}
        />

        {isLoading ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center'}}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #2B579A',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{color: '#2B579A', fontWeight: '500', fontSize: '14px'}}>Görsel yükleniyor...</p>
          </div>
        ) : error ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center'}}>
            <div style={{fontSize: '48px'}}>⚠️</div>
            <p style={{color: '#C62828', fontWeight: '500', fontSize: '14px'}}>{error}</p>
            <button
              onClick={openFileDialog}
              style={{
                padding: '8px 16px',
                backgroundColor: '#F44336',
                color: 'white',
                border: '1px solid #D32F2F',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#D32F2F';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#F44336';
              }}
            >
              Tekrar Dene
            </button>
          </div>
        ) : uploadedImage ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center'}}>
            <div style={{fontSize: '48px'}}>✅</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'}}>
              <p style={{color: '#2E7D32', fontWeight: '500', fontSize: '14px'}}>Görsel başarıyla yüklendi!</p>
              <p style={{fontSize: '12px', color: '#666666'}}>{uploadedImage.name}</p>
              <p style={{fontSize: '11px', color: '#999999'}}>
                {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
              <button
                onClick={openFileDialog}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2B579A',
                  color: 'white',
                  border: '1px solid #1E4D72',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1E4D72';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2B579A';
                }}
              >
                Yeni Görsel
              </button>
              <button
                onClick={handleClearImage}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: '1px solid #616161',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#616161';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#757575';
                }}
              >
                Temizle
              </button>
            </div>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center'}}>
            <div style={{fontSize: '48px', color: '#CCCCCC'}}>📁</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'}}>
              <p style={{color: '#333333', fontWeight: '500', fontSize: '14px'}}>
                X-ray görselini buraya sürükleyin
              </p>
              <p style={{fontSize: '12px', color: '#666666'}}>
                veya tıklayarak seçin
              </p>
              <p style={{fontSize: '11px', color: '#999999'}}>
                DICOM, JPG, PNG (uzantısız dosyalar da kabul edilir, Max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Görsel önizleme - Word 2013 Style */}
      {uploadedImage && (
        <div style={{marginTop: '16px'}}>
          <div style={{position: 'relative'}}>
            <img
              src={uploadedImage.url}
              alt="X-ray önizleme"
              style={{
                width: '100%',
                height: '192px',
                objectFit: 'contain',
                backgroundColor: '#F5F5F5',
                borderRadius: '4px',
                border: '1px solid #D0D0D0'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              X-ray
            </div>
          </div>
        </div>
      )}

      {/* Analiz Bölümü - Word 2013 Style */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '4px',
        border: '1px solid #D0D0D0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#333333'
        }}>
          Analiz İşlemi
        </h2>

        {/* Analiz Butonu */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          style={{
            backgroundColor: (!file || loading) ? '#CCCCCC' : '#2B579A',
            color: 'white',
            padding: '8px 24px',
            border: '1px solid',
            borderColor: (!file || loading) ? '#B0B0B0' : '#1E4D72',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: (!file || loading) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!(!file || loading)) {
              e.target.style.backgroundColor = '#1E4D72';
            }
          }}
          onMouseLeave={(e) => {
            if (!(!file || loading)) {
              e.target.style.backgroundColor = '#2B579A';
            }
          }}
        >
          {loading ? '⏳ Analiz Yapılıyor...' : '🔍 Analiz Yap'}
        </button>

        {/* Hata Mesajı - Hook'tan gelen error */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#FFEBEE',
            borderLeft: '4px solid #F44336',
            color: '#C62828',
            borderRadius: '4px',
            border: '1px solid #FFCDD2'
          }}>
            <p style={{fontWeight: '600', fontSize: '14px', marginBottom: '4px'}}>⚠️ Dosya Hatası</p>
            <p style={{fontSize: '12px'}}>{error}</p>
          </div>
        )}

        {/* Hata Mesajı - Analiz hatası */}
        {analysisError && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#FFEBEE',
            borderLeft: '4px solid #F44336',
            color: '#C62828',
            borderRadius: '4px',
            border: '1px solid #FFCDD2'
          }}>
            <p style={{fontWeight: '600', fontSize: '14px', marginBottom: '4px'}}>❌ Analiz Hatası</p>
            <p style={{fontSize: '12px'}}>{analysisError}</p>
          </div>
        )}

        {/* Sonuçlar - Word 2013 Style */}
        {result && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #4CAF50',
            borderRadius: '4px'
          }}>
            <h3 style={{
              fontWeight: '700',
              fontSize: '16px',
              marginBottom: '12px',
              color: '#2E7D32'
            }}>
              📊 Analiz Sonuçları
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <p style={{fontSize: '12px', color: '#666666', marginBottom: '4px'}}>Akciğer Alanı</p>
                <p style={{fontSize: '24px', fontWeight: '700', color: '#2E7D32'}}>
                  {result.lung_ratio_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p style={{fontSize: '12px', color: '#666666', marginBottom: '4px'}}>Pnömotoraks Alanı</p>
                <p style={{fontSize: '24px', fontWeight: '700', color: '#C62828'}}>
                  {result.pnx_ratio_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p style={{fontSize: '12px', color: '#666666', marginBottom: '4px'}}>Pnömotoraks/Akciğer</p>
                <p style={{fontSize: '24px', fontWeight: '700', color: '#F57C00'}}>
                  {result.pnx_ratio_vs_lung_percent?.toFixed(2)}%
                </p>
              </div>
              
              <div>
                <p style={{fontSize: '12px', color: '#666666', marginBottom: '4px'}}>Dice (Akciğer)</p>
                <p style={{fontSize: '24px', fontWeight: '700', color: '#2B579A'}}>
                  {result.dice_lung?.toFixed(3)}
                </p>
              </div>
            </div>

            {/* Overlay Görsel */}
            {result.overlay_image_url && (
              <div>
                <p style={{fontSize: '12px', fontWeight: '500', marginBottom: '8px', color: '#333333'}}>
                  Segmentasyon Sonucu:
                </p>
                <img
                  src={result.overlay_image_url}
                  alt="Segmentasyon Overlay"
                  style={{
                    maxWidth: '100%',
                    border: '1px solid #D0D0D0',
                    borderRadius: '4px'
                  }}
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

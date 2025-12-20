import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import XrayCanvas from './components/XrayCanvas';
import ZoomControls from './components/ZoomControls';
import { calculateZoomScale } from './utils/canvasHelpers';
import { getSliceImage, getVolume, testApiConnection, analyzeXray, listModels, selectModel } from './services/flaskApi';

/**
 * Ana uygulama bileşeni - Profesyonel X-ray Analiz Arayüzü
 */
function App() {
  // State yönetimi
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null); // Orijinal görüntü
  const [modelImage, setModelImage] = useState(null); // Model analiz sonucu
  const [activeTab, setActiveTab] = useState('original'); // 'original' veya 'model'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Backend API state'leri
  const [apiConnected, setApiConnected] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [volumeData, setVolumeData] = useState(null);
  const [isLoadingSlice, setIsLoadingSlice] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [userDrawnArea, setUserDrawnArea] = useState(null); // Doktorun çizdiği alan (pixel)
  const [isDragging, setIsDragging] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState(null); // Orijinal yüklenen dosya
  const [availableModels, setAvailableModels] = useState([]); // Backend'deki mevcut modeller
  const [selectedModel, setSelectedModel] = useState(null); // Seçilen model adı
  const [currentModel, setCurrentModel] = useState(null); // Şu anda yüklü model
  const [isLoadingModel, setIsLoadingModel] = useState(false); // Model yükleniyor mu?
  const [analysisResults, setAnalysisResults] = useState(null); // Analiz sonuçları

  // Backend'den dilim görüntüsü yükleme
  const loadSliceFromBackend = useCallback(async (sliceIndex) => {
    if (!apiConnected) return;
    
    setIsLoadingSlice(true);
    setApiError(null);
    
    try {
      // Eski blob URL'yi temizle (memory leak önlemi)
      if (image && image.src && image.src.startsWith('blob:')) {
        URL.revokeObjectURL(image.src);
      }
      
      const imageUrl = await getSliceImage(sliceIndex);
      const img = new Image();
      
      img.onload = () => {
        setImage(img);
        setIsLoadingSlice(false);
      };
      
      img.onerror = () => {
        setIsLoadingSlice(false);
        setApiError('Görüntü yüklenemedi');
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('Dilim yükleme hatası:', error);
      setApiError(error.message || 'Backend\'den görüntü alınamadı');
      setIsLoadingSlice(false);
    }
  }, [apiConnected, image]);

  // Backend'den hacim/alan bilgisi alma
  const loadVolumeData = useCallback(async (labelId = 1) => {
    if (!apiConnected) return;
    
    try {
      const data = await getVolume(labelId);
      setVolumeData(data);
    } catch (error) {
      console.error('Hacim bilgisi alınamadı:', error);
      // Hata durumunda sessizce devam et
    }
  }, [apiConnected]);

  // Görsel yükleme fonksiyonu
  const handleFileUpload = useCallback((file) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Standart görsel formatları kontrol et
    const isStandardImage = fileType.startsWith('image/') && 
                           !fileName.match(/\.(dcm|dicom|dcom)$/) &&
                           fileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|tif)$/);
    
    // DICOM kontrolü - .dcm, .dicom, .dcom uzantıları veya belirsiz tip
    const hasDicomExtension = fileName.match(/\.(dcm|dicom|dcom)$/);
    const hasDicomMimeType = fileType === 'application/dicom' || 
                            fileType === 'image/x-dcm';
    const isUnknownType = !fileType || fileType === '' || fileType === 'application/octet-stream';
    // Uzantısız ama tip belirsiz olan dosyaları da DICOM olarak kabul et (backend handle edecek)
    const isDicom = hasDicomExtension || hasDicomMimeType || (isUnknownType && !isStandardImage);

    if (!isStandardImage && !isDicom) {
      alert('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, GIF, BMP, TIFF veya DICOM)');
      return;
    }

    // Orijinal dosyayı sakla (analiz için)
    setOriginalImageFile(file);

    // Standart görsel dosyası
    if (isStandardImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setImage(img); // Aktif görseli orijinal olarak ayarla
          setActiveTab('original');
          setModelImage(null); // Yeni görsel yüklendiğinde model görselini temizle
          setZoomLevel(1);
        };
        img.onerror = () => {
          alert('Görsel yüklenemedi. Lütfen geçerli bir dosya seçin.');
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        alert('Dosya okunurken hata oluştu.');
      };
      reader.readAsDataURL(file);
    } else {
      // DICOM dosyası - önizleme gösterilemez, canvas'ta placeholder gösterilecek
      // Placeholder görsel oluştur (canvas'ta görünsün)
      const placeholder = new Image();
      placeholder.onload = () => {
        setOriginalImage(placeholder);
        setImage(placeholder);
        setModelImage(null);
        setActiveTab('original');
        setZoomLevel(1);
      };
      // 256x256 gri placeholder görsel oluştur (data URL)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#666666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DICOM Dosyası', 128, 120);
      ctx.fillText(file.name, 128, 140);
      placeholder.src = canvas.toDataURL();
      console.log(`DICOM dosyası yüklendi: ${file.name}`);
    }
  }, []);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Tab değiştirme
  useEffect(() => {
    if (activeTab === 'original' && originalImage) {
      setImage(originalImage);
    } else if (activeTab === 'model' && modelImage) {
      setImage(modelImage);
    }
  }, [activeTab, originalImage, modelImage]);

  // Görsel temizleme
  const handleClearImage = useCallback(() => {
    if (image && image.src && image.src.startsWith('blob:')) {
      URL.revokeObjectURL(image.src);
    }
    setImage(null);
    setOriginalImage(null);
    setModelImage(null);
    setOriginalImageFile(null);
    setActiveTab('original');
    setZoomLevel(1);
    setIsAnalyzing(false);
    setVolumeData(null);
    setCurrentSlice(0);
    setAnalysisResults(null);
  }, [image]);
  
  // Dilim navigasyonu
  const handleSliceChange = useCallback((newSlice) => {
    if (newSlice < 0 || (totalSlices > 0 && newSlice >= totalSlices)) return;
    setCurrentSlice(newSlice);
    loadSliceFromBackend(newSlice);
  }, [totalSlices, loadSliceFromBackend]);
  

  // Tab değiştirme
  useEffect(() => {
    if (activeTab === 'original' && originalImage) {
      setImage(originalImage);
    } else if (activeTab === 'model' && modelImage) {
      setImage(modelImage);
    }
  }, [activeTab, originalImage, modelImage]);

  // API bağlantısını kontrol et
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await testApiConnection();
        setApiConnected(connected);
        if (connected) {
          setApiError(null);
        } else {
          setApiError('Flask API\'ye bağlanılamıyor. Backend\'in çalıştığından emin olun.');
        }
      } catch (error) {
        setApiConnected(false);
        setApiError('API bağlantı hatası');
      }
    };
    
    checkConnection();
    // Her 30 saniyede bir bağlantıyı kontrol et
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);


  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => calculateZoomScale(prev, 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => calculateZoomScale(prev, 0.8));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(newZoom);
  }, []);

  // X-Ray analiz fonksiyonu
  const handleAnalyze = useCallback(async () => {
    if (!originalImageFile) {
      alert('Lütfen önce bir görsel yükleyin');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Orijinal dosyayı backend'e gönder
      const result = await analyzeXray(originalImageFile);
      
      // Overlay görselini yükle
      if (result.overlay_image) {
        const overlayImg = new Image();
        overlayImg.onload = () => {
          // Model görselini kaydet
          setModelImage(overlayImg);
          setImage(overlayImg); // Aktif görseli model görseli olarak ayarla
          setActiveTab('model'); // Model sekmesine geç
          setIsAnalyzing(false);
          
          // Analiz sonuçlarını state'e kaydet
          setAnalysisResults({
            dice_lung: result.dice_lung,
            dice_pnx: result.dice_pnx,
            pnx_ratio_percent: result.pnx_ratio_percent,
            pnx_ratio_vs_lung_percent: result.pnx_ratio_vs_lung_percent,
            lung_ratio_percent: result.lung_ratio_percent
          });
          
          // Analiz sonuçlarını konsola yazdır
          console.log('Analiz Sonuçları:', {
            dice_lung: result.dice_lung,
            dice_pnx: result.dice_pnx,
            pnx_ratio_percent: result.pnx_ratio_percent,
            pnx_ratio_vs_lung_percent: result.pnx_ratio_vs_lung_percent,
            lung_ratio_percent: result.lung_ratio_percent
          });
        };
        overlayImg.onerror = () => {
          setIsAnalyzing(false);
          setAnalysisResults(null);
          alert('Overlay görseli yüklenemedi');
        };
        overlayImg.src = result.overlay_image;
      } else {
        setIsAnalyzing(false);
        setAnalysisResults(null);
        alert('Analiz tamamlandı ancak overlay görseli alınamadı');
      }
    } catch (error) {
      console.error('Analiz hatası:', error);
      setIsAnalyzing(false);
      setAnalysisResults(null);
      alert(`Analiz sırasında hata oluştu: ${error.message}`);
    }
  }, [originalImageFile]);

  // Mevcut modelleri yükle
  const loadAvailableModels = useCallback(async () => {
    if (!apiConnected) return;
    
    try {
      const data = await listModels();
      setAvailableModels(data.models || []);
      setCurrentModel(data.current_model || null);
      if (data.current_model) {
        setSelectedModel(data.current_model);
      }
    } catch (error) {
      console.error('Model listesi alınırken hata:', error);
    }
  }, [apiConnected]);

  // API bağlantısı kurulduğunda modelleri yükle
  useEffect(() => {
    if (apiConnected) {
      loadAvailableModels();
    }
  }, [apiConnected, loadAvailableModels]);

  // Model seçme fonksiyonu
  const handleModelSelect = useCallback(async (modelName) => {
    if (!modelName || modelName === selectedModel) return;

    setIsLoadingModel(true);
    
    try {
      const result = await selectModel(modelName);
      setSelectedModel(modelName);
      setCurrentModel(modelName);
      setApiError(null);
      console.log(`Model başarıyla yüklendi: ${modelName}`);
    } catch (error) {
      console.error('Model seçme hatası:', error);
      alert(`Model yüklenirken hata oluştu: ${error.message}`);
    } finally {
      setIsLoadingModel(false);
    }
  }, [selectedModel]);

  return (
    <div 
      style={{
        minHeight: '100vh', 
        backgroundColor: '#0F1419', 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
      }}
    >
      {/* Header */}
      <header style={{
        backgroundColor: '#1A1F2E',
        borderBottom: '1px solid #2A3441',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 100
      }}>
        <div style={{padding: '0 32px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px'}}>
            <div></div>
            {/* Görüntü Sekmeleri */}
            {originalImage && (
              <div style={{
                display: 'flex', 
                gap: '4px', 
                alignItems: 'center', 
                backgroundColor: '#252B38', 
                borderRadius: '8px', 
                padding: '4px',
                border: '1px solid #2A3441'
              }}>
                <button
                  onClick={() => setActiveTab('original')}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: activeTab === 'original' ? '#4A90E2' : 'transparent',
                    color: activeTab === 'original' ? '#FFFFFF' : '#B8C5D6',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '500',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'original') {
                      e.target.style.backgroundColor = '#2A3441';
                      e.target.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'original') {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#B8C5D6';
                    }
                  }}
                >
                  Original
                </button>
                <button
                  onClick={() => modelImage && setActiveTab('model')}
                  disabled={!modelImage}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: activeTab === 'model' ? '#4A90E2' : 'transparent',
                    color: activeTab === 'model' ? '#FFFFFF' : (modelImage ? '#B8C5D6' : '#5A6578'),
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: modelImage ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    fontWeight: '500',
                    opacity: modelImage ? 1 : 0.5,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (modelImage && activeTab !== 'model') {
                      e.target.style.backgroundColor = '#2A3441';
                      e.target.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (modelImage && activeTab !== 'model') {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#B8C5D6';
                    }
                  }}
                >
                  Analysis
                </button>
              </div>
            )}
            
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <button style={{
                padding: '9px 20px',
                backgroundColor: 'transparent',
                color: '#B8C5D6',
                border: '1px solid #3A4454',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: '500',
                letterSpacing: '-0.01em'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2A3441';
                e.target.style.borderColor = '#4A5568';
                e.target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#3A4454';
                e.target.style.color = '#B8C5D6';
              }}>
                Save
              </button>
              <button style={{
                padding: '9px 20px',
                backgroundColor: '#4A90E2',
                color: '#FFFFFF',
                border: '1px solid #4A90E2',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em',
                boxShadow: '0 2px 8px rgba(74, 144, 226, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#3A7FD2';
                e.target.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#4A90E2';
                e.target.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.3)';
              }}>
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{display: 'flex', height: 'calc(100vh - 64px)', width: '100vw'}}>
        {/* Sidebar */}
        <div style={{
          width: '280px',
          minWidth: '280px',
          backgroundColor: '#1A1F2E',
          borderRight: '1px solid #2A3441',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)'
        }}>

          {/* Analiz Butonu */}
          {originalImageFile && (
            <div style={{padding: '24px', borderBottom: '1px solid #2A3441', backgroundColor: 'transparent'}}>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: isAnalyzing ? '#2A3441' : '#4A90E2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  letterSpacing: '-0.01em',
                  boxShadow: isAnalyzing ? 'none' : '0 4px 12px rgba(74, 144, 226, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!isAnalyzing) {
                    e.target.style.backgroundColor = '#3A7FD2';
                    e.target.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAnalyzing) {
                    e.target.style.backgroundColor = '#4A90E2';
                    e.target.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
                  }
                }}
              >
                {isAnalyzing ? (
                  <>
                    <span style={{animation: 'spin 1s linear infinite', display: 'inline-block', width: '14px', height: '14px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%'}}></span>
                    Analyzing...
                  </>
                ) : (
                  '🔍 Analyze'
                )}
              </button>
            </div>
          )}

          {/* Backend API Bölümü */}
          {/* Model Seçimi */}
          {apiConnected && availableModels.length > 0 && (
            <div style={{padding: '24px', borderBottom: '1px solid #2A3441', backgroundColor: 'transparent'}}>
              <div style={{
                fontSize: '11px', 
                fontWeight: '600', 
                color: '#8B95A7', 
                marginBottom: '14px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em'
              }}>
                Model Selection
              </div>
              
              <select
                value={selectedModel || ''}
                onChange={(e) => handleModelSelect(e.target.value)}
                disabled={isLoadingModel}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  backgroundColor: isLoadingModel ? '#252B38' : '#252B38',
                  color: '#FFFFFF',
                  border: '1px solid #3A4454',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: isLoadingModel ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.01em',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23B8C5D6\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '38px'
                }}
                onMouseEnter={(e) => {
                  if (!isLoadingModel) {
                    e.target.style.borderColor = '#4A90E2';
                    e.target.style.backgroundColor = '#2A3441';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoadingModel) {
                    e.target.style.borderColor = '#3A4454';
                    e.target.style.backgroundColor = '#252B38';
                  }
                }}
              >
                <option value="" style={{backgroundColor: '#252B38', color: '#FFFFFF'}}>Select model...</option>
                {availableModels.map((model) => (
                  <option key={model.name} value={model.name} style={{backgroundColor: '#252B38', color: '#FFFFFF'}}>
                    {model.name} {currentModel === model.name ? '(Active)' : ''}
                  </option>
                ))}
              </select>

              {isLoadingModel && (
                <div style={{
                  marginTop: '14px',
                  padding: '12px',
                  backgroundColor: '#1E2532',
                  borderRadius: '8px',
                  border: '1px solid #3A4454',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #4A90E2',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{fontSize: '12px', color: '#B8C5D6', fontWeight: '500', letterSpacing: '-0.01em'}}>
                    Loading model...
                  </span>
                </div>
              )}

              {currentModel && !isLoadingModel && (
                <div style={{
                  marginTop: '14px',
                  padding: '12px',
                  backgroundColor: '#1E2A1E',
                  borderRadius: '8px',
                  border: '1px solid #2A4A2A',
                  fontSize: '12px',
                  color: '#6BCF7F',
                  fontWeight: '500',
                  letterSpacing: '-0.01em'
                }}>
                  ✓ Active: {currentModel}
                </div>
              )}
            </div>
          )}

          {/* Analiz Sonuçları */}
          {analysisResults && (
            <div style={{padding: '24px', borderBottom: '1px solid #2A3441', backgroundColor: 'transparent'}}>
              <div style={{
                fontSize: '11px', 
                fontWeight: '600', 
                color: '#8B95A7', 
                marginBottom: '16px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em'
              }}>
                Analysis Results
              </div>
              
              <div style={{
                backgroundColor: '#1E2532',
                borderRadius: '10px',
                border: '1px solid #2A3441',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {/* Pneumothorax Ratio */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#8B95A7',
                      fontWeight: '500'
                    }}>
                      Pneumothorax
                    </span>
                    <span style={{
                      fontSize: '16px',
                      color: '#FF6B6B',
                      fontWeight: '700',
                      letterSpacing: '-0.02em'
                    }}>
                      {analysisResults.pnx_ratio_percent?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#2A3441',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(analysisResults.pnx_ratio_percent || 0, 100)}%`,
                      height: '100%',
                      backgroundColor: '#FF6B6B',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>

                {/* Lung Ratio */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#8B95A7',
                      fontWeight: '500'
                    }}>
                      Lung
                    </span>
                    <span style={{
                      fontSize: '16px',
                      color: '#51CF66',
                      fontWeight: '700',
                      letterSpacing: '-0.02em'
                    }}>
                      {analysisResults.lung_ratio_percent?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#2A3441',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(analysisResults.lung_ratio_percent || 0, 100)}%`,
                      height: '100%',
                      backgroundColor: '#51CF66',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>

                {/* Pneumothorax vs Lung Ratio */}
                {analysisResults.pnx_ratio_vs_lung_percent !== undefined && (
                  <div style={{
                    paddingTop: '14px',
                    borderTop: '1px solid #2A3441'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#8B95A7',
                        fontWeight: '500'
                      }}>
                        PnX / Lung Ratio
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: '#FFD93D',
                        fontWeight: '600',
                        letterSpacing: '-0.01em'
                      }}>
                        {analysisResults.pnx_ratio_vs_lung_percent?.toFixed(2) || '0.00'}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Dice Scores */}
                <div style={{
                  paddingTop: '14px',
                  borderTop: '1px solid #2A3441',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{flex: 1}}>
                    <div style={{
                      fontSize: '10px',
                      color: '#5A6578',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Dice Lung
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#B8C5D6',
                      fontWeight: '600'
                    }}>
                      {analysisResults.dice_lung?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{
                      fontSize: '10px',
                      color: '#5A6578',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Dice PnX
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#B8C5D6',
                      fontWeight: '600'
                    }}>
                      {analysisResults.dice_pnx?.toFixed(3) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Zoom Kontrolleri */}
          <div style={{padding: '24px', borderBottom: '1px solid #2A3441', backgroundColor: 'transparent'}}>
            <div style={{
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#8B95A7', 
              marginBottom: '14px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em'
            }}>
              Zoom Controls
            </div>
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              disabled={!image}
            />
          </div>

          {/* Analiz Durumu */}
          {isAnalyzing && (
            <div style={{padding: '24px', borderBottom: '1px solid #2A3441', backgroundColor: 'transparent'}}>
              <div style={{
                backgroundColor: '#1E2532',
                borderRadius: '8px',
                padding: '14px',
                border: '1px solid #3A4454',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #4A90E2',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{fontSize: '13px', color: '#B8C5D6', fontWeight: '500', letterSpacing: '-0.01em'}}>
                  Analyzing image...
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Canvas Area */}
        <div style={{flex: 1, backgroundColor: '#000000', position: 'relative', overflow: 'hidden', width: 'calc(100vw - 280px)', minWidth: '400px'}}>
          {/* Canvas Info Bar */}
          {image && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: '#1A1F2E',
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid #2A3441',
              zIndex: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minWidth: '180px'
            }}>
              <div>
                <div style={{fontSize: '12px', color: '#B8C5D6', fontWeight: '500', letterSpacing: '-0.01em', marginBottom: '6px'}}>
                  Dimensions
                </div>
                <div style={{fontSize: '13px', color: '#FFFFFF', fontWeight: '600', letterSpacing: '-0.01em'}}>
                  {image.naturalWidth} × {image.naturalHeight} px
                </div>
                <div style={{fontSize: '12px', color: '#8B95A7', marginTop: '8px', fontWeight: '400', letterSpacing: '-0.01em'}}>
                  Zoom: {Math.round(zoomLevel * 100)}%
                </div>
              </div>
              <button
                onClick={handleClearImage}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#DC3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#C82333';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#DC3545';
                  e.target.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
                }}
              >
                Clear Image
              </button>
            </div>
          )}

          {/* Canvas */}
          <div 
            className="canvas-container"
            style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', backgroundColor: '#000000', overflow: 'hidden'}}
          >
            {image ? (
              <XrayCanvas
                image={image}
                zoomLevel={zoomLevel}
                selectedTool="pan"
              />
            ) : originalImageFile ? (
              /* DICOM dosyası yüklendi - Analiz bekleniyor */
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  padding: '60px'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#1A1F2E',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  marginBottom: '32px',
                  border: '1px solid #2A3441'
                }}>📄</div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  margin: '0 0 12px 0',
                  letterSpacing: '-0.02em'
                }}>
                  DICOM File Loaded
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#8B95A7',
                  margin: '0 0 32px 0',
                  textAlign: 'center',
                  maxWidth: '400px',
                  fontFamily: "'SF Mono', 'Monaco', monospace"
                }}>
                  {originalImageFile.name}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#5A6578',
                  textAlign: 'center',
                  maxWidth: '400px'
                }}>
                  Click "Analyze" in the sidebar to process
                </p>
              </div>
            ) : (
              /* Görsel Yükleme Alanı */
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: `2px dashed ${isDragging ? '#4A90E2' : '#2A3441'}`,
                  borderRadius: '12px',
                  margin: '40px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => document.getElementById('image-upload-input')?.click()}
              >
                <input
                  id="image-upload-input"
                  type="file"
                  accept="image/*,.dcm,.dicom,.dcom,application/dicom,image/x-dcm,*/*"
                  style={{display: 'none'}}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                    e.target.value = '';
                  }}
                />
                
                <div style={{
                  width: '72px',
                  height: '72px',
                  backgroundColor: isDragging ? '#1E2A3E' : '#1A1F2E',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  marginBottom: '28px',
                  border: `1px solid ${isDragging ? '#4A90E2' : '#2A3441'}`,
                  transition: 'all 0.3s ease'
                }}>
                  📤
                </div>
                
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.02em'
                }}>
                  {isDragging ? 'Drop file here' : 'Upload Image'}
                </h3>
                
                <p style={{
                  fontSize: '14px',
                  color: '#8B95A7',
                  margin: '0 0 28px 0',
                  textAlign: 'center',
                  maxWidth: '400px'
                }}>
                  {isDragging 
                    ? 'Release to upload' 
                    : 'Drag and drop or click to select'}
                </p>
                
                <button
                  style={{
                    padding: '12px 28px',
                    backgroundColor: '#4A90E2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '-0.01em',
                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3A7FD2';
                    e.target.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4A90E2';
                    e.target.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('image-upload-input')?.click();
                  }}
                >
                  Select File
                </button>
                
                <p style={{
                  fontSize: '11px',
                  color: '#5A6578',
                  marginTop: '24px',
                  textAlign: 'center',
                  fontFamily: "'SF Mono', 'Monaco', monospace"
                }}>
                  JPG, PNG, GIF, BMP, TIFF, DICOM (.dcm, .dicom, .dcom)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        button:active {
          transform: translateY(0);
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1A1F2E;
          border-left: 1px solid #2A3441;
        }
        ::-webkit-scrollbar-thumb {
          background: #3A4454;
          border: 1px solid #2A3441;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4A5568;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Canvas cursor stilleri */
        .canvas-container {
          cursor: default;
        }
      `}</style>
      

    </div>
  );
}

export default App;
import React, { useState, useCallback, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import XrayCanvas from './components/XrayCanvas';
import ColorModal from './components/ColorModal';
import ZoomControls from './components/ZoomControls';
import CursorIndicator from './components/CursorIndicator';
import { getMockDetections, DEFAULT_PAINTING_CONFIG } from './utils/mockData';
import { calculateZoomScale } from './utils/canvasHelpers';
import { getSliceImage, getVolume, testApiConnection } from './services/flaskApi';

/**
 * Ana uygulama bileşeni - Profesyonel X-ray Analiz Arayüzü
 */
function App() {
  // State yönetimi
  const [image, setImage] = useState(null);
  const [detectedRegions, setDetectedRegions] = useState([]);
  const [userRegions, setUserRegions] = useState([]);
  const [paintingConfig, setPaintingConfig] = useState(DEFAULT_PAINTING_CONFIG);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTool, setSelectedTool] = useState('pan'); // rect, circle, pen, eraser, pan
  const [canvasCursor, setCanvasCursor] = useState('default');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showCursorIndicator, setShowCursorIndicator] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  
  // Backend API state'leri
  const [apiConnected, setApiConnected] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [volumeData, setVolumeData] = useState(null);
  const [isLoadingSlice, setIsLoadingSlice] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [userDrawnArea, setUserDrawnArea] = useState(null); // Doktorun çizdiği alan (pixel)

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

  const handleImageUpload = useCallback((imageData) => {
    setImage(null);
    setDetectedRegions([]);
    setUserRegions([]);
    setZoomLevel(1);
    setVolumeData(null);
    setUserDrawnArea(null);
    
    // Eğer backend'den yüklenecekse
    if (apiConnected) {
      // İlk dilimi yükle
      setCurrentSlice(0);
      loadSliceFromBackend(0);
      loadVolumeData(1);
    } else {
      // Normal görsel yükleme
      const img = new Image();
      img.onload = () => {
        setImage(img);
        simulateAnalysis();
      };
      img.src = imageData.url;
    }
  }, [apiConnected, loadSliceFromBackend, loadVolumeData]);

  const handleImageClear = useCallback(() => {
    // Blob URL'yi temizle
    if (image && image.src && image.src.startsWith('blob:')) {
      URL.revokeObjectURL(image.src);
    }
    
    setImage(null);
    setDetectedRegions([]);
    setUserRegions([]);
    setZoomLevel(1);
    setIsAnalyzing(false);
    setVolumeData(null);
    setUserDrawnArea(null);
    setCurrentSlice(0);
  }, [image]);
  
  // Dilim navigasyonu
  const handleSliceChange = useCallback((newSlice) => {
    if (newSlice < 0 || (totalSlices > 0 && newSlice >= totalSlices)) return;
    setCurrentSlice(newSlice);
    loadSliceFromBackend(newSlice);
  }, [totalSlices, loadSliceFromBackend]);
  
  // Doktorun çizdiği bölgenin alanını hesapla (pixel cinsinden)
  const calculateUserDrawnArea = useCallback(() => {
    if (userRegions.length === 0) {
      setUserDrawnArea(null);
      return;
    }
    
    let totalArea = 0;
    
    userRegions.forEach(region => {
      if (region.type === 'rect') {
        // Dikdörtgen alanı: width * height
        totalArea += (region.width || 0) * (region.height || 0);
      } else if (region.type === 'circle') {
        // Daire alanı: π * r²
        const radius = (region.width || region.height || 0) / 2;
        totalArea += Math.PI * radius * radius;
      } else if (region.type === 'line' && region.points) {
        // Çizgi için basit bir yaklaşım (piksel sayısı)
        // Gerçek implementasyon için daha karmaşık hesaplama gerekebilir
        const points = region.points;
        if (points.length >= 2) {
          // Çizginin kapsadığı yaklaşık alan
          let lineArea = 0;
          for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            // Çizgi kalınlığı varsa
            const strokeWidth = region.strokeWidth || 2;
            lineArea += length * strokeWidth;
          }
          totalArea += lineArea;
        }
      }
    });
    
    setUserDrawnArea(Math.round(totalArea));
  }, [userRegions]);
  
  // User regions değiştiğinde alanı hesapla
  useEffect(() => {
    calculateUserDrawnArea();
  }, [userRegions, calculateUserDrawnArea]);

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

  const simulateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockDetections = getMockDetections();
      setDetectedRegions(mockDetections);
    } catch (error) {
      console.error('Analiz hatası:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUserRegionAdd = useCallback((newRegion) => {
    setUserRegions(prev => [...prev, newRegion]);
  }, []);

  const handleUserRegionUpdate = useCallback((updatedRegion) => {
    setUserRegions(prev => 
      prev.map(region => 
        region.id === updatedRegion.id ? { ...region, ...updatedRegion } : region
      )
    );
  }, []);

  const handleUserRegionDelete = useCallback((regionId) => {
    setUserRegions(prev => prev.filter(region => region.id !== regionId));
  }, []);

  const handleColorChange = useCallback((color) => {
    setPaintingConfig(prev => ({ ...prev, fillColor: color }));
  }, []);

  const handleOpacityChange = useCallback((opacity) => {
    setPaintingConfig(prev => ({ ...prev, opacity }));
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

  const handleCursorChange = useCallback((cursorState) => {
    setCanvasCursor(cursorState);
  }, []);

  const handleMouseMove = useCallback((e) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
    setShowCursorIndicator(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowCursorIndicator(false);
  }, []);

  const handleColorModalOpen = useCallback(() => {
    setIsColorModalOpen(true);
  }, []);

  const handleColorModalClose = useCallback(() => {
    setIsColorModalOpen(false);
  }, []);

  return (
    <div 
      style={{minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif'}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Modern Header */}
      <header style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{padding: '0 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
              }}>
                <span style={{color: 'white', fontWeight: 'bold', fontSize: '18px'}}>X</span>
              </div>
      <div>
                <h1 style={{fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: 0}}>
                  X-ray Görsel Analiz
                </h1>
                <p style={{fontSize: '12px', color: '#94a3b8', margin: 0}}>AI Destekli Medikal Görüntü İşleme</p>
              </div>
            </div>
            <div style={{display: 'flex', gap: '12px'}}>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                💾 Kaydet
              </button>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                transition: 'all 0.2s'
              }}>
                📤 Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{display: 'flex', height: 'calc(100vh - 60px)', width: '100vw'}}>
        {/* Sol Sidebar - Kompakt Tasarım */}
        <div style={{
          width: '280px',
          minWidth: '280px',
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto'
        }}>
          {/* Kompakt Görsel Yükleme */}
          <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <label htmlFor="file-upload" style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: image ? '#10b981' : '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: image ? 'default' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                {image ? '✓' : '📁'} {image ? 'Yüklendi' : 'Yükle'}
              </label>
              {image && (
                <button
                  onClick={handleImageClear}
                  style={{
                    padding: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Temizle"
                >
                  🗑️
                </button>
              )}
            </div>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              style={{display: 'none'}}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    handleImageUpload({ file, url: ev.target.result, name: file.name, size: file.size, type: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>

          {/* Kompakt Çizim Araçları */}
          <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
            <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              🎨 Araçlar
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '4px'}}>
              {[
                { id: 'rect', icon: '▭', label: 'Rect', cursor: 'crosshair', cursorIcon: '┼' },
                { id: 'circle', icon: '○', label: 'Circle', cursor: 'crosshair', cursorIcon: '⊙' },
                { id: 'pen', icon: '✏️', label: 'Pen', cursor: 'crosshair', cursorIcon: '✎' },
                { id: 'eraser', icon: '🧹', label: 'Erase', cursor: 'crosshair', cursorIcon: '✕' },
                { id: 'pan', icon: '✋', label: 'Pan', cursor: 'grab', cursorIcon: '✋' }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  style={{
                    padding: '6px',
                    backgroundColor: selectedTool === tool.id ? '#3b82f6' : '#374151',
                    color: selectedTool === tool.id ? 'white' : '#94a3b8',
                    border: selectedTool === tool.id ? '2px solid #60a5fa' : '1px solid #4b5563',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: selectedTool === tool.id ? '600' : '400',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    position: 'relative',
                    minHeight: '40px',
                    cursor: tool.cursor
                  }}
                  title={`${tool.label} - ${tool.cursor === 'crosshair' ? 'Çizim aracı' : tool.cursor === 'grab' ? 'Kaydırma aracı' : 'Silgi aracı'} (${tool.cursor})`}
                >
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                    <span style={{fontSize: '14px'}}>{tool.icon}</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
                      <span style={{fontSize: '8px'}}>{tool.label}</span>
                      <span style={{
                        fontSize: '7px', 
                        color: selectedTool === tool.id ? '#60a5fa' : '#64748b',
                        fontWeight: 'bold',
                        opacity: 0.8
                      }}>{tool.cursorIcon}</span>
                    </div>
                  </div>
                  {selectedTool === tool.id && (
                    <div style={{
                      position: 'absolute',
                      top: '1px',
                      right: '1px',
                      width: '4px',
                      height: '4px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      border: '1px solid white'
                    }}></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Kompakt Renk Seçimi */}
          <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
            <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              🎨 Renk
            </div>
            <button
              onClick={handleColorModalOpen}
              disabled={!image}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#374151',
                color: '#cbd5e1',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: image ? 'pointer' : 'not-allowed',
                opacity: image ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (image) {
                  e.target.style.backgroundColor = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (image) {
                  e.target.style.backgroundColor = '#374151';
                }
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    backgroundColor: paintingConfig.fillColor,
                    opacity: paintingConfig.opacity,
                    border: '1px solid #64748b'
                  }}
                ></div>
                <span>{paintingConfig.fillColor.toUpperCase()}</span>
              </div>
              <span style={{fontSize: '10px', color: '#94a3b8'}}>
                {Math.round(paintingConfig.opacity * 100)}%
              </span>
            </button>
          </div>

          {/* API Bağlantı Durumu */}
          <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
            <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              🔌 Backend API
            </div>
            <div style={{
              backgroundColor: apiConnected ? '#166534' : '#7f1d1d',
              borderRadius: '4px',
              padding: '8px',
              border: `1px solid ${apiConnected ? '#22c55e' : '#ef4444'}`
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: apiError ? '4px' : '0'}}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: apiConnected ? '#22c55e' : '#ef4444',
                  boxShadow: apiConnected ? '0 0 8px #22c55e' : 'none'
                }}></div>
                <span style={{fontSize: '10px', color: apiConnected ? '#bbf7d0' : '#fca5a5', fontWeight: '500'}}>
                  {apiConnected ? 'Bağlı' : 'Bağlantı Yok'}
                </span>
              </div>
              {apiError && (
                <div style={{fontSize: '9px', color: '#fca5a5', marginTop: '4px'}}>
                  {apiError}
                </div>
              )}
            </div>
            {apiConnected && (
              <>
                <button
                  onClick={() => {
                    setCurrentSlice(0);
                    loadSliceFromBackend(0);
                    loadVolumeData(1);
                  }}
                  disabled={isLoadingSlice}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: isLoadingSlice ? '#475569' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: isLoadingSlice ? 'not-allowed' : 'pointer',
                    opacity: isLoadingSlice ? 0.6 : 1
                  }}
                >
                  📥 Backend'den Yükle
                </button>
                {isLoadingSlice && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#1e40af',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #60a5fa',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{fontSize: '10px', color: '#bfdbfe'}}>
                      Dilim görüntüsü yükleniyor...
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Backend Alan/Hacim Bilgisi */}
          {apiConnected && volumeData && (
            <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
              <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                📊 Segmentasyon Alanı
              </div>
              <div style={{
                backgroundColor: '#1e40af',
                borderRadius: '4px',
                padding: '8px',
                border: '1px solid #3b82f6'
              }}>
                <div style={{fontSize: '10px', color: '#bfdbfe', marginBottom: '4px'}}>
                  Etiket ID: {volumeData.label_id}
                </div>
                <div style={{fontSize: '10px', color: '#bfdbfe', marginBottom: '4px'}}>
                  Voksel Sayısı: {volumeData.voxel_count.toLocaleString()}
                </div>
                <div style={{fontSize: '10px', color: '#bfdbfe', marginBottom: '4px'}}>
                  <strong>Alan (px²): {volumeData.voxel_count.toLocaleString()}</strong>
                </div>
                <div style={{fontSize: '9px', color: '#93c5fd', marginTop: '4px'}}>
                  Hacim: {volumeData.total_volume_mm3.toFixed(2)} mm³
                </div>
              </div>
            </div>
          )}

          {/* Doktorun Çizdiği Alan */}
          {userDrawnArea !== null && userDrawnArea > 0 && (
            <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
              <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                ✏️ Çizilen Alan
              </div>
              <div style={{
                backgroundColor: '#7c2d12',
                borderRadius: '4px',
                padding: '8px',
                border: '1px solid #f97316'
              }}>
                <div style={{fontSize: '12px', color: '#fed7aa', fontWeight: '600'}}>
                  {userDrawnArea.toLocaleString()} px²
                </div>
                <div style={{fontSize: '9px', color: '#fdba74', marginTop: '4px'}}>
                  {userRegions.length} bölge
                </div>
              </div>
            </div>
          )}

          {/* Kompakt Zoom Kontrolleri */}
          <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
            <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              🔍 Zoom
            </div>
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              disabled={!image}
            />
          </div>

          {/* Kompakt Analiz Durumu */}
          {isAnalyzing && (
            <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
              <div style={{
                backgroundColor: '#1e40af',
                borderRadius: '4px',
                padding: '8px',
                border: '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #60a5fa',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{fontSize: '10px', color: '#bfdbfe', fontWeight: '500'}}>
                  AI Analiz ediyor...
                </span>
              </div>
            </div>
          )}

          {/* Kompakt Tespit Sonuçları */}
          {detectedRegions.length > 0 && (
            <div style={{padding: '12px', borderBottom: '1px solid #334155'}}>
              <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                📊 Tespitler
              </div>
              <div style={{
                backgroundColor: '#166534',
                borderRadius: '4px',
                padding: '8px',
                border: '1px solid #22c55e'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                  <span style={{fontSize: '10px', color: '#bbf7d0', fontWeight: '500'}}>
                    {detectedRegions.length} bölge
                  </span>
                  <span style={{fontSize: '9px', color: '#86efac'}}>
                    %{Math.round(detectedRegions.reduce((acc, r) => acc + r.confidence, 0) / detectedRegions.length * 100)}
                  </span>
                </div>
                <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                  {detectedRegions.slice(0, 4).map((region, index) => (
                    <div key={region.id} style={{
                      backgroundColor: '#14532d',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      color: '#86efac'
                    }}>
                      #{index + 1}
                    </div>
                  ))}
                  {detectedRegions.length > 4 && (
                    <div style={{
                      backgroundColor: '#14532d',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      color: '#86efac'
                    }}>
                      +{detectedRegions.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kompakt Manuel Bölgeler */}
          {userRegions.length > 0 && (
            <div style={{padding: '12px'}}>
              <div style={{fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                ✏️ Manuel
              </div>
              <div style={{
                backgroundColor: '#374151',
                borderRadius: '4px',
                padding: '8px',
                border: '1px solid #4b5563'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                  <span style={{fontSize: '10px', color: '#cbd5e1'}}>
                    {userRegions.length} bölge
                  </span>
                  <button
                    onClick={() => setUserRegions([])}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                    title="Tümünü Temizle"
                  >
                    🗑️
                  </button>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto'}}>
                  {userRegions.map((region, index) => (
                    <div key={region.id} style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '3px',
                      padding: '4px 6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '9px'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '1px',
                            backgroundColor: region.fill || region.stroke || '#3b82f6'
                          }}
                        ></div>
                        <span style={{color: '#cbd5e1'}}>
                          {region.type === 'line' ? 'Line' : region.type === 'circle' ? 'Circle' : 'Rect'} #{index + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUserRegionDelete(region.id)}
                        style={{
                          padding: '2px 4px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          fontSize: '8px',
                          cursor: 'pointer'
                        }}
                        title="Sil"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Alan - Canvas */}
        <div style={{flex: 1, backgroundColor: '#0f172a', position: 'relative', overflow: 'auto', width: 'calc(100vw - 280px)', minWidth: '400px'}}>
          {/* Canvas Info Bar */}
          {image && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: '#1e293b',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div style={{fontSize: '12px', color: '#94a3b8'}}>
                📐 {image.naturalWidth} × {image.naturalHeight} px
              </div>
              <div style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px'}}>
                🔍 Zoom: {Math.round(zoomLevel * 100)}%
              </div>
            </div>
          )}

          {/* Canvas */}
          <div 
            className={`canvas-container cursor-${canvasCursor}`}
            style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}
          >
            <XrayCanvas
              image={image}
              detectedRegions={detectedRegions}
              userRegions={userRegions}
              onUserRegionAdd={handleUserRegionAdd}
              onUserRegionUpdate={handleUserRegionUpdate}
              onUserRegionDelete={handleUserRegionDelete}
              paintingConfig={paintingConfig}
              zoomLevel={zoomLevel}
              onZoomChange={handleZoomChange}
              selectedTool={selectedTool}
              onCursorChange={handleCursorChange}
            />
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
          background: #1e293b;
        }
        ::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        
        /* Çizim araçları butonları için özel cursor'lar */
        .drawing-tool-button {
          cursor: pointer !important;
        }
        .drawing-tool-button:hover {
          cursor: pointer !important;
        }
        
        /* Canvas cursor stilleri */
        .canvas-container {
          cursor: default;
        }
        .canvas-container.cursor-crosshair {
          cursor: crosshair !important;
        }
        .canvas-container.cursor-grab {
          cursor: grab !important;
        }
        .canvas-container.cursor-grabbing {
          cursor: grabbing !important;
        }
        .canvas-container.cursor-move {
          cursor: move !important;
        }
      `}</style>
      
      {/* Cursor Indicator */}
      <CursorIndicator
        cursorState={canvasCursor}
        selectedTool={selectedTool}
        position={mousePosition}
        visible={showCursorIndicator && image}
      />
      
      {/* Color Modal */}
      <ColorModal
        isOpen={isColorModalOpen}
        onClose={handleColorModalClose}
        selectedColor={paintingConfig.fillColor}
        opacity={paintingConfig.opacity}
        onColorChange={handleColorChange}
        onOpacityChange={handleOpacityChange}
      />
    </div>
  );
}

export default App;
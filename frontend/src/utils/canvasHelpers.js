/**
 * Konva canvas işlemleri için yardımcı fonksiyonlar
 */

/**
 * Canvas boyutlarını hesapla
 * @param {number} containerWidth - Container genişliği
 * @param {number} containerHeight - Container yüksekliği
 * @param {number} imageWidth - Görsel genişliği
 * @param {number} imageHeight - Görsel yüksekliği
 * @returns {Object} {width, height, scale}
 */
export const calculateCanvasSize = (containerWidth, containerHeight, imageWidth, imageHeight) => {
  // Minimum boyutları garanti et
  const minWidth = 400;
  const minHeight = 300;
  
  const safeContainerWidth = Math.max(containerWidth, minWidth);
  const safeContainerHeight = Math.max(containerHeight, minHeight);
  
  const containerAspect = safeContainerWidth / safeContainerHeight;
  const imageAspect = imageWidth / imageHeight;
  
  let width, height, scale;
  
  if (imageAspect > containerAspect) {
    // Görsel daha geniş
    width = safeContainerWidth;
    height = safeContainerWidth / imageAspect;
    scale = safeContainerWidth / imageWidth;
  } else {
    // Görsel daha yüksek
    height = safeContainerHeight;
    width = safeContainerHeight * imageAspect;
    scale = safeContainerHeight / imageHeight;
  }
  
  // Minimum boyutları garanti et
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);
  
  return { width, height, scale };
};

/**
 * Görüntünün başlangıçtaki transform değerlerini hesapla
 * @param {number} containerWidth - Container genişliği
 * @param {number} containerHeight - Container yüksekliği
 * @param {number} imageWidth - Görsel genişliği
 * @param {number} imageHeight - Görsel yüksekliği
 * @returns {Object} {scale, x, y}
 */
export const calculateInitialImageTransform = (containerWidth, containerHeight, imageWidth, imageHeight) => {
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;
  
  let scale, x, y;
  
  if (imageAspect > containerAspect) {
    // Görsel daha geniş - container genişliğine sığdır
    scale = containerWidth / imageWidth;
    x = 0;
    y = (containerHeight - imageHeight * scale) / 2;
  } else {
    // Görsel daha yüksek - container yüksekliğine sığdır
    scale = containerHeight / imageHeight;
    x = (containerWidth - imageWidth * scale) / 2;
    y = 0;
  }
  
  return { scale, x, y };
};

/**
 * Zoom seviyesine göre yeni scale hesapla
 * @param {number} currentScale - Mevcut scale
 * @param {number} zoomFactor - Zoom faktörü (1.2 = %20 artış)
 * @param {number} minScale - Minimum scale
 * @param {number} maxScale - Maksimum scale
 * @returns {number} Yeni scale
 */
export const calculateZoomScale = (currentScale, zoomFactor, minScale = 0.1, maxScale = 5) => {
  const newScale = currentScale * zoomFactor;
  return Math.max(minScale, Math.min(maxScale, newScale));
};

/**
 * Mouse pozisyonunu canvas koordinatlarına çevir
 * @param {Object} stage - Konva Stage referansı
 * @param {number} x - Mouse X pozisyonu
 * @param {number} y - Mouse Y pozisyonu
 * @returns {Object} {x, y} canvas koordinatları
 */
export const getRelativePointerPosition = (stage, x, y) => {
  const rect = stage.container().getBoundingClientRect();
  return {
    x: (x - rect.left) / stage.scaleX() - stage.x() / stage.scaleX(),
    y: (y - rect.top) / stage.scaleY() - stage.y() / stage.scaleY()
  };
};

/**
 * Dikdörtgen alanı oluştur
 * @param {number} x - X koordinatı
 * @param {number} y - Y koordinatı
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 * @param {Object} config - Boyama konfigürasyonu
 * @returns {Object} Konva Rect konfigürasyonu
 */
export const createRectConfig = (x, y, width, height, config) => ({
  x,
  y,
  width,
  height,
  fill: config.fillColor,
  stroke: config.strokeColor,
  strokeWidth: config.strokeWidth,
  opacity: config.opacity,
  draggable: true,
  listening: true
});

/**
 * Benzersiz ID oluştur
 * @returns {string} Benzersiz ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Görsel boyutlarını al
 * @param {string} imageUrl - Görsel URL'si
 * @returns {Promise<Object>} {width, height}
 */
export const getImageDimensions = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

/**
 * Canvas'ı temizle
 * @param {Object} layer - Konva Layer referansı
 */
export const clearCanvas = (layer) => {
  layer.destroyChildren();
  layer.draw();
};

/**
 * Seçili alanı vurgula
 * @param {Object} shape - Konva Shape referansı
 * @param {boolean} selected - Seçili mi?
 */
export const highlightSelected = (shape, selected) => {
  if (selected) {
    shape.stroke('#3b82f6');
    shape.strokeWidth(3);
  } else {
    shape.stroke('#ffffff');
    shape.strokeWidth(2);
  }
  shape.getLayer().draw();
};

/**
 * Mouse koordinatlarını canvas koordinatlarına dönüştür
 * @param {Object} stage - Konva Stage referansı
 * @param {number} mouseX - Mouse X koordinatı
 * @param {number} mouseY - Mouse Y koordinatı
 * @returns {Object} {x, y} canvas koordinatları
 */
export const mouseToCanvasCoords = (stage, mouseX, mouseY) => {
  const scaleX = stage.scaleX();
  const scaleY = stage.scaleY();
  const stageX = stage.x();
  const stageY = stage.y();
  
  return {
    x: (mouseX - stageX) / scaleX,
    y: (mouseY - stageY) / scaleY
  };
};

/**
 * Canvas koordinatlarını mouse koordinatlarına dönüştür
 * @param {Object} stage - Konva Stage referansı
 * @param {number} canvasX - Canvas X koordinatı
 * @param {number} canvasY - Canvas Y koordinatı
 * @returns {Object} {x, y} mouse koordinatları
 */
export const canvasToMouseCoords = (stage, canvasX, canvasY) => {
  const scaleX = stage.scaleX();
  const scaleY = stage.scaleY();
  const stageX = stage.x();
  const stageY = stage.y();
  
  return {
    x: canvasX * scaleX + stageX,
    y: canvasY * scaleY + stageY
  };
};

/**
 * Koordinat dönüşüm doğruluğunu test et
 * @param {Object} stage - Konva Stage referansı
 * @param {Object} originalCoords - Orijinal koordinatlar
 * @returns {Object} Test sonucu
 */
export const testCoordinateTransformation = (stage, originalCoords) => {
  const mouseCoords = canvasToMouseCoords(stage, originalCoords.x, originalCoords.y);
  const backToCanvas = mouseToCanvasCoords(stage, mouseCoords.x, mouseCoords.y);
  
  const error = {
    x: Math.abs(originalCoords.x - backToCanvas.x),
    y: Math.abs(originalCoords.y - backToCanvas.y)
  };
  
  return {
    original: originalCoords,
    mouse: mouseCoords,
    backToCanvas,
    error,
    isAccurate: error.x < 0.1 && error.y < 0.1
  };
};
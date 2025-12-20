/**
 * Mock API verisi - X-ray görselinde tespit edilen hastalıklı bölgeler
 * Gerçek API entegrasyonunda bu dosya değiştirilecek
 */

export const getMockDetections = () => [
  {
    id: 1,
    x: 120,
    y: 180,
    width: 90,
    height: 75,
    confidence: 0.87,
    type: 'nodule',
    color: '#ef4444' // kırmızı
  },
  {
    id: 2,
    x: 340,
    y: 220,
    width: 110,
    height: 95,
    confidence: 0.92,
    type: 'mass',
    color: '#ef4444' // kırmızı
  },
  {
    id: 3,
    x: 200,
    y: 320,
    width: 65,
    height: 55,
    confidence: 0.78,
    type: 'opacity',
    color: '#ef4444' // kırmızı
  }
];

/**
 * Renk paleti - boyama için kullanılacak renkler
 */
export const COLOR_PALETTE = [
  { name: 'Kırmızı', value: '#ef4444', hex: '#ef4444' },
  { name: 'Sarı', value: '#f59e0b', hex: '#f59e0b' },
  { name: 'Mavi', value: '#3b82f6', hex: '#3b82f6' },
  { name: 'Yeşil', value: '#10b981', hex: '#10b981' },
  { name: 'Mor', value: '#8b5cf6', hex: '#8b5cf6' },
  { name: 'Turuncu', value: '#f97316', hex: '#f97316' }
];

/**
 * Varsayılan boyama ayarları
 */
export const DEFAULT_PAINTING_CONFIG = {
  opacity: 0.4,
  strokeWidth: 2,
  strokeColor: '#ffffff',
  fillColor: '#ef4444'
};

/**
 * Simüle edilmiş API çağrısı
 * @param {string} imageUrl - Yüklenen görselin URL'si
 * @returns {Promise<Array>} Tespit edilen bölgeler
 */
export const simulateApiCall = async (imageUrl) => {
  // Gerçek API çağrısını simüle etmek için 2 saniye bekle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Rastgele 1-4 arası tespit döndür
  const detections = getMockDetections();
  const randomCount = Math.floor(Math.random() * 3) + 1;
  
  return detections.slice(0, randomCount);
};

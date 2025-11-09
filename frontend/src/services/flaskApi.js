/**
 * Flask Backend API Servis Dosyası
 * Backend endpoint'lerine istek atma fonksiyonları
 */

const API_BASE_URL = 'http://localhost:5000';

/**
 * 1. 2D Dilim Görüntüsü Alma (PNG)
 * @param {number} sliceIndex - Z eksenindeki dilim indeksi (0'dan başlar)
 * @returns {Promise<string>} PNG görüntüsünün URL'si (blob URL)
 */
export const getSliceImage = async (sliceIndex) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slice/${sliceIndex}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    // PNG görüntüsünü blob olarak al
    const blob = await response.blob();
    
    // Blob'u URL'ye çevir (React'te kullanmak için)
    const imageUrl = URL.createObjectURL(blob);
    
    return imageUrl;
  } catch (error) {
    console.error('Dilim görüntüsü alınırken hata:', error);
    throw error;
  }
};

/**
 * 2. Hacim Hesaplama
 * @param {number} labelId - Etiket ID'si (voksel değeri)
 * @returns {Promise<Object>} Hacim bilgileri
 * 
 * Örnek yanıt:
 * {
 *   "label_id": 1,
 *   "voxel_count": 1500,
 *   "voxel_volume_mm3": 1.0,
 *   "total_volume_mm3": 1500.0
 * }
 */
export const getVolume = async (labelId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/volume/${labelId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Hacim hesaplanırken hata:', error);
    throw error;
  }
};

/**
 * API bağlantı testi
 * @returns {Promise<boolean>} API erişilebilir mi?
 */
export const testApiConnection = async () => {
  try {
    // Basit bir endpoint testi - slice 0'ı deneyelim
    const response = await fetch(`${API_BASE_URL}/api/slice/0`, {
      method: 'HEAD' // Sadece header'ları al, body'yi alma
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};


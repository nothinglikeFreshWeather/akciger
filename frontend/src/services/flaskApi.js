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
 * 3. X-Ray Analizi
 * @param {File} imageFile - X-Ray görüntü dosyası (DICOM, PNG, JPEG, TIFF vb)
 * @returns {Promise<Object>} Analiz sonuçları
 */
export const analyzeXray = async (imageFile) => {
  try {
    console.log(`📤 Dosya gönderiliyor: ${imageFile.name} (${(imageFile.size / 1024).toFixed(2)} KB)`);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`${API_BASE_URL}/api/analyze-xray`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // overlay_image already contains data URL from backend
    if (data.overlay_image && !data.overlay_image_url) {
      data.overlay_image_url = data.overlay_image;
    }
    
    console.log('✓ Analiz başarılı');
    return data;
  } catch (error) {
    console.error('X-Ray analizi yapılırken hata:', error);
    throw error;
  }
};

/**
 * 4. Model Yükleme (.pth dosyası)
 * @param {File} modelFile - Model dosyası (.pth)
 * @returns {Promise<Object>} Yükleme sonucu
 */
export const loadModel = async (modelFile) => {
  try {
    console.log(`📤 Model dosyası gönderiliyor: ${modelFile.name} (${(modelFile.size / 1024).toFixed(2)} KB)`);
    
    const formData = new FormData();
    formData.append('model', modelFile);
    
    const response = await fetch(`${API_BASE_URL}/api/load-model`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✓ Model başarıyla yüklendi');
    return data;
  } catch (error) {
    console.error('Model yüklenirken hata:', error);
    throw error;
  }
};

/**
 * API bağlantı testi
 * @returns {Promise<boolean>} API erişilebilir mi?
 */
export const testApiConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('API bağlantı hatası:', error);
    return false;
  }
};

/**
 * Mevcut modelleri listele
 * @returns {Promise<Object>} Model listesi ve mevcut model
 */
export const listModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Model listesi alınırken hata:', error);
    throw error;
  }
};

/**
 * Model seç
 * @param {string} modelName - Seçilecek model adı
 * @returns {Promise<Object>} Model yükleme sonucu
 */
export const selectModel = async (modelName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/select-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model_name: modelName })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Model seçilirken hata:', error);
    throw error;
  }
};


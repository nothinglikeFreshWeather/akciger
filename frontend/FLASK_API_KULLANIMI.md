# React'ten Flask API'ye İstek Atma Rehberi

## Backend Endpoint'leri

### 1. 2D Dilim Görüntüsü Alma
```
GET /api/slice/<slice_index>
```
- **Parametre:** `slice_index` (integer) - Z eksenindeki dilim numarası (0'dan başlar)
- **Yanıt:** PNG görüntü dosyası
- **Kullanım:** NII dosyasından belirli bir dilimi görsel olarak almak için

### 2. Hacim Hesaplama
```
GET /api/volume/<label_id>
```
- **Parametre:** `label_id` (integer) - Voksel etiket ID'si
- **Yanıt:** JSON formatında hacim bilgileri
- **Kullanım:** Belirli bir etiket ID'sine sahip vokselerin toplam hacmini hesaplamak için

## React'te Kullanım Örnekleri

### Örnek 1: Dilim Görüntüsü Gösterme

```jsx
import React, { useState, useEffect } from 'react';
import { getSliceImage } from './services/flaskApi';

function SliceViewer() {
  const [imageUrl, setImageUrl] = useState(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSlice = async (index) => {
    setLoading(true);
    setError(null);
    
    try {
      // Eski blob URL'yi temizle (memory leak önlemi)
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      
      const url = await getSliceImage(index);
      setImageUrl(url);
    } catch (err) {
      setError(err.message);
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlice(sliceIndex);
    
    // Cleanup: component unmount olduğunda blob URL'yi temizle
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [sliceIndex]);

  return (
    <div>
      <div>
        <button onClick={() => setSliceIndex(sliceIndex - 1)} disabled={sliceIndex === 0}>
          Önceki
        </button>
        <span>Dilim: {sliceIndex}</span>
        <button onClick={() => setSliceIndex(sliceIndex + 1)}>
          Sonraki
        </button>
      </div>
      
      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{color: 'red'}}>Hata: {error}</p>}
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={`Dilim ${sliceIndex}`}
          style={{maxWidth: '100%'}}
        />
      )}
    </div>
  );
}
```

### Örnek 2: Hacim Bilgisi Gösterme

```jsx
import React, { useState } from 'react';
import { getVolume } from './services/flaskApi';

function VolumeCalculator() {
  const [labelId, setLabelId] = useState(1);
  const [volumeData, setVolumeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateVolume = async () => {
    setLoading(true);
    setError(null);
    setVolumeData(null);

    try {
      const data = await getVolume(labelId);
      setVolumeData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <label>
          Etiket ID:
          <input 
            type="number" 
            value={labelId} 
            onChange={(e) => setLabelId(parseInt(e.target.value))}
            min="0"
          />
        </label>
        <button onClick={calculateVolume} disabled={loading}>
          Hacim Hesapla
        </button>
      </div>

      {loading && <p>Hesaplanıyor...</p>}
      {error && <p style={{color: 'red'}}>Hata: {error}</p>}
      
      {volumeData && (
        <div>
          <h3>Hacim Bilgileri</h3>
          <p>Etiket ID: {volumeData.label_id}</p>
          <p>Voksel Sayısı: {volumeData.voxel_count.toLocaleString()}</p>
          <p>Voksel Hacmi: {volumeData.voxel_volume_mm3.toFixed(4)} mm³</p>
          <p><strong>Toplam Hacim: {volumeData.total_volume_mm3.toFixed(2)} mm³</strong></p>
        </div>
      )}
    </div>
  );
}
```

### Örnek 3: App.jsx'e Entegrasyon

```jsx
import React, { useState, useEffect } from 'react';
import { getSliceImage, getVolume, testApiConnection } from './services/flaskApi';

function App() {
  const [apiConnected, setApiConnected] = useState(false);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [sliceImage, setSliceImage] = useState(null);

  // API bağlantısını kontrol et
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await testApiConnection();
      setApiConnected(connected);
    };
    checkConnection();
  }, []);

  // Dilim görüntüsünü yükle
  useEffect(() => {
    if (apiConnected) {
      const loadImage = async () => {
        try {
          const url = await getSliceImage(currentSlice);
          setSliceImage(url);
        } catch (error) {
          console.error('Görüntü yüklenemedi:', error);
        }
      };
      loadImage();
    }
  }, [currentSlice, apiConnected]);

  return (
    <div>
      <div>
        API Durumu: {apiConnected ? '✅ Bağlı' : '❌ Bağlantı Yok'}
      </div>
      
      {apiConnected && (
        <div>
          <button onClick={() => setCurrentSlice(currentSlice - 1)}>
            Önceki Dilim
          </button>
          <span>Dilim: {currentSlice}</span>
          <button onClick={() => setCurrentSlice(currentSlice + 1)}>
            Sonraki Dilim
          </button>
          
          {sliceImage && (
            <img src={sliceImage} alt={`Dilim ${currentSlice}`} />
          )}
        </div>
      )}
    </div>
  );
}
```

## Önemli Notlar

1. **CORS:** Backend'de CORS aktif olmalı (app.py'de `CORS(app)` var ✅)

2. **Blob URL Temizleme:** `getSliceImage` fonksiyonu blob URL döndürür. Memory leak önlemek için kullanımdan sonra `URL.revokeObjectURL(url)` çağırın.

3. **Hata Yönetimi:** Her API çağrısında try-catch kullanın ve kullanıcıya uygun hata mesajları gösterin.

4. **Loading States:** API çağrıları asenkron olduğu için loading state'leri kullanın.

5. **Port:** Backend varsayılan olarak `http://localhost:5000` portunda çalışıyor. Değiştirmek için `flaskApi.js` dosyasındaki `API_BASE_URL` değerini güncelleyin.

## Test Etme

1. Backend'i başlatın:
```bash
cd akciger/backend
venv\Scripts\activate  # Windows
python app.py
```

2. Frontend'i başlatın:
```bash
cd akciger/frontend
npm run dev
```

3. Browser console'da test edin:
```javascript
// Browser console'da test
fetch('http://localhost:5000/api/slice/0')
  .then(r => r.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    console.log('Görüntü URL:', url);
  });
```


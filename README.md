# Pnömotoraks Segmentasyon Projesi (akciger)

Bu repoda frontend (React + Vite) ve backend (Flask + PyTorch) uygulamaları bulunmaktadır. Proje, göğüs röntgeni (X-ray) görüntülerinde pnömotoraks (pneumothorax) segmentasyonu yapar.

---

## İçindekiler
- `backend/` - Flask API, model yükleme, analiz fonksiyonları
- `frontend/` - React uygulaması (Vite)
- `Eng-401/` - Araştırma / eğitim notebook'ları ve modeller

---

## Hızlı Başlangıç (Windows - PowerShell)

### 1) Backend

1. Sanal ortam oluşturun ve aktif edin (opsiyonel fakat önerilir):

```powershell
cd C:\Users\alper\Projects\eng401\akciger\backend
python -m venv .venv
# PowerShell:
.\.venv\Scripts\Activate.ps1
```

2. Gerekli Python paketlerini yükleyin:

```powershell
pip install -r requirements.txt
```

3. Sunucuyu başlatın:

```powershell
python app.py
```

- Backend varsayılan olarak `http://127.0.0.1:5000` üzerinde çalışır.
- Health endpoint: `GET /api/health`
- Analiz endpoint: `POST /api/analyze-xray` (form-data, alan adı `image`)

Not: Model dosyaları `backend/models/` içinde bulunur. Aktif model dosyası `smp_unet_best.pth` (fallback: `smp_unet_best_v1.pth`). Yeni model atıldıysa backend yeniden başlatılarak yüklenir.

### 2) Frontend

1. Frontend klasörüne gidin ve bağımlılıkları yükleyin:

```powershell
cd C:\Users\alper\Projects\eng401\akciger\frontend
npm install
```

2. Geliştirme sunucusunu başlatın (Vite):

```powershell
npm run dev
```

- Frontend varsayılan olarak `http://localhost:5173`'te açılır.
- Frontend, analiz için `http://localhost:5000/api/analyze-xray` endpoint'ine istek atar. Eğer backend farklı host/portta ise `frontend/src/services/flaskApi.js` içindeki `API_BASE_URL` güncellenmelidir.

---

## Bilinen Problemler ve Çözüm Adımları

1. "Model yüklenemedi" (503):
   - `backend/models/` içinde aktif modelin (örn. `smp_unet_best.pth`) bulunduğundan emin olun.
   - `backend/models/xray_model.py` dosyası yeni model varsa onu; yoksa fallback olarak eski `smp_unet_best_v1.pth` kullanır.
   - Backend'i yeniden başlatın.

2. "Görselin yatay gösterilmesi / akciğerin yataya çizilmesi":
   - Sebep: resize/rotate sıralaması veya mask ile görüntü arasında dönüşüm sırasındaki terslikler.
   - Düzeltme ilkeleri (backend):
     - Gelen görüntü (DICOM/JPG) önce okunur.
     - Eğer görüntü yataysa (width > height) -> 90° döndür (CW) ve `rotated=True` işaretle.
     - Döndürülen (veya orijinal) görüntüyü modelin beklediği boyuta (256x256) resize et ve inference yap.
     - Model çıktısı (256x256 mask) doğrudan overlay için kullanılır — ESKİ mantıkta maske orijinal boyuta geri büyütülüyordu; bu proje için model 256x256 öğrendiğinden overlay ve gösterim de 256x256 olmalıdır.
     - Eğer orijinal görüntü yataydı, overlay'i son adımda tekrar orijinal yönüne döndür.
   - İlgili dosya: `backend/utils/xray_analysis.py`
   - Kontrol: Konsolda `analyze_xray` fonksiyonunun print çıktılarında `Rotasyon`, `Resize`, `Mask shape` mesajları görünmelidir.

3. DICOM desteği:
   - Frontend ve backend her ikisi DICOM ve raster görüntüleri kabul edecek şekilde güncellendi.
   - Frontend `ImageUploader` DICOM dosyaları için binary okuma yapar; backend pydicom ile okur.

---

## Geliştirilmesi Gerekenler (Yapılacaklar)

Aşağıda öncelikli yapılacak işler listelenmiştir (detaylı task listesi `README` altında veya proje yönetiminde takip edilebilir):

- Rotation bug fix: mask/overlay rotasyon ve resize sıralamasını sabitle (öncelik: yüksek).
- Model seçici (v1): Frontend'e `v1` modelini (smp_unet_best_v1.pth) seçebilecek buton ekle. Backend'e model değiştiren endpoint veya runtime model reload desteği ekle.
- UI iyileştirmeleri:
  - Dosya input kontrastı, hata mesajları ve buton stilleri düzeltildi; daha fazla kullanılabilirlik testi yapılmalı.
  - Overlay gösterim boyutu ve zoom kontrolleri.
- Temizlik: demo NIfTI/nii kodlarını (ör. `deneme.nii`) kaldır veya devre dışı bırak.
- Test/CI: Basit smoke testler (`/api/health`, basit `POST /api/analyze-xray`) yaz, CI pipeline öner.
- Logging ve metrik: inference süreleri, hata kayıtları.

---

## Nasıl Model Değiştirilir

- Model dosyasını `backend/models/smp_unet_best.pth` olarak koyun; backend başlangıcında bu dosya tercih edilecektir. Eğer yoksa `smp_unet_best_v1.pth` kullanılır.
- Daha dinamik bir değişiklik istiyorsanız arayüzde "Model Değiştir" butonu eklenmelidir (frontend değişikliği + backend endpoint).

---

## Kod Notları / İpuçları (geliştiriciler için)

- Model yükleme: `backend/models/xray_model.py`
- Analiz mantığı ve preprocessing: `backend/utils/xray_analysis.py`
  - Burada rotate/resize/normalize/inference/overlay adımlarını dikkatle inceleyin.
- Flask app: `backend/app.py` (endpoints: `/api/analyze-xray`, `/api/health`)
- Frontend servis: `frontend/src/services/flaskApi.js` (API client)
- Frontend komponentleri: `frontend/src/components/ImageUploader.jsx`, `XrayAnalyzer.jsx`, `XrayCanvas.jsx`

---

## Çalışma Ortamı ve Bağımlılıklar

- Python 3.10+ (virtualenv önerilir)
- Node.js 16+ (Vite ile uyumlu)
- Backend ihtiyaçları `backend/requirements.txt` içinde listelenmelidir (torch, torchvision, segmentation-models-pytorch, pydicom, opencv-python, flask, flask-cors vb.)
- Frontend: `frontend/package.json` içinde belirtilen paketler (vite, react, tailwind vb.)

Örnek kurulum komutları:

```powershell
# Backend
cd backend
. \.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
npm install
npm run dev
```

---

## İletişim / Notlar

- Hızlı test için backend çalışırken `GET /api/health` ile kontrol edin.
- Model dosyaları büyük olabilir; Git içine büyük dosya koymaktan kaçının (tercihen dış bir depoya veya LFS kullanın).

---

Hazır olduğunuzda, isterseniz ben şu adımları hemen uygulayabilirim:
- `backend` içinde model reload endpoint ekleyip frontend'e basit bir switch butonu eklemek,
- Rotation bug için son kontrolleri yapıp unit test eklemek,
- Küçük UI düzeltmelerini finalize edip size preview göndermek.

Hangi adımı önce istiyorsunuz? (Örn: "Model switch butonunu ekle", "Rotation bug'ı kalıcı şekilde düzelt ve test yaz", "README üzerinde daha fazla detay ekle")

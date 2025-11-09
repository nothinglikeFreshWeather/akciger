import io
import numpy as np
import nibabel as nib
import matplotlib
matplotlib.use('Agg')  # GUI olmadan çalışması için (Flask thread-safe)
import matplotlib.pyplot as plt
from flask import Flask, send_file, jsonify
from flask_cors import CORS

# --- Flask Uygulamasını Başlatma ---
app = Flask(__name__)
# CORS'u etkinleştir (React'in (genellikle 3000 portu) Flask'e (5000 portu)
# erişebilmesi için bu şarttır)
CORS(app)

# --- Veriyi Yükleme (Verimli Yöntem) ---
# API'yi her çağırdığınızda dosyayı diskten okumak çok yavaştır.
# Bunun yerine, uygulama başlarken dosyayı BİR KEZ hafızaya yüklüyoruz.
NII_FILE_PATH = "eng401\deneme.nii" # Buraya kendi dosya adınızı yazın
nii_img = None
nii_data = None
nii_header = None
nii_shape = None
voxel_volume = None

try:
    print(f"'{NII_FILE_PATH}' dosyası yükleniyor...")
    nii_img = nib.load(NII_FILE_PATH)
    nii_data = nii_img.get_fdata()
    nii_header = nii_img.header
    nii_shape = nii_data.shape
    
    # Gerçek hacim hesabı için bir vokselin hacmini hesapla (mm^3)
    voxel_dims = nii_header.get_zooms()
    voxel_volume = np.prod(voxel_dims)
    
    print(f"Dosya başarıyla yüklendi. Boyutlar: {nii_shape}")
    print(f"Bir vokselin hacmi: {voxel_volume:.4f} mm^3")

except FileNotFoundError:
    print(f"HATA: '{NII_FILE_PATH}' dosyası bulunamadı.")
    # Uygulamayı durdurmak yerine hata mesajı verebilirsiniz.
except Exception as e:
    print(f"Dosya yüklenirken bir hata oluştu: {e}")


# --- API ENDPOINT 1: 2D DİLİMİ PNG OLARAK ALMA ---
@app.route("/api/slice/<int:slice_index>")
def get_slice(slice_index):
    """
    NIfTI verisinin belirtilen Z-ekseni dilimini PNG olarak döndürür.
    """
    if nii_data is None:
        return jsonify({"error": "NIfTI dosyası yüklenemedi."}), 500

    # 1. Sınır Kontrolü
    # Shape genellikle (X, Y, Z) şeklindedir
    total_slices = nii_shape[2]
    if not (0 <= slice_index < total_slices):
        return jsonify({"error": f"Dilim indeksi sınır dışında. 0 ile {total_slices - 1} arasında olmalı."}), 400

    # 2. İlgili 2D dilimi NumPy dizisi olarak al
    # Z eksenindeki dilimi alıyoruz (:, :, slice_index)
    slice_2d = nii_data[:, :, slice_index]

    # 3. Matplotlib ile PNG'ye Çevirme (Hafızada)
    buf = io.BytesIO()
    
    # Görüntüyü çiz
    # cmap='gray' tıbbi görüntüler için standarttır
    # Görüntüyü çevirmek gerekirse slice_2d.T kullanabilirsiniz
    plt.figure(figsize=(6, 6)) # Boyutu ayarlayabilirsiniz
    plt.imshow(np.rot90(slice_2d), cmap='gray') # np.rot90() ile döndürmek gerekebilir
    plt.axis('off')  # Eksenleri (çerçeveyi) kapat
    
    # PNG olarak hafızadaki buffer'a kaydet
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
    plt.close() # Figürü hafızadan temizle (memory leak önlemi)
    
    # Buffer'ın başına dön
    buf.seek(0)

    # 4. PNG dosyasını HTTP yanıtı olarak gönder
    return send_file(buf, mimetype='image/png')


# --- API ENDPOINT 2: HACİM HESAPLAMA ---
# --- API ENDPOINT 2: HACİM HESAPLAMA (DÜZELTİLMİŞ VERSİYON) ---
@app.route("/api/volume/<int:label_id>")
def get_volume(label_id):
    """
    Belirtilen etikete (label) ait toplam hacmi hesaplar.
    """
    if nii_data is None:
        return jsonify({"error": "NIfTI dosyası yüklenemedi."}), 500

    # 1. İstenen etikete sahip voksel sayısını bul
    try:
        voxel_count = np.sum(nii_data.astype(int) == label_id)
        
        if voxel_count == 0:
             return jsonify({
                "error": f"{label_id} ID'li etiket veride bulunamadı.",
                "label_id": label_id,
            }), 404

        # 2. Gerçek hacmi hesapla
        total_volume_mm3 = voxel_count * voxel_volume

        # 3. Sonucu JSON olarak döndür
        # --- DÜZELTME BURADA ---
        # NumPy tiplerini (np.int64, np.float32) standart Python
        # tiplerine (int, float) dönüştürüyoruz.
        
        response_data = {
            "label_id": int(label_id),
            "voxel_count": int(voxel_count),
            "voxel_volume_mm3": float(voxel_volume),
            "total_volume_mm3": float(total_volume_mm3)
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({"error": f"Hacim hesaplanırken hata: {e}"}), 500


# --- Uygulamayı Çalıştırma ---
if __name__ == '__main__':
    # 'debug=True' geliştirme aşamasında çok kullanışlıdır
    app.run(debug=True, port=5000)
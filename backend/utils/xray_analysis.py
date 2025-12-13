import cv2
import torch
import numpy as np
import pydicom
from io import BytesIO

def analyze_xray(image_bytes, model, device, img_size=256):
    """
    X-Ray DICOM görüntüsünü analiz eder.
    img_size: Modelin eğitildiği boyut (Kodunda 256 görünüyor)
    """
    
    print("\n" + "="*50)
    print("🔍 analyze_xray fonksiyonu başladı")
    print("="*50)
    
    # --- 1. Görseli oku ---
    image_gray = None 
    try:
        ds = pydicom.dcmread(BytesIO(image_bytes))
        img_array = ds.pixel_array.astype(np.float32)
        mi, ma = img_array.min(), img_array.max()
        if ma != mi:
            image_gray = ((img_array - mi) / (ma - mi) * 255).astype(np.uint8)
        else:
            image_gray = np.zeros_like(img_array, dtype=np.uint8)
        print("✓ DICOM olarak okundu")
    except Exception as e:
        print(f"⚠ DICOM okunamadı: {e}")
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None: raise ValueError("Görsel okunamadı")
            image_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            print("✓ PNG/JPEG olarak okundu")
        except Exception as e_img:
            raise ValueError(f"Format desteklenmiyor: {e_img}")

    if image_gray is None: raise ValueError("Görsel yüklenemedi")
    print(f"📐 Orijinal boyut: {image_gray.shape}")

    # --- 1.5. Rotasyon Kontrolü (Giriş) ---
    # Orijinal boyutları sakla
    orig_h, orig_w = image_gray.shape
    rotated = False
    
    # Eğer görüntü yataysa (Width > Height), dikey yap
    if orig_w > orig_h:
        print(f"🔄 Yatay görüntü tespit edildi ({orig_w}x{orig_h}), döndürülüyor...")
        image_gray = cv2.rotate(image_gray, cv2.ROTATE_90_CLOCKWISE)
        rotated = True
        print(f"✓ Rotasyon tamamlandı. Yeni boyut: {image_gray.shape}")
    else:
        print(f"✓ Zaten dikey görüntü ({orig_h}x{orig_w})")

    # --- 2. Preprocessing (Resize & Normalize) ---
    # Model 256x256 ile eğitildi, o yüzden MUTLAKA 256x256'ye resize et!
    print(f"🔧 Resizing: {image_gray.shape} → {img_size}x{img_size} (Model input için)")
    img_resized = cv2.resize(image_gray, (img_size, img_size), interpolation=cv2.INTER_LINEAR)
    img_for_overlay = img_resized.copy()  # Overlay'de kullan için kopyala
    print(f"✓ Resize tamamlandı")
    
    # Normalizasyon: 0-255 → 0-1
    img_float = img_resized.astype(np.float32) / 255.0
    print(f"✓ Normalization tamamlandı (min={img_float.min():.3f}, max={img_float.max():.3f})")
    
    # Grayscale -> RGB (3 channel) yapıp normalize et
    img_3ch = np.stack([img_float]*3, axis=-1) # (256, 256, 3)
    print(f"✓ 3-channel yapıldı: {img_3ch.shape}")
    
    # Tensor (C, H, W)
    x_tensor = torch.from_numpy(img_3ch.transpose(2, 0, 1)).unsqueeze(0).float().to(device)
    print(f"✓ Tensor oluşturuldu: {x_tensor.shape}")

    # --- 3. Inference ---
    print("🤖 Model inference başladı...")
    model.eval()
    with torch.no_grad():
        logits = model(x_tensor)
        print(f"✓ Logits shape: {logits.shape}")
        probs = torch.softmax(logits, dim=1)
        pred_mask_small = torch.argmax(probs, dim=1).squeeze().cpu().numpy().astype(np.uint8)
        print(f"✓ Mask shape: {pred_mask_small.shape}, unique values: {np.unique(pred_mask_small)}")
    
    # --- 4. Mask 256x256'de kalacak (model output boyutu) ---
    # Maskei geri büyütmeye gerek YOK! Model 256x256 için eğitildi
    print(f"✓ Mask boyutu: {pred_mask_small.shape} (Model output)")
    pred_mask = pred_mask_small.copy()  # Direkt kullan

    # --- 5. Hesaplamalar ---
    lung_mask = (pred_mask == 1)
    pnx_mask = (pred_mask == 2)
    
    total_pixels = pred_mask.size
    lung_pixels = lung_mask.sum()
    pnx_pixels = pnx_mask.sum()
    
    lung_ratio = 100.0 * lung_pixels / total_pixels if total_pixels > 0 else 0.0
    pnx_ratio = 100.0 * pnx_pixels / total_pixels if total_pixels > 0 else 0.0
    pnx_vs_lung = 100.0 * pnx_pixels / lung_pixels if lung_pixels > 0 else 0.0
    
    print(f"📊 Sonuçlar: Akciğer {lung_ratio:.2f}% | Pnömotoraks {pnx_ratio:.2f}%")
    
    # --- 6. Overlay Oluşturma (256x256'de) ---
    # img_for_overlay zaten 256x256
    print(f"🎨 Overlay oluşturuluyor ({img_for_overlay.shape})...")
    overlay = cv2.cvtColor(img_for_overlay, cv2.COLOR_GRAY2BGR)
    overlay[lung_mask] = [0, 255, 0] # Yeşil
    overlay[pnx_mask] = [0, 0, 255]  # Kırmızı
    print(f"✓ Overlay oluşturuldu: {overlay.shape}")
    
    # --- 7. Rotasyonu Geri Al (Yatay görseller için) ---
    if rotated:
        print("🔄 Overlay orijinal yönüne (Yatay) geri çevriliyor...")
        overlay = cv2.rotate(overlay, cv2.ROTATE_90_COUNTERCLOCKWISE)
        print(f"✓ Final overlay shape: {overlay.shape}")
    
    # --- 8. Frontend için optimize et (isteğe bağlı küçültme) ---
    # Overlay zaten 256x256 veya 512x512 max
    overlay_display = overlay
    
    print("="*50)
    print("✓ analyze_xray tamamlandı")
    print("="*50 + "\n")

    return {
        "dice_lung": 1.0 if lung_pixels > 0 else 0.0,
        "dice_pnx": 1.0 if pnx_pixels > 0 else 0.0,
        "pnx_ratio_percent": float(pnx_ratio),
        "pnx_ratio_vs_lung_percent": float(pnx_vs_lung),
        "lung_ratio_percent": float(lung_ratio),
        "overlay_image": overlay_display
    }
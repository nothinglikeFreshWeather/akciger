import cv2
import torch
import numpy as np
import pydicom
import matplotlib.pyplot as plt
from io import BytesIO

def analyze_xray(image_bytes, model, device, img_size=256):
    """
    X-Ray DICOM görüntüsünü analiz eder.
    img_size: Modelin eğitildiği boyut (Kodunda 256 görünüyor)
    """
    
    print("\n" + "="*50)
    print("🔍 analyze_xray fonksiyonu başladı")
    print("="*50)
    
    # --- 1. Görseli oku (Jupyter notebook'taki read_dicom_to_rgb_uint8 gibi) ---
    img_rgb_uint8 = None
    try:
        ds = pydicom.dcmread(BytesIO(image_bytes))
        img_array = ds.pixel_array.astype(np.float32)
        
        # Rescale slope/intercept if present (Jupyter notebook'taki gibi)
        slope = float(getattr(ds, "RescaleSlope", 1.0))
        intercept = float(getattr(ds, "RescaleIntercept", 0.0))
        img_array = img_array * slope + intercept
        
        # Min-max scale to uint8 (Jupyter notebook'taki gibi)
        mi, ma = img_array.min(), img_array.max()
        if ma != mi:
            img8 = ((img_array - mi) / (ma - mi) * 255).astype(np.uint8)
        else:
            img8 = np.zeros_like(img_array, dtype=np.uint8)
        
        # Replicate to 3 channels (RGB) for pretrained 2D encoders (Jupyter notebook'taki gibi)
        img_rgb_uint8 = np.repeat(img8[..., None], 3, axis=-1)  # (H, W, 3)
        print("✓ DICOM olarak okundu (RescaleSlope/Intercept uygulandı, RGB'ye çevrildi)")
    except Exception as e:
        print(f"⚠ DICOM okunamadı: {e}")
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None: raise ValueError("Görsel okunamadı")
            img_rgb_uint8 = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)  # BGR -> RGB
            print("✓ PNG/JPEG olarak okundu (RGB)")
        except Exception as e_img:
            raise ValueError(f"Format desteklenmiyor: {e_img}")

    if img_rgb_uint8 is None: raise ValueError("Görsel yüklenemedi")
    orig_h, orig_w = img_rgb_uint8.shape[:2]
    print(f"📐 Orijinal boyut: {img_rgb_uint8.shape}")

    # --- 2. Preprocessing (Resize & Normalize - Jupyter notebook'taki gibi) ---
    # Resize to img_size (Jupyter notebook'taki transform gibi)
    print(f"🔧 Resizing: {img_rgb_uint8.shape[:2]} → {img_size}x{img_size}")
    img_resized = cv2.resize(img_rgb_uint8, (img_size, img_size), interpolation=cv2.INTER_LINEAR)
    
    # ImageNet normalization (Jupyter notebook'taki val_tfms gibi)
    # mean=(0.485,0.456,0.406), std=(0.229,0.224,0.225)
    img_normalized = img_resized.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_normalized = (img_normalized - mean) / std
    print(f"✓ ImageNet normalization uygulandı")
    
    # Tensor (C, H, W) - Jupyter notebook'taki ToTensorV2 gibi
    x_tensor = torch.from_numpy(img_normalized.transpose(2, 0, 1)).float().unsqueeze(0).to(device)
    print(f"✓ Tensor oluşturuldu: {x_tensor.shape}")
    
    # Orijinal görüntüyü sakla (matplotlib için - normalize edilmemiş)
    img_for_display = img_resized.copy()  # (H, W, 3) uint8 RGB

    # --- 3. Inference --- (Jupyter notebook'taki visualize_predictions gibi)
    print("🤖 Model inference başladı...")
    model.eval()
    with torch.no_grad():
        logits = model(x_tensor)  # [B, num_classes, H, W]
        print(f"✓ Logits shape: {logits.shape}")
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()  # [num_classes, H, W] - Jupyter notebook'taki gibi
        pred_mask = probs.argmax(axis=0).astype(np.uint8)  # [H, W] - Jupyter notebook'taki gibi
        print(f"✓ Mask shape: {pred_mask.shape}, unique values: {np.unique(pred_mask)}")

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
    
    # --- 6. Overlay Oluşturma (Matplotlib ile - sağa koy ve 90 derece çevir) ---
    print(f"🎨 Overlay oluşturuluyor (Matplotlib ile, sağa ve 90° döndürülmüş)...")
    
    # Orijinal görüntüyü grayscale'e çevir (görüntüleme için)
    if len(img_for_display.shape) == 3:
        img_display_gray = np.mean(img_for_display, axis=2).astype(np.uint8)
    else:
        img_display_gray = img_for_display.astype(np.uint8)
    
    # Normalize et (Jupyter notebook'taki gibi: (img - img.min()) / (img.max() - img.min() + 1e-6))
    img_norm = (img_display_gray.astype(np.float32) - img_display_gray.min()) / (img_display_gray.max() - img_display_gray.min() + 1e-6)
    
    # Matplotlib figure oluştur - iki subplot yan yana
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10), dpi=100)
    
    # Sol: Orijinal görüntü
    ax1.axis('off')
    ax1.imshow(img_norm, cmap='gray')
    
    # Sağ: Mask overlay (arka plan görüntüsü ile)
    ax2.axis('off')
    # Orijinal görüntüyü arka plan olarak göster (döndürülmemiş)
    ax2.imshow(img_norm, cmap='gray')
    
    # Sadece mask'i 90 derece sola döndür (saat yönünün tersine)
    pred_mask_rotated = np.rot90(pred_mask, k=3)  # k=3 saat yönünün tersine 90 derece (sola)
    
    # Mask'i biraz sağa ve aşağı kaydır (offset)
    offset_right = 5  # Sağa kaydırma (piksel)
    offset_down = 5   # Aşağı kaydırma (piksel)
    
    # Mask overlay'lerini oluştur ve kaydır
    # Lung mask'i yeşil overlay olarak
    lung_overlay = np.zeros_like(pred_mask_rotated, dtype=np.float32)
    lung_mask_shifted = np.roll(pred_mask_rotated, (offset_down, offset_right), axis=(0, 1))
    lung_overlay[lung_mask_shifted == 1] = 1.0
    if lung_overlay.sum() > 0:
        ax2.imshow(lung_overlay, cmap='Greens', alpha=0.4, vmin=0, vmax=1)
    
    # Pnömotoraks mask'i kırmızı overlay olarak
    pnx_overlay = np.zeros_like(pred_mask_rotated, dtype=np.float32)
    pnx_mask_shifted = np.roll(pred_mask_rotated, (offset_down, offset_right), axis=(0, 1))
    pnx_overlay[pnx_mask_shifted == 2] = 1.0
    if pnx_overlay.sum() > 0:
        ax2.imshow(pnx_overlay, cmap='Reds', alpha=0.4, vmin=0, vmax=1)
    
    plt.tight_layout(pad=0)
    
    # Figure'ı numpy arrar yap 
    fig.canvas.draw()
    overlay_rgb = np.frombuffer(fig.canvas.tostring_rgb(), dtype=np.uint8)
    overlay_rgb = overlay_rgb.reshape(fig.canvas.get_width_height()[::-1] + (3,))
    plt.close(fig)
    
    overlay_display = overlay_rgb
    print(f"✓ Overlay oluşturuldu (Matplotlib ile, sağa ve 90° döndürülmüş): {overlay_display.shape}")
    
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
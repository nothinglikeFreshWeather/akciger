"""
Model yükleme testi
Modelin düzgün yüklenip yüklenmediğini kontrol eder
"""

import sys
import os

# Backend klasörünü path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("=" * 60)
    print("X-Ray Model Yükleme Testi")
    print("=" * 60)
    
    # Model yükleme
    from models.xray_model import load_xray_model, get_device
    
    print("\n1. Device kontrolü...")
    device = get_device()
    print(f"   ✓ Device: {device}")
    
    print("\n2. Model yükleniyor...")
    model, model_device = load_xray_model()
    print(f"   ✓ Model başarıyla yüklendi!")
    print(f"   ✓ Model device: {model_device}")
    
    print("\n3. Model mimarisi kontrolü...")
    print(f"   ✓ Model tipi: {type(model)}")
    print(f"   ✓ Model parametre sayısı: {sum(p.numel() for p in model.parameters()):,}")
    
    print("\n4. Test görseli ile inference testi...")
    import torch
    import numpy as np
    
    # Dummy test görseli oluştur (256x256 grayscale)
    test_image = np.random.randint(0, 255, (256, 256), dtype=np.uint8)
    
    # Preprocessing
    from utils.xray_analysis import preprocess_image
    img_tensor = preprocess_image(test_image)
    img_tensor = img_tensor.to(model_device)
    
    print(f"   ✓ Test görseli hazırlandı: {img_tensor.shape}")
    
    # Inference
    model.eval()
    with torch.no_grad():
        logits = model(img_tensor)
        probs = torch.softmax(logits, dim=1)
        pred_mask = torch.argmax(probs, dim=1).squeeze().cpu().numpy()
    
    print(f"   ✓ Inference başarılı!")
    print(f"   ✓ Output shape: {logits.shape}")
    print(f"   ✓ Prediction shape: {pred_mask.shape}")
    print(f"   ✓ Prediction değerleri: {np.unique(pred_mask)}")
    
    # Sınıf dağılımı
    unique, counts = np.unique(pred_mask, return_counts=True)
    print(f"\n   Sınıf dağılımı:")
    for cls, count in zip(unique, counts):
        cls_name = {0: "Background", 1: "Lung", 2: "Pneumothorax"}.get(cls, f"Class {cls}")
        percentage = (count / pred_mask.size) * 100
        print(f"     - {cls_name}: {count:,} piksel ({percentage:.2f}%)")
    
    print("\n" + "=" * 60)
    print("✅ TÜM TESTLER BAŞARILI!")
    print("=" * 60)
    print("\nModel kullanıma hazır! Herhangi bir X-ray görüntüsünü analiz edebilirsiniz.")
    print("Desteklenen formatlar: DICOM (.dcm), PNG, JPEG")
    
except Exception as e:
    print("\n" + "=" * 60)
    print("❌ HATA OLUŞTU!")
    print("=" * 60)
    import traceback
    print(f"\nHata mesajı: {str(e)}")
    print("\nDetaylı hata:")
    traceback.print_exc()
    sys.exit(1)


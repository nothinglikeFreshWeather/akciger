"""
X-Ray Segmentation Model Loading Module
Model: U-Net with ResNet34 encoder (ImageNet pretrained)
Classes: 3 (background=0, lung=1, pneumothorax=2)
"""

import torch
import segmentation_models_pytorch as smp
from pathlib import Path

# Model konfigürasyonu
MODEL_config = {
    "encoder_name": "resnet34",
    "in_channels": 3,
    "classes": 3,
    "weights": None
}

def load_xray_model(model_path=None, device=None):
    """
    X-Ray segmentasyon modelini yükle.
    
    Args:
        model_path: Model ağırlıklarının yolu (None ise default)
        device: 'cuda' veya 'cpu' (None ise otomatik seç)
    
    Returns:
        (model, device)
    """
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    
    if model_path is None:
        # Varsayılan model yolu - önce yenisini dene, yoksa eskisini kullan
        new_model = Path(__file__).parent / "smp_unet_best.pth"
        old_model = Path(__file__).parent / "smp_unet_best_v1.pth"
        
        if new_model.exists():
            model_path = new_model
            print(f"✓ Yeni model bulundu: smp_unet_best.pth")
        elif old_model.exists():
            model_path = old_model
            print(f"⚠ Yeni model bulunamadı, eski model kullanılıyor: smp_unet_best_v1.pth")
        else:
            raise FileNotFoundError("Model dosyası bulunamadı!")
    
    print(f"🔧 Model cihazı: {device}")
    print(f"📂 Model yolu: {model_path}")
    
    # Model mimarisi tanımla
    model = smp.Unet(
        encoder_name=MODEL_config["encoder_name"],
        encoder_weights=MODEL_config["weights"],
        in_channels=MODEL_config["in_channels"],
        classes=MODEL_config["classes"]
    )
    
    # Ağırlıkları yükle
    try:
        state_dict = torch.load(str(model_path), map_location=device)
        model.load_state_dict(state_dict)
        print(f"✓ Model ağırlıkları yüklendi")
    except FileNotFoundError:
        raise FileNotFoundError(f"Model dosyası bulunamadı: {model_path}")
    except Exception as e:
        raise RuntimeError(f"Model yüklenirken hata: {e}")
    
    model.to(device)
    model.eval()
    
    return model, device

def get_device():
    """CUDA varsa 'cuda', yoksa 'cpu' döndür."""
    return "cuda" if torch.cuda.is_available() else "cpu"


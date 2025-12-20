import matplotlib
matplotlib.use('Agg')  # GUI olmadan çalışması için (Flask thread-safe)

import io
import base64
import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
import tempfile
from pathlib import Path
from flask import Flask, send_file, jsonify, request
from flask_cors import CORS

# X-Ray Analysis imports
from models.xray_model import load_xray_model, get_device
from utils.xray_analysis import analyze_xray

# --- Flask Uygulamasını Başlatma ---
app = Flask(__name__)
CORS(app)  # React'in Flask'e erişebilmesi için

# --- X-Ray Model Yükleme ---
xray_model = None
xray_device = None

try:
    print("🔧 X-Ray model yükleniyor...")
    xray_model, xray_device = load_xray_model(device='cpu')  # CPU kullan
    print(f"✓ X-Ray model başarıyla yüklendi ({xray_device})")
except Exception as e:
    print(f"⚠ X-Ray model yüklenemedi: {e}")
    print("⚠ X-Ray analiz endpoint'i çalışmayacak!")

# --- API ENDPOINT: X-RAY ANALİZİ ---
@app.route("/api/analyze-xray", methods=["POST"])
def analyze_xray_endpoint():
    """
    X-Ray görüntüsünü analiz eder ve segmentasyon sonucunu döndürür.
    
    Request:
        - File: image (DICOM/PNG/JPEG)
    
    Response:
        {
            "pnx_ratio_percent": float,
            "pnx_ratio_vs_lung_percent": float,
            "lung_ratio_percent": float,
            "dice_lung": float,
            "dice_pnx": float,
            "overlay_image": base64_encoded_png
        }
    """
    
    if xray_model is None:
        return jsonify({"error": "Model yüklenmedi"}), 503
    
    # Dosya kontrol et
    if 'image' not in request.files:
        return jsonify({"error": "Dosya gönderilmedi"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "Dosya seçilmedi"}), 400
    
    try:
        # Dosya bytesını oku
        image_bytes = file.read()
        print(f"📥 Dosya alındı: {file.filename} ({len(image_bytes)} bytes)")
        
        # Analiz yap (tüm formatları try-catch ile yakala)
        result = analyze_xray(image_bytes, xray_model, xray_device)
        
        # Overlay görselini base64'e çevir
        _, buffer = cv2.imencode('.png', result['overlay_image'])
        overlay_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Response hazırla
        response_data = {
            "dice_lung": result['dice_lung'],
            "dice_pnx": result['dice_pnx'],
            "pnx_ratio_percent": result['pnx_ratio_percent'],
            "pnx_ratio_vs_lung_percent": result['pnx_ratio_vs_lung_percent'],
            "lung_ratio_percent": result['lung_ratio_percent'],
            "overlay_image": f"data:image/png;base64,{overlay_base64}"
        }
        
        print(f"✓ Analiz tamamlandı")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Hata: {str(e)[:100]}")
        return jsonify({"error": str(e)}), 500

# --- API ENDPOINT: MODEL YÜKLEME ---
@app.route("/api/load-model", methods=["POST"])
def load_model_endpoint():
    """
    Frontend'den .pth model dosyası yükler ve modeli yeniden başlatır.
    
    Request:
        - File: model (.pth dosyası)
    
    Response:
        {
            "status": "success",
            "message": "Model başarıyla yüklendi",
            "model_path": str,
            "device": str
        }
    """
    global xray_model, xray_device
    
    # Dosya kontrol et
    if 'model' not in request.files:
        return jsonify({"error": "Model dosyası gönderilmedi"}), 400
    
    file = request.files['model']
    
    if file.filename == '':
        return jsonify({"error": "Dosya seçilmedi"}), 400
    
    # .pth uzantısı kontrol et
    if not file.filename.lower().endswith('.pth'):
        return jsonify({"error": "Sadece .pth dosyaları desteklenir"}), 400
    
    try:
        # Geçici dosya olarak kaydet
        temp_dir = tempfile.gettempdir()
        temp_model_path = os.path.join(temp_dir, f"uploaded_model_{file.filename}")
        
        # Dosyayı kaydet
        file.save(temp_model_path)
        print(f"📥 Model dosyası alındı: {file.filename} ({os.path.getsize(temp_model_path)} bytes)")
        print(f"📂 Geçici dosya yolu: {temp_model_path}")
        
        # Modeli yükle
        print("🔧 Model yükleniyor...")
        xray_model, xray_device = load_xray_model(model_path=temp_model_path, device='cpu')
        print(f"✓ Model başarıyla yüklendi ({xray_device})")
        
        return jsonify({
            "status": "success",
            "message": "Model başarıyla yüklendi",
            "model_path": temp_model_path,
            "device": xray_device
        }), 200
        
    except Exception as e:
        print(f"❌ Model yükleme hatası: {str(e)}")
        return jsonify({"error": f"Model yüklenirken hata: {str(e)}"}), 500

# --- API ENDPOINT: MEVCUT MODELLERİ LİSTELE ---
@app.route("/api/models", methods=["GET"])
def list_models():
    """
    Backend'deki mevcut model dosyalarını listeler.
    
    Response:
        {
            "models": [
                {"name": "smp_unet_best.pth", "path": "models/smp_unet_best.pth"},
                ...
            ],
            "current_model": "smp_unet_best.pth"
        }
    """
    try:
        models_dir = Path(__file__).parent / "models"
        model_files = []
        
        # .pth dosyalarını bul
        if models_dir.exists():
            for model_file in models_dir.glob("*.pth"):
                model_files.append({
                    "name": model_file.name,
                    "path": str(model_file.relative_to(Path(__file__).parent))
                })
        
        # Mevcut model dosyasını bul
        current_model = None
        if xray_model is not None:
            # Model yolu bilgisi yoksa, varsayılan modelleri kontrol et
            new_model = models_dir / "smp_unet_best.pth"
            old_model = models_dir / "smp_unet_best_v1.pth"
            
            if new_model.exists():
                current_model = new_model.name
            elif old_model.exists():
                current_model = old_model.name
        
        return jsonify({
            "models": model_files,
            "current_model": current_model
        }), 200
        
    except Exception as e:
        print(f"❌ Model listesi alınırken hata: {str(e)}")
        return jsonify({"error": f"Model listesi alınamadı: {str(e)}"}), 500

# --- API ENDPOINT: MODEL SEÇ ---
@app.route("/api/select-model", methods=["POST"])
def select_model():
    """
    Backend'deki mevcut modellerden birini seçer ve yükler.
    
    Request:
        {
            "model_name": "smp_unet_best.pth"
        }
    
    Response:
        {
            "status": "success",
            "message": "Model başarıyla yüklendi",
            "model_name": str,
            "device": str
        }
    """
    global xray_model, xray_device
    
    try:
        data = request.get_json()
        if not data or 'model_name' not in data:
            return jsonify({"error": "Model adı gönderilmedi"}), 400
        
        model_name = data['model_name']
        models_dir = Path(__file__).parent / "models"
        model_path = models_dir / model_name
        
        # Model dosyası var mı kontrol et
        if not model_path.exists():
            return jsonify({"error": f"Model dosyası bulunamadı: {model_name}"}), 404
        
        # Modeli yükle
        print(f"🔧 Model yükleniyor: {model_name}")
        xray_model, xray_device = load_xray_model(model_path=str(model_path), device='cpu')
        print(f"✓ Model başarıyla yüklendi ({xray_device})")
        
        return jsonify({
            "status": "success",
            "message": "Model başarıyla yüklendi",
            "model_name": model_name,
            "device": xray_device
        }), 200
        
    except Exception as e:
        print(f"❌ Model seçme hatası: {str(e)}")
        return jsonify({"error": f"Model yüklenirken hata: {str(e)}"}), 500

# --- Health Check ---
@app.route("/api/health", methods=["GET"])
def health_check():
    """API sağlıklı mı kontrol et."""
    return jsonify({
        "status": "ok",
        "model_loaded": xray_model is not None,
        "device": xray_device
    }), 200

# --- Uygulamayı Çalıştırma ---
if __name__ == '__main__':
    print("\n" + "="*50)
    print("🫁 Pnömotoraks Analiz Sistemi")
    print("="*50)
    print(f"📡 Flask server başlatılıyor...")
    print(f"🌐 http://127.0.0.1:5000")
    print("="*50 + "\n")
    
    app.run(debug=True, port=5000, use_reloader=False)
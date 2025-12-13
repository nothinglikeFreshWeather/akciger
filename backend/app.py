import matplotlib
matplotlib.use('Agg')  # GUI olmadan çalışması için (Flask thread-safe)

import io
import base64
import cv2
import numpy as np
import matplotlib.pyplot as plt
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
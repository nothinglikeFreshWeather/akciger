import React, { useState } from 'react';
import { analyzeXray } from '../services/flaskApi';

/**
 * X-Ray Analiz Bileşeni
 * X-Ray görüntüsünü yükleyip pnömotoraks analizi yapar
 */
function XrayAnalyzer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Dosya seçildiğinde preview göster
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setAnalysisResult(null);
      
      // Preview oluştur
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analiz yap
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeXray(selectedFile);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || 'Analiz sırasında bir hata oluştu');
      console.error('Analiz hatası:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dosya seçimini temizle
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setAnalysisResult(null);
    setError(null);
    // Input'u resetle
    const fileInput = document.getElementById('xray-file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">🫁 X-Ray Pnömotoraks Analizi</h2>
      
      {/* Dosya Seçimi */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          📁 X-Ray Görüntüsü Seçin (DICOM, PNG, JPEG)
        </label>
        <div className="flex gap-4">
          <input
            id="xray-file-input"
            type="file"
            accept=".dcm,.dicom,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="block w-full text-base text-gray-900 font-medium
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-500 file:text-white
              hover:file:bg-blue-600
              cursor-pointer border-2 border-gray-300 rounded px-3 py-2"
          />
          {selectedFile && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              ✕ Temizle
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {previewImage && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">👁️ Önizleme</h3>
          <div className="border-2 border-gray-300 rounded-lg p-2 bg-gray-50">
            <img
              src={previewImage}
              alt="X-Ray Preview"
              className="max-w-full h-auto max-h-64 mx-auto rounded"
            />
          </div>
        </div>
      )}

      {/* Analiz Butonu */}
      <div className="mb-6">
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className={`w-full px-6 py-3 rounded-lg font-bold text-white transition-colors text-lg
            ${!selectedFile || isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              ⏳ Analiz yapılıyor...
            </span>
          ) : (
            '🔍 Analiz Yap'
          )}
        </button>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-lg">
          <p className="text-red-900 font-semibold text-sm">⚠️ Hata: {error}</p>
        </div>
      )}

      {/* Sonuçlar */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Metrikler */}
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-6 border-2 border-blue-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Analiz Sonuçları</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-red-200">
                <p className="text-sm font-semibold text-gray-800 mb-1">❌ Pnömotoraks Oranı</p>
                <p className="text-3xl font-bold text-red-600">
                  {analysisResult.pnx_ratio_percent}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Toplam görüntüye göre</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-orange-200">
                <p className="text-sm font-semibold text-gray-800 mb-1">📈 Akciğere Göre Oran</p>
                <p className="text-3xl font-bold text-orange-600">
                  {analysisResult.pnx_ratio_vs_lung_percent}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Akciğer alanına göre</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-800 mb-1">✅ Akciğer Oranı</p>
                <p className="text-3xl font-bold text-green-600">
                  {analysisResult.lung_ratio_percent}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Toplam görüntüye göre</p>
              </div>
            </div>
          </div>

          {/* Overlay Görseli */}
          {analysisResult.overlay_image_url && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">🔬 Segmentasyon Sonucu</h3>
              <div className="border-2 border-gray-400 rounded-lg p-3 bg-gray-100">
                <img
                  src={analysisResult.overlay_image_url}
                  alt="Segmentation Overlay"
                  className="max-w-full h-auto rounded"
                />
                <div className="mt-4 flex items-center gap-6 text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500 rounded border-2 border-green-700"></div>
                    <span className="text-gray-900">Akciğer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-500 rounded border-2 border-red-700"></div>
                    <span className="text-gray-900">Pnömotoraks</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default XrayAnalyzer;


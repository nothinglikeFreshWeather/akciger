import { useState, useCallback } from 'react';

/**
 * Görsel yükleme ve işleme için custom hook
 * SOLID - Single Responsibility: Sadece görsel yükleme işlemlerinden sorumlu
 */
export const useImageLoader = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Dosya yükleme işlemi
   * @param {File} file - Yüklenecek dosya
   */
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    
    // Dosya tipini kontrol et (JPG, PNG, DICOM)
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Bilinen görsel formatları kontrol et
    const isStandardImage = fileType.match(/^image\/(jpeg|jpg|png|tiff|bmp|gif)$/) || 
                           fileName.match(/\.(jpg|jpeg|png|tiff|bmp|gif)$/);
    
    // DICOM formatı kontrolü (daha esnek)
    // .dcm, .dicom uzantılı veya DICOM MIME type'ı olan dosyalar
    const hasDicomExtension = fileName.match(/\.(dcm|dicom)$/);
    const hasDicomMimeType = fileType === 'application/dicom' || 
                            fileType === 'image/x-dcm' ||
                            fileType === 'application/dicom; transfer-syntax=*';
    
    // Dosya tipi belirsiz veya boşsa, DICOM olarak kabul et (uzantısız DICOM dosyaları için)
    const isUnknownType = !fileType || fileType === '' || fileType === 'application/octet-stream';
    const isLikelyDicom = hasDicomExtension || hasDicomMimeType || (isUnknownType && !isStandardImage);
    
    // Eğer ne standart görsel ne de DICOM değilse kontrol et
    let finalIsDicom = isLikelyDicom;
    if (!isStandardImage && !isLikelyDicom) {
      // Dosya boyutu büyükse ve tip belirsizse DICOM olarak kabul et
      if (isUnknownType && file.size > 100000) { // 100KB'dan büyükse DICOM olabilir
        console.log('Bilinmeyen dosya tipi (büyük dosya), DICOM olarak işlenecek:', file.name);
        finalIsDicom = true;
      } else {
        setError('Sadece JPG, PNG, TIFF ve DICOM dosyaları desteklenir.');
        return;
      }
    }
    
    // Dosya boyutunu kontrol et (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'dan küçük olmalıdır.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // FileReader ile dosyayı oku
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const url = e.target.result;
        
        // DICOM için URL oluşturma (binary data)
        if (finalIsDicom) {
          setUploadedImage({
            file,
            url: null,  // DICOM için URL yok
            name: file.name,
            size: file.size,
            type: 'application/dicom',
            isDicom: true
          });
          setIsLoading(false);
        } else {
          // PNG/JPG/TIFF için data URL
          setUploadedImage({
            file,
            url,
            name: file.name,
            size: file.size,
            type: file.type || 'image/jpeg',
            isDicom: false
          });
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Dosya okunurken hata oluştu.');
        setIsLoading(false);
      };
      
      // DICOM dosyasını binary olarak oku
      if (finalIsDicom) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError('Dosya yüklenirken hata oluştu.');
      setIsLoading(false);
    }
  }, []);

  /**
   * Drag & drop işlemi
   * @param {Event} event - Drag event
   */
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  /**
   * Drag over işlemi
   * @param {Event} event - Drag over event
   */
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Görseli temizle
   */
  const clearImage = useCallback(() => {
    setUploadedImage(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    // State
    uploadedImage,
    isLoading,
    error,
    
    // Actions
    uploadFile,
    handleDrop,
    handleDragOver,
    clearImage
  };
};

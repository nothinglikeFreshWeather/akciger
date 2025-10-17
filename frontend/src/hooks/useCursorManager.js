import { useState, useCallback, useEffect } from 'react';

/**
 * Cursor yönetimi için custom hook
 * SOLID - Single Responsibility: Sadece cursor durumlarından sorumlu
 */
export const useCursorManager = (selectedTool, isDrawing = false, isPanning = false) => {
  const [cursorState, setCursorState] = useState('default');
  const [isHovering, setIsHovering] = useState(false);

  /**
   * Cursor durumunu hesapla
   */
  const calculateCursorState = useCallback((tool, drawing, panning, hovering) => {
    if (!hovering) {
      return 'default';
    }

    if (panning) {
      return 'grabbing';
    } else if (drawing) {
      return 'crosshair';
    } else {
      switch (tool) {
        case 'pen':
        case 'rect':
        case 'circle':
          return 'crosshair';
        case 'eraser':
          return 'crosshair';
        case 'pan':
          return 'grab';
        case 'select':
          return 'move';
        default:
          return 'default';
      }
    }
  }, []);

  /**
   * Cursor durumunu güncelle
   */
  const updateCursor = useCallback((tool, drawing, panning, hovering) => {
    const newCursor = calculateCursorState(tool, drawing, panning, hovering);
    setCursorState(newCursor);
    return newCursor;
  }, [calculateCursorState]);

  /**
   * Mouse giriş olayı
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    return updateCursor(selectedTool, isDrawing, isPanning, true);
  }, [selectedTool, isDrawing, isPanning, updateCursor]);

  /**
   * Mouse çıkış olayı
   */
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    return updateCursor(selectedTool, isDrawing, isPanning, false);
  }, [selectedTool, isDrawing, isPanning, updateCursor]);

  /**
   * Tool veya durum değiştiğinde cursor'ı güncelle
   */
  useEffect(() => {
    updateCursor(selectedTool, isDrawing, isPanning, isHovering);
  }, [selectedTool, isDrawing, isPanning, isHovering, updateCursor]);

  return {
    cursorState,
    isHovering,
    updateCursor,
    handleMouseEnter,
    handleMouseLeave,
    calculateCursorState
  };
};

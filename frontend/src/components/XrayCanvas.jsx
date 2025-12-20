import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Circle, Line, Transformer } from 'react-konva';
import { createRectConfig, generateId, mouseToCanvasCoords } from '../utils/canvasHelpers';
import { DEFAULT_PAINTING_CONFIG } from '../utils/mockData';
import { useCursorManager } from '../hooks/useCursorManager';

/**
 * Profesyonel X-ray Canvas - Epic Pen benzeri çizim araçları
 */
const XrayCanvas = ({
  image,
  detectedRegions = [],
  userRegions = [],
  onUserRegionAdd,
  onUserRegionUpdate,
  onUserRegionDelete,
  paintingConfig = DEFAULT_PAINTING_CONFIG,
  zoomLevel = 1,
  onZoomChange,
  selectedTool = 'rect', // rect, circle, pen, eraser
  onCursorChange
}) => {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newShape, setNewShape] = useState(null);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [currentLine, setCurrentLine] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);

  // Cursor yönetimi için hook
  const { cursorState } = useCursorManager(
    selectedTool, 
    isDrawing || isDrawingLine, 
    isPanning
  );

  /**
   * Canvas boyutunu hesapla ve güncelle - Her zaman container boyutunu kullan
   */
  const updateStageSize = useCallback(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Stage her zaman container boyutunu kaplasın
    setStageSize({ 
      width: Math.max(containerRect.width, 400), 
      height: Math.max(containerRect.height, 300) 
    });
  }, []);

  useEffect(() => {
    updateStageSize();
    window.addEventListener('resize', updateStageSize);
    return () => window.removeEventListener('resize', updateStageSize);
  }, [updateStageSize]);

  // Görüntü yüklendiğinde container'a sığdır ve ortala
  useEffect(() => {
    if (!image || !stageSize.width || !stageSize.height) return;
    
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;
    
    if (imgWidth === 0 || imgHeight === 0) return;
    
    // Container'a sığdırmak için scale hesapla
    const scaleX = stageSize.width / imgWidth;
    const scaleY = stageSize.height / imgHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.95; // %95 ile biraz padding bırak
    
    setImageScale(fitScale);
  }, [image, stageSize.width, stageSize.height]);

  // Zoom veya scale değiştiğinde görüntüyü yeniden ortala
  useEffect(() => {
    if (!image || !stageSize.width || !stageSize.height || imageScale === 0) return;
    
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;
    
    if (imgWidth === 0 || imgHeight === 0) return;
    
    const scaledWidth = imgWidth * imageScale * zoomLevel;
    const scaledHeight = imgHeight * imageScale * zoomLevel;
    const centerX = (stageSize.width - scaledWidth) / 2;
    const centerY = (stageSize.height - scaledHeight) / 2;
    
    setPanPosition({ x: centerX, y: centerY });
  }, [zoomLevel, imageScale, stageSize.width, stageSize.height, image]);

  /**
   * Seçili şekli güncelle
   */
  useEffect(() => {
    if (transformerRef.current && selectedShapeId) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedShapeId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedShapeId]);

  /**
   * Cursor değişikliğini parent'a bildir
   */
  useEffect(() => {
    if (onCursorChange) {
      onCursorChange(cursorState);
    }
  }, [cursorState, onCursorChange]);

  /**
   * Doğru koordinatları hesapla - zoom ve pan durumlarını dikkate al
   */
  const getAccuratePosition = useCallback((e) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    // Yardımcı fonksiyonu kullan
    return mouseToCanvasCoords(stage, pointerPosition.x, pointerPosition.y);
  }, []);

  /**
   * Stage tıklama olayı
   */
  const handleStageClick = useCallback((e) => {
    // Transformer'ı temizle
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
    
    // Seçimi temizle
    setSelectedShapeId(null);
    
    // Eğer boş alana tıklandıysa
    if (e.target === e.target.getStage()) {
      const pos = getAccuratePosition(e);
      
      if (selectedTool === 'pen') {
        // Kalem modu - serbest çizim başlat
        setIsDrawingLine(true);
        setCurrentLine([pos.x, pos.y]);
      } else if (selectedTool === 'rect') {
        // Dikdörtgen modu
        setNewShape({
          type: 'rect',
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0
        });
        setIsDrawing(true);
      } else if (selectedTool === 'circle') {
        // Daire modu
        setNewShape({
          type: 'circle',
          x: pos.x,
          y: pos.y,
          radius: 0
        });
        setIsDrawing(true);
      } else if (selectedTool === 'eraser') {
        // Silgi modu - tıklanan şekli sil
        const stage = e.target.getStage();
        
        // Tüm şekilleri kontrol et
        const shapes = stage.find('Rect, Circle, Line');
        let foundShape = null;
        
        // En üstteki şekli bul (z-index'e göre)
        for (let i = shapes.length - 1; i >= 0; i--) {
          const shape = shapes[i];
          let isHit = false;
          
          if (shape.getClassName() === 'Line') {
            // Line için basit hit detection
            const points = shape.points();
            const strokeWidth = shape.strokeWidth() || 2;
            
            for (let j = 0; j < points.length - 2; j += 2) {
              const x1 = points[j];
              const y1 = points[j + 1];
              const x2 = points[j + 2];
              const y2 = points[j + 3];
              
              // Nokta-çizgi mesafesi
              const A = pos.x - x1;
              const B = pos.y - y1;
              const C = x2 - x1;
              const D = y2 - y1;
              
              const dot = A * C + B * D;
              const lenSq = C * C + D * D;
              let param = -1;
              
              if (lenSq !== 0) {
                param = dot / lenSq;
              }
              
              let xx, yy;
              if (param < 0) {
                xx = x1;
                yy = y1;
              } else if (param > 1) {
                xx = x2;
                yy = y2;
              } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
              }
              
              const dx = pos.x - xx;
              const dy = pos.y - yy;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance <= strokeWidth + 5) { // 5px tolerans
                isHit = true;
                break;
              }
            }
          } else if (shape.getClassName() === 'Circle') {
            // Circle için hit detection
            const centerX = shape.x();
            const centerY = shape.y();
            const radius = shape.radius();
            const distance = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));
            isHit = distance <= radius;
          } else if (shape.getClassName() === 'Rect') {
            // Rect için hit detection
            const rectX = shape.x();
            const rectY = shape.y();
            const rectWidth = shape.width() * shape.scaleX();
            const rectHeight = shape.height() * shape.scaleY();
            
            isHit = pos.x >= rectX && pos.x <= rectX + rectWidth &&
                    pos.y >= rectY && pos.y <= rectY + rectHeight;
          }
          
          if (isHit) {
            foundShape = shape;
            break;
          }
        }
        
        if (foundShape) {
          console.log('Silgi: Şekil bulundu ve siliniyor:', foundShape.getClassName(), foundShape.id());
          if (onUserRegionDelete) {
            onUserRegionDelete(foundShape.id());
          }
        } else {
          console.log('Silgi: Hiçbir şekil bulunamadı, pozisyon:', pos);
        }
      } else if (selectedTool === 'pan') {
        // Sadece pan aracı seçiliyken pan modu
        setIsPanning(true);
      }
    }
  }, [selectedTool, onUserRegionDelete, getAccuratePosition]);

  /**
   * Stage mouse hareket olayı
   */
  const handleStageMouseMove = useCallback((e) => {
    const pos = getAccuratePosition(e);
    
    
    
    if (isDrawingLine && selectedTool === 'pen') {
      // Kalem çizimi - sürekli çizgi ekle
      setCurrentLine(prev => [...prev, pos.x, pos.y]);
    } else if (isDrawing && newShape) {
      if (newShape.type === 'rect') {
        setNewShape({
          ...newShape,
          width: pos.x - newShape.x,
          height: pos.y - newShape.y
        });
      } else if (newShape.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - newShape.x, 2) + Math.pow(pos.y - newShape.y, 2)
        );
        setNewShape({
          ...newShape,
          radius
        });
      }
    }
  }, [isDrawing, isDrawingLine, newShape, selectedTool, getAccuratePosition, isPanning]);


  /**
   * Stage mouse bırakma olayı
   */
  const handleStageMouseUp = useCallback(() => {
    if (isDrawingLine && selectedTool === 'pen') {
      // Kalem çizimini tamamla
      if (currentLine.length > 4) { // En az 2 nokta
        const newLine = {
          id: generateId(),
          points: currentLine,
          stroke: paintingConfig.fillColor,
          strokeWidth: 3,
          opacity: paintingConfig.opacity,
          type: 'line'
        };
        
        if (onUserRegionAdd) {
          onUserRegionAdd(newLine);
        }
      }
      
      setIsDrawingLine(false);
      setCurrentLine([]);
    } else if (isDrawing && newShape) {
      // Şekil çizimini tamamla
      if (newShape.type === 'rect' && Math.abs(newShape.width) > 10 && Math.abs(newShape.height) > 10) {
        const rectConfig = createRectConfig(
          Math.min(newShape.x, newShape.x + newShape.width),
          Math.min(newShape.y, newShape.y + newShape.height),
          Math.abs(newShape.width),
          Math.abs(newShape.height),
          paintingConfig
        );
        
        const newRegion = {
          id: generateId(),
          ...rectConfig,
          type: 'rect'
        };
        
        if (onUserRegionAdd) {
          onUserRegionAdd(newRegion);
        }
      } else if (newShape.type === 'circle' && newShape.radius > 10) {
        const newRegion = {
          id: generateId(),
          x: newShape.x,
          y: newShape.y,
          radius: newShape.radius,
          fill: paintingConfig.fillColor,
          stroke: paintingConfig.strokeColor,
          strokeWidth: paintingConfig.strokeWidth,
          opacity: paintingConfig.opacity,
          type: 'circle'
        };
        
        if (onUserRegionAdd) {
          onUserRegionAdd(newRegion);
        }
      }
      
      setIsDrawing(false);
      setNewShape(null);
    } else if (isPanning) {
      // Pan işlemini tamamla
      setIsPanning(false);
    }
  }, [isDrawing, isDrawingLine, isPanning, newShape, currentLine, paintingConfig, onUserRegionAdd, selectedTool]);

  /**
   * Şekil tıklama olayı
   */
  const handleShapeClick = useCallback((e) => {
    e.cancelBubble = true;
    const shapeId = e.target.id();
    setSelectedShapeId(shapeId);
    
    // Transformer'ı güncelle
    if (transformerRef.current) {
      transformerRef.current.nodes([e.target]);
      transformerRef.current.getLayer().batchDraw();
    }
    
  }, []);

  /**
   * Şekil değişiklik olayı
   */
  const handleShapeChange = useCallback((e) => {
    const shape = e.target;
    const updatedRegion = {
      id: shape.id(),
      x: shape.x(),
      y: shape.y(),
      width: shape.width ? shape.width() * shape.scaleX() : undefined,
      height: shape.height ? shape.height() * shape.scaleY() : undefined,
      radius: shape.radius ? shape.radius() * Math.max(shape.scaleX(), shape.scaleY()) : undefined,
      scaleX: 1,
      scaleY: 1
    };
    
    if (onUserRegionUpdate) {
      onUserRegionUpdate(updatedRegion);
    }
  }, [onUserRegionUpdate]);

  /**
   * Şekil çift tıklama olayı (silme)
   */
  const handleShapeDoubleClick = useCallback((e) => {
    e.cancelBubble = true;
    const shapeId = e.target.id();
    
    if (onUserRegionDelete) {
      onUserRegionDelete(shapeId);
    }
    
    setSelectedShapeId(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
    
  }, [onUserRegionDelete]);

  /**
   * Zoom olayı - Akıllı zoom kontrolü
   */
  const handleWheel = useCallback((e) => {
    // Ctrl tuşu basılıyken zoom'u aktif et (çizim araçları seçili olsa bile)
    const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
    
    // Çizim araçları seçiliyken ve Ctrl basılı değilse zoom'u devre dışı bırak
    if (!isCtrlPressed && (selectedTool === 'pen' || selectedTool === 'rect' || selectedTool === 'circle' || selectedTool === 'eraser')) {
      return;
    }
    
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? zoomLevel / scaleBy : zoomLevel * scaleBy;
    
    // Zoom level'ı güncelle
    onZoomChange?.(newScale);
    
    // Pan position otomatik olarak useEffect'te güncellenecek (ortalanacak)
    
  }, [onZoomChange, selectedTool, zoomLevel]);

  if (!image) {
    return null; // Upload area will be handled in parent component
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#000000',
      borderRadius: '0',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        draggable={false} // Pan devre dışı - görüntü sabit kalacak
        clipX={0}
        clipY={0}
        clipWidth={stageSize.width}
        clipHeight={stageSize.height}
        style={{
          cursor: cursorState,
          backgroundColor: '#000000'
        }}
      >
        {/* Base Image Layer */}
        <Layer>
          {image && image.naturalWidth > 0 && image.naturalHeight > 0 && (
            <Image
              image={image}
              width={image.naturalWidth}
              height={image.naturalHeight}
              scaleX={imageScale * zoomLevel}
              scaleY={imageScale * zoomLevel}
              x={panPosition.x}
              y={panPosition.y}
              listening={false}
            />
          )}
        </Layer>

        {/* Detected Regions Layer */}
        <Layer>
          {detectedRegions.map((region) => (
            <Rect
              key={`detected-${region.id}`}
              id={`detected-${region.id}`}
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill={region.color || '#ef4444'}
              stroke="#ffffff"
              strokeWidth={2}
              opacity={0.4}
              listening={false}
            />
          ))}
        </Layer>

        {/* User Regions Layer */}
        <Layer>
          {userRegions.map((region) => {
            if (region.type === 'line') {
              return (
                <Line
                  key={`user-${region.id}`}
                  id={`user-${region.id}`}
                  points={region.points}
                  stroke={region.stroke}
                  strokeWidth={region.strokeWidth}
                  opacity={region.opacity}
                  lineCap="round"
                  lineJoin="round"
                  draggable
                  onClick={handleShapeClick}
                  onDragEnd={handleShapeChange}
                  onDblClick={handleShapeDoubleClick}
                />
              );
            } else if (region.type === 'circle') {
              return (
                <Circle
                  key={`user-${region.id}`}
                  id={`user-${region.id}`}
                  x={region.x}
                  y={region.y}
                  radius={region.radius}
                  fill={region.fill}
                  stroke={region.stroke}
                  strokeWidth={region.strokeWidth}
                  opacity={region.opacity}
                  draggable
                  onClick={handleShapeClick}
                  onDragEnd={handleShapeChange}
                  onTransformEnd={handleShapeChange}
                  onDblClick={handleShapeDoubleClick}
                />
              );
            } else {
              return (
                <Rect
                  key={`user-${region.id}`}
                  id={`user-${region.id}`}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill={region.fill}
                  stroke={region.stroke}
                  strokeWidth={region.strokeWidth}
                  opacity={region.opacity}
                  draggable
                  onClick={handleShapeClick}
                  onDragEnd={handleShapeChange}
                  onTransformEnd={handleShapeChange}
                  onDblClick={handleShapeDoubleClick}
                />
              );
            }
          })}
          
          {/* Yeni çizilen şekil */}
          {newShape && newShape.type === 'rect' && (
            <Rect
              x={newShape.x}
              y={newShape.y}
              width={newShape.width}
              height={newShape.height}
              fill={paintingConfig.fillColor}
              stroke={paintingConfig.strokeColor}
              strokeWidth={paintingConfig.strokeWidth}
              opacity={paintingConfig.opacity}
              listening={false}
            />
          )}
          
          {newShape && newShape.type === 'circle' && (
            <Circle
              x={newShape.x}
              y={newShape.y}
              radius={newShape.radius}
              fill={paintingConfig.fillColor}
              stroke={paintingConfig.strokeColor}
              strokeWidth={paintingConfig.strokeWidth}
              opacity={paintingConfig.opacity}
              listening={false}
            />
          )}
          
          {/* Yeni çizilen çizgi */}
          {isDrawingLine && currentLine.length > 0 && (
            <Line
              points={currentLine}
              stroke={paintingConfig.fillColor}
              strokeWidth={3}
              opacity={paintingConfig.opacity}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>

        {/* Transformer Layer */}
        <Layer>
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
      
    </div>
  );
};

export default XrayCanvas;
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Circle, Line, Transformer } from 'react-konva';
import { calculateCanvasSize, createRectConfig, generateId, mouseToCanvasCoords } from '../utils/canvasHelpers';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Cursor yönetimi için hook
  const { cursorState } = useCursorManager(
    selectedTool, 
    isDrawing || isDrawingLine, 
    isPanning
  );

  /**
   * Canvas boyutunu hesapla ve güncelle
   */
  const updateStageSize = useCallback(() => {
    if (!image) return;
    
    const container = stageRef.current?.container();
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const { width, height } = calculateCanvasSize(
      containerRect.width,
      containerRect.height,
      image.naturalWidth,
      image.naturalHeight
    );
    
    setStageSize({ width, height });
  }, [image]);

  useEffect(() => {
    updateStageSize();
    window.addEventListener('resize', updateStageSize);
    return () => window.removeEventListener('resize', updateStageSize);
  }, [updateStageSize]);

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
        const shapes = stage.find('Rect, Circle, Line');
        
        // Tıklanan pozisyondaki şekli bul ve sil
        shapes.forEach(shape => {
          let isHit = false;
          
          if (shape.getClassName() === 'Line') {
            // Line için özel hit detection
            const points = shape.points();
            for (let i = 0; i < points.length - 2; i += 2) {
              const x1 = points[i];
              const y1 = points[i + 1];
              const x2 = points[i + 2];
              const y2 = points[i + 3];
              
              // Nokta-çizgi mesafesi hesapla
              const distance = Math.abs((y2 - y1) * pos.x - (x2 - x1) * pos.y + x2 * y1 - y2 * x1) / 
                              Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
              
              if (distance < 10) { // 10px tolerans
                isHit = true;
                break;
              }
            }
          } else {
            // Rect ve Circle için normal hit detection
            const shapeX = shape.x();
            const shapeY = shape.y();
            
            if (shape.getClassName() === 'Circle') {
              const radius = shape.radius();
              const distance = Math.sqrt(Math.pow(pos.x - shapeX, 2) + Math.pow(pos.y - shapeY, 2));
              isHit = distance <= radius;
            } else {
              // Rect
              const shapeWidth = shape.width() * shape.scaleX();
              const shapeHeight = shape.height() * shape.scaleY();
              isHit = pos.x >= shapeX && pos.x <= shapeX + shapeWidth &&
                      pos.y >= shapeY && pos.y <= shapeY + shapeHeight;
            }
          }
          
          if (isHit) {
            if (onUserRegionDelete) {
              onUserRegionDelete(shape.id());
            }
            return; // İlk bulunan şekli sil ve dur
          }
        });
      } else {
        // Pan modu
        setIsPanning(true);
      }
    }
  }, [selectedTool, onUserRegionDelete, getAccuratePosition]);

  /**
   * Stage mouse hareket olayı
   */
  const handleStageMouseMove = useCallback((e) => {
    const pos = getAccuratePosition(e);
    
    // Mouse pozisyonunu güncelle (debug için)
    setMousePosition(pos);
    
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
  }, [isDrawing, isDrawingLine, newShape, selectedTool, getAccuratePosition]);


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
    if (!isCtrlPressed && (selectedTool === 'pen' || selectedTool === 'rect' || selectedTool === 'circle')) {
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
    
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    stage.scale({ x: newScale, y: newScale });
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    stage.position(newPos);
    stage.batchDraw();
    
    if (onZoomChange) {
      onZoomChange(newScale);
    }
    
  }, [onZoomChange, selectedTool]);

  if (!image) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        border: '2px dashed #334155',
        borderRadius: '12px',
        color: '#94a3b8'
      }}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '48px', marginBottom: '16px'}}>🖼️</div>
          <p style={{fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0'}}>X-ray görseli yükleyin</p>
          <p style={{fontSize: '14px', margin: 0}}>Canvas burada görünecek</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0f172a',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid #334155'
    }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoomLevel}
        scaleY={zoomLevel}
        onMouseDown={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        draggable={selectedTool === 'eraser' || selectedTool === null} // Silgi aracı veya hiçbir araç seçili değilken pan aktif
        style={{
          cursor: cursorState
        }}
      >
        {/* Base Image Layer */}
        <Layer>
          <Image
            image={image}
            width={stageSize.width}
            height={stageSize.height}
            listening={false}
          />
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
      
      {/* Debug Panel - Koordinat Bilgileri */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          border: '1px solid #333'
        }}>
          <div>Mouse: ({Math.round(mousePosition.x)}, {Math.round(mousePosition.y)})</div>
          <div>Tool: {selectedTool}</div>
          <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
          <div>Drawing: {isDrawing ? 'Yes' : 'No'}</div>
          <div>Panning: {isPanning ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default XrayCanvas;
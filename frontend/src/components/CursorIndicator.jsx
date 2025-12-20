import React from 'react';

/**
 * Cursor durumunu gösteren indicator bileşeni
 * SOLID - Single Responsibility: Sadece cursor durumunu göstermekten sorumlu
 */
const CursorIndicator = ({ 
  cursorState, 
  selectedTool, 
  isDrawing = false, 
  isPanning = false,
  position = { x: 0, y: 0 },
  visible = false 
}) => {
  if (!visible) return null;

  const getCursorIcon = () => {
    if (isPanning) return '✋';
    if (isDrawing) return '✏️';
    
    switch (selectedTool) {
      case 'pen':
        return '✏️';
      case 'rect':
        return '▭';
      case 'circle':
        return '○';
      case 'eraser':
        return '🧹';
      default:
        return '↖️';
    }
  };

  const getCursorColor = () => {
    if (isPanning) return '#ef4444';
    if (isDrawing) return '#3b82f6';
    
    switch (selectedTool) {
      case 'pen':
        return '#3b82f6';
      case 'rect':
        return '#10b981';
      case 'circle':
        return '#f59e0b';
      case 'eraser':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        zIndex: 9999,
        pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: `2px solid ${getCursorColor()}`,
        transform: 'translateY(-100%)'
      }}
    >
      <span style={{ fontSize: '14px' }}>{getCursorIcon()}</span>
      <span style={{ color: getCursorColor(), fontWeight: '600' }}>
        {cursorState.toUpperCase()}
      </span>
    </div>
  );
};

export default CursorIndicator;

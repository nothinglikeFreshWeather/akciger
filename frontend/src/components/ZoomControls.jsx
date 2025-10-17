import React from 'react';

/**
 * Zoom kontrolleri bileşeni - Koyu tema
 */
const ZoomControls = ({
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  disabled = false
}) => {
  const handleZoomIn = () => {
    if (!disabled && onZoomIn) {
      onZoomIn();
    }
  };

  const handleZoomOut = () => {
    if (!disabled && onZoomOut) {
      onZoomOut();
    }
  };

  const handleZoomReset = () => {
    if (!disabled && onZoomReset) {
      onZoomReset();
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
      {/* Kompakt Zoom Butonları */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px'}}>
        <button
          onClick={handleZoomOut}
          disabled={disabled}
          style={{
            padding: '6px',
            backgroundColor: disabled ? '#374151' : '#475569',
            color: disabled ? '#64748b' : '#e2e8f0',
            border: '1px solid #64748b',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          title="Zoom Out (-)"
        >
          −
        </button>

        <button
          onClick={handleZoomReset}
          disabled={disabled}
          style={{
            padding: '6px',
            backgroundColor: disabled ? '#374151' : '#3b82f6',
            color: disabled ? '#64748b' : 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          title="Reset Zoom (1:1)"
        >
          ↻
        </button>

        <button
          onClick={handleZoomIn}
          disabled={disabled}
          style={{
            padding: '6px',
            backgroundColor: disabled ? '#374151' : '#475569',
            color: disabled ? '#64748b' : '#e2e8f0',
            border: '1px solid #64748b',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          title="Zoom In (+)"
        >
          +
        </button>
      </div>

      {/* Kompakt Zoom Göstergesi */}
      <div style={{
        backgroundColor: '#374151',
        borderRadius: '4px',
        padding: '6px',
        border: '1px solid #4b5563',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{fontSize: '9px', color: '#94a3b8', fontWeight: '500'}}>Zoom</span>
        <span style={{
          fontSize: '11px',
          color: '#3b82f6',
          fontWeight: '700',
          fontFamily: 'monospace'
        }}>
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
    </div>
  );
};

export default ZoomControls;
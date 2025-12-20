import React from 'react';

/**
 * Zoom kontrolleri bileşeni - Word 2013 Style
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
    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
      {/* Zoom Butonları */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px'}}>
        <button
          onClick={handleZoomOut}
          disabled={disabled}
          style={{
            padding: '10px',
            backgroundColor: disabled ? '#F5F5F5' : '#FFFFFF',
            color: disabled ? '#BDBDBD' : '#1a1a1a',
            border: '1px solid',
            borderColor: disabled ? '#E0E0E0' : '#E8E8E8',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.borderColor = '#1E88E5';
              e.target.style.color = '#1E88E5';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#FFFFFF';
              e.target.style.borderColor = '#E8E8E8';
              e.target.style.color = '#1a1a1a';
            }
          }}
          title="Zoom Out"
        >
          −
        </button>

        <button
          onClick={handleZoomReset}
          disabled={disabled}
          style={{
            padding: '10px',
            backgroundColor: disabled ? '#F5F5F5' : '#1E88E5',
            color: disabled ? '#BDBDBD' : 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            letterSpacing: '-0.01em',
            boxShadow: disabled ? 'none' : '0 2px 4px rgba(30, 136, 229, 0.2)'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#1976D2';
              e.target.style.boxShadow = '0 4px 8px rgba(30, 136, 229, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#1E88E5';
              e.target.style.boxShadow = '0 2px 4px rgba(30, 136, 229, 0.2)';
            }
          }}
          title="Reset Zoom"
        >
          1:1
        </button>

        <button
          onClick={handleZoomIn}
          disabled={disabled}
          style={{
            padding: '10px',
            backgroundColor: disabled ? '#F5F5F5' : '#FFFFFF',
            color: disabled ? '#BDBDBD' : '#1a1a1a',
            border: '1px solid',
            borderColor: disabled ? '#E0E0E0' : '#E8E8E8',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.borderColor = '#1E88E5';
              e.target.style.color = '#1E88E5';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.target.style.backgroundColor = '#FFFFFF';
              e.target.style.borderColor = '#E8E8E8';
              e.target.style.color = '#1a1a1a';
            }
          }}
          title="Zoom In"
        >
          +
        </button>
      </div>

      {/* Zoom Göstergesi */}
      <div style={{
        backgroundColor: '#F5F5F5',
        borderRadius: '8px',
        padding: '10px 12px',
        border: '1px solid #E8E8E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{fontSize: '12px', color: '#757575', fontWeight: '500', letterSpacing: '-0.01em'}}>Zoom</span>
        <span style={{
          fontSize: '14px',
          color: '#1E88E5',
          fontWeight: '600',
          fontFamily: 'monospace',
          letterSpacing: '-0.02em'
        }}>
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
    </div>
  );
};

export default ZoomControls;
import React from 'react';
import { COLOR_PALETTE } from '../utils/mockData';

/**
 * Renk seçici bileşeni - Koyu tema
 */
const ColorPicker = ({
  selectedColor = '#ef4444',
  opacity = 0.4,
  onColorChange,
  onOpacityChange,
  disabled = false
}) => {
  const handleColorSelect = (color) => {
    if (!disabled && onColorChange) {
      onColorChange(color);
    }
  };

  const handleOpacityChange = (event) => {
    if (!disabled && onOpacityChange) {
      const newOpacity = parseFloat(event.target.value);
      onOpacityChange(newOpacity);
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
      {/* Kompakt Renk Paletleri */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px'}}>
        {COLOR_PALETTE.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color.value)}
            disabled={disabled}
            style={{
              position: 'relative',
              width: '100%',
              height: '28px',
              borderRadius: '4px',
              border: selectedColor === color.value ? '2px solid #60a5fa' : '1px solid #4b5563',
              backgroundColor: color.value,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s',
              boxShadow: selectedColor === color.value ? '0 0 8px rgba(96,165,250,0.5)' : 'none'
            }}
            title={color.name}
          >
            {selectedColor === color.value && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px'
                }}>
                  ✓
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Kompakt Şeffaflık Kontrolü */}
      <div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
          <span style={{fontSize: '10px', color: '#94a3b8', fontWeight: '500'}}>Opacity</span>
          <span style={{
            fontSize: '10px',
            color: '#3b82f6',
            fontWeight: '600',
            backgroundColor: '#1e293b',
            padding: '1px 6px',
            borderRadius: '3px'
          }}>
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={handleOpacityChange}
          disabled={disabled}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            WebkitAppearance: 'none',
            appearance: 'none',
            background: `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${opacity * 100}%, #374151 ${opacity * 100}%, #374151 100%)`
          }}
        />
      </div>

      {/* Kompakt Seçili Renk Önizlemesi */}
      <div style={{
        backgroundColor: '#374151',
        borderRadius: '4px',
        padding: '6px',
        border: '1px solid #4b5563',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '3px',
            backgroundColor: selectedColor,
            opacity: opacity,
            border: '1px solid #64748b',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
          }}
        ></div>
        <div style={{flex: 1}}>
          <div style={{fontSize: '9px', color: '#cbd5e1', fontFamily: 'monospace'}}>
            {selectedColor.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
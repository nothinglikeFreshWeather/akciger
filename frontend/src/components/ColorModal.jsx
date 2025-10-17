import React from 'react';
import { COLOR_PALETTE } from '../utils/mockData';

/**
 * Renk seçimi modal popup bileşeni
 * SOLID - Single Responsibility: Sadece renk seçiminden sorumlu
 */
const ColorModal = ({
  isOpen,
  onClose,
  selectedColor = '#ef4444',
  opacity = 0.4,
  onColorChange,
  onOpacityChange
}) => {
  if (!isOpen) return null;

  const handleColorSelect = (color) => {
    if (onColorChange) {
      onColorChange(color);
    }
  };

  const handleOpacityChange = (event) => {
    if (onOpacityChange) {
      const newOpacity = parseFloat(event.target.value);
      onOpacityChange(newOpacity);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          minWidth: '300px',
          maxWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #334155',
          paddingBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#f1f5f9',
            margin: 0
          }}>
            🎨 Renk Seçimi
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#374151';
              e.target.style.color = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#94a3b8';
            }}
          >
            ×
          </button>
        </div>

        {/* Renk Paletleri */}
        <div style={{marginBottom: '20px'}}>
          <div style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#cbd5e1',
            marginBottom: '12px'
          }}>
            Renk Paleti
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'}}>
            {COLOR_PALETTE.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: selectedColor === color.value ? '3px solid #60a5fa' : '2px solid #4b5563',
                  backgroundColor: color.value,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedColor === color.value ? '0 0 12px rgba(96,165,250,0.5)' : 'none'
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
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      ✓
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Şeffaflık Kontrolü */}
        <div style={{marginBottom: '20px'}}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{fontSize: '14px', color: '#cbd5e1', fontWeight: '500'}}>
              Şeffaflık
            </span>
            <span style={{
              fontSize: '14px',
              color: '#3b82f6',
              fontWeight: '600',
              backgroundColor: '#1e293b',
              padding: '4px 12px',
              borderRadius: '6px'
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
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${opacity * 100}%, #374151 ${opacity * 100}%, #374151 100%)`
            }}
          />
        </div>

        {/* Seçili Renk Önizlemesi */}
        <div style={{
          backgroundColor: '#374151',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #4b5563',
          marginBottom: '20px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                backgroundColor: selectedColor,
                opacity: opacity,
                border: '2px solid #64748b',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
            ></div>
            <div>
              <div style={{fontSize: '14px', color: '#cbd5e1', fontFamily: 'monospace', marginBottom: '4px'}}>
                {selectedColor.toUpperCase()}
              </div>
              <div style={{fontSize: '12px', color: '#94a3b8'}}>
                Opaklık: {Math.round(opacity * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#374151',
              color: '#cbd5e1',
              border: '1px solid #4b5563',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#4b5563';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#374151';
            }}
          >
            İptal
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorModal;

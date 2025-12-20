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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          padding: '20px',
          border: '2px solid #2B579A',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: '300px',
          maxWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Word 2013 Style */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #2B579A',
          paddingBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#2B579A',
            margin: 0
          }}>
            🎨 Renk Seçimi
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid transparent',
              color: '#666666',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.color = '#333333';
              e.target.style.borderColor = '#D0D0D0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#666666';
              e.target.style.borderColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Renk Paletleri - Word 2013 Style */}
        <div style={{marginBottom: '20px'}}>
          <div style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#333333',
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
                  borderRadius: '4px',
                  border: selectedColor === color.value ? '3px solid #2B579A' : '2px solid #D0D0D0',
                  backgroundColor: color.value,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedColor === color.value ? '0 0 8px rgba(43,87,154,0.4)' : 'none'
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

        {/* Şeffaflık Kontrolü - Word 2013 Style */}
        <div style={{marginBottom: '20px'}}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{fontSize: '14px', color: '#333333', fontWeight: '500'}}>
              Şeffaflık
            </span>
            <span style={{
              fontSize: '14px',
              color: '#2B579A',
              fontWeight: '600',
              backgroundColor: '#E6F2FF',
              padding: '4px 12px',
              borderRadius: '4px',
              border: '1px solid #2B579A'
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
              background: `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${opacity * 100}%, #D0D0D0 ${opacity * 100}%, #D0D0D0 100%)`,
              border: '1px solid #C0C0C0'
            }}
          />
        </div>

        {/* Seçili Renk Önizlemesi - Word 2013 Style */}
        <div style={{
          backgroundColor: '#F5F5F5',
          borderRadius: '4px',
          padding: '16px',
          border: '1px solid #D0D0D0',
          marginBottom: '20px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '4px',
                backgroundColor: selectedColor,
                opacity: opacity,
                border: '2px solid #C0C0C0',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            ></div>
            <div>
              <div style={{fontSize: '14px', color: '#333333', fontFamily: 'monospace', marginBottom: '4px', fontWeight: '600'}}>
                {selectedColor.toUpperCase()}
              </div>
              <div style={{fontSize: '12px', color: '#666666'}}>
                Opaklık: {Math.round(opacity * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Word 2013 Style */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffffff',
              color: '#333333',
              border: '1px solid #D0D0D0',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.borderColor = '#2B579A';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#D0D0D0';
            }}
          >
            İptal
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2B579A',
              color: 'white',
              border: '1px solid #1E4D72',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1E4D72';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2B579A';
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

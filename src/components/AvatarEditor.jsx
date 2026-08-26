import { useState, useRef } from 'react';
import { ZoomIn, Check, X } from 'lucide-react';

export default function AvatarEditor({ tempImage, initialScale = 1, initialPosition = { x: 0, y: 0 }, onSave, onCancel }) {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  const touchStartDist = useRef(null);
  const initialScaleForPinch = useRef(1);

  const handleImageLoad = (e) => {
    const img = e.target;
    if (img.width && img.height) {
      setImageAspectRatio(img.height / img.width);
    }
  };

  const updatePosition = (newX, newY, currentScale) => {
    const baseImgWidth = 200;
    const circleSize = 120;
    
    const currentImgWidth = baseImgWidth * currentScale;
    const currentImgHeight = currentImgWidth * imageAspectRatio;

    const maxX = Math.max(0, (currentImgWidth - circleSize) / 2);
    const maxY = Math.max(0, (currentImgHeight - circleSize) / 2);

    const clampedX = Math.max(-maxX, Math.min(maxX, newX));
    const clampedY = Math.max(-maxY, Math.min(maxY, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updatePosition(e.clientX - dragStart.x, e.clientY - dragStart.y, scale);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX - dragStart.x, touch.clientY - dragStart.y, scale);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const currentImgWidth = 200 * scale;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.90)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '360px',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', color: 'white', textAlign: 'center' }}>Ajustar Foto</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
          Ajuste o zoom e arraste para posicionar
        </p>

        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              touchStartDist.current = dist;
              initialScaleForPinch.current = scale;
            } else if (e.touches.length === 1) {
              handleTouchStart(e);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && touchStartDist.current) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              const factor = dist / touchStartDist.current;
              const newScale = Math.max(0.3, Math.min(2.5, initialScaleForPinch.current * factor));
              
              setScale(newScale);
              updatePosition(position.x, position.y, newScale);
            } else if (e.touches.length === 1) {
              handleTouchMove(e);
            }
          }}
          onTouchEnd={(e) => {
            if (e.touches.length < 2) {
              touchStartDist.current = null;
            }
            handleTouchEnd(e);
        }}
          style={{
            width: '260px',
            height: '260px',
            position: 'relative',
            cursor: 'grab',
            marginBottom: '16px',
            overflow: 'hidden',
            borderRadius: '12px',
            background: '#111',
            touchAction: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={tempImage}
            onLoad={handleImageLoad}
            alt="Fundo Transparente"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
              width: `${currentImgWidth}px`,
              height: 'auto',
              maxWidth: 'none',
              opacity: 0.25,
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />

          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'absolute',
            border: '3px solid var(--primary)',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)',
            background: '#000',
            pointerEvents: 'none'
          }}>
            <img
              src={tempImage}
              alt="Nítido no Círculo"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                width: `${currentImgWidth}px`,
                height: 'auto',
                maxWidth: 'none',
                opacity: 1,
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ZoomIn size={16} color="var(--text-secondary)" />
          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            value={scale}
            onChange={(e) => {
              const newScale = parseFloat(e.target.value);
              setScale(newScale);
              updatePosition(position.x, position.y, newScale);
            }}
            style={{
              flex: 1,
              accentColor: 'var(--primary)',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '32px', textAlign: 'right' }}>
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <X size={16} /> Cancelar
          </button>
          <button
            onClick={() => onSave({ avatarUrl: tempImage, avatarPosition: position, avatarScale: scale })}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--primary-gradient)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
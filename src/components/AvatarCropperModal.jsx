import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-react';

export default function AvatarCropperModal({ imageSrc, onCropComplete, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const CROP_SIZE = 240; // Tamanho do viewport de corte em pixels

  // Carrega as dimensões naturais da imagem
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  // Cálculo da escala base para cobrir o círculo de corte
  const baseScale = imageSize.width && imageSize.height
    ? Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height)
    : 1;

  const currentWidth = imageSize.width * baseScale * zoom;
  const currentHeight = imageSize.height * baseScale * zoom;

  // Limita o arraste para não deixar a imagem escapar do círculo
  const maxOffsetX = Math.max(0, (currentWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (currentHeight - CROP_SIZE) / 2);

  const clampPosition = useCallback((x, y, currentZ) => {
    const z = currentZ || zoom;
    const w = imageSize.width * baseScale * z;
    const h = imageSize.height * baseScale * z;
    const maxX = Math.max(0, (w - CROP_SIZE) / 2);
    const maxY = Math.max(0, (h - CROP_SIZE) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }, [baseScale, imageSize.height, imageSize.width, zoom]);

  // Eventos de Arraste (Pointer / Touch / Mouse)
  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition(clampPosition(newX, newY, zoom));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe ignore
    }
  };

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);
    setPosition((prev) => clampPosition(prev.x, prev.y, clampedZoom));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Realiza o corte real no Canvas e gera o Blob final de 400x400
  const handleConfirmCrop = () => {
    if (!imageRef.current) return;

    const OUTPUT_SIZE = 400; // Resolução da foto recortada
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    const ratio = OUTPUT_SIZE / CROP_SIZE;
    const renderW = currentWidth * ratio;
    const renderH = currentHeight * ratio;

    const dx = (OUTPUT_SIZE - renderW) / 2 + position.x * ratio;
    const dy = (OUTPUT_SIZE - renderH) / 2 + position.y * ratio;

    ctx.drawImage(imageRef.current, dx, dy, renderW, renderH);

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(croppedFile, previewUrl);
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="login-glass-card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>
          Ajustar Foto de Perfil
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Move size={14} /> Arraste para mover e use a barra para zoom
        </p>

        {/* Viewport de Corte com Máscara Circular */}
        <div 
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: `${CROP_SIZE}px`,
            height: `${CROP_SIZE}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            border: '3px solid var(--primary-color, #00d2ff)',
            boxShadow: '0 0 20px rgba(0, 210, 255, 0.3)',
            touchAction: 'none',
            userSelect: 'none',
            background: '#111'
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Para recortar"
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${currentWidth}px`,
              height: `${currentHeight}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />
        </div>

        {/* Controles de Zoom e Reset */}
        <div style={{ width: '100%', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            >
              <ZoomOut size={18} />
            </button>
            <input 
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: 'var(--primary-color, #00d2ff)',
                cursor: 'pointer'
              }}
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Resetar posição e zoom"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="login-btn"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginTop: '0'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="login-btn"
              style={{
                flex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '0'
              }}
            >
              <Check size={18} /> Aplicar Corte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


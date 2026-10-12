import { useState, useRef, useCallback, useId } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';
import '../styles/perfil.css';

export default function AvatarCropperModal({ imageSrc, onCropComplete, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef(null);
  const titleId = useId();
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

  // Teclado: setas movem a foto, +/- dão zoom (o arraste não é a única forma de ajustar — DESIGN.md §10).
  const handleKeyDown = (e) => {
    const step = 10;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      setPosition((p) => clampPosition(p.x + moves[e.key][0], p.y + moves[e.key][1], zoom));
    } else if (e.key === '+' || e.key === '=') handleZoomChange(zoom + 0.2);
    else if (e.key === '-') handleZoomChange(zoom - 0.2);
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay-fixed ds-dialog-scrim p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-card-fixed ds-dialog relative flex w-full max-w-[380px] flex-col items-center rounded-[26px] border border-line-2 bg-surface px-5 pb-5 pt-6 text-text"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-text-3"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id={titleId} className="text-[19px] font-extrabold">Ajustar foto</h2>
        <p className="mb-4 mt-1 text-center text-[13px] text-text-2">Arraste para posicionar e use a barra para dar zoom.</p>

        {/* Viewport de corte com máscara circular */}
        <div
          ref={containerRef}
          tabIndex={0}
          role="application"
          aria-label="Área de corte. Use as setas para mover e + ou - para zoom."
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative touch-none select-none overflow-hidden rounded-full bg-bg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            width: `${CROP_SIZE}px`,
            height: `${CROP_SIZE}px`,
            boxShadow: '0 0 0 3px var(--bg), 0 0 0 6px #5B3BE0'
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 select-none"
            style={{
              width: `${currentWidth}px`,
              height: `${currentHeight}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
            }}
          />
        </div>

        {/* Zoom e reset */}
        <div className="mt-5 flex w-full items-center gap-1">
          <button type="button" onClick={() => handleZoomChange(zoom - 0.2)} aria-label="Diminuir zoom" className="flex h-11 w-11 items-center justify-center rounded-full text-text-2">
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="h-11 flex-1 cursor-pointer accent-[#5B3BE0]"
          />
          <button type="button" onClick={() => handleZoomChange(zoom + 0.2)} aria-label="Aumentar zoom" className="flex h-11 w-11 items-center justify-center rounded-full text-text-2">
            <ZoomIn size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={handleReset} aria-label="Voltar ao enquadramento original" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text-2">
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex w-full gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button type="button" onClick={handleConfirmCrop} className="btn btn-primary flex-[2]">
            <Check size={18} aria-hidden="true" /> Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}

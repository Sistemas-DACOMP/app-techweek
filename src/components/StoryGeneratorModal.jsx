import { useState, useRef, useEffect } from 'react';
import { X, Share2, Loader2, Download } from 'lucide-react';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const drawRoundRect = (ctx, x, y, width, height, radius, fill = true, stroke = false) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
};

export default function StoryGeneratorModal({ isOpen, onClose, mission, onComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageBlob, setImageBlob] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      generateImage();
    } else {
      setImageBlob(null);
      setDataUrl(null);
      setIsProcessing(false);
    }
  }, [isOpen, mission]);

  const generateImage = async () => {
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (_e) {
          // segue com fonte disponível
        }
      }

      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      // 1. Fundo oficial (public/moldura.png com fallback para /story-bg.png)
      let bgLoaded = false;
      for (const src of ['/moldura.png', '/story-bg.png']) {
        try {
          const bgImg = await loadImage(src);
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          bgLoaded = true;
          break;
        } catch (_e) {
          // tenta próximo caminho
        }
      }

      if (!bgLoaded) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#070B1E');
        bgGrad.addColorStop(0.5, '#0F1738');
        bgGrad.addColorStop(1, '#1E1145');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Cálculo de dias até o início da FACOM TechWeek (21/10/2026)
      const targetDate = new Date('2026-10-21T00:00:00-03:00');
      const now = new Date();
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 3. Bloco central com forte hierarquia tipográfica (abaixo do logo superior da moldura)
      if (diffDays > 0) {
        const topWord = diffDays === 1 ? 'FALTA' : 'FALTAM';
        const bottomWord = diffDays === 1 ? 'DIA' : 'DIAS';

        // Palavra FALTAM (branco, grande e em destaque)
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 18;
        ctx.font = '900 130px "Montserrat", sans-serif';
        ctx.fillText(topWord, canvas.width / 2, 720);
        ctx.restore();

        // Número X logo abaixo (azul TechWeek #38BDF8, gigante para impacto máximo)
        ctx.save();
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
        ctx.shadowBlur = 48;
        ctx.font = '900 440px "Montserrat", sans-serif';
        ctx.fillText(`${diffDays}`, canvas.width / 2, 1025);
        ctx.restore();

        // Palavra DIAS abaixo do número (branco, grande)
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 18;
        ctx.font = '900 130px "Montserrat", sans-serif';
        ctx.fillText(bottomWord, canvas.width / 2, 1310);
        ctx.restore();
      } else {
        // Durante o evento
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 110px "Montserrat", sans-serif';
        ctx.fillText('COMEÇOU!', canvas.width / 2, 860);

        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
        ctx.shadowBlur = 45;
        ctx.font = '800 50px "Montserrat", sans-serif';
        ctx.fillText('#EU VOU', canvas.width / 2, 1100);
        ctx.restore();
      }

      // 4. Frase de impacto: "O MAIOR EVENTO TECH E INOVAÇÃO QUE A UFU JÁ RECEBEU" (maiúscula e fonte mais fina)
      ctx.save();
      ctx.fillStyle = '#E2E8F0';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 12;
      ctx.font = '600 38px "Montserrat", sans-serif';
      ctx.fillText('O MAIOR EVENTO TECH E INOVAÇÃO', canvas.width / 2, 1485);
      ctx.fillText('QUE A UFU JÁ RECEBEU', canvas.width / 2, 1545);
      ctx.restore();

      // 5. Selo #EuVou (fonte ajustada e largura dinâmica com respiro para nunca vazar do balão)
      const rawTag = (mission?.customHashtag || '#EuVou').trim();
      const mainHashtag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;

      ctx.save();
      ctx.font = '800 28px "Montserrat", sans-serif';
      const textMetrics = ctx.measureText(mainHashtag);
      const textW = textMetrics.width;
      const badgeW = Math.max(260, textW + 60);
      const badgeH = 64;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = 1650;

      ctx.fillStyle = 'rgba(15, 23, 56, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2, true, true);

      ctx.fillStyle = '#38BDF8';
      ctx.fillText(mainHashtag, canvas.width / 2, badgeY + badgeH / 2 + 2);
      ctx.restore();

      canvas.toBlob((blob) => {
        setImageBlob(blob);
        setDataUrl(canvas.toDataURL('image/png'));
        setIsProcessing(false);
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao gerar imagem de Story:', err);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = 'techweek-story-euvou.png';
    link.href = dataUrl;
    link.click();
    if (onComplete) onComplete();
  };

  const handleShare = async () => {
    if (!imageBlob) return;
    const file = new File([imageBlob], 'techweek-story-euvou.png', { type: 'image/png' });

    let shared = false;
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'FACOM TechWeek 2026',
          text: 'O maior evento Tech e inovação que a UFU já recebeu! #EuVou #FACOMTECHWEEK'
        });
        shared = true;
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Erro ao compartilhar:', err);
        }
      }
    } else {
      handleDownload();
      return;
    }

    if (shared && onComplete) {
      onComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[22px] bg-surface p-5 border border-line-2 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-text-2 hover:text-text transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-extrabold text-text mt-1 mb-1">Compartilhar nos Stories</h3>
        <p className="text-xs text-text-2 text-center mb-4">
          Sua arte oficial com contagem regressiva está pronta para postar!
        </p>

        <div className="relative aspect-[9/16] w-full max-w-[235px] bg-[#070B1E] rounded-2xl overflow-hidden mb-4 border border-line-2 shadow-lg">
          <canvas ref={canvasRef} className="hidden" />
          {isProcessing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="text-xs font-bold text-text-2">Gerando arte...</span>
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt="Prévia do Story TechWeek" className="w-full h-full object-contain" />
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={isProcessing || !imageBlob}
            className="btn btn-primary w-full h-12 text-sm font-extrabold shadow-lg"
            style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
            {isProcessing ? 'Gerando...' : 'Compartilhar no Stories'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isProcessing || !dataUrl}
            className="btn btn-secondary w-full h-10 text-xs font-bold"
          >
            <Download size={16} />
            Baixar imagem (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}

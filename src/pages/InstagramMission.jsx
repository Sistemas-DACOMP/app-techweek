import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Share2, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import logoTw from '../assets/logo-tw.png';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import { uploadMissionPhoto } from '../lib/gameplay';
import '../styles/conquistas.css';

const alanSvgString = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bB" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#1e3a8a" /></linearGradient><linearGradient id="aB" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.4" /><stop offset="100%" stop-color="#2563eb" stop-opacity="0" /></linearGradient><linearGradient id="eB" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e2e8f0" /><stop offset="100%" stop-color="#94a3b8" /></linearGradient><clipPath id="cB"><rect x="40" y="40" width="120" height="120" rx="16" /></clipPath></defs><g><path d="M 40 100 L 15 70 L 30 30" fill="none" stroke="#1e3a8a" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="20" y="20" width="20" height="20" rx="6" fill="#2563eb"/></g><g><path d="M 160 100 L 185 130 L 170 180" fill="none" stroke="#1e3a8a" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="160" y="170" width="20" height="20" rx="6" fill="#2563eb"/></g><rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bB)"/><g clip-path="url(#cB)"><path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#aB)"/><path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)"/></g><g><rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eB)"/><rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="77" y="77" width="6" height="6" rx="2" fill="#fff"/></g><g><rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eB)"/><rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="127" y="77" width="6" height="6" rx="2" fill="#fff"/></g></svg>`;

const adaSvgString = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9333ea" /><stop offset="100%" stop-color="#4c1d95" /></linearGradient><linearGradient id="aP" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4c1d95" stop-opacity="0.4" /><stop offset="100%" stop-color="#9333ea" stop-opacity="0" /></linearGradient><linearGradient id="eP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e2e8f0" /><stop offset="100%" stop-color="#94a3b8" /></linearGradient><clipPath id="cP"><rect x="40" y="40" width="120" height="120" rx="16" /></clipPath></defs><g><path d="M 40 100 L 15 130 L 30 180" fill="none" stroke="#4c1d95" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="20" y="170" width="20" height="20" rx="6" fill="#9333ea"/></g><g><path d="M 160 100 L 185 70 L 170 30" fill="none" stroke="#4c1d95" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="160" y="20" width="20" height="20" rx="6" fill="#9333ea"/></g><rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bP)"/><g clip-path="url(#cP)"><path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#aP)"/><path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)"/></g><g><rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eP)"/><rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="77" y="77" width="6" height="6" rx="2" fill="#fff"/></g><g><rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eP)"/><rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="127" y="77" width="6" height="6" rx="2" fill="#fff"/></g></svg>`;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

export default function InstagramMission() {
  const { completeChallenge, hasCompletedChallenge, hasSymplaTicket } = useUser();
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showSymplaModal, setShowSymplaModal] = useState(false);
  
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasCompletedChallenge('instagram_story')) {
      setIsComplete(true);
    }
  }, [hasCompletedChallenge]);

  // Cleanup camera stream if component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      stopAllMediaTracks();
    };
  }, []);

  const startCamera = async () => {
    setIsCameraOpen(true);
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access denied or error:", err);
      alert("Não foi possível acessar a câmera. Tente enviar uma imagem da galeria.");
      setIsCameraOpen(false);
    }
  };

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setIsProcessing(true);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    
    const dataUrl = tempCanvas.toDataURL('image/png');
    
    // Stop camera
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);

    try {
      const userImg = await loadImage(dataUrl);
      const logoImg = await loadImage(logoTw);
      const alanImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(alanSvgString)}`);
      const adaImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(adaSvgString)}`);
      
      drawFrame(userImg, logoImg, alanImg, adaImg);
      setImage('captured');
    } catch (err) {
      console.error("Error drawing frame elements:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isCameraOpen && videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const userImg = await loadImage(event.target.result);
        const logoImg = await loadImage(logoTw);
        const alanImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(alanSvgString)}`);
        const adaImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(adaSvgString)}`);
        
        drawFrame(userImg, logoImg, alanImg, adaImg);
        setImage('uploaded');
      } catch (err) {
        console.error("Error drawing frame elements:", err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

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

  const drawCornerBrackets = (ctx, x, y, w, h, len = 60, lw = 5, color = '#38BDF8') => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'square';

    // Top Left
    ctx.beginPath();
    ctx.moveTo(x, y + len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + len);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - len);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + len, y + h);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
    ctx.restore();
  };

  const drawMascotBadge = (ctx, img, cx, cy, radius, borderColor, label) => {
    ctx.save();
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 14, 33, 0.9)';
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.clip();
    const imgSize = radius * 1.55;
    ctx.drawImage(img, cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);
    ctx.restore();

    if (label) {
      const pillW = 74;
      const pillH = 22;
      const pillX = cx - pillW / 2;
      const pillY = cy + radius - 8;

      ctx.save();
      ctx.fillStyle = '#050814';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 6, true, true);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = borderColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, pillY + pillH / 2);
      ctx.restore();
    }
  };

  const drawFrame = (userImg, logoImg, alanImg, adaImg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // 1. Imagem do usuário cobrindo o canvas
    const scale = Math.max(canvas.width / userImg.width, canvas.height / userImg.height);
    const x = (canvas.width / 2) - (userImg.width / 2) * scale;
    const y = (canvas.height / 2) - (userImg.height / 2) * scale;
    ctx.drawImage(userImg, x, y, userImg.width * scale, userImg.height * scale);

    // 2. Vinhetas e gradientes modernos (topo e base)
    const topGradient = ctx.createLinearGradient(0, 0, 0, 380);
    topGradient.addColorStop(0, 'rgba(5, 8, 20, 0.85)');
    topGradient.addColorStop(0.5, 'rgba(5, 8, 20, 0.45)');
    topGradient.addColorStop(1, 'rgba(5, 8, 20, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 380);

    const bottomGradient = ctx.createLinearGradient(0, canvas.height - 520, 0, canvas.height);
    bottomGradient.addColorStop(0, 'rgba(5, 8, 20, 0)');
    bottomGradient.addColorStop(0.35, 'rgba(5, 8, 20, 0.65)');
    bottomGradient.addColorStop(1, 'rgba(5, 8, 20, 0.95)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, canvas.height - 520, canvas.width, 520);

    // 3. Moldura de borda cibernética com glow
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);
    ctx.restore();

    // 4. Cantoneiras HUD (Viewfinder)
    drawCornerBrackets(ctx, 36, 36, canvas.width - 72, canvas.height - 72, 60, 5, '#38BDF8');

    // 5. Header Tecnológico Superior
    const headerW = 540;
    const headerH = 50;
    const headerX = (canvas.width - headerW) / 2;
    const headerY = 70;

    ctx.save();
    ctx.fillStyle = 'rgba(9, 14, 33, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, headerX, headerY, headerW, headerH, 25, true, true);

    // Ponto de status / REC
    ctx.fillStyle = '#10B981';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(headerX + 32, headerY + 25, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Texto do Header
    ctx.save();
    ctx.font = 'bold 18px "Montserrat", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FACOM TECHWEEK // 2026', canvas.width / 2 + 10, headerY + 26);
    ctx.restore();

    // 6. Mascotes em Badges Holográficos Laterais
    // Alan (canto superior esquerdo)
    drawMascotBadge(ctx, alanImg, 115, 175, 48, '#38BDF8', 'ALAN');
    // Ada (canto superior direito)
    drawMascotBadge(ctx, adaImg, canvas.width - 115, 175, 48, '#C084FC', 'ADA');

    // 7. Card Inferior Flutuante (Glassmorphism)
    const cardW = 940;
    const cardH = 260;
    const cardX = (canvas.width - cardW) / 2;
    const cardY = canvas.height - cardH - 80;

    ctx.save();
    ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
    ctx.shadowBlur = 30;

    ctx.fillStyle = 'rgba(9, 14, 33, 0.9)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 28, true, true);
    ctx.restore();

    // Tag superior do card
    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('[ OFICIAL // PRESENÇA CONFIRMADA ]', canvas.width / 2, cardY + 42);
    ctx.restore();

    // Logo TechWeek centralizada
    const logoWidth = 460;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    ctx.drawImage(logoImg, (canvas.width - logoWidth) / 2, cardY + 65, logoWidth, logoHeight);

    // Linha divisória sutil dentro do card
    const divGrad = ctx.createLinearGradient(cardX + 100, 0, cardX + cardW - 100, 0);
    divGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    divGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
    divGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(cardX + 60, cardY + 185, cardW - 120, 1.5);

    // Rodapé de Informações: Datas, Local e Hashtag
    ctx.save();
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#E2E8F0';
    ctx.textAlign = 'left';
    ctx.fillText('21 A 26 DE OUTUBRO • UFU', cardX + 70, cardY + 225);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'right';
    ctx.fillText('#FACOMTECHWEEK', cardX + cardW - 70, cardY + 225);
    ctx.restore();

    // Barra de destaque neon na base inferior absoluta
    const bottomBarGrad = ctx.createLinearGradient(120, 0, canvas.width - 120, 0);
    bottomBarGrad.addColorStop(0, '#2563EB');
    bottomBarGrad.addColorStop(0.5, '#38BDF8');
    bottomBarGrad.addColorStop(1, '#9333EA');
    ctx.fillStyle = bottomBarGrad;
    ctx.fillRect(160, canvas.height - 48, canvas.width - 320, 3);
  };

  const shareOrDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'techweek-story.png', { type: 'image/png' });

      if (!isComplete) {
        if (!hasSymplaTicket) {
          setShowSymplaModal(true);
          return;
        } else {
          setIsProcessing(true);
          try {
            const photoUrl = await uploadMissionPhoto(file, 'instagram_story');
            const res = await completeChallenge('instagram_story', 50, {
              photo_url: photoUrl,
              photo: photoUrl,
              submitted_at: new Date().toISOString()
            });
            if (res && (res === true || res.success || res.alreadyCompleted)) {
              setIsComplete(true);
            }
          } catch (uploadErr) {
            console.error("Erro ao enviar foto para comprovação:", uploadErr);
          } finally {
            setIsProcessing(false);
          }
        }
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'FACOM TechWeek',
            text: 'Estou participando da FACOM TechWeek!',
          });
        } catch (err) {
          console.error("Erro ao compartilhar, tentando fallback de download:", err);
          downloadFallback(canvas);
        }
      } else {
        downloadFallback(canvas);
      }
    }, 'image/png');
  };

  const downloadFallback = (canvas) => {
    const link = document.createElement('a');
    link.download = 'techweek-story.png';
    link.href = canvas.toDataURL();
    link.click();
    alert('Imagem baixada! Agora você pode postar no seu Instagram Stories.');
  };

  return (
    <div className="page-container conq-page animate-fade-in flex flex-col">
      <SymplaStickyBanner />

      <div className="flex flex-1 flex-col px-5">
        <header className="relative pt-[18px]">
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            aria-label="Voltar para as missões"
            className="absolute left-[-8px] top-3 flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent text-text"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="screen-title mb-0! text-[22px]!">Post no Stories</h1>
          <p className="mt-3 text-center text-[13px] text-text-2">Tire a foto com a moldura oficial e compartilhe.</p>
        </header>

        <div className="mt-6 flex flex-1 flex-col items-center">
          <div className="relative flex aspect-[9/16] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-[18px] border-2 border-dashed border-line-2 bg-surface">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="h-full w-full object-cover"
              style={{ display: isCameraOpen && !image ? 'block' : 'none' }}
            />

            <canvas
              ref={canvasRef}
              className="h-full w-full object-contain"
              style={{ display: image ? 'block' : 'none' }}
            />

            {!isCameraOpen && !image && !isProcessing && (
              <div className="p-5 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl p-0.5" style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}>
                  <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-surface">
                    <Camera size={26} color="#F59AC0" aria-hidden="true" />
                  </span>
                </span>
                <p className="text-sm text-text-2">Sorria para a foto da Tech Week!</p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(5,8,20,0.5)]">
                <Loader2 className="animate-spin" size={32} color="white" aria-label="Enviando" />
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="mt-6 flex w-full max-w-[300px] flex-col gap-2.5">
            {!isCameraOpen && !image && (
              <>
                <button type="button" className="btn btn-primary btn-block" onClick={startCamera}>
                  <Camera size={20} aria-hidden="true" />
                  Tirar foto agora
                </button>
                <button type="button" className="btn btn-secondary btn-block" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={20} aria-hidden="true" />
                  Escolher da galeria
                </button>
              </>
            )}

            {isCameraOpen && !image && (
              <button type="button" className="btn btn-primary btn-block" onClick={captureFromVideo}>
                <Camera size={20} aria-hidden="true" />
                Capturar
              </button>
            )}

            {image && (
              <>
                <button
                  type="button"
                  className="btn btn-block"
                  onClick={shareOrDownload}
                  disabled={isProcessing}
                  style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}
                >
                  {isProcessing ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
                  {isProcessing ? 'Enviando...' : 'Postar no Stories'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => {
                    setImage(null);
                    startCamera();
                  }}
                >
                  Tirar outra foto
                </button>
              </>
            )}

            {isComplete && (
              <p role="status" className="mt-1 text-center text-sm font-bold text-ok">
                Missão concluída · +50 pts
              </p>
            )}
          </div>
        </div>
      </div>

      <SymplaRequirementModal
        isOpen={showSymplaModal}
        onClose={() => setShowSymplaModal(false)}
        featureName="o envio desta missão"
      />
    </div>
  );
}

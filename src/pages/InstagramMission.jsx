import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Share2, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import logoTw from '../assets/logo-tw.png';
import { stopAllMediaTracks } from '../lib/cameraUtils';

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
    ctx.font = 'bold 18px "Space Grotesk", sans-serif';
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
      const file = new File([blob], 'techweek-story.png', { type: 'image/png' });

      if (!isComplete) {
        if (!hasSymplaTicket) {
          setShowSymplaModal(true);
          return;
        } else {
          const res = await completeChallenge('instagram_story', 50);
          if (res && (res === true || res.success || res.alreadyCompleted)) {
            setIsComplete(true);
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
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto', padding: '24px 24px 120px 24px', zIndex: 10, position: 'relative' }}>
      <SymplaStickyBanner />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            aria-label="Voltar para os desafios"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0,
                letterSpacing: '-0.03em',
                lineHeight: 1.15
              }}
            >
              Missão Stories
            </h1>
            <p
              style={{
                fontSize: '0.80rem',
                color: '#94A3B8',
                margin: '3px 0 0',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}
            >
              Gere seu card oficial e compartilhe
            </p>
          </div>
        </div>
      </div>

      {!hasSymplaTicket && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            color: '#fef08a',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}
        >
          ⚠️ <strong>Ingresso Sympla Pendente:</strong> você pode gerar e salvar a foto, mas precisa vincular seu ingresso no perfil para pontuar no ranking.
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '9/16', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}>
          
          <video 
            ref={videoRef} 
            playsInline 
            autoPlay 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraOpen && !image ? 'block' : 'none' }} 
          />

          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: image ? 'block' : 'none' }}
          />
          
          {!isCameraOpen && !image && !isProcessing && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Camera size={48} color="rgba(255,255,255,0.5)" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sorria para a foto da TechWeek!</p>
            </div>
          )}

          {isProcessing && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Loader2 className="animate-spin" size={32} color="white" />
            </div>
          )}
        </div>

        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />

        <div style={{ marginTop: '32px', width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!isCameraOpen && !image && (
            <>
              <button 
                className="login-btn"
                onClick={startCamera}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}
              >
                <Camera size={20} />
                Tirar Foto na Hora
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: '600' }}
              >
                <ImageIcon size={20} />
                Escolher da Galeria
              </button>
            </>
          )}

          {isCameraOpen && !image && (
            <button 
              className="login-btn"
              onClick={captureFromVideo}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: '#10b981' }}
            >
              <Camera size={20} />
              Capturar
            </button>
          )}

          {image && (
            <>
              <button 
                className="login-btn"
                onClick={shareOrDownload}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
              >
                <Share2 size={20} />
                Postar no Story
              </button>
              <button 
                onClick={() => {
                  setImage(null);
                  startCamera();
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: '600' }}
              >
                Tirar outra foto
              </button>
            </>
          )}

          {isComplete && (
            <div style={{ textAlign: 'center', color: '#10b981', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold' }}>
              ✨ Missão concluída! (+50 pts)
            </div>
          )}
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

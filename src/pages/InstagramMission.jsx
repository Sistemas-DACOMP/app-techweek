import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Share2, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import logoTw from '../assets/logo-tw.png';

const tekoSvgString = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bB" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#1e3a8a" /></linearGradient><linearGradient id="aB" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.4" /><stop offset="100%" stop-color="#2563eb" stop-opacity="0" /></linearGradient><linearGradient id="eB" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e2e8f0" /><stop offset="100%" stop-color="#94a3b8" /></linearGradient><clipPath id="cB"><rect x="40" y="40" width="120" height="120" rx="16" /></clipPath></defs><g><path d="M 40 100 L 15 70 L 30 30" fill="none" stroke="#1e3a8a" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="20" y="20" width="20" height="20" rx="6" fill="#2563eb"/></g><g><path d="M 160 100 L 185 130 L 170 180" fill="none" stroke="#1e3a8a" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="160" y="170" width="20" height="20" rx="6" fill="#2563eb"/></g><rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bB)"/><g clip-path="url(#cB)"><path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#aB)"/><path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)"/></g><g><rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eB)"/><rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="77" y="77" width="6" height="6" rx="2" fill="#fff"/></g><g><rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eB)"/><rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="127" y="77" width="6" height="6" rx="2" fill="#fff"/></g></svg>`;

const weekaSvgString = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#9333ea" /><stop offset="100%" stop-color="#4c1d95" /></linearGradient><linearGradient id="aP" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4c1d95" stop-opacity="0.4" /><stop offset="100%" stop-color="#9333ea" stop-opacity="0" /></linearGradient><linearGradient id="eP" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e2e8f0" /><stop offset="100%" stop-color="#94a3b8" /></linearGradient><clipPath id="cP"><rect x="40" y="40" width="120" height="120" rx="16" /></clipPath></defs><g><path d="M 40 100 L 15 130 L 30 180" fill="none" stroke="#4c1d95" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="20" y="170" width="20" height="20" rx="6" fill="#9333ea"/></g><g><path d="M 160 100 L 185 70 L 170 30" fill="none" stroke="#4c1d95" stroke-width="16" stroke-linejoin="bevel" stroke-linecap="square"/><rect x="160" y="20" width="20" height="20" rx="6" fill="#9333ea"/></g><rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bP)"/><g clip-path="url(#cP)"><path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#aP)"/><path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)"/></g><g><rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eP)"/><rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="77" y="77" width="6" height="6" rx="2" fill="#fff"/></g><g><rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eP)"/><rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a"/><rect x="127" y="77" width="6" height="6" rx="2" fill="#fff"/></g></svg>`;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

export default function InstagramMission() {
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { completeChallenge, hasCompletedChallenge } = useUser();

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
      }
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
      const tekoImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(tekoSvgString)}`);
      const weekaImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(weekaSvgString)}`);
      
      drawFrame(userImg, logoImg, tekoImg, weekaImg);
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
        const tekoImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(tekoSvgString)}`);
        const weekaImg = await loadImage(`data:image/svg+xml;utf8,${encodeURIComponent(weekaSvgString)}`);
        
        drawFrame(userImg, logoImg, tekoImg, weekaImg);
        setImage('uploaded');
      } catch (err) {
        console.error("Error drawing frame elements:", err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const drawFrame = (userImg, logoImg, tekoImg, weekaImg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Draw user image
    const scale = Math.max(canvas.width / userImg.width, canvas.height / userImg.height);
    const x = (canvas.width / 2) - (userImg.width / 2) * scale;
    const y = (canvas.height / 2) - (userImg.height / 2) * scale;
    ctx.drawImage(userImg, x, y, userImg.width * scale, userImg.height * scale);

    // Gradients
    const topGradient = ctx.createLinearGradient(0, 0, 0, 300);
    topGradient.addColorStop(0, 'rgba(0,0,0,0.6)');
    topGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, canvas.width, 300);

    const bottomGradient = ctx.createLinearGradient(0, canvas.height - 400, 0, canvas.height);
    bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, canvas.height - 400, canvas.width, 400);

    // Frame
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 30;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(300, 0);
    ctx.lineTo(0, 300);
    ctx.fill();

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width - 300, canvas.height);
    ctx.lineTo(canvas.width, canvas.height - 300);
    ctx.fill();

    // Draw Logo
    const logoWidth = 600;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    ctx.drawImage(logoImg, (canvas.width - logoWidth) / 2, canvas.height - logoHeight - 120, logoWidth, logoHeight);
    
    // Draw Mascots (Moved to the top)
    const mascotSize = 350;
    // Teko on the top left
    ctx.drawImage(tekoImg, 50, 100, mascotSize, mascotSize);
    // Weeka on the top right
    ctx.drawImage(weekaImg, canvas.width - mascotSize - 50, 100, mascotSize, mascotSize);
  };

  const shareOrDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'techweek-story.png', { type: 'image/png' });

      if (!isComplete) {
        await completeChallenge('instagram_story', 50);
        setIsComplete(true);
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'FACOM TechWeek',
            text: 'Estou participando da FACOM TechWeek!',
          });
        } catch (err) {
          console.error("Erro ao compartilhar:", err);
        }
      } else {
        const link = document.createElement('a');
        link.download = 'techweek-story.png';
        link.href = canvas.toDataURL();
        link.click();
        alert('Imagem baixada! Agora você pode postar no seu Instagram Stories.');
      }
    }, 'image/png');
  };

  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto', padding: '24px 24px 120px 24px', zIndex: 10, position: 'relative' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={() => navigate('/challenges')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-lastica" style={{ fontSize: '1rem', fontWeight: '500', textAlign: 'center' }}>Missão Stories</h1>
        <div style={{ width: '40px' }}></div>
      </div>

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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: '500' }}
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontWeight: '500' }}
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
    </div>
  );
}

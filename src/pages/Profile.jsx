import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { LogOut, Camera, Check, X, Move, ZoomIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { points } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    firstName: 'Visitante',
    lastName: '',
    course: '',
    participantType: '',
    avatarUrl: '',
    avatarPosition: { x: 0, y: 0 },
    avatarScale: 1
  });

  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // State to store the aspect ratio of the uploaded image
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  useEffect(() => {
    const p = localStorage.getItem('facom_user_profile');
    if (p) {
      try {
        const parsed = JSON.parse(p);
        setProfile(parsed);
        if (parsed.avatarPosition) {
          setPosition(parsed.avatarPosition);
        }
        if (parsed.avatarScale) {
          setScale(parsed.avatarScale);
        }
      } catch (e) { }
    }
  }, []);

 const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const ratio = img.height / img.width;
          setImageAspectRatio(ratio);

          // redimensiona e comprime a imagem para evitar estourar o limite do localStorage
          // (não vai ser necessario reduzir tamanho da imagem quando estiver no banco de dados)
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          setTempImage(compressedDataUrl);
          setPosition({ x: 0, y: 0 });
          setScale(1);
          setIsCropping(true);
        };
      };
      reader.readAsDataURL(file);
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


  //nao sera necessario reduzir tamanho da imagem quando estiver no banco de dados,
  //pois o limite do localStorage eh de 5MB, e o banco de dados suporta imagens maiores.
  const handleSaveCrop = () => {
    const updatedProfile = {
      ...profile,
      avatarUrl: tempImage,
      avatarPosition: position,
      avatarScale: scale
    };
    setProfile(updatedProfile);
    
    try {
      localStorage.setItem('facom_user_profile', JSON.stringify(updatedProfile));
    } catch (err) {
      alert('A imagem ainda está muito grande. Tente escolher uma foto com menor resolução.');
      return;
    }

    setIsCropping(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('facom_logged_in');
    navigate('/login');
  };

  const qrData = encodeURIComponent(JSON.stringify({
    username: profile.username || 'user',
    participantType: profile.participantType,
    course: profile.course,
    period: profile.period
  }));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&bgcolor=ffffff&color=000000`;

  const baseImgWidth = 200;
  const currentImgWidth = baseImgWidth * scale;

  return (
    <>
      <div className="page-container animate-fade-in">
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
          <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Perfil</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3.5rem',
                fontWeight: 'bold',
                color: 'white',
                border: '3px solid var(--primary)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)'
              }}>
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    style={{
                      position: 'absolute',
                      width: `${200 * (profile.avatarScale || 1)}px`,
                      height: 'auto',
                      maxWidth: 'none',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${profile.avatarPosition?.x || 0}px, ${profile.avatarPosition?.y || 0}px)`,
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'V'
                )}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '50%',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}>
                <Camera size={18} />
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '4px' }}>
            {profile.firstName} {profile.lastName}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {profile.course ? `${profile.course} - ${profile.participantType}` : profile.participantType || 'Participante'}
          </p>
        </div>

        <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: '16px' }}>Meu QR Code</h3>
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', marginBottom: '16px' }}>
            <img
              src={qrUrl}
              alt="Meu QR Code"
              style={{ width: '150px', height: '150px', display: 'block' }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Peça para escanearem e ganhe pontos!</p>
        </div>

        <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Meus Pontos</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'white' }}>{points}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '8px' }}>Nível 5 - Expert</p>
        </div>

        <button
          onClick={handleLogout}
          className="card"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>

      {isCropping && (
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
                  window._touchStartDist = dist;
                  window._initialScaleForPinch = scale;
                } else if (e.touches.length === 1) {
                  handleTouchStart(e);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && window._touchStartDist) {
                
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  const factor = dist / window._touchStartDist;
                  const newScale = Math.max(0.3, Math.min(2.5, window._initialScaleForPinch * factor));
                  
                  setScale(newScale);
                  updatePosition(position.x, position.y, newScale);
                } else if (e.touches.length === 1) {
                  handleTouchMove(e);
                }
              }}
              onTouchEnd={(e) => {
                if (e.touches.length < 2) {
                  window._touchStartDist = null;
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
                width: '130px',
                height: '130px',
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
                onClick={() => setIsCropping(false)}
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
                onClick={handleSaveCrop}
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
      )}
    </>
  );
}
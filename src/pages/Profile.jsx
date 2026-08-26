import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { LogOut, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarEditor from '../components/AvatarEditor';

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


useEffect(() => {
  const p = localStorage.getItem('facom_user_profile');

  if (p) {
    try {
      const parsed = JSON.parse(p);
      setProfile(parsed);
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
          setIsCropping(true);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = ({ avatarUrl, avatarPosition, avatarScale }) => {
    const updatedProfile = {
      ...profile,
      avatarUrl,
      avatarPosition,
      avatarScale
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

  return (
    <>
      <div className="page-container animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ width: '40px' }}></div>
          <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Perfil</h1>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', overflow: 'hidden', color: 'white', position: 'relative' }}>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                style={{
                  position: 'absolute',
                  width: `${(40 * 200 / 120) * (profile.avatarScale || 1)}px`,
                  height: 'auto',
                  maxWidth: 'none',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${(profile.avatarPosition?.x || 0) * (40 / 120)}px, ${(profile.avatarPosition?.y || 0) * (40 / 120)}px)`,
                  objectFit: 'cover'
                }}
              />
            ) : (
              profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'V'
            )}
          </div>
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

          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" className="card-highlight" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
            <a href="#" className="card-highlight-secondary" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
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

      {isCropping && tempImage && (
        <AvatarEditor
          tempImage={tempImage}
          initialScale={1}
          initialPosition={{ x: 0, y: 0 }}
          onSave={handleSaveAvatar}
          onCancel={() => setIsCropping(false)}
        />
      )}
    </>
  );
}
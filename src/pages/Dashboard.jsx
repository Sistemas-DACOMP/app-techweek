import { useState, useEffect } from 'react';
import { MapPin, User } from 'lucide-react';
import MascotDuo from '../components/MascotDuo';
import logoTw from '../assets/logo-tw.png';
import { getMyProfile } from '../lib/gameplay';

export default function Dashboard() {
  const [firstName, setFirstName] = useState('Visitante');
  const [avatar, setAvatar] = useState({
    avatarUrl: '',
    avatarPosition: { x: 0, y: 0 },
    avatarScale: 1
  });

  useEffect(() => {
    const p = localStorage.getItem('facom_user_profile');
    if (p) {
      try {
        const parsed = JSON.parse(p);
        setFirstName(parsed.firstName || parsed.username || 'Visitante');
        setAvatar({
          avatarUrl: parsed.avatarUrl || '',
          avatarPosition: parsed.avatarPosition || { x: 0, y: 0 },
          avatarScale: parsed.avatarScale || 1
        });
      } catch {
        console.error('Erro ao carregar perfil');
      }
    }
  }, []);

  return (
    <div className="page-container animate-fade-in dashboard-page">

      {/* White top section with mascots waving */}
      <div className="hero-white">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ width: '40px' }}></div>
          <img src={logoTw} alt="Tech Week Logo" style={{ height: '60px' }} />
          <div
            className="header-avatar"
            style={{ overflow: 'hidden', position: 'relative' }}
          >
            {avatar.avatarUrl ? (
              <img
                src={avatar.avatarUrl}
                alt="Avatar"
                style={{
                  position: 'absolute',
                  width: `${(40 * 200 / 120) * (avatar.avatarScale || 1)}px`,
                  height: 'auto',
                  maxWidth: 'none',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${(avatar.avatarPosition?.x || 0) * (40 / 120)}px, ${(avatar.avatarPosition?.y || 0) * (40 / 120)}px)`,
                  objectFit: 'cover'
                }}
              />
            ) : (
              firstName.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <MascotDuo />
        </div>
        <h2 style={{ color: 'white', textAlign: 'center', marginTop: '16px', marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700' }}>Olá, {firstName}!</h2>
      </div>

      {/* Blue section with the event schedule */}
      <div className="schedule-panel">
        <h3 className="font-lastica schedule-title">Programação</h3>

        <div className="schedule-item">
          <div className="schedule-time">19:00</div>
          <div>
            <h4>Palestra de Abertura</h4>
            <p>
              <MapPin size={13} />
              Anfiteatro principal
            </p>
          </div>
        </div>

        <div className="schedule-item">
          <div className="schedule-time">20:00</div>
          <div>
            <h4>Palestra: Dev que nao aparece, nao cresce</h4>
            <p>
              <User size={13} />
              Samuel Amorim
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
import { useState, useEffect } from 'react';
import { MapPin, User } from 'lucide-react';
import MascotDuo from '../components/MascotDuo';
import logoTw from '../assets/logo-tw.png';

export default function Dashboard() {
  const [firstName, setFirstName] = useState('Visitante');

const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPosition, setAvatarPosition] = useState({ x: 0, y: 0 });
  const [avatarScale, setAvatarScale] = useState(1);

  useEffect(() => {
    const p = localStorage.getItem('facom_user_profile');
    if (p) {
      try {
        const parsed = JSON.parse(p);
        setFirstName(parsed.firstName || parsed.username || 'Visitante');
        if (parsed.avatarUrl) {
          setAvatarUrl(parsed.avatarUrl);
        }
        if (parsed.avatarPosition) {
          setAvatarPosition(parsed.avatarPosition);
        }
        if (parsed.avatarScale) {
          setAvatarScale(parsed.avatarScale);
        }
      } catch(e) {}
    }
  }, []);

  return (
    <div className="page-container animate-fade-in dashboard-page">

      {/* White top section with mascots waving */}
      <div className="hero-white">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ width: '40px' }}></div>
          <img src={logoTw} alt="Tech Week Logo" style={{ height: '60px' }} />
         <div className="header-avatar" style={{ 
            overflow: 'hidden', 
            position: 'relative', 
            background: '#000',
            border: '2px solid var(--primary)', // <-- Borda igual à página Profile
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' // <-- Sombra suave idêntica
          }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  position: 'absolute',
                  width: `${(40 * 200 / 120) * avatarScale}px`,
                  height: 'auto',
                  maxWidth: 'none',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${avatarPosition.x * (40 / 120)}px, ${avatarPosition.y * (40 / 120)}px)`,
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

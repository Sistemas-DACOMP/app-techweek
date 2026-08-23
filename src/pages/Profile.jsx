import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { getMyProfile } from '../lib/gameplay';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { points } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    firstName: 'Visitante',
    lastName: '',
    course: '',
    participantType: ''
  });

  useEffect(() => {
    getMyProfile()
      .then(data => {
        if (!data) return;
        setProfile({
          username: data.username,
          firstName: data.first_name,
          lastName: data.last_name,
          course: data.course,
          participantType: data.participant_type,
          period: data.period
        });
      })
      .catch(() => {});
  }, []);

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
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ width: '40px' }}></div>
        <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Perfil</h1>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', overflow: 'hidden', color: 'white' }}>
          {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'V'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 'bold', color: 'white', border: '3px solid var(--primary)', marginBottom: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)' }}>
          {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'V'}
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
  );
}

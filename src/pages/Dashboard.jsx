import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MascotDuo from '../components/MascotDuo';
import logoTw from '../assets/logo-tw.png';
import { getMyProfile } from '../lib/gameplay';
import { verifySymplaTicket, SYMPLA_EVENT_URL } from '../lib/sympla';
import { updateUserProfile } from '../lib/userService';
import LectureCard from '../components/LectureCard';
import LectureModal from '../components/LectureModal';
import LectureScanner from '../components/LectureScanner';
import { Ticket, ExternalLink, RefreshCw, Loader2, Mail } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [checkingTicket, setCheckingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState('');
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showLectureScanner, setShowLectureScanner] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(async (profile) => {
        if (!profile) return;
        setUserProfile(profile);
        setFirstName(profile.first_name || profile.username || 'Participante');
        setAvatarUrl(profile.avatar_url);

        // Se o usuário ainda não tiver ingresso vinculado, tenta auto-vincular no Sympla
        if (!profile.sympla_ticket && profile.email && profile.id) {
          try {
            const res = await verifySymplaTicket({ email: profile.email });
            const p = res?.participant || res?.ticket;
            if (res && res.verified && p) {
              const ticketObj = {
                ticketNumber: p.ticketNumber,
                ticketName: p.ticketName,
                qrCodeData: p.qrCodeData || p.ticketNumber,
                orderId: p.orderId
              };
              await updateUserProfile(profile.id, { symplaTicket: ticketObj });
              setUserProfile(prev => ({ ...prev, sympla_ticket: ticketObj }));
            }
          } catch (autoErr) {
            console.warn('Auto-verificação Sympla:', autoErr);
          }
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar perfil no Dashboard:', err);
      });
  }, []);

  const handleVerifyTicketNow = async () => {
    if (!userProfile?.email || !userProfile?.id) return;
    setCheckingTicket(true);
    setTicketNotice('');
    try {
      const res = await verifySymplaTicket({ email: userProfile.email });
      const p = res?.participant || res?.ticket;
      if (res && res.verified && p) {
        const ticketObj = {
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber,
          orderId: p.orderId
        };
        await updateUserProfile(userProfile.id, { symplaTicket: ticketObj });
        setUserProfile(prev => ({ ...prev, sympla_ticket: ticketObj }));
        setTicketNotice('Ingresso localizado e vinculado com sucesso! 🎉');
      } else {
        setTicketNotice('Ingresso ainda não encontrado no Sympla com este e-mail.');
      }
    } catch {
      setTicketNotice('Erro ao consultar o Sympla no momento.');
    } finally {
      setCheckingTicket(false);
    }
  };

  return (
    <div className="page-container animate-fade-in dashboard-page">

      {/* White top section with mascots waving */}
      <div className="hero-white">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ width: '40px' }}></div>
          <img src={logoTw} alt="Tech Week Logo" style={{ height: '60px' }} />
          <div
            className="header-avatar"
            style={{ overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => navigate('/profile')}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (firstName ? firstName.charAt(0).toUpperCase() : 'U')}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <MascotDuo />
        </div>
        <h2 style={{ color: 'white', textAlign: 'center', marginTop: '16px', marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700' }}>
          {firstName ? `Olá, ${firstName}!` : 'Olá!'}
        </h2>
      </div>

      {/* Blue section with the event schedule */}
      <div className="schedule-panel">
        {/* Banner de Aviso de Ingresso Pendente no Sympla */}
        {userProfile && !userProfile.sympla_ticket && (
          <div className="card animate-fade-in" style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '8px', borderRadius: '10px', color: '#fbbf24', flexShrink: 0 }}>
                <Ticket size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#fef3c7' }}>
                  Inscrição Pendente no Sympla
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#fde68a', lineHeight: '1.4' }}>
                  Você ainda não possui um ingresso oficial confirmado. Garanta seu ingresso para liberar a presença nas palestras e concorrer a prêmios na FACOM Tech Week!
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <a
                    href={SYMPLA_EVENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      background: '#f59e0b',
                      color: '#000',
                      fontWeight: 'bold'
                    }}
                  >
                    <ExternalLink size={14} />
                    Garantir Ingresso no Sympla
                  </a>
                  <button
                    onClick={handleVerifyTicketNow}
                    disabled={checkingTicket}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {checkingTicket ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {checkingTicket ? 'Consultando...' : 'Já garanti, verificar agora'}
                  </button>
                  <button
                    onClick={() => navigate('/profile?changeEmail=true')}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <Mail size={14} />
                    Usou outro e-mail? Alterar
                  </button>
                </div>
                {ticketNotice && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: ticketNotice.includes('sucesso') ? '#10b981' : '#fbbf24' }}>
                    {ticketNotice}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <h3 className="font-lastica schedule-title">Programação</h3>

        <LectureCard
          title="Palestra de Abertura"
          time="19:00"
          location="Anfiteatro principal"
          onClick={() =>
            setSelectedLecture({
              id: 'palestra_abertura',
              title: 'Palestra de Abertura',
              time: '19:00',
              location: 'Anfiteatro principal',
              points: 20
            })
          }
        />

        <LectureCard
          title="Palestra: Dev que nao aparece, nao cresce"
          time="20:00"
          location="5R"
          onClick={() =>
            setSelectedLecture({
              id: 'palestra_samuel_amorim',
              title: 'Palestra: Dev que nao aparece, nao cresce',
              time: '20:00',
              location: '5R',
              points: 20
            })
          }
        />

        <LectureModal
          lecture={selectedLecture}
          hasSymplaTicket={Boolean(userProfile?.sympla_ticket)}
          onClose={() => setSelectedLecture(null)}
          onValidate={() => setShowLectureScanner(true)}
        />

        {showLectureScanner && (
          <LectureScanner
            lecture={selectedLecture}
            onClose={() => {
              setShowLectureScanner(false);
              setSelectedLecture(null);
            }}
            onBack={() => setShowLectureScanner(false)}
          />
        )}

      </div>
    </div>
  );
}
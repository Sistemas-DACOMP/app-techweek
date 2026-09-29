import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  Users, 
  BookmarkCheck, 
  Ticket, 
  Sparkles, 
  CalendarDays, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { CATEGORY_STYLES } from '../components/Badge';
import NotificationBell from '../components/NotificationBell';
import ActivityModal from '../components/ActivityModal';
import { onAuthChange } from '../lib/auth';
import { getUserProfile, subscribeToLeaderboardUsers } from '../lib/userService';
import { subscribeToFeedPosts } from '../lib/feedService';
import { 
  subscribeToActivities, 
  DEFAULT_ACTIVITIES, 
  calculateActivityStatus,
  subscribeToUserBookings,
  subscribeToUserCheckins,
  subscribeToUserPointEvents
} from '../lib/activityService';
import { useUser } from '../hooks/useUser';
import logoTw from '../assets/logo-tw.png';

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasSymplaTicket } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [firstName, setFirstName] = useState('Visitante');
  const [userInitials, setUserInitials] = useState('TW');

  // Estados dos Dados
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [bookings, setBookings] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [pointEvents, setPointEvents] = useState([]);
  const [latestPost, setLatestFeedPost] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [heroReaction, setHeroReaction] = useState(false);

  // Escuta Usuário Autenticado
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setCurrentUser(null);
        setFirstName('Visitante');
        setUserInitials('TW');
        return;
      }

      setCurrentUser(user);
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          const name = profile.firstName || profile.displayName?.split(' ')[0] || 'Visitante';
          setFirstName(name);

          const initialA = profile.firstName?.charAt(0) || user.displayName?.charAt(0) || 'S';
          const initialB = profile.lastName?.charAt(0) || '';
          setUserInitials((initialA + initialB).toUpperCase() || 'SA');
        } else {
          setFirstName(user.displayName?.split(' ')[0] || 'Visitante');
          setUserInitials(user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'SA');
        }
      } catch (err) {
        setFirstName('Visitante');
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Escuta Atividades
  useEffect(() => {
    const unsubActivities = subscribeToActivities((list) => {
      if (list && list.length > 0) {
        setActivities(list);
      }
    });
    return () => {
      if (typeof unsubActivities === 'function') unsubActivities();
    };
  }, []);

  // 2. Escuta Feed de Notícias
  useEffect(() => {
    const unsubFeed = subscribeToFeedPosts((posts) => {
      if (posts && posts.length > 0) {
        setLatestFeedPost(posts[0]);
      }
    });
    return () => {
      if (typeof unsubFeed === 'function') unsubFeed();
    };
  }, []);

  // 3. Escuta Reservas e Presenças do Usuário
  useEffect(() => {
    if (!currentUser?.uid) {
      setBookings([]);
      setCheckins([]);
      setPointEvents([]);
      return;
    }

    const unsubBookings = subscribeToUserBookings(currentUser.uid, setBookings);
    const unsubCheckins = subscribeToUserCheckins(currentUser.uid, setCheckins);
    const unsubPoints = subscribeToUserPointEvents(currentUser.uid, setPointEvents);

    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubCheckins === 'function') unsubCheckins();
      if (typeof unsubPoints === 'function') unsubPoints();
    };
  }, [currentUser?.uid]);

  // Contagem Regressiva Monumental (Data de Abertura: 19 de Outubro de 2026, 09:00 BRT)
  const EVENT_START_DATE = useMemo(() => new Date('2026-10-19T09:00:00-03:00'), []);

  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, EVENT_START_DATE.getTime() - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return { days, hours, minutes, isEventLive: diff <= 0 };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, EVENT_START_DATE.getTime() - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({ days, hours, minutes, isEventLive: diff <= 0 });
    }, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(timer);
  }, [EVENT_START_DATE]);

  // Destaques da Programação (Primeiras 3 atividades)
  const featuredActivities = useMemo(() => activities.slice(0, 3), [activities]);

  // Quantidade de vagas garantidas pelo usuário autenticado
  const myBookedCount = useMemo(() => {
    return bookings.length;
  }, [bookings]);

  // Microinteração ao tocar no Herói
  const handleHeroClick = () => {
    setHeroReaction(true);
    setTimeout(() => setHeroReaction(false), 900);
  };

  return (
    <div 
      className="page-container animate-fade-in" 
      style={{ 
        maxWidth: '430px', 
        margin: '0 auto', 
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '8px',
        paddingBottom: 'max(90px, calc(env(safe-area-inset-bottom) + 80px))' 
      }}
    >
      <style>{`
        @keyframes terminalCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor {
          display: inline-block;
          width: 7px;
          height: 12px;
          background-color: #38BDF8;
          margin-left: 4px;
          vertical-align: middle;
          animation: terminalCursor 1s steps(2, start) infinite;
        }
        @keyframes flipFlip {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .hero-reaction-active {
          animation: flipFlip 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes armPoint {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-14deg); }
          100% { transform: rotate(0deg); }
        }
        .mascot-pointing {
          transform-origin: 40px 100px;
          animation: armPoint 2.4s ease-in-out infinite;
        }
        .circuit-texture-bg {
          position: absolute;
          inset: 0;
          opacity: 0.07;
          pointer-events: none;
        }
        /* Selo de crachá com recorte diagonal no canto superior direito */
        .badge-cracha {
          clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
        }
      `}</style>

      {/* 1. HEADER MÍNIMO (60px) — SEM COMPETIR COM O HERÓI */}
      <header
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <img
          src={logoTw}
          alt="FACOM TechWeek 2026"
          style={{ height: '24px', width: 'auto', objectFit: 'contain' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NotificationBell />

          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Meu Perfil e Crachá"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              color: '#38BDF8',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              padding: 0
            }}
          >
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{userInitials}</span>
            )}
          </button>
        </div>
      </header>

      {/* 2. O MOMENTO ÚNICO — BLOCO HERÓI: CONTAGEM REGRESSIVA MONUMENTAL */}
      <section
        onClick={handleHeroClick}
        className={`animate-fade-in ${heroReaction ? 'hero-reaction-active' : ''}`}
        style={{
          position: 'relative',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #090E23 0%, #17113A 45%, #31085C 100%)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(49, 8, 92, 0.25)',
          overflow: 'hidden',
          padding: '20px 18px 18px',
          marginBottom: '32px', // Respiro real generoso antes do conteúdo
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        {/* Textura de circuito de fundo com corte segmentado da logo em baixa opacidade */}
        <svg 
          className="circuit-texture-bg" 
          viewBox="0 0 400 300" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="6,4">
            <path d="M 0 40 L 140 40 L 180 80 L 400 80" />
            <path d="M 0 160 L 90 160 L 130 200 L 400 200" />
            <path d="M 120 0 L 120 120 L 150 150 L 150 300" />
            <path d="M 280 0 L 280 180 L 250 210 L 250 300" />
            <circle cx="180" cy="80" r="3" fill="#FFFFFF" />
            <circle cx="130" cy="200" r="3" fill="#FFFFFF" />
            <circle cx="150" cy="150" r="3" fill="#FFFFFF" />
          </g>
        </svg>

        {/* Topo do Herói: Prompt de Terminal Tech */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '14px',
            fontSize: '0.72rem',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: '#38BDF8'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#818CF8' }}>&gt; techweek@facom:~$</span>
            <span style={{ color: '#F8FAFC', marginLeft: '5px' }}>
              bem-vindo(a), {firstName}
            </span>
            <span className="terminal-cursor" />
          </div>

          <span
            style={{
              fontSize: '0.66rem',
              color: '#C084FC',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            19 a 23 OUT
          </span>
        </div>

        {/* Título Monumental & Painel de Embarque (Flip Counter) */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#CBD5E1',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            {timeLeft.isEventLive ? 'O evento está acontecendo agora!' : 'Contagem regressiva para a abertura'}
          </div>

          {/* Painel com Dígitos Tabulares Monumentais */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {/* Bloco DIAS */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#070A14',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '8px 12px',
                minWidth: '78px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              {/* Linha horizontal divisória sutil do flip */}
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: 0, 
                  right: 0, 
                  height: '1px', 
                  backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
                }} 
              />
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                  zIndex: 2
                }}
              >
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#94A3B8',
                  marginTop: '4px',
                  letterSpacing: '0.08em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  zIndex: 2
                }}
              >
                DIAS
              </span>
            </div>

            {/* Separador Dois Pontos */}
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8', opacity: 0.7 }}>:</span>

            {/* Bloco HORAS */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#070A14',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '8px 12px',
                minWidth: '78px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: 0, 
                  right: 0, 
                  height: '1px', 
                  backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
                }} 
              />
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                  zIndex: 2
                }}
              >
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#94A3B8',
                  marginTop: '4px',
                  letterSpacing: '0.08em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  zIndex: 2
                }}
              >
                HORAS
              </span>
            </div>

            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8', opacity: 0.7 }}>:</span>

            {/* Bloco MINUTOS */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#070A14',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '8px 12px',
                minWidth: '78px',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: 0, 
                  right: 0, 
                  height: '1px', 
                  backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
                }} 
              />
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.03em',
                  zIndex: 2
                }}
              >
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#94A3B8',
                  marginTop: '4px',
                  letterSpacing: '0.08em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  zIndex: 2
                }}
              >
                MIN
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Herói: Mascotes Alan & Ada com Ação Concreta Apontando para os Números */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Status de Inscrições / Vagas do Participante */}
          <div style={{ flex: 1, paddingRight: '10px' }}>
            <div style={{ fontSize: '0.74rem', color: '#E2E8F0', fontWeight: 600, marginBottom: '2px' }}>
              {myBookedCount > 0 ? (
                <span style={{ color: '#34D399', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <BookmarkCheck size={14} />
                  {myBookedCount} {myBookedCount === 1 ? 'vaga garantida' : 'vagas garantidas'}
                </span>
              ) : (
                'Inscrições abertas'
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
              Garanta sua vaga antes que esgotem
            </div>
          </div>

          {/* Ilustração Integrada de Alan e Ada Reagindo à Contagem */}
          <div
            style={{
              width: '120px',
              height: '68px',
              flexShrink: 0,
              position: 'relative'
            }}
            title="Alan e Ada contam os dias com você!"
          >
            <svg
              viewBox="0 0 280 160"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="heroAlanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>
                <linearGradient id="heroAdaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#4C1D95" />
                </linearGradient>
              </defs>

              {/* ALAN (Apontando para cima/contador) */}
              <g transform="translate(15, 10)">
                {/* Braço de Alan apontando com animação */}
                <g className="mascot-pointing">
                  <path
                    d="M 50 70 L 30 30 L 15 10"
                    fill="none"
                    stroke="#1E3A8A"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <circle cx="15" cy="10" r="7" fill="#38BDF8" />
                </g>
                {/* Corpo de Alan */}
                <rect x="35" y="45" width="80" height="80" rx="14" fill="url(#heroAlanGrad)" />
                {/* Olhos de Alan */}
                <rect x="50" y="65" width="20" height="20" rx="5" fill="#FFFFFF" />
                <rect x="58" y="72" width="10" height="10" rx="3" fill="#0A0E17" />
                <rect x="80" y="65" width="20" height="20" rx="5" fill="#FFFFFF" />
                <rect x="88" y="72" width="10" height="10" rx="3" fill="#0A0E17" />
              </g>

              {/* ADA (Celebrando com braço erguido) */}
              <g transform="translate(135, 15)">
                {/* Braço erguido de Ada */}
                <path
                  d="M 90 70 L 110 35 L 120 18"
                  fill="none"
                  stroke="#4C1D95"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="120" cy="18" r="7" fill="#C084FC" />
                {/* Corpo de Ada */}
                <rect x="25" y="40" width="80" height="80" rx="14" fill="url(#heroAdaGrad)" />
                {/* Olhos de Ada */}
                <rect x="40" y="60" width="20" height="20" rx="5" fill="#FFFFFF" />
                <rect x="44" y="67" width="10" height="10" rx="3" fill="#0A0E17" />
                <rect x="70" y="60" width="20" height="20" rx="5" fill="#FFFFFF" />
                <rect x="74" y="67" width="10" height="10" rx="3" fill="#0A0E17" />
              </g>
            </svg>
          </div>
        </div>

        {/* Botão de Ação Ergonômico de Pré-Evento */}
        <div style={{ marginTop: '14px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/agenda');
            }}
            style={{
              width: '100%',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            <span>Explorar Programação e Garantir Vagas</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* 2.1. LEMBRETE SYMPLA (Discreto, apenas se pendente) */}
      {!hasSymplaTicket && (
        <div
          onClick={() => navigate('/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/profile'); }}
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: '14px',
            padding: '10px 14px',
            marginBottom: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={17} color="#FBBF24" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FEF08A' }}>
                Ingresso Sympla pendente
              </div>
              <div style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>
                Vincule no perfil para validar seu crachá e presenças
              </div>
            </div>
          </div>
          <ArrowRight size={13} color="#FBBF24" />
        </div>
      )}

      {/* 3. LINHA DE TRANSIÇÃO ESPECÍFICA DO MOMENTO (NÃO EYEBROW CLICHÊ) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              lineHeight: 1.2
            }}
          >
            Destaques da programação
          </h2>
          <p
            style={{
              fontSize: '0.74rem',
              color: '#94A3B8',
              margin: '2px 0 0',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
          >
            Palestras magnas e workshops com vagas abertas
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/agenda')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#38BDF8',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 0'
          }}
        >
          <span>Ver grade</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 4. CARDS COMPACTOS COM BARRA DE TRILHA LATERAL E SELO CRACHÁ (NÃO TABELA!) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {featuredActivities.map((act) => {
          const catType = String(act.type || 'palestra').toLowerCase().trim();
          const cat = CATEGORY_STYLES[catType] || CATEGORY_STYLES.palestra;
          const actStatus = calculateActivityStatus(act, bookings, checkins, pointEvents);
          const isActBooked = actStatus === 'BOOKED' || actStatus === 'CHECKED_IN' || actStatus === 'COMPLETED';
          const actSeats = typeof act.vagas_disponiveis === 'number' ? act.vagas_disponiveis : 0;
          const isActSoldOut = actSeats <= 0;

          // Cor da barra de trilha lateral
          const trailColor = catType === 'workshop' 
            ? '#A855F7' 
            : catType === 'minicurso' 
              ? '#10B981' 
              : '#38BDF8';

          return (
            <div
              key={act.id}
              onClick={() => setSelectedActivity(act)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedActivity(act); }}
              style={{
                backgroundColor: '#0F141F',
                border: '1px solid #1E293B',
                borderLeft: `4px solid ${trailColor}`,
                borderRadius: '16px',
                padding: '14px 16px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              {/* Topo do Card: Trilha com Selo Crachá + Data/Horário */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                {/* Selo de trilha com recorte de crachá */}
                <span
                  className="badge-cracha"
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    backgroundColor: cat.bg,
                    color: cat.text,
                    border: `1px solid ${cat.border}`,
                    textTransform: 'uppercase',
                    fontFamily: "'Montserrat', sans-serif",
                    letterSpacing: '0.04em'
                  }}
                >
                  {cat.label}
                </span>

                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#94A3B8',
                    fontFamily: "'Inter', system-ui, sans-serif"
                  }}
                >
                  {act.day || '19/10'} às {act.time || '19:00'}
                </div>
              </div>

              {/* Título da Atividade */}
              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  margin: '0 0 6px',
                  lineHeight: 1.3
                }}
              >
                {act.title}
              </h3>

              {/* Local & Palestrante */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  color: '#94A3B8',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginBottom: '10px'
                }}
              >
                <MapPin size={13} color="#38BDF8" style={{ flexShrink: 0 }} />
                <span>{act.location || 'FACOM UFU'}</span>
                {act.speaker && <span style={{ color: '#64748B' }}>• {act.speaker}</span>}
              </div>

              {/* Rodapé do Card: Vagas & Ação "Saiba mais" */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.72rem'
                }}
              >
                {isActBooked ? (
                  <span style={{ color: '#10B981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    Vaga garantida
                  </span>
                ) : isActSoldOut ? (
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>Vagas esgotadas</span>
                ) : (
                  <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} color="#38BDF8" />
                    <strong style={{ color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>{actSeats}</strong> vagas disponíveis
                  </span>
                )}

                <span
                  style={{
                    color: '#38BDF8',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span>Saiba mais</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. SEÇÃO DE ATUALIZAÇÕES EMPURRADA PARA O FINAL DA ROLAGEM */}
      {latestPost && (
        <section
          style={{
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: "'Inter', system-ui, sans-serif"
              }}
            >
              Comunicado oficial
            </span>

            <button
              type="button"
              onClick={() => navigate('/feed')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: 0
              }}
            >
              <span>Feed completo</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: '#CBD5E1',
              margin: '0 0 8px',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {latestPost.content}
          </p>

          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
            {latestPost.authorName || 'Comissão Organizadora FACOM TechWeek'}
          </div>
        </section>
      )}

      {/* MODAL OFICIAL DE DETALHES DA ATIVIDADE */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          isBooked={bookings.some(b => b.activity_id === selectedActivity.id)}
          onBookingChange={(actId, newStatus) => {
            if (newStatus) {
              setBookings(prev => [...prev, { activity_id: actId }]);
            } else {
              setBookings(prev => prev.filter(b => b.activity_id !== actId));
            }
          }}
        />
      )}
    </div>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  Ticket, 
  BookmarkCheck,
  ChevronRight,
  Zap,
  Heart,
  AlertCircle,
  AlertTriangle,
  Calendar,
  QrCode,
  Trophy,
  Target,
  Sparkles
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ActivityModal from '../components/ActivityModal';
import Mascot from '../components/Mascot';
import MascotDuo from '../components/MascotDuo';
import InstallPwaCard from '../components/InstallPwaCard';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import { onAuthChange } from '../lib/auth';
import { getUserProfile } from '../lib/userService';
import { subscribeToFeedPosts, DEFAULT_FEED_POSTS } from '../lib/feedService';
import { 
  subscribeToActivities, 
  DEFAULT_ACTIVITIES, 
  subscribeToUserBookings,
  subscribeToUserCheckins,
  subscribeToUserPointEvents,
  reserveActivity,
  cancelActivityReservation,
  calculateActivityStatus
} from '../lib/activityService';
import { calculateLevel } from '../lib/level';
import { useUser } from '../hooks/useUser';
import logoTw from '../assets/logo-tw.png';

/**
 * HOME FACOM TECHWEEK 2026 — DIREÇÃO DE ARTE EDITORIAL PREMIUM
 * 
 * Hierarquia Estrita:
 * 1. Identidade do Evento & Hero Monumental (Pôster Digital com TECHWEEK vazado e Mascotes integrados)
 * 2. Saudação Secundária (Discreta, sem competir com a marca)
 * 3. Acontecendo Agora / Próximo na Programação (Editorial, sem card gigante)
 * 4. Próximos Destaques (Lista tipográfica com divisores finos)
 * 5. Atualizações (Feed social autêntico e direto)
 * 6. Gamificação (Secundária, mini status HUD no rodapé)
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { hasSymplaTicket, points: hookPoints } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [firstName, setFirstName] = useState('Participante');
  const [userInitials, setUserInitials] = useState('TW');
  const [showSymplaModal, setShowSymplaModal] = useState(false);

  // Dados Oficiais
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [bookings, setBookings] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [pointEvents, setPointEvents] = useState([]);
  const [latestPost, setLatestFeedPost] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [reservingId, setReservingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Autenticação
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setCurrentUser(null);
        setFirstName('Participante');
        setUserInitials('TW');
        return;
      }

      setCurrentUser(user);
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          const name = profile.firstName || profile.displayName?.split(' ')[0] || 'Participante';
          setFirstName(name);

          const initialA = profile.firstName?.charAt(0) || user.displayName?.charAt(0) || 'P';
          const initialB = profile.lastName?.charAt(0) || '';
          setUserInitials((initialA + initialB).toUpperCase() || 'TW');
        } else {
          setFirstName(user.displayName?.split(' ')[0] || 'Participante');
          setUserInitials(user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'TW');
        }
      } catch {
        setFirstName('Participante');
      }
    });

    return () => unsubscribe();
  }, []);

  // Atividades
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

  // Feed
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

  // Inscrições e Pontos
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

  // Atividade do Momento (Destaque Principal)
  const currentActivity = useMemo(() => activities[0] || null, [activities]);

  // Próximos Destaques da Grade (Carrossel Horizontal)
  const featuredActivities = useMemo(() => activities.slice(1, 6), [activities]);

  // Determina se o app está no período de aquecimento/pré-evento (antes de 21 Out 2026 08:00)
  const isPreEvent = useMemo(() => {
    const eventStartDate = new Date(2026, 9, 21, 8, 0, 0); // 21/10/2026 08:00 BRT
    return new Date() < eventStartDate;
  }, []);

  const getCategoryAccent = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('workshop')) return '#F59E0B';
    if (t.includes('minicurso')) return '#A855F7';
    if (t.includes('estande') || t.includes('ativa')) return '#10B981';
    if (t.includes('hack')) return '#EC4899';
    return '#38BDF8';
  };

  // Gamificação Secundária
  const userXP = typeof hookPoints === 'number' ? hookPoints : (userProfile?.totalPoints || 0);
  const gameLevel = useMemo(() => calculateLevel(userXP), [userXP]);

  // Publicação Ativa
  const activeFeedPost = latestPost || DEFAULT_FEED_POSTS[0];

  // Cancela Reserva de Vaga Presencial
  const handleCancelReserve = async (activityId) => {
    if (!currentUser?.uid) return;
    setCancellingId(activityId);
    try {
      await cancelActivityReservation(activityId);
      setBookings((prev) => prev.filter((b) => {
        const bActId = b.activityId || b.activity_id;
        return bActId !== activityId && b.id !== activityId && !b.id?.endsWith(`_${activityId}`);
      }));
      setToastMessage({ type: 'info', message: 'Inscrição cancelada e vaga liberada com sucesso.' });
    } catch (err) {
      setToastMessage({ type: 'error', message: err.data?.message || err.message || 'Erro ao cancelar inscrição.' });
    } finally {
      setCancellingId(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Ação de Reserva/Inscrição no Dashboard com Fallback Gracioso
  const handleReserve = async (activityId) => {
    if (!currentUser?.uid) {
      setToastMessage({ type: 'warning', message: 'Faça login com sua conta para se inscrever nas atividades.' });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    if (!hasSymplaTicket) {
      setShowSymplaModal(true);
      return;
    }

    setReservingId(activityId);
    try {
      const res = await reserveActivity(activityId);
      if (res && (res.status === 'CONFIRMED' || res.status === 'WAITING_LIST' || res.success || res.alreadyBooked)) {
        setBookings((prev) => {
          const exists = prev.some((b) => (b.activityId || b.id) === activityId || b.id === `${currentUser.uid}_${activityId}`);
          if (exists) return prev;
          return [...prev, { id: `${currentUser.uid}_${activityId}`, activityId, userId: currentUser.uid, status: res.status || 'CONFIRMED' }];
        });

        if (res.status === 'WAITING_LIST') {
          setToastMessage({ type: 'warning', message: `Você entrou na lista de espera (Posição #${res.position || 1}).` });
        } else if (res.alreadyBooked) {
          setToastMessage({ type: 'info', message: 'Você já possui inscrição confirmada nesta atividade!' });
        } else {
          setToastMessage({ type: 'success', message: 'Inscrição confirmada com sucesso! Vaga garantida na sua Agenda.' });
        }
      } else {
        setToastMessage({ type: 'error', message: res?.message || 'Não foi possível confirmar a inscrição.' });
      }
    } catch (err) {
      if (err.status === 403 && (err.data?.error === 'SYMPLA_TICKET_REQUIRED' || err.data?.code === 'SYMPLA_TICKET_REQUIRED')) {
        setToastMessage({ 
          type: 'warning', 
          message: 'Ingresso do Sympla obrigatório! Vincule seu ingresso no Perfil para garantir sua vaga presencial.' 
        });
      } else {
        const errorMsg = err.data?.message || err.message;
        setToastMessage({ 
          type: 'error', 
          message: (errorMsg && !errorMsg.includes('Failed to fetch')) 
            ? errorMsg 
            : 'Erro de conexão ao servidor de reservas. Tente novamente em instantes.' 
        });
      }
    } finally {
      setReservingId(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div 
      className="page-container animate-fade-in"
      style={{
        maxWidth: '430px',
        margin: '0 auto',
        paddingLeft: '18px',
        paddingRight: '18px',
        paddingTop: '6px',
        paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 84px))',
        color: '#F8FAFC'
      }}
    >
      <SymplaStickyBanner />
      <style>{`
        @keyframes livePulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7);
            opacity: 0.85;
          }
          70% {
            transform: scale(1.25);
            box-shadow: 0 0 0 6px rgba(56, 189, 248, 0);
            opacity: 1;
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(56, 189, 248, 0);
            opacity: 0.85;
          }
        }
        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #38BDF8;
          animation: livePulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          flex-shrink: 0;
          display: inline-block;
        }
        .now-card-border {
          background: #0F141F;
          border: 1px solid #1E293B;
          border-radius: 18px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .now-card-border:active {
          transform: scale(0.99);
        }
        .horizontal-scroll-container {
          display: flex;
          overflow-x: auto;
          gap: 12px;
          padding-bottom: 8px;
          padding-top: 4px;
          padding-right: 32px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x mandatory;
          -webkit-mask-image: linear-gradient(to right, black 82%, transparent 100%);
          mask-image: linear-gradient(to right, black 82%, transparent 100%);
        }
        .horizontal-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .mini-event-card {
          flex: 0 0 240px;
          scroll-snap-align: start;
          background: #0F141F;
          border: 1px solid #1E293B;
          border-radius: 14px;
          padding: 12px 14px;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .mini-event-card:active {
          transform: scale(0.98);
          border-color: #38BDF8;
        }
        .quick-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          gap: 8px;
          background: #0F141F;
          border: 1px solid #1E293B;
          border-radius: 16px;
          padding: 14px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .quick-action-btn:active {
          transform: scale(0.96);
          border-color: #38BDF8;
          background: #141C2B;
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. HERO OFICIAL — IDENTIDADE FACOM TECHWEEK + SAUDAÇÃO PROEMINENTE */}
      {/* ============================================================ */}
      <section
        style={{
          position: 'relative',
          borderRadius: '24px',
          background: 'radial-gradient(ellipse at 85% 15%, rgba(37, 99, 235, 0.16) 0%, rgba(124, 58, 237, 0.1) 35%, transparent 70%), linear-gradient(175deg, #090E21 0%, #050814 60%, #03060E 100%)',
          border: '1px solid #1E293B',
          boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          padding: '18px 16px 16px',
          marginBottom: '20px'
        }}
      >
        {/* Barra Técnica Superior */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.62rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#64748B',
            letterSpacing: '0.08em',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '10px',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#94A3B8', fontWeight: 800 }}>+</span>
            <span>UFU // FACOM</span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>18°55'S 48°15'W</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Abrir Perfil"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#94A3B8',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.72rem',
                fontWeight: 700,
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
        </div>

        {/* Linha Central: Logotipo Oficial + Datas Oficiais */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <img
            src={logoTw}
            alt="FACOM TechWeek 2026"
            style={{ 
              height: '42px', 
              width: 'auto', 
              maxWidth: '185px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.8))'
            }}
          />

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              borderRadius: '8px',
              padding: '6px 10px'
            }}
          >
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#F8FAFC',
                letterSpacing: '0.02em'
              }}
            >
              21 — 26 OUT
            </span>
            <span style={{ color: '#475569' }}>•</span>
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.74rem',
                color: '#94A3B8',
                fontWeight: 700
              }}
            >
              2026
            </span>
          </div>
        </div>

        {/* BLOCO DE SAUDAÇÃO COM DESTAQUE MAIOR & CREDENCIAL INTEGRADA */}
        <div
          style={{
            padding: '14px 14px 12px',
            backgroundColor: 'rgba(15, 20, 31, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.66rem',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '3px'
              }}
            >
              BEM-VINDO(A) DE VOLTA
            </div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '1.42rem',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: '-0.02em'
              }}
            >
              Olá, {firstName}
            </h1>
          </div>

          <div>
            {hasSymplaTicket ? (
              <div
                onClick={() => navigate('/profile')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/profile'); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.72rem',
                  color: '#60A5FA',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.55)',
                  boxShadow: '0 0 14px rgba(37, 99, 235, 0.35)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  whiteSpace: 'nowrap'
                }}
              >
                <CheckCircle2 size={13} color="#60A5FA" strokeWidth={2} />
                <span>Crachá Ativo</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#0F141F',
                  border: '1px solid #1E293B',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  fontSize: '0.72rem',
                  color: '#CBD5E1',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Ticket size={13} color="#94A3B8" strokeWidth={1.75} />
                <span>Vincular Ingresso</span>
                <ArrowRight size={11} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Fases do Evento: 21-23 Palestras | 24-25 Hackathon | 26 Premiação (Forma de Crachá Neutra) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            fontSize: '0.66rem',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          <div
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.68rem' }}>21 — 23 OUT</div>
            <div style={{ color: '#94A3B8', fontSize: '0.60rem' }}>Palestras & Minis</div>
          </div>

          <div
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.68rem' }}>24 — 25 OUT</div>
            <div style={{ color: '#94A3B8', fontSize: '0.60rem' }}>Hackathon 48h</div>
          </div>

          <div
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.68rem' }}>26 OUT</div>
            <div style={{ color: '#94A3B8', fontSize: '0.60rem' }}>Premiação Final</div>
          </div>
        </div>
      </section>

      {/* BANNER EDUCATIVO DE INSTALAÇÃO DO PWA (DISPENSÁVEL COM PERSISTÊNCIA 24H) */}
      <InstallPwaCard />

      {/* ============================================================ */}
      {/* 2. PROGRAMAÇÃO: PRÉ-EVENTO (AQUECIMENTO) OU AO VIVO          */}
      {/* ============================================================ */}
      <section style={{ marginBottom: '24px' }}>
        {isPreEvent ? (
          /* ESTADO 1: PRÉ-EVENTO COM ALAN & ADA CONVIDANDO PARA INSCRIÇÃO */
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  AQUECIMENTO TECHWEEK
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/agenda')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: 0
                }}
              >
                <span>Ver grade</span>
                <ArrowRight size={12} strokeWidth={1.75} />
              </button>
            </div>

            {/* Card de Boas-Vindas e Inscrição com Alan & Ada (Nível 2 — Neutro #0F141F) */}
            <div
              style={{
                backgroundColor: '#0F141F',
                border: '1px solid #1E293B',
                borderRadius: '16px',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                padding: '16px',
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Sparkles size={14} color="#94A3B8" strokeWidth={1.75} />
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: '#64748B',
                        textTransform: 'uppercase',
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: '0.05em'
                      }}
                    >
                      ALAN & ADA AVISAM
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '1.02rem',
                      fontWeight: 700,
                      color: '#F8FAFC',
                      lineHeight: 1.25,
                      margin: '0 0 6px'
                    }}
                  >
                    {hasSymplaTicket ? 'Garanta suas vagas na grade!' : 'Faça sua inscrição e ative seu crachá!'}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.76rem',
                      color: '#94A3B8',
                      lineHeight: 1.42,
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {hasSymplaTicket
                      ? 'Seu crachá oficial já está ativado. Aproveite agora para explorar a programação e garantir sua vaga nas palestras e minicursos concorridos.'
                      : 'O evento começa dia 21 de Outubro. Vincule seu ingresso do Sympla para liberar seu crachá digital, acumular XP e reservar vagas.'
                    }
                  </p>
                </div>

                {/* Mascotes Alan & Ada juntos */}
                <div style={{ width: '92px', height: '68px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MascotDuo style={{ width: '100%', height: '100%' }} />
                </div>
              </div>

              {/* Botões de Ação do Pré-Evento */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {!hasSymplaTicket ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      style={{
                        flex: 1,
                        minWidth: '160px',
                        backgroundColor: '#2563EB',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        color: '#FFFFFF',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Ticket size={14} strokeWidth={1.75} />
                      <span>Vincular Ingresso Sympla</span>
                      <ArrowRight size={13} strokeWidth={1.75} />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/agenda')}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #1E293B',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        color: '#94A3B8',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Calendar size={13} strokeWidth={1.75} />
                      <span>Ver Grade</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/agenda')}
                    style={{
                      flex: 1,
                      backgroundColor: '#2563EB',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      color: '#FFFFFF',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Calendar size={14} strokeWidth={1.75} />
                    <span>Explorar e Reservar Vagas</span>
                    <ArrowRight size={13} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ESTADO 2: AO VIVO DURANTE O EVENTO (ACONTECENDO AGORA) */
          currentActivity && (
            <>
              {/* Header da Seção */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="live-pulse-dot" />
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#64748B',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}
                  >
                    ACONTECENDO AGORA
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/agenda')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: 0
                  }}
                >
                  <span>Ver grade</span>
                  <ArrowRight size={12} strokeWidth={1.75} />
                </button>
              </div>

              {/* Card Principal da Atividade Atual */}
              <div
                onClick={() => setSelectedActivity(currentActivity)}
                className="now-card-border"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedActivity(currentActivity); }}
                style={{
                  padding: '16px',
                  borderLeft: `4px solid ${getCategoryAccent(currentActivity.type)}`,
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: getCategoryAccent(currentActivity.type),
                      textTransform: 'uppercase',
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      letterSpacing: '0.04em'
                    }}
                  >
                    {currentActivity.type || 'Palestra Magna'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700
                      }}
                    >
                      {currentActivity.time || '19:00'}
                    </span>

                    {(() => {
                      const st = calculateActivityStatus(currentActivity.id, bookings, checkins, pointEvents);
                      if (st === 'COMPLETED') {
                        return (
                          <span style={{ color: '#10B981', fontSize: '0.64rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={11} />
                            Presença Confirmada
                          </span>
                        );
                      }
                      if (st === 'BOOKED' || st === 'CHECKED_IN') {
                        return (
                          <span style={{ color: '#10B981', fontSize: '0.64rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <BookmarkCheck size={11} />
                            Inscrito
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    lineHeight: 1.3,
                    marginBottom: '6px'
                  }}
                >
                  {currentActivity.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#64748B' }}>
                    <MapPin size={13} color="#94A3B8" />
                    <span>{currentActivity.location || 'Auditório 5R'}</span>
                    {currentActivity.speaker && (
                      <>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span style={{ color: '#94A3B8' }}>{currentActivity.speaker}</span>
                      </>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#94A3B8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>Detalhes</span>
                    <ChevronRight size={14} strokeWidth={1.75} />
                  </span>
                </div>
              </div>
            </>
          )
        )}

        {/* Carrossel Horizontal: Destaques da Grade / A Seguir */}
        {featuredActivities && featuredActivities.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              {isPreEvent ? 'DESTAQUES DA PROGRAMAÇÃO' : 'A SEGUIR NA GRADE'}
            </div>
              <div className="horizontal-scroll-container">
                {featuredActivities.map((act) => {
                  const actStatus = calculateActivityStatus(act.id, bookings, checkins, pointEvents);
                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className="mini-event-card"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedActivity(act); }}
                      style={{ borderLeft: `3px solid ${getCategoryAccent(act.type)}` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: getCategoryAccent(act.type), textTransform: 'uppercase' }}>
                          {act.type || 'Palestra'}
                        </span>
                        <span style={{ fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8', fontWeight: 700 }}>
                          {act.time}
                        </span>
                      </div>

                      <div
                        style={{
                          fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: '#F8FAFC',
                          lineHeight: 1.25,
                          marginBottom: '6px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {act.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748B' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                          {act.location || 'FACOM'}
                        </span>
                        {actStatus === 'BOOKED' && (
                          <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Inscrito</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      {/* ============================================================ */}
      {/* 3. EMBLEMA GAMIFICADO & MEU PROGRESSO (SWEEP NAVY→ROXO)      */}
      {/* ============================================================ */}
      <section style={{ marginBottom: '22px' }}>
        <div
          onClick={() => navigate('/ranking')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/ranking'); }}
          style={{
            position: 'relative',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(10, 14, 33, 0.96) 0%, rgba(30, 27, 75, 0.7) 55%, rgba(76, 29, 149, 0.3) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            boxShadow: '0 12px 32px -8px rgba(76, 29, 149, 0.2)',
            padding: '16px',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease, transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            {/* Selo / Emblema Visual com Anel Circular SVG */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                {/* SVG Progress Ring */}
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="27"
                    stroke="url(#xpProgressGrad)"
                    strokeWidth="3.5"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 27}
                    strokeDashoffset={2 * Math.PI * 27 - (2 * Math.PI * 27 * (gameLevel.progress || 0)) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                  <defs>
                    <linearGradient id="xpProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Centro do Selo: Ícone do Nível Monocromático */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Zap size={16} color="#94A3B8" strokeWidth={1.75} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#F8FAFC',
                      lineHeight: 1,
                      marginTop: '2px'
                    }}
                  >
                    N{gameLevel.level}
                  </span>
                </div>
              </div>

              {/* Informações Integradas ao Selo */}
              <div>
                <div style={{ marginBottom: '3px' }}>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: '#F8FAFC',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Nível {gameLevel.level} · {gameLevel.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#F8FAFC'
                    }}
                  >
                    {userXP}
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#94A3B8', fontWeight: 700 }}>XP</span>
                  {gameLevel.pointsToNext > 0 && (
                    <span style={{ fontSize: '0.64rem', color: '#94A3B8' }}>
                      ({gameLevel.pointsToNext} XP para o próximo nível)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acesso ao Ranking sem seta em texto */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#94A3B8',
                fontSize: '0.72rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              <span>Ranking</span>
              <ChevronRight size={14} strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Dica Inteligente de Alan & Ada (Sem setas em texto) */}
        <div
          onClick={() => navigate('/challenges')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/challenges'); }}
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            borderRadius: '12px',
            padding: '9px 12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '28px', height: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mascot color="blue" isWaving={true} style={{ width: '28px', height: '28px' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.66rem',
                color: '#64748B',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                marginBottom: '1px'
              }}
            >
              DICA DE ALAN & ADA
            </div>
            <p style={{ margin: 0, fontSize: '0.70rem', color: '#94A3B8', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
              Bipe nos estandes ou participe das palestras para somar até +100 XP.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#94A3B8', fontSize: '0.68rem', fontWeight: 600, flexShrink: 0 }}>
            <span>Desafios</span>
            <ArrowRight size={12} strokeWidth={1.75} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. AÇÕES RÁPIDAS & TELEMETRIA OPERACIONAL (SQUIRCLE + DADOS)  */}
      {/* ============================================================ */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}
        >
          {/* Programação */}
          <div
            className="quick-action-btn"
            onClick={() => navigate('/agenda')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/agenda'); }}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
            }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#94A3B8" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                Programação
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: '2px' }}>
                {activities.length > 0 ? `${activities.length} atividades` : 'Grade oficial'}
              </div>
            </div>
          </div>

          {/* Escanear QR */}
          <div
            className="quick-action-btn"
            onClick={() => navigate('/scanner')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/scanner'); }}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
            }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={18} color="#94A3B8" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                Escanear QR
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: '2px' }}>
                {checkins.length > 0 ? `${checkins.length} presenças` : 'Check-in ativo'}
              </div>
            </div>
          </div>

          {/* Missões */}
          <div
            className="quick-action-btn"
            onClick={() => navigate('/challenges')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/challenges'); }}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
            }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={18} color="#94A3B8" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                Missões
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: '2px' }}>
                5 ativas • +XP
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div
            className="quick-action-btn"
            onClick={() => navigate('/ranking')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/ranking'); }}
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)'
            }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={18} color="#94A3B8" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                Ranking
              </div>
              <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: '2px' }}>
                Tabela ao vivo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. COMUNICADOS & FEED (PULSO DA COMUNIDADE)                 */}
      {/* ============================================================ */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            ÚLTIMO COMUNICADO
          </span>

          <button
            type="button"
            onClick={() => navigate('/feed')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: 0
            }}
          >
            <span>Ver feed</span>
            <ArrowRight size={12} strokeWidth={1.75} />
          </button>
        </div>

        <div 
          onClick={() => navigate('/feed')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/feed'); }}
          style={{
            background: '#0F141F',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '14px',
            cursor: 'pointer'
          }}
        >
          {/* Autor Oficial (Círculo para foto de pessoa real) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}
            >
              {activeFeedPost.authorAvatar ? (
                <img 
                  src={activeFeedPost.authorAvatar} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8', fontWeight: 800, fontSize: '0.65rem' }}>
                  TW
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#F8FAFC'
                  }}
                >
                  {activeFeedPost.author || 'Organização FACOM TechWeek'}
                </span>
                {/* Selo Verificado em Squircle */}
                <span
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    width: '13px',
                    height: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.52rem',
                    fontWeight: 900
                  }}
                >
                  ✓
                </span>
              </div>
              <div style={{ fontSize: '0.64rem', color: '#64748B' }}>
                {activeFeedPost.formattedTime || 'há pouco'}
              </div>
            </div>
          </div>

          {/* Texto do Post */}
          <p
            style={{
              fontSize: '0.8rem',
              color: '#CBD5E1',
              lineHeight: 1.44,
              margin: '0 0 10px',
              fontFamily: "'Inter', sans-serif",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {activeFeedPost.content}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Heart size={12} color="#EF4444" fill="#EF4444" />
              <span>{activeFeedPost.likes?.length || 12} curtidas</span>
            </span>

            <span style={{ color: '#94A3B8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <span>Abrir postagem</span>
              <ArrowRight size={12} strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. APOIO & REALIZAÇÃO (RODAPÉ SUTIL)                         */}
      {/* ============================================================ */}
      <footer
        style={{
          paddingTop: '16px',
          paddingBottom: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '0.66rem',
            fontWeight: 700,
            color: '#64748B',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          REALIZAÇÃO & PARCEIROS OFICIAIS
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#94A3B8',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          <span>FACOM / UFU</span>
          <span style={{ color: '#334155' }}>•</span>
          <span>DACOMP</span>
          <span style={{ color: '#334155' }}>•</span>
          <span>EMPRESAS PARCEIRAS</span>
        </div>
      </footer>

      {/* FEEDBACK TOAST ERGONÔMICO */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '390px',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'success' ? '#064E3B' : toastMessage.type === 'warning' ? '#78350F' : '#7F1D1D',
            border: `1px solid ${toastMessage.type === 'success' ? '#10B981' : toastMessage.type === 'warning' ? '#F59E0B' : '#EF4444'}`,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#34D399" />
          ) : toastMessage.type === 'warning' ? (
            <AlertTriangle size={18} color="#FBBF24" />
          ) : (
            <AlertCircle size={18} color="#F87171" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* MODAL OFICIAL DE DETALHES DA ATIVIDADE */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          status={calculateActivityStatus(selectedActivity.id, bookings, checkins, pointEvents)}
          isReserving={reservingId === selectedActivity.id}
          isCancelling={cancellingId === selectedActivity.id}
          onReserve={handleReserve}
          onCancelReserve={handleCancelReserve}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      <SymplaRequirementModal
        isOpen={showSymplaModal}
        onClose={() => setShowSymplaModal(false)}
        featureName="a reserva de vagas na grade presencial"
      />
    </div>
  );
}

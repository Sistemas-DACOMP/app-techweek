import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  BookmarkCheck, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  QrCode
} from 'lucide-react';
import MascotDuo from '../components/MascotDuo';
import logoTw from '../assets/logo-tw.png';
import { onAuthChange } from '../lib/auth';
import { getUserProfile } from '../lib/userService';
import { useUser } from '../hooks/useUser';
import ActivityCard from '../components/ActivityCard';
import ActivityModal from '../components/ActivityModal';
import ActivityCheckoutScannerModal from '../components/ActivityCheckoutScannerModal';
import LectureScanner from '../components/LectureScanner';
import { 
  subscribeToActivities, 
  subscribeToUserBookings, 
  subscribeToUserCheckins, 
  subscribeToUserPointEvents,
  reserveActivity,
  calculateActivityStatus,
  DEFAULT_ACTIVITIES
} from '../lib/activityService';

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasSymplaTicket } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [firstName, setFirstName] = useState('Visitante');
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Tabs: 'all' | 'my_agenda'
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data from Real-time Listeners
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [bookings, setBookings] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [pointEvents, setPointEvents] = useState([]);

  // UI States
  const [reservingId, setReservingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal States
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [checkoutModalActivity, setCheckoutModalActivity] = useState(null);
  const [selfScanActivity, setSelfScanActivity] = useState(null);

  // 1. Auth & User Profile
  useEffect(() => {
    async function loadUserProfile(user) {
      if (!user) {
        setCurrentUser(null);
        setFirstName('Visitante');
        setAvatarUrl(null);
        return;
      }

      setCurrentUser(user);

      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          const name = profile.firstName || profile.displayName?.split(' ')[0] || profile.username || user.displayName?.split(' ')[0] || 'Visitante';
          const avatar = profile.avatarUrl || profile.photoURL || user.photoURL || null;
          setFirstName(name);
          setAvatarUrl(avatar);
        } else {
          setFirstName(user.displayName?.split(' ')[0] || 'Visitante');
          setAvatarUrl(user.photoURL || null);
        }
      } catch (err) {
        console.warn('Aviso: Erro ao carregar perfil do Firestore no Dashboard:', err);
        setFirstName(user.displayName?.split(' ')[0] || 'Visitante');
        setAvatarUrl(user.photoURL || null);
      }
    }

    const unsubscribe = onAuthChange((user) => {
      loadUserProfile(user);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubActivities = subscribeToActivities((list) => {
      setActivities(list);
    });

    return () => {
      if (typeof unsubActivities === 'function') unsubActivities();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setBookings([]);
      setCheckins([]);
      setPointEvents([]);
      return;
    }

    const unsubBookings = subscribeToUserBookings(currentUser.uid, (data) => {
      setBookings(data);
    });

    const unsubCheckins = subscribeToUserCheckins(currentUser.uid, (data) => {
      setCheckins(data);
    });

    const unsubPoints = subscribeToUserPointEvents(currentUser.uid, (data) => {
      setPointEvents(data);
    });

    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof unsubCheckins === 'function') unsubCheckins();
      if (typeof unsubPoints === 'function') unsubPoints();
    };
  }, [currentUser?.uid]);

  // Distinct days available in the activities
  const availableDays = useMemo(() => {
    const set = new Set();
    activities.forEach((a) => {
      if (a.day) set.add(a.day);
    });
    return Array.from(set);
  }, [activities]);

  // Map of activity statuses for quick lookup
  const activityStatuses = useMemo(() => {
    const map = {};
    activities.forEach((act) => {
      map[act.id] = calculateActivityStatus(act.id, bookings, checkins, pointEvents);
    });
    return map;
  }, [activities, bookings, checkins, pointEvents]);

  // Activities for "Minha Agenda"
  const myAgendaActivities = useMemo(() => {
    return activities.filter((act) => {
      const status = activityStatuses[act.id];
      return status === 'BOOKED' || status === 'CHECKED_IN' || status === 'COMPLETED' || status === 'WAITING_LIST';
    });
  }, [activities, activityStatuses]);

  // Filtered activities for "Todas as Atividades"
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type Filter
      if (selectedType !== 'all') {
        const normType = (act.type || '').toLowerCase();
        if (normType !== selectedType) return false;
      }

      // Day Filter
      if (selectedDay !== 'all') {
        if (act.day !== selectedDay && act.date !== selectedDay) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (act.title || '').toLowerCase().includes(query);
        const speakerMatch = (act.speaker || '').toLowerCase().includes(query);
        const locationMatch = (act.location || '').toLowerCase().includes(query);
        if (!titleMatch && !speakerMatch && !locationMatch) return false;
      }

      return true;
    });
  }, [activities, selectedType, selectedDay, searchQuery]);

  // Inscription action handler (< 300ms visual response)
  const handleReserve = async (activityId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setReservingId(activityId);

    try {
      const res = await reserveActivity(activityId);
      if (res.status === 'CONFIRMED') {
        showToast('Vaga garantida com sucesso!', 'success');
      } else if (res.status === 'WAITING_LIST') {
        showToast(`Você entrou na lista de espera (Posição #${res.position || 1})`, 'warning');
      } else {
        showToast('Inscrição confirmada!', 'success');
      }
    } catch (err) {
      if (err.status === 409 || err.message?.includes('already')) {
        showToast('Você já está inscrito nesta atividade!', 'info');
      } else {
        showToast(err.message || 'Não foi possível concluir a reserva.', 'error');
      }
    } finally {
      setReservingId(null);
    }
  };

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="page-container animate-fade-in dashboard-page" style={{ paddingBottom: '130px' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '390px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: toastMessage.type === 'success'
              ? 'rgba(6, 78, 59, 0.95)'
              : toastMessage.type === 'warning'
              ? 'rgba(120, 53, 15, 0.95)'
              : toastMessage.type === 'error'
              ? 'rgba(127, 29, 29, 0.95)'
              : 'rgba(30, 58, 138, 0.95)',
            border: `1px solid ${
              toastMessage.type === 'success'
                ? '#10b981'
                : toastMessage.type === 'warning'
                ? '#f59e0b'
                : toastMessage.type === 'error'
                ? '#ef4444'
                : '#3b82f6'
            }`,
            backdropFilter: 'blur(16px)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} color="#34d399" />
          ) : (
            <AlertCircle size={18} color={toastMessage.type === 'warning' ? '#fbbf24' : '#f87171'} />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Hero section */}
      <div className="hero-white">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ width: '88px' }}></div>
          <img src={logoTw} alt="Tech Week Logo" style={{ height: '60px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NotificationBell />
            <div
              className="header-avatar"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                firstName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <MascotDuo />
        </div>
        <h2 style={{ color: 'white', textAlign: 'center', marginTop: '16px', marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700' }}>
          Olá, {firstName}!
        </h2>
      </div>

      {/* Interactive Tabs Header (Todas as Atividades / Minha Agenda) */}
      <div style={{ margin: '24px 0 16px' }}>
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '18px',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              fontFamily: "'Montserrat', sans-serif",
              padding: '12px 8px',
              borderRadius: '14px',
              background: activeTab === 'all' 
                ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' 
                : 'transparent',
              color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'all' ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
            }}
          >
            <Calendar size={16} />
            <span>Todas as Atividades</span>
          </button>

          <button
            onClick={() => setActiveTab('my_agenda')}
            style={{
              flex: 1,
              fontFamily: "'Montserrat', sans-serif",
              padding: '12px 8px',
              borderRadius: '14px',
              background: activeTab === 'my_agenda' 
                ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' 
                : 'transparent',
              color: activeTab === 'my_agenda' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'my_agenda' ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
            }}
          >
            <BookmarkCheck size={16} />
            <span>Minha Agenda</span>
            {myAgendaActivities.length > 0 && (
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  background: activeTab === 'my_agenda' ? 'rgba(255,255,255,0.25)' : '#3b82f6',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}
              >
                {myAgendaActivities.length}
              </span>
            )}
          </button>
        </div>
      </div>

<<<<<<< HEAD
      <LectureModal
        lecture={selectedLecture}
        hasSymplaTicket={hasSymplaTicket}
        onClose={() => setSelectedLecture(null)}
        onValidate={() => {
          if (!hasSymplaTicket) {
            navigate('/profile');
            return;
          }
          setShowLectureScanner(true);
=======
      {/* Tab: TODAS AS ATIVIDADES */}
      {activeTab === 'all' && (
        <div className="schedule-panel animate-fade-in" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {/* Search bar */}
          <div
            style={{
              position: 'relative',
              marginBottom: '16px'
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Buscar palestras, workshops, palestrante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                fontFamily: "'Montserrat', sans-serif",
                padding: '12px 14px 12px 38px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Type Filter Chips */}
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '10px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {[
              { id: 'all', label: 'Todas' },
              { id: 'palestra', label: 'Palestras' },
              { id: 'minicurso', label: 'Minicursos' },
              { id: 'workshop', label: 'Workshops' },
              { id: 'ativacao', label: 'Ativações' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  whiteSpace: 'nowrap',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  background: selectedType === type.id
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: selectedType === type.id
                    ? '1px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: selectedType === type.id ? '#60a5fa' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Day Filter Grid (Todos os dias cabem na tela sem rolagem) */}
          {availableDays.length > 0 && (
            <div
              className="no-scrollbar"
              style={{
                display: 'flex',
                gap: '6px',
                width: '100%',
                justifyContent: 'space-between',
                marginBottom: '18px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <button
                onClick={() => setSelectedDay('all')}
                style={{
                  flex: 1,
                  fontFamily: "'Montserrat', sans-serif",
                  padding: '8px 2px',
                  borderRadius: '12px',
                  background: selectedDay === 'all'
                    ? 'rgba(14, 165, 233, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: selectedDay === 'all'
                    ? '1px solid #0ea5e9'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: selectedDay === 'all' ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '12px',
                  fontWeight: '700',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Todos
              </button>

              {availableDays.map((day) => {
                const dayOnly = day.includes('/') ? day.split('/')[0] : day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      flex: 1,
                      fontFamily: "'Montserrat', sans-serif",
                      padding: '8px 2px',
                      borderRadius: '12px',
                      background: selectedDay === day
                        ? 'rgba(14, 165, 233, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: selectedDay === day
                        ? '1px solid #0ea5e9'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: selectedDay === day ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '12px',
                      fontWeight: '700',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Dia {dayOnly}
                  </button>
                );
              })}
            </div>
          )}

          {/* Activities List */}
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                tab="all"
                status={activityStatuses[activity.id] || 'NONE'}
                isReserving={reservingId === activity.id}
                onReserve={handleReserve}
                onOpenDetails={(act) => setSelectedActivity(act)}
              />
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Nenhuma atividade encontrada com os filtros selecionados.</p>
              <button
                onClick={() => {
                  setSelectedType('all');
                  setSelectedDay('all');
                  setSearchQuery('');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#60a5fa',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: MINHA AGENDA */}
      {activeTab === 'my_agenda' && (
        <div className="schedule-panel animate-fade-in">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', marginBottom: '4px' }}>
              Minha Programação
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Acompanhe suas atividades reservadas, status de entrada e realize o checkout pelo telão.
            </p>
          </div>

          {myAgendaActivities.length > 0 ? (
            myAgendaActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                tab="my_agenda"
                status={activityStatuses[activity.id] || 'BOOKED'}
                onOpenDetails={(act) => setSelectedActivity(act)}
                onOpenCheckoutScanner={(act) => setCheckoutModalActivity(act)}
                onOpenSelfScanner={(act) => setSelfScanActivity(act)}
              />
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#60a5fa'
                }}
              >
                <BookmarkCheck size={30} />
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
                Nenhuma atividade na sua agenda
              </h4>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                Explore a grade completa de eventos na aba "Todas as Atividades" e garanta sua vaga nas palestras e workshops!
              </p>

              <button
                onClick={() => setActiveTab('all')}
                className="btn-primary"
                style={{ 
                  fontFamily: "'Montserrat', sans-serif",
                  padding: '12px 24px', 
                  fontSize: '13px', 
                  fontWeight: '700',
                  borderRadius: '14px',
                  cursor: 'pointer'
                }}
              >
                Ver Grade Completa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Details Modal */}
      <ActivityModal
        activity={selectedActivity}
        status={selectedActivity ? (activityStatuses[selectedActivity.id] || 'NONE') : 'NONE'}
        isReserving={selectedActivity ? reservingId === selectedActivity.id : false}
        onClose={() => setSelectedActivity(null)}
        onReserve={(actId) => {
          handleReserve(actId);
          setSelectedActivity(null);
        }}
        onOpenCheckoutScanner={(act) => {
          setSelectedActivity(null);
          setCheckoutModalActivity(act);
        }}
        onOpenSelfScanner={(act) => {
          setSelectedActivity(null);
          setSelfScanActivity(act);
>>>>>>> feature/KAN-50-grade-atividades
        }}
      />

      {/* Double Check Screen QR Scanner Modal (KAN-51 / KAN-50) */}
      {checkoutModalActivity && (
        <ActivityCheckoutScannerModal
          activity={checkoutModalActivity}
          onClose={() => setCheckoutModalActivity(null)}
          onSuccess={(_res) => {
            showToast('Presença confirmada e pontos creditados!', 'success');
          }}
        />
      )}

      {/* Self Scan Scanner Modal (LectureScanner) */}
      {selfScanActivity && (
        <LectureScanner
          lecture={selfScanActivity}
          onClose={() => setSelfScanActivity(null)}
          onBack={() => setSelfScanActivity(null)}
        />
      )}
    </div>
  );
}
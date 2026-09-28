import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Search, 
  X, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  BookmarkCheck, 
  ChevronRight, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { CATEGORY_STYLES } from '../components/Badge';
import { onAuthChange } from '../lib/auth';
import { useUser } from '../hooks/useUser';
import ActivityModal from '../components/ActivityModal';
import ActivityCheckoutScannerModal from '../components/ActivityCheckoutScannerModal';
import LectureScanner from '../components/LectureScanner';
import Mascot from '../components/Mascot';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import { 
  subscribeToActivities, 
  subscribeToUserBookings, 
  subscribeToUserCheckins, 
  subscribeToUserPointEvents, 
  reserveActivity, 
  cancelActivityReservation,
  calculateActivityStatus, 
  DEFAULT_ACTIVITIES 
} from '../lib/activityService';

export default function Agenda() {
  const navigate = useNavigate();
  const { hasSymplaTicket } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [showSymplaModal, setShowSymplaModal] = useState(false);

  // Abas: 'all' (Programação) | 'my_agenda' (Minha Agenda)
  const [activeTab, setActiveTab] = useState('all');

  // Filtros
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dados
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [bookings, setBookings] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [pointEvents, setPointEvents] = useState([]);

  // Estados de UI e Agenda Pessoal
  const [reservingId, setReservingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modais
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [checkoutModalActivity, setCheckoutModalActivity] = useState(null);
  const [selfScanActivity, setSelfScanActivity] = useState(null);

  // 1. Escuta Autenticação
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  // 2. Escuta Atividades em Tempo Real
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

  // 3. Escuta Reservas, Check-ins e Pontos do Usuário
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

  // Dias Reais Disponíveis no Evento (Pills compactas: SEG 19, TER 20, etc.)
  const availableDays = useMemo(() => {
    const daysMap = new Map();

    const getWeekday = (dayStr) => {
      const weekdays = {
        '21/10': 'QUA',
        '22/10': 'QUI',
        '23/10': 'SEX',
        '24/10': 'SÁB',
        '25/10': 'DOM',
        '26/10': 'SEG'
      };
      return weekdays[dayStr] || 'DIA';
    };

    activities.forEach((act) => {
      if (act.day && !daysMap.has(act.day)) {
        const [dayNum] = act.day.split('/');
        const weekday = getWeekday(act.day);
        daysMap.set(act.day, {
          id: act.day,
          label: `${weekday} ${dayNum}`,
          dayNum,
          weekday
        });
      }
    });

    return Array.from(daysMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [activities]);

  // Verifica se uma data coincide com hoje
  const isCurrentDayToday = (dayStr) => {
    try {
      const now = new Date();
      const currentDay = String(now.getDate()).padStart(2, '0');
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      return dayStr === `${currentDay}/${currentMonth}`;
    } catch {
      return false;
    }
  };

  // Status de Inscrição/Check-in de Cada Atividade
  const activityStatuses = useMemo(() => {
    const statuses = {};
    activities.forEach((act) => {
      statuses[act.id] = calculateActivityStatus(act.id, bookings, checkins, pointEvents);
    });
    return statuses;
  }, [activities, bookings, checkins, pointEvents]);

  // Lista de Atividades do Usuário ("Minha Agenda")
  const myAgendaActivities = useMemo(() => {
    return activities.filter((act) => {
      const st = activityStatuses[act.id];
      return st === 'BOOKED' || st === 'CHECKED_IN' || st === 'COMPLETED';
    });
  }, [activities, activityStatuses]);

  // Filtro de Atividades da Programação
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedType !== 'all') {
        const actType = String(act.type || 'palestra').toLowerCase().trim();
        if (actType !== selectedType) return false;
      }
      if (selectedDay !== 'all') {
        if (act.day !== selectedDay) return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = act.title?.toLowerCase().includes(query);
        const matchSpeaker = act.speaker?.toLowerCase().includes(query);
        const matchLoc = act.location?.toLowerCase().includes(query);
        if (!matchTitle && !matchSpeaker && !matchLoc) return false;
      }
      return true;
    });
  }, [activities, selectedType, selectedDay, searchQuery]);

  // Agrupamento Cronológico por Horário
  const timelineGrouped = useMemo(() => {
    const targetList = activeTab === 'all' ? filteredActivities : myAgendaActivities;
    const groups = {};

    targetList.forEach((act) => {
      const timeKey = act.time || '19:00';
      if (!groups[timeKey]) groups[timeKey] = [];
      groups[timeKey].push(act);
    });

    return Object.entries(groups)
      .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
      .map(([time, items]) => ({ time, items }));
  }, [activeTab, filteredActivities, myAgendaActivities]);

  // Verificação de Conflito de Horário
  const conflictingActivity = useMemo(() => {
    if (!selectedActivity) return null;
    const isAlreadyBooked = activityStatuses[selectedActivity.id] === 'BOOKED' ||
                            activityStatuses[selectedActivity.id] === 'CHECKED_IN' ||
                            activityStatuses[selectedActivity.id] === 'COMPLETED';
    if (isAlreadyBooked) return null;

    return myAgendaActivities.find((bookedAct) => {
      if (bookedAct.id === selectedActivity.id) return false;
      return bookedAct.day === selectedActivity.day && bookedAct.time === selectedActivity.time;
    }) || null;
  }, [selectedActivity, myAgendaActivities, activityStatuses]);

  // Alterna salvar atividade na agenda pessoal
  // Cancela reserva de vaga presencial
  const handleCancelReserve = async (activityId) => {
    if (!currentUser?.uid) return;
    setCancellingId(activityId);
    try {
      await cancelActivityReservation(activityId);
      // Remove da lista de bookings local imediatamente para feedback instantâneo
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

  // Função de Inscrição / Reserva Oficial
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

    if (conflictingActivity) {
      setToastMessage({ 
        type: 'warning', 
        message: `Atenção: você já possui "${conflictingActivity.title}" neste mesmo horário.` 
      });
    }

    setReservingId(activityId);
    try {
      const res = await reserveActivity(activityId);
      if (res && (res.status === 'CONFIRMED' || res.status === 'WAITING_LIST' || res.success || res.alreadyBooked)) {
        // Atualiza bookings localmente para resposta reativa instantânea
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
          setToastMessage({ type: 'success', message: 'Inscrição confirmada com sucesso! Vaga garantida na Minha Agenda.' });
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

  // Determina o estado cronológico da atividade: 'CURRENT', 'PAST' ou 'UPCOMING'
  const getActivityTimingState = (act) => {
    const status = activityStatuses[act.id] || 'NONE';
    if (status === 'COMPLETED') {
      return 'PAST';
    }

    try {
      if (!act.day || !act.time) return 'UPCOMING';
      const now = new Date();
      const [dayNum, monthNum] = act.day.split('/');
      const [hourNum, minuteNum] = act.time.split(':');
      const actStart = new Date(2026, parseInt(monthNum, 10) - 1, parseInt(dayNum, 10), parseInt(hourNum, 10), parseInt(minuteNum, 10));
      const actEnd = new Date(actStart.getTime() + 90 * 60 * 1000);

      if (now >= actStart && now <= actEnd) {
        return 'CURRENT';
      }
      if (now > actEnd && actEnd < new Date()) {
        return 'PAST';
      }
      return 'UPCOMING';
    } catch {
      return 'UPCOMING';
    }
  };

  // Status de Tempo: Acontecendo Agora ou Próxima
  const getActivityTimeBadge = (act) => {
    try {
      if (!act.day || !act.time) return null;
      const now = new Date();
      const [dayNum, monthNum] = act.day.split('/');
      const [hourNum, minuteNum] = act.time.split(':');
      const actStart = new Date(2026, parseInt(monthNum, 10) - 1, parseInt(dayNum, 10), parseInt(hourNum, 10), parseInt(minuteNum, 10));
      const actEnd = new Date(actStart.getTime() + 90 * 60 * 1000);

      if (now >= actStart && now <= actEnd) {
        return { label: 'Acontecendo agora', color: '#10B981', dotColor: '#34D399' };
      }
      const diffMinutes = (actStart.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes > 0 && diffMinutes <= 45) {
        return { label: 'Próxima', color: '#38BDF8', dotColor: '#38BDF8' };
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px', maxWidth: '430px', margin: '0 auto' }}>
      <SymplaStickyBanner />

      {/* Toast Feedback */}
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
            backgroundColor: toastMessage.type === 'success' ? '#064E3B' : '#7F1D1D',
            border: `1px solid ${toastMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} color="#34D399" /> : <AlertCircle size={18} color="#F87171" />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.15
            }}
          >
            Agenda
          </h1>
          <p
            style={{
              fontSize: '0.80rem',
              color: '#94A3B8',
              margin: '3px 0 0',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            Programação oficial da FACOM TechWeek 2026
          </p>
        </div>
      </div>

      {/* 2. TABS: Programação (Active, underlined in Primary Blue #2563EB) | Minha agenda (Inactive, Slate Gray #94A3B8) */}
      <div style={{ marginBottom: '18px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 0',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#F8FAFC' : '#94A3B8',
              border: 'none',
              borderBottom: activeTab === 'all' ? '2.5px solid #2563EB' : '2.5px solid transparent',
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: activeTab === 'all' ? 700 : 500,
              fontSize: '0.94rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Programação
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_agenda')}
            style={{
              padding: '10px 0',
              backgroundColor: 'transparent',
              color: activeTab === 'my_agenda' ? '#F8FAFC' : '#94A3B8',
              border: 'none',
              borderBottom: activeTab === 'my_agenda' ? '2.5px solid #2563EB' : '2.5px solid transparent',
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: activeTab === 'my_agenda' ? 700 : 500,
              fontSize: '0.94rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Minha agenda
          </button>
        </div>
      </div>

      {/* 3. SEARCH BAR (Pill-shaped input with Lucide search icon. Placeholder: "Buscar atividade...") */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
        <input
          type="text"
          placeholder="Buscar atividade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            height: '46px',
            padding: '0 40px 0 44px',
            borderRadius: '9999px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            color: '#F8FAFC',
            fontSize: '0.86rem',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease'
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Limpar busca"
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* 4. HORIZONTAL DATE SELECTOR (Scrollable row of day pills: SEG 19, TER 20, etc.) */}
      <div style={{ marginBottom: '18px' }}>
        <div 
          className="no-scrollbar"
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '4px'
          }}
        >
          {/* Pill "Todos" */}
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '38px',
              padding: '0 16px',
              borderRadius: '9999px',
              backgroundColor: selectedDay === 'all' ? '#2563EB' : '#0F141F',
              border: selectedDay === 'all' ? '1px solid #3B82F6' : '1px solid #1E293B',
              color: selectedDay === 'all' ? '#FFFFFF' : '#94A3B8',
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            Todos
          </button>

          {/* Pills dos Dias */}
          {availableDays.map((dayObj) => {
            const isSelected = selectedDay === dayObj.id;
            return (
              <button
                key={dayObj.id}
                type="button"
                onClick={() => setSelectedDay(dayObj.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '38px',
                  padding: '0 16px',
                  borderRadius: '9999px',
                  backgroundColor: isSelected ? '#2563EB' : '#0F141F',
                  border: isSelected ? '1px solid #3B82F6' : '1px solid #1E293B',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {dayObj.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. CATEGORY FILTERS (Text-only pills: "Todos", "Palestras", "Workshops", "Minicursos". No icons, 48pt touch targets) */}
      {activeTab === 'all' && (
        <div style={{ marginBottom: '22px' }}>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'palestra', label: 'Palestras' },
              { id: 'workshop', label: 'Workshops' },
              { id: 'minicurso', label: 'Minicursos' },
              { id: 'hackathon', label: 'Hackathon' }
            ].map((type) => {
              const isActive = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  style={{
                    minHeight: '44px',
                    padding: '0 18px',
                    borderRadius: '9999px',
                    backgroundColor: isActive ? '#2563EB' : '#0F141F',
                    border: isActive ? '1px solid #3B82F6' : '1px solid #1E293B',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. LISTA TEMPORAL COMPACTA DA PROGRAMAÇÃO / MINHA AGENDA */}
      {timelineGrouped.length === 0 ? (
        activeTab === 'my_agenda' ? (
          /* Estado Vazio: Minha Agenda */
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            {/* Intervenção Sutil do Mascote Oficial no Empty State */}
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible'
              }}
            >
              <Mascot color="purple" isWaving={true} style={{ width: '48px', height: '48px' }} />
            </div>

            <h3 style={{ fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '0.98rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px' }}>
              Ainda não há atividades aqui.
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#94A3B8', maxWidth: '280px', marginInline: 'auto', lineHeight: 1.45 }}>
              Explore a programação e monte sua agenda para aproveitar o TechWeek.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                backgroundColor: '#2563EB',
                border: '1px solid #3B82F6',
                color: '#FFFFFF',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Ver programação
            </button>
          </div>
        ) : (
          /* Estado Vazio: Busca / Filtro */
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.86rem', fontWeight: 600, color: '#F8FAFC' }}>
              Nenhuma atividade encontrada nesta seleção.
            </p>
            {(searchQuery || selectedType !== 'all' || selectedDay !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedDay('all');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#0F141F',
                  border: '1px solid #1E293B',
                  color: '#38BDF8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        )
      ) : (
        /* Linha Temporal Contínua e Discreta com Marcadores e Now Line */
        <div style={{ position: 'relative', paddingLeft: '54px' }}>
          {/* Linha Vertical da Timeline (sutil e discreta) */}
          <div
            style={{
              position: 'absolute',
              left: '44px',
              top: '8px',
              bottom: '12px',
              width: '1px',
              backgroundColor: '#1E293B'
            }}
          />

          {timelineGrouped.map(({ time, items }) => {
            const hasCurrentItem = items.some(act => {
              const st = getActivityTimingState(act);
              return st === 'CURRENT' || (time === '14:00' && selectedDay === '22/10');
            });
            const allPast = items.every(act => {
              const st = getActivityTimingState(act);
              return st === 'PAST' || (time === '10:00' && selectedDay === '22/10');
            });

            return (
              <div key={time} style={{ marginBottom: '22px', position: 'relative' }}>
                {/* Marcador de Horário com Tabular-Nums */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-54px',
                    top: '12px',
                    width: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      color: hasCurrentItem ? '#2563EB' : allPast ? '#64748B' : '#94A3B8',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      opacity: allPast ? 0.6 : 1
                    }}
                  >
                    {time}
                  </span>

                  {/* Now Line: Linha horizontal ultra-fina azul saindo do marcador */}
                  {hasCurrentItem && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '50%',
                        width: '10px',
                        height: '1.5px',
                        backgroundColor: '#2563EB',
                        zIndex: 2
                      }}
                    />
                  )}
                </div>

                {/* Event Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((act) => {
                    const status = activityStatuses[act.id] || 'NONE';
                    const isCheckedIn = status === 'CHECKED_IN';
                    const isCompleted = status === 'COMPLETED';
                    const isBooked = status === 'BOOKED';

                    const timingState = getActivityTimingState(act);
                    const isCurrent = timingState === 'CURRENT' || (time === '14:00' && selectedDay === '22/10');
                    const isPast = timingState === 'PAST' || (time === '10:00' && selectedDay === '22/10');

                    // Acento lateral de 3.5px por modalidade
                    const catType = String(act.type || 'palestra').toLowerCase().trim();
                    const accentColor = catType === 'workshop'
                      ? '#F59E0B'
                      : catType === 'minicurso'
                      ? '#A855F7'
                      : (catType === 'estande' || catType === 'estandes')
                      ? '#10B981'
                      : catType === 'hackathon'
                      ? '#EC4899'
                      : '#38BDF8';

                    const seatsAvailable = typeof act.vagas_disponiveis === 'number' ? act.vagas_disponiveis : 0;
                    const isSoldOut = seatsAvailable <= 0;

                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedActivity(act)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedActivity(act); }}
                        style={{
                          backgroundColor: '#0F141F',
                          border: isCurrent ? '1px solid #2563EB' : '1px solid #1E293B',
                          borderLeft: `3.5px solid ${accentColor}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          opacity: isPast ? 0.5 : 1,
                          boxShadow: isCurrent ? '0 0 16px rgba(37, 99, 235, 0.12)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Título da Atividade em Space Grotesk Bold */}
                        <h3
                          style={{
                            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontSize: '0.96rem',
                            fontWeight: 700,
                            color: '#F8FAFC',
                            margin: '0 0 8px',
                            lineHeight: 1.35,
                            letterSpacing: '-0.02em'
                          }}
                        >
                          {act.title}
                        </h3>

                        {/* Local e Palestrante em Inter Regular com Ícones Lucide */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '0.78rem',
                            color: '#94A3B8',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                            marginBottom: '10px'
                          }}
                        >
                          {act.speaker && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Users size={13} color="#64748B" style={{ flexShrink: 0 }} />
                              <span style={{ color: '#94A3B8' }}>{act.speaker}</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="#64748B" style={{ flexShrink: 0 }} />
                            <span style={{ color: '#CBD5E1' }}>{act.location || 'Local a definir'}</span>
                          </div>
                        </div>

                        {/* Rodapé do Card: Status Semântico e Ação Discreta */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.74rem'
                          }}
                        >
                          {/* Status no canto inferior esquerdo */}
                          <div>
                            {isPast ? (
                              <span style={{ color: '#94A3B8', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                Concluído
                              </span>
                            ) : isCompleted ? (
                              <span style={{ color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} />
                                Presença confirmada
                              </span>
                            ) : isCheckedIn ? (
                              <span style={{ color: '#F59E0B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} />
                                Check-in realizado
                              </span>
                            ) : isBooked ? (
                              <span style={{ color: '#38BDF8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <BookmarkCheck size={13} />
                                Vaga reservada
                              </span>
                            ) : isSoldOut ? (
                              <span style={{ color: '#EF4444', fontWeight: 600 }}>Lotado</span>
                            ) : (
                              <span style={{ color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                                {seatsAvailable} vagas
                              </span>
                            )}
                          </div>

                          {/* Ação Textual Discreta */}
                          <div
                            style={{
                              color: isBooked ? '#34D399' : '#38BDF8',
                              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{isBooked ? 'Ver detalhes' : 'Ver detalhes'}</span>
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. MODAIS EXISTENTES INTEGRADOS (DETALHES, CHECKOUT E LEITURA DE QR CODE) */}
      {selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          status={activityStatuses[selectedActivity.id] || 'NONE'}
          isReserving={reservingId === selectedActivity.id}
          isCancelling={cancellingId === selectedActivity.id}
          onReserve={handleReserve}
          onCancelReserve={handleCancelReserve}
          onClose={() => setSelectedActivity(null)}
          onOpenCheckoutScanner={(a) => {
            setSelectedActivity(null);
            setCheckoutModalActivity(a);
          }}
          onOpenSelfScanner={(a) => {
            setSelectedActivity(null);
            setSelfScanActivity(a);
          }}
        />
      )}

      {checkoutModalActivity && (
        <ActivityCheckoutScannerModal
          activity={checkoutModalActivity}
          onClose={() => setCheckoutModalActivity(null)}
        />
      )}

      {selfScanActivity && (
        <LectureScanner
          activity={selfScanActivity}
          onClose={() => setSelfScanActivity(null)}
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

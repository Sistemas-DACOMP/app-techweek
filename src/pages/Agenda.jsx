import { useState, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Users, Check, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { onAuthChange } from '../lib/auth';
import { useUser } from '../hooks/useUser';
import ActivityModal, { SeatsLight, categoryOf, describeDay } from '../components/ActivityModal';
import ActivityCheckoutScannerModal from '../components/ActivityCheckoutScannerModal';
import LectureScanner from '../components/LectureScanner';
import Mascot from '../components/Mascot';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import '../styles/agenda.css';
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
  const { hasSymplaTicket } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [showSymplaModal, setShowSymplaModal] = useState(false);

  // Abas: 'all' (Programação) | 'my_agenda' (Minha Agenda)
  const [activeTab, setActiveTab] = useState('all');

  // Filtros
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null); // Programação: null = hoje ou 1º dia
  const [myDay, setMyDay] = useState('all'); // Minha agenda: 'all' = Todos os dias
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

  // Dias do evento a partir das atividades (chips "Qua 21")
  const availableDays = useMemo(() => {
    const ids = [...new Set(activities.map((act) => act.day).filter(Boolean))];
    return ids
      .map((id) => {
        const d = describeDay(id);
        return { id, label: `${d.short} ${d.dayNum}`, ...d };
      })
      .sort((a, b) => dayOrder(a.id) - dayOrder(b.id));
  }, [activities]);

  const todayId = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Programação mostra um dia por vez: o escolhido, senão hoje, senão o primeiro
  const programDay = selectedDay
    || (availableDays.some((d) => d.id === todayId) ? todayId : availableDays[0]?.id)
    || 'all';

  // Status de Inscrição/Check-in de Cada Atividade
  const activityStatuses = useMemo(() => {
    const statuses = {};
    activities.forEach((act) => {
      statuses[act.id] = calculateActivityStatus(act.id, bookings, checkins, pointEvents);
    });
    return statuses;
  }, [activities, bookings, checkins, pointEvents]);

  // Lista de Atividades do Usuário ("Minha Agenda") — base da checagem de conflito
  const myAgendaActivities = useMemo(() => {
    return activities.filter((act) => {
      const st = activityStatuses[act.id];
      return st === 'BOOKED' || st === 'CHECKED_IN' || st === 'COMPLETED';
    });
  }, [activities, activityStatuses]);

  // O que aparece na aba Minha agenda: inscrições + lista de espera
  const myListActivities = useMemo(() => {
    return activities.filter((act) => {
      const st = activityStatuses[act.id];
      return st === 'BOOKED' || st === 'CHECKED_IN' || st === 'COMPLETED' || st === 'WAITING_LIST';
    });
  }, [activities, activityStatuses]);

  const isMyTab = activeTab === 'my_agenda';
  const dayFilter = isMyTab ? myDay : programDay;

  // Filtro (tipo, busca, dia) + agrupamento por dia e, dentro do dia, por horário
  const groupedByDay = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = (isMyTab ? myListActivities : activities).filter((act) => {
      if (selectedType !== 'all') {
        const actType = String(act.type || 'palestra').toLowerCase().trim();
        if (actType !== selectedType) return false;
      }
      if (dayFilter !== 'all' && act.day !== dayFilter) return false;
      if (query) {
        const matchTitle = act.title?.toLowerCase().includes(query);
        const matchSpeaker = act.speaker?.toLowerCase().includes(query);
        const matchLoc = act.location?.toLowerCase().includes(query);
        if (!matchTitle && !matchSpeaker && !matchLoc) return false;
      }
      return true;
    });

    const days = new Map();
    visible.forEach((act) => {
      const dayKey = act.day || '';
      const timeKey = act.time || '19:00';
      if (!days.has(dayKey)) days.set(dayKey, new Map());
      const times = days.get(dayKey);
      if (!times.has(timeKey)) times.set(timeKey, []);
      times.get(timeKey).push(act);
    });
    return [...days.entries()]
      .sort(([a], [b]) => dayOrder(a) - dayOrder(b))
      .map(([day, times]) => ({
        day,
        count: [...times.values()].reduce((n, items) => n + items.length, 0),
        slots: [...times.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, items]) => ({ time, items }))
      }));
  }, [isMyTab, myListActivities, activities, selectedType, dayFilter, searchQuery]);

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

  // Toast: some em 4 s; erro fica até ser fechado (DESIGN.md §6)
  useEffect(() => {
    if (!toastMessage || toastMessage.type === 'error') return undefined;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

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
      setToastMessage({ type: 'info', message: 'Inscrição cancelada. A vaga foi liberada.' });
    } catch (err) {
      setToastMessage({ type: 'error', message: err.data?.message || err.message || 'Erro ao cancelar inscrição.' });
    } finally {
      setCancellingId(null);
    }
  };

  // Função de Inscrição / Reserva Oficial
  const handleReserve = async (activityId) => {
    if (!currentUser?.uid) {
      setToastMessage({ type: 'warning', message: 'Faça login com sua conta para se inscrever nas atividades.' });
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
          setToastMessage({ type: 'warning', message: `Você entrou na lista de espera (${res.position || 1}º).` });
        } else if (res.alreadyBooked) {
          setToastMessage({ type: 'info', message: 'Você já tem vaga nesta atividade.' });
        } else {
          setToastMessage({ type: 'success', message: 'Vaga reservada. Ela já está na Minha agenda.' });
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

  // Abre direto a leitura de presença (mesma regra do painel da atividade)
  const presenceAction = (act, status) => {
    if (status === 'CHECKED_IN') {
      return act.attendanceMode === 'DOUBLE_CHECK' ? () => setCheckoutModalActivity(act) : () => setSelfScanActivity(act);
    }
    if (status === 'BOOKED' && act.attendanceMode === 'SELF_SCAN') return () => setSelfScanActivity(act);
    return null;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedDay(null);
    setMyDay('all');
  };

  const myCount = myListActivities.length;
  const dayChips = isMyTab
    ? [{ id: 'all', label: 'Todos os dias' }, ...availableDays]
    : availableDays;

  return (
    <div className="page-container mx-auto max-w-[430px] px-0! pt-0! pb-[120px]! text-text">
      <SymplaStickyBanner />

      {toastMessage && (
        <div
          role={toastMessage.type === 'error' ? 'alert' : 'status'}
          className="anim-fade-up fixed inset-x-0 bottom-[96px] z-[2100] mx-auto flex w-[calc(100%-40px)] max-w-[390px] items-center gap-3 rounded-2xl bg-surface-selected px-3.5 py-3 text-sm font-semibold text-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TOAST_ICON[toastMessage.type] || TOAST_ICON.error}`}
          >
            {toastMessage.type === 'success' || toastMessage.type === 'info' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </span>
          <span className="flex-1">{toastMessage.message}</span>
          {toastMessage.type === 'error' && (
            <button type="button" onClick={() => setToastMessage(null)} aria-label="Fechar aviso" className="-mr-2 flex h-11 w-11 items-center justify-center text-text-2">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="px-5 pt-[18px]">
        <h1 className="screen-title mb-[22px]! text-[22px]!">Agenda</h1>

        <div role="tablist" aria-label="Agenda" className="flex gap-6 border-b border-line">
          {[
            { id: 'all', label: 'Programação' },
            { id: 'my_agenda', label: myCount > 0 ? `Minha agenda · ${myCount}` : 'Minha agenda' }
          ].map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`h-11 text-[15px] transition-colors duration-150 ${selected ? 'font-extrabold text-text shadow-[inset_0_-3px_0_#7C3AED]' : 'font-semibold text-text-2'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {(!isMyTab || myCount > 0) && (
          <>
            <label className="mt-3.5 flex h-[46px] items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 text-text-3 focus-within:border-link">
              <Search size={18} aria-hidden="true" className="shrink-0" />
              <input
                type="search"
                aria-label="Buscar atividade"
                placeholder="Buscar atividade, palestrante ou sala"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-3">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>

            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Dia">
              {dayChips.map((d) => {
                const selected = d.id === dayFilter;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => (isMyTab ? setMyDay(d.id) : setSelectedDay(d.id))}
                    className={`press h-[38px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] ${selected ? 'bg-[linear-gradient(135deg,#2563EB,#5B3BE0)] font-extrabold text-white' : 'border border-field-line font-semibold text-text'}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Tipo de atividade">
              {TYPE_FILTERS.map((type) => {
                const selected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedType(type.id)}
                    className={`press inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] ${selected ? 'bg-text font-bold text-bg' : 'border border-field-line font-semibold text-text'}`}
                  >
                    {type.id !== 'all' && !selected && (
                      <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: categoryOf(type).accent }} />
                    )}
                    {type.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {groupedByDay.length === 0 ? (
          isMyTab && myCount === 0 ? (
            <div className="flex flex-col items-center px-3 pt-16 text-center">
              <Mascot color="blue" isWaving className="h-[120px]! w-[120px]!" />
              <h2 className="mt-[22px] text-[19px] font-extrabold">Sua agenda ainda está vazia</h2>
              <p className="mt-2 max-w-[290px] text-sm leading-[1.5] text-text-2">
                Quando você reservar uma vaga ou se inscrever numa atividade, ela aparece aqui, separada por dia e horário.
              </p>
              <button type="button" onClick={() => setActiveTab('all')} className="btn btn-action mt-[22px] min-h-12! rounded-[14px]! px-[22px]!">
                Ver programação
              </button>
            </div>
          ) : (
            <div className="px-3 pt-12 text-center">
              <p className="text-[15px] font-bold">Nenhuma atividade com esses filtros</p>
              <p className="mt-1.5 text-sm text-text-2">Tente outro dia, outro tipo ou outra busca.</p>
              <button type="button" onClick={resetFilters} className="btn btn-secondary btn-sm mt-4">
                Limpar filtros
              </button>
            </div>
          )
        ) : (
          groupedByDay.map(({ day, count, slots }) => {
            const d = describeDay(day);
            const isToday = day === todayId;
            return (
              <section key={day || 'sem-dia'}>
                {isMyTab && (
                  <div className="mb-2.5 mt-5 flex items-baseline gap-2">
                    <h2 className="text-[17px] font-extrabold">{isToday ? 'Hoje' : d.weekday}</h2>
                    <span className="text-[13px] text-text-3">
                      {isToday ? `${d.short.toLowerCase()}, ${d.dayNum} ${d.month}` : `${d.dayNum} ${d.month}`}
                    </span>
                    <span className="ml-auto text-xs font-bold text-text-3">
                      {count} {count === 1 ? 'atividade' : 'atividades'}
                    </span>
                  </div>
                )}
                <div className={`relative ${isMyTab ? '' : 'mt-[18px]'}`}>
                  <span aria-hidden="true" className="absolute bottom-3 left-[61px] top-2 w-0.5 bg-line" />
                  {slots.map(({ time, items }) => {
                    const timings = items.map(getActivityTimingState);
                    return (
                      <div key={time} className="grid grid-cols-[52px_1fr] gap-2.5">
                        <span className={`block pt-3.5 text-sm font-extrabold ${timings.includes('CURRENT') ? 'text-text' : 'text-text-2'}`}>{time}</span>
                        <div className="flex flex-col gap-2.5 pb-3.5">
                          {items.map((act, i) => {
                            const status = activityStatuses[act.id] || 'NONE';
                            return (
                              <ActivityRow
                                key={act.id}
                                act={act}
                                status={status}
                                timing={timings[i]}
                                compact={isMyTab}
                                hasTicket={hasSymplaTicket}
                                onOpen={() => setSelectedActivity(act)}
                                onPresence={isMyTab && timings[i] === 'CURRENT' ? presenceAction(act, status) : null}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Painel da atividade, leitura do telão e leitura de QR */}
      {selectedActivity && (
        <ActivityModal
          activity={activities.find((a) => a.id === selectedActivity.id) || selectedActivity}
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

function dayOrder(id) {
  const [d, m] = String(id).split('/').map(Number);
  return (m || 0) * 100 + (d || 0);
}

const TYPE_FILTERS = [
  { id: 'all', type: 'palestra', label: 'Todos' },
  { id: 'palestra', type: 'palestra', label: 'Palestra' },
  { id: 'workshop', type: 'workshop', label: 'Workshop' },
  { id: 'minicurso', type: 'minicurso', label: 'Minicurso' },
  { id: 'ativacao', type: 'ativacao', label: 'Ativação' },
  { id: 'hackathon', type: 'hackathon', label: 'Hackathon' }
];

const TOAST_ICON = {
  success: 'bg-ok/20 text-ok',
  info: 'bg-ok/20 text-ok',
  warning: 'bg-warn/20 text-warn',
  error: 'bg-err/20 text-err'
};

const STATUS_TEXT = {
  CHECKED_IN: { label: 'Entrada registrada', className: 'text-ok' },
  BOOKED: { label: 'Reservado', className: 'text-link' },
  WAITING_LIST: { label: 'Lista de espera', className: 'text-warn' }
};

function NowDot() {
  return <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-ok shadow-[0_0_0_3px_rgba(111,216,166,0.25)]" />;
}

/**
 * Cartão da linha do tempo (DESIGN.md §6): faixa de 4 px na cor do tipo, rodapé com
 * seu status à esquerda e o semáforo à direita (só para quem não tem vaga). Sem barra de vagas.
 */
function ActivityRow({ act, status, timing, compact, hasTicket, onOpen, onPresence }) {
  const category = categoryOf(act);
  const isCurrent = timing === 'CURRENT';
  const isPast = timing === 'PAST';
  const hasSeat = status === 'BOOKED' || status === 'CHECKED_IN' || status === 'COMPLETED';
  const showLight = !hasSeat && status !== 'WAITING_LIST' && !isPast && !compact;
  const soldOut = !(typeof act.vagas_disponiveis === 'number' && act.vagas_disponiveis > 0);

  let left;
  if (status === 'COMPLETED') {
    left = <span className="flex items-center gap-1.5 text-ok"><Check size={13} strokeWidth={3} aria-hidden="true" />Presença confirmada</span>;
  } else if (isCurrent && hasSeat) {
    left = <span className="flex items-center gap-1.5 text-ok"><NowDot />{compact ? 'Agora' : 'Agora · você está inscrito'}</span>;
  } else if (STATUS_TEXT[status]) {
    left = <span className={STATUS_TEXT[status].className}>{status === 'BOOKED' && compact ? 'Vaga reservada' : STATUS_TEXT[status].label}</span>;
  } else if (isPast) {
    left = <span className="text-text-3">Encerrada</span>;
  } else if (isCurrent) {
    left = <span className="flex items-center gap-1.5 text-ok"><NowDot />Acontecendo agora</span>;
  } else if (!hasTicket) {
    left = <span className="text-link">Vincule o ingresso</span>;
  } else if (soldOut) {
    left = <span className="text-warn">Entrar na lista de espera</span>;
  } else {
    left = <span className="text-link">Reservar vaga</span>;
  }

  return (
    <div
      className={`relative rounded-2xl border border-l-4 transition-transform duration-100 has-[>button:active]:scale-[0.98] pb-3 pl-4 pr-3.5 pt-3.5 ${isCurrent ? 'border-[#3D4BB0] bg-[#161F45]' : 'border-line bg-surface'} ${isPast ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: category.accent }}
    >
      {/* O cartão inteiro abre o painel; o botão cobre o cartão e o texto fica por cima sem capturar o toque */}
      <button
        type="button"
        onClick={onOpen}
        data-activity-card
        aria-label={`${act.title} · ${category.label}${act.time ? ` · ${act.time}` : ''}`}
        className="absolute inset-0 rounded-2xl"
      />
      <div className="pointer-events-none relative">
        <span className="block text-xs font-extrabold" style={{ color: category.accent }}>{category.label}</span>
        <span className="mt-1 block text-[15px] font-bold leading-[1.35]">{act.title}</span>
        {act.speaker && !compact && (
          <span className="mt-2 flex items-center gap-1.5 text-[13px] text-text-2">
            <Users size={14} aria-hidden="true" className="shrink-0" />
            {act.speaker}
          </span>
        )}
        <span className={`${compact || !act.speaker ? 'mt-1.5' : 'mt-1'} flex items-center gap-1.5 text-[13px] text-text-2`}>
          <MapPin size={14} aria-hidden="true" className="shrink-0" />
          {act.location || 'Local a definir'}
        </span>
        <span className="mt-2.5 flex min-h-[18px] items-center justify-between gap-1.5 whitespace-nowrap border-t border-line pt-2.5 text-xs font-extrabold">
          {left}
          {onPresence ? (
            <button
              type="button"
              onClick={onPresence}
              className="press pointer-events-auto -my-2 flex h-11 items-center"
            >
              <span className="flex h-[30px] items-center rounded-[9px] bg-action px-3 text-xs font-extrabold text-white">Validar presença</span>
            </button>
          ) : showLight ? (
            <span className="flex items-center gap-1.5">
              <SeatsLight activity={act} />
              <ChevronRight size={14} aria-hidden="true" className="text-text-4" />
            </span>
          ) : !compact ? (
            <ChevronRight size={14} aria-hidden="true" className="text-text-4" />
          ) : null}
        </span>
      </div>
    </div>
  );
}

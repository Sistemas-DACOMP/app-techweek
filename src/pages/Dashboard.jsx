import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, ChevronRight, Ticket, Smartphone, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ActivityModal from '../components/ActivityModal';
import Mascot from '../components/Mascot';
import InstallPwaCard, { InstallAppSheet, usePwaInstall } from '../components/InstallPwaCard';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import { onAuthChange } from '../lib/auth';
import { getUserProfile, getLeaderboardUsers } from '../lib/userService';
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
import { calculateLevel, LEVEL_TIERS } from '../lib/level';
import { useUser } from '../hooks/useUser';
import icone from '../assets/icone.png';
import '../styles/inicio.css';

/* ------------------------------------------------------------------ */
/* Apresentação: tipo, horário e dia (DESIGN.md §2.3, §6 "A seguir")   */
/* ------------------------------------------------------------------ */

const CATEGORIES = {
  palestra: { label: 'Palestra', color: 'var(--cat-palestra)' },
  workshop: { label: 'Workshop', color: 'var(--cat-workshop)' },
  minicurso: { label: 'Minicurso', color: 'var(--cat-minicurso)' },
  ativacao: { label: 'Ativação', color: 'var(--cat-ativacao)' },
  hackathon: { label: 'Hackathon', color: 'var(--cat-hackathon)' }
};

function categoryOf(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('workshop')) return CATEGORIES.workshop;
  if (t.includes('mini') || t.includes('curso')) return CATEGORIES.minicurso;
  if (t.includes('ativa') || t.includes('estande')) return CATEGORIES.ativacao;
  if (t.includes('hack')) return CATEGORIES.hackathon;
  return CATEGORIES.palestra;
}

// Data/hora de início e fim a partir de `date` (AAAA-MM-DD) ou `day` (DD/MM) + `time`/`endTime`.
function activityWindow(a) {
  const time = /^\d{1,2}:\d{2}/.test(a?.time || '') ? a.time : null;
  if (!time) return null;
  let ymd = /^\d{4}-\d{2}-\d{2}/.test(a.date || '') ? a.date.slice(0, 10) : null;
  if (!ymd && /^\d{2}\/\d{2}$/.test(a.day || '')) {
    const [dd, mm] = a.day.split('/');
    ymd = `2026-${mm}-${dd}`; // ponytail: ano fixo do evento quando só vem DD/MM
  }
  if (!ymd) return null;
  const start = new Date(`${ymd}T${time.padStart(5, '0')}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const endTime = /^\d{1,2}:\d{2}/.test(a.endTime || '') ? a.endTime : null;
  let end = endTime ? new Date(`${ymd}T${endTime.padStart(5, '0')}:00`) : null;
  if (!end || end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

function dayLabel(date, now) {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(date) - startOf(now)) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  const wd = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const dm = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dm}`;
}

const hhmm = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const STATUS_TEXT = {
  BOOKED: 'você está inscrito',
  CHECKED_IN: 'você está inscrito',
  WAITING_LIST: 'você está na lista de espera',
  COMPLETED: 'presença confirmada'
};

/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasSymplaTicket, points: hookPoints, profile: hookProfile, refreshProfile } = useUser();
  const pwa = usePwaInstall();
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [reservingId, setReservingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [now, setNow] = useState(() => new Date());

  // Relógio do "Acontecendo agora" (reavalia a cada minuto)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

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

  // Vizinhos no ranking ("Sua jornada") — leitura única, mesma fonte da tela Ranking
  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    let alive = true;
    getLeaderboardUsers(50).then((rows) => { if (alive) setLeaderboard(rows || []); }).catch(() => {});
    return () => { alive = false; };
  }, [currentUser?.uid]);

  const statusOf = (act) => calculateActivityStatus(act.id, bookings, checkins, pointEvents);

  // Agora / próxima / a seguir, pelo horário real das atividades
  const { hero, upcoming } = useMemo(() => {
    const timed = activities
      .map((a) => ({ a, w: activityWindow(a) }))
      .filter((x) => x.w)
      .sort((x, y) => x.w.start - y.w.start);
    const live = timed.filter((x) => x.w.start <= now && now < x.w.end);
    const mine = (x) => ['BOOKED', 'CHECKED_IN', 'WAITING_LIST', 'COMPLETED'].includes(
      calculateActivityStatus(x.a.id, bookings, checkins, pointEvents)
    );
    const future = timed.filter((x) => x.w.start > now);
    const liveItem = live.find(mine) || live[0];
    const heroItem = liveItem ? { ...liveItem, live: true } : (future[0] ? { ...future[0], live: false } : null);
    return {
      hero: heroItem,
      upcoming: future.filter((x) => x.a.id !== heroItem?.a.id).slice(0, 6)
    };
  }, [activities, bookings, checkins, pointEvents, now]);

  // Gamificação
  const userXP = typeof hookPoints === 'number' ? hookPoints : (userProfile?.totalPoints || 0);
  const gameLevel = useMemo(() => calculateLevel(userXP), [userXP]);
  const nextTier = LEVEL_TIERS.find((t) => t.level === gameLevel.level + 1);

  const rankingRows = useMemo(() => {
    const idx = leaderboard.findIndex((u) => u.id === currentUser?.uid);
    if (idx < 0) return [];
    return leaderboard.slice(Math.max(0, idx - 1), idx + 2).map((u) => ({
      id: u.id,
      rank: u.rank,
      me: u.id === currentUser?.uid,
      name: u.id === currentUser?.uid ? 'Você' : `@${(u.username || 'participante').replace(/^@/, '')}`,
      points: u.id === currentUser?.uid ? Math.max(u.points || 0, userXP) : (u.points || 0)
    }));
  }, [leaderboard, currentUser?.uid, userXP]);

  // Passaporte (regra OBSERVADA do PassportTab: 5 estandes = Bilhete Dourado)
  const profileForPassport = hookProfile || userProfile;
  const visitedStands = Object.keys(profileForPassport?.visitedSponsors || {}).length;
  const standsLeft = profileForPassport?.goldenTicketAwarded ? 0 : Math.max(0, 5 - visitedStands);

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
      setToastMessage({ type: 'info', message: 'Inscrição cancelada. A vaga foi liberada.' });
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
          setToastMessage({ type: 'warning', message: `Você entrou na lista de espera (posição ${res.position || 1}).` });
        } else if (res.alreadyBooked) {
          setToastMessage({ type: 'info', message: 'Você já tem vaga nesta atividade.' });
        } else {
          setToastMessage({ type: 'success', message: 'Vaga garantida. Já está na sua agenda.' });
        }
      } else {
        setToastMessage({ type: 'error', message: res?.message || 'Não foi possível confirmar a inscrição.' });
      }
    } catch (err) {
      if (err.status === 403 && (err.data?.error === 'SYMPLA_TICKET_REQUIRED' || err.data?.code === 'SYMPLA_TICKET_REQUIRED')) {
        setToastMessage({
          type: 'warning',
          message: 'Vincule seu ingresso Sympla para garantir sua vaga presencial.'
        });
      } else {
        const errorMsg = err.data?.message || err.message;
        setToastMessage({
          type: 'error',
          message: (errorMsg && !errorMsg.includes('Failed to fetch'))
            ? errorMsg
            : 'Não conseguimos falar com o servidor de reservas. Tente de novo em instantes.'
        });
      }
    } finally {
      setReservingId(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Estado da tela: carregando perfil → Primeiros passos (sem ingresso) → Início
  const profileLoaded = Boolean(hookProfile || userProfile);
  const pending = profileLoaded && !hasSymplaTicket;
  const avatarUrl = userProfile?.avatarUrl || hookProfile?.avatarUrl || hookProfile?.avatar_url || null;

  return (
    <div className="page-container !p-0 font-sans text-text">
      <div className="mx-auto max-w-[430px]" style={{ paddingBottom: 'max(104px, calc(env(safe-area-inset-bottom) + 92px))' }}>
        {/* Header "Olá, Nome" (DESIGN.md §3 exceção do Início) */}
        <header className="flex items-center gap-3 pl-5 pr-4 pt-[18px]">
          <img src={icone} alt="" className="h-8 w-[30px] object-contain" />
          <h1 className="m-0 min-w-0 flex-1 truncate text-[21px] font-extrabold">Olá, {firstName}</h1>
          <NotificationBell />
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Meu perfil"
            className="press size-10 shrink-0 cursor-pointer rounded-full border-0 bg-[image:var(--brand-gradient)] p-0.5"
          >
            <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-surface-raised text-[13px] font-bold text-text">
              {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : userInitials}
            </span>
          </button>
        </header>

        {!profileLoaded ? (
          <div aria-busy="true" aria-label="Carregando" className="mx-5 mt-[26px] flex flex-col gap-3.5">
            <div className="skeleton h-[200px] !rounded-[20px]" />
            <div className="skeleton h-16 !rounded-2xl" />
            <div className="skeleton h-[120px] !rounded-[18px]" />
          </div>
        ) : pending ? (
          <PendingHome
            installed={pwa.isInstalled}
            onLink={() => setShowSymplaModal(true)}
            onInstall={pwa.install}
            upcoming={upcoming.length ? upcoming : (hero ? [hero] : [])}
            now={now}
            onOpen={setSelectedActivity}
            onAgenda={() => navigate('/agenda')}
          />
        ) : (
          <>
            {hero ? (
              <HeroNow
                item={hero}
                status={statusOf(hero.a)}
                now={now}
                reserving={reservingId === hero.a.id}
                onValidate={() => navigate('/scanner')}
                onReserve={() => handleReserve(hero.a.id)}
                onDetails={() => setSelectedActivity(hero.a)}
              />
            ) : (
              <section className="mx-5 mt-[26px] rounded-[20px] bg-surface p-[18px]">
                <h2 className="m-0 text-[17px] font-extrabold">A programação ainda não saiu</h2>
                <p className="m-0 mt-1 text-sm text-text-2">Assim que as atividades forem publicadas, elas aparecem aqui.</p>
              </section>
            )}

            {/* Faltando só instalar: card único logo abaixo do "Acontecendo agora" */}
            <InstallPwaCard pwa={pwa} />

            {standsLeft > 0 && (
              <button
                type="button"
                onClick={() => navigate('/challenges?tab=passport')}
                className="press mx-5 mt-3.5 flex w-[calc(100%-40px)] cursor-pointer items-center gap-3 rounded-2xl border-0 bg-surface py-2.5 pl-2 pr-3.5 text-left font-sans text-text"
              >
                <Mascot color="purple" className="mascot-still shrink-0" style={{ width: 44, height: 44 }} />
                <span className="flex-1 text-sm leading-[1.4]">
                  <b className="font-bold text-[#C4B5FD]">Ada:</b>{' '}
                  {standsLeft === 1 ? 'falta 1 estande' : `faltam ${standsLeft} estandes`} para o seu Bilhete Dourado!
                </span>
                <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-text-3" aria-hidden="true" />
              </button>
            )}

            {upcoming.length > 0 && (
              <UpNext items={upcoming} now={now} statusOf={statusOf} onOpen={setSelectedActivity} onAgenda={() => navigate('/agenda')} />
            )}

            {/* Sua jornada */}
            <button
              type="button"
              onClick={() => navigate('/ranking')}
              className="press mx-5 mt-6 block w-[calc(100%-40px)] cursor-pointer rounded-[20px] border-0 bg-surface p-4 text-left font-sans text-text"
            >
              <span className="flex items-center justify-between">
                <span className="text-[15px] font-extrabold">Sua jornada</span>
                <span className="rounded-[10px] bg-you-soft px-2.5 py-1 text-xs font-bold text-you-text">
                  Nível {gameLevel.level} · {gameLevel.title}
                </span>
              </span>
              <span className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-[30px] font-extrabold leading-none">{userXP}</span>
                <span className="text-sm text-text-2">pontos</span>
                <span className="ml-auto text-[13px] text-text-2">
                  {gameLevel.isMaxLevel ? 'Nível máximo' : `${gameLevel.pointsToNext} para ${nextTier?.title}`}
                </span>
              </span>
              <span className="ds-progress mt-2.5 block" role="progressbar" aria-valuenow={gameLevel.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até o próximo nível">
                <span style={{ width: `${gameLevel.progress}%` }} />
              </span>
              {rankingRows.length > 0 && (
                <span className="mt-3.5 block border-t border-line-2 pt-2.5">
                  {rankingRows.map((r) => (
                    <span
                      key={r.id}
                      className={`grid grid-cols-[30px_1fr_auto] items-center text-sm ${
                        r.me ? '-mx-2 h-9 rounded-[10px] bg-you-soft px-2 font-extrabold text-text' : 'h-[34px] text-text-2'
                      }`}
                    >
                      <span>{r.rank}º</span>
                      <span className="truncate">{r.name}</span>
                      <span>{r.points}</span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      <Toast toast={toastMessage} />

      {/* MODAL OFICIAL DE DETALHES DA ATIVIDADE */}
      {selectedActivity && (
        <ActivityModal
          activity={activities.find((a) => a.id === selectedActivity.id) || selectedActivity}
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
        onLinked={refreshProfile}
        featureName="a reserva de vagas na grade presencial"
      />
      <InstallAppSheet pwa={pwa} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero "Acontecendo agora" — único gradiente da tela (DESIGN.md §2.2) */
/* ------------------------------------------------------------------ */
function HeroNow({ item, status, now, reserving, onValidate, onReserve, onDetails }) {
  const { a, w, live } = item;
  const cat = categoryOf(a.type);
  const meta = [cat.label, a.location, STATUS_TEXT[status]].filter(Boolean).join(' · ');
  const enrolled = status === 'BOOKED' || status === 'CHECKED_IN';

  let primary = { label: 'Ver detalhes', onClick: onDetails };
  if (live && enrolled) primary = { label: 'Validar presença', onClick: onValidate };
  else if (status === 'NONE') primary = { label: reserving ? 'Reservando' : 'Reservar vaga', onClick: onReserve };
  const showDetailsLink = primary.onClick !== onDetails;

  return (
    <section
      aria-labelledby="agora-t"
      className="relative mx-5 mt-[26px] rounded-[20px] bg-[image:var(--brand-gradient)] p-[18px] text-white shadow-[0_12px_32px_rgba(79,70,229,0.35)]"
    >
      <div className="pointer-events-none absolute -right-1.5 -top-[30px]" aria-hidden="true">
        <Mascot color="blue" isWaving className="mascot-no-float" style={{ width: 74, height: 74 }} />
      </div>
      <p className="m-0 flex items-center gap-2 text-[13px] font-semibold">
        {live && <span className="size-2 rounded-full bg-[#A7F3D0] shadow-[0_0_0_4px_rgba(167,243,208,0.25)]" aria-hidden="true" />}
        {live ? `Acontecendo agora · ${hhmm(w.start)}` : `Próxima atividade · ${dayLabel(w.start, now)} · ${hhmm(w.start)}`}
      </p>
      <h2 id="agora-t" className="m-0 mr-[72px] mt-2.5 text-[19px] font-bold leading-[1.3]">{a.title}</h2>
      <p className="m-0 mt-1.5 text-sm text-[#E0E7FF]">{meta}</p>
      <div className="mt-4 flex items-center gap-3.5">
        <button
          type="button"
          onClick={primary.onClick}
          disabled={reserving}
          className="btn btn-on-gradient !min-h-[46px] flex-1 !rounded-xl !font-bold"
        >
          {reserving && (
            <span className="size-4 rounded-full border-2 border-[#3730A3]/30 border-t-[#3730A3]" style={{ animation: 'dsSpin 800ms linear infinite' }} aria-hidden="true" />
          )}
          {primary.label}
        </button>
        {showDetailsLink && (
          <button
            type="button"
            onClick={onDetails}
            className="min-h-11 cursor-pointer border-0 bg-transparent px-1.5 font-sans text-[15px] font-semibold text-white"
          >
            Detalhes
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* "A seguir": tira enxuta de 236px com arrasto lateral e pontinhos    */
/* ------------------------------------------------------------------ */
function UpNext({ items, now, statusOf, onOpen, onAgenda }) {
  const stripRef = useRef(null);
  const [page, setPage] = useState(0);

  const handleScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    setPage(Math.min(items.length - 1, Math.round(el.scrollLeft / 248)));
  };

  return (
    <section aria-labelledby="prox" className="mt-6">
      <div className="flex items-baseline justify-between px-5">
        <h2 id="prox" className="m-0 text-[17px] font-extrabold">A seguir</h2>
        <button type="button" onClick={onAgenda} className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-sans text-sm font-bold text-link">
          Ver agenda
        </button>
      </div>
      <ul ref={stripRef} onScroll={handleScroll} className="inicio-strip m-0 mt-1 list-none">
        {items.map(({ a, w }) => {
          const cat = categoryOf(a.type);
          const st = statusOf(a);
          return (
            <li key={a.id} className="w-[236px]">
              <button
                type="button"
                onClick={() => onOpen(a)}
                className="press flex h-full w-full flex-col justify-start cursor-pointer rounded-[18px] border border-solid border-line p-3.5 text-left font-sans text-text"
                style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${cat.color} 15%, transparent), var(--surface) 55%)` }}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[22px] font-extrabold leading-none">{hhmm(w.start)}</span>
                  {(st === 'BOOKED' || st === 'CHECKED_IN' || st === 'COMPLETED') && (
                    <span className="flex size-[22px] items-center justify-center rounded-full bg-[rgba(143,160,255,0.18)]" title="Reservado">
                      <Check size={13} strokeWidth={2.8} className="text-[#B4C0FF]" aria-hidden="true" />
                      <span className="sr-only">Reservado</span>
                    </span>
                  )}
                  {st === 'WAITING_LIST' && (
                    <span className="flex size-[22px] items-center justify-center rounded-full bg-[rgba(242,196,106,0.18)]" title="Lista de espera">
                      <Clock size={13} strokeWidth={2.4} className="text-warn" aria-hidden="true" />
                      <span className="sr-only">Lista de espera</span>
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs font-bold" style={{ color: cat.color }}>
                  {dayLabel(w.start, now)} · {cat.label}
                </span>
                <span className="mt-2.5 line-clamp-2 block text-sm font-bold leading-[1.35]">{a.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 1 && (
        <div aria-hidden="true" className="mt-3 flex justify-center gap-1.5">
          {items.map((x, i) => (
            <span
              key={x.a.id}
              className={`h-1.5 rounded-[3px] transition-[width,background-color] duration-150 ${i === page ? 'w-[18px] bg-[#8F7BFF]' : 'w-1.5 bg-[#2A3460]'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Primeiros passos (sem ingresso) — board InicioPendente              */
/* ------------------------------------------------------------------ */
function PendingHome({ installed, onLink, onInstall, upcoming, now, onOpen, onAgenda }) {
  const done = 1 + (installed ? 1 : 0); // passo 2 (ingresso) está pendente por definição nesta tela
  const steps = [
    { title: 'Conta criada', text: 'Bem-vindo ao app da Tech Week.', state: 'done' },
    {
      title: 'Vincule seu ingresso Sympla',
      text: 'Libera reservas de vagas, o QR do seu crachá e os pontos.',
      state: 'current',
      action: (
        <button type="button" onClick={onLink} className="btn btn-action mt-2.5 !min-h-[44px] !rounded-xl !px-4 !text-sm">
          <Ticket size={18} strokeWidth={1.9} aria-hidden="true" /> Vincular ingresso
        </button>
      )
    },
    {
      title: 'Instale o app no celular',
      text: 'Abre em tela cheia e avisa quando sua atividade vai começar.',
      state: installed ? 'done' : 'todo',
      action: installed ? null : (
        <button type="button" onClick={onInstall} className="btn btn-secondary mt-2.5 !min-h-[44px] !rounded-xl !px-4 !text-sm !font-bold">
          <Smartphone size={18} strokeWidth={1.9} aria-hidden="true" /> Como instalar
        </button>
      )
    }
  ];

  return (
    <>
      <section aria-labelledby="ativ-t" className="inicio-steps-card relative mx-5 mt-[26px] rounded-[22px] p-[18px]">
        <div className="pointer-events-none absolute -right-1 -top-[34px]" aria-hidden="true">
          <Mascot color="blue" isWaving className="mascot-no-float" style={{ width: 80, height: 80 }} />
        </div>
        <p className="m-0 text-xs font-extrabold text-link">Primeiros passos · {done} de 3</p>
        <h2 id="ativ-t" className="m-0 mr-20 mt-1.5 text-[21px] font-black leading-[1.2]">
          Falta pouco para o seu <span className="inicio-text-gradient">crachá</span>
        </h2>
        <div className="mb-1.5 mt-3 h-1.5 overflow-hidden rounded-[3px] bg-white/10" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={3} aria-label="Primeiros passos concluídos">
          <div className="h-1.5 rounded-[3px] bg-[image:var(--progress-fill)]" style={{ width: `${Math.round((done / 3) * 100)}%` }} />
        </div>
        <ol className="m-0 list-none p-0">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3 border-t border-white/[0.08] py-3" aria-current={s.state === 'current' ? 'step' : undefined}>
              {s.state === 'done' ? (
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-ok text-[#0A2A1C]">
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                  <span className="sr-only">Feito:</span>
                </span>
              ) : (
                <span
                  className={`flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 border-solid text-[13px] font-black ${
                    s.state === 'current' ? 'border-link text-link' : 'border-[#3A4675] text-text-4'
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-extrabold ${s.state === 'done' ? 'text-text-3 line-through' : ''}`}>{s.title}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.45] text-text-2">{s.text}</span>
                {s.action}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="prog-t" className="mt-[26px]">
          <h2 id="prog-t" className="m-0 px-5 text-[17px] font-extrabold">Enquanto isso, veja a programação</h2>
          <p className="m-0 mx-5 mt-1 text-[13px] text-text-3">Para reservar vaga, vincule seu ingresso primeiro.</p>
          <ul className="inicio-strip m-0 mt-3 list-none">
            {upcoming.map(({ a, w }) => {
              const cat = categoryOf(a.type);
              return (
                <li key={a.id} className="w-[150px]">
                  <button
                    type="button"
                    onClick={() => onOpen(a)}
                    className="press flex h-full w-full flex-col justify-start cursor-pointer rounded-2xl border-0 border-t-[3px] border-solid bg-surface p-3 text-left font-sans text-text"
                    style={{ borderTopColor: cat.color }}
                  >
                    <span className="block text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
                    <span className="mt-2 block text-[19px] font-extrabold leading-none">{hhmm(w.start)}</span>
                    <span className="mt-0.5 block truncate text-xs text-text-2">
                      {dayLabel(w.start, now)}{a.location ? ` · ${a.location}` : ''}
                    </span>
                    <span className="mt-2 line-clamp-3 block text-[13px] font-semibold leading-[1.35]">{a.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={onAgenda}
            className="mx-auto mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent px-5 font-sans text-sm font-bold text-link"
          >
            Ver a agenda completa <ChevronRight size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Toast (DESIGN.md §6): acima da barra, ícone redondo, erro = alert   */
/* ------------------------------------------------------------------ */
const TOAST_ICON = {
  success: { Icon: CheckCircle2, cls: 'bg-ok text-[#0A2A1C]' },
  warning: { Icon: AlertTriangle, cls: 'bg-warn text-[#2A1F05]' },
  info: { Icon: Info, cls: 'bg-link text-[#0A0F24]' },
  error: { Icon: AlertCircle, cls: 'bg-err text-[#2A0A0A]' }
};

function Toast({ toast }) {
  if (!toast) return null;
  const { Icon, cls } = TOAST_ICON[toast.type] || TOAST_ICON.info;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="fixed inset-x-4 z-[1500] mx-auto flex max-w-[398px] items-center gap-3 rounded-2xl bg-surface-selected py-3 pl-3.5 pr-4 text-sm font-semibold text-text shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
      style={{ bottom: 'calc(max(10px, env(safe-area-inset-bottom)) + 84px)', animation: 'dsFadeUp 220ms var(--ease-out) both' }}
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${cls}`}>
        <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="flex-1">{toast.message}</span>
    </div>
  );
}

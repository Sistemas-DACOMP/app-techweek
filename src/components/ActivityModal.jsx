import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2, ScanLine, User, Star, Lock, Clock } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import ConfirmModal from './ConfirmModal';
import ActivityFeedbackModal from './ActivityFeedbackModal';
import { isActivityEvaluated } from '../lib/liveOpsService';
import { formatCountdownRemaining } from '../lib/activityService';
import { CATEGORY_STYLES } from './Badge';
import '../styles/agenda.css';

// INFERIDA (DESIGN.md §12): limite do amarelo aguardando confirmação do Fabio
export const SEMAFORO_LIMITE_AMARELO = 0.3;

const EVENT_YEAR = 2026;
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 'DD/MM' → Date (ano do evento) ou null. */
export function parseActivityDay(day) {
  const [d, m] = String(day || '').split('/').map((n) => parseInt(n, 10));
  if (!d || !m) return null;
  return new Date(EVENT_YEAR, m - 1, d);
}

/** { weekday: 'Quinta', short: 'Qui', dayNum: '22', month: 'out' } */
export function describeDay(day) {
  const date = parseActivityDay(day);
  if (!date) return { weekday: 'Dia', short: 'Dia', dayNum: String(day || ''), month: '' };
  const weekday = WEEKDAYS[date.getDay()];
  return { weekday, short: weekday.slice(0, 3), dayNum: String(date.getDate()), month: MONTHS[date.getMonth()] };
}

export function categoryOf(activity) {
  const type = String(activity?.type || 'palestra').toLowerCase().trim();
  return CATEGORY_STYLES[type] || CATEGORY_STYLES.palestra;
}

/**
 * Semáforo de vagas (DESIGN.md §2.5). Só faz sentido para quem ainda não tem vaga —
 * quem chama decide se mostra.
 */
export function getSeatsLight(activity) {
  const free = typeof activity?.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const total = typeof activity?.vagas_totais === 'number' ? activity.vagas_totais : 0;
  if (free <= 0) return { key: 'red', color: '#F59A9A', label: 'Lotado' };
  if (total > 0 && free / total <= SEMAFORO_LIMITE_AMARELO) return { key: 'yellow', color: '#FBBF24', label: `Últimas ${free}` };
  return { key: 'green', color: '#6FD8A6', label: 'Vagas livres' };
}

export function SeatsLight({ activity }) {
  const light = getSeatsLight(activity);
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-bold" style={{ color: light.color }}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: light.color, boxShadow: `0 0 0 3px ${light.color}33` }} />
      <span><span className="sr-only">Vagas: </span>{light.label}</span>
    </span>
  );
}

function Step({ state, title, hint }) {
  return (
    <div className="flex items-start gap-2.5">
      {state === 'done' ? (
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-ok text-[#0A2A1C]">
          <Check size={13} strokeWidth={3.2} aria-hidden="true" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`h-[22px] w-[22px] shrink-0 rounded-full border-2 ${state === 'current' ? 'border-link shadow-[0_0_0_4px_rgba(143,160,255,0.15)]' : 'border-line-2'}`}
        />
      )}
      <span className={`text-sm ${state === 'pending' ? 'text-text-2' : 'text-text'}`}>
        {title}
        {state === 'done' && <span className="sr-only"> (feito)</span>}
        {hint && <span className="mt-0.5 block text-[13px] text-text-2">{hint}</span>}
      </span>
    </div>
  );
}

/** Bottom sheet "Atividade" (DESIGN.md 1.24). */
export default function ActivityModal({
  activity,
  status = 'NONE',
  confirmationDeadline = null,
  isReserving = false,
  isCancelling = false,
  isConfirmingWaiting = false,
  isDecliningWaiting = false,
  readOnly = false,
  hasTicket = true,
  onClose,
  onReserve,
  onCancelReserve,
  onConfirmWaiting,
  onDeclineWaiting,
  onOpenCheckoutScanner,
  onOpenSelfScanner
}) {
  useScrollLock(!!activity);

  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [expandedBios, setExpandedBios] = useState({});
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [evaluated, setEvaluated] = useState(() => isActivityEvaluated(activity?.id));
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setEvaluated(isActivityEvaluated(activity?.id));
  }, [activity?.id]);

  useEffect(() => {
    if (status !== 'WAITING_CONFIRMATION') return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const closeRef = useRef(null);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!activity || typeof document === 'undefined') {
    return null;
  }

  const category = categoryOf(activity);
  const seatsAvailable = typeof activity.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const isSoldOut = seatsAvailable <= 0;
  const points = activity.points || 20;
  const isDoubleCheck = activity.attendanceMode === 'DOUBLE_CHECK';
  const hasSeat = !readOnly && (status === 'BOOKED' || status === 'CHECKED_IN' || status === 'COMPLETED');

  const speakerName = activity.speaker || '';
  const speakerRole = activity.speaker_role || activity.speakerRole || '';
  const speakerBio = activity.speaker_bio || activity.speakerBio || '';
  const speakerPhoto = activity.speaker_photo || activity.speakerPhoto || '';
  const description = activity.description || '';

  const speakersList = Array.isArray(activity.speakers) && activity.speakers.length > 0
    ? activity.speakers.map((s, idx) => ({
        id: s.id || `spk_${idx}`,
        name: s.name,
        role: s.role || s.institution || '',
        bio: s.bio || '',
        photo: s.photo || s.photoUrl || ''
      }))
    : (speakerName ? [{
        id: activity.speakerId || 'spk_main',
        name: speakerName,
        role: speakerRole,
        bio: speakerBio,
        photo: speakerPhoto
      }] : []);

  const day = describeDay(activity.day);
  const endTime = activity.endTime || activity.end_time;
  const when = [
    activity.day ? `${day.weekday}, ${day.dayNum} ${day.month}` : null,
    activity.time ? (endTime ? `${activity.time} – ${endTime}` : activity.time) : 'Horário a definir'
  ].filter(Boolean).join(' · ');

  // Gestos de arrastar para baixo no topo
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset > 75) {
      onClose();
    } else {
      setDragOffset(0);
    }
  };

  const openScanner = () => {
    onClose();
    if (isDoubleCheck) {
      if (onOpenCheckoutScanner) onOpenCheckoutScanner(activity);
    } else if (onOpenSelfScanner) {
      onOpenSelfScanner(activity);
    }
  };

  const primaryClass = 'btn btn-primary btn-block min-h-[54px]! text-base! font-bold! shadow-[0_10px_24px_rgba(79,70,229,0.35)]';

  // Mesma ação, texto e confirmação para quem tem vaga e para quem está na lista de espera
  const isWaiting = status === 'WAITING_LIST';
  const cancelButton = onCancelReserve && (status === 'BOOKED' || isWaiting) ? (
    <button
      type="button"
      onClick={() => setConfirmingCancel(true)}
      disabled={isCancelling}
      className="btn btn-danger btn-sm btn-block"
    >
      {isCancelling && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {isCancelling ? 'Cancelando' : 'Cancelar inscrição'}
    </button>
  ) : null;

  let footer;
  if (readOnly) {
    footer = (
      <div className="flex flex-col gap-3">
        <div className="flex justify-center">
          <SeatsLight activity={activity} />
        </div>
        <p className="text-center text-xs text-text-3">
          Modo de visualização da grade • Inscrições apenas para participantes
        </p>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary btn-block min-h-[48px] text-sm font-semibold"
        >
          Fechar detalhes
        </button>
      </div>
    );
  } else if (status === 'COMPLETED') {
    footer = (
      <div className="flex flex-col gap-2.5">
        <div className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[rgba(111,216,166,0.12)] text-[14px] font-bold text-ok" role="status">
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          Presença confirmada
        </div>
        {evaluated ? (
          <div className="flex items-center justify-center gap-2 rounded-[14px] bg-surface-raised py-2.5 text-xs font-semibold text-text-3">
            <Star size={14} className="fill-gold text-gold" />
            Avaliação enviada (+10 XP)
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            className="btn btn-primary btn-block min-h-[48px] text-[14px] font-bold flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#7C3AED,#3B82F6)] hover:brightness-110 shadow-md"
          >
            <Star size={16} className="fill-white text-white" />
            Avaliar palestra (+10 XP)
          </button>
        )}
      </div>
    );
  } else if (status === 'CHECKED_IN') {
    footer = (
      <button type="button" onClick={openScanner} className={primaryClass}>
        <ScanLine size={20} aria-hidden="true" />
        Ler QR do telão
      </button>
    );
  } else if (status === 'BOOKED' && activity.attendanceMode === 'SELF_SCAN') {
    footer = (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => { onClose(); if (onOpenSelfScanner) onOpenSelfScanner(activity); }} className={primaryClass}>
          <ScanLine size={20} aria-hidden="true" />
          Validar presença
        </button>
        {cancelButton}
      </div>
    );
  } else if (status === 'BOOKED') {
    footer = (
      <div className="flex flex-col gap-2">
        <p className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-surface-raised text-[15px] font-extrabold text-link" role="status">
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          Vaga reservada
        </p>
        {cancelButton}
      </div>
    );
  } else if (status === 'WAITING_CONFIRMATION') {
    const rawCountdown = formatCountdownRemaining(confirmationDeadline, nowMs);
    const countdownText =
      typeof rawCountdown === 'object' && rawCountdown !== null
        ? rawCountdown.formatted
        : rawCountdown;
    const isExpired =
      countdownText === 'Prazo expirado' ||
      countdownText === 'Expirado' ||
      Boolean(typeof rawCountdown === 'object' && rawCountdown?.expired);
    const busy = isConfirmingWaiting || isDecliningWaiting;
    footer = (
      <div className="flex flex-col gap-2.5">
        <div
          className="flex flex-col items-center gap-1 rounded-[14px] border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-center"
          role="status"
        >
          <span className="text-[13px] font-extrabold text-warn">
            Uma vaga abriu para você!
          </span>
          {countdownText && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-text-2" data-testid="modal-waiting-countdown">
              <Clock size={13} className="text-warn" aria-hidden="true" />
              {isExpired ? 'Prazo expirado' : `Tempo restante: ${countdownText}`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onConfirmWaiting && onConfirmWaiting(activity.id)}
          disabled={busy || isExpired}
          aria-busy={isConfirmingWaiting}
          className={primaryClass}
        >
          {isConfirmingWaiting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {isConfirmingWaiting ? 'Confirmando...' : 'Confirmar Minha Vaga'}
        </button>
        <button
          type="button"
          onClick={() => (onDeclineWaiting ? onDeclineWaiting(activity.id) : onCancelReserve && onCancelReserve(activity.id))}
          disabled={busy}
          aria-busy={isDecliningWaiting}
          className="btn btn-danger btn-sm btn-block"
        >
          {isDecliningWaiting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isDecliningWaiting ? 'Liberando vaga...' : 'Não poderei ir (Liberar para outro)'}
        </button>
      </div>
    );
  } else if (status === 'WAITING_LIST') {
    footer = (
      <div className="flex flex-col gap-2">
        <p className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-surface-raised text-[15px] font-extrabold text-warn" role="status">
          Você está na lista de espera
        </p>
        {cancelButton}
      </div>
    );
  } else if (!hasTicket && !activity.isOpenEvent) {
    footer = (
      <>
        <div className="mb-3 flex justify-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
            <Lock size={14} aria-hidden="true" />
            Exclusivo para portadores do Passaporte Completo
          </p>
        </div>
        <button
          type="button"
          onClick={() => onReserve && onReserve(activity.id)}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#D97706,#B45309)] text-[16px] font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          <Lock size={18} aria-hidden="true" />
          Desbloquear com Passaporte
        </button>
      </>
    );
  } else {
    footer = (
      <>
        <div className="mb-3 flex justify-center">
          <SeatsLight activity={activity} />
        </div>
        <button
          type="button"
          onClick={() => onReserve && onReserve(activity.id)}
          disabled={isReserving}
          aria-busy={isReserving}
          className={primaryClass}
        >
          {isReserving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {isReserving
            ? 'Reservando'
            : isSoldOut
            ? 'Entrar na lista de espera'
            : !hasTicket && activity.isOpenEvent
            ? 'Garantir minha vaga (Entrada Livre)'
            : 'Reservar vaga'}
        </button>
      </>
    );
  }

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="atividade-titulo"
        className="fixed inset-x-0 bottom-0 top-12 z-[2001] mx-auto flex max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-text animate-[dsSheetUp_250ms_var(--ease-out)]"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging.current ? 'none' : 'transform 200ms var(--ease-out)'
        }}
      >
        {/* Topo com tinta da marca: alça, selos, título, quando e onde */}
        <div
          className="relative shrink-0 bg-[linear-gradient(160deg,#3B2B8F,#121A36_85%)] px-5 pb-5 pt-2.5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex justify-center" aria-hidden="true">
            <span className="h-1 w-9 rounded-full bg-white/30" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-[10px] px-2.5 py-1 text-xs font-bold" style={{ background: `${category.accent}33`, color: category.text }}>
                {category.label}
              </span>
              {activity.isOpenEvent ? (
                <span className="rounded-[10px] bg-ok/20 px-2.5 py-1 text-xs font-bold text-ok">
                  Entrada Livre
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-[10px] border border-gold/30 bg-gold/20 px-2.5 py-1 text-xs font-extrabold text-gold">
                  <Lock size={12} aria-hidden="true" />
                  Passaporte Completo
                </span>
              )}
              <span className="rounded-[10px] bg-[rgba(124,58,237,0.35)] px-2.5 py-1 text-xs font-extrabold text-white">
                +{points} pts
              </span>
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <h2 id="atividade-titulo" className="mt-1.5 text-[22px] font-extrabold leading-[1.25]">
            {activity.title}
          </h2>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-[#D3D8EA]">
            <span>{when}</span>
            <span>{activity.location || 'Local a definir'}</span>
          </div>
        </div>

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 pt-1">
          {hasSeat && (
            <div className="rounded-2xl bg-surface-raised p-4">
              <h3 className="text-sm font-bold">Sua presença</h3>
              <div className="mt-3">
                {isDoubleCheck ? (
                  <>
                    <Step
                      state={status === 'BOOKED' ? 'current' : 'done'}
                      title={status === 'BOOKED' ? 'Registre a entrada com o Staff na porta' : 'Entrada registrada'}
                    />
                    <div className="ml-2.5 h-3 w-0.5 bg-[#313C6A]" aria-hidden="true" />
                    <Step
                      state={status === 'COMPLETED' ? 'done' : status === 'CHECKED_IN' ? 'current' : 'pending'}
                      title="Leia o QR do telão antes de sair"
                      hint={status === 'COMPLETED' ? null : 'Está projetado na tela da sala.'}
                    />
                  </>
                ) : (
                  <Step
                    state={status === 'COMPLETED' ? 'done' : 'current'}
                    title="Leia o QR exibido na sala"
                    hint={status === 'COMPLETED' ? null : 'Vale durante a atividade.'}
                  />
                )}
              </div>
            </div>
          )}

          {speakersList.length > 0 && (
            <div className="space-y-3.5">
              {speakersList.length > 1 && (
                <div className="flex items-center justify-between border-b border-line pb-1.5">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-text-3">
                    Palestrantes & Convidados ({speakersList.length})
                  </span>
                </div>
              )}
              {speakersList.map((spk, idx) => {
                const spkKey = spk.id || idx;
                const isBioExp = speakersList.length === 1 ? isBioExpanded : !!expandedBios[spkKey];
                const toggleBioHandler = () => {
                  if (speakersList.length === 1) {
                    setIsBioExpanded(!isBioExpanded);
                  } else {
                    setExpandedBios((prev) => ({ ...prev, [spkKey]: !prev[spkKey] }));
                  }
                };

                return (
                  <div key={spkKey} className={speakersList.length > 1 ? 'rounded-2xl border border-line bg-surface/40 p-3.5' : ''}>
                    <div className="flex items-center gap-3">
                      {spk.photo ? (
                        <img src={spk.photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised font-bold text-[13px] text-text-3" aria-hidden="true">
                          {spk.name ? spk.name.slice(0, 2).toUpperCase() : <User size={20} />}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold">{spk.name}</p>
                        {spk.role && <p className="text-[13px] text-text-2">{spk.role}</p>}
                      </div>
                    </div>
                    {spk.bio && (
                      <>
                        <p className={`mt-2.5 text-sm leading-[1.5] text-text-2 ${isBioExp ? '' : 'line-clamp-2'}`}>{spk.bio}</p>
                        {spk.bio.length > 100 && (
                          <button
                            type="button"
                            onClick={toggleBioHandler}
                            aria-expanded={isBioExp}
                            className="min-h-11 text-[13px] font-bold text-link"
                          >
                            {isBioExp ? 'Mostrar menos' : 'Ler bio completa'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {description && (
            <div>
              <p className={`text-[15px] leading-[1.55] text-text-2 ${isDescExpanded ? '' : 'line-clamp-4'}`}>{description}</p>
              {description.length > 150 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  aria-expanded={isDescExpanded}
                  className="min-h-11 text-[13px] font-bold text-link"
                >
                  {isDescExpanded ? 'Mostrar menos' : 'Ler descrição completa'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-7 pt-4">{footer}</div>
      </div>
      <ConfirmModal
        isOpen={confirmingCancel}
        title="Cancelar inscrição?"
        message={isWaiting ? 'Você sai da lista de espera desta atividade.' : 'Sua vaga volta para outros participantes e você precisa reservar de novo se mudar de ideia.'}
        confirmLabel="Cancelar inscrição"
        cancelLabel="Manter"
        isLoading={isCancelling}
        onCancel={() => setConfirmingCancel(false)}
        onConfirm={async () => {
          await onCancelReserve(activity.id);
          setConfirmingCancel(false);
        }}
      />
      {showFeedbackModal && (
        <ActivityFeedbackModal
          isOpen={true}
          activity={activity}
          onClose={() => {
            setShowFeedbackModal(false);
            setEvaluated(isActivityEvaluated(activity?.id));
          }}
          onSuccess={() => {
            setEvaluated(true);
          }}
        />
      )}
    </>,
    document.body
  );
}

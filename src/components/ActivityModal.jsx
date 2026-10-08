import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2, ScanLine, User } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
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
  isReserving = false,
  isCancelling = false,
  onClose,
  onReserve,
  onCancelReserve,
  onOpenCheckoutScanner,
  onOpenSelfScanner
}) {
  useScrollLock(!!activity);

  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

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
  const hasSeat = status === 'BOOKED' || status === 'CHECKED_IN' || status === 'COMPLETED';

  const speakerName = activity.speaker || '';
  const speakerRole = activity.speaker_role || activity.speakerRole || '';
  const speakerBio = activity.speaker_bio || activity.speakerBio || '';
  const speakerPhoto = activity.speaker_photo || activity.speakerPhoto || '';
  const description = activity.description || '';

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

  let footer;
  if (status === 'COMPLETED') {
    footer = (
      <p className="flex min-h-[54px] items-center justify-center gap-2 rounded-[14px] bg-surface-raised text-[15px] font-extrabold text-ok" role="status">
        <Check size={18} strokeWidth={3} aria-hidden="true" />
        Presença confirmada
      </p>
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
      <button type="button" onClick={() => { onClose(); if (onOpenSelfScanner) onOpenSelfScanner(activity); }} className={primaryClass}>
        <ScanLine size={20} aria-hidden="true" />
        Validar presença
      </button>
    );
  } else if (status === 'BOOKED') {
    footer = (
      <div className="flex flex-col gap-2">
        <p className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-surface-raised text-[15px] font-extrabold text-link" role="status">
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          Vaga reservada
        </p>
        {onCancelReserve && (
          <button
            type="button"
            onClick={() => onCancelReserve(activity.id)}
            disabled={isCancelling}
            className="btn btn-danger btn-sm btn-block"
          >
            {isCancelling && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isCancelling ? 'Liberando vaga' : 'Liberar minha vaga'}
          </button>
        )}
      </div>
    );
  } else if (status === 'WAITING_LIST') {
    footer = (
      <p className="flex min-h-[54px] items-center justify-center rounded-[14px] bg-surface-raised text-[15px] font-extrabold text-warn" role="status">
        Você está na lista de espera
      </p>
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
          {isReserving ? 'Reservando' : isSoldOut ? 'Entrar na lista de espera' : 'Reservar vaga'}
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
            <span className="flex gap-2">
              <span className="rounded-[10px] px-2.5 py-1 text-xs font-bold" style={{ background: `${category.accent}33`, color: category.text }}>
                {category.label}
              </span>
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

          {speakerName && (
            <div>
              <div className="flex items-center gap-3">
                {speakerPhoto ? (
                  <img src={speakerPhoto} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-3" aria-hidden="true">
                    <User size={20} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{speakerName}</p>
                  {speakerRole && <p className="text-[13px] text-text-2">{speakerRole}</p>}
                </div>
              </div>
              {speakerBio && (
                <>
                  <p className={`mt-3 text-sm leading-[1.5] text-text-2 ${isBioExpanded ? '' : 'line-clamp-2'}`}>{speakerBio}</p>
                  {speakerBio.length > 100 && (
                    <button
                      type="button"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      aria-expanded={isBioExpanded}
                      className="min-h-11 text-[13px] font-bold text-link"
                    >
                      {isBioExpanded ? 'Mostrar menos' : 'Ler bio completa'}
                    </button>
                  )}
                </>
              )}
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
    </>,
    document.body
  );
}

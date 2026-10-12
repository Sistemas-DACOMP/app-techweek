import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CalendarCheck, Zap, Trophy, MessageSquare } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useScrollLock } from '../hooks/useScrollLock';
import Mascot from './Mascot';

export function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins === 1) return 'há 1 min';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours === 1) return 'há 1h';
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays}d`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return 'agora';
  }
}

// Ícone e cor por tipo de aviso (DESIGN.md §2.4: verde = confirmado, dourado = missão, violeta = seus pontos)
const TYPE_STYLE = {
  lecture: { Icon: CalendarCheck, cls: 'bg-[rgba(111,216,166,0.16)] text-ok' },
  mission: { Icon: Zap, cls: 'bg-[rgba(242,196,106,0.16)] text-warn', fill: true },
  points: { Icon: Trophy, cls: 'bg-you-soft text-you-text' },
  trophy: { Icon: Trophy, cls: 'bg-you-soft text-you-text' },
  system: { Icon: MessageSquare, cls: 'bg-[rgba(143,160,255,0.16)] text-link' }
};

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Antes';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Hoje';
  if (dayKey(d) === dayKey(yesterday)) return 'Ontem';
  return 'Antes';
}

function timeLabel(iso) {
  const d = new Date(iso);
  if (groupLabel(iso) === 'Hoje') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return formatTimestamp(iso);
}

/** Tela "Avisos" (board Avisos). Abre pelo sino do Início. */
export default function NotificationModal({ isOpen, onClose }) {
  useScrollLock(isOpen);

  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const backRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    backRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleItemClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      onClose();
      navigate(notification.actionUrl);
    }
  };

  const groups = [];
  notifications.forEach((n) => {
    const label = groupLabel(n.timestamp);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(n);
    else groups.push({ label, items: [n] });
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] overflow-y-auto bg-bg font-sans text-text"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avisos-title"
      style={{ animation: 'dsFade 200ms var(--ease-out)' }}
    >
      <div className="mx-auto max-w-[430px] pb-10">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-bg pl-2 pr-3 pt-2.5">
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text"
          >
            <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
          </button>
          <h1 id="avisos-title" className="m-0 text-lg font-extrabold">Avisos</h1>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="h-11 cursor-pointer border-0 bg-transparent px-2 font-sans text-sm font-bold text-link"
            >
              Ler todos
            </button>
          ) : (
            <span className="w-11" aria-hidden="true" />
          )}
        </header>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-16 text-center">
            <Mascot color="blue" style={{ width: 112, height: 112 }} />
            <p className="m-0 mt-5 text-[17px] font-extrabold">Nenhum aviso por enquanto</p>
            <p className="m-0 mt-1.5 text-sm leading-[1.45] text-text-2">
              Quando sua vaga for confirmada ou sair uma missão nova, avisamos aqui.
            </p>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm mt-6">
              Voltar ao Início
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mx-5 mb-2 mt-[18px] text-[13px] font-bold text-text-3">{group.label}</h2>
              <ul className="m-0 flex list-none flex-col gap-2 px-5">
                {group.items.map((n) => {
                  const unread = !n.read;
                  const { Icon, cls, fill } = TYPE_STYLE[n.type] || TYPE_STYLE.system;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className={`press grid w-full cursor-pointer grid-cols-[40px_1fr] gap-3 rounded-2xl border-0 p-3.5 text-left font-sans text-text ${
                          unread ? 'bg-[#161F45]' : 'bg-surface'
                        }`}
                      >
                        <span className={`flex size-10 items-center justify-center rounded-full ${cls}`}>
                          <Icon size={20} strokeWidth={2} fill={fill ? 'currentColor' : 'none'} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex justify-between gap-2">
                            <span className={`text-[15px] ${unread ? 'font-bold' : 'font-semibold'}`}>{n.title}</span>
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-3">
                              {timeLabel(n.timestamp)}
                              {unread && (
                                <>
                                  <span className="size-2 rounded-full bg-you" aria-hidden="true" />
                                  <span className="sr-only">não lido</span>
                                </>
                              )}
                            </span>
                          </span>
                          {n.message && (
                            <span className="mt-0.5 block text-sm leading-[1.45] text-text-2">{n.message}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}

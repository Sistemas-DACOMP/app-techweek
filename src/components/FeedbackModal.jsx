import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, Info, Check, X } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import '../styles/perfil.css';

/**
 * Diálogo de resultado (sucesso / erro / aviso / info), no Design System (DESIGN.md §6, §10).
 * API de props estável — usado por Perfil, Admin, Challenges e Cadastro.
 */
const TYPES = {
  success: { tone: 'var(--ok)', soft: 'rgba(111, 216, 166, 0.14)', defaultTitle: 'Missão concluída!', Icon: Check },
  error: { tone: 'var(--err)', soft: 'rgba(245, 154, 154, 0.12)', defaultTitle: 'Algo deu errado', Icon: AlertCircle },
  warning: { tone: 'var(--warn)', soft: 'rgba(242, 196, 106, 0.14)', defaultTitle: 'Atenção', Icon: AlertTriangle },
  info: { tone: 'var(--link)', soft: 'rgba(143, 160, 255, 0.14)', defaultTitle: 'Informação', Icon: Info }
};

export default function FeedbackModal({
  isOpen,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  points,
  onClose,
  actionLabel = 'Continuar'
}) {
  const titleId = useId();
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = TYPES[type] || TYPES.info;
  const ModalIcon = current.Icon;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay-fixed ds-dialog-scrim p-5" onClick={onClose}>
      <div
        role={type === 'error' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-card-fixed ds-dialog relative flex w-full max-w-[380px] flex-col items-center rounded-[26px] border border-line-2 bg-surface px-6 pb-6 pt-7 text-center text-text"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-text-3"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <span
          aria-hidden="true"
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: current.soft, color: current.tone }}
        >
          <ModalIcon size={26} strokeWidth={type === 'success' ? 2.6 : 2} />
        </span>

        <h2 id={titleId} className="text-[19px] font-extrabold leading-tight">
          {(title || current.defaultTitle)?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}🎉✨]/gu, '').trim()}
        </h2>

        {points !== undefined && points !== null && (
          <span className="pts-chip mt-3 !px-3 !py-1 !text-[14px]">+{points} pts</span>
        )}

        <p className="mb-6 mt-2 text-[14px] leading-relaxed text-text-2">{message}</p>

        <button onClick={onClose} type="button" autoFocus className={`btn btn-block ${type === 'error' ? 'btn-secondary' : 'btn-primary'}`}>
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}

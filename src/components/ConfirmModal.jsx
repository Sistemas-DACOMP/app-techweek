import { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Trash2, X, Loader2 } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import '../styles/perfil.css';

/**
 * Diálogo de confirmação de ações de risco (KAN-101), no Design System (DESIGN.md §6, §10).
 * Suporta confirmação digitada (ex: digite "EXCLUIR") para prevenir ações acidentais.
 * API de props estável — usado por Perfil, Admin, Challenges e Cadastro.
 */
const VARIANTS = {
  danger: { tone: 'var(--err)', soft: 'rgba(245, 154, 154, 0.12)', confirm: 'btn-danger', defaultIcon: Trash2 },
  warning: { tone: 'var(--warn)', soft: 'rgba(242, 196, 106, 0.14)', confirm: 'btn-warn', defaultIcon: AlertTriangle },
  primary: { tone: 'var(--link)', soft: 'rgba(143, 160, 255, 0.14)', confirm: 'btn-action', defaultIcon: AlertCircle }
};

export default function ConfirmModal({
  isOpen,
  title = 'Confirmação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  Icon,
  onConfirm,
  onCancel,
  isLoading = false,
  requireConfirmationText = '',
  confirmationPrompt = ''
}) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const titleId = useId();

  useEffect(() => {
    setTypedConfirmation('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && !isLoading && onCancel?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onCancel]);

  useScrollLock(isOpen);
  if (!isOpen) return null;

  const current = VARIANTS[variant] || VARIANTS.danger;
  const ModalIcon = Icon || current.defaultIcon;

  const isConfirmationValid = !requireConfirmationText ||
    typedConfirmation.trim().toUpperCase() === requireConfirmationText.trim().toUpperCase();
  const isConfirmDisabled = isLoading || !isConfirmationValid;

  const content = (
    <div className="modal-overlay-fixed ds-dialog-scrim p-5" onClick={!isLoading ? onCancel : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-card-fixed ds-dialog relative flex w-full max-w-[380px] flex-col items-center rounded-[26px] border border-line-2 bg-surface px-6 pb-6 pt-7 text-center text-text"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={!isLoading ? onCancel : undefined}
          type="button"
          aria-label="Fechar"
          disabled={isLoading}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-text-3 disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <span
          aria-hidden="true"
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: current.soft, color: current.tone }}
        >
          <ModalIcon size={26} />
        </span>

        <h2 id={titleId} className="text-[19px] font-extrabold leading-tight">{title}</h2>

        <p className={`mt-2 text-[14px] leading-relaxed text-text-2 ${requireConfirmationText ? 'mb-4' : 'mb-6'}`}>{message}</p>

        {requireConfirmationText && (
          <div className="mb-5 w-full text-left">
            <label htmlFor="confirm-input-text" className="field-label leading-snug">
              {confirmationPrompt || (
                <span>Para prosseguir, digite <strong className="text-err">{requireConfirmationText}</strong> no campo abaixo:</span>
              )}
            </label>
            <input
              id="confirm-input-text"
              type="text"
              className="field text-center font-bold"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={`Digite "${requireConfirmationText}"`}
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          <button onClick={onConfirm} type="button" disabled={isConfirmDisabled} className={`btn btn-block ${current.confirm}`}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
          <button onClick={onCancel} type="button" disabled={isLoading} className="btn btn-secondary btn-block">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}

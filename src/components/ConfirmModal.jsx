import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Trash2, X, Loader2 } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

/**
 * Modal nativo de confirmação de ações de risco / navegação crítica.
 * Suporta confirmação digitada (ex: digite "EXCLUIR") para prevenir ações acidentais.
 */
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

  useEffect(() => {
    setTypedConfirmation('');
  }, [isOpen]);

  useScrollLock(isOpen);
  if (!isOpen) return null;

  const config = {
    danger: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: '#f87171',
      confirmBg: '#dc2626',
      defaultIcon: Trash2
    },
    warning: {
      borderColor: 'rgba(234, 179, 8, 0.3)',
      iconBg: 'rgba(234, 179, 8, 0.12)',
      iconColor: '#facc15',
      confirmBg: '#d97706',
      defaultIcon: AlertTriangle
    },
    primary: {
      borderColor: 'rgba(59, 130, 246, 0.3)',
      iconBg: 'rgba(59, 130, 246, 0.12)',
      iconColor: '#60a5fa',
      confirmBg: '#2563eb',
      defaultIcon: AlertCircle
    }
  };

  const current = config[variant] || config.danger;
  const ModalIcon = Icon || current.defaultIcon;

  const isConfirmationValid = !requireConfirmationText || 
    typedConfirmation.trim().toUpperCase() === requireConfirmationText.trim().toUpperCase();

  const isConfirmDisabled = isLoading || !isConfirmationValid;

  const content = (
    <div
      className="modal-overlay-fixed"
      onClick={!isLoading ? onCancel : undefined}
      style={{
        background: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
        zIndex: 9999
      }}
    >
      <div
        className="modal-card-fixed"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '28px 24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Botão de Fechar no Topo */}
        <button
          onClick={!isLoading ? onCancel : undefined}
          type="button"
          aria-label="Fechar"
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <X size={18} />
        </button>

        {/* Ícone */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: current.iconBg,
            border: `1px solid ${current.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px'
          }}
        >
          <ModalIcon size={30} color={current.iconColor} />
        </div>

        {/* Título */}
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '10px',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          {title}
        </h3>

        {/* Mensagem / Descrição */}
        <p
          style={{
            fontSize: '0.9rem',
            color: '#94a3b8',
            lineHeight: 1.55,
            marginBottom: requireConfirmationText ? '16px' : '24px',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {message}
        </p>

        {/* Confirmação Escrita Obrigatória */}
        {requireConfirmationText && (
          <div style={{ width: '100%', marginBottom: '22px', textAlign: 'left' }}>
            <label
              htmlFor="confirm-input-text"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                marginBottom: '8px',
                lineHeight: 1.45,
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {confirmationPrompt || (
                <span>
                  Para prosseguir, digite <strong style={{ color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>{requireConfirmationText}</strong> no campo abaixo:
                </span>
              )}
            </label>
            <input
              id="confirm-input-text"
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={`Digite "${requireConfirmationText}"`}
              disabled={isLoading}
              autoComplete="off"
              autoFocus
              style={{
                width: '100%',
                height: '46px',
                padding: '0 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: isConfirmationValid && typedConfirmation.trim()
                  ? '1px solid rgba(16, 185, 129, 0.8)'
                  : '1px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                textAlign: 'center',
                letterSpacing: '0.06em',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* Ações (Confirmar / Cancelar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            onClick={onConfirm}
            type="button"
            disabled={isConfirmDisabled}
            style={{
              width: '100%',
              minHeight: '46px',
              padding: '12px 20px',
              borderRadius: '14px',
              background: current.confirmBg,
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s, background-color 0.15s',
              opacity: isConfirmDisabled ? 0.45 : 1,
              fontFamily: "'Space Grotesk', sans-serif"
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>

          <button
            onClick={onCancel}
            type="button"
            disabled={isLoading}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '10px 20px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              fontFamily: "'Inter', sans-serif"
            }}
          >
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

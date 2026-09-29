import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, Info, Award, X } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';

export default function FeedbackModal({
  isOpen,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  points,
  onClose,
  actionLabel = 'Continuar'
}) {
  useScrollLock(isOpen);
  if (!isOpen) return null;

  const config = {
    success: {
      borderColor: 'rgba(34, 197, 94, 0.25)',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      iconColor: '#4ade80',
      defaultTitle: 'Missão Concluída!',
      Icon: Award,
    },
    error: {
      borderColor: 'rgba(239, 68, 68, 0.25)',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#f87171',
      defaultTitle: 'Ops! Algo deu errado',
      Icon: AlertCircle,
    },
    warning: {
      borderColor: 'rgba(234, 179, 8, 0.25)',
      iconBg: 'rgba(234, 179, 8, 0.15)',
      iconColor: '#facc15',
      defaultTitle: 'Atenção',
      Icon: AlertTriangle,
    },
    info: {
      borderColor: 'rgba(59, 130, 246, 0.25)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#60a5fa',
      defaultTitle: 'Informação',
      Icon: Info,
    }
  };

  const current = config[type] || config.info;
  const ModalIcon = current.Icon;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay-fixed"
      onClick={onClose}
      style={{
        background: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
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
          onClick={onClose}
          type="button"
          aria-label="Fechar"
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
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <X size={18} />
        </button>

        {/* Ícone */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: current.iconBg,
            border: `1px solid ${current.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          <ModalIcon size={34} color={current.iconColor} />
        </div>

        {/* Título */}
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: points ? '8px' : '12px',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          {(title || current.defaultTitle)?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}🎉✨]/gu, '').trim()}
        </h3>

        {/* Badge de Pontos Ganhos (se aplicável) */}
        {points !== undefined && points !== null && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontWeight: '700',
              fontSize: '0.85rem',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '14px'
            }}
          >
            <Award size={16} />
            <span>+{points} PONTOS</span>
          </div>
        )}

        {/* Mensagem Explicativa */}
        <p
          style={{
            fontSize: '0.92rem',
            color: '#cbd5e1',
            lineHeight: '1.5',
            marginBottom: '24px',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {message}
        </p>

        {/* Botão de Ação Estilizado */}
        <button
          onClick={onClose}
          type="button"
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '16px',
            background: type === 'error' ? '#ef4444' : '#2563eb',
            border: 'none',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'transform 0.15s, opacity 0.15s',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}


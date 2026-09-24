import { createPortal } from 'react-dom';
import { Clock, MapPin, QrCode, X, Sparkles, Users, CheckCircle2, UserCheck, Loader2 } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatActivityType } from '../lib/activityService';

export default function ActivityModal({
  activity,
  status = 'NONE',
  isReserving = false,
  onClose,
  onReserve,
  onOpenCheckoutScanner,
  onOpenSelfScanner
}) {
  useScrollLock(!!activity);

  if (!activity || typeof document === 'undefined') {
    return null;
  }

  const typeConfig = formatActivityType(activity.type);
  const seatsAvailable = typeof activity.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const isSoldOut = seatsAvailable <= 0;

  return createPortal(
    <div
      className="modal-overlay-fixed"
      onClick={onClose}
      style={{
        padding: '20px',
        background: 'rgba(5, 15, 35, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'activityOverlayIn 0.25s ease-out'
      }}
    >
      <style>
        {`
          @keyframes activityOverlayIn {
            from { opacity: 0; backdrop-filter: blur(0); }
            to { opacity: 1; backdrop-filter: blur(16px); }
          }
          @keyframes activityModalIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>

      <div
        className="modal-card-fixed"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85dvh',
          overflowY: 'auto',
          padding: '28px 24px',
          position: 'relative',
          background: 'linear-gradient(150deg, rgba(20, 35, 65, 0.92), rgba(8, 18, 40, 0.96))',
          backdropFilter: 'blur(30px) saturate(150%)',
          WebkitBackdropFilter: 'blur(30px) saturate(150%)',
          border: '1px solid rgba(140, 195, 255, 0.22)',
          borderRadius: '28px',
          boxShadow: '0 30px 80px rgba(0, 5, 20, 0.6), 0 0 40px rgba(56, 189, 248, 0.12)',
          color: 'white',
          animation: 'activityModalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '12%',
            right: '12%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${typeConfig.color}, transparent)`,
            opacity: 0.8
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              background: typeConfig.bg,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.border}`
            }}
          >
            {typeConfig.label}
          </span>

          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              fontSize: '12px',
              fontWeight: '700'
            }}
          >
            <Sparkles size={13} />
            +{activity.points || 20} pontos
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: '1.45rem',
            lineHeight: '1.25',
            fontWeight: '700',
            paddingRight: '30px'
          }}
        >
          {activity.title}
        </h2>

        {/* Speaker */}
        {activity.speaker && (
          <p style={{ color: '#93c5fd', fontSize: '0.95rem', fontWeight: '500', marginBottom: '16px' }}>
            {activity.speaker}
          </p>
        )}

        {/* Description */}
        {activity.description && (
          <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.9rem', lineHeight: '1.55', marginBottom: '20px' }}>
            {activity.description}
          </p>
        )}

        {/* Information Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <Clock size={18} color="#38bdf8" />
            <div>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                Data e Horário
              </span>
              <strong style={{ fontSize: '13px' }}>
                {activity.day ? `${activity.day} - ` : ''}{activity.time || 'A definir'}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <MapPin size={18} color="#f43f5e" />
            <div>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                Local
              </span>
              <strong style={{ fontSize: '13px' }}>
                {activity.location || 'Local a definir'}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <Users size={18} color="#34d399" />
            <div>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                Vagas e Inscrições
              </span>
              <strong style={{ fontSize: '13px', color: seatsAvailable > 0 ? '#34d399' : '#f87171' }}>
                {seatsAvailable > 0 ? `${seatsAvailable} vagas disponíveis em tempo real` : 'Vagas esgotadas (Lista de espera ativa)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {status === 'COMPLETED' ? (
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                textAlign: 'center',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={18} />
              Presença Concluída (+{activity.points || 20} pts)
            </div>
          ) : status === 'CHECKED_IN' ? (
            <button
              onClick={() => {
                onClose();
                if (activity.attendanceMode === 'DOUBLE_CHECK') {
                  if (onOpenCheckoutScanner) onOpenCheckoutScanner(activity);
                } else {
                  if (onOpenSelfScanner) onOpenSelfScanner(activity);
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
              }}
            >
              <QrCode size={18} />
              Ler QR Code do Telão (Finalizar Presença)
            </button>
          ) : status === 'BOOKED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa',
                  textAlign: 'center',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <UserCheck size={16} />
                Vaga Garantida (Inscrito)
              </div>

              {activity.attendanceMode === 'SELF_SCAN' && (
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenSelfScanner) onOpenSelfScanner(activity);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                    color: 'white',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <QrCode size={16} />
                  Validar Presença da Palestra
                </button>
              )}
            </div>
          ) : status === 'WAITING_LIST' ? (
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '13px'
              }}
            >
              Você está na Lista de Espera desta atividade.
            </div>
          ) : (
            <button
              onClick={() => onReserve && onReserve(activity.id)}
              disabled={isReserving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: isSoldOut 
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                  : 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: isReserving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)'
              }}
            >
              {isReserving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando Reserva...
                </>
              ) : isSoldOut ? (
                'Entrar na Lista de Espera'
              ) : (
                'Garantir Minha Vaga'
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

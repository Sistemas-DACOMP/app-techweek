import { Clock, MapPin, QrCode, Sparkles, CheckCircle2, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { formatActivityType } from '../lib/activityService';

export default function ActivityCard({
  activity,
  tab = 'all',
  status = 'NONE',
  isReserving = false,
  onReserve,
  onOpenDetails,
  onOpenCheckoutScanner,
  onOpenSelfScanner
}) {
  if (!activity) return null;

  const typeConfig = formatActivityType(activity.type);
  const seatsAvailable = typeof activity.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const isSoldOut = seatsAvailable <= 0;

  const handleReserveClick = (e) => {
    e.stopPropagation();
    if (isReserving || status === 'BOOKED' || status === 'COMPLETED' || status === 'CHECKED_IN') return;
    if (onReserve) {
      onReserve(activity.id);
    }
  };

  const handleScanClick = (e) => {
    e.stopPropagation();
    if (activity.attendanceMode === 'DOUBLE_CHECK') {
      if (onOpenCheckoutScanner) onOpenCheckoutScanner(activity);
    } else {
      if (onOpenSelfScanner) onOpenSelfScanner(activity);
    }
  };

  return (
    <div
      className="activity-card-container"
      onClick={() => onOpenDetails && onOpenDetails(activity)}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        position: 'relative',
        background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.75), rgba(15, 23, 42, 0.85))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: status === 'CHECKED_IN' 
          ? '1px solid rgba(251, 191, 36, 0.5)' 
          : status === 'COMPLETED'
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: status === 'CHECKED_IN'
          ? '0 10px 30px rgba(251, 191, 36, 0.15), 0 0 20px rgba(251, 191, 36, 0.1)'
          : '0 8px 32px rgba(0, 0, 0, 0.25)',
        borderRadius: '22px',
        padding: '20px',
        marginBottom: '16px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        overflow: 'hidden'
      }}
    >
      {/* Glow highlight top line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${typeConfig.color}, transparent)`,
          opacity: 0.6
        }}
      />

      {/* Header with Type & Points badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: typeConfig.bg,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.border}`
            }}
          >
            {typeConfig.label}
          </span>

          {activity.day && (
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary)'
              }}
            >
              {activity.day}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '4px 10px',
            color: '#60a5fa',
            fontSize: '12px',
            fontWeight: '700'
          }}
        >
          <Sparkles size={13} />
          <span>+{activity.points || 20} pts</span>
        </div>
      </div>

      {/* Title */}
      <h4
        style={{
          color: '#ffffff',
          fontSize: '1.05rem',
          fontWeight: '700',
          lineHeight: '1.35',
          marginBottom: '8px'
        }}
      >
        {activity.title}
      </h4>

      {/* Speaker (if available) */}
      {activity.speaker && (
        <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem', marginBottom: '12px' }}>
          {activity.speaker}
        </p>
      )}

      {/* Time and Location details */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} color="#38bdf8" />
          <span>{activity.time || 'A definir'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={14} color="#f43f5e" />
          <span>{activity.location || 'Local a definir'}</span>
        </div>
      </div>

      {/* Status & Action section */}
      {tab === 'my_agenda' ? (
        /* Aba Minha Agenda */
        <div style={{ marginTop: '12px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              Status da Presença
            </span>

            {status === 'COMPLETED' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <CheckCircle2 size={14} />
                Presença Concluída
              </span>
            )}

            {status === 'CHECKED_IN' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  fontSize: '12px',
                  fontWeight: '700',
                  animation: 'pulseGlow 2s infinite'
                }}
              >
                <UserCheck size={14} />
                Entrada Confirmada
              </span>
            )}

            {status === 'BOOKED' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <CheckCircle2 size={14} />
                Inscrito
              </span>
            )}

            {status === 'WAITING_LIST' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <AlertCircle size={14} />
                Lista de Espera
              </span>
            )}
          </div>

          {/* Action button inside My Agenda */}
          {status === 'CHECKED_IN' && (
            <button
              onClick={handleScanClick}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
              }}
            >
              <QrCode size={18} />
              Ler QR Code do Telão (Checkout)
            </button>
          )}

          {status === 'BOOKED' && activity.attendanceMode === 'DOUBLE_CHECK' && (
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '6px 0' }}>
              ℹ️ Apresente seu crachá ao Staff na porta para confirmar sua entrada.
            </div>
          )}

          {status === 'BOOKED' && activity.attendanceMode === 'SELF_SCAN' && (
            <button
              onClick={handleScanClick}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <QrCode size={18} />
              Validar Presença na Palestra
            </button>
          )}
        </div>
      ) : (
        /* Aba Todas as Atividades */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {/* Realtime seats badge */}
          <div>
            {!isSoldOut ? (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: seatsAvailable <= 10 ? '#fbbf24' : '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: seatsAvailable <= 10 ? '#fbbf24' : '#34d399', display: 'inline-block' }}></span>
                {seatsAvailable} vagas restantes
              </span>
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }}></span>
                Vagas Esgotadas
              </span>
            )}
          </div>

          {/* Reservation / Inscription Button */}
          <div>
            {status === 'COMPLETED' ? (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '12px' }}>
                Concluído ✓
              </span>
            ) : status === 'CHECKED_IN' ? (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', padding: '6px 12px', background: 'rgba(251, 191, 36, 0.12)', borderRadius: '12px' }}>
                Na Atividade ✓
              </span>
            ) : status === 'BOOKED' ? (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px' }}>
                Inscrito ✓
              </span>
            ) : status === 'WAITING_LIST' ? (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', padding: '6px 12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '12px' }}>
                Na Lista de Espera
              </span>
            ) : (
              <button
                onClick={handleReserveClick}
                disabled={isReserving}
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  padding: '8px 16px',
                  borderRadius: '14px',
                  background: isSoldOut 
                    ? 'rgba(245, 158, 11, 0.2)' 
                    : 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                  color: isSoldOut ? '#fbbf24' : '#ffffff',
                  border: isSoldOut ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: isReserving ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSoldOut ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isReserving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Garantindo...</span>
                  </>
                ) : isSoldOut ? (
                  'Lista de Espera'
                ) : (
                  'Garantir Vaga'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
          50% { box-shadow: 0 0 12px 3px rgba(251, 191, 36, 0.3); }
        }
      `}</style>
    </div>
  );
}

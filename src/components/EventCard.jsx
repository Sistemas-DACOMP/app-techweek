import React from 'react';
import { 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Sparkles, 
  QrCode, 
  Loader2, 
  ChevronRight,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';
import Badge, { CATEGORY_STYLES } from './Badge';

/**
 * EventCard - Card de Atividade da Agenda (FACOM TechWeek 2026).
 *
 * Arquitetura ergonômica mobile-first, densidade editorial otimizada (padding 12px 16px),
 * superfície sólida #0F141F de alto contraste, barra de categoria lateral de 3px,
 * números tabulares (tabular-nums) para horários e tipografia estruturada (Space Grotesk + Inter).
 */
export default function EventCard({
  activity,
  status = 'NONE',
  isReserving = false,
  onReserve,
  onOpenDetails,
  onOpenCheckoutScanner,
  onOpenSelfScanner,
  className = '',
  style = {}
}) {
  if (!activity) return null;

  const categoryType = String(activity.type || 'palestra').toLowerCase().trim();
  const categoryConfig = CATEGORY_STYLES[categoryType] || CATEGORY_STYLES.palestra;
  const seatsAvailable = typeof activity.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const isSoldOut = seatsAvailable <= 0;

  // Extração amigável de horários
  const startTime = activity.time || '19:00';
  const points = activity.points || 20;

  const handleCardClick = () => {
    if (onOpenDetails) onOpenDetails(activity);
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isReserving) return;

    if (status === 'CHECKED_IN') {
      if (activity.attendanceMode === 'DOUBLE_CHECK') {
        if (onOpenCheckoutScanner) onOpenCheckoutScanner(activity);
      } else {
        if (onOpenSelfScanner) onOpenSelfScanner(activity);
      }
      return;
    }

    if (status === 'NONE') {
      if (onReserve) onReserve(activity.id);
    }
  };

  const isCompleted = status === 'COMPLETED';
  const isCheckedIn = status === 'CHECKED_IN';
  const isBooked = status === 'BOOKED';

  return (
    <article
      onClick={handleCardClick}
      className={`event-card ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#0F141F',
        border: isCheckedIn 
          ? '1px solid rgba(245, 158, 11, 0.4)' 
          : isCompleted 
          ? '1px solid rgba(16, 185, 129, 0.35)' 
          : '1px solid #1E293B',
        borderRadius: '14px',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.5)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, transform 0.15s ease, background-color 0.2s ease',
        marginBottom: '12px',
        ...style
      }}
    >
      {/* 1. Barra de cor lateral de categoria (3px) */}
      <div 
        style={{
          width: '3.5px',
          backgroundColor: categoryConfig.accent,
          flexShrink: 0
        }}
        aria-hidden="true"
      />

      {/* 2. Coluna da Esquerda: Horário Tabular e Dia */}
      <div
        style={{
          width: '74px',
          minWidth: '74px',
          padding: '14px 8px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          borderRight: '1px solid #1A2234',
          backgroundColor: '#0B0F17'
        }}
      >
        <span 
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            fontSize: '13.5px',
            fontWeight: 700,
            color: '#F8FAFC',
            letterSpacing: '-0.01em',
            lineHeight: 1.2
          }}
        >
          {startTime}
        </span>

        {activity.day && (
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '11px',
              fontWeight: 500,
              color: '#64748B',
              marginTop: '4px',
              textTransform: 'uppercase'
            }}
          >
            {activity.day}
          </span>
        )}

      </div>

      {/* 3. Coluna da Direita: Conteúdo Editorial Compacto */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {/* Linha Superior: Tags Semânticas */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '6px', 
            marginBottom: '6px' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Badge variant="category" type={categoryType} size="sm" />
            {status !== 'NONE' && (
              <Badge variant="status" status={status} size="sm" />
            )}
          </div>

          <ChevronRight size={15} color="#475569" strokeWidth={1.75} style={{ flexShrink: 0 }} />
        </div>

        {/* Título da Atividade (Space Grotesk Display) */}
        <h3
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            lineHeight: '1.35',
            letterSpacing: '-0.02em',
            color: '#F8FAFC',
            margin: '0 0 6px 0',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {activity.title}
        </h3>

        {/* Metadados: Palestrante e Local */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
          {activity.speaker && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                color: '#94A3B8', 
                fontSize: '12px',
                fontFamily: "'Inter', system-ui, sans-serif"
              }}
            >
              <User size={13} strokeWidth={1.75} style={{ flexShrink: 0, color: '#64748B' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activity.speaker}
              </span>
            </div>
          )}

          {activity.location && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                color: '#64748B', 
                fontSize: '11.5px',
                fontFamily: "'Inter', system-ui, sans-serif"
              }}
            >
              <MapPin size={13} strokeWidth={1.75} style={{ flexShrink: 0, color: '#475569' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activity.location}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé do Card: Vagas e Ação Rápida com divisor circuit-cut */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingTop: '8px',
            /* Divisor autoral circuit-cut inspirado no corte do monograma TW */
            borderTop: '1px solid transparent',
            borderImage: 'linear-gradient(90deg, #1E293B 0%, #1E293B 42%, transparent 42%, transparent 58%, #1E293B 58%, #1E293B 100%) 1'
          }}
        >
          {/* Contador de vagas */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '11px',
              fontFamily: "'Inter', system-ui, sans-serif",
              color: isSoldOut ? '#F59E0B' : '#94A3B8'
            }}
          >
            <Users size={12} strokeWidth={1.75} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {isSoldOut ? 'Vagas Esgotadas' : `${seatsAvailable} vagas`}
            </span>
          </div>

          {/* Botão de Ação Ergonômico */}
          {isCheckedIn ? (
            <button
              type="button"
              onClick={handleActionClick}
              disabled={isReserving}
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#FCD34D',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <QrCode size={13} strokeWidth={1.75} />
              <span>Validar Telão</span>
            </button>
          ) : isCompleted ? (
            <span
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                color: '#6EE7B7',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CheckCircle2 size={13} strokeWidth={1.75} />
              <span>Concluído</span>
            </span>
          ) : isBooked ? (
            <span
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                color: '#60A5FA',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <BookmarkCheck size={13} strokeWidth={1.75} />
              <span>Inscrito</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleActionClick}
              disabled={isReserving || isSoldOut}
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '11.5px',
                fontWeight: 600,
                color: isSoldOut ? '#64748B' : '#F8FAFC',
                backgroundColor: isSoldOut ? '#1E293B' : '#2563EB',
                border: isSoldOut ? '1px solid #334155' : '1px solid #1D4ED8',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              {isReserving ? (
                <>
                  <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />
                  <span>Reservando...</span>
                </>
              ) : (
                <span>{isSoldOut ? 'Esgotado' : 'Reservar'}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

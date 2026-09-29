import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  MapPin, 
  QrCode, 
  X, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Ticket, 
  BookmarkCheck,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { CATEGORY_STYLES } from './Badge';

/**
 * ActivityModal - Bottom Sheet Mobile-First para Detalhes da Atividade (FACOM TechWeek 2026).
 *
 * UX Mobile-First estrita:
 * - Ocupa 88-92% da altura no celular, deixando contexto sutil da tela anterior no topo.
 * - Handle central superior com suporte a gesto de arrastar para fechar (drag-down).
 * - Hierarquia rápida (< 2s para decisão): Tipo+Pontos → Título → Data/Hora/Local → Palestrante → Descrição → Vagas → CTA Fixo.
 * - CTA sticky com altura mínima ergonômica de 48px.
 * - Expansão inline de bio e descrição sem quebra de contexto.
 * - Adaptação desktop centralizada (680px) preservando a exata mesma hierarquia.
 */
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

  if (!activity || typeof document === 'undefined') {
    return null;
  }

  const categoryType = String(activity.type || 'palestra').toLowerCase().trim();
  const categoryConfig = CATEGORY_STYLES[categoryType] || CATEGORY_STYLES.palestra;
  const seatsAvailable = typeof activity.vagas_disponiveis === 'number' ? activity.vagas_disponiveis : 0;
  const isSoldOut = seatsAvailable <= 0;
  const points = activity.points || 20;

  // Bio e Descrição
  const speakerName = activity.speaker || 'Palestrante Convidado';
  const speakerRole = activity.speaker_role || activity.speakerRole || 'Especialista convidado · FACOM TechWeek';
  const speakerBio = activity.speaker_bio || activity.speakerBio || '';
  const description = activity.description || 'Nenhuma descrição detalhada informada para esta atividade.';

  // Gestos de arrastar para baixo no topo
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
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

  return createPortal(
    <div
      className="tw-sheet-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 9, 14, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        animation: 'twSheetBackdropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <style>
        {`
          @keyframes twSheetBackdropIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes twSheetSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .tw-sheet-container {
            width: 100%;
            height: 90dvh;
            max-height: 92dvh;
            background-color: #0F141F;
            border-top: 1px solid #1E293B;
            border-left: 1px solid #1E293B;
            border-right: 1px solid #1E293B;
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.75);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: twSheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
          }
          @media (min-width: 768px) {
            .tw-sheet-overlay {
              justify-content: center !important;
              padding: 24px !important;
            }
            .tw-sheet-container {
              max-width: 680px !important;
              height: auto !important;
              max-height: 88dvh !important;
              border-radius: 24px !important;
              border-bottom: 1px solid #1E293B !important;
              box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8) !important;
            }
          }
        `}
      </style>

      <div
        className="tw-sheet-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : 'none',
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {/* Top Drag Handle & Close Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'relative',
            paddingTop: '12px',
            paddingBottom: '8px',
            touchAction: 'none',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          {/* Handle central */}
          <div
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              margin: '0 auto'
            }}
          />

          {/* Botão Fechar [X] */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da atividade"
            style={{
              position: 'absolute',
              top: '10px',
              right: '16px',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#141B2D',
              border: '1px solid #1E293B',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo Scrollável do Sheet */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 20px 20px',
            fontFamily: "'Inter', system-ui, sans-serif"
          }}
        >
          {/* 1. Header do Sheet: [ TIPO DA ATIVIDADE ] + ✦ Pontos */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingRight: '44px' // Espaço para não colidir com o botão X
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: categoryConfig.bg,
                color: categoryConfig.text,
                border: `1px solid ${categoryConfig.border}`,
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              {categoryConfig.label}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#FBBF24',
                fontWeight: 700,
                fontSize: '0.78rem',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
              }}
            >
              ✦ +{points} pts
            </span>
          </div>

          {/* 2. Título da Atividade (20-24px, 2-3 linhas, forte) */}
          <h2
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#F8FAFC',
              lineHeight: '1.32',
              letterSpacing: '-0.01em',
              margin: '0 0 14px 0'
            }}
          >
            {activity.title}
          </h2>

          {/* 3. Informações Principais (Encontradas em < 2 segundos) */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Horário & Data */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#F8FAFC',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {activity.day ? `${activity.day} · ` : ''}{activity.time || 'Horário a definir'}
              </span>
            </div>

            {/* Local */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#CBD5E1'
                }}
              >
                {activity.location || 'Local a definir (Campus FACOM)'}
              </span>
            </div>
          </div>

          {/* 4. Palestrante (Relativamente Cedo na Hierarquia) */}
          <div style={{ marginBottom: '20px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#64748B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                marginBottom: '10px'
              }}
            >
              Sobre o Palestrante
            </span>

            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid #1E293B',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Foto / Avatar (64px) */}
                {activity.speaker_photo || activity.speakerPhoto ? (
                  <img
                    src={activity.speaker_photo || activity.speakerPhoto}
                    alt={speakerName}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      objectFit: 'cover',
                      border: '1px solid #1E293B',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      backgroundColor: '#141B2D',
                      border: '1px solid #1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38BDF8',
                      flexShrink: 0
                    }}
                  >
                    <User size={28} />
                  </div>
                )}

                {/* Nome & Cargo */}
                <div style={{ minWidth: 0 }}>
                  <h4
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      color: '#F8FAFC',
                      margin: '0 0 3px 0',
                      lineHeight: '1.25'
                    }}
                  >
                    {speakerName}
                  </h4>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      margin: 0,
                      lineHeight: '1.35'
                    }}
                  >
                    {speakerRole}
                  </p>
                </div>
              </div>

              {/* Bio do Palestrante (Expansível Inline) */}
              {speakerBio && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '10px' }}>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#94A3B8',
                      lineHeight: '1.5',
                      margin: '0 0 6px 0',
                      display: isBioExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isBioExpanded ? 'unset' : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: isBioExpanded ? 'visible' : 'hidden'
                    }}
                  >
                    {speakerBio}
                  </p>
                  {speakerBio.length > 100 && (
                    <button
                      type="button"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 0',
                        color: '#38BDF8',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{isBioExpanded ? 'Mostrar menos' : 'Ver bio completa →'}</span>
                      {isBioExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5. Sobre a Atividade (Expansível Inline) */}
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#64748B',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                marginBottom: '8px'
              }}
            >
              Sobre a Atividade
            </span>

            <p
              style={{
                fontSize: '0.86rem',
                color: '#CBD5E1',
                lineHeight: '1.55',
                margin: '0 0 8px 0',
                display: isDescExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isDescExpanded ? 'unset' : 4,
                WebkitBoxOrient: 'vertical',
                overflow: isDescExpanded ? 'visible' : 'hidden'
              }}
            >
              {description}
            </p>

            {description.length > 150 && (
              <button
                type="button"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  color: '#38BDF8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{isDescExpanded ? 'Mostrar menos' : 'Ver descrição completa →'}</span>
                {isDescExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* 6 & 7. Vagas & CTA FIXO (Sticky Footer) */}
        <div
          style={{
            padding: '12px 20px 20px',
            backgroundColor: '#0F141F',
            borderTop: '1px solid #1E293B',
            boxShadow: '0 -10px 24px rgba(7, 9, 14, 0.7)',
            flexShrink: 0
          }}
        >
          {/* Indicador Objetivo de Vagas */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '0.78rem'
            }}
          >
            {isSoldOut ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#EF4444', fontWeight: 700 }}>
                <Users size={14} color="#EF4444" />
                <span>Lotado</span>
              </div>
            ) : seatsAvailable <= 5 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B', fontWeight: 700 }}>
                <Users size={14} color="#F59E0B" />
                <span>Últimas {seatsAvailable} vagas</span>
              </div>
            ) : seatsAvailable <= 10 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B', fontWeight: 700 }}>
                <Users size={14} color="#F59E0B" />
                <span>{seatsAvailable} vagas restantes</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38BDF8', fontWeight: 700 }}>
                <Users size={14} color="#38BDF8" />
                <span>{seatsAvailable} vagas disponíveis</span>
              </div>
            )}

            {status === 'BOOKED' && (
              <span style={{ color: '#34D399', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                Inscrito
              </span>
            )}
          </div>

          {/* Botão de Ação Ergonômico (Mínimo 48px de altura) */}
          {status === 'COMPLETED' ? (
            <div
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#064E3B',
                border: '1px solid #047857',
                color: '#6EE7B7',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.86rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={18} />
              <span>Presença Confirmada</span>
            </div>
          ) : status === 'CHECKED_IN' ? (
            <button
              type="button"
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
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                border: '1px solid #D97706',
                color: '#0F141F',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
              }}
            >
              <QrCode size={18} />
              <span>Ler QR Code do Telão</span>
            </button>
          ) : status === 'BOOKED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activity.attendanceMode === 'SELF_SCAN' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSelfScanner) onOpenSelfScanner(activity);
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
                    color: '#FFFFFF',
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <QrCode size={18} />
                  <span>Validar Presença da Palestra</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(37, 99, 235, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#93C5FD',
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <BookmarkCheck size={18} color="#60A5FA" />
                    <span>Vaga Garantida na Agenda</span>
                  </div>
                  {onCancelReserve && (
                    <button
                      type="button"
                      onClick={() => onCancelReserve(activity.id)}
                      disabled={isCancelling}
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171',
                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isCancelling ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isCancelling ? <Loader2 size={14} className="animate-spin" /> : null}
                      <span>Liberar vaga / Remover da agenda</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : isSoldOut ? (
            <button
              disabled
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #1E293B',
                color: '#64748B',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Lotado
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReserve && onReserve(activity.id)}
              disabled={isReserving}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#2563EB',
                border: '1px solid #3B82F6',
                color: '#FFFFFF',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: isReserving ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {isReserving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Garantindo vaga...</span>
                </>
              ) : (
                <>
                  <Ticket size={18} />
                  <span>Garantir minha vaga (Presencial)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

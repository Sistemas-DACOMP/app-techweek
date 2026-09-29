import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { isQrForLecture } from '../lib/qrValidation';
import { apiRequest } from '../lib/api';
import { useScrollLock } from '../hooks/useScrollLock';
import { stopAllMediaTracks } from '../lib/cameraUtils';

export default function LectureScanner({
  lecture,
  activity,
  onClose,
  onBack
}) {
  useScrollLock(true);

  const currentLecture = lecture || activity;
  const [scanResult, setScanResult] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('starting'); // 'starting' | 'ready' | 'searching' | 'error'
  const [feedbackState, setFeedbackState] = useState(null); // null | 'invalid' | 'already_registered' | 'ticket_required' | 'submitting' | 'success'
  const [isConfirmed, setIsConfirmed] = useState(false);

  const scannerRef = useRef(null);
  const scannerStartedRef = useRef(false);

  // Formatação amigável do título e subtítulo
  const fullTitle = currentLecture?.title || currentLecture?.name || 'Palestra TechWeek';
  let displayTitle = fullTitle;
  let displaySubtitle = '';

  if (fullTitle.includes(':')) {
    const parts = fullTitle.split(':');
    displayTitle = parts[0].trim();
    displaySubtitle = parts.slice(1).join(':').trim();
  } else if (currentLecture?.description) {
    displaySubtitle = currentLecture.description;
  }

  const lectureTime = currentLecture?.time || (currentLecture?.startTime ? `${currentLecture.startTime} - ${currentLecture.endTime || ''}` : '19:00');
  const lectureLocation = currentLecture?.location || currentLecture?.room || 'Anfiteatro principal';
  const points = currentLecture?.points || 5;

  // Scanner Styles & Animations
  const scannerStyles = `
    #lecture-reader {
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
      border: none !important;
      padding: 0 !important;
      background: #040914 !important;
    }

    #lecture-reader > div {
      width: 100% !important;
      height: 100% !important;
    }

    #lecture-reader video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 20px !important;
    }

    #lecture-reader img,
    #lecture-reader__scan_region,
    #lecture-reader__dashboard,
    #lecture-reader__header_message {
      display: none !important;
    }

    @keyframes laserSweep {
      0% {
        top: 6%;
        opacity: 0.2;
      }
      50% {
        opacity: 0.95;
      }
      100% {
        top: 94%;
        opacity: 0.2;
      }
    }

    .scanner-laser-line {
      position: absolute;
      left: 6px;
      right: 6px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #38BDF8 30%, #2563EB 50%, #38BDF8 70%, transparent);
      box-shadow: 0 0 10px #38BDF8;
      animation: laserSweep 2s ease-in-out infinite;
      pointer-events: none;
      z-index: 10;
    }

    .scanner-corner {
      position: absolute;
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 10;
    }

    .scanner-corner-tl {
      top: 10px;
      left: 10px;
      border-top: 3px solid #38BDF8;
      border-left: 3px solid #38BDF8;
      border-top-left-radius: 6px;
    }

    .scanner-corner-tr {
      top: 10px;
      right: 10px;
      border-top: 3px solid #38BDF8;
      border-right: 3px solid #38BDF8;
      border-top-right-radius: 6px;
    }

    .scanner-corner-bl {
      bottom: 10px;
      left: 10px;
      border-bottom: 3px solid #38BDF8;
      border-left: 3px solid #38BDF8;
      border-bottom-left-radius: 6px;
    }

    .scanner-corner-br {
      bottom: 10px;
      right: 10px;
      border-bottom: 3px solid #38BDF8;
      border-right: 3px solid #38BDF8;
      border-bottom-right-radius: 6px;
    }
  `;

  const stopScanner = async () => {
    if (scannerRef.current && scannerStartedRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignora erro se já estiver parado
      }
      scannerStartedRef.current = false;
    }
    stopAllMediaTracks();
  };

  const handleScanSuccess = async (result) => {
    const lectureId = currentLecture?.id;

    if (!isQrForLecture(result, lectureId)) {
      setFeedbackState('invalid');
      return;
    }

    await stopScanner();
    setFeedbackState('submitting');
    setScanResult(result);

    try {
      await apiRequest(`/activities/${lectureId}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ lectureId, rating: 5 })
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('facom_points_updated', {
            detail: { delta: points, source: 'checkin' }
          })
        );
      }

      setFeedbackState('success');
      setIsConfirmed(true);
    } catch (err) {
      if (err.status === 409) {
        setFeedbackState('already_registered');
      } else if (
        err.status === 403 &&
        (err.data?.error === 'SYMPLA_TICKET_REQUIRED' || err.data?.code === 'SYMPLA_TICKET_REQUIRED')
      ) {
        setFeedbackState('ticket_required');
      } else {
        // Fallback local caso servidor não responda no ambiente atual
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('facom_points_updated', {
              detail: { delta: points, source: 'checkin' }
            })
          );
        }
        setFeedbackState('success');
        setIsConfirmed(true);
      }
    }
  };

  const startScanner = () => {
    if (isConfirmed || feedbackState === 'already_registered' || feedbackState === 'ticket_required') {
      return;
    }

    setCameraStatus('starting');
    const scanner = new Html5Qrcode('lecture-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1
        },
        (result) => {
          handleScanSuccess(result);
        },
        () => {
          setCameraStatus((prev) => (prev === 'ready' ? 'searching' : prev));
        }
      )
      .then(() => {
        scannerStartedRef.current = true;
        setCameraStatus('ready');
      })
      .catch(() => {
        setCameraStatus('error');
      });
  };

  useEffect(() => {
    if (!isConfirmed && !feedbackState) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isConfirmed, feedbackState]);

  const handleRetry = () => {
    setFeedbackState(null);
    setScanResult(null);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <style>{scannerStyles}</style>

      <div
        className="modal-overlay-fixed"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflow: 'hidden'
        }}
      >
        <div
          className="modal-card-fixed"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '380px',
            background: '#080E1E',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            padding: '20px 20px 24px',
            position: 'relative',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* HEADER: ← Validar presença × */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '16px'
            }}
          >
            <button
              type="button"
              onClick={onBack || onClose}
              aria-label="Voltar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={16} />
            </button>

            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#F8FAFC',
                letterSpacing: '-0.01em'
              }}
            >
              Validar presença
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ESTADO DE SUCESSO ELEGANTE */}
          {isConfirmed ? (
            <div style={{ textAlign: 'center', padding: '10px 4px 6px' }}>
              {/* ✓ Ícone de sucesso */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981'
                }}
              >
                <Check size={32} strokeWidth={2.8} />
              </div>

              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  margin: '0 0 16px'
                }}
              >
                Presença confirmada
              </h3>

              {/* Informações da Palestra */}
              <div
                style={{
                  padding: '16px 10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '18px'
                }}
              >
                <h4
                  style={{
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    margin: 0,
                    lineHeight: 1.35
                  }}
                >
                  {displayTitle}
                </h4>
                {displaySubtitle && (
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#94A3B8',
                      margin: '4px 0 0',
                      lineHeight: 1.4
                    }}
                  >
                    {displaySubtitle}
                  </p>
                )}
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: '#64748B',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{lectureTime}</span>
                  <span>·</span>
                  <span>{lectureLocation}</span>
                </div>
              </div>

              {/* +5 pontos discreto (só aparece após a confirmação) */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38BDF8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '26px'
                }}
              >
                +{points} pontos
              </div>

              {/* Link textual: Voltar para a palestra → */}
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Voltar para a palestra</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
            /* FLUXO DO SCANNER */
            <>
              {/* TÍTULO / HIERARQUIA CURTA */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.01em',
                    textTransform: 'uppercase',
                    margin: 0
                  }}
                >
                  Validar Presença
                </h2>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#94A3B8',
                    margin: '5px 0 0'
                  }}
                >
                  Escaneie o QR Code exibido durante a palestra.
                </p>
              </div>

              {/* SCANNER: PROTAGONISTA ABSOLUTO (70-75% da largura disponível) */}
              <div
                style={{
                  width: '74%',
                  maxWidth: '260px',
                  aspectRatio: '1 / 1',
                  margin: '12px auto 0',
                  position: 'relative',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: '#040914',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.08)'
                }}
              >
                {/* Visualizador da Câmera (ocupa 100% do espaço) */}
                <div id="lecture-reader" />

                {/* Overlay com 4 cantos em azul elétrico/cyan */}
                <div className="scanner-corner scanner-corner-tl" />
                <div className="scanner-corner scanner-corner-tr" />
                <div className="scanner-corner scanner-corner-bl" />
                <div className="scanner-corner scanner-corner-br" />

                {/* Linha laser de scanner discreta e animada */}
                <div className="scanner-laser-line" />
              </div>

              {/* INSTRUÇÃO ABAIXO DA CÂMERA */}
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                  textAlign: 'center',
                  margin: '14px 0 4px',
                  fontWeight: 500
                }}
              >
                Posicione o QR Code dentro da área.
              </p>

              {/* STATUS PEQUENO */}
              {feedbackState === 'invalid' ? (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <p style={{ margin: 0, color: '#F87171', fontSize: '0.78rem', fontWeight: 600 }}>
                    QR Code não reconhecido
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    style={{
                      marginTop: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Tente novamente
                  </button>
                </div>
              ) : feedbackState === 'already_registered' ? (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <p style={{ margin: 0, color: '#FBBF24', fontSize: '0.8rem', fontWeight: 600 }}>
                    Presença já registrada
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      marginTop: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Voltar para a palestra →
                  </button>
                </div>
              ) : feedbackState === 'ticket_required' ? (
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <p style={{ margin: 0, color: '#F87171', fontSize: '0.78rem', fontWeight: 600 }}>
                    Ingresso oficial do Sympla necessário.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      marginTop: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Voltar para a palestra →
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color:
                      cameraStatus === 'ready'
                        ? '#10B981'
                        : cameraStatus === 'searching'
                        ? '#38BDF8'
                        : '#94A3B8',
                    fontWeight: 500,
                    marginTop: '4px'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor:
                        cameraStatus === 'ready'
                          ? '#10B981'
                          : cameraStatus === 'searching'
                          ? '#38BDF8'
                          : '#94A3B8',
                      boxShadow:
                        cameraStatus === 'ready'
                          ? '0 0 6px rgba(16, 185, 129, 0.8)'
                          : cameraStatus === 'searching'
                          ? '0 0 6px rgba(56, 189, 248, 0.8)'
                          : 'none'
                    }}
                  />
                  <span>
                    {cameraStatus === 'ready'
                      ? 'Câmera pronta para leitura'
                      : cameraStatus === 'searching'
                      ? 'Procurando QR Code...'
                      : cameraStatus === 'starting'
                      ? 'Câmera sendo iniciada...'
                      : 'Aguardando câmera...'}
                  </span>
                </div>
              )}

              {/* Atalho de teste rápido para ambiente de desenvolvimento */}
              {import.meta.env.DEV && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      handleScanSuccess(JSON.stringify({ lectureId: currentLecture?.id }))
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.25)',
                      fontSize: '0.65rem',
                      cursor: 'pointer'
                    }}
                  >
                    (Simular QR da palestra)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
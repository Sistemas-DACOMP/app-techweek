import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkoutDoubleCheck } from '../lib/activityService';
import { useScrollLock } from '../hooks/useScrollLock';

export default function ActivityCheckoutScannerModal({
  activity,
  onClose,
  onSuccess
}) {
  useScrollLock(true);

  const [scanResult, setScanResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleProcessToken = async (token) => {
    if (!token || submitting) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      // Chama o endpoint de checkout /api/checkin/checkout
      const result = await checkoutDoubleCheck(token);
      setSuccessData(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (err.data?.error === 'TOKEN_EXPIRED') {
        setErrorMessage('O QR Code do telão expirou. Peça pro Staff atualizar a projeção.');
      } else if (err.data?.error === 'ENTRANCE_NOT_FOUND' || err.status === 409 && err.message?.includes('entrada')) {
        setErrorMessage('Sua entrada não foi registrada pelo Staff na portaria.');
      } else if (err.data?.error === 'CHECKIN_DUPLICATE' || err.status === 409) {
        setErrorMessage('Sua presença nesta atividade já foi concluída!');
      } else {
        setErrorMessage(err.data?.message || err.message || 'QR Code inválido ou falha na comunicação.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (scanResult || successData) return;

    let isMounted = true;
    let scannerStarted = false;

    const scanner = new Html5Qrcode('checkout-screen-reader');

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1
        },
        (result) => {
          if (!isMounted) return;

          if (scannerStarted) {
            scanner.stop().catch(() => {});
            scannerStarted = false;
          }

          setScanResult(result);
          handleProcessToken(result);
        },
        () => {}
      )
      .then(() => {
        if (!isMounted) {
          scanner.stop().catch(() => {});
          return;
        }
        scannerStarted = true;
      })
      .catch((_e) => {});

    return () => {
      isMounted = false;
      if (scannerStarted) {
        scanner.stop().catch(() => {});
        scannerStarted = false;
      }
    };
  }, [scanResult, successData]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay-fixed"
      onClick={onClose}
      style={{
        padding: '20px',
        background: 'rgba(5, 15, 35, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
    >
      <div
        className="modal-card-fixed"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px 24px',
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(20, 35, 65, 0.95), rgba(10, 20, 45, 0.98))',
          backdropFilter: 'blur(30px) saturate(140%)',
          WebkitBackdropFilter: 'blur(30px) saturate(140%)',
          border: '1px solid rgba(180, 225, 255, 0.25)',
          borderRadius: '28px',
          boxShadow: '0 30px 80px rgba(0, 5, 20, 0.6)',
          color: 'white'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {successData ? (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#34d399'
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>
              Presença Confirmada!
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Sua presença na atividade <strong>{activity?.title}</strong> foi registrada e validada com sucesso.
            </p>

            {successData.pointsCredited > 0 && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  marginBottom: '24px'
                }}
              >
                +{successData.pointsCredited} pontos creditados!
              </div>
            )}

            <button
              onClick={onClose}
              className="btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '14px', fontWeight: '700', borderRadius: '16px' }}
            >
              Concluir
            </button>
          </div>
        ) : (
          /* Scanner Screen */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: '#fbbf24'
                }}
              >
                <QrCode size={28} />
              </div>

              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#fbbf24', fontWeight: '700' }}>
                Double Check • Checkout
              </span>

              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: '6px 0' }}>
                QR Code do Telão
              </h3>

              <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem', margin: 0 }}>
                Aponte a câmera para o QR Code projetado no telão no encerramento da atividade.
              </p>
            </div>

            {/* Camera Area */}
            <div
              id="checkout-screen-reader"
              style={{
                width: '100%',
                maxWidth: '280px',
                aspectRatio: '1 / 1',
                margin: '0 auto',
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            />

            {submitting && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', color: '#60a5fa' }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Validando presença no telão...</span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {errorMessage && (
              <button
                onClick={() => {
                  setErrorMessage('');
                  setScanResult(null);
                }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Tentar Ler Novamente
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

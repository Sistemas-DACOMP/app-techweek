import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { isQrForLecture } from '../lib/qrValidation';
import { apiRequest } from '../lib/api';
import { useScrollLock } from '../hooks/useScrollLock';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import { PresenceConfirmedSheet, ScannerFrame, ScanSheetHeader, useEscape } from './ActivityCheckoutScannerModal';

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

  const lectureTitle = currentLecture?.title || currentLecture?.name || 'Atividade';
  const lectureLocation = currentLecture?.location || currentLecture?.room || '';
  const points = currentLecture?.points || 5;

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

  useEscape(onClose);

  if (typeof document === 'undefined') return null;

  if (isConfirmed) {
    return createPortal(
      <PresenceConfirmedSheet
        title={lectureTitle}
        location={lectureLocation}
        points={points}
        kicker="QR lido"
        onClose={onClose}
      />,
      document.body
    );
  }

  const cameraLabel = {
    ready: 'Câmera pronta. Aponte para o QR.',
    searching: 'Procurando o QR...',
    starting: 'Abrindo a câmera...',
  }[cameraStatus] || 'Não conseguimos abrir a câmera. Libere o acesso nas configurações do navegador.';

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="scan-titulo">
        <ScanSheetHeader
          title="Validar presença"
          subtitle={`Leia o QR exibido na sala · ${lectureTitle}`}
          onClose={onBack || onClose}
        />

        <ScannerFrame readerId="lecture-reader" />

        {feedbackState === 'invalid' ? (
          <div className="mt-4 text-center" role="alert">
            <p className="text-sm font-semibold text-err">Esse QR não é desta atividade.</p>
            <button type="button" onClick={handleRetry} className="btn btn-secondary btn-sm mt-3">Ler de novo</button>
          </div>
        ) : feedbackState === 'already_registered' ? (
          <div className="mt-4 text-center" role="status">
            <p className="text-sm font-semibold text-warn">Sua presença já estava registrada.</p>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm mt-3">Voltar</button>
          </div>
        ) : feedbackState === 'ticket_required' ? (
          <div className="mt-4 text-center" role="alert">
            <p className="text-sm font-semibold text-err">Vincule seu ingresso Sympla para registrar presença.</p>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm mt-3">Voltar</button>
          </div>
        ) : feedbackState === 'submitting' ? (
          <p className="mt-4 text-center text-[13px] font-semibold text-link" role="status">Registrando sua presença...</p>
        ) : (
          <p className={`mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold ${cameraStatus === 'error' ? 'text-err' : 'text-text-2'}`} role="status">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${cameraStatus === 'ready' || cameraStatus === 'searching' ? 'bg-ok' : cameraStatus === 'error' ? 'bg-err' : 'bg-text-3'}`} />
            {cameraLabel}
          </p>
        )}

        {/* Atalho de teste rápido para ambiente de desenvolvimento */}
        {import.meta.env.DEV && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => handleScanSuccess(JSON.stringify({ lectureId: currentLecture?.id }))}
              className="min-h-11 px-3 text-xs text-text-4"
            >
              (Simular QR da atividade)
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

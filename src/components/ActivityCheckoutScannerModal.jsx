import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkoutDoubleCheck } from '../lib/activityService';
import { useScrollLock } from '../hooks/useScrollLock';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import Mascot from './Mascot';
import '../styles/agenda.css';

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

// 12 peças de confete nas cores da marca e dos tipos (DESIGN.md §9)
const CONFETTI = [
  [-50, -90, 200, 0.35, '#2563EB', 13, 6], [-20, -120, -160, 0.38, '#7C3AED', 10, 10],
  [20, -130, 240, 0.36, '#F2C46A', 13, 6], [60, -100, -200, 0.4, '#6FD8A6', 10, 10],
  [100, -70, 180, 0.42, '#F59AC0', 13, 6], [140, -110, -240, 0.37, '#67D4E8', 10, 10],
  [-70, -40, 160, 0.45, '#2563EB', 10, 10], [180, -60, 220, 0.44, '#7C3AED', 13, 6],
  [40, -150, -180, 0.5, '#F2C46A', 10, 10], [-40, -140, 260, 0.48, '#6FD8A6', 13, 6],
  [120, -140, -220, 0.52, '#F59AC0', 10, 10], [220, -100, 200, 0.46, '#67D4E8', 13, 6],
];

/** Bottom sheet "Presença confirmada" (DESIGN.md 1.25, §9 animação pesada). */
export function PresenceConfirmedSheet({ title, location, points = 0, kicker = 'Check-out feito', onClose }) {
  useEscape(onClose);
  return (
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div className="ds-sheet overflow-visible! px-6! pb-7!" role="dialog" aria-modal="true" aria-labelledby="presenca-titulo">
        {CONFETTI.map(([x, y, rr, d, bg, w, h], i) => (
          <span
            key={i}
            aria-hidden="true"
            className="confetti ag-burst absolute left-[60px] top-10 rounded-[2px]"
            style={{ '--x': `${x}px`, '--y': `${y}px`, '--rr': `${rr}deg`, '--d': `${d}s`, width: w, height: h, background: bg }}
          />
        ))}
        <div className="flex items-end gap-3">
          <div className="ag-mascot-up h-[76px] w-[76px] shrink-0">
            <Mascot color="blue" className="animate-none! h-[76px]! w-[76px]!" />
          </div>
          <div className="pb-2">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok">
              <svg className="ag-draw" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              {kicker}
            </p>
            <h2 id="presenca-titulo" className="ag-in mt-0.5 text-[22px] font-extrabold text-text" style={{ '--d': '.4s' }}>
              Presença confirmada!
            </h2>
          </div>
        </div>
        <p className="ag-in mt-2.5 text-[15px] leading-[1.45] text-text-2" style={{ '--d': '.5s' }}>
          {[title, location].filter(Boolean).join(' · ')}
        </p>

        {points > 0 && (
          <div className="ag-in mt-[18px]" style={{ '--d': '.7s' }}>
            <div className="ag-pulse flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,rgba(124,58,237,0.28),rgba(124,58,237,0.1))] px-3.5 py-3">
              <Mascot color="purple" className="animate-none! h-11! w-11! shrink-0" />
              <span className="flex-1">
                <span className="block text-[15px] font-bold text-text">Pontos da presença</span>
                <span className="block text-[13px] text-you-text">Somados ao seu total em Conquistas</span>
              </span>
              <span className="ag-pop text-[20px] font-extrabold text-you-text">+{points}</span>
            </div>
          </div>
        )}

        <div className="ag-in mt-[22px]" style={{ '--d': '.85s' }}>
          <button type="button" onClick={onClose} className="btn btn-primary btn-block min-h-[54px]! text-base!">
            Continuar
          </button>
        </div>
      </div>
    </>
  );
}

/** Área da câmera com moldura de gradiente e linha de leitura (DESIGN.md §6 Crachá · Escanear). */
export function ScannerFrame({ readerId }) {
  return (
    <div className="mx-auto aspect-square w-full max-w-[260px] rounded-[20px] bg-[var(--brand-gradient)] p-[2px]">
      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-bg">
        <div id={readerId} className="ag-reader" />
        <span className="ag-scanline" aria-hidden="true" />
      </div>
    </div>
  );
}

export { useEscape };

/** Cabeçalho comum das folhas de leitura de QR. */
export function ScanSheetHeader({ title, subtitle, onClose }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 id="scan-titulo" className="text-[20px] font-extrabold text-text">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-[1.45] text-text-2">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text">
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

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
      stopAllMediaTracks();
    };
  }, [scanResult, successData]);

  useEscape(onClose);

  if (typeof document === 'undefined') return null;

  if (successData) {
    return createPortal(
      <PresenceConfirmedSheet
        title={activity?.title}
        location={activity?.location}
        points={successData.pointsCredited || 0}
        kicker="Check-out feito"
        onClose={onClose}
      />,
      document.body
    );
  }

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="scan-titulo">
        <ScanSheetHeader
          title="Ler QR do telão"
          subtitle="Aponte a câmera para o QR projetado na sala antes de sair."
          onClose={onClose}
        />

        <ScannerFrame readerId="checkout-screen-reader" />

        {submitting && (
          <p className="mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold text-link" role="status">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Validando sua presença...
          </p>
        )}

        {errorMessage && (
          <>
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-[14px] bg-[rgba(245,154,154,0.1)] p-3 text-[13px] leading-[1.45] text-err">
              <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setScanResult(null);
              }}
              className="btn btn-secondary btn-block mt-3"
            >
              Ler de novo
            </button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

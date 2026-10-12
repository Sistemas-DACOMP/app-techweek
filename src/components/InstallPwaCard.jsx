import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Share, SquarePlus, EllipsisVertical, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Mascot from './Mascot';
import icone from '../assets/icone.png';
import '../styles/inicio.css';

const STORAGE_KEY = 'tw_pwa_v3_dismissed_time';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Estado da instalação do PWA: detecta app instalado (standalone), dispensa por 24h,
 * captura o prompt nativo do Chrome/Android e controla o bottom sheet "Instalar o app".
 * Chamado uma vez pelo Início e repassado pros componentes abaixo.
 */
export function usePwaInstall() {
  const { user } = useAuth();
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Limpa a chave legada antiga para garantir que a nova versão seja carregada
    try {
      localStorage.removeItem('tw_pwa_install_dismissed_time');
    } catch {}

    // 1. Já está rodando como App instalado (Standalone)
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches) ||
      (typeof window !== 'undefined' && window.navigator?.standalone === true) ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'));
    setIsInstalled(Boolean(isStandalone));

    // 2. Dispensou nas últimas 24h
    let recentlyDismissed = false;
    try {
      const dismissedTime = localStorage.getItem(STORAGE_KEY);
      recentlyDismissed = Boolean(dismissedTime && Date.now() - Number(dismissedTime) < DISMISS_DURATION_MS);
    } catch {}
    setDismissed(recentlyDismissed);

    // 3. Sistema operacional
    const userAgent = typeof window !== 'undefined' ? (window.navigator?.userAgent || '') : '';
    setIsAppleDevice(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);

    // 4. Prompt nativo do Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [user]);

  const dismiss = () => {
    setDismissed(true);
    setSheetOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const promptNative = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setSheetOpen(false);
      }
    } catch {}
    setDeferredPrompt(null);
  };

  // Android/Chrome com prompt em memória: instala com 1 toque. Senão, abre o passo a passo.
  const install = () => {
    if (deferredPrompt) return promptNative();
    setSheetOpen(true);
  };

  return {
    isInstalled,
    showCard: !isInstalled && !dismissed,
    isAppleDevice,
    canPrompt: Boolean(deferredPrompt),
    install,
    promptNative,
    dismiss,
    sheetOpen,
    closeSheet: () => setSheetOpen(false)
  };
}

const STEPS = {
  ios: [
    { text: <>No Safari, toque em <b>Compartilhar</b> na barra de baixo</>, Icon: Share },
    { text: <>Escolha <b>Adicionar à Tela de Início</b></>, Icon: SquarePlus },
    { text: <>Abra pelo ícone <b>TechWeek</b> na sua tela</>, app: true }
  ],
  android: [
    { text: <>No Chrome, toque no menu <b>⋮</b> no canto de cima</>, Icon: EllipsisVertical },
    { text: <>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></>, Icon: Download },
    { text: <>Abra pelo ícone <b>TechWeek</b> na sua tela</>, app: true }
  ]
};

/** Bottom sheet "Instale o app no celular" (board InstalarApp). */
export function InstallAppSheet({ pwa }) {
  const [platform, setPlatform] = useState(pwa.isAppleDevice ? 'ios' : 'android');
  const closeRef = useRef(null);

  useEffect(() => {
    if (!pwa.sheetOpen) return undefined;
    setPlatform(pwa.isAppleDevice ? 'ios' : 'android');
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') pwa.closeSheet(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwa.sheetOpen]);

  if (!pwa.sheetOpen || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={pwa.closeSheet} />
      <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="install-sheet-title">
        <div className="flex items-end gap-3">
          <Mascot color="blue" isWaving className="mascot-no-float shrink-0" style={{ width: 64, height: 64 }} />
          <div className="pb-1.5">
            <h2 id="install-sheet-title" className="m-0 text-[21px] font-black text-text">Instale o app no celular</h2>
            <p className="m-0 mt-0.5 text-[13px] text-text-2">Tela cheia, mais rápido e com avisos.</p>
          </div>
        </div>

        <div role="tablist" aria-label="Sistema" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#0D1430] p-1">
          {[['ios', 'iPhone'], ['android', 'Android']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={platform === key}
              onClick={() => setPlatform(key)}
              className={`h-[38px] cursor-pointer rounded-[10px] border-0 font-sans text-sm transition-colors duration-150 ${
                platform === key ? 'bg-surface-selected font-bold text-text' : 'bg-transparent font-semibold text-text-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ol className="m-0 mt-2 list-none p-0">
          {STEPS[platform].map(({ text, Icon, app }, i) => (
            <li key={i} className="flex items-center gap-3 border-t border-line py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-[13px] font-black text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-sm leading-[1.4] text-text">{text}</span>
              {app ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F5FA]">
                  <img src={icone} alt="" className="h-[26px] w-6 object-contain" />
                </span>
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised text-link">
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="m-0 mt-1.5 text-xs text-text-3">
          {platform === 'ios'
            ? 'No Android, o botão "Instalar" aparece direto aqui.'
            : 'Se aparecer o botão "Instalar" abaixo, é só tocar nele.'}
        </p>

        <div className="mt-4 grid grid-cols-[1fr_1.6fr] gap-2.5">
          <button ref={closeRef} type="button" className="btn btn-secondary !min-h-[50px] !rounded-[14px] !font-bold" onClick={pwa.dismiss}>
            Agora não
          </button>
          {pwa.canPrompt ? (
            <button type="button" className="btn btn-primary !min-h-[50px] text-base" onClick={pwa.promptNative}>
              <Download size={18} aria-hidden="true" /> Instalar
            </button>
          ) : (
            <button type="button" className="btn btn-primary !min-h-[50px] text-base" onClick={pwa.dismiss}>
              Já instalei
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

/**
 * Card único "Primeiros passos · falta 1 · Instale o app" (board InicioUltimoPasso).
 * Aparece logo abaixo do "Acontecendo agora" quando só falta instalar.
 */
export default function InstallPwaCard({ pwa }) {
  if (!pwa?.showCard) return null;

  return (
    <section aria-labelledby="install-card-title" className="inicio-gradient-border mx-5 mt-3.5 flex items-center gap-3 rounded-[18px] p-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[image:var(--brand-gradient)] text-white">
        <Smartphone size={22} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold text-link">Primeiros passos · falta 1</span>
        <h2 id="install-card-title" className="m-0 mt-0.5 text-[15px] font-extrabold text-text">Instale o app</h2>
        <span className="mt-0.5 block text-[13px] leading-[1.4] text-text-2">Abre em tela cheia e te avisa antes da sua atividade.</span>
      </span>
      <button type="button" onClick={pwa.install} className="btn btn-action btn-sm shrink-0 !px-3.5 !text-[13px]">
        Instalar
      </button>
    </section>
  );
}

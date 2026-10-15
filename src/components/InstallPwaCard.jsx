import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, Share, SquarePlus, EllipsisVertical, Download, BellRing, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotificationPermission,
  isNotificationEnabled,
  requestNotificationPermission,
  EVENT_NAME,
} from '../lib/notifications';
import Mascot from './Mascot';
import icone from '../assets/icone.png';
import '../styles/inicio.css';

const STORAGE_KEY = 'tw_pwa_v3_dismissed_time';
const NOTIF_DISMISSED_KEY = 'tw_pwa_notif_step_dismissed_time';
const AUTO_SHOWN_NOTIF_SESSION_KEY = 'tw_pwa_notif_auto_shown_session';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Estado da instalação do PWA + 2ª tela de ativação de notificações no celular:
 * - Passo 1: Instalar o Web App na tela inicial
 * - Passo 2 (segunda tela pós-instalação): Ativar notificações nativas na barra do celular
 */
export function usePwaInstall() {
  const { user } = useAuth();
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState('install'); // 'install' | 'notifications'
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => isNotificationEnabled());
  const [activatingNotif, setActivatingNotif] = useState(false);

  const syncNotificationState = useCallback(() => {
    setNotificationPermission(getNotificationPermission());
    setNotificationsEnabled(isNotificationEnabled());
  }, []);

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
    const installedNow = Boolean(isStandalone);
    setIsInstalled(installedNow);

    // 2. Dispensou instalação ou notificações nas últimas 24h
    let recentlyDismissed = false;
    let recentlyNotifDismissed = false;
    try {
      const dismissedTime = localStorage.getItem(STORAGE_KEY);
      recentlyDismissed = Boolean(dismissedTime && Date.now() - Number(dismissedTime) < DISMISS_DURATION_MS);
      const notifDismissedTime = localStorage.getItem(NOTIF_DISMISSED_KEY);
      recentlyNotifDismissed = Boolean(notifDismissedTime && Date.now() - Number(notifDismissedTime) < DISMISS_DURATION_MS);
    } catch {}
    setDismissed(recentlyDismissed);
    setNotifDismissed(recentlyNotifDismissed);

    // 3. Sistema operacional
    const userAgent = typeof window !== 'undefined' ? (window.navigator?.userAgent || '') : '';
    setIsAppleDevice(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);

    syncNotificationState();

    // Se o usuário acabou de abrir o PWA instalado na tela de início e ainda não ativou as notificações,
    // abre automaticamente a 2ª tela ("Ative os avisos no celular")
    const perm = getNotificationPermission();
    const enabled = isNotificationEnabled();
    if (installedNow && !enabled && perm === 'default' && !recentlyNotifDismissed) {
      let alreadyAutoShown = false;
      try {
        alreadyAutoShown = sessionStorage.getItem(AUTO_SHOWN_NOTIF_SESSION_KEY) === 'true';
      } catch {}
      if (!alreadyAutoShown) {
        try {
          sessionStorage.setItem(AUTO_SHOWN_NOTIF_SESSION_KEY, 'true');
        } catch {}
        setSheetStep('notifications');
        setSheetOpen(true);
      }
    }

    // 4. Prompt nativo do Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      syncNotificationState();
      if (!isNotificationEnabled()) {
        setSheetStep('notifications');
        setSheetOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener(EVENT_NAME, syncNotificationState);
    window.addEventListener('focus', syncNotificationState);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener(EVENT_NAME, syncNotificationState);
      window.removeEventListener('focus', syncNotificationState);
    };
  }, [user, syncNotificationState]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
    syncNotificationState();
    const perm = getNotificationPermission();
    if (!isNotificationEnabled() && perm !== 'unsupported' && perm !== 'denied' && !notifDismissed) {
      setSheetStep('notifications');
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
    }
  };

  const dismissNotifications = () => {
    setNotifDismissed(true);
    setSheetOpen(false);
    try {
      localStorage.setItem(NOTIF_DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  const advanceToNotificationStep = () => {
    syncNotificationState();
    if (isNotificationEnabled()) {
      setDismissed(true);
      setSheetOpen(false);
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {}
      return;
    }
    setSheetStep('notifications');
    setSheetOpen(true);
  };

  const promptNative = async () => {
    if (!deferredPrompt) {
      advanceToNotificationStep();
      return;
    }
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      } else {
        setDismissed(true);
        try {
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
        } catch {}
      }
      if (!isNotificationEnabled()) {
        setSheetStep('notifications');
        setSheetOpen(true);
      } else {
        setSheetOpen(false);
      }
    } catch {}
    setDeferredPrompt(null);
  };

  const enableNotifications = async () => {
    setActivatingNotif(true);
    try {
      const res = await requestNotificationPermission({ sendWelcomeTest: true });
      syncNotificationState();
      if (res === 'granted') {
        setSheetOpen(false);
      }
      return res;
    } finally {
      setActivatingNotif(false);
    }
  };

  const openNotificationStep = () => {
    setSheetStep('notifications');
    setSheetOpen(true);
  };

  // Android/Chrome com prompt em memória: instala com 1 toque e avança para a 2ª tela (notificações). Senão, abre o passo a passo.
  const install = () => {
    if (deferredPrompt) return promptNative();
    setSheetStep('install');
    setSheetOpen(true);
  };

  const needsNotificationSetup =
    !notificationsEnabled &&
    notificationPermission !== 'unsupported' &&
    notificationPermission !== 'denied' &&
    !notifDismissed;

  const showInstallCard = !isInstalled && !dismissed;
  const showNotificationCard = needsNotificationSetup && (isInstalled || dismissed);

  return {
    isInstalled,
    notificationsEnabled,
    notificationPermission,
    needsNotificationSetup,
    activatingNotif,
    showCard: showInstallCard || showNotificationCard,
    cardMode: showInstallCard ? 'install' : 'notifications',
    isAppleDevice,
    canPrompt: Boolean(deferredPrompt),
    install,
    promptNative,
    dismiss,
    dismissNotifications,
    advanceToNotificationStep,
    openNotificationStep,
    enableNotifications,
    sheetOpen,
    sheetStep,
    setSheetStep,
    closeSheet: () => setSheetOpen(false)
  };
}

const STEPS = {
  ios: [
    { text: <>No Safari, toque em <b>Compartilhar</b> na barra de baixo</>, Icon: Share },
    { text: <>Escolha <b>Adicionar à Tela de Início</b></>, Icon: SquarePlus },
    { text: <>Abra pelo ícone <b>TechWeek</b> e ative os avisos na 2ª tela</>, app: true }
  ],
  android: [
    { text: <>No Chrome, toque no menu <b>⋮</b> no canto de cima</>, Icon: EllipsisVertical },
    { text: <>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></>, Icon: Download },
    { text: <>Em seguida, confirme em <b>Ativar notificações</b></>, app: true }
  ]
};

const NOTIFICATION_BENEFITS = [
  {
    text: <><b>Início das suas atividades:</b> saiba 15 min antes da palestra ou minicurso começar</>,
    Icon: Clock,
  },
  {
    text: <><b>Comunicados e missões relâmpago:</b> avisos da organização direto na barra do celular</>,
    Icon: Sparkles,
  },
  {
    text: <><b>Como app nativo:</b> aparece na aba de notificações do telefone junto com seus outros apps</>,
    Icon: BellRing,
  },
];

/** Bottom sheet de 2 telas: Passo 1 ("Instale o app no celular") -> Passo 2 ("Ative os avisos no celular"). */
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

  const isNotifStep = pwa.sheetStep === 'notifications';

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={pwa.closeSheet} />
      <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="install-sheet-title">
        {isNotifStep ? (
          <>
            <div className="flex items-end gap-3">
              <Mascot color="blue" isWaving className="mascot-no-float shrink-0" style={{ width: 64, height: 64 }} />
              <div className="pb-1">
                <span className="inline-block rounded-full bg-surface-selected px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-link">
                  {pwa.isInstalled ? 'Passo 2 de 2 · Avisos no celular' : 'Avisos em tempo real · Sem instalar'}
                </span>
                <h2 id="install-sheet-title" className="m-0 mt-1 text-[21px] font-black text-text">
                  Ative as notificações
                </h2>
                <p className="m-0 mt-0.5 text-[13px] text-text-2">
                  Receba os alertas do evento no seu aparelho, mesmo sem instalar o app.
                </p>
              </div>
            </div>

            <ol className="m-0 mt-3 list-none p-0">
              {NOTIFICATION_BENEFITS.map(({ text, Icon }, i) => (
                <li key={i} className="flex items-center gap-3 border-t border-line py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised text-link">
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm leading-[1.4] text-text">{text}</span>
                </li>
              ))}
            </ol>

            {pwa.notificationPermission === 'denied' && (
              <p className="m-0 mt-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs leading-[1.45] text-warn">
                As notificações estão bloqueadas nas configurações do seu navegador/celular. Libere nas permissões do site/app e tente novamente.
              </p>
            )}

            <div className="mt-4 grid grid-cols-[1fr_1.7fr] gap-2.5">
              <button
                ref={closeRef}
                type="button"
                className="btn btn-secondary !min-h-[50px] !rounded-[14px] !font-bold"
                onClick={pwa.dismissNotifications}
              >
                Agora não
              </button>
              <button
                type="button"
                disabled={pwa.activatingNotif}
                className="btn btn-primary !min-h-[50px] text-base"
                onClick={pwa.enableNotifications}
              >
                <BellRing size={18} aria-hidden="true" />
                {pwa.activatingNotif ? 'Ativando...' : 'Ativar notificações'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <Mascot color="blue" isWaving className="mascot-no-float shrink-0" style={{ width: 64, height: 64 }} />
              <div className="pb-1">
                <span className="inline-block rounded-full bg-surface-selected px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-link">
                  Passo 1 de 2 · App no celular
                </span>
                <h2 id="install-sheet-title" className="m-0 mt-1 text-[21px] font-black text-text">Instale o app no celular</h2>
                <p className="m-0 mt-0.5 text-[13px] text-text-2">Tela cheia, mais rápido e com avisos na barra do sistema.</p>
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
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-bg shadow-sm">
                      <img src={icone} alt="" className="h-[26px] w-[26px] object-contain" />
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
              {pwa.needsNotificationSetup
                ? 'Não quer instalar agora? Toque em "Só ativar avisos" para receber alertas mesmo pelo navegador.'
                : platform === 'ios'
                  ? 'Depois de adicionar à tela de início, toque em "Continuar" para ativar as notificações.'
                  : 'Se aparecer o botão "Instalar" abaixo, toque nele e depois ative as notificações.'}
            </p>

            <div className="mt-4 grid grid-cols-[1fr_1.5fr] gap-2.5">
              <button ref={closeRef} type="button" className="btn btn-secondary !min-h-[50px] !rounded-[14px] !font-bold" onClick={pwa.dismiss}>
                {pwa.needsNotificationSetup ? 'Só ativar avisos' : 'Agora não'}
              </button>
              {pwa.canPrompt ? (
                <button type="button" className="btn btn-primary !min-h-[50px] text-base" onClick={pwa.promptNative}>
                  <Download size={18} aria-hidden="true" /> Instalar
                </button>
              ) : (
                <button type="button" className="btn btn-primary !min-h-[50px] text-base" onClick={pwa.advanceToNotificationStep}>
                  <CheckCircle2 size={18} aria-hidden="true" /> Já instalei · Continuar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

/**
 * Card dinâmico de Primeiros Passos na Home:
 * - Se ainda não instalou: "Primeiros passos · Instale o app" + botão direto "Ativar avisos" (sem exigir instalação)
 * - Se já instalou (ou dispensou instalação) mas falta ativar notificações: "Ative as notificações"
 */
export default function InstallPwaCard({ pwa }) {
  if (!pwa?.showCard) return null;

  if (pwa.cardMode === 'notifications') {
    return (
      <section aria-labelledby="install-card-title" className="inicio-gradient-border mx-5 mt-3.5 flex items-center gap-3 rounded-[18px] p-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[image:var(--brand-gradient)] text-white">
          <BellRing size={22} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold text-link">
            {pwa.isInstalled ? 'Primeiros passos · 2 de 2' : 'Avisos em tempo real'}
          </span>
          <h2 id="install-card-title" className="m-0 mt-0.5 text-[15px] font-extrabold text-text">Ative as notificações</h2>
          <span className="mt-0.5 block text-[13px] leading-[1.4] text-text-2">
            {pwa.isInstalled
              ? 'Receba avisos de palestras e missões na barra do celular.'
              : 'Receba avisos de palestras e missões mesmo sem instalar o app.'}
          </span>
        </span>
        <button type="button" onClick={pwa.openNotificationStep} className="btn btn-action btn-sm shrink-0 !px-3.5 !text-[13px]">
          Ativar
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="install-card-title" className="inicio-gradient-border mx-5 mt-3.5 flex flex-col gap-3 rounded-[18px] p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[image:var(--brand-gradient)] text-white">
          <Smartphone size={22} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold text-link">Primeiros passos · falta 1</span>
          <h2 id="install-card-title" className="m-0 mt-0.5 text-[15px] font-extrabold text-text">Instale o app ou ative os avisos</h2>
          <span className="mt-0.5 block text-[13px] leading-[1.4] text-text-2">Abre em tela cheia ou avisa direto pelo navegador quando sua atividade começar.</span>
        </span>
        {!pwa.needsNotificationSetup && (
          <button type="button" onClick={pwa.install} className="btn btn-action btn-sm shrink-0 !px-3.5 !text-[13px]">
            Instalar
          </button>
        )}
      </div>
      {pwa.needsNotificationSetup && (
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-2.5">
          <button
            type="button"
            onClick={pwa.openNotificationStep}
            className="btn btn-secondary btn-sm flex-1 !min-h-[38px] !rounded-xl !px-3 !text-[12px] !font-bold"
          >
            <BellRing size={15} aria-hidden="true" /> Só ativar avisos
          </button>
          <button
            type="button"
            onClick={pwa.install}
            className="btn btn-action btn-sm flex-1 !min-h-[38px] !rounded-xl !px-3 !text-[12px]"
          >
            <Smartphone size={15} aria-hidden="true" /> Instalar app
          </button>
        </div>
      )}
    </section>
  );
}


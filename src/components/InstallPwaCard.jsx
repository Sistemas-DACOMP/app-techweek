import { useState, useEffect } from 'react';
import { 
  Share, 
  Download, 
  PlusSquare, 
  X
} from 'lucide-react';

const STORAGE_KEY = 'tw_pwa_install_dismissed_time';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

export default function InstallPwaCard() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState('ios'); // 'ios' | 'android'

  useEffect(() => {
    // 1. Verifica se já está rodando como App instalado (Standalone)
    const isStandalone = 
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && window.navigator?.standalone === true) ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // 2. Verifica se o usuário dispensou recentemente nas últimas 24h
    try {
      const dismissedTime = localStorage.getItem(STORAGE_KEY);
      if (dismissedTime && Date.now() - Number(dismissedTime) < DISMISS_DURATION_MS) {
        setIsVisible(false);
        return;
      }
    } catch {}

    // 3. Detecta sistema operacional padrão
    const userAgent = typeof window !== 'undefined' ? (window.navigator?.userAgent || '') : '';
    const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setActiveTab(isAppleDevice ? 'ios' : 'android');

    // 4. Captura evento nativo do Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se o prompt não disparou após 1.5s, exibe o card educativo
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <section
      aria-label="Instalar aplicativo"
      style={{
        marginBottom: '20px',
        position: 'relative',
        backgroundColor: '#0F141F',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
        overflow: 'hidden',
        padding: '16px'
      }}
    >
      {/* Botão Fechar / Dispensar */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar aviso de instalação"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: '1px solid #1E293B',
          borderRadius: '8px',
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          cursor: 'pointer',
          zIndex: 2
        }}
      >
        <X size={14} strokeWidth={1.75} />
      </button>

      {/* Cabeçalho do Card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', paddingRight: '28px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img src="/favicon.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#F8FAFC'
              }}
            >
              Instalar o App no Celular
            </span>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#1E293B',
                color: '#94A3B8',
                fontSize: '0.60rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700
              }}
            >
              Web App
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.74rem',
              color: '#94A3B8',
              lineHeight: 1.35,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Adicione à tela de início para abrir como app nativo, rápido e sem barras do navegador.
          </p>
        </div>
      </div>

      {/* Se tiver prompt nativo do Chrome/Android */}
      {deferredPrompt ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleNativeInstall}
            style={{
              flex: 1,
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              color: '#FFFFFF',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} strokeWidth={1.75} />
            <span>Instalar Aplicativo Agora</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #1E293B',
              borderRadius: '8px',
              padding: '9px 12px',
              color: '#94A3B8',
              fontSize: '0.74rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Agora não
          </button>
        </div>
      ) : (
        <div>
          {/* Alternador Neutro Safari (iOS) vs Chrome (Android) */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #1E293B',
              borderRadius: '8px',
              padding: '2px',
              gap: '4px',
              marginBottom: '10px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              style={{
                flex: 1,
                border: activeTab === 'ios' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                background: activeTab === 'ios' ? '#1E293B' : 'transparent',
                color: activeTab === 'ios' ? '#F8FAFC' : '#64748B',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '0.70rem',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              No iPhone / Safari
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              style={{
                flex: 1,
                border: activeTab === 'android' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid transparent',
                background: activeTab === 'android' ? '#1E293B' : 'transparent',
                color: activeTab === 'android' ? '#F8FAFC' : '#64748B',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '0.70rem',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              No Android / Chrome
            </button>
          </div>

          {/* Passo a Passo Didático Monocromático */}
          <div
            style={{
              backgroundColor: 'rgba(5, 8, 17, 0.5)',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.72rem',
              color: '#94A3B8',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {activeTab === 'ios' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>1.</span>
                  <span>Toque no botão de Compartilhar</span>
                  <Share size={13} color="#94A3B8" strokeWidth={1.75} />
                  <span>na barra inferior do Safari</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>2.</span>
                  <span>Role para baixo e selecione Adicionar à Tela de Início</span>
                  <PlusSquare size={13} color="#94A3B8" strokeWidth={1.75} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>3.</span>
                  <span>Confirme em Adicionar no canto superior direito</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>1.</span>
                  <span>Toque no menu de três pontos no topo do Chrome</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>2.</span>
                  <span>Selecione Instalar aplicativo ou Adicionar à tela inicial</span>
                  <Download size={13} color="#94A3B8" strokeWidth={1.75} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 700 }}>3.</span>
                  <span>Confirme a instalação para abrir direto dos seus aplicativos</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '0.70rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              Dispensar por 24h
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

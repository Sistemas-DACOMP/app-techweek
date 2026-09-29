import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Smartphone, 
  ArrowDown
} from 'lucide-react';

const STORAGE_KEY = 'tw_pwa_install_dismissed_time';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

export default function InstallPwaCard() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalPlatform, setModalPlatform] = useState('ios'); // 'ios' | 'android'

  useEffect(() => {
    // 1. Verifica se já está rodando como App instalado (Standalone)
    const isStandalone = 
      (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches) ||
      (typeof window !== 'undefined' && window.navigator?.standalone === true) ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'));

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

    // 3. Detecta sistema operacional
    const userAgent = typeof window !== 'undefined' ? (window.navigator?.userAgent || '') : '';
    const isApple = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsAppleDevice(isApple);

    // 4. Captura evento nativo do Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Exibe o card moderno para incentivar a instalação
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowModal(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    // Se temos o prompt nativo do Android/Chrome: disparo com 1 clique direto!
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
      } catch {}
      setDeferredPrompt(null);
      return;
    }

    // Se estiver no iOS / Safari: abre modal ilustrado direcionando para o botão Compartilhar
    if (isAppleDevice) {
      setModalPlatform('ios');
      setShowModal(true);
      return;
    }

    // Caso Android/Desktop sem prompt nativo em memória: abre modal orientando os 2 passos
    setModalPlatform('android');
    setShowModal(true);
  };

  if (!isVisible) return null;

  return (
    <>
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
          padding: '16px',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.5)'
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
            color: '#64748B',
            cursor: 'pointer',
            zIndex: 2,
            transition: 'color 0.15s ease'
          }}
        >
          <X size={14} strokeWidth={1.75} />
        </button>

        {/* Linha Principal: Ícone + Título + Botão de Instalação Direta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', paddingRight: '28px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.18)'
            }}
          >
            <img src="/favicon.png" alt="FACOM TechWeek" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: '0.90rem',
                  fontWeight: 700,
                  color: '#F8FAFC'
                }}
              >
                Instale o App no Celular
              </span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  color: '#60A5FA',
                  fontSize: '0.60rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700
                }}
              >
                1-TOQUE
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
              Acesso rápido com tela cheia, sem barras do navegador.
            </p>
          </div>
        </div>

        {/* Botão de Ação Direta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '10px',
              padding: '10px 16px',
              color: '#FFFFFF',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.80rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
              transition: 'transform 0.1s ease, filter 0.15s ease'
            }}
          >
            <Download size={15} strokeWidth={2.2} />
            <span>Instalar Aplicativo</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#64748B',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.74rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Agora não
          </button>
        </div>
      </section>

      {/* MODAL ILUSTRADO DE INSTALAÇÃO (SAFARI / IOS OU ANDROID MANUAL) */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(5, 10, 24, 0.78)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#0B1120',
              border: '1px solid #1E293B',
              borderRadius: '20px',
              padding: '24px 20px 20px',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 24px rgba(37, 99, 235, 0.15)',
              position: 'relative'
            }}
          >
            {/* Fechar Modal */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              aria-label="Fechar guia"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={15} strokeWidth={2} />
            </button>

            {/* Cabeçalho do Modal */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#60A5FA'
                }}
              >
                <Smartphone size={26} strokeWidth={1.8} />
              </div>
              <h3
                style={{
                  margin: '0 0 6px',
                  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#F8FAFC'
                }}
              >
                {modalPlatform === 'ios' ? 'Instalar no iPhone' : 'Instalar no Android'}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: '#94A3B8',
                  lineHeight: 1.4,
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {modalPlatform === 'ios'
                  ? 'Siga os 2 passos rápidos abaixo no Safari:'
                  : 'Siga os 2 passos no menu do seu navegador:'}
              </p>
            </div>

            {/* Passos Ilustrados */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '22px'
              }}
            >
              {modalPlatform === 'ios' ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#38BDF8'
                      }}
                    >
                      <Share size={18} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 700, color: '#38BDF8' }}>1. </span>
                      Toque no botão de <strong>Compartilhar</strong> na barra inferior do Safari.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#60A5FA'
                      }}
                    >
                      <PlusSquare size={18} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 700, color: '#60A5FA' }}>2. </span>
                      Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#34D399'
                      }}
                    >
                      <CheckCircle2 size={18} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 700, color: '#34D399' }}>3. </span>
                      Toque em <strong>Adicionar</strong> no canto superior direito.
                    </div>
                  </div>

                  {/* Indicador sutil para a barra inferior do Safari */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.72rem',
                      color: '#64748B',
                      marginTop: '4px'
                    }}
                  >
                    <ArrowDown size={13} strokeWidth={2} />
                    <span>O botão de compartilhar fica na barra inferior do Safari</span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#38BDF8'
                      }}
                    >
                      <Smartphone size={18} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 700, color: '#38BDF8' }}>1. </span>
                      Toque no menu de três pontos <strong>(⋮)</strong> no topo do Chrome.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#34D399'
                      }}
                    >
                      <Download size={18} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 700, color: '#34D399' }}>2. </span>
                      Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botão de Fechamento do Modal */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                color: '#FFFFFF',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)'
              }}
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

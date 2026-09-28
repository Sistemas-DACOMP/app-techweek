import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useUser } from '../hooks/useUser';
import { 
  Info, 
  X, 
  Users, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Camera, 
  RefreshCw, 
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { findUserByUsername, getLeaderboardUsers } from '../lib/userService';
import { DEFAULT_ACTIVITIES } from '../lib/activityService';
import { resolveParticipantFromQr } from '../lib/sponsorService';
import ParticipantCard from '../components/ParticipantCard';

export default function Scanner() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { registerCodeScan } = useUser();

  // O botão demo só fica visível em ambiente de desenvolvimento ou com ?demo=true na URL
  const isDevMode = typeof window !== 'undefined' && (
    import.meta.env.DEV || window.location.search.includes('demo=true')
  );

  useEffect(() => {
    // Não inicia a câmera se já houver um resultado ativo
    if (scanResult) return;

    let isMounted = true;
    let html5QrCode = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        setIsCameraActive(false);

        html5QrCode = new Html5Qrcode('techweek-camera-viewport');

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1
          },
          (decodedText) => {
            if (!isMounted) return;
            try {
              html5QrCode.stop().catch(() => {});
            } catch {}
            handleScan(decodedText);
          },
          () => {
            // Ignorado (ruído frame-a-frame)
          }
        );

        if (isMounted) {
          setIsCameraActive(true);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Erro ao inicializar câmera do scanner:', err);
        setCameraError('Permissão de câmera não concedida ou dispositivo sem câmera.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        try {
          html5QrCode.stop().catch(() => {});
        } catch {}
      }
      const videoElement = document.querySelector('#techweek-camera-viewport video');
      if (videoElement && videoElement.srcObject) {
        try {
          videoElement.srcObject.getTracks().forEach((track) => track.stop());
        } catch {}
      }
    };
  }, [scanResult]);

  const handleScan = async (data) => {
    setIsLoading(true);

    let isUserQr = false;
    let isActivityQr = false;
    let activityData = null;
    let usernameToValidate = null;
    let participantData = null;

    // 1. Tenta identificar payload JSON (Participante ou Atividade)
    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username || parsed.participantUid || (parsed.uid && !parsed.lectureId)) {
          isUserQr = true;
          usernameToValidate = parsed.username || null;
          participantData = parsed;
        } else if (parsed.lectureId || parsed.activityId) {
          isActivityQr = true;
          const actId = parsed.lectureId || parsed.activityId;
          activityData = DEFAULT_ACTIVITIES.find(a => a.id === actId) || { id: actId, title: 'Atividade TechWeek' };
        }
      }
    } catch {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username || parsed.participantUid || (parsed.uid && !parsed.lectureId)) {
            isUserQr = true;
            usernameToValidate = parsed.username || null;
            participantData = parsed;
          } else if (parsed.lectureId || parsed.activityId) {
            isActivityQr = true;
            const actId = parsed.lectureId || parsed.activityId;
            activityData = DEFAULT_ACTIVITIES.find(a => a.id === actId) || { id: actId, title: 'Atividade TechWeek' };
          }
        }
      } catch {}
    }

    // Se não for atividade e ainda não tiver identificado participante, tenta resolver pelo helper do crachá/sympla
    if (!isActivityQr && !isUserQr) {
      try {
        const resolved = await resolveParticipantFromQr(data);
        if (resolved) {
          isUserQr = true;
          usernameToValidate = resolved.username || null;
          participantData = resolved;
        }
      } catch {}
    }

    let fetchedProfile = null;
    if (isUserQr && usernameToValidate) {
      fetchedProfile = await findUserByUsername(usernameToValidate).catch(() => null);

      if (!fetchedProfile && !participantData) {
        setIsLoading(false);
        setScanResult({ 
          status: 'error',
          title: 'QR Code não identificado',
          message: 'Usuário não encontrado no banco de dados. Verifique se o código é válido.' 
        });
        return;
      }
    }

    const result = await registerCodeScan(data, 5);

    // Constrói objeto enriquecido do participante para o card (KAN-95)
    const consolidatedParticipant = isUserQr ? {
      name: fetchedProfile?.displayName || 
            [fetchedProfile?.firstName, fetchedProfile?.lastName].filter(Boolean).join(' ') || 
            participantData?.name || 
            participantData?.username || 
            usernameToValidate || 
            'Participante',
      username: fetchedProfile?.username || participantData?.username || usernameToValidate || '',
      avatarUrl: fetchedProfile?.avatarUrl || fetchedProfile?.photoURL || participantData?.avatarUrl || participantData?.photoURL || null,
      course: fetchedProfile?.course || participantData?.course || 'Computação',
      period: fetchedProfile?.period || participantData?.period || null,
      participantType: fetchedProfile?.participantType || fetchedProfile?.participant_type || participantData?.participantType || 'Aluno da UFU',
      phone: fetchedProfile?.phone || participantData?.phone || '',
      email: fetchedProfile?.email || participantData?.email || '',
      linkedin: fetchedProfile?.linkedin || participantData?.linkedin || '',
      instagram: fetchedProfile?.instagram || participantData?.instagram || '',
      github: fetchedProfile?.github || participantData?.github || ''
    } : null;

    if (result && result.success) {
      if (isUserQr) {
        setScanResult({ 
          status: 'success',
          type: 'participant',
          title: 'QR Code identificado',
          message: 'Conexão realizada com sucesso!',
          points: 5,
          challenges: result.unlockedChallenges,
          participant: consolidatedParticipant
        });
      } else if (isActivityQr) {
        setScanResult({
          status: 'success',
          type: 'activity',
          title: 'Atividade identificada',
          message: 'Presença e participação confirmadas!',
          points: 5,
          activity: activityData
        });
      } else {
        setScanResult({ 
          status: 'success',
          type: 'code',
          title: 'Código identificado',
          message: 'Participação registrada com sucesso!',
          points: 5,
          challenges: result.unlockedChallenges
        });
      }
    } else {
      // Estado Já Lido ou Inválido
      setScanResult({ 
        status: 'already_scanned',
        type: isUserQr ? 'participant' : 'generic',
        title: 'Código já processado',
        message: 'Você já escaneou este código anteriormente.',
        participant: consolidatedParticipant
      });
    }

    setIsLoading(false);
  };

  const simulateScan = async () => {
    setIsLoading(true);
    const rand = Math.random();
    if (rand < 0.2) {
      handleScan('kanastra_code');
      return;
    }

    try {
      const users = await getLeaderboardUsers(10).catch(() => []);
      if (users && users.length > 0) {
        const randomDbUser = users[Math.floor(Math.random() * users.length)];
        const payload = JSON.stringify({
          username: randomDbUser.username,
          name: randomDbUser.displayName || randomDbUser.firstName || randomDbUser.username,
          phone: randomDbUser.phone || '',
          course: randomDbUser.course || 'Sistemas de Informação',
          participantType: randomDbUser.participant_type || randomDbUser.participantType || 'Aluno da UFU',
          period: randomDbUser.period || 4,
          avatarUrl: randomDbUser.avatarUrl || randomDbUser.photoURL || '',
          linkedin: randomDbUser.linkedin || '',
          instagram: randomDbUser.instagram || '',
          github: randomDbUser.github || ''
        });
        handleScan(payload);
        return;
      }
    } catch (e) {
      console.error("Falha ao simular scan:", e);
    }

    const fallbackUser = {
      username: 'lucas_silva',
      name: 'Lucas Silva',
      phone: '(34) 99876-5432',
      course: 'Sistemas de Informação',
      participantType: 'Aluno da UFU',
      period: 4,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      linkedin: 'lucassilva',
      instagram: 'lucas.tech',
      github: 'lucassilva'
    };
    handleScan(JSON.stringify(fallbackUser));
  };

  return (
    <div 
      className="page-container animate-fade-in" 
      style={{ 
        maxWidth: '430px', 
        margin: '0 auto',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '16px',
        paddingBottom: 'max(90px, calc(env(safe-area-inset-bottom) + 80px))',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <style>{`
        #techweek-camera-viewport {
          width: 100% !important;
          height: 100% !important;
          position: relative;
        }
        #techweek-camera-viewport video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important;
        }
        #techweek-camera-viewport img {
          display: none !important;
        }
        @keyframes laserSweep {
          0% { top: 10%; opacity: 0.15; }
          50% { opacity: 0.85; }
          100% { top: 88%; opacity: 0.15; }
        }
        .scanner-laser-line {
          position: absolute;
          left: 8%;
          right: 8%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38BDF8, #60A5FA, transparent);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.7);
          animation: laserSweep 2.4s ease-in-out infinite alternate;
          z-index: 10;
        }
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .pulse-indicator {
          animation: pulseGlow 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* 1. HEADER SIMPLES & EDITORIAL PADRONIZADO */}
      <header 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '22px' 
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.15
            }}
          >
            Escanear
          </h1>
          <p
            style={{
              fontSize: '0.80rem',
              color: '#94A3B8',
              margin: '3px 0 0',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            Leia QR Codes de participantes e estandes • 18°55'S 48°15'W
          </p>
        </div>

        {/* Ícone de Informação no canto superior direito */}
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          aria-label="Informações sobre o scanner"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Info size={18} />
        </button>
      </header>

      {/* 2. ÁREA DO SCANNER (VIEWPORT DE CÂMERA PROFISSIONAL) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '286px',
          aspectRatio: '1 / 1',
          margin: '0 auto',
          borderRadius: '24px',
          backgroundColor: '#050811',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Elemento de montagem do Html5Qrcode */}
        <div id="techweek-camera-viewport" />

        {/* Linha laser animada sutil */}
        {isCameraActive && !isLoading && <div className="scanner-laser-line" />}

        {/* Estado Carregando / Iniciando câmera */}
        {!isCameraActive && !cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              backgroundColor: '#050811',
              zIndex: 5
            }}
          >
            <Loader2 size={24} className="animate-spin" color="#38BDF8" />
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
              Iniciando câmera...
            </span>
          </div>
        )}

        {/* Estado Erro de Câmera */}
        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#0F141F',
              zIndex: 6
            }}
          >
            <Camera size={30} color="#EF4444" style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 700, marginBottom: '4px' }}>
              Câmera indisponível
            </span>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
              {cameraError}
            </p>
          </div>
        )}

        {/* 4 Cantos de Enquadramento em Azul Elétrico (Cantoneiras Elegantes) */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            width: '24px',
            height: '24px',
            borderTop: '2.5px solid #38BDF8',
            borderLeft: '2.5px solid #38BDF8',
            borderTopLeftRadius: '8px',
            pointerEvents: 'none',
            zIndex: 8
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '24px',
            height: '24px',
            borderTop: '2.5px solid #38BDF8',
            borderRight: '2.5px solid #38BDF8',
            borderTopRightRadius: '8px',
            pointerEvents: 'none',
            zIndex: 8
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '14px',
            width: '24px',
            height: '24px',
            borderBottom: '2.5px solid #38BDF8',
            borderLeft: '2.5px solid #38BDF8',
            borderBottomLeftRadius: '8px',
            pointerEvents: 'none',
            zIndex: 8
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            right: '14px',
            width: '24px',
            height: '24px',
            borderBottom: '2.5px solid #38BDF8',
            borderRight: '2.5px solid #38BDF8',
            borderBottomRightRadius: '8px',
            pointerEvents: 'none',
            zIndex: 8
          }}
        />
      </div>

      {/* 3. INSTRUÇÃO COMPACTA */}
      <div 
        style={{ 
          textAlign: 'center', 
          marginTop: '12px', 
          marginBottom: '20px' 
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.76rem',
            color: '#94A3B8',
            fontFamily: "'Inter', system-ui, sans-serif"
          }}
        >
          <span 
            className="pulse-indicator"
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: '#38BDF8',
              boxShadow: '0 0 6px #38BDF8'
            }} 
          />
          {isLoading 
            ? 'Processando código...' 
            : isCameraActive 
              ? 'Posicione o QR Code dentro da área' 
              : 'Aguardando câmera...'}
        </span>
      </div>

      {/* 4. ÁREA DE INFORMAÇÃO ("O que você pode escanear") */}
      <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
        <h2
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 10px 4px',
            fontFamily: "'Inter', system-ui, sans-serif"
          }}
        >
          O que você pode escanear
        </h2>

        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}
        >
          {/* Item 1: Participantes */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
                flexShrink: 0
              }}
            >
              <Users size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                Participantes
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Conecte-se com outros participantes
              </div>
            </div>
          </div>

          {/* Item 2: Atividades */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
                flexShrink: 0
              }}
            >
              <Calendar size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                Atividades
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Registre sua presença e participação
              </div>
            </div>
          </div>

          {/* Item 3: Estandes */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C084FC',
                flexShrink: 0
              }}
            >
              <Building2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                Estandes
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
                Descubra empresas e parceiros do evento
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. BOTÃO DEMO (Apenas DEV ou ?demo=true) */}
      {isDevMode && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button
            type="button"
            onClick={simulateScan}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              fontSize: '0.7rem',
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px'
            }}
          >
            <RefreshCw size={11} />
            <span>Simulação de leitura (Ambiente de Testes)</span>
          </button>
        </div>
      )}

      {/* 5. BOTTOM SHEET DE RESULTADO DA LEITURA (EMBAIXO, SEM BARRINHA DE ARRASTAR) */}
      {scanResult && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
          onClick={() => setScanResult(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              maxHeight: '88dvh',
              backgroundColor: '#0A0E17',
              borderTop: '1px solid #1E293B',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '14px 16px',
              paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.8)',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Card: Status + Botão Fechar X (Fixo no topo, sem barrinha de arrastar) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: scanResult.status === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: scanResult.status === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: scanResult.status === 'success' ? '#10B981' : '#F59E0B',
                    flexShrink: 0
                  }}
                >
                  {scanResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      color: '#F8FAFC',
                      margin: 0,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {scanResult.title}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {/* Botão Fechar X */}
              <button
                type="button"
                onClick={() => setScanResult(null)}
                aria-label="Fechar resultado"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Conteúdo Central com rolagem se necessário */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingRight: '2px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* SE FOR PARTICIPANTE (KAN-95) */}
              {scanResult.participant && (
                <ParticipantCard participant={scanResult.participant} />
              )}

              {/* SE FOR ATIVIDADE */}
              {scanResult.activity && (
                <div
                  style={{
                    backgroundColor: '#0F141F',
                    border: '1px solid #1E293B',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '4px' }}>
                    {scanResult.activity.title}
                  </div>
                  {scanResult.activity.time && (
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '10px' }}>
                      {scanResult.activity.time} {scanResult.activity.location ? `• ${scanResult.activity.location}` : ''}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      navigate('/agenda');
                    }}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Ver na programação</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              )}

              {/* Badge de Pontuação Secundária */}
              {scanResult.points && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    marginBottom: '8px'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={12} color="#F59E0B" />
                    Participação registrada
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#F59E0B'
                    }}
                  >
                    +{scanResult.points} pontos
                  </span>
                </div>
              )}
            </div>

            {/* Rodapé Fixo: Botão sempre visível na parte inferior */}
            <div style={{ paddingTop: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '11px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                Escanear outro código
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE INFORMAÇÃO RÁPIDA (INFO) */}
      {showInfoModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              borderRadius: '20px',
              padding: '22px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Como usar o Scanner
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                aria-label="Fechar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 16px' }}>
              O leitor óptico oficial da FACOM TechWeek permite interagir em tempo real durante todo o evento:
            </p>

            <ul style={{ fontSize: '0.76rem', color: '#CBD5E1', paddingLeft: '18px', margin: '0 0 18px', lineHeight: 1.6 }}>
              <li><strong>Crachás:</strong> Escaneie o QR Code de colegas para salvar o contato e iniciar conversa no WhatsApp.</li>
              <li><strong>Palestras & Minicursos:</strong> Confirme presença nos momentos indicados pelos palestrantes.</li>
              <li><strong>Estandes:</strong> Descubra desafios especiais e interaja com os patrocinadores.</li>
            </ul>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#F8FAFC',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

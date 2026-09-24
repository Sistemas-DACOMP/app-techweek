import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Building2, 
  ShieldAlert, 
  QrCode, 
  Users, 
  Star, 
  Sparkles, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { resolveParticipantFromQr } from '../lib/sponsorService';
import SponsorLeadModal from '../components/SponsorLeadModal';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Sponsor() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { profile: userProfile } = useUser();

  // Role validation: SPONSOR or ADMIN
  // Dev mode toggle to allow seamless local testing
  const [devSponsorOverride, setDevSponsorOverride] = useState(false);
  const actualRole = userProfile?.role || authUser?.role || 'PARTICIPANT';
  const hasAccess = actualRole === 'SPONSOR' || actualRole === 'ADMIN' || devSponsorOverride;

  // Scanner States
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const scannerRef = useRef(null);

  // Modal & Leads States
  const [activeParticipant, setActiveParticipant] = useState(null);
  const [capturedLeads, setCapturedLeads] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const sponsorName = userProfile?.companyName || userProfile?.empresa || userProfile?.displayName || 'Empresa Patrocinadora';

  // Iniciar scanner contínuo quando a página estiver com acesso e modal fechado
  useEffect(() => {
    if (!hasAccess) return;
    if (activeParticipant) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [hasAccess, activeParticipant]);

  const startScanner = async () => {
    try {
      const readerElement = document.getElementById('sponsor-qr-reader');
      if (!readerElement) return;

      if (scannerRef.current) {
        await stopScanner();
      }

      const html5Qr = new Html5Qrcode('sponsor-qr-reader');
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 }
        },
        async (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignorado para UX contínua sem spam no console
        }
      );

      setIsScannerActive(true);
      setScannerError(null);
    } catch (err) {
      console.warn('Câmera indisponível ou permissão negada:', err);
      setIsScannerActive(false);
      setScannerError('Câmera indisponível ou permissão negada. Você pode utilizar a "Simulação de Leitura" abaixo.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Erro ao parar scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScannerActive(false);
  };

  const handleScanSuccess = async (rawData) => {
    if (isResolving || activeParticipant) return;
    setIsResolving(true);
    await stopScanner();

    try {
      const resolved = await resolveParticipantFromQr(rawData);
      if (resolved) {
        setActiveParticipant(resolved);
      } else {
        showToast('Código lido não corresponde a um participante válido.', 'warning');
        setTimeout(() => startScanner(), 1500);
      }
    } catch (err) {
      console.error('Erro ao resolver QR do participante:', err);
      showToast('Erro ao processar leitura do crachá.', 'error');
      setTimeout(() => startScanner(), 1500);
    } finally {
      setIsResolving(false);
    }
  };

  // Simular leitura com crachá físico do Sympla ou app
  const simulateBadgeScan = (type = 'app') => {
    if (isResolving) return;

    const mockCandidates = [
      {
        participantUid: 'demo_user_1',
        name: 'Guilherme Mendes',
        course: 'Ciência da Computação',
        period: 6,
        phone: '(34) 99123-4567',
        email: 'guilherme.mendes@ufu.br',
        participantType: 'Aluno da UFU'
      },
      {
        participantUid: 'demo_user_2',
        name: 'Camila Rocha',
        course: 'Sistemas de Informação',
        period: 4,
        phone: '(34) 99876-5432',
        email: 'camila.rocha@ufu.br',
        participantType: 'Aluno da UFU'
      },
      {
        participantUid: 'demo_user_3',
        name: 'Lucas Ferreira',
        course: 'Engenharia de Software',
        period: 8,
        phone: '(11) 98765-4321',
        email: 'lucas.ferreira@gmail.com',
        participantType: 'Aluno de outra instituição'
      }
    ];

    const candidate = mockCandidates[Math.floor(Math.random() * mockCandidates.length)];

    let simulatedPayload;
    if (type === 'sympla') {
      simulatedPayload = `SYMPLA:T${Math.floor(100000 + Math.random() * 900000)}`;
    } else {
      simulatedPayload = JSON.stringify({
        uid: candidate.participantUid,
        name: candidate.name,
        course: candidate.course,
        period: candidate.period,
        phone: candidate.phone,
        email: candidate.email
      });
    }

    handleScanSuccess(simulatedPayload);
  };

  const handleLeadCaptured = (newLead) => {
    setCapturedLeads((prev) => [newLead, ...prev.filter(l => l.participantUid !== newLead.participantUid)]);
    showToast(`Lead de ${newLead.name} salvo com sucesso!`, 'success');
  };

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Tela de Bloqueio se não for SPONSOR nem ADMIN
  if (!hasAccess) {
    return (
      <div className="page-container animate-fade-in" style={{ paddingBottom: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', textAlign: 'center' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            marginBottom: '20px'
          }}
        >
          <ShieldAlert size={40} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
          Acesso Restrito: Modo Patrocinador
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '340px', lineHeight: '1.6', marginBottom: '24px' }}>
          A rota <strong>/sponsor</strong> é exclusiva para contas com perfil <strong>SPONSOR</strong> ou <strong>ADMIN</strong> credenciadas nos estandes da FACOM TechWeek.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Voltar para o Início
          </button>

          {/* Atalho para facilitar demonstração e testes locais */}
          <button
            type="button"
            onClick={() => setDevSponsorOverride(true)}
            style={{
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: '14px',
              padding: '10px',
              color: '#00f2fe',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} />
            <span>Simular Permissão de Patrocinador (Teste)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '100px', fontFamily: "'Montserrat', sans-serif" }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: '90%',
            maxWidth: '380px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: toastMessage.type === 'success' ? 'rgba(6, 78, 59, 0.95)' : toastMessage.type === 'warning' ? 'rgba(120, 53, 15, 0.95)' : 'rgba(127, 29, 29, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} color="#34d399" /> : <AlertCircle size={18} color="#fbbf24" />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', marginTop: '12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
            Modo Patrocinador
          </h2>
          <div style={{ fontSize: '12px', color: '#00f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
            <Building2 size={13} />
            <span>{sponsorName}</span>
          </div>
        </div>

        <div style={{ width: '38px' }} />
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
            Leads Bipados
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#00f2fe' }}>
            {capturedLeads.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
            Pontos Concedidos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#25D366' }}>
            +{capturedLeads.length * 50}
          </div>
        </div>
      </div>

      {/* Leitor Contínuo de QR Code */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          <QrCode size={18} color="#00f2fe" />
          <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>
            Leitor de Crachá do Estande
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Aponte para o crachá físico Sympla ou crachá digital do app do estudante.
        </p>

        {/* Viewfinder da Câmera */}
        <div
          id="sponsor-qr-reader"
          style={{
            width: '100%',
            maxWidth: '300px',
            margin: '0 auto',
            borderRadius: '16px',
            overflow: 'hidden',
            minHeight: '220px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(0, 242, 254, 0.3)'
          }}
        />

        {scannerError && (
          <p style={{ fontSize: '12px', color: '#fbbf24', marginTop: '12px' }}>
            {scannerError}
          </p>
        )}

        {isResolving && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#00f2fe', marginTop: '14px', fontSize: '13px', fontWeight: '700' }}>
            <Loader2 className="animate-spin" size={18} />
            <span>Processando crachá lido...</span>
          </div>
        )}

        {/* Botão de Teste e Simulação */}
        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            OU SIMULE A BIPAGEM (TESTE LOCAL):
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => simulateBadgeScan('app')}
              disabled={isResolving}
              style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Crachá App</span>
            </button>

            <button
              type="button"
              onClick={() => simulateBadgeScan('sympla')}
              disabled={isResolving}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <QrCode size={14} />
              <span>Crachá Sympla</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Leads Recentes no Estande */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contatos Coletados Nesta Sessão ({capturedLeads.length})
          </h3>
        </div>

        {capturedLeads.length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Nenhum aluno bipado ainda. Posicione o crachá do participante em frente à câmera para capturar o primeiro lead.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {capturedLeads.map((lead) => (
              <div
                key={lead.participantUid}
                className="glass-panel"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    {lead.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#eab308', fontSize: '12px', fontWeight: '700' }}>
                        <Star size={12} fill="#eab308" />
                        <span>{lead.rating}</span>
                      </div>
                    )}
                    {lead.notes && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        "{lead.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <WhatsAppButton
                    phone={lead.phone}
                    participantName={lead.name}
                    companyName={sponsorName}
                    label="Conversar"
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Pós-Leitura */}
      {activeParticipant && (
        <SponsorLeadModal
          participant={activeParticipant}
          sponsorProfile={userProfile}
          onClose={() => {
            setActiveParticipant(null);
            setTimeout(() => startScanner(), 300);
          }}
          onLeadCaptured={handleLeadCaptured}
        />
      )}
    </div>
  );
}

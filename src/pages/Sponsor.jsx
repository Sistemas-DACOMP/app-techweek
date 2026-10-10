import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Download,
  Search,
  CalendarDays,
  MessageSquare,
  Home,
  Clock,
  MapPin,
  GraduationCap,
  ChevronRight,
  Filter,
  Heart,
  Share2,
  Camera,
  X,
  ArrowUpDown
} from 'lucide-react';
import { GitHubIcon } from '../components/ParticipantCard';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { 
  resolveParticipantFromQr, 
  fetchLeads, 
  updateLead, 
  exportLeadsToCsv 
} from '../lib/sponsorService';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import { subscribeToActivities, DEFAULT_ACTIVITIES } from '../lib/activityService';
import { subscribeToFeedPosts, toggleLikeFeedPost, DEFAULT_FEED_POSTS } from '../lib/feedService';
import SponsorLeadModal from '../components/SponsorLeadModal';
import WhatsAppButton from '../components/WhatsAppButton';
import Mascot from '../components/Mascot';

const isDevMode = import.meta.env.DEV;

export default function Sponsor() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { profile: userProfile } = useUser();

  // Role validation: SPONSOR or ADMIN
  const [devSponsorOverride, setDevSponsorOverride] = useState(false);
  const actualRole = userProfile?.role || authUser?.role || 'PARTICIPANT';
  const hasAccess = actualRole === 'SPONSOR' || actualRole === 'ADMIN' || devSponsorOverride;

  // Perfil e Empresa do Patrocinador (definida no cadastro, sem seletor manual de estande)
  const rawName = userProfile?.name || userProfile?.displayName || authUser?.displayName || authUser?.email?.split('@')[0] || 'Patrocinador';
  const firstName = rawName.trim().split(' ')[0] || rawName;
  const activeCompanyId = userProfile?.companyId || userProfile?.empresa || 'kanastra';
  const sponsorName = userProfile?.companyName || userProfile?.empresa || (activeCompanyId ? activeCompanyId.toUpperCase() : 'Empresa Patrocinadora');

  // Tab State: 'home' | 'leads' | 'scanner' | 'agenda' | 'feed'
  const [activeTab, setActiveTab] = useState('home');

  // Leads CRM State
  const [leadsTab, setLeadsTab] = useState('mine'); // 'mine' | 'company'
  const [myLeads, setMyLeads] = useState([]);
  const [companyLeads, setCompanyLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [starFilter, setStarFilter] = useState('all'); // 'all' | '5' | '4' | '3'
  const [leadSortBy, setLeadSortBy] = useState('recent'); // 'recent' | 'rating' | 'name'

  // Scanner States
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const scannerRef = useRef(null);

  // Modal States
  const [activeParticipant, setActiveParticipant] = useState(null); // Newly scanned attendee
  const [selectedLead, setSelectedLead] = useState(null); // Existing lead being viewed/edited
  const [toastMessage, setToastMessage] = useState(null);

  // Read-only Agenda State
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [selectedDay, setSelectedDay] = useState(null);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaTypeFilter, setAgendaTypeFilter] = useState('all');

  // Feed State
  const [feedPosts, setFeedPosts] = useState(DEFAULT_FEED_POSTS);
  const [feedFilter, setFeedFilter] = useState('ALL'); // 'ALL' | 'ORGANIZATION' | 'SPONSOR'

  // Show Toast helper
  const showToast = useCallback((message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Sensory Vibration helper (Ideia 3)
  const triggerVibration = useCallback((pattern) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {
        // Safe fallback if permission is blocked
      }
    }
  }, []);

  // Classificação rápida de afiliação acadêmica (Ideia 2)
  const getAffiliationBadge = useCallback((lead) => {
    const type = (lead?.participantType || '').toLowerCase();
    const inst = (lead?.instituicao || lead?.institution || '').toLowerCase();
    const course = (lead?.course || '').toLowerCase();

    if (type.includes('pós') || type.includes('pos') || type.includes('mestrado') || type.includes('doutorado') || lead?.postgradInst) {
      return {
        label: 'Pós-Graduação',
        color: '#C084FC',
        bg: 'rgba(192, 132, 252, 0.12)',
        border: 'rgba(192, 132, 252, 0.3)'
      };
    }

    if (type.includes('graduação') || type.includes('graduacao') || type.includes('aluno ufu') || inst.includes('ufu') || course.length > 0) {
      return {
        label: 'Graduação',
        color: '#8FA0FF',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.3)'
      };
    }

    return {
      label: 'Externo',
      color: '#34D399',
      bg: 'rgba(52, 211, 153, 0.12)',
      border: 'rgba(52, 211, 153, 0.3)'
    };
  }, []);

  // 1. Carrega Leads via API
  const loadLeads = useCallback(async (compId = activeCompanyId) => {
    if (!hasAccess) return;
    setIsLoadingLeads(true);
    try {
      const data = await fetchLeads(compId);
      setMyLeads(Array.isArray(data?.myLeads) ? data.myLeads : []);
      setCompanyLeads(Array.isArray(data?.companyLeads) ? data.companyLeads : []);
    } catch (err) {
      console.warn('Erro ao carregar leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  }, [hasAccess, activeCompanyId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // 2. Escuta Atividades da Programação
  useEffect(() => {
    const unsub = subscribeToActivities((list) => {
      if (list && list.length > 0) {
        setActivities(list);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // 3. Escuta Feed da TechWeek
  useEffect(() => {
    const unsub = subscribeToFeedPosts((posts) => {
      if (posts && posts.length > 0) {
        setFeedPosts(posts);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // 4. Scanner Lifecycle: Só roda quando a aba ativa for 'scanner' e nenhum modal estiver aberto
  useEffect(() => {
    if (!hasAccess || activeTab !== 'scanner' || activeParticipant || selectedLead) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [hasAccess, activeTab, activeParticipant, selectedLead]);

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
        () => {}
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
    stopAllMediaTracks();
    setIsScannerActive(false);
  };

  const handleScanSuccess = async (rawData) => {
    if (isResolving || activeParticipant) return;
    setIsResolving(true);
    await stopScanner();

    try {
      const resolved = await resolveParticipantFromQr(rawData);
      if (resolved) {
        triggerVibration([40, 60, 40]);
        setActiveParticipant(resolved);
      } else {
        showToast('Código lido não corresponde a um participante válido.', 'warning');
        setTimeout(() => {
          if (activeTab === 'scanner') startScanner();
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao resolver QR do participante:', err);
      showToast('Erro ao processar leitura do crachá.', 'error');
      setTimeout(() => {
        if (activeTab === 'scanner') startScanner();
      }, 1500);
    } finally {
      setIsResolving(false);
    }
  };

  // Simular leitura com crachá físico do Sympla ou app digital
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
        participantType: 'Aluno UFU Graduação',
        github: 'gmendes'
      },
      {
        participantUid: 'demo_user_2',
        name: 'Camila Rocha',
        course: 'Sistemas de Informação',
        period: 4,
        phone: '(34) 99876-5432',
        email: 'camila.rocha@ufu.br',
        participantType: 'Aluno UFU Graduação',
        github: 'camilarocha'
      },
      {
        participantUid: 'demo_user_3',
        name: 'Lucas Ferreira',
        course: 'Engenharia de Software',
        period: 8,
        phone: '(11) 98765-4321',
        email: 'lucas.ferreira@gmail.com',
        participantType: 'Aluno UFU Pós-Graduação',
        postgradInst: 'FACOM',
        github: 'lucasferreira-dev'
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
        email: candidate.email,
        participantType: candidate.participantType,
        github: candidate.github
      });
    }

    handleScanSuccess(simulatedPayload);
  };

  // Callback ao registrar um novo lead pós-leitura
  const handleLeadCaptured = (newLead) => {
    triggerVibration([60, 40, 60]);
    setMyLeads((prev) => [newLead, ...prev.filter(l => l.participantUid !== newLead.participantUid)]);
    setCompanyLeads((prev) => [newLead, ...prev.filter(l => l.participantUid !== newLead.participantUid)]);
    showToast(`Lead de ${newLead.name} salvo (+50 pontos concedidos)!`, 'success');
  };

  // Callback ao atualizar um lead existente na lista
  const handleLeadUpdated = (updatedLead) => {
    triggerVibration(50);
    setMyLeads((prev) => prev.map(l => l.participantUid === updatedLead.participantUid ? { ...l, ...updatedLead } : l));
    setCompanyLeads((prev) => prev.map(l => l.participantUid === updatedLead.participantUid ? { ...l, ...updatedLead } : l));
    showToast(`Lead de ${updatedLead.name} atualizado!`, 'success');
  };

  // Exportar Leads para CSV
  const handleExportCsv = () => {
    const leadsToExport = leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads;
    if (!leadsToExport || leadsToExport.length === 0) {
      showToast('Nenhum lead disponível para exportação com os filtros atuais.', 'warning');
      return;
    }
    const scopeLabel = leadsTab === 'mine' ? 'meus' : 'todos';
    const success = exportLeadsToCsv(leadsToExport, sponsorName, scopeLabel);
    if (success) {
      showToast(`Planilha CSV (${leadsToExport.length} ${leadsToExport.length === 1 ? 'lead' : 'leads'}) gerada com sucesso!`, 'success');
    }
  };

  // Filtros e Ordenação de Leads (Ideia 1)
  const filterAndSortLeads = useCallback((list) => {
    const filtered = list.filter((lead) => {
      const query = leadsSearch.toLowerCase().trim();
      const matchQuery = !query || (
        (lead.name && lead.name.toLowerCase().includes(query)) ||
        (lead.course && lead.course.toLowerCase().includes(query)) ||
        (lead.phone && lead.phone.includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.notes && lead.notes.toLowerCase().includes(query)) ||
        (lead.github && lead.github.toLowerCase().includes(query))
      );

      const rating = Number(lead.rating) || 0;
      let matchStars = true;
      if (starFilter === '5') matchStars = rating === 5;
      else if (starFilter === '4') matchStars = rating >= 4;
      else if (starFilter === '3') matchStars = rating >= 3;

      return matchQuery && matchStars;
    });

    return [...filtered].sort((a, b) => {
      if (leadSortBy === 'rating') {
        const ratingDiff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (ratingDiff !== 0) return ratingDiff;
        // Critério de desempate: mais recente primeiro
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      }

      if (leadSortBy === 'name') {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      }

      // Default: 'recent' (mais recentes primeiro)
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [leadsSearch, starFilter, leadSortBy]);

  const filteredMyLeads = useMemo(() => filterAndSortLeads(myLeads), [myLeads, filterAndSortLeads]);
  const filteredCompanyLeads = useMemo(() => filterAndSortLeads(companyLeads), [companyLeads, filterAndSortLeads]);

  // Lista de dias únicos na Programação
  const availableDays = useMemo(() => {
    const days = [...new Set(activities.map(a => a.day).filter(Boolean))];
    return days.sort();
  }, [activities]);

  const activeDay = selectedDay || (availableDays.length > 0 ? availableDays[0] : null);

  // Atividades de hoje (para exibição na Home)
  const todayActivities = useMemo(() => {
    if (!activeDay) return activities.slice(0, 3);
    return activities.filter(a => a.day === activeDay).slice(0, 4);
  }, [activities, activeDay]);

  // Atividades filtradas da aba Programação
  const filteredAgendaActivities = useMemo(() => {
    return activities.filter(act => {
      const matchDay = !activeDay || act.day === activeDay;
      const matchType = agendaTypeFilter === 'all' || String(act.type || '').toLowerCase() === agendaTypeFilter.toLowerCase();
      const q = agendaSearch.toLowerCase().trim();
      const matchSearch = !q || (
        (act.title && act.title.toLowerCase().includes(q)) ||
        (act.speaker && act.speaker.toLowerCase().includes(q)) ||
        (act.room && act.room.toLowerCase().includes(q))
      );
      return matchDay && matchType && matchSearch;
    });
  }, [activities, activeDay, agendaTypeFilter, agendaSearch]);

  // Feed filtrado
  const filteredFeedPosts = useMemo(() => {
    if (feedFilter === 'ALL') return feedPosts;
    return feedPosts.filter(p => p.authorRole === feedFilter);
  }, [feedPosts, feedFilter]);

  // 1. Tela de Bloqueio se não for SPONSOR nem ADMIN
  if (!hasAccess) {
    return (
      <div className="page-container animate-fade-in" style={{ paddingBottom: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }}>
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

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EEF1FA', marginBottom: '8px' }}>
          Acesso Restrito: Portal Patrocinador
        </h2>
        <p style={{ color: '#A9B1CC', fontSize: '13px', maxWidth: '340px', lineHeight: '1.6', marginBottom: '24px' }}>
          A rota <strong>/sponsor</strong> é exclusiva para contas com perfil <strong>SPONSOR</strong> ou <strong>ADMIN</strong> credenciadas nos estandes da FACOM TechWeek.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            Voltar para o Início
          </button>

          {isDevMode && (
            <button
              type="button"
              onClick={() => setDevSponsorOverride(true)}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '14px',
                padding: '12px',
                color: '#8FA0FF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} />
              <span>Simular Acesso de Patrocinador (Teste)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '90px', fontFamily: 'Montserrat, sans-serif', maxWidth: '640px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Toast Alert padronizado com DESIGN.md §2.1 & §6 */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="polite"
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
            background: '#1F2A55',
            border: `1px solid ${
              toastMessage.type === 'success'
                ? '#6FD8A6'
                : toastMessage.type === 'warning'
                ? '#F2C46A'
                : '#F59A9A'
            }`,
            color: '#EEF1FA',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(111, 216, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={16} color="#6FD8A6" />
            </div>
          ) : toastMessage.type === 'warning' ? (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(242, 196, 106, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertCircle size={16} color="#F2C46A" />
            </div>
          ) : (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(245, 154, 154, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertCircle size={16} color="#F59A9A" />
            </div>
          )}
          <span style={{ lineHeight: 1.4 }}>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Header Padronizado TechWeek */}
      <header style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#121A36',
                border: '1px solid #1C2548',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EEF1FA',
                cursor: 'pointer',
                flexShrink: 0
              }}
              aria-label="Voltar para o início"
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#FBBF24',
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Building2 size={13} />
                <span>{sponsorName}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadLeads()}
            disabled={isLoadingLeads}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#121A36',
              border: '1px solid #1C2548',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLoadingLeads ? '#8FA0FF' : '#A9B1CC',
              cursor: 'pointer'
            }}
            title="Atualizar dados de leads"
            aria-label="Atualizar dados"
          >
            <RefreshCw size={16} className={isLoadingLeads ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Screen Title Centralizado com Traço de Gradiente (DESIGN.md §3) */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          {activeTab === 'home' ? (
            <>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EEF1FA', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                Olá, {firstName}! Esse é seu estande virtual.
              </h1>
              <div
                style={{
                  width: '28px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, #2563EB, #9B7BFF)',
                  margin: '0 auto'
                }}
              />
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EEF1FA', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {activeTab === 'leads' && 'CRM de Leads'}
                {activeTab === 'scanner' && 'Bipar Crachá'}
                {activeTab === 'agenda' && 'Programação da TechWeek'}
                {activeTab === 'feed' && 'Feed da Comunidade'}
              </h1>
              <div
                style={{
                  width: '28px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, #2563EB, #9B7BFF)',
                  margin: '0 auto'
                }}
              />
            </>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ABA 1: HOME / ESTANDE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Métricas Principais (4 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="glass-panel" style={{ padding: '16px', background: '#121A36', borderRadius: '18px', border: '1px solid #1C2548' }}>
              <div style={{ fontSize: '11px', color: '#A9B1CC', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Leads no Estande
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EEF1FA' }}>
                {companyLeads.length}
              </div>
              <div style={{ fontSize: '11px', color: '#8790AE', marginTop: '4px' }}>
                Total da equipe {sponsorName}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', background: '#121A36', borderRadius: '18px', border: '1px solid #1C2548' }}>
              <div style={{ fontSize: '11px', color: '#A9B1CC', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Meus Leads
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8FA0FF' }}>
                {myLeads.length}
              </div>
              <div style={{ fontSize: '11px', color: '#8790AE', marginTop: '4px' }}>
                Coletados por você
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', background: '#121A36', borderRadius: '18px', border: '1px solid #1C2548' }}>
              <div style={{ fontSize: '11px', color: '#A9B1CC', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                Pontos Concedidos
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399' }}>
                +{companyLeads.length * 50}
              </div>
              <div style={{ fontSize: '11px', color: '#8790AE', marginTop: '4px' }}>
                50 pts por aluno bipado
              </div>
            </div>

            {/* Métrica de Conversão no Cabeçalho do Estande (Ideia 4) */}
            <div className="glass-panel" style={{ padding: '16px', background: '#121A36', borderRadius: '18px', border: '1px solid #1C2548' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#A9B1CC', textTransform: 'uppercase', fontWeight: 700 }}>
                  Leads Qualificados
                </span>
                {companyLeads.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#FBBF24',
                      background: 'rgba(251, 191, 36, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 191, 36, 0.3)'
                    }}
                  >
                    {Math.round((companyLeads.filter(l => (l.rating || 0) >= 4).length / companyLeads.length) * 100)}%
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FBBF24' }}>
                  {companyLeads.filter(l => (l.rating || 0) >= 4).length}
                </span>
                <span style={{ fontSize: '11px', color: '#8790AE' }}>
                  de {companyLeads.length} (4-5 ★)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: '#1A2347',
                  borderRadius: '3px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${companyLeads.length > 0 ? Math.round((companyLeads.filter(l => (l.rating || 0) >= 4).length / companyLeads.length) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Hero Action: Bipar Crachá */}
          <div
            style={{
              padding: '20px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.25))',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            onClick={() => setActiveTab('scanner')}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#8FA0FF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                <Sparkles size={13} />
                <span>Escanear Visitante</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EEF1FA', margin: '0 0 4px' }}>
                Bipar Crachá de Aluno
              </h2>
              <p style={{ fontSize: '12px', color: '#A9B1CC', margin: 0 }}>
                Aponte a câmera para o QR digital ou crachá físico Sympla.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              aria-label="Abrir câmera de escaneamento"
            >
              <QrCode size={26} />
            </button>
          </div>

          {/* Programação de Hoje (Modo Read-Only) */}
          <div style={{ background: '#121A36', borderRadius: '20px', padding: '18px', border: '1px solid #1C2548' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} color="#8FA0FF" />
                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#EEF1FA', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Acontecendo na TechWeek
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('agenda')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FA0FF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Ver tudo</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayActivities.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#8790AE', textAlign: 'center', padding: '12px' }}>
                  Nenhuma atividade programada para agora.
                </div>
              ) : (
                todayActivities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      background: '#1A2347',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      border: '1px solid #1C2548',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#EEF1FA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#A9B1CC', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#8FA0FF" />
                          <span>{act.time}</span>
                        </span>
                        {act.room && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} color="#8FA0FF" />
                            <span>{act.room}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'rgba(37, 99, 235, 0.15)',
                        color: '#8FA0FF',
                        flexShrink: 0
                      }}
                    >
                      {act.type || 'Palestra'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Destaque do Feed */}
          <div style={{ background: '#121A36', borderRadius: '20px', padding: '18px', border: '1px solid #1C2548' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#8FA0FF" />
                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#EEF1FA', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Avisos & Comunidade
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8FA0FF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Abrir feed</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {feedPosts.slice(0, 2).map((post) => (
              <div
                key={post.id}
                style={{
                  background: '#1A2347',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #1C2548',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#EEF1FA' }}>{post.authorName}</span>
                  {post.authorRole === 'ORGANIZATION' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#8FA0FF', background: 'rgba(37, 99, 235, 0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                      Organização
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#A9B1CC', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: LEADS (CRM DO ESTANDE)                                            */}
      {/* ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Caixa de Alternância entre Meus Leads e Todos da Empresa */}
          <div
            role="tablist"
            aria-label="Filtrar escopo dos leads"
            style={{ display: 'flex', background: '#121A36', padding: '4px', borderRadius: '12px', border: '1px solid #1C2548', width: '100%' }}
          >
            <button
              type="button"
              role="tab"
              id="tab-leads-mine"
              aria-selected={leadsTab === 'mine'}
              aria-controls="panel-leads-content"
              onClick={() => setLeadsTab('mine')}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: leadsTab === 'mine' ? '#1F2A55' : 'transparent',
                color: leadsTab === 'mine' ? '#EEF1FA' : '#8790AE',
                transition: 'all 0.15s ease'
              }}
            >
              Meus Leads ({myLeads.length})
            </button>

            <button
              type="button"
              role="tab"
              id="tab-leads-company"
              aria-selected={leadsTab === 'company'}
              aria-controls="panel-leads-content"
              onClick={() => setLeadsTab('company')}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: leadsTab === 'company' ? '#1F2A55' : 'transparent',
                color: leadsTab === 'company' ? '#EEF1FA' : '#8790AE',
                transition: 'all 0.15s ease'
              }}
            >
              Todos da Empresa ({companyLeads.length})
            </button>
          </div>

          {/* Opção de Exportar CSV embaixo da caixa de alternância */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginTop: '-4px' }}>
            <span style={{ fontSize: '12px', color: '#8790AE', fontWeight: 600 }}>
              {leadsSearch.trim() || starFilter !== 'all' ? (
                <>
                  Mostrando <strong style={{ color: '#EEF1FA' }}>{(leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length}</strong> de {leadsTab === 'mine' ? myLeads.length : companyLeads.length} leads
                </>
              ) : leadsTab === 'mine' ? (
                `${myLeads.length} ${myLeads.length === 1 ? 'contato coletado por você' : 'contatos coletados por você'}`
              ) : (
                `${companyLeads.length} ${companyLeads.length === 1 ? 'contato no total da empresa' : 'contatos no total da empresa'}`
              )}
            </span>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={(leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length === 0}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                background: '#1A2347',
                border: '1px solid #1C2548',
                borderRadius: '12px',
                color: (leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length === 0 ? '#6E779A' : '#6FD8A6',
                fontSize: '12px',
                fontWeight: 700,
                cursor: (leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length === 0 ? 'not-allowed' : 'pointer',
                opacity: (leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length === 0 ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Baixar lista de leads formatada para Excel / Google Sheets"
            >
              <Download size={15} />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Barra de Busca e Filtro por Estrelas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#8790AE" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                placeholder="Buscar por nome, curso, telefone ou anotação..."
                aria-label="Buscar leads por nome, curso, telefone ou anotação"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  background: '#131B3A',
                  border: '1.5px solid #26305A',
                  borderRadius: '12px',
                  padding: '10px 38px 10px 38px',
                  color: '#EEF1FA',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {leadsSearch && (
                <button
                  type="button"
                  onClick={() => setLeadsSearch('')}
                  aria-label="Limpar busca"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8790AE',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filtros de Estrelas */}
            <div
              role="group"
              aria-label="Filtro por avaliação de estrelas"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}
            >
              <span style={{ fontSize: '11px', color: '#8790AE', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={12} />
                <span>Nota:</span>
              </span>
              {[
                { id: 'all', label: 'Todas as notas' },
                { id: '5', label: '5 ★' },
                { id: '4', label: '4 ★ ou +' },
                { id: '3', label: '3 ★ ou +' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStarFilter(f.id)}
                  style={{
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: starFilter === f.id ? '1px solid #FBBF24' : '1px solid #1C2548',
                    background: starFilter === f.id ? 'rgba(251, 191, 36, 0.15)' : '#121A36',
                    color: starFilter === f.id ? '#FBBF24' : '#8790AE',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ordenação Rápida dos Leads (Ideia 1) */}
            <div
              role="group"
              aria-label="Opções de ordenação dos leads"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}
            >
              <span style={{ fontSize: '11px', color: '#8790AE', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUpDown size={12} color="#8FA0FF" />
                <span>Ordenar:</span>
              </span>
              {[
                { id: 'recent', label: 'Mais recentes' },
                { id: 'rating', label: 'Maior avaliação' },
                { id: 'name', label: 'Nome (A-Z)' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLeadSortBy(s.id)}
                  style={{
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: leadSortBy === s.id ? '1px solid #2563EB' : '1px solid #1C2548',
                    background: leadSortBy === s.id ? '#1F2A55' : '#121A36',
                    color: leadSortBy === s.id ? '#EEF1FA' : '#8790AE',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Leads */}
          <div
            id="panel-leads-content"
            role="tabpanel"
            aria-labelledby={leadsTab === 'mine' ? 'tab-leads-mine' : 'tab-leads-company'}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {(leadsTab === 'mine' ? myLeads : companyLeads).length === 0 ? (
              <div
                style={{
                  background: '#121A36',
                  borderRadius: '20px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  border: '1px solid #1C2548',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <Mascot size={72} color="blue" isWaving={true} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#EEF1FA', margin: '0 0 8px' }}>
                  {leadsTab === 'mine' ? 'Nenhum lead coletado por você ainda' : 'Nenhum lead registrado pela empresa'}
                </h3>
                <p style={{ fontSize: '13px', color: '#8790AE', margin: '0 0 20px', maxWidth: '320px', lineHeight: 1.5 }}>
                  {leadsTab === 'mine'
                    ? 'Aponte a câmera para o crachá dos estudantes no estande para salvar contatos, notas e avaliações.'
                    : 'Nenhum membro da sua equipe bipou participantes ainda.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('scanner')}
                  style={{
                    minHeight: '44px',
                    padding: '0 20px',
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Camera size={16} />
                  <span>Bipar Primeiro Estudante</span>
                </button>
              </div>
            ) : (leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).length === 0 ? (
              <div
                style={{
                  background: '#121A36',
                  borderRadius: '18px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  border: '1px solid #1C2548'
                }}
              >
                <Search size={32} color="#8790AE" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#EEF1FA', margin: '0 0 6px' }}>
                  Nenhum lead encontrado com estes filtros
                </h3>
                <p style={{ fontSize: '12px', color: '#8790AE', margin: '0 0 16px' }}>
                  Nenhum contato corresponde ao termo "{leadsSearch}" ou à nota selecionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLeadsSearch('');
                    setStarFilter('all');
                  }}
                  style={{
                    minHeight: '44px',
                    padding: '0 16px',
                    background: '#1A2347',
                    border: '1px solid #1C2548',
                    borderRadius: '10px',
                    color: '#8FA0FF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              (leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads).map((lead) => {
                const ratingNum = Number(lead.rating) || 0;
                return (
                  <div
                    key={lead.participantUid || lead.uid || lead.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalhes do lead ${lead.name || 'Aluno'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedLead(lead);
                      }
                    }}
                    style={{
                      background: '#121A36',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: '1px solid #1C2548',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '16px',
                          flexShrink: 0
                        }}
                      >
                        {(lead.name || 'P').charAt(0).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#EEF1FA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lead.name || 'Aluno'}
                          </span>

                          {/* Academic Affiliation Badge */}
                          {(() => {
                            const badge = getAffiliationBadge(lead);
                            return (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: badge.color,
                                  background: badge.bg,
                                  border: `1px solid ${badge.border}`,
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  lineHeight: '1.4'
                                }}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}

                          {/* GitHub Badge */}
                          {lead.github && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#A9B1CC',
                                background: '#1A2347',
                                border: '1px solid #1C2548',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                lineHeight: '1.4'
                              }}
                            >
                              <GitHubIcon size={10} color="#8FA0FF" />
                              <span>@{lead.github.replace(/^@/, '').trim()}</span>
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#A9B1CC', marginTop: '2px' }}>
                          {lead.course && (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lead.course} {lead.period ? `(${lead.period}º)` : ''}
                            </span>
                          )}
                        </div>

                        {/* Avaliação e Notas */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          {ratingNum > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#FBBF24', fontSize: '11px', fontWeight: 700 }}>
                              <Star size={12} fill="#FBBF24" />
                              <span>{ratingNum}</span>
                            </div>
                          )}

                          {lead.notes && (
                            <div style={{ fontSize: '11px', color: '#8790AE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                              "{lead.notes}"
                            </div>
                          )}
                        </div>

                        {leadsTab === 'company' && lead.collectedByEmail && (
                          <div style={{ fontSize: '10px', color: '#6E779A', marginTop: '2px' }}>
                            Bipado por: {lead.collectedByEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ação rápida de WhatsApp no card */}
                    <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {lead.phone ? (
                        <WhatsAppButton
                          phone={lead.phone}
                          participantName={lead.name}
                          companyName={sponsorName}
                          label="Whats"
                          size="sm"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          style={{
                            background: '#1A2347',
                            border: '1px solid #1C2548',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            color: '#8FA0FF',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Ver
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: SCANNER (BIPAR CRACHÁ)                                             */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#121A36', borderRadius: '24px', padding: '20px', border: '1px solid #1C2548', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
              <QrCode size={20} color="#8FA0FF" />
              <h2 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#EEF1FA', margin: 0 }}>
                Leitor Contínuo do Estande
              </h2>
            </div>

            <p style={{ fontSize: '12px', color: '#A9B1CC', margin: '0 0 16px', lineHeight: 1.5 }}>
              Aponte a câmera para o crachá físico Sympla ou crachá digital do app do estudante.
            </p>

            {/* Viewfinder da Câmera */}
            <div
              id="sponsor-qr-reader"
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '0 auto',
                borderRadius: '18px',
                overflow: 'hidden',
                minHeight: '260px',
                background: '#0A0F24',
                border: '2px solid rgba(56, 189, 248, 0.4)'
              }}
            />

            {scannerError && (
              <p style={{ fontSize: '12px', color: '#FBBF24', marginTop: '12px' }}>
                {scannerError}
              </p>
            )}

            {isResolving && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#8FA0FF', marginTop: '14px', fontSize: '13px', fontWeight: 700 }}>
                <Loader2 className="animate-spin" size={18} />
                <span>Processando crachá lido...</span>
              </div>
            )}

            {/* Atalhos de Simulação para Teste DEV */}
            {isDevMode && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1C2548' }}>
                <div style={{ fontSize: '11px', color: '#8790AE', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                  Simulação de Leitura (Ambiente de Teste):
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
                      background: '#1A2347',
                      border: '1px solid #1C2548',
                      borderRadius: '12px',
                      color: '#EEF1FA',
                      fontWeight: 700,
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
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: PROGRAMAÇÃO (READ-ONLY)                                           */}
      {/* ========================================================================= */}
      {activeTab === 'agenda' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seletor de Dias */}
          {availableDays.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {availableDays.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: activeDay === day ? '1px solid #2563EB' : '1px solid #1C2548',
                    background: activeDay === day ? '#1F2A55' : '#121A36',
                    color: activeDay === day ? '#EEF1FA' : '#8790AE',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          {/* Busca e Filtros de Categoria */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#8790AE" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={agendaSearch}
                onChange={(e) => setAgendaSearch(e.target.value)}
                placeholder="Buscar palestras, oficinas ou palestrantes..."
                style={{
                  width: '100%',
                  background: '#131B3A',
                  border: '1.5px solid #26305A',
                  borderRadius: '12px',
                  padding: '10px 14px 10px 38px',
                  color: '#EEF1FA',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {['all', 'palestra', 'workshop', 'minicurso', 'hackathon'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAgendaTypeFilter(type)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: agendaTypeFilter === type ? '1px solid #8FA0FF' : '1px solid #1C2548',
                    background: agendaTypeFilter === type ? 'rgba(37, 99, 235, 0.2)' : '#121A36',
                    color: agendaTypeFilter === type ? '#8FA0FF' : '#8790AE',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {type === 'all' ? 'Todas' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Banner de Modo Leitura */}
          <div style={{ background: '#121A36', borderRadius: '12px', padding: '10px 14px', border: '1px solid #1C2548', fontSize: '11px', color: '#8FA0FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} />
            <span>Modo visualização da grade. As reservas são exclusivas para alunos participantes.</span>
          </div>

          {/* Lista de Atividades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAgendaActivities.length === 0 ? (
              <div style={{ background: '#121A36', borderRadius: '18px', padding: '32px 20px', textAlign: 'center', border: '1px solid #1C2548', color: '#8790AE', fontSize: '13px' }}>
                Nenhuma atividade encontrada para os filtros selecionados.
              </div>
            ) : (
              filteredAgendaActivities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#121A36',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #1C2548',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: 'rgba(37, 99, 235, 0.15)',
                          color: '#8FA0FF',
                          display: 'inline-block',
                          marginBottom: '6px'
                        }}
                      >
                        {act.type || 'Palestra'}
                      </span>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#EEF1FA', margin: 0, lineHeight: 1.3 }}>
                        {act.title}
                      </h3>
                    </div>
                  </div>

                  {act.speaker && (
                    <div style={{ fontSize: '12px', color: '#A9B1CC', fontWeight: 600 }}>
                      {act.speaker} {act.company ? `• ${act.company}` : ''}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#8790AE', marginTop: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} color="#8FA0FF" />
                      <span>{act.time}</span>
                    </span>
                    {act.room && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#8FA0FF" />
                        <span>{act.room}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: FEED (COMUNIDADE)                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filtros do Feed */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ORGANIZATION', label: 'Organização' },
              { id: 'SPONSOR', label: 'Patrocinadores' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedFilter(f.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: feedFilter === f.id ? '1px solid #2563EB' : '1px solid #1C2548',
                  background: feedFilter === f.id ? '#1F2A55' : '#121A36',
                  color: feedFilter === f.id ? '#EEF1FA' : '#8790AE',
                  whiteSpace: 'nowrap'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de Publicações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredFeedPosts.map((post) => {
              const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
              const isLiked = authUser?.uid && Array.isArray(post.likes) && post.likes.includes(authUser.uid);

              return (
                <div
                  key={post.id}
                  style={{
                    background: '#121A36',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #1C2548'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: '#1A2347',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}
                    >
                      {(post.authorName || 'T').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#EEF1FA' }}>{post.authorName}</span>
                        {post.authorRole === 'ORGANIZATION' && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#8FA0FF', background: 'rgba(37, 99, 235, 0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                            Oficial
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8790AE' }}>
                        {post.authorRole === 'SPONSOR' ? 'Patrocinador' : 'TechWeek 2026'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#EEF1FA', margin: '0 0 12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </p>

                  {/* Ações: Curtir */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid #1C2548', paddingTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (authUser?.uid) {
                          toggleLikeFeedPost(post.id, authUser.uid);
                        } else {
                          showToast('Faça login para interagir no feed.', 'warning');
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: isLiked ? '#F59AC0' : '#8790AE',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      <Heart size={16} fill={isLiked ? '#F59AC0' : 'none'} />
                      <span>{likesCount} curtidas</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BARRA INFERIOR EXCLUSIVA DO PATROCINADOR (DESIGN.md)                      */}
      {/* ========================================================================= */}
      <nav
        aria-label="Navegação do Patrocinador"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: '430px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            borderTop: '1px solid #1C2548',
            backgroundColor: '#0D1330',
            paddingTop: '6px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))'
          }}
        >
          {/* 1. Estande */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: activeTab === 'home' ? 800 : 500,
              color: activeTab === 'home' ? '#EEF1FA' : '#8790AE',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <Home size={20} color={activeTab === 'home' ? '#8FA0FF' : 'currentColor'} />
            <span>Estande</span>
          </button>

          {/* 2. Leads */}
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: activeTab === 'leads' ? 800 : 500,
              color: activeTab === 'leads' ? '#EEF1FA' : '#8790AE',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <Users size={20} color={activeTab === 'leads' ? '#8FA0FF' : 'currentColor'} />
            <span>Leads</span>
          </button>

          {/* 3. Bipar (Central) */}
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px',
              fontSize: '11px',
              fontWeight: activeTab === 'scanner' ? 800 : 600,
              color: activeTab === 'scanner' ? '#EEF1FA' : '#8790AE',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <span
              style={{
                marginTop: '-22px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                boxShadow: '0 0 0 4px #0A0F24, 0 6px 18px rgba(91,59,224,0.45)',
                color: '#ffffff'
              }}
            >
              <QrCode size={24} />
            </span>
            <span>Bipar</span>
          </button>

          {/* 4. Programação */}
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: activeTab === 'agenda' ? 800 : 500,
              color: activeTab === 'agenda' ? '#EEF1FA' : '#8790AE',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <CalendarDays size={20} color={activeTab === 'agenda' ? '#8FA0FF' : 'currentColor'} />
            <span>Agenda</span>
          </button>

          {/* 5. Feed */}
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: activeTab === 'feed' ? 800 : 500,
              color: activeTab === 'feed' ? '#EEF1FA' : '#8790AE',
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <MessageSquare size={20} color={activeTab === 'feed' ? '#8FA0FF' : 'currentColor'} />
            <span>Feed</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MODAL 1: NOVO PARTICIPANTE BIPADO                                        */}
      {/* ========================================================================= */}
      {activeParticipant && (
        <SponsorLeadModal
          participant={activeParticipant}
          sponsorProfile={{
            ...userProfile,
            companyId: userProfile?.companyId || activeCompanyId,
            companyName: userProfile?.companyName || userProfile?.empresa || sponsorName
          }}
          isExistingLead={false}
          onClose={() => {
            setActiveParticipant(null);
            if (activeTab === 'scanner') {
              setTimeout(() => startScanner(), 300);
            }
          }}
          onLeadCaptured={handleLeadCaptured}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALHES / EDIÇÃO DE LEAD DO CRM                                 */}
      {/* ========================================================================= */}
      {selectedLead && (
        <SponsorLeadModal
          participant={selectedLead}
          sponsorProfile={{
            ...userProfile,
            companyId: userProfile?.companyId || activeCompanyId,
            companyName: userProfile?.companyName || userProfile?.empresa || sponsorName
          }}
          isExistingLead={true}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </div>
  );
}

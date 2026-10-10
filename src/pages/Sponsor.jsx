import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Building2, 
  ShieldAlert, 
  QrCode, 
  Users, 
  Star, 
  Sparkles, 
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
  ArrowUpDown,
  Flashlight,
  FlashlightOff,
  CameraOff,
  Plus,
  Send,
  Image as ImageIcon,
  Film,
  TrendingUp,
  BarChart3
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
import { 
  subscribeToFeedPosts, 
  createFeedPost, 
  toggleLikeFeedPost, 
  uploadFeedMedia, 
  DEFAULT_FEED_POSTS 
} from '../lib/feedService';
import ActivityModal, { SeatsLight, categoryOf, describeDay } from '../components/ActivityModal';
import { SPONSORS_CONFIG } from '../components/PassportTab';
import { ActivityRow, TYPE_FILTERS, dayOrder, getActivityTimingState } from './Agenda';
import { CameraFrame } from './Scanner';
import { 
  PostCard, 
  FILTERS as FEED_FILTERS, 
  EMPTY_TEXT as FEED_EMPTY_TEXT 
} from './Feed';
import { btn, Kpi, Chip, TypeTag } from './admin/ui';
import SponsorLeadModal from '../components/SponsorLeadModal';
import SponsorSplitView from '../components/sponsor/SponsorSplitView';
import SponsorRoiDashboard from '../components/sponsor/SponsorRoiDashboard';
import SponsorTeamGamification from '../components/sponsor/SponsorTeamGamification';
import WhatsAppButton from '../components/WhatsAppButton';
import Mascot from '../components/Mascot';
import '../styles/cracha.css';
import '../styles/agenda.css';
import '../styles/admin.css';

const isDevMode = import.meta.env.DEV;

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function longDate(now = new Date()) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).replace('-feira', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const AVATAR_BG = ['#2A3570', '#4C2A85', '#1E5A6B', '#7A3A22', '#2C5E3F', '#6B2D5C'];
const bgFor = (s = '') => AVATAR_BG[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length];
const initialsOf = (n = '') => n.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';

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

  // Resolução da Logo Oficial da Empresa Patrocinadora
  const sponsorLogo = useMemo(() => {
    if (userProfile?.companyLogo) return userProfile.companyLogo;
    if (userProfile?.logoUrl) return userProfile.logoUrl;
    const rawKey = (activeCompanyId || userProfile?.companyName || userProfile?.empresa || sponsorName || '').toLowerCase().trim();
    const entry = Object.entries(SPONSORS_CONFIG).find(([k, v]) => {
      return rawKey.includes(k) || k.includes(rawKey) || v.name.toLowerCase().includes(rawKey);
    });
    return entry ? entry[1].logo : null;
  }, [userProfile, activeCompanyId, sponsorName]);

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
  const [leadsViewMode, setLeadsViewMode] = useState('crm'); // 'crm' | 'roi'

  // Scanner States
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef(null);

  // Modal States
  const [activeParticipant, setActiveParticipant] = useState(null); // Newly scanned attendee
  const [selectedLead, setSelectedLead] = useState(null); // Existing lead being viewed/edited
  const [selectedActivityModal, setSelectedActivityModal] = useState(null); // Read-only activity modal
  const [toastMessage, setToastMessage] = useState(null);
  const [validatedCount, setValidatedCount] = useState(0);

  // Read-only Agenda State
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [selectedDay, setSelectedDay] = useState(null);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaTypeFilter, setAgendaTypeFilter] = useState('all');

  // Feed State
  const [feedPosts, setFeedPosts] = useState(DEFAULT_FEED_POSTS);
  const [feedFilter, setFeedFilter] = useState('ALL'); // 'ALL' | 'ORGANIZATION' | 'SPONSOR'
  const [likedPosts, setLikedPosts] = useState({});
  const [popId, setPopId] = useState(null);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null); // { url, type: 'image' | 'video', name }
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef(null);

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
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1
        },
        async (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScannerActive(true);
      setScannerError(null);
      try {
        setTorchSupported(html5Qr.getRunningTrackCameraCapabilities().torchFeature().isSupported());
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      console.warn('Câmera indisponível ou permissão negada:', err);
      setIsScannerActive(false);
      setScannerError('Câmera indisponível ou permissão negada. Você pode utilizar a "Simulação de Leitura" abaixo.');
      stopAllMediaTracks();
    }
  };

  const stopScanner = async () => {
    setIsScannerActive(false);
    setTorchSupported(false);
    setTorchOn(false);
    stopAllMediaTracks();
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
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      await scannerRef.current.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
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
    showToast(`Lead de ${newLead.name} salvo com sucesso!`, 'success');
  };

  // Callback ao somente validar presença/passaporte (sem salvar no CRM)
  const handleValidateOnly = (participant) => {
    triggerVibration([40, 40]);
    setValidatedCount((prev) => prev + 1);
    showToast(`Presença de ${participant?.name || 'participante'} validada com sucesso!`, 'success');
  };

  // Callback ao atualizar um lead existente na lista
  const handleLeadUpdated = (updatedLead) => {
    triggerVibration(50);
    setMyLeads((prev) => prev.map(l => l.participantUid === updatedLead.participantUid ? { ...l, ...updatedLead } : l));
    setCompanyLeads((prev) => prev.map(l => l.participantUid === updatedLead.participantUid ? { ...l, ...updatedLead } : l));
    showToast(`Lead de ${updatedLead.name} atualizado!`, 'success');
  };

  // Callback de persistência direta ao editar no Split-View (Desktop/Tablet)
  const handleUpdateLeadFromSplitView = async (updatedData) => {
    try {
      await updateLead({
        participantUid: updatedData.participantUid,
        rating: updatedData.rating !== undefined ? Number(updatedData.rating) : 0,
        notes: updatedData.notes,
        tags: updatedData.tags,
        companyId: userProfile?.companyId || activeCompanyId
      });
      handleLeadUpdated(updatedData);
    } catch (err) {
      console.error('Erro ao atualizar lead via SplitView:', err);
      showToast('Erro ao salvar alterações do lead.', 'error');
    }
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

  const now = useMemo(() => new Date(), []);

  const qualifiedCount = useMemo(() => {
    return companyLeads.filter(l => (Number(l.rating) || 0) >= 4).length;
  }, [companyLeads]);

  const qualifiedPercent = useMemo(() => {
    return companyLeads.length > 0 ? Math.round((qualifiedCount / companyLeads.length) * 100) : 0;
  }, [companyLeads, qualifiedCount]);

  const recentLeads = useMemo(() => {
    return [...companyLeads].sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    }).slice(0, 4);
  }, [companyLeads]);

  const displayedLeads = leadsTab === 'mine' ? filteredMyLeads : filteredCompanyLeads;

  // Dias do evento a partir das atividades (chips "Qua 21")
  const availableDays = useMemo(() => {
    const ids = [...new Set(activities.map((act) => act.day).filter(Boolean))];
    return ids
      .map((id) => {
        const d = describeDay(id);
        return { id, label: `${d.short} ${d.dayNum}`, ...d };
      })
      .sort((a, b) => dayOrder(a.id) - dayOrder(b.id));
  }, [activities]);

  const todayId = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Programação mostra um dia por vez: o escolhido, senão hoje, senão o primeiro disponível
  const programDay = selectedDay
    || (availableDays.some((d) => d.id === todayId) ? todayId : availableDays[0]?.id)
    || 'all';

  // Atividades de hoje (para exibição na Home)
  const todayActivities = useMemo(() => {
    const dayToUse = availableDays.some((d) => d.id === todayId) ? todayId : (availableDays[0]?.id || null);
    if (!dayToUse) return activities.slice(0, 3);
    return activities.filter((a) => a.day === dayToUse).slice(0, 4);
  }, [activities, availableDays, todayId]);

  // Agrupamento por dia e horário na Programação (idêntico à Agenda do participante)
  const groupedAgendaByDay = useMemo(() => {
    const query = agendaSearch.trim().toLowerCase();
    const visible = activities.filter((act) => {
      if (agendaTypeFilter !== 'all') {
        const actType = String(act.type || 'palestra').toLowerCase().trim();
        if (actType !== agendaTypeFilter) return false;
      }
      if (programDay !== 'all' && act.day !== programDay) return false;
      if (query) {
        const matchTitle = act.title?.toLowerCase().includes(query);
        const matchSpeaker = act.speaker?.toLowerCase().includes(query);
        const matchLoc = (act.location || act.room)?.toLowerCase().includes(query);
        if (!matchTitle && !matchSpeaker && !matchLoc) return false;
      }
      return true;
    });

    const days = new Map();
    visible.forEach((act) => {
      const dayKey = act.day || '';
      const timeKey = act.time || '19:00';
      if (!days.has(dayKey)) days.set(dayKey, new Map());
      const times = days.get(dayKey);
      if (!times.has(timeKey)) times.set(timeKey, []);
      times.get(timeKey).push(act);
    });
    return [...days.entries()]
      .sort(([a], [b]) => dayOrder(a) - dayOrder(b))
      .map(([day, times]) => ({
        day,
        count: [...times.values()].reduce((n, items) => n + items.length, 0),
        slots: [...times.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, items]) => ({ time, items }))
      }));
  }, [activities, agendaTypeFilter, programDay, agendaSearch]);

  // Feed da Comunidade
  const filteredFeedPosts = useMemo(() => {
    return feedPosts.filter((p) => {
      if (feedFilter === 'ORGANIZATION') return p.authorRole === 'ORGANIZATION';
      if (feedFilter === 'SPONSOR') return p.authorRole === 'SPONSOR';
      return true;
    });
  }, [feedPosts, feedFilter]);

  const featuredFeedPost = useMemo(() => {
    if (feedFilter === 'SPONSOR') return null;
    const org = filteredFeedPosts.filter((p) => p.authorRole === 'ORGANIZATION');
    return org.find((p) => p.pinned) || org[0] || null;
  }, [filteredFeedPosts, feedFilter]);

  const timelineFeedPosts = useMemo(() => {
    return featuredFeedPost ? filteredFeedPosts.filter((p) => p !== featuredFeedPost) : filteredFeedPosts;
  }, [filteredFeedPosts, featuredFeedPost]);

  const handleLikeFeed = (post) => {
    const postId = post.id;
    const isCurrentlyLiked = likedPosts[postId] || (authUser?.uid && Array.isArray(post.likes) && post.likes.includes(authUser.uid));

    if (!isCurrentlyLiked) setPopId(postId);

    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !isCurrentlyLiked
    }));

    setFeedPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const currentLikes = Array.isArray(p.likes) ? p.likes : [];
          const updatedLikes = isCurrentlyLiked
            ? currentLikes.filter((id) => id !== (authUser?.uid || 'temp-id'))
            : [...currentLikes, authUser?.uid || 'temp-id'];
          return { ...p, likes: updatedLikes };
        }
        return p;
      })
    );

    if (authUser?.uid) {
      toggleLikeFeedPost(postId, authUser.uid);
    }
  };

  const handleShareFeed = (post) => {
    const authorName = post.author || post.authorName || 'TechWeek';
    if (navigator.share) {
      navigator.share({
        title: `FACOM TechWeek 2026 - ${authorName}`,
        text: post.content,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${authorName}: ${post.content}`);
      showToast('Link e mensagem copiados para a área de transferência!', 'success');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      showToast('Selecione um arquivo de foto ou vídeo válido.', 'warning');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedMediaFile(file);
    setMediaPreview({
      url: previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name
    });
    setNewPostImageUrl('');
  };

  const handleRemoveMedia = () => {
    setSelectedMediaFile(null);
    if (mediaPreview?.url && mediaPreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsPublishing(true);
    try {
      let finalMediaUrl = newPostImageUrl.trim();
      let finalMediaType = finalMediaUrl ? 'image' : '';

      if (selectedMediaFile) {
        setIsUploadingMedia(true);
        const uploadRes = await uploadFeedMedia(selectedMediaFile);
        finalMediaUrl = uploadRes.url;
        finalMediaType = uploadRes.mediaType;
        setIsUploadingMedia(false);
      }

      await createFeedPost({
        author: sponsorName,
        authorRole: 'SPONSOR',
        authorAvatar: userProfile?.avatarUrl || userProfile?.photoURL || '',
        content: newPostContent.trim(),
        imageUrl: finalMediaType === 'image' ? finalMediaUrl : '',
        videoUrl: finalMediaType === 'video' ? finalMediaUrl : '',
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        pinned: false
      });

      setNewPostContent('');
      setNewPostImageUrl('');
      handleRemoveMedia();
      setIsNewPostOpen(false);
      showToast('Publicação enviada com sucesso para o Feed!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao publicar: ' + (err.message || 'Tente novamente.'), 'error');
    } finally {
      setIsPublishing(false);
      setIsUploadingMedia(false);
    }
  };

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
    <div 
      className="page-container animate-fade-in" 
      style={{ 
        paddingBottom: '90px', 
        fontFamily: 'Montserrat, sans-serif', 
        maxWidth: (activeTab === 'leads' || activeTab === 'home') ? '1240px' : '720px', 
        margin: '0 auto', 
        boxSizing: 'border-box',
        transition: 'max-width 0.2s ease'
      }}
    >
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
        {/* Saudação e Caixa de Boas-Vindas com Oi e Logo Branca Monocromática */}
        {activeTab === 'home' ? (
          <div className="mb-5 rounded-[20px] bg-surface border border-line p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Mascot style={{ width: 46, height: 46, animation: 'none', flexShrink: 0 }} isWaving={true} color="blue" />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-link block truncate">
                    Estande {sponsorName}
                  </span>
                  <h1 className="m-0 text-[19px] sm:text-[21px] font-extrabold tracking-[-0.01em] text-[#EEF1FA] truncate">
                    Oi, {firstName}!
                  </h1>
                  <p className="m-0 mt-0.5 text-[12px] sm:text-[13px] text-text-2 truncate">
                    {longDate(now)} · {companyLeads.length} {companyLeads.length === 1 ? 'lead coletado' : 'leads coletados'}
                  </p>
                </div>
              </div>

              {/* Logo Oficial da Empresa monocromática branca no fundo escuro */}
              {sponsorLogo ? (
                <div className="shrink-0 flex items-center justify-end max-w-[120px] sm:max-w-[150px]">
                  <img
                    src={sponsorLogo}
                    alt={sponsorName}
                    className="max-h-8 sm:max-h-9 max-w-full object-contain"
                    style={{
                      filter: 'brightness(0) invert(1)',
                      opacity: 0.95,
                    }}
                  />
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-end">
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-text-2 border border-line px-2.5 py-1 rounded-lg">
                    {sponsorName}
                  </span>
                </div>
              )}
            </div>

            {/* Ações Rápidas integradas */}
            <div className="flex items-center gap-2 pt-1 border-t border-line/60">
              <button
                type="button"
                className={btn('action', 'flex-1 min-w-[120px] h-10 text-[13px]')}
                onClick={() => setActiveTab('scanner')}
              >
                <QrCode size={16} aria-hidden="true" />
                <span>Bipar crachá</span>
              </button>
              <button
                type="button"
                className={btn('secondary', 'flex-1 min-w-[100px] h-10 text-[13px]')}
                onClick={() => setActiveTab('leads')}
              >
                <Users size={16} aria-hidden="true" />
                <span>Leads ({companyLeads.length})</span>
              </button>
              <button
                type="button"
                className={btn('secondary', 'h-10 px-3 text-[13px]')}
                onClick={handleExportCsv}
                disabled={companyLeads.length === 0}
                title="Exportar leads em CSV"
              >
                <Download size={15} aria-hidden="true" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EEF1FA', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {activeTab === 'leads' && 'CRM de Leads'}
              {activeTab === 'scanner' && 'Bipar Crachá'}
              {activeTab === 'agenda' && 'Programação da TechWeek'}
              {activeTab === 'feed' && 'Feed'}
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
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* ABA 1: HOME / ESTANDE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <div className="animate-fade-in flex flex-col gap-4">
          {/* Métricas Principais (Padrão Kpi do Admin) */}
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi
              label="Leads no Estande"
              value={companyLeads.length}
              hint={`Total da equipe ${sponsorName}`}
              accent="var(--link)"
            />
            <Kpi
              label="Meus Leads"
              value={myLeads.length}
              hint="Coletados por você"
              accent="#C4B5FD"
            />
            <Kpi
              label="Visitas Validadas"
              value={companyLeads.length + validatedCount}
              hint="Passaportes carimbados"
              accent="var(--ok)"
            />
            <Kpi
              label="Leads Qualificados"
              value={qualifiedCount}
              hint={`${qualifiedPercent}% de ${companyLeads.length} (4-5 ★)`}
              accent="var(--warn)"
            >
              <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <span
                  className="block h-full rounded-full bg-warn transition-all duration-300"
                  style={{ width: `${qualifiedPercent}%` }}
                />
              </span>
            </Kpi>
          </div>

          {/* Gamificação da Equipe do Estande (Metas, Ranking de Bipagem e Engajamento) */}
          <SponsorTeamGamification
            leads={companyLeads}
            currentUserEmail={authUser?.email || userProfile?.email}
            sponsorGoal={50}
          />

          {/* Hero Action: Bipar Crachá */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab('scanner')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('scanner');
              }
            }}
            className="press flex cursor-pointer items-center justify-between gap-3.5 rounded-[20px] bg-surface p-4 border border-line hover:border-link transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-link">
                <Sparkles size={13} aria-hidden="true" />
                <span>Escanear Visitante</span>
              </div>
              <h2 className="m-0 mt-1 text-[16px] font-extrabold text-[#EEF1FA]">
                Bipar Crachá de Aluno
              </h2>
              <p className="m-0 mt-0.5 text-[12px] text-text-3">
                Aponte a câmera para o QR digital ou crachá físico Sympla.
              </p>
            </div>

            <button
              type="button"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-action text-white shadow-lg shadow-action/25"
              aria-label="Abrir câmera de escaneamento"
            >
              <QrCode size={24} aria-hidden="true" />
            </button>
          </div>

          {/* Leads Recentes no Estande ("À Mostra" diretamente na Home) */}
          <div className="rounded-[20px] bg-surface p-4 border border-line">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-link" aria-hidden="true" />
                <h2 className="m-0 text-[13px] font-extrabold uppercase tracking-wider text-[#EEF1FA]">
                  Leads Recentes no Estande
                </h2>
              </div>
              {companyLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className="flex items-center gap-1 text-[12px] font-bold text-link hover:underline"
                >
                  <span>Ver todos ({companyLeads.length})</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-6 text-center">
                <p className="m-0 text-[13px] text-text-3">
                  Nenhum lead coletado ainda. Aponte a câmera para os crachás no estande!
                </p>
                <button
                  type="button"
                  className={btn('action', 'mt-3 h-10 px-4 text-[12px]')}
                  onClick={() => setActiveTab('scanner')}
                >
                  <QrCode size={15} aria-hidden="true" />
                  <span>Bipar primeiro visitante</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentLeads.map((lead) => {
                  const ratingNum = Number(lead.rating) || 0;
                  const affiliation = getAffiliationBadge(lead);
                  return (
                    <div
                      key={lead.participantUid || lead.uid || lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedLead(lead);
                        }
                      }}
                      className="press flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-raised p-3 border border-line hover:border-line-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                          style={{ backgroundColor: bgFor(lead.name || lead.email || 'L') }}
                        >
                          {initialsOf(lead.name || 'Aluno')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate text-[14px] font-bold text-[#EEF1FA]">
                              {lead.name || 'Aluno'}
                            </span>
                            {affiliation && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ color: affiliation.color, backgroundColor: affiliation.bg, border: `1px solid ${affiliation.border}` }}
                              >
                                {affiliation.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-text-3 mt-0.5">
                            {lead.course && <span className="truncate">{lead.course}</span>}
                            {ratingNum > 0 && (
                              <span className="flex items-center gap-1 font-bold text-warn">
                                <Star size={11} fill="currentColor" /> {ratingNum}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
                            className={btn('secondary', 'h-8 px-2.5 text-[11px]')}
                            onClick={() => setSelectedLead(lead)}
                          >
                            Ver
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Programação de Hoje (Modo Read-Only) */}
          <div className="rounded-[20px] bg-surface p-4 border border-line">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={17} className="text-link" aria-hidden="true" />
                <h2 className="m-0 text-[13px] font-extrabold uppercase tracking-wider text-[#EEF1FA]">
                  Acontecendo na TechWeek
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('agenda')}
                className="flex items-center gap-1 text-[12px] font-bold text-link hover:underline"
              >
                <span>Ver tudo</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {todayActivities.length === 0 ? (
                <p className="m-0 py-3 text-center text-[12px] text-text-3">
                  Nenhuma atividade programada para agora.
                </p>
              ) : (
                todayActivities.map((act) => (
                  <div
                    key={act.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedActivityModal(act)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedActivityModal(act);
                      }
                    }}
                    className="press flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-raised p-3 border border-line hover:border-line-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-[#EEF1FA]">
                        {act.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2.5 text-[11px] text-text-3">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-link" />
                          <span>{act.time}</span>
                        </span>
                        {(act.room || act.location) && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} className="text-link" />
                            <span className="truncate">{act.room || act.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <TypeTag type={act.type || 'palestra'} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Destaque do Feed */}
          <div className="rounded-[20px] bg-surface p-4 border border-line">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={17} className="text-link" aria-hidden="true" />
                <h2 className="m-0 text-[13px] font-extrabold uppercase tracking-wider text-[#EEF1FA]">
                  Avisos & Comunidade
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className="flex items-center gap-1 text-[12px] font-bold text-link hover:underline"
              >
                <span>Abrir feed</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            {feedPosts.slice(0, 2).map((post) => (
              <div
                key={post.id}
                className="mb-2 rounded-2xl bg-surface-raised p-3 border border-line last:mb-0"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[#EEF1FA]">{post.authorName || post.author}</span>
                  {post.authorRole === 'ORGANIZATION' && (
                    <span className="rounded bg-link/15 px-1.5 py-0.5 text-[10px] font-bold text-link">
                      Organização
                    </span>
                  )}
                </div>
                <p className="m-0 text-[12px] text-text-2 line-clamp-2 leading-relaxed">
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
        <div className="animate-fade-in flex flex-col gap-4">
          {/* Alternador de Modo: CRM de Coleta vs Relatório Executivo ROI */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLeadsViewMode('crm')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
                  leadsViewMode === 'crm'
                    ? 'bg-link text-white shadow-xs'
                    : 'bg-transparent text-text-3 hover:text-text hover:bg-surface-raised/50'
                }`}
              >
                <Users size={16} />
                <span>CRM de Coleta</span>
              </button>
              <button
                type="button"
                onClick={() => setLeadsViewMode('roi')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${
                  leadsViewMode === 'roi'
                    ? 'bg-link text-white shadow-xs'
                    : 'bg-transparent text-text-3 hover:text-text hover:bg-surface-raised/50'
                }`}
              >
                <TrendingUp size={16} />
                <span>Relatório Executivo ROI</span>
              </button>
            </div>

            {leadsViewMode === 'crm' && (
              <div className="text-[12px] text-text-3 font-medium hidden sm:block pr-2">
                {companyLeads.length} {companyLeads.length === 1 ? 'lead registrado' : 'leads registrados'}
              </div>
            )}
          </div>

          {leadsViewMode === 'roi' ? (
            <SponsorRoiDashboard
              leads={leadsTab === 'mine' ? myLeads : companyLeads}
              companyName={sponsorName}
              companyLogo={sponsorLogo}
              totalEventAttendees={600}
            />
          ) : (
            <>
              {/* Caixa Segmentada entre Meus Leads e Toda a Empresa (Padrão Design System §5 e §9) */}
              <div role="tablist" aria-label="Filtrar escopo dos leads" className="ds-tabs w-full border border-line bg-surface p-1 rounded-2xl">
            <button
              type="button"
              role="tab"
              id="tab-leads-mine"
              aria-selected={leadsTab === 'mine'}
              aria-controls="panel-leads-content"
              onClick={() => setLeadsTab('mine')}
              className={`ds-tab flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-[13px] font-bold transition-all duration-150 ${
                leadsTab === 'mine'
                  ? 'bg-surface-selected text-text border border-line-2/80 shadow-xs'
                  : 'text-text-3 hover:text-text-2 hover:bg-surface-raised/50 border border-transparent'
              }`}
            >
              <span>Meus Leads</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  leadsTab === 'mine'
                    ? 'bg-surface-raised text-text border border-line-2/50'
                    : 'bg-surface-raised/50 text-text-3'
                }`}
              >
                {myLeads.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-leads-company"
              aria-selected={leadsTab === 'company'}
              aria-controls="panel-leads-content"
              onClick={() => setLeadsTab('company')}
              className={`ds-tab flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-[13px] font-bold transition-all duration-150 ${
                leadsTab === 'company'
                  ? 'bg-surface-selected text-text border border-line-2/80 shadow-xs'
                  : 'text-text-3 hover:text-text-2 hover:bg-surface-raised/50 border border-transparent'
              }`}
            >
              <span>Toda a Empresa</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  leadsTab === 'company'
                    ? 'bg-surface-raised text-text border border-line-2/50'
                    : 'bg-surface-raised/50 text-text-3'
                }`}
              >
                {companyLeads.length}
              </span>
            </button>
          </div>

          {/* Desktop / Tablet Booth OS: Split-View Master-Detail (visível em telas grandes: hidden lg:block) */}
          <div className="hidden lg:block">
            <SponsorSplitView
              leads={leadsTab === 'mine' ? myLeads : companyLeads}
              selectedLead={selectedLead}
              onSelectLead={setSelectedLead}
              onUpdateLead={handleUpdateLeadFromSplitView}
              companyName={sponsorName}
              isLoading={isLoadingLeads}
            />
          </div>

          {/* Modo Lista / Mobile (visível abaixo de lg: lg:hidden) */}
          <div className="lg:hidden flex flex-col gap-4">
            {/* Opção de Exportar CSV embaixo da caixa de alternância */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-[13px] font-medium text-text-3">
              {leadsSearch.trim() || starFilter !== 'all' ? (
                <>
                  Mostrando <strong className="font-bold text-text">{displayedLeads.length}</strong> de {leadsTab === 'mine' ? myLeads.length : companyLeads.length} leads
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
              disabled={displayedLeads.length === 0}
              className={`${btn('secondary')} h-9 px-3.5 text-[12px] font-bold`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: displayedLeads.length === 0 ? 'var(--text-3)' : 'var(--ok)'
              }}
              title="Baixar lista de leads formatada para Excel / Google Sheets"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Campo de Busca refinado (Padrão AdminPessoas) */}
          <div className="flex flex-col gap-2.5">
            <label className="flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Buscar leads por nome, curso, telefone ou anotação</span>
              <input
                type="search"
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                placeholder="Buscar por nome, curso, telefone ou anotação..."
                className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-text-3"
              />
              {leadsSearch && (
                <button
                  type="button"
                  onClick={() => setLeadsSearch('')}
                  aria-label="Limpar busca"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:text-text"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            {/* Filtros de Estrelas (Primeira linha de filtros com degradê azul e roxo padrão no selecionado) */}
            <div
              className="adm-noscroll flex items-center gap-2 overflow-x-auto pb-1"
              role="group"
              aria-label="Filtro por avaliação de estrelas"
            >
              <span className="flex items-center gap-1 text-[11px] font-bold text-text-3 whitespace-nowrap">
                <Filter size={12} />
                <span>Nota:</span>
              </span>
              {[
                { id: 'all', label: 'Todas as notas' },
                { id: '5', label: '5 ★' },
                { id: '4', label: '4 ★+' },
                { id: '3', label: '3 ★+' }
              ].map((f) => {
                const isSelected = starFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setStarFilter(f.id)}
                    className={`press inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[14px] font-bold transition-all ${
                      isSelected
                        ? 'border-0 text-white shadow-[0_2px_10px_rgba(37,99,235,0.35)]'
                        : 'border border-line-2 bg-transparent text-text hover:border-text-3'
                    }`}
                    style={
                      isSelected
                        ? { background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }
                        : undefined
                    }
                  >
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Ordenação Rápida dos Leads */}
            <div
              className="adm-noscroll flex items-center gap-2 overflow-x-auto pb-1"
              role="group"
              aria-label="Opções de ordenação dos leads"
            >
              <span className="flex items-center gap-1 text-[11px] font-bold text-text-3 whitespace-nowrap">
                <ArrowUpDown size={12} color="var(--link)" />
                <span>Ordenar:</span>
              </span>
              {[
                { id: 'recent', label: 'Mais recentes' },
                { id: 'rating', label: 'Maior avaliação' },
                { id: 'name', label: 'Nome (A-Z)' }
              ].map((s) => (
                <Chip key={s.id} selected={leadSortBy === s.id} onClick={() => setLeadSortBy(s.id)}>
                  <span>{s.label}</span>
                </Chip>
              ))}
            </div>
          </div>

          {/* Lista e Tabela de Leads */}
          <div
            id="panel-leads-content"
            role="region"
            aria-label="Lista de contatos do estande"
            className="flex flex-col gap-2.5"
          >
            {(leadsTab === 'mine' ? myLeads : companyLeads).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[20px] bg-surface p-8 text-center border border-line">
                <div className="mb-4">
                  <Mascot size={72} color="blue" isWaving={true} />
                </div>
                <h3 className="mb-2 text-[15px] font-extrabold text-text">
                  {leadsTab === 'mine' ? 'Nenhum lead coletado por você ainda' : 'Nenhum lead registrado pela empresa'}
                </h3>
                <p className="mb-5 max-w-[320px] text-[13px] leading-relaxed text-text-3">
                  {leadsTab === 'mine'
                    ? 'Aponte a câmera para o crachá dos estudantes no estande para salvar contatos, notas e avaliações.'
                    : 'Nenhum membro da sua equipe bipou participantes ainda.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('scanner')}
                  className={`${btn('action')} inline-flex items-center gap-2 text-[13px] font-extrabold`}
                >
                  <Camera size={16} />
                  <span>Bipar Primeiro Estudante</span>
                </button>
              </div>
            ) : displayedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[18px] bg-surface p-7 text-center border border-line">
                <Search size={32} className="mx-auto mb-3 text-text-3" />
                <h3 className="mb-1 text-[14px] font-bold text-text">
                  Nenhum lead encontrado com estes filtros
                </h3>
                <p className="mb-4 text-[12px] text-text-3">
                  Nenhum contato corresponde ao termo "{leadsSearch}" ou à nota selecionada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLeadsSearch('');
                    setStarFilter('all');
                  }}
                  className={`${btn('secondary')} text-[12px] font-bold`}
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <>
                {/* Tabela Desktop / Tablet (hidden md:block) */}
                <div className="hidden overflow-x-auto rounded-[20px] bg-surface px-3 pb-2 pt-4 md:block border border-line">
                  <table className="w-full min-w-[650px] border-collapse text-left">
                    <thead>
                      <tr className="text-[12px] text-text-3">
                        <th className="px-3 pb-3 font-bold">Estudante</th>
                        <th className="px-3 pb-3 font-bold">Vínculo / Curso</th>
                        <th className="px-3 pb-3 font-bold">Avaliação</th>
                        <th className="px-3 pb-3 font-bold">Anotação</th>
                        {leadsTab === 'company' && <th className="px-3 pb-3 font-bold">Coletor</th>}
                        <th className="px-3 pb-3 font-bold text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLeads.map((lead) => {
                        const ratingNum = Number(lead.rating) || 0;
                        const badge = getAffiliationBadge(lead);
                        const leadName = lead.name || 'Estudante';
                        return (
                          <tr
                            key={lead.participantUid || lead.uid || lead.id}
                            className="border-t border-line hover:bg-white/[0.02] cursor-pointer transition-colors"
                            onClick={() => setSelectedLead(lead)}
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  aria-hidden="true"
                                  className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                                  style={{ width: 38, height: 38, background: bgFor(leadName) }}
                                >
                                  {initialsOf(leadName)}
                                </span>
                                <div className="min-w-0">
                                  <span className="block text-[14px] font-bold text-text truncate max-w-[170px]">{leadName}</span>
                                  {lead.github && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-text-3">
                                      <GitHubIcon size={10} color="var(--link)" />
                                      <span>@{lead.github.replace(/^@/, '').trim()}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-1 items-start">
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
                                {lead.course && (
                                  <span className="text-[12px] text-text-3 truncate max-w-[140px]">
                                    {lead.course} {lead.period ? `(${lead.period}º)` : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {ratingNum > 0 ? (
                                <div className="inline-flex items-center gap-1 text-warn font-bold text-[13px]">
                                  <Star size={13} fill="#FBBF24" />
                                  <span>{ratingNum}★</span>
                                </div>
                              ) : (
                                <span className="text-[12px] text-text-3">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {lead.notes ? (
                                <span className="block text-[12px] text-text-2 italic truncate max-w-[150px]" title={lead.notes}>
                                  "{lead.notes}"
                                </span>
                              ) : (
                                <span className="text-[12px] text-text-3 italic">Sem notas</span>
                              )}
                            </td>
                            {leadsTab === 'company' && (
                              <td className="px-3 py-3 text-[11px] text-text-3 truncate max-w-[120px]">
                                {lead.collectedByName || lead.collectedByEmail || '—'}
                              </td>
                            )}
                            <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                                  className={`${btn('secondary')} h-8 px-2.5 text-[11px] font-bold`}
                                >
                                  Ver
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Lista Mobile (md:hidden) */}
                <div className="flex flex-col gap-2.5 md:hidden">
                  {displayedLeads.map((lead) => {
                    const ratingNum = Number(lead.rating) || 0;
                    const badge = getAffiliationBadge(lead);
                    const leadName = lead.name || 'Estudante';
                    return (
                      <div
                        key={lead.participantUid || lead.uid || lead.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver detalhes do lead ${leadName}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedLead(lead);
                          }
                        }}
                        className="flex items-center justify-between gap-3 rounded-[16px] bg-surface p-3.5 border border-line cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            aria-hidden="true"
                            className="flex shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                            style={{ width: 42, height: 42, background: bgFor(leadName) }}
                          >
                            {initialsOf(leadName)}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-bold text-text truncate max-w-[150px]">
                                {leadName}
                              </span>
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
                              {lead.github && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-text-3">
                                  <GitHubIcon size={10} color="var(--link)" />
                                  <span>@{lead.github.replace(/^@/, '').trim()}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-text-3 mt-0.5">
                              {lead.course && (
                                <span className="truncate max-w-[160px]">
                                  {lead.course} {lead.period ? `(${lead.period}º)` : ''}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              {ratingNum > 0 && (
                                <div className="inline-flex items-center gap-1 text-warn text-[11px] font-bold">
                                  <Star size={11} fill="#FBBF24" />
                                  <span>{ratingNum}★</span>
                                </div>
                              )}
                              {lead.notes && (
                                <div className="text-[11px] text-text-3 italic truncate max-w-[150px]">
                                  "{lead.notes}"
                                </div>
                              )}
                            </div>

                            {leadsTab === 'company' && lead.collectedByEmail && (
                              <div className="text-[10px] text-text-3 mt-1">
                                Bipado por: {lead.collectedByName || lead.collectedByEmail}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
                              className={`${btn('secondary')} h-8 px-2.5 text-[11px] font-bold`}
                            >
                              Ver
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    )}
  </div>
)}

      {/* ========================================================================= */}
      {/* ABA 3: SCANNER (BIPAR CRACHÁ)                                             */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <section
            aria-label="Câmera do Estande"
            className="relative h-[340px] overflow-hidden rounded-[26px] bg-[radial-gradient(120%_90%_at_50%_40%,#2B3157_0%,#11152A_70%)]"
          >
            <div aria-hidden="true" className="cracha-stripes absolute inset-0" />
            {/* Elemento de montagem do Html5Qrcode */}
            <div id="sponsor-qr-reader" />

            {scannerError ? (
              <div className="absolute inset-0 z-[9] flex flex-col items-center justify-center gap-2 px-8 text-center">
                <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#1F2A55] text-[#A9B1CC]">
                  <CameraOff size={22} aria-hidden="true" />
                </span>
                <span className="text-[15px] font-extrabold text-[#EEF1FA]">Câmera indisponível</span>
                <span className="text-[13px] leading-snug text-[#A9B1CC]">
                  Permita o acesso à câmera nas configurações do navegador para ler o crachá dos estudantes.
                </span>
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="press mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1A2347] px-4 text-xs font-bold text-[#EEF1FA] border border-[#1C2548]"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Tentar de novo
                </button>
              </div>
            ) : (
              <>
                <CameraFrame live={isScannerActive && !isResolving} />
                <div aria-live="polite" className="absolute inset-x-0 bottom-[18px] z-[9] text-center text-sm font-semibold text-[#E0E7FF]">
                  {isResolving ? 'Lendo o código…' : isScannerActive ? 'Aponte para o crachá do participante' : 'Abrindo a câmera…'}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={toggleTorch}
              disabled={!torchSupported}
              aria-pressed={torchSupported ? torchOn : undefined}
              aria-label={torchSupported ? (torchOn ? 'Desligar lanterna' : 'Ligar lanterna') : 'Lanterna indisponível neste aparelho'}
              className="press absolute top-3.5 right-3.5 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(10,15,36,0.55)] text-[#EEF1FA] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {torchOn ? <FlashlightOff size={20} aria-hidden="true" /> : <Flashlight size={20} aria-hidden="true" />}
            </button>
          </section>

          {/* O que dá para escanear no estande */}
          <section aria-labelledby="sponsor-scannables" style={{ marginTop: '4px' }}>
            <h2 id="sponsor-scannables" style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8790AE', margin: '0 0 10px' }}>
              O que você pode escanear
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#121A36', borderRadius: '16px', padding: '12px 14px', border: '1px solid #1C2548' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8FA0FF', flexShrink: 0 }}>
                  <QrCode size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#EEF1FA' }}>Crachá Digital TechWeek</span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#8790AE', marginTop: '1px' }}>QR Code no app do estudante com perfil acadêmico e GitHub</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#121A36', borderRadius: '16px', padding: '12px 14px', border: '1px solid #1C2548' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', flexShrink: 0 }}>
                  <GraduationCap size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#EEF1FA' }}>Crachá Físico Sympla</span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#8790AE', marginTop: '1px' }}>Código impresso da credencial no pescoço do aluno</span>
                </div>
              </div>
            </div>
          </section>

          {/* Simulação de leitura em ambiente de desenvolvimento */}
          {isDevMode && (
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: '#8790AE', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                Ambiente de Testes / Simulação:
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
                  <span>Simular Crachá App</span>
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
                  <span>Simular Crachá Sympla</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: PROGRAMAÇÃO (READ-ONLY)                                           */}
      {/* ========================================================================= */}
      {activeTab === 'agenda' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Campo de Busca */}
          <label className="field flex h-11 items-center gap-2.5 px-3.5 bg-[#131B3A] border border-[#26305A] rounded-xl">
            <Search size={18} aria-hidden="true" className="shrink-0 text-[#8790AE]" />
            <input
              type="search"
              aria-label="Buscar atividade"
              placeholder="Buscar atividade, palestrante ou sala"
              value={agendaSearch}
              onChange={(e) => setAgendaSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#EEF1FA] outline-none placeholder:text-[#8790AE] [&::-webkit-search-cancel-button]:hidden"
            />
            {agendaSearch && (
              <button
                type="button"
                onClick={() => setAgendaSearch('')}
                aria-label="Limpar busca"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-[#8790AE]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>

          {/* Chips de Dias ("Qua 21", "Qui 22", etc.) */}
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Dia">
            {availableDays.map((d) => {
              const selected = d.id === programDay;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedDay(d.id)}
                  className={`press h-[38px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] ${
                    selected
                      ? 'bg-[linear-gradient(135deg,#2563EB,#5B3BE0)] font-extrabold text-white'
                      : 'border border-field-line font-semibold text-text'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Filtro por tipo de atividade */}
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Tipo de atividade">
            {TYPE_FILTERS.map((type) => {
              const selected = agendaTypeFilter === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAgendaTypeFilter(type.id)}
                  className={`press inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] ${
                    selected ? 'bg-text font-bold text-bg' : 'border border-field-line font-semibold text-text'
                  }`}
                >
                  {type.id !== 'all' && !selected && (
                    <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: categoryOf(type).accent }} />
                  )}
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Banner Modo Leitura */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 text-xs font-semibold text-text-2">
            <CheckCircle2 size={16} className="text-ok shrink-0" />
            <span>Modo visualização da grade. As reservas presenciais são exclusivas para participantes.</span>
          </div>

          {/* Linha do Tempo Agrupada (Grid 52px 1fr) */}
          {groupedAgendaByDay.length === 0 ? (
            <div className="px-3 pt-12 text-center">
              <p className="text-[15px] font-bold text-[#EEF1FA]">Nenhuma atividade com esses filtros</p>
              <p className="mt-1.5 text-sm text-text-2">Tente outro dia, outro tipo ou outra busca.</p>
              <button
                type="button"
                onClick={() => {
                  setAgendaSearch('');
                  setAgendaTypeFilter('all');
                  setSelectedDay(null);
                }}
                className="btn btn-secondary btn-sm mt-4"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            groupedAgendaByDay.map(({ day, count, slots }) => {
              return (
                <section key={day || 'sem-dia'} className="relative mt-2">
                  <span aria-hidden="true" className="absolute bottom-3 left-[61px] top-2 w-0.5 bg-line" />
                  {slots.map(({ time, items }) => {
                    const timings = items.map((act) => getActivityTimingState(act, 'NONE'));
                    return (
                      <div key={time} className="grid grid-cols-[52px_1fr] gap-2.5">
                        <span className={`block pt-3.5 text-sm font-extrabold ${timings.includes('CURRENT') ? 'text-text' : 'text-text-2'}`}>
                          {time}
                        </span>
                        <div className="flex flex-col gap-2.5 pb-3.5">
                          {items.map((act, i) => (
                            <ActivityRow
                              key={act.id}
                              act={act}
                              status="NONE"
                              timing={timings[i]}
                              compact={false}
                              hasTicket={false}
                              readOnly={true}
                              onOpen={() => setSelectedActivityModal(act)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: FEED (COMUNIDADE)                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Barra de Filtros e Botão de Publicar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div role="tablist" aria-label="Filtro do feed" className="no-scrollbar flex gap-2 overflow-x-auto">
              {FEED_FILTERS.map((tab) => {
                const isActive = feedFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFeedFilter(tab.id)}
                    className={`press h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors duration-150 ${
                      isActive ? 'bg-action font-bold text-white' : 'border border-line-2 font-semibold text-text'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsNewPostOpen(true)}
              aria-label="Publicar no Feed"
              title="Nova publicação no Feed"
              className="press flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB,#7C3AED)] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-transform hover:scale-105 active:scale-95"
            >
              <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>

          {/* Lista de Publicações com PostCard oficial */}
          <div className="flex flex-col gap-3">
            {filteredFeedPosts.length === 0 ? (
              <div className="flex flex-col items-center px-4 pt-10 text-center">
                <Mascot color="purple" style={{ width: 100, height: 100 }} />
                <p className="mt-4 text-[15px] font-semibold text-text">
                  {FEED_EMPTY_TEXT[feedFilter] || 'Nenhuma publicação neste filtro ainda.'}
                </p>
                <p className="mt-1 text-[13px] text-text-2">
                  Os comunicados do evento e dos estandes aparecem aqui em tempo real.
                </p>
                {feedFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFeedFilter('ALL')}
                    className="btn btn-secondary btn-sm mt-4"
                  >
                    Ver todas as publicações
                  </button>
                )}
              </div>
            ) : (
              [featuredFeedPost, ...timelineFeedPosts].filter(Boolean).map((rawPost) => {
                const post = {
                  ...rawPost,
                  author: rawPost.author || rawPost.authorName || 'TechWeek'
                };
                const isLiked = likedPosts[post.id] || (authUser?.uid && Array.isArray(post.likes) && post.likes.includes(authUser.uid));
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    featured={post === featuredFeedPost}
                    isLiked={isLiked}
                    popping={popId === post.id}
                    onLike={handleLikeFeed}
                    onPopEnd={() => setPopId(null)}
                    onShare={handleShareFeed}
                  />
                );
              })
            )}
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
          onValidateOnly={handleValidateOnly}
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

      {/* ========================================================================= */}
      {/* MODAL 3: NOVA PUBLICAÇÃO NO FEED                                         */}
      {/* ========================================================================= */}
      {isNewPostOpen && createPortal(
        <>
          <div className="ds-scrim" onClick={() => setIsNewPostOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="feed-new-post-title" className="ds-sheet">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="feed-new-post-title" className="text-lg font-extrabold text-text">Publicar no Feed</h2>
              <button
                type="button"
                onClick={() => setIsNewPostOpen(false)}
                aria-label="Fechar"
                className="flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <div>
                <label htmlFor="sponsor-new-post-content" className="field-label">Mensagem do Estande</label>
                <textarea
                  id="sponsor-new-post-content"
                  required
                  rows={4}
                  placeholder={`Escreva novidades sobre o estande da ${sponsorName}...`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="field resize-none py-3"
                />
              </div>

              <div>
                <span className="field-label">Foto ou vídeo (opcional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!mediaPreview ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      <ImageIcon size={16} aria-hidden="true" />
                      <span>Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      <Film size={16} aria-hidden="true" />
                      <span>Vídeo</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[14px] bg-surface-raised">
                    {mediaPreview.type === 'video' ? (
                      <video controls src={mediaPreview.url} className="block max-h-[180px] w-full" />
                    ) : (
                      <img src={mediaPreview.url} alt="Prévia do anexo" className="block max-h-[180px] w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      aria-label="Remover anexo"
                      className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/70 text-text"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {!mediaPreview && (
                <div>
                  <label htmlFor="sponsor-new-post-url" className="field-label">Ou link direto de imagem</label>
                  <input
                    id="sponsor-new-post-url"
                    type="url"
                    placeholder="https://exemplo.com/banner.jpg"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="field"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isPublishing || isUploadingMedia || !newPostContent.trim()}
                className="btn btn-primary btn-block mt-1"
              >
                {isPublishing || isUploadingMedia ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    <span>{isUploadingMedia ? 'Enviando mídia...' : 'Publicando...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={18} aria-hidden="true" />
                    <span>Publicar como {sponsorName}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETALHES DA ATIVIDADE NA PROGRAMAÇÃO (READ-ONLY)                */}
      {/* ========================================================================= */}
      {selectedActivityModal && (
        <ActivityModal
          activity={selectedActivityModal}
          readOnly={true}
          onClose={() => setSelectedActivityModal(null)}
        />
      )}
    </div>
  );
}

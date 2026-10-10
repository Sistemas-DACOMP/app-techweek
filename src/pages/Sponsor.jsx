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
  ArrowUpDown,
  Flashlight,
  FlashlightOff,
  CameraOff,
  Plus,
  Send,
  Image as ImageIcon,
  Film
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
import { ActivityRow, TYPE_FILTERS, dayOrder, getActivityTimingState } from './Agenda';
import { CameraFrame } from './Scanner';
import { 
  PostCard, 
  FILTERS as FEED_FILTERS, 
  EMPTY_TEXT as FEED_EMPTY_TEXT 
} from './Feed';
import SponsorLeadModal from '../components/SponsorLeadModal';
import WhatsAppButton from '../components/WhatsAppButton';
import Mascot from '../components/Mascot';
import '../styles/cracha.css';
import '../styles/agenda.css';

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
                Visitas Validadas
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399' }}>
                {companyLeads.length + validatedCount}
              </div>
              <div style={{ fontSize: '11px', color: '#8790AE', marginTop: '4px' }}>
                Passaportes carimbados
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedActivityModal(act)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedActivityModal(act);
                      }
                    }}
                    style={{
                      background: '#1A2347',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      border: '1px solid #1C2548',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer'
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
              className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#2563EB,#7C3AED)] px-3.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Publicar</span>
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

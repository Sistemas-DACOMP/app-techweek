import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ShieldAlert,
  QrCode,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Printer,
  Search,

  GraduationCap,
  X,
  Flashlight,
  FlashlightOff,
  CameraOff,
  Plus,
  Send,
  Image as ImageIcon,
  Film,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import { 
  resolveParticipantFromQr, 
  fetchLeads, 
  updateLead, 
  exportLeadsToCsv,
  SEED_BIPADO_LEAD
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
import ActivityModal, { categoryOf, describeDay } from '../components/ActivityModal';
import { SPONSORS_CONFIG, TIER_STYLE } from '../components/PassportTab';
import { ActivityRow, TYPE_FILTERS, dayOrder, getActivityTimingState } from './Agenda';
import { CameraFrame } from './Scanner';
import { 
  PostCard, 
  FILTERS as FEED_FILTERS, 
  EMPTY_TEXT as FEED_EMPTY_TEXT 
} from './Feed';
import SponsorLeadModal from '../components/SponsorLeadModal';
import SponsorRoiDashboard from '../components/sponsor/SponsorRoiDashboard';
import SponsorSettings from '../components/sponsor/SponsorSettings';
import SponsorTeam from '../components/sponsor/SponsorTeam';
import { getSponsorSettings } from '../lib/sponsorSettingsService';
import Shell from './sponsor/Shell';
import Inicio from './sponsor/Inicio';
import Leads from './sponsor/Leads';
import { TIER_BAR, leadKey, logoFilter, sponsorFromText } from './sponsor/util';
import SupportTicketModal from '../components/SupportTicketModal';
import Mascot from '../components/Mascot';
import '../styles/cracha.css';
import '../styles/agenda.css';
import '../styles/admin.css';

const isDevMode = import.meta.env.DEV;

export default function Sponsor() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { profile: userProfile } = useUser();

  // Role validation: SPONSOR or ADMIN
  const [devSponsorOverride, setDevSponsorOverride] = useState(() => {
    if (isDevMode) {
      try {
        return sessionStorage.getItem('facom_dev_sponsor_override') === 'true';
      } catch (_) {
        return false;
      }
    }
    return false;
  });
  const actualRole = userProfile?.role || authUser?.role || (devSponsorOverride ? 'SPONSOR' : 'PARTICIPANT');
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

  // Cota / Tier do Patrocinador (DIAMOND, GOLD, SILVER) conforme DESIGN.md §2.8
  const sponsorTierInfo = useMemo(() => {
    const rawKey = (activeCompanyId || userProfile?.companyName || userProfile?.empresa || sponsorName || '').toLowerCase().trim();
    const entry = Object.entries(SPONSORS_CONFIG).find(([k, v]) => {
      return rawKey.includes(k) || k.includes(rawKey) || v.name.toLowerCase().includes(rawKey);
    });
    const tierKey = entry ? entry[1].tier : (userProfile?.tier || 'GOLD');
    const tierCfg = TIER_STYLE[tierKey] || TIER_STYLE.GOLD;
    return {
      tier: tierKey,
      ...tierCfg,
    };
  }, [activeCompanyId, userProfile, sponsorName]);

  // Cota so existe se a empresa e conhecida (nunca assume Ouro)
  const sponsorCfg = useMemo(() => sponsorFromText(activeCompanyId) || sponsorFromText(sponsorName), [activeCompanyId, sponsorName]);
  const tierKey = TIER_BAR[sponsorTierInfo?.tier] && sponsorCfg ? sponsorTierInfo.tier : (TIER_BAR[userProfile?.tier] ? userProfile.tier : null);
  const sponsorLogoFilter = logoFilter(sponsorCfg);
  const sponsorStand = sponsorCfg?.badgeDescription || '';

  // Tab State: 'home' | 'leads' | 'roi' | 'scanner' | 'agenda' | 'feed' | 'settings'
  const [activeTab, setActiveTab] = useState('home');

  // Leads CRM State (com SEED_BIPADO_LEAD para validação imediata do dashboard)
  const [leadsTab, setLeadsTab] = useState('mine'); // 'mine' | 'company'
  const [myLeads, setMyLeads] = useState([SEED_BIPADO_LEAD]);
  const [companyLeads, setCompanyLeads] = useState([SEED_BIPADO_LEAD]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Chave de navegação ativa unificada para Desktop Shell
  const activeNavKey = activeTab;

  // Suporte e Chamados SOS
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const handleNavigate = useCallback((key) => {
    if (key === 'chamados') {
      setIsSupportModalOpen(true);
      return;
    }
    setActiveTab(key);
  }, []);

  // Scanner States
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef(null);

  // Modal States
  const [activeParticipant, setActiveParticipant] = useState(null); // Newly scanned attendee
  const [focusLeadId, setFocusLeadId] = useState(null); // lead aberto a partir do Início
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

  // 1. Carrega Leads via API
  const loadLeads = useCallback(async (compId = activeCompanyId) => {
    if (!hasAccess) return;
    setIsLoadingLeads(true);
    try {
      const data = await fetchLeads(compId);
      const mList = Array.isArray(data?.myLeads) ? data.myLeads : [];
      const cList = Array.isArray(data?.companyLeads) ? data.companyLeads : [];
      setMyLeads(mList.length > 0 ? mList : [SEED_BIPADO_LEAD]);
      setCompanyLeads(cList.length > 0 ? cList : [SEED_BIPADO_LEAD]);
    } catch (err) {
      console.warn('Erro ao carregar leads:', err);
      const local = getLocalSponsorLeads(compId);
      setMyLeads(local);
      setCompanyLeads(local);
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
    if (!hasAccess || activeTab !== 'scanner' || activeParticipant) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [hasAccess, activeTab, activeParticipant]);

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

  const patchLead = (u) => {
    const apply = (list) => list.map((l) => (leadKey(l) === leadKey(u) ? { ...l, ...u } : l));
    setMyLeads(apply);
    setCompanyLeads(apply);
  };

  // Persistência ao editar no dossiê (nota, anotações, tags). Propaga o erro para o dossiê mostrar o estado.
  const handleUpdateLead = async (data) => {
    try {
      await updateLead({
        participantUid: data.participantUid,
        rating: data.rating !== undefined ? Number(data.rating) : 0,
        notes: data.notes,
        tags: data.tags,
        companyId: userProfile?.companyId || activeCompanyId,
      });
      patchLead(data);
    } catch (err) {
      console.error('Erro ao atualizar lead:', err);
      showToast('Erro ao salvar alterações do lead.', 'error');
      throw err;
    }
  };

  // Exportar Leads para CSV
  const handleExportCsv = (list) => {
    const leadsToExport = Array.isArray(list) ? list : (leadsTab === 'mine' ? myLeads : companyLeads);
    if (!leadsToExport || leadsToExport.length === 0) {
      showToast('Nenhum lead disponível para exportação com os filtros atuais.', 'warning');
      return;
    }
    const scopeLabel = activeTab === 'roi' ? 'roi_executivo' : (Array.isArray(list) ? 'filtrados' : leadsTab === 'mine' ? 'meus' : 'todos');
    const success = exportLeadsToCsv(leadsToExport, sponsorName, scopeLabel);
    if (success) {
      showToast(`Planilha CSV (${leadsToExport.length} ${leadsToExport.length === 1 ? 'lead' : 'leads'}) gerada com sucesso!`, 'success');
    }
  };

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

      const sponsorSettings = getSponsorSettings(activeCompanyId);
      const feedProfile = sponsorSettings?.feedProfile || {};
      const finalAuthor = feedProfile.displayName?.trim() || sponsorName;
      const finalHandle = feedProfile.handle?.trim() || `@${activeCompanyId}`;
      const finalAvatar = feedProfile.avatarUrl?.trim() || userProfile?.avatarUrl || userProfile?.photoURL || sponsorLogo || '';

      await createFeedPost({
        author: finalAuthor,
        authorHandle: finalHandle,
        authorRole: 'SPONSOR',
        authorAvatar: finalAvatar,
        content: newPostContent.trim(),
        imageUrl: finalMediaType === 'image' ? finalMediaUrl : '',
        videoUrl: finalMediaType === 'video' ? finalMediaUrl : '',
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        pinned: false,
        sponsorTier: sponsorTierInfo?.tier || userProfile?.tier || 'GOLD',
        companyId: activeCompanyId
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
              onClick={() => {
                if (isDevMode) {
                  try {
                    sessionStorage.setItem('facom_dev_sponsor_override', 'true');
                  } catch (_) {}
                }
                setDevSponsorOverride(true);
              }}
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
    <Shell
      activeNavKey={activeNavKey}
      onNavigate={handleNavigate}
      companyName={sponsorName}
      companyLogo={sponsorLogo}
      logoFilter={sponsorLogoFilter}
      standName={sponsorStand}
      tierInfo={{ ...sponsorTierInfo, tier: tierKey }}
      userProfile={userProfile}
      authUser={authUser}
      actualRole={actualRole}
      leadsCount={companyLeads.length}
      myLeadsCount={myLeads.length}
      onExportCsv={handleExportCsv}
      onOpenSupport={() => setIsSupportModalOpen(true)}
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
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
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
                flexShrink: 0,
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
                flexShrink: 0,
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
                flexShrink: 0,
              }}
            >
              <AlertCircle size={16} color="#F59A9A" />
            </div>
          )}
          <span style={{ lineHeight: 1.4 }}>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Header Mobile (na versão desktop, a SponsorShell já exibe a barra superior contextual fixa) */}
      <header className="lg:hidden mb-4">
        {activeTab === 'home' ? null : (
          activeTab !== 'leads' && activeTab !== 'roi' && (
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EEF1FA', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {activeTab === 'scanner' && 'Scanner de Crachá'}
                {activeTab === 'agenda' && 'Programação da TechWeek'}
                {activeTab === 'feed' && 'Feed da Comunidade'}
                {activeTab === 'settings' && 'Configurações do Estande'}
                {activeTab === 'team' && 'Equipe do Estande'}
              </h1>
              <div
                style={{
                  width: '28px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, #2563EB, #9B7BFF)',
                  margin: '0 auto',
                }}
              />
            </div>
          )
        )}
      </header>

      {/* Abas extraídas em src/pages/sponsor/ (Início e Leads). As demais seguem aqui até serem extraídas. */}
      {activeTab === 'home' && (
        <div className="tw-slide">
          <Inicio
            sponsorName={sponsorName}
            firstName={firstName}
            tier={tierKey}
            companyLogo={sponsorLogo}
            companyLogoFilter={sponsorLogoFilter}
            myLeads={myLeads}
            companyLeads={companyLeads}
            validatedCount={validatedCount}
            activities={todayActivities}
            feedPosts={feedPosts}
            onNavigate={handleNavigate}
            onOpenLead={(lead) => { setFocusLeadId(leadKey(lead)); setActiveTab('leads'); }}
            onOpenActivity={setSelectedActivityModal}
            onOpenSupport={() => setIsSupportModalOpen(true)}
          />
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="tw-slide">
          <Leads
            myLeads={myLeads}
            companyLeads={companyLeads}
            isLoading={isLoadingLeads}
            tier={tierKey}
            companyName={sponsorName}
            companyId={activeCompanyId}
            onUpdateLead={handleUpdateLead}
            onNavigate={handleNavigate}
            onExportCsv={handleExportCsv}
            focusLeadId={focusLeadId}
            onFocusConsumed={() => setFocusLeadId(null)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: RELATÓRIO EXECUTIVO ROI                                              */}
      {/* ========================================================================= */}
      {activeTab === 'roi' && (
        <div className="animate-fade-in flex flex-col gap-3 sm:gap-4">
          {/* Sub-navegação Mobile: Alternar entre CRM de Leads e Relatório ROI */}
          <div className="lg:hidden print:hidden flex items-center justify-between gap-2 pb-0.5">
            <div
              role="tablist"
              aria-label="Modo de visualização"
              className="inline-flex h-9 p-0.5 rounded-xl bg-surface-raised border border-border shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => setActiveTab('leads')}
                className="press inline-flex items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold text-text-3 hover:text-text transition-all"
              >
                <Users size={14} aria-hidden="true" />
                <span>CRM</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={true}
                className="press inline-flex items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold bg-surface-selected text-text shadow-xs"
              >
                <TrendingUp size={14} aria-hidden="true" />
                <span>ROI</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.print()}
                className="press inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-raised hover:bg-surface-selected px-2.5 text-[12px] font-bold text-text-2 hover:text-text transition-colors"
                title="Imprimir ou Salvar PDF"
              >
                <Printer size={14} aria-hidden="true" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={leadsTab === 'mine' ? myLeads.length === 0 : companyLeads.length === 0}
                className="press inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-raised hover:bg-surface-selected px-2.5 text-[12px] font-bold text-text-2 hover:text-text disabled:opacity-40 transition-colors"
                title="Exportar lista em CSV"
              >
                <Download size={14} aria-hidden="true" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Seletor de Escopo & Controles da Aba de ROI no Mobile */}
          <div className="lg:hidden flex items-center justify-between gap-2">
            <div role="tablist" aria-label="Filtrar escopo do relatório" className="flex items-center gap-1.5">
              <button
                type="button"
                role="tab"
                id="tab-roi-mine"
                aria-selected={leadsTab === 'mine'}
                onClick={() => setLeadsTab('mine')}
                className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition-all ${
                  leadsTab === 'mine'
                    ? 'bg-surface-selected text-text border border-link/40 shadow-xs'
                    : 'bg-surface-raised/40 text-text-3 hover:text-text-2 border border-transparent'
                }`}
              >
                <span>Meus Leads</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    leadsTab === 'mine'
                      ? 'bg-link/20 text-link'
                      : 'bg-surface-raised text-text-4'
                  }`}
                >
                  {myLeads.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="tab-roi-company"
                aria-selected={leadsTab === 'company'}
                onClick={() => setLeadsTab('company')}
                className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition-all ${
                  leadsTab === 'company'
                    ? 'bg-surface-selected text-text border border-link/40 shadow-xs'
                    : 'bg-surface-raised/40 text-text-3 hover:text-text-2 border border-transparent'
                }`}
              >
                <span>Toda a Empresa</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    leadsTab === 'company'
                      ? 'bg-link/20 text-link'
                      : 'bg-surface-raised text-text-4'
                  }`}
                >
                  {companyLeads.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-3 font-medium">
                {leadsTab === 'mine' ? `${myLeads.length} de sua autoria` : `${companyLeads.length} no estande`}
              </span>
            </div>
          </div>

          <SponsorRoiDashboard
            allCompanyLeads={companyLeads}
            myLeads={myLeads}
            scope={leadsTab}
            onScopeChange={setLeadsTab}
            companyName={sponsorName}
            companyLogo={sponsorLogo}
            totalEventAttendees={600}
            showActions={true}
            onExportCsv={handleExportCsv}
          />
        </div>
      )}


      {/* ========================================================================= */}
      {/* ABA 3: SCANNER DE CRACHÁ                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Câmera do Estande (7 colunas no Desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <section
              aria-label="Câmera do Estande"
              className="relative h-[340px] sm:h-[400px] lg:h-[440px] overflow-hidden rounded-[26px] bg-[radial-gradient(120%_90%_at_50%_40%,#2B3157_0%,#11152A_70%)]"
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
          </div>

          {/* Instruções e Simulação (5 colunas no Desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* O que dá para escanear no estande */}
            <section aria-labelledby="sponsor-scannables" className="rounded-[22px] bg-surface p-4 border border-line">
              <h2 id="sponsor-scannables" style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8790AE', margin: '0 0 12px' }}>
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
              <div className="rounded-[22px] bg-surface p-4 border border-line text-center">
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
                <Mascot size={112} name="ada" className="shrink-0" />
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
      {/* ABA 6: CONFIGURAÇÕES DO ESTANDE (PERFIL DO FEED, WHATSAPP E TAGS)          */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <SponsorSettings
          companyId={activeCompanyId}
          companyName={sponsorName}
          sponsorLogo={sponsorLogo}
          sponsorTier={sponsorTierInfo?.tier || 'GOLD'}
          userProfile={userProfile}
          authUser={authUser}
          onSettingsSaved={() => showToast('Configurações salvas e ativas no estande!', 'success')}
        />
      )}

      {/* ========================================================================= */}
      {/* ABA 7: EQUIPE DO ESTANDE, COTA DE CRACHÁS E CONVITES                      */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <SponsorTeam
          companyId={activeCompanyId}
          companyName={sponsorName}
          userProfile={userProfile}
          authUser={authUser}
        />
      )}


      {/* ========================================================================= */}
      {/* MODAL 1: NOVO PARTICIPANTE ESCANEADO                                      */}
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
      {/* ========================================================================= */}
      {/* MODAL 5: CENTRAL DE CHAMADOS & APOIO (SPONSOR)                           */}
      {/* ========================================================================= */}
      <SupportTicketModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        role="SPONSOR"
        entityName={sponsorName}
        senderName={firstName ? `${firstName} (${sponsorName})` : sponsorName}
        senderEmail={userProfile?.email || authUser?.email || ''}
        defaultLocation={`Estande ${sponsorName}`}
      />
    </Shell>
  );
}

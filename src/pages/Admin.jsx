import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Search,
  Plus,
  ExternalLink,
  Bell,
  LogOut,
  X,
  Check,
  Camera,
  Info,
  Trash2,
  Edit3,
  QrCode,
  ChevronDown,
  MapPin,
  Clock,
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  Download,
  CheckCircle2,
  MessageSquare,
  Send,
  Pin,
  ImageIcon,
  User,
  Film,
  Building2,
  FileText,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Target,
  Zap,
  HelpCircle,
  Play,
  Pause,
  Flame,
  Tv,
  Maximize2,
  Minimize2,
  Layers,
  Award,
  RefreshCw
} from 'lucide-react';

import { LinkedinIcon, GithubIcon, InstagramIcon } from './admin/SocialIcons';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '../hooks/useUser';
import { useAuth } from '../contexts/AuthContext';
import { 
  createActivity, 
  deleteActivity, 
  subscribeToActivities, 
  DEFAULT_ACTIVITIES,
  subscribeToSpeakers,
  createSpeaker,
  deleteSpeaker,
  DEFAULT_SPEAKERS,
  subscribeToLocations,
  createLocation,
  DEFAULT_LOCATIONS
} from '../lib/activityService';
import { 
  subscribeToFeedPosts, 
  createFeedPost, 
  deleteFeedPost, 
  togglePinFeedPost,
  broadcastAnnouncement,
  uploadFeedMedia,
  DEFAULT_FEED_POSTS 
} from '../lib/feedService';
import { 
  subscribeToMissions, 
  createMission, 
  updateMission, 
  deleteMission, 
  toggleMissionStatus, 
  triggerFlashMission, 
  seedDefaultMissions,
  DEFAULT_MISSIONS 
} from '../lib/missionService';
import { subscribeToAllUsers, updateUserRoleInFirestore } from '../lib/userService';
import { loginWithEmailAndPassword, logoutUser } from '../lib/auth';
import AdminShell from './admin/AdminShell';
import AdminInicio from './admin/AdminInicio';
import AdminProgramacao from './admin/AdminProgramacao';
import ActivityForm from './admin/ActivityForm';
import AdminPessoas from './admin/AdminPessoas';
import { ROLE_LABELS } from '../components/RoleSwitcher';
import { Toast } from './admin/ui';
import MissionForm from './admin/MissionForm';
import AdminMissoes from './admin/AdminMissoes';
import AdminConta from './admin/AdminConta';
import Telao from './admin/Telao';
import { styleOfMission } from './admin/MissionPreview';
import '../styles/admin.css';

const DURATION_OPTIONS = [
  'A definir',
  'Um dia',
  'Dois dias',
  'Três dias',
  'Quatro dias',
  'Cinco dias',
  'Seis dias',
  'Sete dias'
];

const ACTIVITY_TYPES = [
  'Palestra',
  'Minicurso',
  'Workshop',
  'Ativação de Marca',
  'Submissão de Palestra',
  'Evento Satélite',
  'Mesa Redonda',
  'Hackathon',
  'Painel',
  'Outro'
];

const SPEAKER_CLASSIFICATIONS = [
  { id: 'Convidado Externo', label: 'Convidado Externo', color: '#00D2FF', bg: 'rgba(0, 210, 255, 0.12)', border: 'rgba(0, 210, 255, 0.35)' },
  { id: 'Professor UFU', label: 'Professor UFU', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)' },
  { id: 'Aluno Pesquisador', label: 'Aluno Pesquisador', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
  { id: 'Patrocinador', label: 'Patrocinador', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' }
];

const SAMPLE_SPEAKER_PHOTOS = [
  { label: 'Homem Tech', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { label: 'Mulher Tech', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80' },
  { label: 'Especialista IA', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { label: 'Professora UFU', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' }
];

const FEED_TEMPLATES = [
  { label: '📢 Palestra em 15 min', text: '📢 ATENÇÃO: A próxima palestra no Anfiteatro Principal iniciará em 15 minutos! Preparem o app para fazer o check-in presencial.' },
  { label: '☕ Coffee Break', text: '☕ Coffee Break liberado no Hall Central! Convidamos todos a aproveitar para recarregar as energias e fazer networking com os palestrantes.' },
  { label: '🚀 Nova Missão', text: '🚀 Nova missão liberada no app! Visite os estandes dos patrocinadores para desbloquear palavras-chave e subir no ranking.' },
  { label: '⚠️ Mudança de Sala', text: '⚠️ Informamos que a oficina prática foi transferida para o Laboratório de Informática 2 (Bloco 5R). Esperamos vocês!' }
];

const MISSION_CATEGORIES = [
  { id: 'ALL', label: 'Todas as Categorias', color: 'var(--text-2)' },
  { id: 'sponsors', label: 'Patrocinadores', color: '#10B981' },
  { id: 'networking', label: 'Networking', color: 'var(--link)' },
  { id: 'social', label: 'Social & Mídia', color: '#EC4899' },
  { id: 'activities', label: 'Palestras', color: '#8B5CF6' },
  { id: 'flash', label: 'Relâmpago', color: '#F59E0B' },
  { id: 'special', label: 'Especiais', color: '#F97316' }
];

const MISSION_TRIGGER_MODES = [
  { id: 'form', label: 'Formulário & Mídia', desc: 'Respostas em texto, @ de participante ou foto de comprovante' },
  { id: 'secret', label: 'Palavra Secreta', desc: 'Validação presencial com palavra-chave no estande' },
  { id: 'quiz', label: 'Quiz / Pergunta', desc: 'Pergunta com opções e gabarito automático' },
  { id: 'auto', label: 'Automático pelo App', desc: 'Concluído por ações do usuário (escanear, check-in)' }
];

const VIEW_KEYS = ['inicio', 'programacao', 'feed', 'pessoas', 'missoes', 'config', 'conta'];
const MOBILE_TITLES = {
  inicio: 'Visão geral',
  programacao: 'Programação',
  feed: 'Feed e avisos',
  pessoas: 'Pessoas',
  missoes: 'Missões',
  config: 'Configurações',
  conta: 'Sua conta',
};

const MISSION_PRESETS = [
  {
    title: '⚡ Encontre Teko no Evento!',
    description: 'Ele está em algum lugar do evento! Tire uma foto com o mascote.',
    category: 'flash',
    points: 100,
    icon: 'Zap',
    triggerMode: 'form',
    isFlash: true,
    flashDuration: 5,
    flashMaxWinners: 1,
    flashMascotDialogue: '⚡ WEEKA: Encontre Teko agora pelo evento! Apenas 1 participante ganha +100 XP!',
    fields: [{ id: 'photo', type: 'photo', label: 'Foto com Teko', required: true }]
  },
  {
    title: '⚡ Corra para o Stand!',
    description: 'Vá até o patrocinador indicado e descubra a palavra secreta.',
    category: 'flash',
    points: 50,
    icon: 'Zap',
    triggerMode: 'secret',
    secretWord: 'OPORTUNIDADES',
    isFlash: true,
    flashDuration: 5,
    flashMascotDialogue: '🚨 MISSÃO RELÂMPAGO: Corra para o stand da Kanastra, descubra a palavra secreta e garanta +50 XP!'
  },
  {
    title: '⚡ Conexão Relâmpago em 5 Minutos',
    description: 'Conheça alguém novo e faça uma conexão antes do tempo acabar!',
    category: 'flash',
    points: 30,
    icon: 'Zap',
    triggerMode: 'auto',
    autoEventType: 'network_first',
    isFlash: true,
    flashDuration: 5,
    flashMascotDialogue: '⚡ WEEKA: Conexão em 5 minutos! Conecte-se com alguém que ainda não conhece.'
  }
];

export default function Admin() {
  const navigate = useNavigate();
  const { profile, role, refreshProfile } = useUser();
  const { user: authUser } = useAuth();

  // Guard de autorização Admin: só o papel vindo do perfil/claims do servidor libera a tela.
  // A UI não é autorização; o backend barra /api/admin/* por papel de qualquer forma.
  const isAuthorized = !!authUser && (role === 'ADMIN' || profile?.role === 'ADMIN');

  // Login de contingência
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Navegação: Menu Lateral Corporativo
  const [activeMenu, setActiveMenu] = useState('inicio');
  const [progTab, setProgTab] = useState('atividades');

  // Dados em tempo real
  const [activities, setActivities] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [feedPosts, setFeedPosts] = useState(DEFAULT_FEED_POSTS);

  // Estados do Feed & Avisos
  const [feedInput, setFeedInput] = useState('');
  const [feedImageUrl, setFeedImageUrl] = useState('');
  const [feedMediaFile, setFeedMediaFile] = useState(null);
  const [feedMediaPreview, setFeedMediaPreview] = useState(null);
  const [isUploadingFeedMedia, setIsUploadingFeedMedia] = useState(false);
  const adminFeedFileInputRef = useRef(null);
  const [feedIsPinned, setFeedIsPinned] = useState(false);
  const [feedChannel, setFeedChannel] = useState('feed');
  const [feedSubmitting, setFeedSubmitting] = useState(false);

  // Perfil dinâmico do Administrador logado
  const currentAdminName = profile?.displayName || profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || (profile?.email ? profile.email.split('@')[0] : 'Samuel Amorim');
  const currentAdminInitials = currentAdminName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA';
  const currentAdminAvatar = profile?.avatarUrl || profile?.photoURL || null;
  const currentAdminFirstName = profile?.firstName || currentAdminName.split(' ')[0];
  const me = { name: currentAdminName, initials: currentAdminInitials, avatar: currentAdminAvatar };

  // Filtros e busca
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const location = useLocation();

  // Modais corporativos
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [qrModalActivity, setQrModalActivity] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editingSpeakerId, setEditingSpeakerId] = useState(null);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [speakerClassificationFilter, setSpeakerClassificationFilter] = useState('ALL');

  // Estados do Modo Projeção de Telão (Projector Mode)
  const [projectorActivity, setProjectorActivity] = useState(null);

  // Form Atividade
  const initialActivityForm = {
    title: '',
    description: '',
    type: 'Palestra',
    isMultiSession: false,
    registrationType: 'Não requer inscrição',
    requiresRegistration: false,
    hasCapacityLimit: true,
    capacity: 100,
    points: 50,
    duration: 'Um dia',
    scheduleRows: [
      { date: '2026-10-21', startTime: '14:00', endTime: '15:30', location: 'Anfiteatro FACOM' }
    ],
    selectedSpeakerIds: [],
    speakerId: '',
    speakerName: '',
    speakerRole: '',
    speakerPhoto: '',
    materials: [],
    showExtraDetails: false,
    location: 'Anfiteatro FACOM',
    tags: 'Computação, Tecnologia, Geral',
    hidden: false,
    value: 'Grátis',
    attendanceMode: 'SELF_SCAN'
  };
  const [activityForm, setActivityForm] = useState(initialActivityForm);

  // Form Convidado / Palestrante
  const initialGuestForm = {
    name: '',
    email: '',
    role: '',
    institution: '',
    classification: 'Convidado Externo',
    bio: '',
    photo: '',
    socialLinks: {
      linkedin: '',
      github: '',
      instagram: ''
    },
    inviteViaEmail: false,
    inviteStatus: 'Aceito'
  };
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  // Form Local
  const [locationForm, setLocationForm] = useState({ name: '', capacity: 100, description: '' });

  // Gestão de Missões & Desafios (KAN-104)
  const [missionsList, setMissionsList] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [isSeedingMissions, setIsSeedingMissions] = useState(false);
  const [missionCategoryFilter, setMissionCategoryFilter] = useState('ALL');
  const [missionStatusFilter, setMissionStatusFilter] = useState('ALL');
  const [missionSearch, setMissionSearch] = useState('');
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [isFlashQuickModalOpen, setIsFlashQuickModalOpen] = useState(false);
  const [flashTargetMission, setFlashTargetMission] = useState(null);
  const [flashQuickDuration, setFlashQuickDuration] = useState(5);
  const [flashQuickMascotText, setFlashQuickMascotText] = useState('⚡ WEEKA: Atenção TechWeekers! Uma nova missão relâmpago acaba de começar!');
  const [isSavingMission, setIsSavingMission] = useState(false);

  const initialMissionForm = {
    title: '',
    description: '',
    category: 'sponsors',
    points: 20,
    icon: 'Sparkles',
    triggerMode: 'form',
    isSecret: false,
    secretWord: '',
    quizQuestion: '',
    quizOptions: ['', ''],
    quizCorrectIndex: 0,
    autoEventType: 'sponsor_visit',
    autoTargetId: 'Kanastra',
    fields: [
      { id: 'f1', label: 'Resposta / Comentário', type: 'textarea', required: true }
    ],
    isFlash: false,
    flashDuration: 5,
    flashMaxWinners: '',
    flashMascotDialogue: '⚡ WEEKA: Atenção TechWeekers! Uma nova missão relâmpago acaba de começar!',
    cardStyle: 'padrao',
    cardStyleOptions: {}
  };
  const [missionForm, setMissionForm] = useState(initialMissionForm);

  // Inscrição em tempo real de coleções
  useEffect(() => {
    if (!isAuthorized) return;

    const unsubActivities = subscribeToActivities((list) => {
      setActivities(list && list.length > 0 ? list : DEFAULT_ACTIVITIES);
    });

    const unsubSpeakers = subscribeToSpeakers((list) => {
      setSpeakers(list && list.length > 0 ? list : DEFAULT_SPEAKERS);
    });

    const unsubLocations = subscribeToLocations((list) => {
      setLocations(list && list.length > 0 ? list : DEFAULT_LOCATIONS);
    });

    const unsubUsers = subscribeToAllUsers((users) => {
      setUsersList(users || []);
    });

    const unsubFeed = subscribeToFeedPosts((posts) => {
      setFeedPosts(posts || DEFAULT_FEED_POSTS);
    });

    const unsubMissions = subscribeToMissions((missions) => {
      setMissionsList(missions || []);
      setLoadingMissions(false);
    });

    return () => {
      if (typeof unsubActivities === 'function') unsubActivities();
      if (typeof unsubSpeakers === 'function') unsubSpeakers();
      if (typeof unsubLocations === 'function') unsubLocations();
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubFeed === 'function') unsubFeed();
      if (typeof unsubMissions === 'function') unsubMissions();
    };
  }, [isAuthorized]);

  // Leitura de parâmetros de busca na URL (?tab=speakers ou ?tab=activities)
  useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'speakers' || tabParam === 'convidados') {
      setActiveMenu('programacao');
      setProgTab('convidados');
    } else if (tabParam === 'activities' || tabParam === 'atividades') {
      setActiveMenu('programacao');
      setProgTab('atividades');
    } else if (tabParam === 'locations' || tabParam === 'locais') {
      setActiveMenu('programacao');
      setProgTab('locais');
    } else if (VIEW_KEYS.includes(tabParam)) {
      setActiveMenu(tabParam);
    }
  }, [location.search]);

  // Navegação do painel (lateral no desktop, barra inferior no celular)
  const [globalSearch, setGlobalSearch] = useState('');
  const [progSearchOpen, setProgSearchOpen] = useState(false);
  const goTo = useCallback((key) => {
    setIsActivityModalOpen(false);
    setIsMissionModalOpen(false);
    setActiveMenu(key);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    if ((isActivityModalOpen || isMissionModalOpen) && typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [isActivityModalOpen, isMissionModalOpen]);
  const closeFeedback = useCallback(() => setFeedback(null), []);
  const sectionSearch = {
    programacao: [activitySearch, setActivitySearch],
    pessoas: [userSearch, setUserSearch],
    missoes: [missionSearch, setMissionSearch],
  }[activeMenu];
  const submitGlobalSearch = () => {
    if (sectionSearch) return;
    setActivitySearch(globalSearch);
    setGlobalSearch('');
    goTo('programacao');
  };
  const openNewActivity = () => {
    setEditingActivityId(null);
    setActivityForm(initialActivityForm);
    setIsActivityModalOpen(true);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };
  const openFlashModal = (mission) => {
    setFlashTargetMission(mission || missionsList[0] || null);
    setFlashQuickDuration(5);
    setFlashQuickMascotText(mission
      ? `🚨 MISSÃO RELÂMPAGO: ${mission.title || mission.name}! Corra antes que termine!`
      : '🚨 MISSÃO RELÂMPAGO: Uma nova missão foi liberada! Corra antes que o tempo termine!');
    setIsFlashQuickModalOpen(true);
  };

  // QR fixo por atividade (sem rotação): o token da sessão é o próprio id da atividade
  const projectorQrValue = useMemo(() => {
    if (!projectorActivity) return '';
    return JSON.stringify({
      lectureId: projectorActivity.id,
      activityId: projectorActivity.id,
      title: projectorActivity.title,
      sessionToken: projectorActivity.id
    });
  }, [projectorActivity]);

  const handleOpenNewMissionModal = () => {
    setEditingMissionId(null);
    setMissionForm(initialMissionForm);
    setIsMissionModalOpen(true);
  };

  const handleEditMission = (mission) => {
    setEditingMissionId(mission.id);
    setMissionForm({
      title: mission.title || '',
      description: mission.description || '',
      category: mission.category || 'sponsors',
      points: mission.points || 20,
      icon: mission.icon || 'Sparkles',
      triggerMode: mission.triggerMode || (mission.type === 'auto' ? 'auto' : 'form'),
      isSecret: !!mission.isSecret,
      secretWord: mission.secretConfig?.secretWord || '',
      quizQuestion: mission.quizConfig?.question || '',
      quizOptions: mission.quizConfig?.options && mission.quizConfig.options.length > 0 ? mission.quizConfig.options : ['', ''],
      quizCorrectIndex: mission.quizConfig?.correctOptionIndex ?? 0,
      autoEventType: mission.autoConfig?.eventType || 'sponsor_visit',
      autoTargetId: mission.autoConfig?.targetId || '',
      fields: mission.fields && mission.fields.length > 0 ? mission.fields : [{ id: 'f1', label: 'Resposta', type: 'text', required: true }],
      isFlash: !!mission.isFlash,
      flashDuration: mission.flashConfig?.durationMinutes || 5,
      flashMaxWinners: mission.flashConfig?.maxWinners || '',
      flashMascotDialogue: mission.flashConfig?.mascotDialogue || '⚡ WEEKA: Atenção TechWeekers! Uma nova missão relâmpago acaba de começar!',
      cardStyle: styleOfMission(mission),
      cardStyleOptions: mission.cardStyleOptions || {}
    });
    setIsMissionModalOpen(true);
  };

  const handleSaveMission = async (e) => {
    e.preventDefault();
    if (isSavingMission) return;
    setIsSavingMission(true);
    try {
      const payload = {
        title: missionForm.title,
        description: missionForm.description,
        category: missionForm.category,
        points: Number(missionForm.points) || 10,
        icon: missionForm.icon || 'Sparkles',
        status: 'active',
        triggerMode: missionForm.triggerMode,
        type: missionForm.triggerMode === 'auto' ? 'auto' : 'manual',
        cardStyle: missionForm.cardStyle || 'padrao',
        cardStyleOptions: missionForm.cardStyleOptions || {}
      };

      if (missionForm.triggerMode === 'secret') {
        payload.isSecret = true;
        payload.secretConfig = { secretWord: missionForm.secretWord.trim().toUpperCase() };
        payload.fields = [{ id: 'password', type: 'password', label: 'Qual a palavra-chave?', required: true }];
      } else if (missionForm.triggerMode === 'quiz') {
        payload.quizConfig = {
          question: missionForm.quizQuestion,
          options: missionForm.quizOptions.filter(opt => opt.trim() !== ''),
          correctOptionIndex: Number(missionForm.quizCorrectIndex) || 0
        };
      } else if (missionForm.triggerMode === 'form') {
        payload.fields = missionForm.fields;
      } else if (missionForm.triggerMode === 'auto') {
        payload.autoConfig = {
          eventType: missionForm.autoEventType,
          targetId: missionForm.autoTargetId
        };
      }

      if (missionForm.isFlash) {
        payload.isFlash = true;
        payload.flashConfig = {
          durationMinutes: Number(missionForm.flashDuration) || 5,
          maxWinners: missionForm.flashMaxWinners ? Number(missionForm.flashMaxWinners) : null,
          mascotDialogue: missionForm.flashMascotDialogue
        };
      } else {
        payload.isFlash = false;
      }

      if (editingMissionId) {
        await updateMission(editingMissionId, payload);
        setFeedback({
          type: 'success',
          title: 'Missão Atualizada',
          message: `A missão "${payload.title}" foi atualizada com sucesso.`
        });
      } else {
        // createMission grava só campos conhecidos: o estilo do card vai num update logo depois.
        const created = await createMission(payload);
        if (created?.id) await updateMission(created.id, { cardStyle: payload.cardStyle, cardStyleOptions: payload.cardStyleOptions });
        setFeedback({
          type: 'success',
          title: 'Missão Cadastrada',
          message: `A missão "${payload.title}" foi criada e já está disponível.`
        });
      }
      setIsMissionModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar missão:', err);
      setFeedback({
        type: 'error',
        title: 'Erro ao Salvar',
        message: 'Não foi possível salvar a missão no momento. Verifique a conexão.'
      });
    } finally {
      setIsSavingMission(false);
    }
  };

  const handleToggleMission = async (mission) => {
    try {
      await toggleMissionStatus(mission.id, mission.status || 'active');
      setFeedback({
        type: 'info',
        title: mission.status === 'active' ? 'Missão Pausada' : 'Missão Ativada',
        message: `Status de "${mission.title}" atualizado para ${mission.status === 'active' ? 'Pausada' : 'Ativa'}.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMission = async (mission) => {
    if (!window.confirm(`Tem certeza que deseja excluir a missão "${mission.title}"?`)) return;
    try {
      await deleteMission(mission.id);
      setFeedback({
        type: 'success',
        title: 'Missão Excluída',
        message: `A missão "${mission.title}" foi removida.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDefaultMissions = async () => {
    if (!window.confirm('Deseja popular ou sincronizar todas as missões padrão da TechWeek no Firestore? Missões existentes serão preservadas e atualizadas.')) return;
    setIsSeedingMissions(true);
    try {
      const count = await seedDefaultMissions();
      setFeedback({
        type: 'success',
        title: 'Missões Sincronizadas!',
        message: `${count} missões padrão foram gravadas com sucesso no Firestore.`
      });
    } catch (err) {
      console.error('Erro ao popular missões padrão:', err);
      setFeedback({
        type: 'error',
        title: 'Falha na Sincronização',
        message: err.message || 'Ocorreu um erro ao gravar as missões padrão no Firestore.'
      });
    } finally {
      setIsSeedingMissions(false);
    }
  };

  const handleTriggerQuickFlash = async (e) => {
    e.preventDefault();
    if (!flashTargetMission) return;
    try {
      await triggerFlashMission(
        flashTargetMission.id, 
        Number(flashQuickDuration) || 5, 
        flashQuickMascotText
      );
      setFeedback({
        type: 'success',
        title: '⚡ Missão Relâmpago Ativada!',
        message: `A missão "${flashTargetMission.title}" está ao vivo com contagem de ${flashQuickDuration} minutos no app.`
      });
      setIsFlashQuickModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminFeedFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      alert('Selecione uma imagem ou vídeo válido.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setFeedMediaFile(file);
    setFeedMediaPreview({
      url: previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name
    });
    setFeedImageUrl('');
  };

  const handleRemoveAdminFeedMedia = () => {
    setFeedMediaFile(null);
    if (feedMediaPreview?.url && feedMediaPreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(feedMediaPreview.url);
    }
    setFeedMediaPreview(null);
    if (adminFeedFileInputRef.current) adminFeedFileInputRef.current.value = '';
  };

  // Publicar Mensagem no Feed / Broadcast
  const handlePublishFeed = async (e) => {
    if (e) e.preventDefault();
    if (!feedInput.trim() || feedSubmitting || isUploadingFeedMedia) return;

    setFeedSubmitting(true);
    try {
      let finalMediaUrl = feedImageUrl.trim();
      let finalMediaType = finalMediaUrl ? 'image' : '';

      if (feedMediaFile) {
        setIsUploadingFeedMedia(true);
        const uploadRes = await uploadFeedMedia(feedMediaFile);
        finalMediaUrl = uploadRes.url;
        finalMediaType = uploadRes.mediaType;
        setIsUploadingFeedMedia(false);
      }

      const content = feedInput.trim();
      const isPinned = Boolean(feedIsPinned);

      if (feedChannel === 'feed' || feedChannel === 'both') {
        await createFeedPost({
          author: 'Comissão FACOM TechWeek',
          authorRole: 'ORGANIZATION',
          authorAvatar: currentAdminAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          content,
          imageUrl: finalMediaType === 'image' ? finalMediaUrl : '',
          videoUrl: finalMediaType === 'video' ? finalMediaUrl : '',
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType,
          pinned: isPinned
        });
      }

      if (feedChannel === 'broadcast' || feedChannel === 'both') {
        await broadcastAnnouncement({
          title: 'Aviso da Organização FACOM',
          message: content,
          priority: isPinned ? 'HIGH' : 'NORMAL',
          actionUrl: '/feed',
          actionLabel: 'Ver no Feed'
        });
      }

      setFeedInput('');
      setFeedImageUrl('');
      handleRemoveAdminFeedMedia();
      setFeedIsPinned(false);
      setFeedback({
        type: 'success',
        title: 'Publicação Concluída',
        message: feedChannel === 'both'
          ? 'Mensagem publicada no Feed e enviada como notificação push aos participantes.'
          : (feedChannel === 'feed' ? 'Mensagem publicada com sucesso no Feed.' : 'Comunicado enviado aos participantes.')
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Erro ao Publicar',
        message: err.message || 'Falha ao transmitir publicação.'
      });
    } finally {
      setFeedSubmitting(false);
      setIsUploadingFeedMedia(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Deseja excluir esta publicação do Feed?')) return;
    try {
      await deleteFeedPost(postId);
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
      setFeedback({
        type: 'success',
        title: 'Publicação Removida',
        message: 'A postagem foi excluída do Feed.'
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleTogglePinPost = async (postId, currentPinned) => {
    try {
      await togglePinFeedPost(postId, currentPinned);
      setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: !currentPinned } : p));
      setFeedback({
        type: 'success',
        title: currentPinned ? 'Post Desafixado' : 'Post Fixado no Topo',
        message: currentPinned ? 'A publicação agora segue a ordem cronológica padrão.' : 'A publicação foi fixada em destaque no topo da timeline.'
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleDurationChange = (newDuration) => {
    let rowCount = 1;
    if (newDuration === 'A definir' || newDuration === 'Um dia') rowCount = 1;
    else if (newDuration === 'Dois dias') rowCount = 2;
    else if (newDuration === 'Três dias') rowCount = 3;
    else if (newDuration === 'Quatro dias') rowCount = 4;
    else if (newDuration === 'Cinco dias') rowCount = 5;
    else if (newDuration === 'Seis dias') rowCount = 6;
    else if (newDuration === 'Sete dias') rowCount = 7;

    const baseDates = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'];
    const currentRows = [...activityForm.scheduleRows];
    const newRows = [];

    for (let i = 0; i < rowCount; i++) {
      if (currentRows[i]) {
        newRows.push(currentRows[i]);
      } else {
        newRows.push({
          date: baseDates[i] || '2026-10-21',
          startTime: '14:00',
          endTime: '15:30'
        });
      }
    }

    setActivityForm(prev => ({
      ...prev,
      duration: newDuration,
      scheduleRows: newRows
    }));
  };

  // Handlers de Login
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (!adminEmail || !adminPassword || loginLoading) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginWithEmailAndPassword(adminEmail, adminPassword);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      } else {
        if (typeof refreshProfile === 'function') {
          try { await refreshProfile(); } catch (_e) {}
        }
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await logoutUser();
    if (typeof refreshProfile === 'function') {
      try { await refreshProfile(); } catch (_e) {}
    }
  };

  // Salvar Atividade (KAN-59)
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title) {
      alert('Preencha o título da atividade.');
      return;
    }

    const firstSchedule = activityForm.scheduleRows[0] || { date: '2026-10-21', startTime: '14:00', endTime: '15:30', location: 'Anfiteatro FACOM' };
    const dayFormatted = firstSchedule.date ? firstSchedule.date.split('-').reverse().slice(0, 2).join('/') : '21/10';

    // Resolver palestrantes vinculados
    const selectedSpeakersList = (activityForm.selectedSpeakerIds || []).map(id => {
      const spk = speakers.find(s => s.id === id);
      return spk ? { id: spk.id, name: spk.name, role: spk.role || spk.institution || '', photo: spk.photo || '', classification: spk.classification || '' } : null;
    }).filter(Boolean);

    const primarySpeaker = selectedSpeakersList[0] || null;
    const speakerNamesJoined = selectedSpeakersList.map(s => s.name).join(', ') || activityForm.speakerName || 'Comissão Organizadora FACOM';

    const maxCap = activityForm.hasCapacityLimit ? Number(activityForm.capacity || 100) : 9999;

    const payload = {
      id: editingActivityId || `act_${Date.now()}`,
      title: activityForm.title,
      description: activityForm.description,
      type: activityForm.type.toLowerCase(),
      isMultiSession: Boolean(activityForm.isMultiSession),
      registrationType: activityForm.requiresRegistration ? 'Gratuita' : 'Não requer inscrição',
      requiresRegistration: Boolean(activityForm.requiresRegistration),
      hasCapacityLimit: Boolean(activityForm.hasCapacityLimit),
      vagas_totais: maxCap,
      maxCapacity: maxCap,
      points: Number(activityForm.points || 50),
      duration: activityForm.duration,
      schedule: activityForm.scheduleRows.map(r => ({
        date: r.date || '2026-10-21',
        day: r.date ? r.date.split('-').reverse().slice(0, 2).join('/') : '21/10',
        startTime: r.startTime || '14:00',
        endTime: r.endTime || '15:30',
        location: r.location || activityForm.location || 'Anfiteatro FACOM'
      })),
      day: dayFormatted,
      date: firstSchedule.date,
      time: firstSchedule.startTime,
      endTime: firstSchedule.endTime,
      speaker: speakerNamesJoined,
      speakerRole: primarySpeaker?.role || activityForm.speakerRole || '',
      speakerPhoto: primarySpeaker?.photo || activityForm.speakerPhoto || '',
      speakerId: primarySpeaker?.id || activityForm.speakerId || '',
      speakers: selectedSpeakersList,
      speakerIds: activityForm.selectedSpeakerIds || [],
      location: firstSchedule.location || activityForm.location || 'Anfiteatro FACOM',
      tags: activityForm.tags,
      hidden: activityForm.hidden,
      value: activityForm.value || 'Grátis',
      attendanceMode: activityForm.attendanceMode === 'DOUBLE_CHECK' ? 'DOUBLE_CHECK' : 'SELF_SCAN'
    };

    try {
      await createActivity(payload);
      setActivities(prev => {
        const filtered = prev.filter(a => a.id !== payload.id);
        return [payload, ...filtered];
      });
      setIsActivityModalOpen(false);
      setEditingActivityId(null);
      setActivityForm(initialActivityForm);
      setFeedback({
        type: 'success',
        title: 'Atividade salva com sucesso',
        message: `A atividade "${payload.title}" está disponível na grade oficial.`
      });
    } catch (err) {
      alert('Erro ao salvar atividade: ' + err.message);
    }
  };

  const handleOpenEditActivity = (act) => {
    setEditingActivityId(act.id);
    const rows = act.schedule && act.schedule.length > 0 
      ? act.schedule.map(s => ({
          date: s.date || act.date || '2026-10-21',
          startTime: s.startTime || s.time || act.time || '14:00',
          endTime: s.endTime || act.endTime || '15:30',
          location: s.location || act.location || 'Anfiteatro FACOM'
        }))
      : [{ date: act.date || '2026-10-21', startTime: act.time || '14:00', endTime: act.endTime || '15:30', location: act.location || 'Anfiteatro FACOM' }];

    let speakerIds = Array.isArray(act.speakerIds) ? act.speakerIds : [];
    if (speakerIds.length === 0 && Array.isArray(act.speakers) && act.speakers.length > 0) {
      speakerIds = act.speakers.map(s => s.id).filter(Boolean);
    }
    if (speakerIds.length === 0 && act.speakerId) {
      speakerIds = [act.speakerId];
    }

    setActivityForm({
      title: act.title || '',
      description: act.description || '',
      type: act.type ? (act.type.charAt(0).toUpperCase() + act.type.slice(1)) : 'Palestra',
      isMultiSession: Boolean(act.isMultiSession || rows.length > 1),
      registrationType: act.registrationType || 'Não requer inscrição',
      requiresRegistration: act.requiresRegistration !== undefined ? Boolean(act.requiresRegistration) : (act.registrationType !== 'Não requer inscrição'),
      hasCapacityLimit: act.hasCapacityLimit !== undefined ? Boolean(act.hasCapacityLimit) : (Number(act.vagas_totais) < 900),
      capacity: act.vagas_totais || act.maxCapacity || 100,
      points: Number(act.points || 50),
      duration: act.duration || (rows.length > 1 ? `${rows.length} dias` : 'Um dia'),
      scheduleRows: rows,
      selectedSpeakerIds: speakerIds,
      speakerId: act.speakerId || '',
      speakerName: act.speaker || '',
      speakerRole: act.speakerRole || '',
      speakerPhoto: act.speakerPhoto || '',
      materials: act.materials || [],
      showExtraDetails: true,
      location: act.location || 'Anfiteatro FACOM',
      tags: Array.isArray(act.tags) ? act.tags.join(', ') : (act.tags || 'Computação, Tecnologia, Geral'),
      hidden: Boolean(act.hidden),
      value: act.value || 'Grátis',
      attendanceMode: act.attendanceMode === 'DOUBLE_CHECK' ? 'DOUBLE_CHECK' : 'SELF_SCAN'
    });
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = async (id, title) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${title}"?`)) return;
    try {
      await deleteActivity(id);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Abrir Modal de Edição de Palestrante
  const handleOpenEditGuest = (spk) => {
    setEditingSpeakerId(spk.id);
    let socialObj = { linkedin: '', github: '', instagram: '' };
    if (typeof spk.socialLinks === 'object' && spk.socialLinks !== null && !Array.isArray(spk.socialLinks)) {
      socialObj = { ...socialObj, ...spk.socialLinks };
    } else if (Array.isArray(spk.socialLinks)) {
      socialObj.linkedin = spk.socialLinks[0] || '';
      socialObj.github = spk.socialLinks[1] || '';
      socialObj.instagram = spk.socialLinks[2] || '';
    }

    setGuestForm({
      name: spk.name || '',
      email: spk.email || '',
      role: spk.role || '',
      institution: spk.institution || spk.role || '',
      classification: spk.classification || 'Convidado Externo',
      bio: spk.bio || '',
      photo: spk.photo || '',
      socialLinks: socialObj,
      inviteViaEmail: Boolean(spk.inviteViaEmail),
      inviteStatus: spk.inviteStatus || 'Aceito'
    });
    setIsGuestModalOpen(true);
  };

  // Salvar Convidado / Palestrante
  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.name) {
      alert('Informe o nome do palestrante.');
      return;
    }

    const speakerPayload = {
      id: editingSpeakerId || `spk_${Date.now()}`,
      name: guestForm.name,
      email: guestForm.email,
      role: guestForm.role,
      institution: guestForm.institution || guestForm.role,
      classification: guestForm.classification || 'Convidado Externo',
      bio: guestForm.bio,
      photo: guestForm.photo || SAMPLE_SPEAKER_PHOTOS[0].url,
      socialLinks: guestForm.socialLinks,
      inviteViaEmail: guestForm.inviteViaEmail,
      inviteStatus: guestForm.inviteStatus
    };

    try {
      await createSpeaker(speakerPayload);
      setSpeakers(prev => {
        const filtered = prev.filter(s => s.id !== speakerPayload.id);
        return [speakerPayload, ...filtered];
      });

      setIsGuestModalOpen(false);
      setEditingSpeakerId(null);
      setGuestForm(initialGuestForm);
      setFeedback({
        type: 'success',
        title: editingSpeakerId ? 'Palestrante atualizado' : 'Palestrante cadastrado',
        message: `${guestForm.name} foi salvo na lista de palestrantes.`
      });
    } catch (err) {
      alert('Erro ao salvar convidado: ' + err.message);
    }
  };

  const handleDeleteSpeaker = async (id, name) => {
    if (!window.confirm(`Excluir palestrante "${name}"?`)) return;
    try {
      await deleteSpeaker(id);
      setSpeakers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Erro ao excluir palestrante: ' + err.message);
    }
  };

  const handleAddSocialLink = () => {
    if (!guestForm.socialInput.trim()) return;
    setGuestForm(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, prev.socialInput.trim()],
      socialInput: ''
    }));
  };

  // Salvar Local
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locationForm.name.trim()) return;
    const locPayload = {
      id: `loc_${Date.now()}`,
      name: locationForm.name.trim(),
      capacity: Number(locationForm.capacity || 100),
      description: locationForm.description || ''
    };
    try {
      await createLocation(locPayload);
      setLocations(prev => [locPayload, ...prev.filter(l => l.id !== locPayload.id)]);
      setIsLocationModalOpen(false);
      setLocationForm({ name: '', capacity: 100, description: '' });
      setFeedback({
        type: 'success',
        title: 'Local cadastrado',
        message: `Local "${locationForm.name}" disponível para atividades.`
      });
    } catch (err) {
      alert('Erro ao salvar local: ' + err.message);
    }
  };

  // Troca de papel: mesma chamada de antes; o toast oferece desfazer com a mesma chamada.
  const handleChangeRole = async (u, newRole) => {
    const uid = u.uid || u.id;
    const prevRole = u.role || 'PARTICIPANT';
    const who = u.username ? `@${u.username}` : (u.fullName || u.email);
    const res = await updateUserRoleInFirestore(uid, newRole);
    if (res && res.success === false) {
      setFeedback({ type: 'error', title: 'Não deu para trocar o papel', message: res.error || 'Confira a conexão e tente de novo.' });
      return;
    }
    setFeedback({
      type: 'success',
      title: `${who} agora é ${ROLE_LABELS[newRole] || newRole}.`,
      action: { label: 'Desfazer', run: () => updateUserRoleInFirestore(uid, prevRole) }
    });
  };

  const handleExportGrade = () => {
    const json = JSON.stringify(activities, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programacao-techweek.json';
    a.click();
  };

  // Filtros de Atividades
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchText = (act.title || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
                        (act.speaker || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
                        (act.location || '').toLowerCase().includes(activitySearch.toLowerCase());
      const matchType = activityFilter === 'ALL' || (act.type || '').toLowerCase() === activityFilter.toLowerCase();
      return matchText && matchType;
    });
  }, [activities, activitySearch, activityFilter]);

  // Filtros de Palestrantes & Convidados
  const filteredSpeakers = useMemo(() => {
    return (speakers || []).filter((spk) => {
      const matchText = (spk.name || '').toLowerCase().includes((speakerSearch || '').toLowerCase()) ||
                        (spk.institution || '').toLowerCase().includes((speakerSearch || '').toLowerCase()) ||
                        (spk.role || '').toLowerCase().includes((speakerSearch || '').toLowerCase());
      const matchClass = speakerClassificationFilter === 'ALL' || spk.classification === speakerClassificationFilter;
      return matchText && matchClass;
    });
  }, [speakers, speakerSearch, speakerClassificationFilter]);

  // Filtros de Missões & Desafios (KAN-106)
  const filteredMissions = useMemo(() => {
    return (missionsList || []).filter((m) => {
      if (missionCategoryFilter !== 'ALL' && m.category !== missionCategoryFilter) return false;
      if (missionStatusFilter !== 'ALL' && m.status !== missionStatusFilter) return false;
      if (missionSearch) {
        const q = missionSearch.toLowerCase();
        const titleMatch = (m.title || m.name || '').toLowerCase().includes(q);
        const descMatch = (m.description || '').toLowerCase().includes(q);
        const secretMatch = (m.secretConfig?.secretWord || '').toLowerCase().includes(q);
        return titleMatch || descMatch || secretMatch;
      }
      return true;
    });
  }, [missionsList, missionCategoryFilter, missionStatusFilter, missionSearch]);

  // Se não autorizado, tela de login corporativo
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "inherit" }}>
        <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '12px', padding: '32px', color: 'var(--text)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line-2)', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Lock size={22} color="var(--link)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
              Acesso Administrativo
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', margin: 0 }}>
              Painel de Gestão Oficial • FACOM TechWeek 2026
            </p>
          </div>

          {loginError && (
            <div style={{ backgroundColor: '#7F1D1D', border: '1px solid #991B1B', color: '#FECACA', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
                E-mail Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#6B7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="admin@facom.ufu.br"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.86rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
                Senha de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#6B7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: '8px', color: 'var(--text)', fontSize: '0.86rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ width: '100%', padding: '11px', backgroundColor: 'var(--action)', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 600, cursor: loginLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  const view = isActivityModalOpen ? 'nova-atividade' : isMissionModalOpen ? 'nova-missao' : activeMenu;
  const mobileBack = view === 'nova-atividade' ? () => setIsActivityModalOpen(false)
    : view === 'nova-missao' ? () => setIsMissionModalOpen(false)
    : ['conta', 'feed', 'config'].includes(view) ? () => goTo('inicio') : null;
  const mobileAction = {
    programacao: (
      <button type="button" aria-label="Buscar atividade" aria-expanded={progSearchOpen} onClick={() => setProgSearchOpen((o) => !o)} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text">
        <Search size={20} aria-hidden="true" />
      </button>
    ),
    missoes: (
      <button type="button" aria-label="Nova missão" onClick={handleOpenNewMissionModal} className="flex h-11 w-11 items-center justify-center rounded-full bg-action text-white">
        <Plus size={22} aria-hidden="true" />
      </button>
    ),
    'nova-atividade': null,
    'nova-missao': null,
    conta: null,
  }[view];

  return (
    <div className="adm-root">
      <AdminShell
        active={view}
        onNavigate={goTo}
        navigate={navigate}
        me={me}
        search={sectionSearch ? sectionSearch[0] : globalSearch}
        onSearch={sectionSearch ? sectionSearch[1] : setGlobalSearch}
        onSearchSubmit={submitGlobalSearch}
        mobileTitle={view === 'nova-atividade' ? (editingActivityId ? 'Editar atividade' : 'Nova atividade') : view === 'nova-missao' ? (editingMissionId ? 'Editar missão' : 'Nova missão') : MOBILE_TITLES[view] || 'Painel'}
        mobileBack={mobileBack}
        mobileAction={mobileAction}
        hideMobileNav={view === 'nova-atividade' || view === 'nova-missao'}
      >
          {view === 'inicio' && (
            <AdminInicio
              firstName={currentAdminFirstName}
              activities={activities}
              usersList={usersList}
              missionsList={missionsList}
              feedPosts={feedPosts}
              onNavigate={goTo}
              onNewActivity={openNewActivity}
              onOpenFlash={() => openFlashModal(null)}
              onOpenTelao={setProjectorActivity}
              onEditActivity={handleOpenEditActivity}
            />
          )}


          {view === 'programacao' && (
            <AdminProgramacao
              progTab={progTab}
              setProgTab={setProgTab}
              activities={activities}
              filteredActivities={filteredActivities}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              activitySearch={activitySearch}
              setActivitySearch={setActivitySearch}
              mobileSearchOpen={progSearchOpen}
              speakers={speakers}
              filteredSpeakers={filteredSpeakers}
              speakerSearch={speakerSearch}
              setSpeakerSearch={setSpeakerSearch}
              speakerClassificationFilter={speakerClassificationFilter}
              setSpeakerClassificationFilter={setSpeakerClassificationFilter}
              classifications={SPEAKER_CLASSIFICATIONS}
              locations={locations}
              photoFallback={SAMPLE_SPEAKER_PHOTOS[0].url}
              onNew={openNewActivity}
              onEdit={handleOpenEditActivity}
              onDelete={handleDeleteActivity}
              onTelao={setProjectorActivity}
              onQr={setQrModalActivity}
              onExport={handleExportGrade}
              onNewSpeaker={() => { setEditingSpeakerId(null); setGuestForm(initialGuestForm); setIsGuestModalOpen(true); }}
              onEditSpeaker={handleOpenEditGuest}
              onDeleteSpeaker={handleDeleteSpeaker}
              onNewLocation={() => setIsLocationModalOpen(true)}
            />
          )}

          {/* SEÇÃO: FEED & AVISOS */}
          {view === 'feed' && (
            <div style={{ maxWidth: '1080px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Comunicação & Avisos
                </h1>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Transmita avisos oficiais, fotos e vídeos para o feed do evento e dispare alertas push
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
                
                {/* Form Publicar */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.90rem', fontWeight: 700, color: 'var(--text)' }}>
                    Criar Publicação Oficial
                  </h3>

                  <form onSubmit={handlePublishFeed} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Canal de Destino</label>
                      <select
                        value={feedChannel}
                        onChange={(e) => setFeedChannel(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem' }}
                      >
                        <option value="feed">Apenas Feed do App</option>
                        <option value="broadcast">Notificação Push Geral</option>
                        <option value="both">Feed + Notificação Push</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Modelos Rápidos</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {FEED_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFeedInput(tpl.text)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-2)', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Conteúdo da Mensagem</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Escreva a mensagem que os participantes visualizarão..."
                        value={feedInput}
                        onChange={(e) => setFeedInput(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>

                    {/* Mídia Anexa */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Anexar Mídia (Foto até 50MB ou Vídeo até 250MB)</label>
                      <input
                        type="file"
                        ref={adminFeedFileInputRef}
                        accept="image/*,video/*"
                        onChange={handleAdminFeedFileSelect}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => adminFeedFileInputRef.current?.click()}
                          style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <ImageIcon size={14} />
                          <span>Selecionar Arquivo</span>
                        </button>
                      </div>

                      {feedMediaPreview && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {feedMediaPreview.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveAdminFeedMedia}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        id="pinCheck"
                        checked={feedIsPinned}
                        onChange={(e) => setFeedIsPinned(e.target.checked)}
                      />
                      <label htmlFor="pinCheck" style={{ fontSize: '0.78rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                        Fixar este aviso no topo do Feed
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={feedSubmitting || isUploadingFeedMedia}
                      style={{ padding: '9px', backgroundColor: 'var(--action)', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: (feedSubmitting || isUploadingFeedMedia) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                    >
                      {(feedSubmitting || isUploadingFeedMedia) ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                      <span>Publicar Transmissão</span>
                    </button>
                  </form>
                </div>

                {/* Lista de Publicações */}
                <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.90rem', fontWeight: 700, color: 'var(--text)' }}>
                    Publicações Ativas ({feedPosts.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {feedPosts.map((post) => (
                      <div key={post.id} style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{post.author}</span>
                            {post.pinned && (
                              <span style={{ fontSize: '0.68rem', backgroundColor: '#1E3A8A', color: 'var(--link)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Fixado 📌
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePinPost(post.id, post.pinned)}
                              title={post.pinned ? 'Desafixar' : 'Fixar no Topo'}
                              style={{ background: 'none', border: 'none', color: post.pinned ? 'var(--link)' : '#6B7280', cursor: 'pointer', padding: '4px' }}
                            >
                              <Pin size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              title="Excluir Publicação"
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: '0 0 8px', fontSize: '0.80rem', color: 'var(--text-2)', lineHeight: '1.4' }}>
                          {post.content}
                        </p>

                        {post.videoUrl && (
                          <div style={{ marginBottom: '8px', maxHeight: '180px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000' }}>
                            <video src={post.videoUrl} controls style={{ width: '100%', maxHeight: '180px', objectFit: 'contain' }} />
                          </div>
                        )}

                        {post.imageUrl && !post.videoUrl && (
                          <img src={post.imageUrl} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                        )}

                        <span style={{ fontSize: '0.70rem', color: '#6B7280' }}>
                          {post.formattedTime || 'Recentemente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO: PARTICIPANTES & PERMISSÕES */}
          {view === 'pessoas' && (
            <AdminPessoas
              usersList={usersList}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              onChangeRole={handleChangeRole}
            />
          )}

          {/* SEÇÃO: GESTÃO DE MISSÕES & DESAFIOS (KAN-104) */}
          {view === 'missoes' && (
            <AdminMissoes
              missions={filteredMissions}
              all={missionsList}
              loading={loadingMissions}
              categories={MISSION_CATEGORIES}
              category={missionCategoryFilter}
              onCategory={setMissionCategoryFilter}
              status={missionStatusFilter}
              onStatus={setMissionStatusFilter}
              search={missionSearch}
              onSearch={setMissionSearch}
              seeding={isSeedingMissions}
              onSeed={handleSeedDefaultMissions}
              onNew={handleOpenNewMissionModal}
              onFlash={openFlashModal}
              onEdit={handleEditMission}
              onToggle={handleToggleMission}
              onDelete={handleDeleteMission}
            />
          )}

          {/* SEÇÃO: CONFIGURAÇÕES DO EVENTO */}
          {view === 'config' && (
            <div style={{ maxWidth: '780px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Configurações do Evento
                </h1>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-2)' }}>
                  Parâmetros gerais da edição FACOM TechWeek 2026
                </p>
              </div>

              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>NOME OFICIAL</span>
                  <div style={{ fontSize: '0.90rem', fontWeight: 600, color: 'var(--text)' }}>FACOM TechWeek 2026 • Universidade Federal de Uberlândia</div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--line-2)' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>PERÍODO OFICIAL</span>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text)' }}>21 de Outubro a 27 de Outubro de 2026</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>LOCAL PRINCIPAL</span>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text)' }}>Campus Santa Mônica • Bloco 5R (FACOM / UFU)</div>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--line-2)' }} />

                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>STATUS DE SINCRONIZAÇÃO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '0.84rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Conectado em tempo real ao Firebase Firestore</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === 'nova-atividade' && (
            <ActivityForm
              form={activityForm}
              setForm={setActivityForm}
              editingId={editingActivityId}
              types={ACTIVITY_TYPES}
              speakers={speakers}
              locations={locations}
              activities={activities}
              onSubmit={handleSaveActivity}
              onCancel={() => setIsActivityModalOpen(false)}
              onNewSpeaker={() => { setEditingSpeakerId(null); setGuestForm(initialGuestForm); setIsGuestModalOpen(true); }}
            />
          )}
          {view === 'conta' && (
            <AdminConta
              me={me}
              handle={profile?.username ? `@${profile.username}` : profile?.email ? `@${profile.email.split('@')[0]}` : ''}
              role={profile?.role || 'ADMIN'}
              onProfile={() => navigate('/profile?edit=true')}
              onLogout={handleAdminLogout}
            />
          )}
          {view === 'nova-missao' && (
            <MissionForm
              form={missionForm}
              setForm={setMissionForm}
              editingId={editingMissionId}
              saving={isSavingMission}
              triggerModes={MISSION_TRIGGER_MODES}
              categories={MISSION_CATEGORIES}
              onSubmit={handleSaveMission}
              onCancel={() => setIsMissionModalOpen(false)}
            />
          )}
      </AdminShell>

      {/* MODAL: CONVIDADO / PALESTRANTE */}
      {isGuestModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: 'var(--text)' }}>
            <div style={{ backgroundColor: 'var(--surface-raised)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-2)' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                {editingSpeakerId ? 'Editar Palestrante' : 'Cadastrar Convidado / Palestrante'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Maria Santos"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>E-mail</label>
                  <input
                    type="email"
                    placeholder="maria@ufu.br"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Classificação do Palestrante</label>
                  <select
                    value={guestForm.classification}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, classification: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem' }}
                  >
                    {SPEAKER_CLASSIFICATIONS.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Professora Associada"
                    value={guestForm.role}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Empresa / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: FACOM / UFU"
                  value={guestForm.institution}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, institution: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Foto / Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={guestForm.photo}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, photo: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '6px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {SAMPLE_SPEAKER_PHOTOS.map((pic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGuestForm(prev => ({ ...prev, photo: pic.url }))}
                      style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-2)', fontSize: '0.70rem', cursor: 'pointer' }}
                    >
                      {pic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Redes Sociais */}
              <div style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--surface-raised)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                  Redes Sociais
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <LinkedinIcon size={14} color="#00D2FF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="url"
                      placeholder="LinkedIn URL..."
                      value={guestForm.socialLinks.linkedin || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, linkedin: val } }));
                      }}
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <GithubIcon size={14} color="var(--text-2)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="url"
                      placeholder="GitHub URL..."
                      value={guestForm.socialLinks.github || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, github: val } }));
                      }}
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <InstagramIcon size={14} color="#E1306C" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="url"
                      placeholder="Instagram URL..."
                      value={guestForm.socialLinks.instagram || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, instagram: val } }));
                      }}
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Mini Biografia</label>
                <textarea
                  rows={2}
                  placeholder="Breve resumo da trajetória ou especialidades..."
                  value={guestForm.bio}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--line-2)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-2)', fontSize: '0.80rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--action)', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} />
                  <span>Salvar Palestrante</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projectorActivity && <Telao activity={projectorActivity} qrValue={projectorQrValue} onClose={() => setProjectorActivity(null)} />}

      {/* MODAL: QR CODE DE PRESENÇA */}
      {qrModalActivity && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '10px', padding: '24px', textAlign: 'center', color: 'var(--text)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--link)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Validação de Presença
            </span>
            <h3 style={{ margin: '6px 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
              {qrModalActivity.title}
            </h3>

            <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '8px', display: 'inline-block', margin: '0 auto 14px' }}>
              <QRCodeSVG
                value={qrModalActivity.id}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: 'var(--text-2)' }}>
              Projete este código no telão da sala para os participantes realizarem o check-in presencial.
            </p>

            <button
              type="button"
              onClick={() => setQrModalActivity(null)}
              style={{ width: '100%', padding: '9px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--action)', color: '#FFFFFF', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR MISSÃO (KAN-104) */}

      {/* MODAL: DISPARO RELÂMPAGO RÁPIDO (KAN-104) */}
      {isFlashQuickModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface)', border: '1px solid #B45309', borderRadius: '10px', overflow: 'hidden', color: 'var(--text)', boxShadow: '0 12px 36px rgba(0,0,0,0.8)' }}>
            
            <div style={{ backgroundColor: '#78350F', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #92400E' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#FDE68A" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#FDE68A' }}>
                  Disparo de Missão Relâmpago Ao Vivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFlashQuickModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FDE68A', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerQuickFlash} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>
                  PRESETS RÁPIDOS DO EVENTO (CLIQUE PARA APLICAR)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {MISSION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFlashQuickDuration(preset.flashDuration || 5);
                        setFlashQuickMascotText(preset.flashMascotDialogue || '');
                      }}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text)', textAlign: 'left', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600, color: '#FDE68A' }}>{preset.title}</div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-2)' }}>{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>
                  Missão Alvo no App *
                </label>
                <select
                  value={flashTargetMission?.id || ''}
                  onChange={(e) => {
                    const found = missionsList.find(m => m.id === e.target.value);
                    setFlashTargetMission(found || null);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem' }}
                >
                  {missionsList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.name} (+{m.points} XP)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>
                    Duração (Minutos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={flashQuickDuration}
                    onChange={(e) => setFlashQuickDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: '#FDE68A', fontWeight: 700, fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>
                    Fala do Mascote (Alerta em Tempo Real)
                  </label>
                  <input
                    type="text"
                    value={flashQuickMascotText}
                    onChange={(e) => setFlashQuickMascotText(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '0.80rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsFlashQuickModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--line-2)', backgroundColor: 'var(--surface-raised)', color: 'var(--text-2)', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#D97706', color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Zap size={14} />
                  <span>LANÇAR RELÂMPAGO AGORA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast feedback={feedback} onClose={closeFeedback} />
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Radio,
  Layers,
  Award,
  RefreshCw
} from 'lucide-react';

const LinkedinIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const InstagramIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
import { QRCodeSVG } from 'qrcode.react';
import logoTw from '../assets/logo-tw.png';
import { useUser } from '../hooks/useUser';
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
import FeedbackModal from '../components/FeedbackModal';

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
  { id: 'ALL', label: 'Todas as Categorias', color: '#9CA3AF' },
  { id: 'sponsors', label: 'Patrocinadores', color: '#10B981' },
  { id: 'networking', label: 'Networking', color: '#3B82F6' },
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
  const { profile, role, participantType, refreshProfile } = useUser();

  // Guard de autorização Admin
  const [sessionAdmin, setSessionAdmin] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const testSessionStr = localStorage.getItem('facom_test_session');
      if (testSessionStr) {
        try {
          const s = JSON.parse(testSessionStr);
          if (s.role === 'ADMIN' || s.email === 'admin@admin.com' || s.email === 'sam03amorim@gmail.com') return true;
        } catch (_e) {}
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('facom_profile_')) {
          try {
            const p = JSON.parse(localStorage.getItem(key));
            if (p.role === 'ADMIN' || p.email === 'admin@admin.com' || p.email === 'sam03amorim@gmail.com') return true;
          } catch (_e) {}
        }
      }
    }
    return false;
  });

  const isAuthorized = sessionAdmin || 
    role === 'ADMIN' || 
    participantType === 'Organizador' || 
    profile?.role === 'ADMIN' || 
    profile?.email === 'admin@admin.com' || 
    profile?.email === 'sam03amorim@gmail.com';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [feedIsPinned, setFeedIsPinned] = useState(false);
  const [feedChannel, setFeedChannel] = useState('feed');
  const [feedSubmitting, setFeedSubmitting] = useState(false);

  // Perfil dinâmico do Administrador logado
  const currentAdminName = profile?.displayName || profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || (profile?.email ? profile.email.split('@')[0] : 'Samuel Amorim');
  const currentAdminInitials = currentAdminName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA';
  const currentAdminAvatar = profile?.avatarUrl || profile?.photoURL || null;

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
  const [projectorCountdown, setProjectorCountdown] = useState(30);
  const [projectorToken, setProjectorToken] = useState(() => Math.random().toString(36).substring(2, 9));
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    value: 'Grátis'
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
    flashMascotDialogue: '⚡ WEEKA: Atenção TechWeekers! Uma nova missão relâmpago acaba de começar!'
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
    }
  }, [location.search]);

  // Efeito do Contador e Rotação de Token do Modo Telão
  useEffect(() => {
    if (!projectorActivity) return;
    const interval = setInterval(() => {
      setProjectorCountdown((prev) => {
        if (prev <= 1) {
          setProjectorToken(Math.random().toString(36).substring(2, 9));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [projectorActivity]);

  // QR Code payload estável que só muda quando o token de segurança rotaciona (a cada 30s)
  const projectorQrValue = useMemo(() => {
    if (!projectorActivity) return '';
    return JSON.stringify({
      lectureId: projectorActivity.id,
      activityId: projectorActivity.id,
      title: projectorActivity.title,
      sessionToken: projectorToken
    });
  }, [projectorActivity, projectorToken]);

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
      flashMascotDialogue: mission.flashConfig?.mascotDialogue || '⚡ WEEKA: Atenção TechWeekers! Uma nova missão relâmpago acaba de começar!'
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
        type: missionForm.triggerMode === 'auto' ? 'auto' : 'manual'
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
        await createMission(payload);
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
        setSessionAdmin(true);
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

  const handleQuickAdmin = async (targetEmail = 'admin@admin.com', targetPass = 'AdminPassword123!') => {
    setAdminEmail(targetEmail);
    setAdminPassword(targetPass);
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginWithEmailAndPassword(targetEmail, targetPass);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      } else {
        setSessionAdmin(true);
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
    setSessionAdmin(false);
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
      value: activityForm.value || 'Grátis'
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
      value: act.value || 'Grátis'
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0B0F17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '12px', padding: '32px', color: '#F9FAFB', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Lock size={22} color="#3B82F6" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: '#F9FAFB' }}>
              Acesso Administrativo
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0 }}>
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
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
                  style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0B0F17', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB', fontSize: '0.86rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
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
                  style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0B0F17', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB', fontSize: '0.86rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ width: '100%', padding: '11px', backgroundColor: '#2563EB', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 600, cursor: loginLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1F2937', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickAdmin('admin@admin.com', 'AdminPassword123!')}
              style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
            >
              Acesso Rápido de Homologação (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0F17', color: '#F9FAFB', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. TOPBAR CORPORATIVA */}
      <header style={{ height: '56px', backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 50 }}>
        
        {/* Esquerda: Identidade do Evento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveMenu('inicio')}>
            <img src={logoTw} alt="FACOM TechWeek" style={{ height: '24px', objectFit: 'contain' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.01em' }}>
                TechWeek 2026
              </span>
              <span style={{ fontSize: '0.68rem', backgroundColor: '#1E3A8A', border: '1px solid #3B82F6', color: '#93C5FD', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
                ADMINISTRAÇÃO
              </span>
            </div>
          </div>
        </div>

        {/* Direita: Ações Rápidas, Perfil Corporativo e Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Abrir aplicativo do participante"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#D1D5DB', borderRadius: '6px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <ExternalLink size={13} color="#9CA3AF" />
            <span>Ver App do Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/staff')}
            title="Acessar Portaria & Check-in"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#D1D5DB', borderRadius: '6px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <QrCode size={13} color="#9CA3AF" />
            <span>Portaria & Scanner</span>
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#1E293B' }} />

          {/* Avatar Dropdown */}
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', backgroundColor: userMenuOpen ? '#1E293B' : 'transparent', transition: 'background 0.15s' }}
            >
              {currentAdminAvatar ? (
                <img 
                  src={currentAdminAvatar} 
                  alt="" 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #3B82F6' }} 
                />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: '0.75rem' }}>
                  {currentAdminInitials}
                </div>
              )}
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <span style={{ display: 'block', color: '#F9FAFB', fontWeight: 600, fontSize: '0.80rem' }}>{currentAdminName}</span>
                <span style={{ display: 'block', color: '#9CA3AF', fontSize: '0.68rem' }}>Organizador Geral</span>
              </div>
              <ChevronDown size={14} color="#9CA3AF" />
            </div>

            {userMenuOpen && (
              <div 
                style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '100%', 
                  marginTop: '6px', 
                  width: '210px', 
                  backgroundColor: '#111827', 
                  border: '1px solid #1F2937', 
                  borderRadius: '8px', 
                  padding: '6px', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
                  zIndex: 1000 
                }}
              >
                <button 
                  type="button"
                  onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'none', border: 'none', color: '#E5E7EB', fontSize: '0.80rem', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <User size={14} color="#9CA3AF" />
                  <span>Perfil Pessoal</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setUserMenuOpen(false); navigate('/'); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'none', border: 'none', color: '#E5E7EB', fontSize: '0.80rem', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <ExternalLink size={14} color="#9CA3AF" />
                  <span>Visão do Participante</span>
                </button>
                <div style={{ height: '1px', backgroundColor: '#1F2937', margin: '4px 0' }} />
                <button 
                  type="button"
                  onClick={() => { setUserMenuOpen(false); handleAdminLogout(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'none', border: 'none', color: '#EF4444', fontSize: '0.80rem', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <LogOut size={14} />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL: SIDEBAR + CONTEÚDO */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 56px)' }}>
        
        {/* SIDEBAR CORPORATIVA */}
        <aside style={{ width: '220px', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B', padding: '16px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          
          <div style={{ padding: '0 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              MENU PRINCIPAL
            </span>
          </div>

          {/* Início / Dashboard */}
          <button
            type="button"
            onClick={() => setActiveMenu('inicio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'inicio' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'inicio' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'inicio' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'inicio' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            <LayoutDashboard size={16} color={activeMenu === 'inicio' ? '#3B82F6' : '#64748B'} />
            <span>Visão Geral</span>
          </button>

          {/* Programação */}
          <button
            type="button"
            onClick={() => setActiveMenu('programacao')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'programacao' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'programacao' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'programacao' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'programacao' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color={activeMenu === 'programacao' ? '#3B82F6' : '#64748B'} />
              <span>Programação</span>
            </div>
            <span style={{ fontSize: '0.70rem', backgroundColor: '#1E293B', color: '#94A3B8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              {activities.length}
            </span>
          </button>

          {/* Feed & Comunicados */}
          <button
            type="button"
            onClick={() => setActiveMenu('feed')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'feed' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'feed' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'feed' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'feed' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={16} color={activeMenu === 'feed' ? '#3B82F6' : '#64748B'} />
              <span>Feed & Avisos</span>
            </div>
            <span style={{ fontSize: '0.70rem', backgroundColor: '#1E293B', color: '#94A3B8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              {feedPosts.length}
            </span>
          </button>

          {/* Pessoas & Permissões */}
          <button
            type="button"
            onClick={() => setActiveMenu('pessoas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'pessoas' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'pessoas' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'pessoas' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'pessoas' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={16} color={activeMenu === 'pessoas' ? '#3B82F6' : '#64748B'} />
              <span>Participantes</span>
            </div>
            <span style={{ fontSize: '0.70rem', backgroundColor: '#1E293B', color: '#94A3B8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              {usersList.length}
            </span>
          </button>

          {/* Missões & Desafios (KAN-104) */}
          <button
            type="button"
            onClick={() => setActiveMenu('missoes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'missoes' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'missoes' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'missoes' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'missoes' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s, color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={16} color={activeMenu === 'missoes' ? '#3B82F6' : '#64748B'} />
              <span>Missões & Desafios</span>
            </div>
            <span style={{ fontSize: '0.70rem', backgroundColor: '#1E293B', color: '#94A3B8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              {missionsList.length}
            </span>
          </button>

          <div style={{ padding: '16px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              OPERAÇÃO EM TEMPO REAL
            </span>
          </div>

          {/* Credenciamento & Scanner */}
          <button
            type="button"
            onClick={() => navigate('/staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#94A3B8',
              fontWeight: 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <UserCheck size={16} color="#64748B" />
            <span>Portaria & Check-in</span>
          </button>

          {/* Configurações do Evento */}
          <button
            type="button"
            onClick={() => setActiveMenu('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'config' ? '#1E293B' : 'transparent',
              borderLeft: activeMenu === 'config' ? '3px solid #3B82F6' : '3px solid transparent',
              color: activeMenu === 'config' ? '#F9FAFB' : '#94A3B8',
              fontWeight: activeMenu === 'config' ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              marginTop: 'auto'
            }}
          >
            <Sliders size={16} color={activeMenu === 'config' ? '#3B82F6' : '#64748B'} />
            <span>Configurações</span>
          </button>
        </aside>

        {/* 3. CONTEÚDO PRINCIPAL (CORPORATE DARK MODE) */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', backgroundColor: '#0B0F17' }}>

          {/* SEÇÃO: INÍCIO / VISÃO GERAL */}
          {activeMenu === 'inicio' && (
            <div style={{ maxWidth: '1120px' }}>
              
              {/* Header da Aba */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    Visão Geral do Evento
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                    Acompanhamento em tempo real das métricas e operações da FACOM TechWeek 2026
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setEditingActivityId(null); setActivityForm(initialActivityForm); setIsActivityModalOpen(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={14} />
                    <span>Nova Atividade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenu('feed')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '6px', color: '#F9FAFB', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Send size={13} color="#9CA3AF" />
                    <span>Publicar Aviso</span>
                  </button>
                </div>
              </div>

              {/* Grid de KPIs Corporativos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF' }}>Total de Participantes</span>
                    <Users size={16} color="#3B82F6" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#F9FAFB' }}>
                    {usersList.length}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    Sincronizado com Firestore
                  </span>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF' }}>Atividades na Grade</span>
                    <Calendar size={16} color="#3B82F6" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#F9FAFB' }}>
                    {activities.length}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                    Palestras, workshops e cursos
                  </span>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF' }}>Palestrantes & Convidados</span>
                    <Building2 size={16} color="#3B82F6" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#F9FAFB' }}>
                    {speakers.length}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                    Especialistas confirmados
                  </span>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF' }}>Feed & Avisos Ativos</span>
                    <MessageSquare size={16} color="#3B82F6" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#F9FAFB' }}>
                    {feedPosts.length}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                    Comunicados na timeline
                  </span>
                </div>
              </div>

              {/* Seções em 2 Colunas: Próximas Atividades & Últimos Avisos */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
                
                {/* Tabela Resumida da Programação */}
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F9FAFB' }}>Próximas Atividades da Grade</span>
                    <button 
                      type="button" 
                      onClick={() => setActiveMenu('programacao')}
                      style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Gerenciar Grade →
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1F2937' }}>
                        <th style={{ padding: '10px 16px', color: '#9CA3AF', fontWeight: 600 }}>TÍTULO</th>
                        <th style={{ padding: '10px 16px', color: '#9CA3AF', fontWeight: 600 }}>TIPO</th>
                        <th style={{ padding: '10px 16px', color: '#9CA3AF', fontWeight: 600 }}>LOCAL</th>
                        <th style={{ padding: '10px 16px', color: '#9CA3AF', fontWeight: 600, textAlign: 'right' }}>VAGAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.slice(0, 5).map((act) => (
                        <tr key={act.id} style={{ borderBottom: '1px solid #1F2937' }}>
                          <td style={{ padding: '10px 16px', color: '#F9FAFB', fontWeight: 600 }}>{act.title}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', backgroundColor: '#1E293B', color: '#93C5FD', fontWeight: 600 }}>
                              {act.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', color: '#9CA3AF' }}>{act.location || 'Anfiteatro FACOM'}</td>
                          <td style={{ padding: '10px 16px', color: '#9CA3AF', textAlign: 'right' }}>{act.vagas_totais || 100}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Card de Último Aviso Transmitido */}
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F9FAFB' }}>Último Comunicado</span>
                    <button 
                      type="button" 
                      onClick={() => setActiveMenu('feed')}
                      style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Ver Feed Completo →
                    </button>
                  </div>

                  {feedPosts[0] ? (
                    <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '6px', padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F9FAFB' }}>{feedPosts[0].author}</span>
                          {feedPosts[0].pinned && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#1E3A8A', color: '#93C5FD', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Fixado
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.80rem', color: '#D1D5DB', lineHeight: '1.4' }}>
                          {feedPosts[0].content}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '12px', display: 'block' }}>
                        {feedPosts[0].formattedTime || 'Recente'}
                      </span>
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Nenhum comunicado ativo no momento.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO: PROGRAMAÇÃO */}
          {activeMenu === 'programacao' && (
            <div>
              {/* Header com Subabas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    Gestão de Programação
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                    Controle de atividades, horários, palestrantes e locais de apresentação
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const json = JSON.stringify(activities, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'programacao-techweek.json';
                      a.click();
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '6px', color: '#D1D5DB', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Download size={13} />
                    <span>Exportar Grade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivityId(null);
                      setActivityForm(initialActivityForm);
                      setIsActivityModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Plus size={14} />
                    <span>Adicionar Atividade</span>
                  </button>
                </div>
              </div>

              {/* Sub-abas Corporativas */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1F2937', paddingBottom: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setProgTab('atividades')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: progTab === 'atividades' ? '#2563EB' : 'transparent',
                    color: progTab === 'atividades' ? '#FFFFFF' : '#9CA3AF',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Atividades ({activities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProgTab('convidados')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: progTab === 'convidados' ? '#2563EB' : 'transparent',
                    color: progTab === 'convidados' ? '#FFFFFF' : '#9CA3AF',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Convidados & Palestrantes ({speakers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProgTab('locais')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: progTab === 'locais' ? '#2563EB' : 'transparent',
                    color: progTab === 'locais' ? '#FFFFFF' : '#9CA3AF',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Locais & Salas ({locations.length})
                </button>
              </div>

              {/* Subaba: Atividades */}
              {progTab === 'atividades' && (
                <div>
                  {/* Barra de Filtros */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem' }}
                      >
                        <option value="ALL">Todos os tipos</option>
                        {ACTIVITY_TYPES.map(type => (
                          <option key={type} value={type.toLowerCase()}>{type}</option>
                        ))}
                      </select>

                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar atividade ou palestrante..."
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          style={{ padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', width: '240px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Atividades */}
                  <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1F2937' }}>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>TIPO</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>TÍTULO & CRONOGRAMA</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>PALESTRANTE(S)</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>LOCAL</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>LOTAÇÃO & PONTOS</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem', textAlign: 'right' }}>AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>
                              Nenhuma atividade encontrada com os filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredActivities.map((act) => {
                            const formattedType = (act.type || 'Palestra').charAt(0).toUpperCase() + (act.type || 'Palestra').slice(1);
                            const schedules = act.schedule && act.schedule.length > 0 
                              ? act.schedule 
                              : [{ date: act.date || '2026-10-21', startTime: act.time || '14:00', endTime: act.endTime || '15:30', location: act.location || 'Anfiteatro FACOM' }];

                            const spkName = act.speaker || (Array.isArray(act.speakers) && act.speakers.length > 0 ? act.speakers.map(s => s.name).join(', ') : 'Comissão FACOM');

                            return (
                              <tr key={act.id} style={{ borderBottom: '1px solid #1F2937' }}>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1E293B', color: '#93C5FD', display: 'inline-block' }}>
                                    {formattedType}
                                  </span>
                                  {act.isMultiSession && (
                                    <span style={{ display: 'block', marginTop: '4px', fontSize: '0.66rem', color: '#A855F7', fontWeight: 600 }}>
                                      Múltiplos Dias
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div onClick={() => handleOpenEditActivity(act)} style={{ color: '#F9FAFB', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer', marginBottom: '2px' }}>
                                    {act.title}
                                  </div>
                                  {schedules.map((sch, idx) => (
                                    <div key={idx} style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                      {sch.date && sch.date.includes('-') 
                                        ? `${sch.date.split('-')[2]}/${sch.date.split('-')[1]}/${sch.date.split('-')[0]} • ${sch.startTime || sch.time || ''}${sch.endTime ? ` às ${sch.endTime}` : ''}`
                                        : `${sch.date || '21/10'} • ${sch.startTime || sch.time || ''}`}
                                    </div>
                                  ))}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>
                                  <div style={{ fontSize: '0.80rem', fontWeight: 500 }}>{spkName}</div>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>
                                  {schedules.length > 1 ? (
                                    <span style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>
                                      {schedules.map(s => s.location || act.location || 'Anfiteatro FACOM').filter((v, i, a) => a.indexOf(v) === i).join(' / ')}
                                    </span>
                                  ) : (
                                    act.location || 'Anfiteatro FACOM'
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>
                                    {!act.hasCapacityLimit || Number(act.vagas_totais) >= 900 ? 'Sem limite' : `${act.vagas_totais || 100} vagas`}
                                  </div>
                                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#10B981', display: 'inline-block', marginTop: '2px' }}>
                                    +{act.points || 50} pts
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setQrModalActivity(act)}
                                      title="Gerar QR Code de Check-in"
                                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', cursor: 'pointer' }}
                                    >
                                      <QrCode size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setProjectorActivity(act)}
                                      title="Modo Projeção / Telão"
                                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #1D4ED8', backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#60A5FA', cursor: 'pointer' }}
                                    >
                                      <Tv size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditActivity(act)}
                                      title="Editar Atividade"
                                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', cursor: 'pointer' }}
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(act.id, act.title)}
                                      title="Excluir Atividade"
                                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #7F1D1D', backgroundColor: '#1F2937', color: '#EF4444', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subaba: Convidados & Palestrantes */}
              {progTab === 'convidados' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={speakerClassificationFilter}
                        onChange={(e) => setSpeakerClassificationFilter(e.target.value)}
                        style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem' }}
                      >
                        <option value="ALL">Todas as classificações</option>
                        {SPEAKER_CLASSIFICATIONS.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.label}</option>
                        ))}
                      </select>

                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar palestrante..."
                          value={speakerSearch}
                          onChange={(e) => setSpeakerSearch(e.target.value)}
                          style={{ padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', width: '220px' }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setEditingSpeakerId(null); setGuestForm(initialGuestForm); setIsGuestModalOpen(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                      <span>Novo Palestrante</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
                    {filteredSpeakers.map((spk) => {
                      const classObj = SPEAKER_CLASSIFICATIONS.find(c => c.id === spk.classification) || SPEAKER_CLASSIFICATIONS[0];
                      const social = typeof spk.socialLinks === 'object' && spk.socialLinks !== null && !Array.isArray(spk.socialLinks)
                        ? spk.socialLinks
                        : { linkedin: Array.isArray(spk.socialLinks) ? spk.socialLinks[0] : '', github: Array.isArray(spk.socialLinks) ? spk.socialLinks[1] : '', instagram: Array.isArray(spk.socialLinks) ? spk.socialLinks[2] : '' };

                      return (
                        <div key={spk.id} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                              <img
                                src={spk.photo || SAMPLE_SPEAKER_PHOTOS[0].url}
                                alt={spk.name}
                                style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #374151' }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spk.name}</span>
                                </div>
                                <span style={{ fontSize: '0.76rem', color: '#9CA3AF', display: 'block', marginTop: '2px' }}>
                                  {spk.role || spk.institution}
                                </span>
                                <div style={{ marginTop: '6px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: classObj.bg, color: classObj.color, border: `1px solid ${classObj.border}` }}>
                                    {classObj.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {spk.bio && (
                              <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#9CA3AF', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {spk.bio}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1F2937', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {social.linkedin && (
                                <a href={social.linkedin} target="_blank" rel="noreferrer" style={{ color: '#00D2FF' }}>
                                  <LinkedinIcon size={15} />
                                </a>
                              )}
                              {social.github && (
                                <a href={social.github} target="_blank" rel="noreferrer" style={{ color: '#D1D5DB' }}>
                                  <GithubIcon size={15} />
                                </a>
                              )}
                              {social.instagram && (
                                <a href={social.instagram} target="_blank" rel="noreferrer" style={{ color: '#E1306C' }}>
                                  <InstagramIcon size={15} />
                                </a>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditGuest(spk)}
                                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={12} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #7F1D1D', backgroundColor: '#1F2937', color: '#EF4444', fontSize: '0.74rem', cursor: 'pointer' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subaba: Locais */}
              {progTab === 'locais' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#D1D5DB' }}>Locais & Espaços Físicos</span>
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                      <span>Novo Local</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                    {locations.map((loc) => (
                      <div key={loc.id} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <MapPin size={15} color="#3B82F6" />
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F9FAFB' }}>{loc.name}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
                          Capacidade: <strong style={{ color: '#F9FAFB' }}>{loc.capacity}</strong> lugares
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO: FEED & AVISOS */}
          {activeMenu === 'feed' && (
            <div style={{ maxWidth: '1080px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Comunicação & Avisos
                </h1>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                  Transmita avisos oficiais, fotos e vídeos para o feed do evento e dispare alertas push
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
                
                {/* Form Publicar */}
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.90rem', fontWeight: 700, color: '#F9FAFB' }}>
                    Criar Publicação Oficial
                  </h3>

                  <form onSubmit={handlePublishFeed} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Canal de Destino</label>
                      <select
                        value={feedChannel}
                        onChange={(e) => setFeedChannel(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                      >
                        <option value="feed">Apenas Feed do App</option>
                        <option value="broadcast">Notificação Push Geral</option>
                        <option value="both">Feed + Notificação Push</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Modelos Rápidos</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {FEED_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFeedInput(tpl.text)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Conteúdo da Mensagem</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Escreva a mensagem que os participantes visualizarão..."
                        value={feedInput}
                        onChange={(e) => setFeedInput(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>

                    {/* Mídia Anexa */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Anexar Mídia (Foto até 50MB ou Vídeo até 250MB)</label>
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
                          style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <ImageIcon size={14} />
                          <span>Selecionar Arquivo</span>
                        </button>
                      </div>

                      {feedMediaPreview && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#0B0F17', border: '1px solid #374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.74rem', color: '#D1D5DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      <label htmlFor="pinCheck" style={{ fontSize: '0.78rem', color: '#D1D5DB', cursor: 'pointer' }}>
                        Fixar este aviso no topo do Feed
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={feedSubmitting || isUploadingFeedMedia}
                      style={{ padding: '9px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: (feedSubmitting || isUploadingFeedMedia) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                    >
                      {(feedSubmitting || isUploadingFeedMedia) ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                      <span>Publicar Transmissão</span>
                    </button>
                  </form>
                </div>

                {/* Lista de Publicações */}
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.90rem', fontWeight: 700, color: '#F9FAFB' }}>
                    Publicações Ativas ({feedPosts.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {feedPosts.map((post) => (
                      <div key={post.id} style={{ backgroundColor: '#0B0F17', border: '1px solid #1F2937', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F9FAFB' }}>{post.author}</span>
                            {post.pinned && (
                              <span style={{ fontSize: '0.68rem', backgroundColor: '#1E3A8A', color: '#93C5FD', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Fixado 📌
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePinPost(post.id, post.pinned)}
                              title={post.pinned ? 'Desafixar' : 'Fixar no Topo'}
                              style={{ background: 'none', border: 'none', color: post.pinned ? '#3B82F6' : '#6B7280', cursor: 'pointer', padding: '4px' }}
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

                        <p style={{ margin: '0 0 8px', fontSize: '0.80rem', color: '#D1D5DB', lineHeight: '1.4' }}>
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
          {activeMenu === 'pessoas' && (
            <div style={{ maxWidth: '1080px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    Gestão de Participantes
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                    Controle de acessos, permissões (Staff/Admin) e dados cadastrais dos usuários
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    <option value="ALL">Todos os papéis</option>
                    <option value="ADMIN">ADMIN (Organizador)</option>
                    <option value="STAFF">STAFF (Portaria)</option>
                    <option value="SPONSOR">SPONSOR (Patrocinador)</option>
                    <option value="PARTICIPANT">PARTICIPANT (Aluno)</option>
                  </select>

                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou e-mail..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', width: '240px' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1F2937' }}>
                      <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>PARTICIPANTE</th>
                      <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>E-MAIL</th>
                      <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>PAPEL ATUAL</th>
                      <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem', textAlign: 'right' }}>ALTERAR PERMISSÃO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList
                      .filter(u => {
                        const match = (u.fullName || u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                                      (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
                        const roleMatch = userRoleFilter === 'ALL' || (u.role || 'PARTICIPANT') === userRoleFilter;
                        return match && roleMatch;
                      })
                      .map(u => (
                        <tr key={u.uid || u.id} style={{ borderBottom: '1px solid #1F2937' }}>
                          <td style={{ padding: '12px 16px', color: '#F9FAFB', fontWeight: 600 }}>
                            {u.fullName || u.displayName || 'Participante TechWeek'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#9CA3AF' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              backgroundColor: u.role === 'ADMIN' ? '#1E3A8A' : (u.role === 'STAFF' ? '#1E293B' : (u.role === 'SPONSOR' ? '#78350F' : '#111827')),
                              color: u.role === 'ADMIN' ? '#93C5FD' : (u.role === 'STAFF' ? '#E5E7EB' : (u.role === 'SPONSOR' ? '#FDE68A' : '#9CA3AF')),
                              border: '1px solid #374151'
                            }}>
                              {u.role || 'PARTICIPANT'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <select
                              value={u.role || 'PARTICIPANT'}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                await updateUserRoleInFirestore(u.uid || u.id, newRole);
                                setFeedback({
                                  type: 'success',
                                  title: 'Permissão Atualizada',
                                  message: `O papel de ${u.fullName || u.email} foi alterado para ${newRole}.`
                                });
                              }}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                            >
                              <option value="PARTICIPANT">PARTICIPANT (Aluno)</option>
                              <option value="STAFF">STAFF (Portaria)</option>
                              <option value="SPONSOR">SPONSOR (Patrocinador)</option>
                              <option value="ADMIN">ADMIN (Organizador)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEÇÃO: GESTÃO DE MISSÕES & DESAFIOS (KAN-104) */}
          {activeMenu === 'missoes' && (
            <div style={{ maxWidth: '1120px' }}>
              {/* Header da Seção */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    Gestão de Missões & Desafios
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                    Crie missões com gatilhos dinâmicos, configure perguntas, segredos e dispare missões relâmpago ao vivo.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFlashTargetMission(missionsList[0] || null);
                      setFlashQuickDuration(5);
                      setFlashQuickMascotText('🚨 MISSÃO RELÂMPAGO: Uma nova missão foi liberada! Corra antes que o tempo termine!');
                      setIsFlashQuickModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#78350F',
                      border: '1px solid #B45309',
                      borderRadius: '6px',
                      color: '#FDE68A',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Zap size={14} color="#FDE68A" />
                    <span>Disparador Relâmpago</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSeedDefaultMissions}
                    disabled={isSeedingMissions}
                    title="Grava ou sincroniza todas as missões padrão da TechWeek no Firestore"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#E2E8F0',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: isSeedingMissions ? 'not-allowed' : 'pointer',
                      opacity: isSeedingMissions ? 0.7 : 1,
                      transition: 'all 0.15s'
                    }}
                  >
                    <RefreshCw size={14} className={isSeedingMissions ? 'animate-spin' : ''} />
                    <span>{isSeedingMissions ? 'Sincronizando...' : 'Popular Missões Padrão'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNewMissionModal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#2563EB',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>Nova Missão</span>
                  </button>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px 20px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL DE MISSÕES</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F9FAFB', marginTop: '4px' }}>
                    {missionsList.length}
                  </div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px 20px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>MISSÕES ATIVAS</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                    {missionsList.filter(m => m.status === 'active').length}
                  </div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px 20px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>MISSÕES RELÂMPAGO</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>
                    {missionsList.filter(m => m.isFlash).length}
                  </div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px 20px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>XP TOTAL DISPONÍVEL</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6', marginTop: '4px' }}>
                    +{missionsList.reduce((acc, m) => acc + (Number(m.points) || 0), 0)} XP
                  </div>
                </div>
              </div>

              {/* Filtros por Categoria */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                {MISSION_CATEGORIES.map(cat => {
                  const isActive = missionCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMissionCategoryFilter(cat.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: isActive ? cat.color : '#374151',
                        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : '#111827',
                        color: isActive ? '#F9FAFB' : '#9CA3AF',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Barra de Busca e Filtro de Status */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={14} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Buscar por título, descrição ou palavra-chave..."
                    value={missionSearch}
                    onChange={(e) => setMissionSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>

                <select
                  value={missionStatusFilter}
                  onChange={(e) => setMissionStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem' }}
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="active">Apenas Ativas</option>
                  <option value="paused">Apenas Pausadas</option>
                </select>
              </div>

              {/* Tabela / Grid Corporativo de Missões */}
              <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1E293B', borderBottom: '1px solid #334155', color: '#9CA3AF', textTransform: 'uppercase', fontSize: '0.70rem', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 16px' }}>Missão</th>
                      <th style={{ padding: '12px 16px' }}>Categoria</th>
                      <th style={{ padding: '12px 16px' }}>Gatilho / Validação</th>
                      <th style={{ padding: '12px 16px' }}>Pontuação</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMissions ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Loader2 size={18} className="animate-spin" color="#3B82F6" />
                            <span>Carregando missões do Firestore...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#9CA3AF' }}>
                              {missionsList.length === 0
                                ? 'Nenhuma missão cadastrada no banco de dados ainda.'
                                : 'Nenhuma missão encontrada para os filtros selecionados.'}
                            </p>
                            {missionsList.length === 0 && (
                              <button
                                type="button"
                                onClick={handleSeedDefaultMissions}
                                disabled={isSeedingMissions}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 16px',
                                  backgroundColor: '#2563EB',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#FFFFFF',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <RefreshCw size={14} className={isSeedingMissions ? 'animate-spin' : ''} />
                                <span>Popular Missões Padrão Agora</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMissions.map((m) => {
                        const isFlash = !!m.isFlash;
                        const triggerModeLabel = 
                          m.triggerMode === 'secret' ? 'Palavra Secreta' :
                          m.triggerMode === 'quiz' ? 'Quiz / Pergunta' :
                          m.triggerMode === 'auto' ? 'Automático' : 'Formulário / Foto';

                        const triggerModeBadgeColor = 
                          m.triggerMode === 'secret' ? '#8B5CF6' :
                          m.triggerMode === 'quiz' ? '#F59E0B' :
                          m.triggerMode === 'auto' ? '#3B82F6' : '#10B981';

                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid #1F2937' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  backgroundColor: isFlash ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                  border: isFlash ? '1px solid #F59E0B' : '1px solid rgba(59, 130, 246, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isFlash ? <Zap size={16} color="#F59E0B" /> : <Sparkles size={16} color="#3B82F6" />}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#F9FAFB', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{m.title || m.name}</span>
                                    {isFlash && (
                                      <span style={{ fontSize: '0.65rem', backgroundColor: '#78350F', color: '#FDE68A', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                        ⚡ RELÂMPAGO
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#9CA3AF', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.description}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#D1D5DB', backgroundColor: '#1E293B', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                                {m.category || 'Geral'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '0.72rem', color: triggerModeBadgeColor, backgroundColor: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${triggerModeBadgeColor}44`, fontWeight: 600 }}>
                                {triggerModeLabel}
                              </span>
                              {m.triggerMode === 'secret' && m.secretConfig?.secretWord && (
                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#9CA3AF', marginTop: '2px' }}>
                                  Código: <code style={{ color: '#F472B6' }}>{m.secretConfig.secretWord}</code>
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontWeight: 700, color: '#60A5FA', fontSize: '0.84rem' }}>
                                +{m.points} XP
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleMission(m)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  backgroundColor: m.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: m.status === 'active' ? '#34D399' : '#F87171'
                                }}
                              >
                                {m.status === 'active' ? <Check size={11} /> : <X size={11} />}
                                <span>{m.status === 'active' ? 'Ativa' : 'Pausada'}</span>
                              </button>
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  type="button"
                                  title="Disparar como Missão Relâmpago"
                                  onClick={() => {
                                    setFlashTargetMission(m);
                                    setFlashQuickDuration(5);
                                    setFlashQuickMascotText(`🚨 MISSÃO RELÂMPAGO: ${m.title || m.name}! Corra antes que termine!`);
                                    setIsFlashQuickModalOpen(true);
                                  }}
                                  style={{ padding: '6px', background: 'none', border: '1px solid #78350F', borderRadius: '4px', color: '#FDE68A', cursor: 'pointer' }}
                                >
                                  <Zap size={13} />
                                </button>
                                <button
                                  type="button"
                                  title="Editar Missão"
                                  onClick={() => handleEditMission(m)}
                                  style={{ padding: '6px', background: 'none', border: '1px solid #374151', borderRadius: '4px', color: '#9CA3AF', cursor: 'pointer' }}
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  title="Excluir Missão"
                                  onClick={() => handleDeleteMission(m)}
                                  style={{ padding: '6px', background: 'none', border: '1px solid #374151', borderRadius: '4px', color: '#EF4444', cursor: 'pointer' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEÇÃO: CONFIGURAÇÕES DO EVENTO */}
          {activeMenu === 'config' && (
            <div style={{ maxWidth: '780px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Configurações do Evento
                </h1>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
                  Parâmetros gerais da edição FACOM TechWeek 2026
                </p>
              </div>

              <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>NOME OFICIAL</span>
                  <div style={{ fontSize: '0.90rem', fontWeight: 600, color: '#F9FAFB' }}>FACOM TechWeek 2026 • Universidade Federal de Uberlândia</div>
                </div>

                <div style={{ height: '1px', backgroundColor: '#1F2937' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>PERÍODO OFICIAL</span>
                    <div style={{ fontSize: '0.86rem', color: '#F9FAFB' }}>21 de Outubro a 27 de Outubro de 2026</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>LOCAL PRINCIPAL</span>
                    <div style={{ fontSize: '0.86rem', color: '#F9FAFB' }}>Campus Santa Mônica • Bloco 5R (FACOM / UFU)</div>
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: '#1F2937' }} />

                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>STATUS DE SINCRONIZAÇÃO</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '0.84rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Conectado em tempo real ao Firebase Firestore</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADICIONAR / EDITAR ATIVIDADE */}
      {isActivityModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#F9FAFB', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)' }}>
            
            <div style={{ backgroundColor: '#1E293B', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                {editingActivityId ? 'Editar Atividade' : 'Cadastrar Nova Atividade'}
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Título da Atividade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Minicurso de Arquitetura Serverless na AWS"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Descrição / Resumo
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o conteúdo e objetivos da atividade..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Tipo de Atividade
                  </label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    {ACTIVITY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Vínculo de Palestrantes (Multi-select)
                  </label>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', backgroundColor: '#0B0F17', border: '1px solid #374151', borderRadius: '6px', padding: '6px 10px' }}>
                    {speakers.map(s => {
                      const isSelected = (activityForm.selectedSpeakerIds || []).includes(s.id);
                      return (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.78rem', cursor: 'pointer', color: isSelected ? '#38BDF8' : '#D1D5DB' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setActivityForm(prev => {
                                const current = prev.selectedSpeakerIds || [];
                                const updated = checked ? [...current, s.id] : current.filter(id => id !== s.id);
                                return { ...prev, selectedSpeakerIds: updated };
                              });
                            }}
                          />
                          <span>{s.name} ({s.institution || s.role})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Agenda Flexível: Sessão Única vs Múltiplos Dias/Horários */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F9FAFB' }}>
                    Agenda & Horários
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ fontSize: '0.76rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sessionMode"
                        checked={!activityForm.isMultiSession}
                        onChange={() => setActivityForm(prev => ({
                          ...prev,
                          isMultiSession: false,
                          scheduleRows: [prev.scheduleRows[0] || { date: '2026-10-21', startTime: '14:00', endTime: '15:30', location: prev.location || 'Anfiteatro FACOM' }]
                        }))}
                      />
                      <span>Sessão Única</span>
                    </label>
                    <label style={{ fontSize: '0.76rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sessionMode"
                        checked={activityForm.isMultiSession}
                        onChange={() => setActivityForm(prev => ({
                          ...prev,
                          isMultiSession: true,
                          scheduleRows: prev.scheduleRows.length > 1 ? prev.scheduleRows : [
                            prev.scheduleRows[0] || { date: '2026-10-21', startTime: '14:00', endTime: '15:30', location: 'Anfiteatro FACOM' },
                            { date: '2026-10-22', startTime: '14:00', endTime: '15:30', location: 'Sala 5R' }
                          ]
                        }))}
                      />
                      <span>Múltiplas Sessões / Dias</span>
                    </label>
                  </div>
                </div>

                {activityForm.scheduleRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.5fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActivityForm(prev => {
                          const newRows = [...prev.scheduleRows];
                          newRows[idx].date = val;
                          return { ...prev, scheduleRows: newRows };
                        });
                      }}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                    />
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActivityForm(prev => {
                          const newRows = [...prev.scheduleRows];
                          newRows[idx].startTime = val;
                          return { ...prev, scheduleRows: newRows };
                        });
                      }}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                    />
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActivityForm(prev => {
                          const newRows = [...prev.scheduleRows];
                          newRows[idx].endTime = val;
                          return { ...prev, scheduleRows: newRows };
                        });
                      }}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                    />
                    <select
                      value={row.location || activityForm.location || 'Anfiteatro FACOM'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActivityForm(prev => {
                          const newRows = [...prev.scheduleRows];
                          newRows[idx].location = val;
                          return { ...prev, scheduleRows: newRows, location: idx === 0 ? val : prev.location };
                        });
                      }}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>

                    {activityForm.isMultiSession && activityForm.scheduleRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivityForm(prev => ({
                            ...prev,
                            scheduleRows: prev.scheduleRows.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {activityForm.isMultiSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setActivityForm(prev => ({
                        ...prev,
                        scheduleRows: [
                          ...prev.scheduleRows,
                          { date: '2026-10-23', startTime: '14:00', endTime: '15:30', location: 'Anfiteatro FACOM' }
                        ]
                      }));
                    }}
                    style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} />
                    <span>Adicionar Novo Dia / Horário</span>
                  </button>
                )}
              </div>

              {/* Controle de Acesso & Gamificação */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F9FAFB', display: 'block', marginBottom: '8px' }}>
                    Acesso & Lotação
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#D1D5DB', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activityForm.requiresRegistration}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
                    />
                    <span>Requer inscrição prévia no app</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#D1D5DB', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activityForm.hasCapacityLimit}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, hasCapacityLimit: e.target.checked }))}
                    />
                    <span>Possui limite de vagas</span>
                  </label>

                  {activityForm.hasCapacityLimit && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Capacidade máxima:</span>
                      <input
                        type="number"
                        min="1"
                        value={activityForm.capacity}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, capacity: e.target.value }))}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem', marginTop: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F9FAFB', display: 'block', marginBottom: '8px' }}>
                    Gamificação (Pontos de Presença)
                  </span>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {[25, 50, 100, 150].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setActivityForm(prev => ({ ...prev, points: pts }))}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          borderRadius: '4px',
                          border: Number(activityForm.points) === pts ? '1px solid #10B981' : '1px solid #374151',
                          backgroundColor: Number(activityForm.points) === pts ? 'rgba(16, 185, 129, 0.15)' : '#111827',
                          color: Number(activityForm.points) === pts ? '#34D399' : '#9CA3AF',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        +{pts}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={activityForm.points}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, points: e.target.value }))}
                    placeholder="Pontos customizados"
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1F2937', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.80rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} />
                  <span>Salvar Atividade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVIDADO / PALESTRANTE */}
      {isGuestModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#F9FAFB' }}>
            <div style={{ backgroundColor: '#1E293B', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>
                {editingSpeakerId ? 'Editar Palestrante' : 'Cadastrar Convidado / Palestrante'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Maria Santos"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>E-mail</label>
                  <input
                    type="email"
                    placeholder="maria@ufu.br"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Classificação do Palestrante</label>
                  <select
                    value={guestForm.classification}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, classification: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    {SPEAKER_CLASSIFICATIONS.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Professora Associada"
                    value={guestForm.role}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Empresa / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: FACOM / UFU"
                  value={guestForm.institution}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, institution: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Foto / Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={guestForm.photo}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, photo: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '6px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {SAMPLE_SPEAKER_PHOTOS.map((pic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGuestForm(prev => ({ ...prev, photo: pic.url }))}
                      style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#9CA3AF', fontSize: '0.70rem', cursor: 'pointer' }}
                    >
                      {pic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Redes Sociais */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F9FAFB', display: 'block', marginBottom: '8px' }}>
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
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <GithubIcon size={14} color="#D1D5DB" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="url"
                      placeholder="GitHub URL..."
                      value={guestForm.socialLinks.github || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, github: val } }));
                      }}
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem', boxSizing: 'border-box' }}
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
                      style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Mini Biografia</label>
                <textarea
                  rows={2}
                  placeholder="Breve resumo da trajetória ou especialidades..."
                  value={guestForm.bio}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1F2937', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.80rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} />
                  <span>Salvar Palestrante</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY: MODO PROJEÇÃO DE TELÃO (PROJECTOR MODE) */}
      {projectorActivity && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#050811', zIndex: 9999, display: 'flex', flexDirection: 'column', color: '#FFFFFF', padding: '32px 48px', fontFamily: "'Inter', sans-serif" }}>
          {/* Header do Telão */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src={logoTw} alt="FACOM TechWeek" style={{ height: '48px', objectFit: 'contain' }} />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  FACOM TECHWEEK 2026 • PROJEÇÃO OFICIAL
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F9FAFB' }}>
                  Presença & Check-in no Telão
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    setIsFullscreen(true);
                  } else {
                    document.exitFullscreen().catch(() => {});
                    setIsFullscreen(false);
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#F9FAFB', fontWeight: 700, fontSize: '0.90rem', cursor: 'pointer' }}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span>{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
              </button>

              <button
                type="button"
                onClick={() => setProjectorActivity(null)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #991B1B', backgroundColor: '#7F1D1D', color: '#FFFFFF', fontWeight: 700, fontSize: '0.90rem', cursor: 'pointer' }}
              >
                Fechar Projeção
              </button>
            </div>
          </div>

          {/* Conteúdo Principal do Telão */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center' }}>
            {/* Informações da Atividade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '1.0rem', fontWeight: 700, color: '#A855F7', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-block', marginBottom: '16px' }}>
                  {(projectorActivity.type || 'Palestra').toUpperCase()}
                </span>
                <h1 style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: '1.15', color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                  {projectorActivity.title}
                </h1>
              </div>

              {/* Informações dos Palestrantes */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>
                  PALESTRANTE(S) / CONVIDADO(S)
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8' }}>
                  {projectorActivity.speaker || (Array.isArray(projectorActivity.speakers) && projectorActivity.speakers.length > 0 ? projectorActivity.speakers.map(s => s.name).join(', ') : 'Comissão FACOM')}
                </div>
                {projectorActivity.speakerRole && (
                  <div style={{ fontSize: '1.05rem', color: '#D1D5DB', marginTop: '4px' }}>
                    {projectorActivity.speakerRole}
                  </div>
                )}
              </div>

              {/* Local & Pontuação */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>LOCAL / SALA</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F9FAFB', marginTop: '4px' }}>
                    {projectorActivity.location || 'Anfiteatro FACOM'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '2px solid #10B981', borderRadius: '16px', padding: '20px' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase' }}>PONTOS DE PRESENÇA</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34D399', marginTop: '2px' }}>
                    +{projectorActivity.points || 50} PTS
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code de Projeção em Tela Cheia */}
            <div style={{ backgroundColor: '#0F172A', border: '2px solid #2563EB', borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(37, 99, 235, 0.25)' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                <QRCodeSVG
                  value={projectorQrValue}
                  size={320}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F9FAFB', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Radio size={20} color="#38BDF8" className="animate-pulse" />
                  <span>Abra a Câmera do App e Escaneie</span>
                </div>
                <div style={{ fontSize: '0.90rem', color: '#9CA3AF' }}>
                  Código rotativo de segurança atualiza em <strong style={{ color: '#38BDF8' }}>{projectorCountdown}s</strong>
                </div>

                {/* Barra de Progresso */}
                <div style={{ width: '280px', height: '6px', backgroundColor: '#1E293B', borderRadius: '3px', marginTop: '14px', overflow: 'hidden', margin: '14px auto 0' }}>
                  <div style={{ width: `${(projectorCountdown / 30) * 100}%`, height: '100%', backgroundColor: '#2563EB', transition: 'width 1s linear' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOCAL */}
      {isLocationModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', overflow: 'hidden', color: '#F9FAFB' }}>
            <div style={{ backgroundColor: '#1E293B', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>Cadastrar Local / Sala</h3>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Nome do Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anfiteatro 5R"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Capacidade de Vagas</label>
                <input
                  type="number"
                  required
                  placeholder="120"
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.80rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600 }}
                >
                  Salvar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE DE PRESENÇA */}
      {qrModalActivity && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#F9FAFB' }}>
            <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Validação de Presença
            </span>
            <h3 style={{ margin: '6px 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#F9FAFB' }}>
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

            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#9CA3AF' }}>
              Projete este código no telão da sala para os participantes realizarem o check-in presencial.
            </p>

            <button
              type="button"
              onClick={() => setQrModalActivity(null)}
              style={{ width: '100%', padding: '9px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR MISSÃO (KAN-104) */}
      {isMissionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#F9FAFB', boxShadow: '0 12px 36px rgba(0,0,0,0.7)' }}>
            
            <div style={{ backgroundColor: '#1E293B', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#3B82F6" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  {editingMissionId ? 'Editar Missão' : 'Cadastrar Nova Missão'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMissionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMission} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Título e Pontuação */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Título da Missão *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conheça o Stand da Kanastra"
                    value={missionForm.title}
                    onChange={(e) => setMissionForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Pontuação (XP) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={missionForm.points}
                    onChange={(e) => setMissionForm(prev => ({ ...prev, points: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#60A5FA', fontWeight: 700, fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Descrição e Instruções *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explique o que o participante precisa fazer para concluir..."
                  value={missionForm.description}
                  onChange={(e) => setMissionForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Categoria e Ícone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Categoria
                  </label>
                  <select
                    value={missionForm.category}
                    onChange={(e) => setMissionForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    <option value="sponsors">Patrocinadores</option>
                    <option value="networking">Networking</option>
                    <option value="social">Social & Mídia</option>
                    <option value="activities">Palestras & Trilhas</option>
                    <option value="flash">Missão Relâmpago</option>
                    <option value="special">Missões Especiais</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Ícone Representativo
                  </label>
                  <select
                    value={missionForm.icon}
                    onChange={(e) => setMissionForm(prev => ({ ...prev, icon: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    <option value="Sparkles">✨ Sparkles (Padrão)</option>
                    <option value="Zap">⚡ Zap (Relâmpago)</option>
                    <option value="Camera">📷 Câmera / Stories</option>
                    <option value="MapPin">📍 Localização / Stand</option>
                    <option value="Users">👥 Networking / Conexões</option>
                    <option value="Lock">🔒 Palavra Secreta / Cadeado</option>
                    <option value="MessageCircle">💬 Conversa / Depoimento</option>
                    <option value="HelpCircle">❓ Quiz / Pergunta</option>
                  </select>
                </div>
              </div>

              {/* SELETOR DE MODO DE GATILHO */}
              <div style={{ backgroundColor: '#1A2234', border: '1px solid #2D3748', borderRadius: '8px', padding: '14px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#93C5FD', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Modo de Validação / Gatilho da Missão
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {MISSION_TRIGGER_MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setMissionForm(prev => ({ ...prev, triggerMode: mode.id }))}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: missionForm.triggerMode === mode.id ? '#3B82F6' : '#374151',
                        backgroundColor: missionForm.triggerMode === mode.id ? 'rgba(59, 130, 246, 0.18)' : '#0B0F17',
                        color: missionForm.triggerMode === mode.id ? '#FFFFFF' : '#9CA3AF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.80rem'
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{mode.label}</div>
                      <div style={{ fontSize: '0.70rem', color: '#94A3B8', marginTop: '2px' }}>{mode.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Sub-painel: Palavra Secreta */}
                {missionForm.triggerMode === 'secret' && (
                  <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '6px', border: '1px solid #374151' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '4px' }}>
                      Palavra-chave Secreta Obrigatória (Validação Case-Insensitive) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: OPORTUNIDADES"
                      value={missionForm.secretWord}
                      onChange={(e) => setMissionForm(prev => ({ ...prev, secretWord: e.target.value.toUpperCase() }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F472B6', fontWeight: 700, fontSize: '0.84rem', letterSpacing: '0.05em', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: '0.70rem', color: '#9CA3AF', display: 'block', marginTop: '4px' }}>
                      O aluno precisará digitar exatamente essa palavra para desbloquear o XP.
                    </span>
                  </div>
                )}

                {/* Sub-painel: Quiz / Pergunta */}
                {missionForm.triggerMode === 'quiz' && (
                  <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '6px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '4px' }}>
                        Pergunta do Quiz *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Qual tecnologia é amplamente utilizada pela empresa?"
                        value={missionForm.quizQuestion}
                        onChange={(e) => setMissionForm(prev => ({ ...prev, quizQuestion: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                        Alternativas (Selecione a correta) *
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {missionForm.quizOptions.map((opt, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="radio"
                              name="correctOption"
                              checked={missionForm.quizCorrectIndex === idx}
                              onChange={() => setMissionForm(prev => ({ ...prev, quizCorrectIndex: idx }))}
                            />
                            <input
                              type="text"
                              required
                              placeholder={`Alternativa ${idx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...missionForm.quizOptions];
                                newOpts[idx] = e.target.value;
                                setMissionForm(prev => ({ ...prev, quizOptions: newOpts }));
                              }}
                              style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.80rem' }}
                            />
                            {missionForm.quizOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = missionForm.quizOptions.filter((_, i) => i !== idx);
                                  setMissionForm(prev => ({ ...prev, quizOptions: newOpts, quizCorrectIndex: 0 }));
                                }}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {missionForm.quizOptions.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setMissionForm(prev => ({ ...prev, quizOptions: [...prev.quizOptions, ''] }))}
                          style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#93C5FD', fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          + Adicionar Alternativa
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-painel: Formulário & Mídia */}
                {missionForm.triggerMode === 'form' && (
                  <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '6px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#D1D5DB' }}>
                        Campos do Formulário de Conclusão ({missionForm.fields.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newField = {
                            id: `f_${Date.now()}`,
                            label: 'Nova Pergunta',
                            type: 'text',
                            required: true
                          };
                          setMissionForm(prev => ({ ...prev, fields: [...prev.fields, newField] }));
                        }}
                        style={{ padding: '3px 8px', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '4px', color: '#93C5FD', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        + Adicionar Campo
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {missionForm.fields.map((field, fIdx) => (
                        <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#111827', padding: '8px', borderRadius: '6px', border: '1px solid #1F2937' }}>
                          <input
                            type="text"
                            required
                            placeholder="Pergunta / Rótulo"
                            value={field.label}
                            onChange={(e) => {
                              const newF = [...missionForm.fields];
                              newF[fIdx].label = e.target.value;
                              setMissionForm(prev => ({ ...prev, fields: newF }));
                            }}
                            style={{ flex: 2, padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                          />

                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newF = [...missionForm.fields];
                              newF[fIdx].type = e.target.value;
                              if (e.target.value === 'select' && !newF[fIdx].options) {
                                newF[fIdx].options = ['Opção 1', 'Opção 2'];
                              }
                              setMissionForm(prev => ({ ...prev, fields: newF }));
                            }}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.78rem' }}
                          >
                            <option value="text">Texto Curto</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="photo">Foto / Comprovante</option>
                            <option value="select">Múltipla Escolha</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const newF = missionForm.fields.filter((_, i) => i !== fIdx);
                              setMissionForm(prev => ({ ...prev, fields: newF }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-painel: Automático pelo App */}
                {missionForm.triggerMode === 'auto' && (
                  <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '6px', border: '1px solid #374151' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '4px' }}>
                      Evento Disparador do App *
                    </label>
                    <select
                      value={missionForm.autoEventType}
                      onChange={(e) => setMissionForm(prev => ({ ...prev, autoEventType: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem' }}
                    >
                      <option value="sponsor_visit">Escanear Stand de Patrocinador</option>
                      <option value="lecture_checkin">Check-in Presencial em Atividade</option>
                      <option value="network_first">Primeira Conexão no App</option>
                      <option value="network_course">Conectar com Aluno de Outro Curso</option>
                      <option value="network_external">Conectar com Aluno de Outra Instituição/Empresa</option>
                      <option value="network_freshman">Conectar com Calouro (1º Período)</option>
                      <option value="passport_complete">Completar Passaporte de Patrocinadores</option>
                    </select>
                  </div>
                )}
              </div>

              {/* MODIFICADOR RELÂMPAGO */}
              <div style={{ backgroundColor: '#1C1917', border: '1px solid #78350F', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="#F59E0B" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FDE68A' }}>
                      Ativar como Missão Relâmpago (Flash Mission)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={missionForm.isFlash}
                    onChange={(e) => setMissionForm(prev => ({ ...prev, isFlash: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                {missionForm.isFlash && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#D1D5DB', marginBottom: '4px' }}>
                        Duração (Minutos)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={missionForm.flashDuration}
                        onChange={(e) => setMissionForm(prev => ({ ...prev, flashDuration: e.target.value }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#FDE68A', fontWeight: 700, fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#D1D5DB', marginBottom: '4px' }}>
                        Limite de Vencedores (Opcional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ilimitado se vazio"
                        value={missionForm.flashMaxWinners}
                        onChange={(e) => setMissionForm(prev => ({ ...prev, flashMaxWinners: e.target.value }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#FDE68A', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#D1D5DB', marginBottom: '4px' }}>
                        Frase de Chamada do Mascote (Teko / Weeka)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: WEEKA: A TechWeek inteira tem uma missão relâmpago!"
                        value={missionForm.flashMascotDialogue}
                        onChange={(e) => setMissionForm(prev => ({ ...prev, flashMascotDialogue: e.target.value }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#FDE68A', fontSize: '0.80rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsMissionModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMission}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSavingMission ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingMissionId ? 'Salvar Alterações' : 'Criar Missão'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPARO RELÂMPAGO RÁPIDO (KAN-104) */}
      {isFlashQuickModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#111827', border: '1px solid #B45309', borderRadius: '10px', overflow: 'hidden', color: '#F9FAFB', boxShadow: '0 12px 36px rgba(0,0,0,0.8)' }}>
            
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
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
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
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#F9FAFB', textAlign: 'left', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600, color: '#FDE68A' }}>{preset.title}</div>
                      <div style={{ fontSize: '0.70rem', color: '#9CA3AF' }}>{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Missão Alvo no App *
                </label>
                <select
                  value={flashTargetMission?.id || ''}
                  onChange={(e) => {
                    const found = missionsList.find(m => m.id === e.target.value);
                    setFlashTargetMission(found || null);
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
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
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Duração (Minutos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={flashQuickDuration}
                    onChange={(e) => setFlashQuickDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#FDE68A', fontWeight: 700, fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Fala do Mascote (Alerta em Tempo Real)
                  </label>
                  <input
                    type="text"
                    value={flashQuickMascotText}
                    onChange={(e) => setFlashQuickMascotText(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsFlashQuickModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.82rem', cursor: 'pointer' }}
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

      {/* MODAL DE FEEDBACK */}
      {feedback && (
        <FeedbackModal
          isOpen={true}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}

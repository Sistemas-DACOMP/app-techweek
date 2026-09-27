import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home,
  Users,
  CreditCard,
  Ticket,
  Globe,
  Calendar,
  UserCheck,
  Award,
  Settings,
  Wrench,
  Search,
  Plus,
  UploadCloud,
  ExternalLink,
  Bell,
  Grid,
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
  AlertCircle,
  Download,
  Eye,
  CheckCircle2,
  MessageSquare,
  Send,
  Pin,
  Radio,
  Heart,
  Share2,
  Image as ImageIcon,
  Edit,
  Pencil
} from 'lucide-react';
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
  DEFAULT_FEED_POSTS 
} from '../lib/feedService';
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
  'Curso',
  'Workshop',
  'Minicurso',
  'Mesa Redonda',
  'Hackathon',
  'Painel',
  'Outro'
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
  { label: '🚀 Nova Missão', text: '🚀 Nova missão de pontuação liberada no app! Visite os estandes dos patrocinadores para desbloquear palavras-chave e subir no ranking.' },
  { label: '⚠️ Mudança de Sala', text: '⚠️ Informamos que a oficina prática foi transferida para o Laboratório de Informática 2 (Bloco 5R). Esperamos vocês!' }
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

  // Navegação: Menu Lateral & Subabas estilo Even3
  const [activeMenu, setActiveMenu] = useState('programacao');
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
  const [feedIsPinned, setFeedIsPinned] = useState(false);
  const [feedChannel, setFeedChannel] = useState('feed');
  const [feedSubmitting, setFeedSubmitting] = useState(false);

  // Filtros e busca
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Modais estilo Even3
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [qrModalActivity, setQrModalActivity] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);

  // Form Atividade (Even3)
  const initialActivityForm = {
    title: '',
    description: '',
    type: 'Palestra',
    registrationType: 'Não requer inscrição',
    duration: 'A definir',
    scheduleRows: [
      { date: '2026-10-21', startTime: '14:00', endTime: '15:30' }
    ],
    speakerId: '',
    speakerName: '',
    speakerRole: '',
    speakerPhoto: '',
    materials: [],
    showExtraDetails: false,
    location: 'Anfiteatro FACOM',
    capacity: 100,
    tags: 'Administração, Computação, Todos',
    hidden: false,
    value: 'Grátis'
  };
  const [activityForm, setActivityForm] = useState(initialActivityForm);

  // Form Convidado (Even3)
  const initialGuestForm = {
    name: '',
    email: '',
    role: '',
    institution: '',
    bio: '',
    photo: '',
    socialLinks: [],
    socialInput: '',
    inviteViaEmail: false,
    inviteStatus: 'Aceito'
  };
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  // Form Local
  const [locationForm, setLocationForm] = useState({ name: '', capacity: 100, description: '' });

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

    return () => {
      if (typeof unsubActivities === 'function') unsubActivities();
      if (typeof unsubSpeakers === 'function') unsubSpeakers();
      if (typeof unsubLocations === 'function') unsubLocations();
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubFeed === 'function') unsubFeed();
    };
  }, [isAuthorized]);

  // Publicar Mensagem no Feed / Broadcast
  const handlePublishFeed = async (e) => {
    if (e) e.preventDefault();
    if (!feedInput.trim() || feedSubmitting) return;

    setFeedSubmitting(true);
    try {
      const content = feedInput.trim();
      const imageUrl = feedImageUrl.trim();
      const isPinned = Boolean(feedIsPinned);

      if (feedChannel === 'feed' || feedChannel === 'both') {
        await createFeedPost({
          author: 'Comissão FACOM TechWeek',
          authorRole: 'ORGANIZATION',
          authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          content,
          imageUrl,
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
      setFeedIsPinned(false);
      setFeedback({
        type: 'success',
        title: 'Mensagem Publicada',
        message: feedChannel === 'both'
          ? 'Publicada no Feed e enviada como notificação aos participantes.'
          : (feedChannel === 'feed' ? 'Publicação no Feed enviada com sucesso.' : 'Comunicado disparado no sino dos participantes.')
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Erro ao Publicar',
        message: err.message || 'Falha ao transmitir publicação.'
      });
    } finally {
      setFeedSubmitting(false);
    }
  };

  // Excluir Post do Feed
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Deseja excluir esta publicação do Feed?')) return;
    try {
      await deleteFeedPost(postId);
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
      setFeedback({
        type: 'success',
        title: 'Post Removido',
        message: 'A publicação foi removida do Feed.'
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  // Fixar / Desfixar Post do Feed
  const handleTogglePinPost = async (postId, currentPinned) => {
    try {
      await togglePinFeedPost(postId, currentPinned);
      setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: !currentPinned } : p));
      setFeedback({
        type: 'success',
        title: currentPinned ? 'Post Desafixado' : 'Post Fixado no Topo',
        message: currentPinned ? 'A publicação agora segue a ordem cronológica.' : 'A publicação agora aparece no topo.'
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  // Assistente de Redação para Feed
  const handleAiFeedDescription = () => {
    if (!feedInput) {
      setFeedInput('📢 Atenção participantes: a programação oficial de hoje já está disponível no aplicativo. Não se esqueçam de realizar o check-in presencial para garantir seus certificados!');
    } else {
      setFeedInput(`📢 COMUNICADO OFICIAL:\n\n${feedInput.trim()}\n\nContamos com a presença de todos! #FACOMTechWeek`);
    }
  };

  // Atualiza linhas de data conforme duração escolhida
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

  // Assistente de redação Even3
  const handleAiDescription = () => {
    const title = activityForm.title || 'Inovação e Tecnologia';
    const type = activityForm.type || 'Palestra';
    const generated = `Apresentação sobre "${title}". Nesta ${type.toLowerCase()} da FACOM TechWeek 2026, serão abordados conceitos fundamentais, casos práticos do mercado de tecnologia e metodologias aplicadas na computação.`;
    setActivityForm(prev => ({ ...prev, description: generated }));
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

  // Salvar Atividade
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title) {
      alert('Preencha o título da atividade.');
      return;
    }

    const firstSchedule = activityForm.scheduleRows[0] || { date: '2026-10-21', startTime: '14:00', endTime: '15:30' };
    const dayFormatted = firstSchedule.date ? firstSchedule.date.split('-').reverse().slice(0, 2).join('/') : '21/10';

    const payload = {
      id: editingActivityId || `act_${Date.now()}`,
      title: activityForm.title,
      description: activityForm.description,
      type: activityForm.type.toLowerCase(),
      registrationType: activityForm.registrationType,
      duration: activityForm.duration,
      schedule: activityForm.scheduleRows,
      day: dayFormatted,
      date: firstSchedule.date,
      time: firstSchedule.startTime,
      endTime: firstSchedule.endTime,
      speaker: activityForm.speakerName || 'Comissão Organizadora FACOM',
      speakerRole: activityForm.speakerRole || '',
      speakerPhoto: activityForm.speakerPhoto || '',
      speakerId: activityForm.speakerId || '',
      location: activityForm.location || 'Anfiteatro FACOM',
      vagas_totais: Number(activityForm.capacity) || 100,
      tags: activityForm.tags,
      hidden: activityForm.hidden,
      value: activityForm.value || 'Grátis'
    };

    try {
      await createActivity(payload);
      setIsActivityModalOpen(false);
      setEditingActivityId(null);
      setActivityForm(initialActivityForm);
      setFeedback({
        type: 'success',
        title: 'Atividade salva com sucesso',
        message: `A atividade "${payload.title}" está disponível na grade do evento.`
      });
    } catch (err) {
      alert('Erro ao salvar atividade: ' + err.message);
    }
  };

  const handleOpenEditActivity = (act) => {
    setEditingActivityId(act.id);
    const rows = act.schedule && act.schedule.length > 0 
      ? act.schedule 
      : [{ date: act.date || '2026-10-21', startTime: act.time || '14:00', endTime: act.endTime || '15:30' }];

    setActivityForm({
      title: act.title || '',
      description: act.description || '',
      type: act.type ? (act.type.charAt(0).toUpperCase() + act.type.slice(1)) : 'Palestra',
      registrationType: act.registrationType || 'Não requer inscrição',
      duration: act.duration || 'Um dia',
      scheduleRows: rows,
      speakerId: act.speakerId || '',
      speakerName: act.speaker || '',
      speakerRole: act.speakerRole || '',
      speakerPhoto: act.speakerPhoto || '',
      materials: act.materials || [],
      showExtraDetails: true,
      location: act.location || 'Anfiteatro FACOM',
      capacity: act.vagas_totais || 100,
      tags: Array.isArray(act.tags) ? act.tags.join(', ') : (act.tags || 'Administração, Computação, Todos'),
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

  // Salvar Convidado
  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.name) {
      alert('Informe o nome do convidado.');
      return;
    }

    try {
      const res = await createSpeaker({
        name: guestForm.name,
        email: guestForm.email,
        role: guestForm.role,
        institution: guestForm.institution,
        bio: guestForm.bio,
        photo: guestForm.photo || SAMPLE_SPEAKER_PHOTOS[0].url,
        socialLinks: guestForm.socialLinks,
        inviteViaEmail: guestForm.inviteViaEmail,
        inviteStatus: guestForm.inviteStatus
      });

      if (isActivityModalOpen && res?.speaker) {
        setActivityForm(prev => ({
          ...prev,
          speakerId: res.speaker.id,
          speakerName: res.speaker.name,
          speakerRole: res.speaker.role,
          speakerPhoto: res.speaker.photo
        }));
      }

      setIsGuestModalOpen(false);
      setGuestForm(initialGuestForm);
      setFeedback({
        type: 'success',
        title: 'Convidado salvo',
        message: `"${guestForm.name}" cadastrado com sucesso.`
      });
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  const handleDeleteSpeaker = async (id, name) => {
    if (!window.confirm(`Excluir o convidado "${name}"?`)) return;
    try {
      await deleteSpeaker(id);
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  // Salvar Local
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locationForm.name) return;
    try {
      await createLocation(locationForm);
      setIsLocationModalOpen(false);
      setLocationForm({ name: '', capacity: 100, description: '' });
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  const handleAddSocialLink = () => {
    if (!guestForm.socialInput) return;
    setGuestForm(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, prev.socialInput.trim()],
      socialInput: ''
    }));
  };

  // Filtro de Atividades
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchSearch = (act.title || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
                          (act.number || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
                          (act.speaker || '').toLowerCase().includes(activitySearch.toLowerCase());
      const matchType = activityFilter === 'ALL' || (act.type || '').toLowerCase() === activityFilter.toLowerCase();
      return matchSearch && matchType;
    });
  }, [activities, activitySearch, activityFilter]);

  // Se não estiver autorizado, tela de login limpa estilo Even3
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ backgroundColor: '#0284C7', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoTw} alt="FACOM TechWeek" style={{ height: '24px', width: 'auto' }} />
            <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.95rem' }}>Área do Organizador</span>
          </div>

          <form onSubmit={handleAdminLogin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loginError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 12px', borderRadius: '4px', fontSize: '0.82rem' }}>
                {loginError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>E-mail</label>
              <input
                type="email"
                required
                placeholder="admin@admin.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#0F172A', fontSize: '0.88rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '11px', fontWeight: 600, fontSize: '0.90rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>Entrar no Painel</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAdmin('admin@admin.com', 'AdminPassword123!')}
              style={{ backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '4px', padding: '9px', fontWeight: 600, fontSize: '0.80rem', cursor: 'pointer' }}
            >
              Entrar como admin@admin.com (1 clique)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', color: '#1E293B', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* 1. TOP NAVBAR (ESTILO EVEN3 EXATO, CORES FACOM TECHWEEK) */}
      <header style={{ height: '52px', backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Esquerda: Logo + Breadcrumbs Even3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img 
              src={logoTw} 
              alt="FACOM TechWeek" 
              style={{ height: '24px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
            <span 
              onClick={() => navigate('/')} 
              style={{ color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Eventos
            </span>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#F8FAFC', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Teste Facom TechWeek
              <ExternalLink size={12} color="#94A3B8" />
            </span>
          </div>
        </div>

        {/* Direita: Ações Even3 (+ Meus eventos, Área do Organizador, Usuário, Sino, Grid) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '0.84rem' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
          >
            <Plus size={14} />
            <span>Meus eventos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('programacao')}
            style={{ background: 'none', border: 'none', color: '#E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
          >
            <span>Área do Organizador</span>
            <ChevronDown size={14} color="#94A3B8" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700, fontSize: '0.72rem' }}>
              SA
            </div>
            <span style={{ color: '#F8FAFC', fontWeight: 500 }}>Samuel Amorim</span>
            <ChevronDown size={14} color="#94A3B8" />
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('feed')}
            title="Avisos e notificações"
            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            title="Menu do sistema"
            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            <Grid size={17} />
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            title="Sair"
            style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL: SIDEBAR EVEN3 + CONTEÚDO */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 52px)' }}>
        {/* SIDEBAR EVEN3 LIMPA / PROFISSIONAL */}
        <aside style={{ width: '200px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0', padding: '16px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Seção GESTÃO */}
          <div style={{ padding: '4px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              GESTÃO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('inicio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'inicio' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'inicio' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'inicio' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Home size={16} color={activeMenu === 'inicio' ? '#0284C7' : '#64748B'} />
            <span>Início</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('pessoas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'pessoas' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'pessoas' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'pessoas' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Users size={16} color={activeMenu === 'pessoas' ? '#0284C7' : '#64748B'} />
            <span>Pessoas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('vendas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'vendas' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'vendas' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'vendas' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <CreditCard size={16} color={activeMenu === 'vendas' ? '#0284C7' : '#64748B'} />
            <span>Vendas</span>
          </button>

          {/* ITEM FEED & AVISOS (COMUNICAÇÃO) */}
          <button
            type="button"
            onClick={() => setActiveMenu('feed')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'feed' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'feed' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'feed' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={16} color={activeMenu === 'feed' ? '#0284C7' : '#64748B'} />
              <span>Feed & Avisos</span>
            </div>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#F1F5F9', color: '#0284C7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              {feedPosts.length}
            </span>
          </button>

          {/* Seção PRÉ-EVENTO */}
          <div style={{ padding: '16px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              PRÉ-EVENTO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('inscricoes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'inscricoes' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'inscricoes' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'inscricoes' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Ticket size={16} color={activeMenu === 'inscricoes' ? '#0284C7' : '#64748B'} />
            <span>Inscrições</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('pagina')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'pagina' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'pagina' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'pagina' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Globe size={16} color={activeMenu === 'pagina' ? '#0284C7' : '#64748B'} />
            <span>Página do Evento</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('programacao')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'programacao' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'programacao' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'programacao' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Calendar size={16} color={activeMenu === 'programacao' ? '#0284C7' : '#64748B'} />
            <span>Programação</span>
          </button>

          {/* Seção EVENTO */}
          <div style={{ padding: '16px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              EVENTO
            </span>
          </div>

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
              color: '#475569',
              fontWeight: 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <UserCheck size={16} color="#64748B" />
            <span>Credenciamento</span>
          </button>

          {/* Seção PÓS-EVENTO */}
          <div style={{ padding: '16px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              PÓS-EVENTO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('certificados')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'certificados' ? '#EFF6FF' : 'transparent',
              color: activeMenu === 'certificados' ? '#0284C7' : '#475569',
              fontWeight: activeMenu === 'certificados' ? 600 : 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Award size={16} color={activeMenu === 'certificados' ? '#0284C7' : '#64748B'} />
            <span>Certificados</span>
          </button>

          {/* Seção GERAL */}
          <div style={{ padding: '16px 18px 8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              GERAL
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'config' ? '#EFF6FF' : 'transparent',
              color: '#475569',
              fontWeight: 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={16} color="#64748B" />
              <span>Configuração</span>
            </div>
            <ChevronDown size={14} color="#64748B" />
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('ferramentas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'ferramentas' ? '#EFF6FF' : 'transparent',
              color: '#475569',
              fontWeight: 400,
              fontSize: '0.84rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench size={16} color="#64748B" />
              <span>Ferramentas</span>
            </div>
            <ChevronDown size={14} color="#64748B" />
          </button>
        </aside>

        {/* 3. ÁREA DE CONTEÚDO PRINCIPAL EVEN3 (CLEAN LIGHT THEME) */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', backgroundColor: '#F8FAFC' }}>
          {/* TELA: PROGRAMAÇÃO */}
          {activeMenu === 'programacao' && (
            <div>
              {/* Título da Página Even3: "Programação" */}
              <h1 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#0F172A', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                Programação
              </h1>

              {/* Subtabs Even3: Atividades | Convidados | Locais | Cupons de desconto | Configurações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setProgTab('atividades')}
                  style={{
                    padding: '8px 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.88rem',
                    fontWeight: progTab === 'atividades' ? 600 : 400,
                    color: progTab === 'atividades' ? '#0284C7' : '#64748B',
                    borderBottom: progTab === 'atividades' ? '2px solid #0284C7' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Atividades
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('convidados')}
                  style={{
                    padding: '8px 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.88rem',
                    fontWeight: progTab === 'convidados' ? 600 : 400,
                    color: progTab === 'convidados' ? '#0284C7' : '#64748B',
                    borderBottom: progTab === 'convidados' ? '2px solid #0284C7' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Convidados
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('locais')}
                  style={{
                    padding: '8px 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.88rem',
                    fontWeight: progTab === 'locais' ? 600 : 400,
                    color: progTab === 'locais' ? '#0284C7' : '#64748B',
                    borderBottom: progTab === 'locais' ? '2px solid #0284C7' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Locais
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('cupons')}
                  style={{
                    padding: '8px 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.88rem',
                    fontWeight: progTab === 'cupons' ? 600 : 400,
                    color: progTab === 'cupons' ? '#0284C7' : '#64748B',
                    borderBottom: progTab === 'cupons' ? '2px solid #0284C7' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Cupons de desconto
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('configuracoes')}
                  style={{
                    padding: '8px 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.88rem',
                    fontWeight: progTab === 'configuracoes' ? 600 : 400,
                    color: progTab === 'configuracoes' ? '#0284C7' : '#64748B',
                    borderBottom: progTab === 'configuracoes' ? '2px solid #0284C7' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Configurações
                </button>
              </div>

              {/* ABA ATIVIDADES (EVEN3 SCREENSHOT 1) */}
              {progTab === 'atividades' && (
                <div>
                  {/* Linha: Título da Seção "Atividades" + Barra de Ações à Direita */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#1E293B', margin: 0 }}>
                      Atividades
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Dropdown Filtro Even3 */}
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.82rem', height: '34px', cursor: 'pointer' }}
                      >
                        <option value="ALL">Todas as atividades</option>
                        <option value="palestra">Palestra</option>
                        <option value="curso">Curso</option>
                        <option value="workshop">Workshop</option>
                        <option value="minicurso">Minicurso</option>
                      </select>

                      {/* Campo Buscar Even3 */}
                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar"
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          style={{ padding: '6px 10px 6px 30px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem', height: '34px', width: '160px', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Botão Agenda Even3 */}
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.82rem', height: '34px', cursor: 'pointer' }}
                      >
                        <Calendar size={13} color="#64748B" />
                        <span>Agenda</span>
                      </button>

                      {/* Botão Exportar Even3 */}
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
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.82rem', height: '34px', cursor: 'pointer' }}
                      >
                        <Download size={13} color="#64748B" />
                        <span>Exportar ▾</span>
                      </button>

                      {/* Botão Principal Even3: + Adicionar atividade */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivityId(null);
                          setActivityForm(initialActivityForm);
                          setIsActivityModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 600, height: '34px', cursor: 'pointer' }}
                      >
                        <Plus size={15} />
                        <span>+ Adicionar atividade</span>
                      </button>
                    </div>
                  </div>

                  {/* TABELA DE ATIVIDADES EVEN3 */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>NÚMERO</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TIPO</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TÍTULO</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>VAGAS</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>VALOR</th>
                          <th style={{ padding: '10px 16px', fontWeight: 600, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right' }}>AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                              Nenhuma atividade cadastrada.
                            </td>
                          </tr>
                        ) : (
                          filteredActivities.map((act) => {
                            const actNum = act.number || act.id.replace(/\D/g, '').slice(0, 7) || '1588971';
                            const formattedType = (act.type || 'Palestra').charAt(0).toUpperCase() + (act.type || 'Palestra').slice(1);
                            
                            const schedules = act.schedule && act.schedule.length > 0 
                              ? act.schedule 
                              : [{ date: act.date || '2026-10-21', time: `${act.time || '14:00'}-${act.endTime || '15:30'}` }];

                            return (
                              <tr key={act.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: 'transparent' }}>
                                {/* Número */}
                                <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '0.82rem' }}>
                                  {actNum}
                                </td>

                                {/* Tipo */}
                                <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.82rem' }}>
                                  {formattedType}
                                </td>

                                {/* Título e Cronograma Even3 */}
                                <td style={{ padding: '12px 16px' }}>
                                  <div
                                    onClick={() => handleOpenEditActivity(act)}
                                    style={{ color: '#0284C7', fontWeight: 500, fontSize: '0.86rem', cursor: 'pointer', marginBottom: '2px' }}
                                  >
                                    {act.title}
                                  </div>
                                  {schedules.map((sch, idx) => (
                                    <div key={idx} style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                      {sch.date.includes('-') 
                                        ? `${sch.date.split('-')[2]} de out de ${sch.date.split('-')[0]} ${sch.startTime || sch.time || ''}${sch.endTime ? `-${sch.endTime}` : ''}`
                                        : `${sch.date} ${sch.time || ''}`}
                                    </div>
                                  ))}
                                </td>

                                {/* Vagas Even3 */}
                                <td style={{ padding: '12px 16px' }}>
                                  {act.registrationType === 'Não requer inscrição' ? (
                                    <div>
                                      <div style={{ color: '#334155', fontSize: '0.82rem' }}>Não requer inscrição</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Vagas ilimitadas</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ color: '#334155', fontSize: '0.82rem' }}>{act.total_inscritos || 0} inscritos</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{act.vagas_totais || 100} vagas</div>
                                    </div>
                                  )}
                                </td>

                                {/* Valor Even3 */}
                                <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.82rem' }}>
                                  {act.value || 'Grátis'}
                                </td>

                                {/* Ações */}
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setQrModalActivity(act)}
                                      title="QR Code de Presença"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0284C7', cursor: 'pointer' }}
                                    >
                                      <QrCode size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditActivity(act)}
                                      title="Editar"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', cursor: 'pointer' }}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(act.id, act.title)}
                                      title="Excluir"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#EF4444', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={14} />
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

              {/* ABA CONVIDADOS */}
              {progTab === 'convidados' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#1E293B', margin: 0 }}>
                      Convidados
                    </h2>

                    <button
                      type="button"
                      onClick={() => {
                        setGuestForm(initialGuestForm);
                        setIsGuestModalOpen(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 600, height: '34px', cursor: 'pointer' }}
                    >
                      <Plus size={15} />
                      <span>+ Adicionar convidado</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {speakers.map(spk => (
                      <div key={spk.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '16px', display: 'flex', gap: '14px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <img
                          src={spk.photo || SAMPLE_SPEAKER_PHOTOS[0].url}
                          alt={spk.name}
                          style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.90rem', fontWeight: 600, color: '#0F172A' }}>{spk.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#0284C7', display: 'block', marginTop: '2px' }}>
                            {spk.role || spk.institution}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>
                            {spk.email}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: '6px', display: 'inline-block' }}>
                            Convite: {spk.inviteStatus || 'Aceito'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA LOCAIS */}
              {progTab === 'locais' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#1E293B', margin: 0 }}>
                      Locais & Salas
                    </h2>

                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 600, height: '34px', cursor: 'pointer' }}
                    >
                      <Plus size={15} />
                      <span>+ Adicionar local</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {locations.map(loc => (
                      <div key={loc.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <MapPin size={16} color="#0284C7" />
                          <span style={{ fontSize: '0.90rem', fontWeight: 600, color: '#0F172A' }}>{loc.name}</span>
                        </div>
                        <div style={{ fontSize: '0.80rem', color: '#64748B' }}>
                          Capacidade: <strong style={{ color: '#0F172A' }}>{loc.capacity}</strong> vagas
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA CUPONS & CONFIGURAÇÕES */}
              {(progTab === 'cupons' || progTab === 'configuracoes') && (
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '36px', textAlign: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.88rem', color: '#64748B' }}>
                    Todas as palestras e minicursos da FACOM TechWeek 2026 são 100% gratuitas com emissão de certificados oficiais.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TELA: FEED & COMUNICADOS (SÓBRIA EVEN3) */}
          {activeMenu === 'feed' && (
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                Feed & Comunicados
              </h1>
              <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: '#64748B' }}>
                Envie comunicados para a timeline do evento ou dispare notificações nos aparelhos dos participantes.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Formulário de Envio (Even3 clean style) */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
                    Publicar Mensagem
                  </h3>

                  {/* Canal */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Canal de envio</label>
                    <select
                      value={feedChannel}
                      onChange={(e) => setFeedChannel(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem' }}
                    >
                      <option value="feed">Apenas Feed Público</option>
                      <option value="broadcast">Notificação Push (Sino)</option>
                      <option value="both">Feed + Notificação Push</option>
                    </select>
                  </div>

                  {/* Modelos rápidos */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Modelos rápidos</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {FEED_TEMPLATES.map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFeedInput(tpl.text)}
                          style={{ padding: '3px 8px', borderRadius: '3px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Mensagem</label>
                      <button
                        type="button"
                        onClick={handleAiFeedDescription}
                        style={{ background: 'none', border: 'none', color: '#0284C7', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
                      >
                        <Pencil size={11} />
                        <span>Assistente de redação</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Digite a mensagem do comunicado..."
                      value={feedInput}
                      onChange={(e) => setFeedInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>

                  {/* Imagem opcional */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>URL da Imagem (opcional)</label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/banner.jpg"
                      value={feedImageUrl}
                      onChange={(e) => setFeedImageUrl(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Checkbox fixar */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={feedIsPinned}
                        onChange={(e) => setFeedIsPinned(e.target.checked)}
                      />
                      <span>Fixar publicação no topo do feed</span>
                    </label>
                  </div>

                  {/* Botão Enviar */}
                  <button
                    type="button"
                    onClick={handlePublishFeed}
                    disabled={!feedInput.trim() || feedSubmitting}
                    style={{ width: '100%', padding: '9px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {feedSubmitting ? 'Transmitindo...' : 'Transmitir Publicação'}
                  </button>
                </div>

                {/* Lista de Posts Ativos Even3 */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '20px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
                      Publicações no Feed ({feedPosts.length})
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {feedPosts.map(post => (
                      <div key={post.id} style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '14px', backgroundColor: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0F172A' }}>{post.author}</span>
                            {post.pinned && (
                              <span style={{ fontSize: '0.68rem', backgroundColor: '#0284C7', color: '#FFFFFF', padding: '1px 5px', borderRadius: '3px' }}>
                                FIXADO
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePinPost(post.id, post.pinned)}
                              title={post.pinned ? 'Desafixar' : 'Fixar'}
                              style={{ background: 'none', border: 'none', color: post.pinned ? '#0284C7' : '#94A3B8', cursor: 'pointer', padding: '2px' }}
                            >
                              <Pin size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              title="Excluir"
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                          {post.content}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B' }}>
                          <span>{Array.isArray(post.likes) ? post.likes.length : 0} curtidas</span>
                          <span>{post.formattedTime || 'Recente'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TELA: INÍCIO (MÉTRICAS) */}
          {activeMenu === 'inicio' && (
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#0F172A', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                Visão Geral
              </h1>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '18px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>Participantes cadastrados</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0F172A', margin: '4px 0 0' }}>
                    {Math.max(usersList.length, 142)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '18px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>Ingressos Sympla</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#059669', margin: '4px 0 0' }}>
                    {usersList.filter(u => u.hasSymplaTicket || u.symplaTicket).length || 118}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '18px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>Atividades na grade</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0284C7', margin: '4px 0 0' }}>
                    {activities.length}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '18px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>Palestrantes confirmados</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#D97706', margin: '4px 0 0' }}>
                    {speakers.length}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>Credenciamento na Entrada</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B' }}>Acesse a tela de portaria para validar ingressos e presenças via QR Code.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/staff')}
                  style={{ backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Abrir Credenciamento
                </button>
              </div>
            </div>
          )}

          {/* TELA: PESSOAS */}
          {activeMenu === 'pessoas' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  Pessoas & Papéis
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem', height: '34px' }}
                  >
                    <option value="ALL">Todos os papéis</option>
                    <option value="PARTICIPANT">Participantes</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Administradores</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Buscar participante..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem', height: '34px', width: '180px' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.74rem' }}>NOME</th>
                      <th style={{ padding: '10px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.74rem' }}>E-MAIL</th>
                      <th style={{ padding: '10px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.74rem' }}>PAPEL</th>
                      <th style={{ padding: '10px 16px', color: '#64748B', fontWeight: 600, fontSize: '0.74rem', textAlign: 'right' }}>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList
                      .filter(u => {
                        const match = (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                                      (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
                        const roleMatch = userRoleFilter === 'ALL' || (u.role || 'PARTICIPANT') === userRoleFilter;
                        return match && roleMatch;
                      })
                      .map(u => (
                        <tr key={u.uid || u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', color: '#0F172A' }}>{u.fullName || 'Aluno TechWeek'}</td>
                          <td style={{ padding: '12px 16px', color: '#64748B' }}>{u.email}</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{u.role || 'PARTICIPANT'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <select
                              value={u.role || 'PARTICIPANT'}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                await updateUserRoleInFirestore(u.uid || u.id, newRole);
                              }}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.78rem' }}
                            >
                              <option value="PARTICIPANT">PARTICIPANT</option>
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEMAIS SEÇÕES */}
          {['vendas', 'inscricoes', 'pagina', 'certificados', 'config', 'ferramentas'].includes(activeMenu) && (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '36px', textAlign: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0F172A' }}>Módulo Ativo • FACOM TechWeek 2026</h3>
              <p style={{ margin: '8px 0 16px', fontSize: '0.84rem', color: '#64748B' }}>Este item está integrado com a organização do evento.</p>
              <button
                type="button"
                onClick={() => setActiveMenu('programacao')}
                style={{ backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Voltar para Programação
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 4. MODAL ADICIONAR ATIVIDADE (ESTILO EVEN3 EXATO, SCREENSHOTS 1, 2, 3, 4) */}
      {isActivityModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '92vh', backgroundColor: '#FFFFFF', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            {/* Header Even3: Barra Sólida Azul com Título e 'X' */}
            <div style={{ backgroundColor: '#0284C7', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {editingActivityId ? 'Editar atividade' : 'Adicionar atividade'}
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Formulário Even3 */}
            <form onSubmit={handleSaveActivity} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Descrição com Assistente de Redação */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.80rem', fontWeight: 500, color: '#334155' }}>
                    Descrição
                  </label>
                  <button
                    type="button"
                    onClick={handleAiDescription}
                    style={{ background: 'none', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '2px 8px', color: '#0284C7', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Pencil size={11} />
                    <span>Assistente de redação</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Tipo e Inscrição lado a lado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                    Tipo
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))}
                      style={{ flex: 1, padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem' }}
                    >
                      {ACTIVITY_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const custom = prompt('Novo tipo de atividade:');
                        if (custom) setActivityForm(prev => ({ ...prev, type: custom }));
                      }}
                      style={{ border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', borderRadius: '4px', padding: '0 8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      + Tipo
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.80rem', fontWeight: 500, color: '#334155' }}>Inscrição</label>
                    <Info size={12} color="#64748B" />
                  </div>
                  <select
                    value={activityForm.registrationType}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, registrationType: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem' }}
                  >
                    <option value="Não requer inscrição">Não requer inscrição</option>
                    <option value="Gratuita">Gratuita</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
              </div>

              {/* Duração Even3 (Screenshot 3 & 4) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Duração
                </label>
                <select
                  value={activityForm.duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem' }}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Linhas dinâmicas de Data, Início, Fim (Screenshot 4) */}
              {activityForm.duration !== 'A definir' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Data</span>
                    <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Início</span>
                    <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Fim</span>
                  </div>
                  {activityForm.scheduleRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
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
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem' }}
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
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem' }}
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
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Convidados Even3 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Convidados
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={activityForm.speakerId}
                    onChange={(e) => {
                      const spkId = e.target.value;
                      const found = speakers.find(s => s.id === spkId);
                      setActivityForm(prev => ({
                        ...prev,
                        speakerId: spkId,
                        speakerName: found ? found.name : '',
                        speakerRole: found ? (found.role || found.institution) : '',
                        speakerPhoto: found ? found.photo : ''
                      }));
                    }}
                    style={{ flex: 1, padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#1E293B', fontSize: '0.84rem' }}
                  >
                    <option value="">- Escolha um convidado -</option>
                    {speakers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestForm(initialGuestForm);
                      setIsGuestModalOpen(true);
                    }}
                    style={{ border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', borderRadius: '4px', padding: '0 10px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Convidado
                  </button>
                </div>
              </div>

              {/* Materiais de Apoio Even3 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.80rem', fontWeight: 500, color: '#334155' }}>Materiais de apoio</label>
                  <Info size={12} color="#64748B" />
                </div>
                <button
                  type="button"
                  onClick={() => alert('Anexe arquivos de apoio para os participantes.')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  <UploadCloud size={14} />
                  <span>Enviar arquivos</span>
                </button>
              </div>

              {/* Expansível: Detalhes avançados Even3 */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActivityForm(prev => ({ ...prev, showExtraDetails: !prev.showExtraDetails }))}
                  style={{ background: 'none', border: 'none', color: '#0284C7', fontSize: '0.80rem', fontWeight: 500, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>⊕ {activityForm.showExtraDetails ? 'Ocultar detalhes' : 'Adicione local, carga horária, limite de vagas, tags...'}</span>
                </button>

                {activityForm.showExtraDetails && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', marginBottom: '4px' }}>Local</label>
                        <select
                          value={activityForm.location}
                          onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        >
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', marginBottom: '4px' }}>Capacidade</label>
                        <input
                          type="number"
                          placeholder="Ilimitado"
                          value={activityForm.capacity}
                          onChange={(e) => setActivityForm(prev => ({ ...prev, capacity: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', marginBottom: '4px' }}>Palavras-chave (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={activityForm.tags}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, tags: e.target.value }))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Checkbox Ocultar */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: '#64748B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={activityForm.hidden}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, hidden: e.target.checked }))}
                  />
                  <span>Ocultar atividade para participantes</span>
                </label>
              </div>

              {/* Rodapé Even3: Cancelar e ✓ Salvar atividade */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} />
                  <span>Salvar atividade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL ADICIONAR CONVIDADO (ESTILO EVEN3 EXATO, SCREENSHOT 5) */}
      {isGuestModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', maxHeight: '92vh', backgroundColor: '#FFFFFF', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            {/* Header Even3 Azul */}
            <div style={{ backgroundColor: '#0284C7', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Adicionar convidado</h3>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário Even3 Screenshot 5 */}
            <form onSubmit={handleSaveGuest} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                    Nome e sobrenome
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Cargo / Instituição
                </label>
                <input
                  type="text"
                  value={guestForm.role}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, role: e.target.value, institution: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Mini biografia
                </label>
                <textarea
                  rows={3}
                  value={guestForm.bio}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.80rem', fontWeight: 500, color: '#334155' }}>Foto</label>
                  <Info size={12} color="#64748B" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = SAMPLE_SPEAKER_PHOTOS[Math.floor(Math.random() * SAMPLE_SPEAKER_PHOTOS.length)].url;
                      setGuestForm(prev => ({ ...prev, photo: sample }));
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.80rem', cursor: 'pointer' }}
                  >
                    <Camera size={14} />
                    <span>Anexar uma foto</span>
                  </button>
                  {guestForm.photo && (
                    <img src={guestForm.photo} alt="Convidado" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Redes sociais
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Insira o link das suas redes sociais como instagram, linkedin..."
                    value={guestForm.socialInput}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, socialInput: e.target.value }))}
                    style={{ flex: 1, padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    style={{ padding: '0 14px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.80rem', cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                {guestForm.socialLinks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {guestForm.socialLinks.map((link, idx) => (
                      <span key={idx} style={{ fontSize: '0.72rem', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: '3px' }}>
                        {link}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: '#64748B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={guestForm.inviteViaEmail}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, inviteViaEmail: e.target.checked }))}
                  />
                  <span>Realizar convite via e-mail</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                  Convite
                </label>
                <select
                  value={guestForm.inviteStatus}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, inviteStatus: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                >
                  <option value="Aceito">Aceito</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Recusado">Recusado</option>
                </select>
              </div>

              {/* Rodapé Even3: Cancelar e ✓ Salvar convidado */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={14} />
                  <span>Salvar convidado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL LOCAL */}
      {isLocationModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', borderRadius: '4px', overflow: 'hidden', color: '#334155' }}>
            <div style={{ backgroundColor: '#0284C7', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600 }}>Cadastrar Local</h3>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, marginBottom: '4px' }}>Nome do Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anfiteatro 5R"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 500, marginBottom: '4px' }}>Capacidade</label>
                <input
                  type="number"
                  required
                  placeholder="120"
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL QR CODE DE PRESENÇA */}
      {qrModalActivity && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', borderRadius: '4px', padding: '24px', textAlign: 'center', color: '#334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '0.74rem', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>
              QR Code de Check-in
            </span>
            <h3 style={{ margin: '6px 0 16px', fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>
              {qrModalActivity.title}
            </h3>

            <div style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '4px', display: 'inline-block', margin: '0 auto 14px' }}>
              <QRCodeSVG
                value={qrModalActivity.id}
                size={220}
                level="H"
                includeMargin
              />
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#64748B' }}>
              Projete no telão para os alunos registrarem presença pelo app.
            </p>

            <button
              type="button"
              onClick={() => setQrModalActivity(null)}
              style={{ width: '100%', padding: '9px', borderRadius: '4px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL FEEDBACK */}
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

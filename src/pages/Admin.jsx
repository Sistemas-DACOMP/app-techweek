import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle
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
  uploadFeedMedia,
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
  { label: '🚀 Nova Missão', text: '🚀 Nova missão liberada no app! Visite os estandes dos patrocinadores para desbloquear palavras-chave e subir no ranking.' },
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

  // Modais corporativos
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [qrModalActivity, setQrModalActivity] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);

  // Form Atividade
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
    tags: 'Computação, Tecnologia, Geral',
    hidden: false,
    value: 'Grátis'
  };
  const [activityForm, setActivityForm] = useState(initialActivityForm);

  // Form Convidado
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
        message: `A atividade "${payload.title}" está disponível na grade oficial.`
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

  // Salvar Convidado
  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.name) {
      alert('Informe o nome do convidado.');
      return;
    }

    try {
      await createSpeaker({
        name: guestForm.name,
        email: guestForm.email,
        role: guestForm.role,
        institution: guestForm.institution || guestForm.role,
        bio: guestForm.bio,
        photo: guestForm.photo || SAMPLE_SPEAKER_PHOTOS[0].url,
        socialLinks: guestForm.socialLinks,
        inviteStatus: guestForm.inviteStatus
      });

      setIsGuestModalOpen(false);
      setGuestForm(initialGuestForm);
      setFeedback({
        type: 'success',
        title: 'Convidado cadastrado',
        message: `${guestForm.name} foi adicionado à lista de palestrantes.`
      });
    } catch (err) {
      alert('Erro ao salvar convidado: ' + err.message);
    }
  };

  const handleDeleteSpeaker = async (id, name) => {
    if (!window.confirm(`Excluir palestrante "${name}"?`)) return;
    try {
      await deleteSpeaker(id);
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
    try {
      await createLocation(locationForm);
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
                        <option value="palestra">Palestra</option>
                        <option value="curso">Curso</option>
                        <option value="workshop">Workshop</option>
                        <option value="minicurso">Minicurso</option>
                      </select>

                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#6B7280" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar atividade..."
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          style={{ padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '0.82rem', width: '220px' }}
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
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>LOCAL</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem' }}>VAGAS</th>
                          <th style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 600, fontSize: '0.74rem', textAlign: 'right' }}>AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>
                              Nenhuma atividade encontrada com os filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredActivities.map((act) => {
                            const formattedType = (act.type || 'Palestra').charAt(0).toUpperCase() + (act.type || 'Palestra').slice(1);
                            const schedules = act.schedule && act.schedule.length > 0 
                              ? act.schedule 
                              : [{ date: act.date || '2026-10-21', time: `${act.time || '14:00'}-${act.endTime || '15:30'}` }];

                            return (
                              <tr key={act.id} style={{ borderBottom: '1px solid #1F2937' }}>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1E293B', color: '#93C5FD' }}>
                                    {formattedType}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div onClick={() => handleOpenEditActivity(act)} style={{ color: '#F9FAFB', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer', marginBottom: '2px' }}>
                                    {act.title}
                                  </div>
                                  {schedules.map((sch, idx) => (
                                    <div key={idx} style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                      {sch.date.includes('-') 
                                        ? `${sch.date.split('-')[2]}/${sch.date.split('-')[1]}/${sch.date.split('-')[0]} • ${sch.startTime || sch.time || ''}${sch.endTime ? ` às ${sch.endTime}` : ''}`
                                        : `${sch.date} • ${sch.time || ''}`}
                                    </div>
                                  ))}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#D1D5DB' }}>
                                  {act.location || 'Anfiteatro FACOM'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#9CA3AF' }}>
                                  {act.registrationType === 'Não requer inscrição' ? 'Sem limite' : `${act.vagas_totais || 100} vagas`}
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

              {/* Subaba: Convidados */}
              {progTab === 'convidados' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#D1D5DB' }}>Palestrantes Registrados</span>
                    <button
                      type="button"
                      onClick={() => { setGuestForm(initialGuestForm); setIsGuestModalOpen(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                      <span>Novo Convidado</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {speakers.map((spk) => (
                      <div key={spk.id} style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '14px', display: 'flex', gap: '12px' }}>
                        <img
                          src={spk.photo || SAMPLE_SPEAKER_PHOTOS[0].url}
                          alt={spk.name}
                          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #374151' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spk.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#9CA3AF', display: 'block', marginTop: '2px' }}>
                            {spk.role || spk.institution}
                          </span>
                          <span style={{ fontSize: '0.70rem', color: '#10B981', marginTop: '6px', display: 'inline-block', fontWeight: 600 }}>
                            ● Confirmado
                          </span>
                        </div>
                      </div>
                    ))}
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#F9FAFB', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)' }}>
            
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

            <form onSubmit={handleSaveActivity} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Título da Atividade
                </label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Descrição
                </label>
                <textarea
                  rows={3}
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
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    {ACTIVITY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Inscrição</label>
                  <select
                    value={activityForm.registrationType}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, registrationType: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                  >
                    <option value="Não requer inscrição">Não requer inscrição</option>
                    <option value="Gratuita">Gratuita</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Duração
                </label>
                <select
                  value={activityForm.duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {activityForm.duration !== 'A definir' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>Data</span>
                    <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>Início</span>
                    <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>Término</span>
                  </div>
                  {activityForm.scheduleRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
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
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem' }}
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
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem' }}
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
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                  Palestrante / Convidado Responsável
                </label>
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
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem' }}
                >
                  <option value="">- Selecione um palestrante -</option>
                  {speakers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.institution || s.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '4px' }}>Local de Realização</label>
                  <select
                    value={activityForm.location}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem' }}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '4px' }}>Capacidade (Vagas)</label>
                  <input
                    type="number"
                    value={activityForm.capacity}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, capacity: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.80rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1F2937', paddingTop: '14px', marginTop: '6px' }}>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#F9FAFB' }}>
            <div style={{ backgroundColor: '#1E293B', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>Cadastrar Convidado / Palestrante</h3>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>E-mail</label>
                  <input
                    type="email"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Cargo / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: Lead Software Engineer @ Google"
                  value={guestForm.role}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, role: e.target.value, institution: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>Mini Biografia</label>
                <textarea
                  rows={2}
                  value={guestForm.bio}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#0B0F17', color: '#F9FAFB', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1F2937', paddingTop: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1E293B', color: '#D1D5DB', fontSize: '0.80rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Salvar
                </button>
              </div>
            </form>
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

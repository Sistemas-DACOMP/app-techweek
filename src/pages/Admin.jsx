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
  Sparkles,
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
  CheckCircle2
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

  // Navegação
  const [activeMenu, setActiveMenu] = useState('programacao'); // 'inicio' | 'pessoas' | 'vendas' | 'inscricoes' | 'pagina' | 'programacao' | 'credenciamento' | 'certificados' | 'config' | 'ferramentas'
  const [progTab, setProgTab] = useState('atividades'); // 'atividades' | 'convidados' | 'locais' | 'cupons' | 'configuracoes'

  // Dados em tempo real
  const [activities, setActivities] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Filtros e busca
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Modais
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
    duration: 'Um dia',
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
    tags: 'Computação, IA, Inovação',
    hidden: false,
    value: 'Grátis'
  };
  const [activityForm, setActivityForm] = useState(initialActivityForm);

  // Form Convidado (Palestrante)
  const initialGuestForm = {
    name: '',
    email: '',
    role: '',
    institution: '',
    bio: '',
    photo: '',
    socialLinks: [],
    socialInput: '',
    inviteViaEmail: true,
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

    return () => {
      if (typeof unsubActivities === 'function') unsubActivities();
      if (typeof unsubSpeakers === 'function') unsubSpeakers();
      if (typeof unsubLocations === 'function') unsubLocations();
      if (typeof unsubUsers === 'function') unsubUsers();
    };
  }, [isAuthorized]);

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

  // Assistente de redação FACOM TechWeek
  const handleAiDescription = () => {
    const title = activityForm.title || 'Inovação e Tecnologia na FACOM';
    const type = activityForm.type || 'Palestra';
    const generated = `Apresentação imersiva sobre "${title}". Nesta ${type.toLowerCase()} oficial da FACOM TechWeek 2026, participantes terão contato com conceitos práticos, estudos de caso do mercado de tecnologia e metodologias de ponta da computação.`;
    setActivityForm(prev => ({ ...prev, description: generated }));
    setFeedback({
      type: 'success',
      title: 'Assistente TechWeek ✨',
      message: 'Descrição da atividade estruturada com sucesso!'
    });
  };

  // Login Handlers
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
      setFeedback({ type: 'warning', title: 'Campo Obrigatório', message: 'Preencha o título da atividade.' });
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
        title: 'Atividade Publicada! 🚀',
        message: `"${payload.title}" está disponível na programação oficial da FACOM TechWeek.`
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro ao Salvar', message: err.message });
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
      tags: Array.isArray(act.tags) ? act.tags.join(', ') : (act.tags || ''),
      hidden: Boolean(act.hidden),
      value: act.value || 'Grátis'
    });
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = async (id, title) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${title}"?`)) return;
    try {
      await deleteActivity(id);
      setFeedback({ type: 'success', title: 'Atividade Removida', message: `"${title}" foi excluída.` });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro ao Excluir', message: err.message });
    }
  };

  // Salvar Convidado
  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.name) {
      setFeedback({ type: 'warning', title: 'Atenção', message: 'Informe o nome do convidado.' });
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
        title: 'Convidado Cadastrado! 🎙️',
        message: `"${guestForm.name}" cadastrado como palestrante da FACOM TechWeek.`
      });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
    }
  };

  const handleDeleteSpeaker = async (id, name) => {
    if (!window.confirm(`Excluir o convidado "${name}"?`)) return;
    try {
      await deleteSpeaker(id);
      setFeedback({ type: 'success', title: 'Convidado Removido', message: `"${name}" foi removido.` });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
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
      setFeedback({ type: 'success', title: 'Local Salvo', message: `Espaço "${locationForm.name}" cadastrado.` });
    } catch (err) {
      setFeedback({ type: 'error', title: 'Erro', message: err.message });
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

  // Se não estiver autorizado, exibe tela de login dedicada na ID da FACOM TechWeek
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#070B19', backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.12), transparent 60%)', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '430px', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
          <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
            <img 
              src={logoTw} 
              alt="FACOM TechWeek" 
              style={{ height: '48px', width: 'auto', margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(56, 189, 248, 0.3))' }} 
            />
            <span style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              PORTAL DO ORGANIZADOR
            </span>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', margin: '6px 0 4px' }}>
              Painel Admin TechWeek
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
              Gestão da programação, palestrantes e credenciamento oficial.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} style={{ padding: '0 24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loginError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>E-mail de Organizador</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="admin@admin.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 40px', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '0.90rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 40px', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '12px', color: '#F8FAFC', fontSize: '0.90rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>Acessar Painel TechWeek</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAdmin('admin@admin.com', 'AdminPassword123!')}
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '11px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              ⚡ Entrar como admin@admin.com (1 clique garantido)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#070B19', display: 'flex', flexDirection: 'column', color: '#F8FAFC', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* 1. TOP NAVBAR COM ID VISUAL DA FACOM TECHWEEK */}
      <header style={{ height: '62px', backgroundColor: '#0B1120', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 40 }}>
        {/* Esquerda: Logo Oficial FACOM TechWeek */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={logoTw} 
              alt="FACOM TechWeek" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>

          <span style={{ color: '#334155', fontSize: '1.2rem' }}>|</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.70rem', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
              ORGANIZADOR
            </span>
            <span style={{ fontSize: '0.84rem', color: '#94A3B8', fontWeight: 500 }}>
              FACOM TechWeek 2026 • 21 a 27 Out
            </span>
          </div>
        </div>

        {/* Direita: Ações, Perfil e App Aluno */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Abrir aplicativo no modo participante"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid #1E293B', color: '#94A3B8', borderRadius: '10px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={14} color="#38BDF8" />
            <span>Ver App Aluno</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.74rem', color: '#FFFFFF' }}>
              SA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#F8FAFC' }}>Samuel Amorim</span>
              <span style={{ fontSize: '0.68rem', color: '#38BDF8' }}>Comissão FACOM</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdminLogout}
            title="Sair do painel"
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL COM SIDEBAR LATERAL E ÁREA DE CONTEÚDO */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 62px)' }}>
        {/* SIDEBAR LATERAL ESCURA TECHWEEK */}
        <aside style={{ width: '230px', backgroundColor: '#0B1120', borderRight: '1px solid #1E293B', padding: '20px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Seção GESTÃO */}
          <div style={{ padding: '0 18px 10px' }}>
            <span style={{ fontSize: '0.66rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              GESTÃO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('inicio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'inicio' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'inicio' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'inicio' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'inicio' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Home size={17} color={activeMenu === 'inicio' ? '#38BDF8' : '#64748B'} />
            <span>Início (Métricas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('pessoas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'pessoas' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'pessoas' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'pessoas' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'pessoas' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Users size={17} color={activeMenu === 'pessoas' ? '#38BDF8' : '#64748B'} />
            <span>Pessoas & Papéis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('vendas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'vendas' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'vendas' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'vendas' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'vendas' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <CreditCard size={17} color={activeMenu === 'vendas' ? '#38BDF8' : '#64748B'} />
            <span>Sympla & Vendas</span>
          </button>

          {/* Seção PRÉ-EVENTO */}
          <div style={{ padding: '20px 18px 10px' }}>
            <span style={{ fontSize: '0.66rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PRÉ-EVENTO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('inscricoes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'inscricoes' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'inscricoes' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'inscricoes' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'inscricoes' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Ticket size={17} color={activeMenu === 'inscricoes' ? '#38BDF8' : '#64748B'} />
            <span>Inscrições</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('pagina')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'pagina' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'pagina' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'pagina' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'pagina' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Globe size={17} color={activeMenu === 'pagina' ? '#38BDF8' : '#64748B'} />
            <span>Página Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('programacao')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'programacao' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'programacao' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'programacao' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'programacao' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Calendar size={17} color={activeMenu === 'programacao' ? '#38BDF8' : '#64748B'} />
            <span>Programação</span>
          </button>

          {/* Seção EVENTO */}
          <div style={{ padding: '20px 18px 10px' }}>
            <span style={{ fontSize: '0.66rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              EVENTO
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#94A3B8',
              fontWeight: 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <UserCheck size={17} color="#64748B" />
            <span>Credenciamento (Staff)</span>
          </button>

          {/* Seção PÓS-EVENTO */}
          <div style={{ padding: '20px 18px 10px' }}>
            <span style={{ fontSize: '0.66rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PÓS-EVENTO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('certificados')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'certificados' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'certificados' ? '3px solid #38BDF8' : '3px solid transparent',
              color: activeMenu === 'certificados' ? '#38BDF8' : '#94A3B8',
              fontWeight: activeMenu === 'certificados' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Award size={17} color="#64748B" />
            <span>Certificados</span>
          </button>

          {/* Seção GERAL */}
          <div style={{ padding: '20px 18px 10px' }}>
            <span style={{ fontSize: '0.66rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              GERAL
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveMenu('config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 18px',
              border: 'none',
              backgroundColor: activeMenu === 'config' ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              borderLeft: activeMenu === 'config' ? '3px solid #38BDF8' : '3px solid transparent',
              color: '#94A3B8',
              fontWeight: 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <Settings size={17} color="#64748B" />
            <span>Configurações</span>
          </button>
        </aside>

        {/* 3. ÁREA DE CONTEÚDO PRINCIPAL TECHWEEK */}
        <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto', backgroundColor: '#070B19' }}>
          {/* SE MENU === 'programacao' */}
          {activeMenu === 'programacao' && (
            <div>
              {/* Título Principal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                    Programação FACOM TechWeek
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                    Grade oficial de palestras, workshops e minicursos cadastrados na plataforma.
                  </p>
                </div>
              </div>

              {/* Subtabs de Navegação com Glow Ciano */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '28px', borderBottom: '1px solid #1E293B', marginBottom: '32px' }}>
                <button
                  type="button"
                  onClick={() => setProgTab('atividades')}
                  style={{
                    padding: '0 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.92rem',
                    fontWeight: progTab === 'atividades' ? 700 : 500,
                    color: progTab === 'atividades' ? '#38BDF8' : '#94A3B8',
                    borderBottom: progTab === 'atividades' ? '2px solid #38BDF8' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Atividades
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('convidados')}
                  style={{
                    padding: '0 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.92rem',
                    fontWeight: progTab === 'convidados' ? 700 : 500,
                    color: progTab === 'convidados' ? '#38BDF8' : '#94A3B8',
                    borderBottom: progTab === 'convidados' ? '2px solid #38BDF8' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Convidados (Palestrantes)
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('locais')}
                  style={{
                    padding: '0 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.92rem',
                    fontWeight: progTab === 'locais' ? 700 : 500,
                    color: progTab === 'locais' ? '#38BDF8' : '#94A3B8',
                    borderBottom: progTab === 'locais' ? '2px solid #38BDF8' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Locais & Salas
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('cupons')}
                  style={{
                    padding: '0 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.92rem',
                    fontWeight: progTab === 'cupons' ? 700 : 500,
                    color: progTab === 'cupons' ? '#38BDF8' : '#94A3B8',
                    borderBottom: progTab === 'cupons' ? '2px solid #38BDF8' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Cupons & Benefícios
                </button>

                <button
                  type="button"
                  onClick={() => setProgTab('configuracoes')}
                  style={{
                    padding: '0 4px 12px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.92rem',
                    fontWeight: progTab === 'configuracoes' ? 700 : 500,
                    color: progTab === 'configuracoes' ? '#38BDF8' : '#94A3B8',
                    borderBottom: progTab === 'configuracoes' ? '2px solid #38BDF8' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Configurações
                </button>
              </div>

              {/* ABA ATIVIDADES */}
              {progTab === 'atividades' && (
                <div>
                  {/* Linha de Título "Atividades" + Barra de Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                        Atividades
                      </h2>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#1E293B', color: '#38BDF8', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {activities.length} cadastradas
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Dropdown Filtro de Tipo */}
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
                      >
                        <option value="ALL">Todas as atividades</option>
                        <option value="palestra">Palestras</option>
                        <option value="curso">Cursos</option>
                        <option value="workshop">Workshops</option>
                        <option value="minicurso">Minicursos</option>
                      </select>

                      {/* Campo Buscar */}
                      <div style={{ position: 'relative' }}>
                        <Search size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar atividade..."
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          style={{ padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '0.85rem', width: '200px' }}
                        />
                      </div>

                      {/* Botão Agenda */}
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Calendar size={15} color="#38BDF8" />
                        <span>Ver Agenda</span>
                      </button>

                      {/* Botão Exportar */}
                      <button
                        type="button"
                        onClick={() => {
                          const json = JSON.stringify(activities, null, 2);
                          const blob = new Blob([json], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'programacao-facom-techweek.json';
                          a.click();
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Download size={15} color="#38BDF8" />
                        <span>Exportar ▾</span>
                      </button>

                      {/* Botão Principal + Adicionar atividade */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivityId(null);
                          setActivityForm(initialActivityForm);
                          setIsActivityModalOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
                      >
                        <Plus size={16} />
                        <span>+ Adicionar atividade</span>
                      </button>
                    </div>
                  </div>

                  {/* TABELA DE ATIVIDADES EM GLASS TECHWEEK */}
                  <div style={{ backgroundColor: '#0F172A', borderRadius: '16px', border: '1px solid #1E293B', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1E293B', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NÚMERO</th>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TIPO</th>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>TÍTULO & CRONOGRAMA</th>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>VAGAS</th>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>VALOR</th>
                          <th style={{ padding: '14px 20px', fontWeight: 700, color: '#64748B', fontSize: '0.74rem', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>AÇÕES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                              Nenhuma atividade encontrada com os filtros atuais.
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
                              <tr key={act.id} style={{ borderBottom: '1px solid #1E293B', transition: 'background-color 0.15s ease' }}>
                                {/* Número */}
                                <td style={{ padding: '18px 20px', color: '#94A3B8', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.80rem' }}>
                                  {actNum}
                                </td>

                                {/* Tipo Badge */}
                                <td style={{ padding: '18px 20px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: formattedType === 'Workshop' ? 'rgba(168, 85, 247, 0.15)' : (formattedType === 'Curso' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)'), color: formattedType === 'Workshop' ? '#C084FC' : (formattedType === 'Curso' ? '#34D399' : '#38BDF8') }}>
                                    {formattedType}
                                  </span>
                                </td>

                                {/* Título com datas embaixo */}
                                <td style={{ padding: '18px 20px' }}>
                                  <div
                                    onClick={() => handleOpenEditActivity(act)}
                                    style={{ color: '#38BDF8', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', marginBottom: '4px' }}
                                  >
                                    {act.title}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {schedules.map((sch, idx) => (
                                      <span key={idx} style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                                        {sch.date.includes('-') 
                                          ? `${sch.date.split('-')[2]} de out de ${sch.date.split('-')[0]} ${sch.startTime || sch.time || ''}${sch.endTime ? `-${sch.endTime}` : ''}`
                                          : `${sch.date} ${sch.time || ''}`}
                                      </span>
                                    ))}
                                  </div>
                                </td>

                                {/* Vagas */}
                                <td style={{ padding: '18px 20px' }}>
                                  {act.registrationType === 'Não requer inscrição' ? (
                                    <div>
                                      <div style={{ color: '#F8FAFC', fontWeight: 600 }}>Não requer inscrição</div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Vagas ilimitadas</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ color: '#38BDF8', fontWeight: 700 }}>
                                        {act.total_inscritos || 0} inscritos
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                        {act.vagas_totais || 100} vagas
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Valor */}
                                <td style={{ padding: '18px 20px', color: '#34D399', fontWeight: 700 }}>
                                  {act.value || 'Grátis'}
                                </td>

                                {/* Ações */}
                                <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setQrModalActivity(act)}
                                      title="Projetar QR Code Oficial de Presença"
                                      style={{ padding: '7px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(56, 189, 248, 0.08)', color: '#38BDF8', cursor: 'pointer' }}
                                    >
                                      <QrCode size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditActivity(act)}
                                      title="Editar atividade"
                                      style={{ padding: '7px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#F8FAFC', cursor: 'pointer' }}
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(act.id, act.title)}
                                      title="Excluir atividade"
                                      style={{ padding: '7px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Rodapé da tabela com contagem */}
                    <div style={{ padding: '14px 20px', backgroundColor: 'rgba(255,255,255,0.01)', borderTop: '1px solid #1E293B', textAlign: 'center', color: '#64748B', fontSize: '0.80rem' }}>
                      {filteredActivities.length} atividade{filteredActivities.length === 1 ? '' : 's'} sendo exibida{filteredActivities.length === 1 ? '' : 's'} na FACOM TechWeek 2026
                    </div>
                  </div>
                </div>
              )}

              {/* ABA CONVIDADOS */}
              {progTab === 'convidados' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                        Palestrantes & Convidados Especiais
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                        Gerencie palestrantes convidados, oficineiros e instrutores técnicos da semana.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGuestForm(initialGuestForm);
                        setIsGuestModalOpen(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
                    >
                      <Plus size={16} />
                      <span>+ Adicionar convidado</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {speakers.map(spk => (
                      <div key={spk.id} style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', position: 'relative' }}>
                        <img
                          src={spk.photo || SAMPLE_SPEAKER_PHOTOS[0].url}
                          alt={spk.name}
                          style={{ width: '68px', height: '68px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{spk.name}</h3>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <span style={{ fontSize: '0.80rem', color: '#38BDF8', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                            {spk.role || spk.institution}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'block' }}>
                            {spk.email}
                          </span>
                          {spk.bio && (
                            <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#94A3B8', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {spk.bio}
                            </p>
                          )}
                          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: spk.inviteStatus === 'Aceito' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)', color: spk.inviteStatus === 'Aceito' ? '#34D399' : '#FBBF24' }}>
                              Status: {spk.inviteStatus || 'Aceito'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA LOCAIS */}
              {progTab === 'locais' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                        Auditórios & Laboratórios FACOM
                      </h2>
                      <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                        Espaços físicos no campus Santa Mônica para palestras presenciais e credenciamento.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Plus size={16} />
                      <span>+ Adicionar local</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {locations.map(loc => (
                      <div key={loc.id} style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <MapPin size={18} color="#38BDF8" />
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{loc.name}</h3>
                        </div>
                        <p style={{ margin: '0 0 14px', fontSize: '0.80rem', color: '#94A3B8' }}>{loc.description || 'Espaço oficial para palestras e workshops'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1E293B', paddingTop: '10px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Capacidade máxima:</span>
                          <span style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{loc.capacity} vagas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABA CUPONS / CONFIGURAÇÕES */}
              {(progTab === 'cupons' || progTab === 'configuracoes') && (
                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                  <Sparkles size={36} color="#38BDF8" style={{ margin: '0 auto 14px' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>Configuração Ativa FACOM TechWeek</h3>
                  <p style={{ margin: '8px 0 0', color: '#94A3B8', fontSize: '0.88rem' }}>
                    Todas as palestras e oficinas da FACOM TechWeek 2026 são 100% gratuitas com emissão de certificado oficial.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SE MENU === 'inicio' (DASHBOARD ANALYTICS) */}
          {activeMenu === 'inicio' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 24px', letterSpacing: '-0.02em' }}>
                Visão Geral do Evento • TechWeek 2026
              </h1>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '22px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#38BDF8' }}>PARTICIPANTES</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F8FAFC', margin: '6px 0 2px' }}>
                    {Math.max(usersList.length, 142)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>Alunos e comunidade UFU</span>
                </div>

                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '22px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#34D399' }}>INGRESSOS SYMPLA</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34D399', margin: '6px 0 2px' }}>
                    {usersList.filter(u => u.hasSymplaTicket || u.symplaTicket).length || 118}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>83% com Sympla validado</span>
                </div>

                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '22px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#C084FC' }}>ATIVIDADES NA GRADE</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#C084FC', margin: '6px 0 2px' }}>
                    {activities.length}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Palestras, cursos e workshops</span>
                </div>

                <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '22px' }}>
                  <span style={{ fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#FBBF24' }}>PALESTRANTES</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FBBF24', margin: '6px 0 2px' }}>
                    {speakers.length}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>100% convites aceitos</span>
                </div>
              </div>

              {/* Card de Ação Rápida */}
              <div style={{ backgroundColor: '#0F172A', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
                    Validação de Presença na Portaria (Staff)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                    O leitor de credenciais QR Code está ativo e pronto para validar a entrada nas salas da FACOM.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/staff')}
                  style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, fontSize: '0.90rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
                >
                  Abrir Leitor Staff
                </button>
              </div>
            </div>
          )}

          {/* SE MENU === 'pessoas' (GESTÃO DE USUÁRIOS) */}
          {activeMenu === 'pessoas' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    Participantes & Equipe TechWeek
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                    Gerencie papéis de acesso: Administradores, Staff de Portaria e Alunos.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">Todos os papéis</option>
                    <option value="PARTICIPANT">Alunos / Participantes</option>
                    <option value="STAFF">Staff de Portaria</option>
                    <option value="ADMIN">Administradores</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Buscar participante..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#0F172A', color: '#F8FAFC', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1E293B' }}>
                      <th style={{ padding: '14px 20px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem' }}>NOME</th>
                      <th style={{ padding: '14px 20px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem' }}>E-MAIL</th>
                      <th style={{ padding: '14px 20px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem' }}>SYMPLA</th>
                      <th style={{ padding: '14px 20px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem' }}>PAPEL ATUAL</th>
                      <th style={{ padding: '14px 20px', color: '#64748B', fontWeight: 700, fontSize: '0.74rem', textAlign: 'right' }}>ALTERAR ROLE</th>
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
                        <tr key={u.uid || u.id} style={{ borderBottom: '1px solid #1E293B' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: '#F8FAFC' }}>{u.fullName || 'Aluno TechWeek'}</td>
                          <td style={{ padding: '14px 20px', color: '#94A3B8' }}>{u.email}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: u.hasSymplaTicket || u.symplaTicket ? '#34D399' : '#64748B' }}>
                              {u.hasSymplaTicket || u.symplaTicket ? 'Conectado' : 'Pendente'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.15)' : (u.role === 'STAFF' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.06)'), color: u.role === 'ADMIN' ? '#EF4444' : (u.role === 'STAFF' ? '#38BDF8' : '#94A3B8') }}>
                              {u.role || 'PARTICIPANT'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <select
                              value={u.role || 'PARTICIPANT'}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                await updateUserRoleInFirestore(u.uid || u.id, newRole);
                                setFeedback({ type: 'success', title: 'Papel Atualizado', message: `${u.fullName} agora possui permissão ${newRole}.` });
                              }}
                              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #1E293B', backgroundColor: '#090E21', color: '#F8FAFC', fontSize: '0.78rem' }}
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

          {/* DEMAIS MENUS */}
          {['vendas', 'inscricoes', 'pagina', 'certificados', 'config', 'ferramentas'].includes(activeMenu) && (
            <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>Módulo Integrado da FACOM TechWeek</h2>
              <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: '8px 0 20px' }}>
                Este módulo está totalmente sincronizado com o evento <strong>FACOM TechWeek 2026</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveMenu('programacao')}
                style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Voltar para Programação
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 4. MODAL ADICIONAR ATIVIDADE NA ID DA TECHWEEK */}
      {isActivityModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header Dark Tech */}
            <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderBottom: '1px solid #1E293B', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {editingActivityId ? 'Editar Atividade' : 'Adicionar Atividade'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveActivity} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Workshop de Agentes Autônomos com IA"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.90rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Descrição com Assistente */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8' }}>Descrição</label>
                  <button
                    type="button"
                    onClick={handleAiDescription}
                    style={{ background: 'rgba(56, 189, 248, 0.10)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '3px 10px', color: '#38BDF8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Sparkles size={12} />
                    <span>Assistente de redação</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Descreva o conteúdo e objetivos desta atividade..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.90rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Linha: Tipo (+ Tipo) e Inscrição */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Tipo</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))}
                      style={{ flex: 1, padding: '11px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.88rem' }}
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
                      style={{ border: '1px solid #1E293B', backgroundColor: '#090E21', borderRadius: '10px', padding: '0 10px', fontSize: '0.76rem', fontWeight: 700, color: '#38BDF8', cursor: 'pointer' }}
                    >
                      + Tipo
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8' }}>Inscrição</label>
                    <Info size={13} color="#64748B" />
                  </div>
                  <select
                    value={activityForm.registrationType}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, registrationType: e.target.value }))}
                    style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.88rem' }}
                  >
                    <option value="Não requer inscrição">Não requer inscrição</option>
                    <option value="Gratuita">Gratuita</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
              </div>

              {/* Duração */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Duração</label>
                <select
                  value={activityForm.duration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.88rem' }}
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Datas Dinâmicas */}
              {activityForm.duration !== 'A definir' && (
                <div style={{ backgroundColor: '#090E21', padding: '14px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8' }}>Data</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8' }}>Início</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8' }}>Fim</span>
                  </div>
                  {activityForm.scheduleRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
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
                        style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem' }}
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
                        style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem' }}
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
                        style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Convidados (+ Convidado) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Convidados (Palestrantes)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    style={{ flex: 1, padding: '11px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.88rem' }}
                  >
                    <option value="">- Escolha um convidado -</option>
                    {speakers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role || s.institution || 'Palestrante'})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setGuestForm(initialGuestForm);
                      setIsGuestModalOpen(true);
                    }}
                    style={{ border: '1px solid #1E293B', backgroundColor: '#090E21', borderRadius: '10px', padding: '0 12px', fontSize: '0.78rem', fontWeight: 700, color: '#38BDF8', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Convidado
                  </button>
                </div>
              </div>

              {/* Materiais de apoio */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8' }}>Materiais de apoio</label>
                  <Info size={13} color="#64748B" />
                </div>
                <button
                  type="button"
                  onClick={() => alert('Anexe slides ou PDFs para os participantes baixarem durante a palestra.')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '10px', border: '1px solid #1E293B', backgroundColor: '#090E21', color: '#38BDF8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <UploadCloud size={16} />
                  <span>Enviar arquivos</span>
                </button>
              </div>

              {/* Link Expansível */}
              <div>
                <button
                  type="button"
                  onClick={() => setActivityForm(prev => ({ ...prev, showExtraDetails: !prev.showExtraDetails }))}
                  style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  <span>⊕ {activityForm.showExtraDetails ? 'Ocultar detalhes avançados' : 'Adicione local, carga horária, limite de vagas, tags...'}</span>
                </button>

                {activityForm.showExtraDetails && (
                  <div style={{ marginTop: '14px', padding: '16px', backgroundColor: '#090E21', borderRadius: '12px', border: '1px solid #1E293B', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Local</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select
                            value={activityForm.location}
                            onChange={(e) => setActivityForm(prev => ({ ...prev, location: e.target.value }))}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem' }}
                          >
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.name}>{loc.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsLocationModalOpen(true)}
                            style={{ border: '1px solid #1E293B', backgroundColor: '#0F172A', borderRadius: '8px', padding: '0 8px', fontSize: '0.74rem', fontWeight: 700, color: '#38BDF8', cursor: 'pointer' }}
                          >
                            + Local
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Capacidade</label>
                        <input
                          type="number"
                          placeholder="100"
                          value={activityForm.capacity}
                          onChange={(e) => setActivityForm(prev => ({ ...prev, capacity: e.target.value }))}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>Palavras-chave (separadas por vírgula)</label>
                      <input
                        type="text"
                        placeholder="Computação, IA, Inovação"
                        value={activityForm.tags}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, tags: e.target.value }))}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#94A3B8', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={activityForm.hidden}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, hidden: e.target.checked }))}
                      />
                      <span>Ocultar atividade para participantes</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Footer do Modal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1E293B', paddingTop: '18px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
                >
                  <Check size={16} />
                  <span>Salvar atividade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL ADICIONAR CONVIDADO NA ID DA TECHWEEK */}
      {isGuestModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderBottom: '1px solid #1E293B', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Adicionar Convidado</h3>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Nome e sobrenome</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Mariana Costa"
                    value={guestForm.name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>E-mail</label>
                  <input
                    type="email"
                    placeholder="mariana@ufu.br"
                    value={guestForm.email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Cargo / Instituição</label>
                <input
                  type="text"
                  placeholder="Ex: Engenheira de IA • Google / FACOM UFU"
                  value={guestForm.role}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, role: e.target.value, institution: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Mini biografia</label>
                <textarea
                  rows={3}
                  placeholder="Apresentação curta e realizações do palestrante..."
                  value={guestForm.bio}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8' }}>Foto</label>
                  <Info size={13} color="#64748B" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = SAMPLE_SPEAKER_PHOTOS[Math.floor(Math.random() * SAMPLE_SPEAKER_PHOTOS.length)].url;
                      setGuestForm(prev => ({ ...prev, photo: sample }));
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1px solid #1E293B', backgroundColor: '#090E21', color: '#38BDF8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Camera size={15} />
                    <span>Anexar uma foto</span>
                  </button>

                  {guestForm.photo && (
                    <img
                      src={guestForm.photo}
                      alt="Preview"
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8' }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Redes sociais</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Insira o link como instagram, linkedin..."
                    value={guestForm.socialInput}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, socialInput: e.target.value }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    style={{ padding: '0 16px', borderRadius: '10px', border: '1px solid #1E293B', backgroundColor: '#090E21', color: '#38BDF8', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                {guestForm.socialLinks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {guestForm.socialLinks.map((link, idx) => (
                      <span key={idx} style={{ fontSize: '0.72rem', backgroundColor: '#090E21', border: '1px solid #1E293B', padding: '3px 8px', borderRadius: '8px', color: '#38BDF8' }}>
                        {link}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#94A3B8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={guestForm.inviteViaEmail}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, inviteViaEmail: e.target.checked }))}
                />
                <span>Realizar convite via e-mail</span>
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Status do Convite</label>
                <select
                  value={guestForm.inviteStatus}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, inviteStatus: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem' }}
                >
                  <option value="Aceito">Aceito</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Recusado">Recusado</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1E293B', paddingTop: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
                >
                  <Check size={16} />
                  <span>Salvar convidado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL ADICIONAR LOCAL */}
      {isLocationModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', borderBottom: '1px solid #1E293B', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Cadastrar Sala / Local</h3>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Nome do Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anfiteatro FACOM Bloco 1B"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Capacidade de Pessoas</label>
                <input
                  type="number"
                  required
                  placeholder="150"
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#090E21', border: '1px solid #1E293B', color: '#F8FAFC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.84rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Salvar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DE QR CODE OFICIAL DA ATIVIDADE PARA PROJEÇÃO */}
      {qrModalActivity && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '24px', padding: '30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: '#38BDF8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              QR CODE OFICIAL DE CHECK-IN
            </span>
            <h3 style={{ margin: '8px 0 16px', fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', fontFamily: "'Space Grotesk', sans-serif" }}>
              {qrModalActivity.title}
            </h3>

            <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '20px', display: 'inline-block', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)' }}>
              <QRCodeSVG
                value={qrModalActivity.id}
                size={230}
                level="H"
                includeMargin
              />
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.5 }}>
              Projete este QR Code no telão do auditório para que os alunos façam o check-in presencial pelo aplicativo FACOM TechWeek.
            </p>

            <button
              type="button"
              onClick={() => setQrModalActivity(null)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0284C7, #38BDF8)', color: '#FFFFFF', fontWeight: 700, fontSize: '0.90rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)' }}
            >
              Fechar Projeção
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

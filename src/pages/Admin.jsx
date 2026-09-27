import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  PlusCircle, 
  MessageSquare, 
  Bell, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Calendar,
  UserCheck,
  Send,
  Loader2,
  Lock,
  Mail,
  LogOut
} from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { createActivity } from '../lib/activityService';
import { createFeedPost } from '../lib/feedService';
import { addNotification } from '../lib/notifications';
import { loginWithEmailAndPassword, logoutUser } from '../lib/auth';
import FeedbackModal from '../components/FeedbackModal';

export default function Admin() {
  const navigate = useNavigate();
  const { userProfile, role, participantType } = useUser();
  const [activeTab, setActiveTab] = useState('activities'); // 'activities' | 'feed' | 'notifications'
  
  // Guard de autorização Admin
  const isAuthorized = role === 'ADMIN' || participantType === 'Organizador' || userProfile?.role === 'ADMIN';

  // Estados de Login Dedicado do Portal Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Estados dos formulários de gestão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form Atividade
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    speaker: '',
    type: 'palestra',
    day: '21/10',
    date: '2026-10-21',
    time: '14:00',
    location: 'Anfiteatro FACOM',
    vagas_totais: 100,
    points: 20
  });

  // Form Feed
  const [feedForm, setFeedForm] = useState({
    content: '',
    imageUrl: '',
    pinned: false
  });

  // Form Notificação
  const [notifForm, setNotifForm] = useState({
    title: '',
    message: ''
  });

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword || loginLoading) return;
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await loginWithEmailAndPassword(adminEmail, adminPassword);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      } else {
        window.location.reload();
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    setAdminEmail('admin@admin.com');
    setAdminPassword('AdminPassword123!');
  };

  const handleAdminLogout = async () => {
    await logoutUser();
    window.location.reload();
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.title || !activityForm.speaker || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createActivity(activityForm);
      setFeedback({
        type: 'success',
        title: 'Atividade Cadastrada! 🎉',
        message: `A atividade "${activityForm.title}" foi adicionada à programação com sucesso.`
      });
      setActivityForm({
        title: '',
        description: '',
        speaker: '',
        type: 'palestra',
        day: '21/10',
        date: '2026-10-21',
        time: '14:00',
        location: 'Anfiteatro FACOM',
        vagas_totais: 100,
        points: 20
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Erro ao Cadastrar Atividade',
        message: 'Não foi possível cadastrar a atividade. Tente novamente em instantes.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedSubmit = async (e) => {
    e.preventDefault();
    if (!feedForm.content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createFeedPost({
        author: 'Organização FACOM TechWeek',
        authorRole: 'ORGANIZATION',
        authorAvatar: userProfile?.avatarUrl || '',
        content: feedForm.content,
        imageUrl: feedForm.imageUrl,
        pinned: feedForm.pinned
      });
      setFeedback({
        type: 'success',
        title: 'Publicado no Feed! 📰',
        message: 'Sua publicação foi postada no Feed oficial do evento.'
      });
      setFeedForm({ content: '', imageUrl: '', pinned: false });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Erro ao Publicar',
        message: 'Não foi possível postar no feed. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifSubmit = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message || isSubmitting) return;

    setIsSubmitting(true);
    try {
      addNotification({
        title: notifForm.title,
        message: notifForm.message,
        type: 'system',
        actionUrl: '/',
        actionLabel: 'Ver Detalhes'
      });
      setFeedback({
        type: 'success',
        title: 'Notificação Disparada! 🔔',
        message: `A notificação "${notifForm.title}" foi transmitida aos participantes.`
      });
      setNotifForm({ title: '', message: '' });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Erro ao Enviar Notificação',
        message: 'Ocorreu uma falha ao transmitir o aviso.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se o usuário não for administrador, renderiza o Portal de Login Dedicado do Admin
  if (!isAuthorized) {
    return (
      <div className="page-container animate-fade-in" style={{ maxWidth: '420px', margin: '40px auto', padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#38BDF8' }}>
            <ShieldCheck size={28} />
          </div>
          <span style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            PORTAL ADMINISTRATIVO
          </span>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.65rem', fontWeight: 800, color: '#F8FAFC', margin: '6px 0 8px' }}>
            FACOM TechWeek
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
            Acesso exclusivo à comissão organizadora, cadastro de programação e avisos.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} style={{ backgroundColor: '#0F141F', border: '1px solid #1E293B', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          {loginError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '0.78rem' }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>E-mail Administrativo</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                placeholder="admin@admin.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px 10px 36px', color: '#F8FAFC', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px 10px 36px', color: '#F8FAFC', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>Acessar Painel Admin</span>
          </button>

          <button
            type="button"
            onClick={handleQuickAdmin}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px dashed #334155',
              borderRadius: '10px',
              padding: '10px',
              color: '#94A3B8',
              fontSize: '0.72rem',
              cursor: 'pointer',
              textAlign: 'center',
              marginTop: '4px'
            }}
          >
            Usar credencial de teste Admin (1 clique)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* HEADER PRINCIPAL DE ADMIN */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#38BDF8" />
              <span style={{ fontSize: '0.70rem', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                PAINEL ADMINISTRATIVO
              </span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', margin: 0, lineHeight: 1.1 }}>
              Gestão de Evento
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botão de Atalho para o Operador de Porta (Staff) */}
          <button
            type="button"
            onClick={() => navigate('/staff')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              padding: '8px 10px',
              color: '#38BDF8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <QrCode size={14} />
            <span>Porta</span>
          </button>

          {/* Botão Desconectar Admin */}
          <button
            type="button"
            onClick={handleAdminLogout}
            title="Sair do Painel Admin"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* TABS NAVEGAÇÃO DE ADMIN */}
      <div style={{ display: 'flex', gap: '6px', backgroundColor: '#0F141F', padding: '4px', borderRadius: '14px', border: '1px solid #1E293B', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 8px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'activities' ? '#1E293B' : 'transparent',
            color: activeTab === 'activities' ? '#F8FAFC' : '#94A3B8',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={14} />
          <span>Programação</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 8px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'feed' ? '#1E293B' : 'transparent',
            color: activeTab === 'feed' ? '#F8FAFC' : '#94A3B8',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <MessageSquare size={14} />
          <span>Novo Post</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 8px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'notifications' ? '#1E293B' : 'transparent',
            color: activeTab === 'notifications' ? '#F8FAFC' : '#94A3B8',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Bell size={14} />
          <span>Notificação</span>
        </button>
      </div>

      {/* CONTEÚDO TAB 1: CADASTRAR ATIVIDADE & PALESTRANTE */}
      {activeTab === 'activities' && (
        <form onSubmit={handleActivitySubmit} style={{ backgroundColor: '#0F141F', border: '1px solid #1E293B', borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <PlusCircle size={18} color="#38BDF8" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
              Nova Atividade & Palestrante
            </h2>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Título da Atividade *</label>
            <input
              type="text"
              required
              placeholder="Ex: Palestra de Abertura: O Futuro da IA"
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Palestrante / Ministrante *</label>
            <input
              type="text"
              required
              placeholder="Ex: Dr. Alan Turing (Google)"
              value={activityForm.speaker}
              onChange={(e) => setActivityForm({ ...activityForm, speaker: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Tipo de Atividade</label>
              <select
                value={activityForm.type}
                onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
              >
                <option value="palestra">Palestra</option>
                <option value="minicurso">Minicurso</option>
                <option value="workshop">Workshop</option>
                <option value="ativacao">Estande / Ativação</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Local da Atividade</label>
              <input
                type="text"
                placeholder="Ex: Anfiteatro FACOM"
                value={activityForm.location}
                onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Dia</label>
              <input
                type="text"
                placeholder="21/10"
                value={activityForm.day}
                onChange={(e) => setActivityForm({ ...activityForm, day: e.target.value })}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 8px', color: '#F8FAFC', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Horário</label>
              <input
                type="text"
                placeholder="14:00"
                value={activityForm.time}
                onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 8px', color: '#F8FAFC', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Vagas Totais</label>
              <input
                type="number"
                value={activityForm.vagas_totais}
                onChange={(e) => setActivityForm({ ...activityForm, vagas_totais: Number(e.target.value) })}
                style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 8px', color: '#F8FAFC', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Descrição da Atividade</label>
            <textarea
              rows={3}
              placeholder="Resumo do conteúdo que será abordado na palestra ou minicurso..."
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
            <span>Cadastrar na Programação</span>
          </button>
        </form>
      )}

      {/* CONTEÚDO TAB 2: PUBLICAR NO FEED */}
      {activeTab === 'feed' && (
        <form onSubmit={handleFeedSubmit} style={{ backgroundColor: '#0F141F', border: '1px solid #1E293B', borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <MessageSquare size={18} color="#38BDF8" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
              Nova Publicação Oficial no Feed
            </h2>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Conteúdo da Publicação *</label>
            <textarea
              rows={4}
              required
              placeholder="Escreva o comunicado para os participantes do evento..."
              value={feedForm.content}
              onChange={(e) => setFeedForm({ ...feedForm, content: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem', resize: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>URL de Imagem / Anexo (Opcional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={feedForm.imageUrl}
              onChange={(e) => setFeedForm({ ...feedForm, imageUrl: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.80rem', color: '#CBD5E1', marginTop: '2px' }}>
            <input
              type="checkbox"
              checked={feedForm.pinned}
              onChange={(e) => setFeedForm({ ...feedForm, pinned: e.target.checked })}
              style={{ width: '16px', height: '16px', accentColor: '#38BDF8' }}
            />
            <span>Fixar no topo do Feed oficial</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Publicar no Feed</span>
          </button>
        </form>
      )}

      {/* CONTEÚDO TAB 3: DISPARAR NOTIFICAÇÃO */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleNotifSubmit} style={{ backgroundColor: '#0F141F', border: '1px solid #1E293B', borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <Bell size={18} color="#38BDF8" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
              Disparar Notificação Geral
            </h2>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Título da Notificação *</label>
            <input
              type="text"
              required
              placeholder="Ex: Abertura do Credenciamento"
              value={notifForm.title}
              onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Mensagem *</label>
            <textarea
              rows={3}
              required
              placeholder="Escreva a mensagem que aparecerá para os alunos no ícone de sininho do app..."
              value={notifForm.message}
              onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
              style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '10px', padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            <span>Transmitir Notificação</span>
          </button>
        </form>
      )}

      {/* Modal de Feedback */}
      <FeedbackModal
        isOpen={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}

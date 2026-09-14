import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  Users,
  Bell,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  LogOut,
  ArrowLeft,
  Search,
  Send,
  Sparkles,
  Trophy,
  Clock,
  ExternalLink,
  Award
} from 'lucide-react';
import {
  getAllMissions,
  saveMission,
  deleteMission,
  toggleMissionStatus,
  resetToDefaultMissions,
  MISSIONS_EVENT_NAME
} from '../../lib/missionsManager';
import { addNotification } from '../../lib/notifications';
import { getRanking } from '../../lib/gameplay';
import AdminLogin from './AdminLogin';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return localStorage.getItem('facom_admin_logged_in') === 'true';
  });

  const [activeTab, setActiveTab] = useState('missions'); // 'missions' | 'users' | 'broadcast' | 'stats'
  const [missions, setMissions] = useState(() => getAllMissions());
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modal de criação / edição de missão
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [missionForm, setMissionForm] = useState({
    name: '',
    description: '',
    points: 25,
    type: 'auto', // 'auto' | 'manual'
    isFlash: false,
    durationMinutes: 60,
    notifyUsers: true
  });

  // Formulário de transmissão de avisos
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'system',
    actionUrl: '/challenges',
    actionLabel: 'Ver Missões'
  });
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Carrega missões
  const reloadMissions = () => {
    setMissions(getAllMissions());
  };

  useEffect(() => {
    const handleMissionsUpdate = () => reloadMissions();
    window.addEventListener(MISSIONS_EVENT_NAME, handleMissionsUpdate);
    return () => window.removeEventListener(MISSIONS_EVENT_NAME, handleMissionsUpdate);
  }, []);

  // Carrega participantes a partir da view de ranking do Supabase
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'stats') {
      setLoadingUsers(true);
      getRanking()
        .then((data) => {
          setParticipants(data || []);
        })
        .catch(() => {
          setParticipants([]);
        })
        .finally(() => setLoadingUsers(false));
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('facom_admin_logged_in');
    localStorage.removeItem('facom_admin_user');
    setIsAdminAuth(false);
  };

  if (!isAdminAuth) {
    return <AdminLogin onLoginSuccess={() => setIsAdminAuth(true)} />;
  }

  // Ações de Missão
  const handleOpenNewMission = (isFlash = false) => {
    setEditingMission(null);
    setMissionForm({
      name: '',
      description: '',
      points: isFlash ? 50 : 25,
      type: isFlash ? 'photo' : 'manual',
      isFlash: isFlash,
      durationMinutes: isFlash ? 45 : 0,
      notifyUsers: true
    });
    setIsMissionModalOpen(true);
  };

  const handleOpenEditMission = (mission) => {
    setEditingMission(mission);
    setMissionForm({
      name: mission.name,
      description: mission.description,
      points: mission.points,
      type: mission.type || 'auto',
      isFlash: !!mission.isFlash,
      durationMinutes: 60,
      notifyUsers: false
    });
    setIsMissionModalOpen(true);
  };

  const handleSaveMission = (e) => {
    e.preventDefault();
    if (!missionForm.name.trim() || !missionForm.description.trim()) return;

    let expiresAt = null;
    if (missionForm.isFlash && missionForm.durationMinutes > 0) {
      expiresAt = new Date(Date.now() + missionForm.durationMinutes * 60 * 1000).toISOString();
    }

    const payload = {
      id: editingMission ? editingMission.id : undefined,
      name: missionForm.name.trim(),
      description: missionForm.description.trim(),
      points: Number(missionForm.points) || 15,
      type: missionForm.type,
      isFlash: missionForm.isFlash,
      expiresAt: expiresAt,
      active: true
    };

    saveMission(payload);
    reloadMissions();
    setIsMissionModalOpen(false);

    // Se marcado para notificar usuários ou se for missão relâmpago
    if (missionForm.notifyUsers || missionForm.isFlash) {
      addNotification({
        title: missionForm.isFlash ? `⚡ Missão Relâmpago: ${payload.name}!` : `🎯 Nova Missão: ${payload.name}`,
        message: `${payload.description} Ganhe +${payload.points} pontos agora!`,
        type: missionForm.isFlash ? 'mission' : 'system',
        actionUrl: '/challenges',
        actionLabel: 'Ver Missão'
      });
    }
  };

  const handleDeleteMission = (id, name) => {
    if (window.confirm(`Deseja realmente excluir a missão "${name}"?`)) {
      deleteMission(id);
      reloadMissions();
    }
  };

  const handleToggleStatus = (id) => {
    toggleMissionStatus(id);
    reloadMissions();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Restaurar a lista de missões para o padrão oficial da Tech Week?')) {
      resetToDefaultMissions();
      reloadMissions();
    }
  };

  // Transmissão de Notificação Geral
  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;

    addNotification({
      title: broadcastForm.title.trim(),
      message: broadcastForm.message.trim(),
      type: broadcastForm.type,
      actionUrl: broadcastForm.actionUrl || null,
      actionLabel: broadcastForm.actionLabel || 'Ver Detalhes'
    });

    setBroadcastSuccess('Comunicado enviado com sucesso para todos os participantes!');
    setBroadcastForm({
      title: '',
      message: '',
      type: 'system',
      actionUrl: '/challenges',
      actionLabel: 'Ver Missões'
    });

    setTimeout(() => setBroadcastSuccess(''), 4000);
  };

  // Filtro de participantes
  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    const name = (p.first_name || p.username || '').toLowerCase();
    const username = (p.username || '').toLowerCase();
    return name.includes(term) || username.includes(term);
  });

  const totalPointsDistributed = participants.reduce((sum, p) => sum + (p.total_points || 0), 0);

  return (
    <div className="page-container admin-dashboard animate-fade-in" style={{ padding: '24px 20px 100px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Navbar */}
      <div className="admin-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="admin-btn-icon"
            onClick={() => navigate('/')}
            title="Voltar ao App de Participante"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="admin-badge">Painel Admin</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tech Week 2026</span>
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
              Administração Geral
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="admin-btn-logout"
          title="Sair do painel de admin"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => setActiveTab('missions')}
        >
          <Zap size={16} />
          <span>Missões ({missions.length})</span>
        </button>

        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Participantes</span>
        </button>

        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Bell size={16} />
          <span>Avisos Gerais</span>
        </button>

        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={16} />
          <span>Métricas</span>
        </button>
      </div>

      {/* TAB 1: MISSIONS */}
      {activeTab === 'missions' && (
        <div className="animate-fade-in">
          <div className="admin-actions-bar">
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Gerenciar Missões</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Crie, edite ou lance missões relâmpago para movimentar o evento</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="admin-btn-flash"
                onClick={() => handleOpenNewMission(true)}
              >
                <Zap size={15} />
                <span>+ Missão Relâmpago ⚡</span>
              </button>

              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => handleOpenNewMission(false)}
              >
                <Plus size={16} />
                <span>Nova Missão</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {missions.map((mission) => {
              const isActive = mission.active !== false;
              const isFlash = !!mission.isFlash;

              return (
                <div
                  key={mission.id}
                  className={`admin-item-card ${isFlash ? 'flash-card' : ''} ${!isActive ? 'inactive' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div className={`admin-mission-icon ${isFlash ? 'flash' : ''}`}>
                      {isFlash ? <Zap size={20} color="#fbbf24" /> : <Sparkles size={20} color="#3b82f6" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>
                          {mission.name}
                        </h3>
                        {isFlash && <span className="flash-badge">⚡ RELÂMPAGO</span>}
                        {mission.isSecret && <span className="secret-badge">🔒 SECRETA</span>}
                        <span className="points-badge">+{mission.points} pts</span>
                        {!isActive && <span className="inactive-badge">PAUSADA</span>}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {mission.description}
                      </p>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                        <span>Tipo: {mission.type === 'photo' ? 'Foto / Comprovante 📸' : mission.type === 'manual' ? 'Manual (Formulário)' : mission.isAction ? 'Ação' : 'QR Code / Auto'}</span>
                        {mission.expiresAt && (
                          <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Expira em breve
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="admin-item-controls">
                    <button
                      type="button"
                      className={`admin-status-toggle ${isActive ? 'active' : ''}`}
                      onClick={() => handleToggleStatus(mission.id)}
                      title={isActive ? 'Desativar missão' : 'Ativar missão'}
                    >
                      {isActive ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#94a3b8" />}
                    </button>

                    <button
                      type="button"
                      className="admin-edit-btn"
                      onClick={() => handleOpenEditMission(mission)}
                      title="Editar missão"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={() => handleDeleteMission(mission.id, mission.name)}
                      title="Excluir missão"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Restaurar Missões Padrão da Tech Week
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANTES */}
      {activeTab === 'users' && (
        <div className="animate-fade-in">
          <div className="admin-actions-bar">
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Participantes Cadastrados</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Acompanhe os competidores e pontuações no evento</p>
            </div>

            <div className="admin-search-wrap">
              <Search size={16} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Buscar por nome ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-search-input"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Carregando participantes...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="admin-empty-state">
              <Users size={36} color="var(--text-secondary)" />
              <p>Nenhum participante encontrado.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Participante</th>
                    <th>Usuário</th>
                    <th>Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((user, idx) => (
                    <tr key={user.user_id || idx}>
                      <td>
                        <span className="admin-rank-pill">{idx + 1}º</span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#ffffff' }}>
                        {user.first_name || user.username || 'Participante'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        @{user.username || 'sem_user'}
                      </td>
                      <td style={{ fontWeight: '700', color: '#38bdf8' }}>
                        {user.total_points || 0} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BROADCAST NOTIFICATIONS */}
      {activeTab === 'broadcast' && (
        <div className="animate-fade-in">
          <div className="admin-actions-bar">
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Disparo de Avisos & Comunicados</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Envie notificações em massa que aparecem instantaneamente para todos no sino</p>
            </div>
          </div>

          {broadcastSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
              ✓ {broadcastSuccess}
            </div>
          )}

          <div className="card" style={{ maxWidth: '600px', background: 'var(--card-bg)' }}>
            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Ex: 📢 Palestra começando no Anfiteatro!"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mensagem Detalhada
                </label>
                <textarea
                  className="login-input"
                  rows="3"
                  style={{ resize: 'none' }}
                  placeholder="Ex: Não perca a palestra de Samuel Amorim na sala 5R às 20:00."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Tipo de Aviso
                  </label>
                  <select
                    className="login-input"
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                  >
                    <option value="system">⚡ Geral / Sistema</option>
                    <option value="lecture">📢 Palestra / Evento</option>
                    <option value="mission">🎯 Missão Relâmpago</option>
                    <option value="trophy">🏆 Premiação / Ranking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Redirecionamento ao Clicar
                  </label>
                  <select
                    className="login-input"
                    value={broadcastForm.actionUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      let label = 'Ver Detalhes';
                      if (url === '/challenges') label = 'Ver Missões';
                      if (url === '/') label = 'Ver Programação';
                      if (url === '/ranking') label = 'Ver Ranking';
                      setBroadcastForm({ ...broadcastForm, actionUrl: url, actionLabel: label });
                    }}
                  >
                    <option value="/challenges">Missões (/challenges)</option>
                    <option value="/">Programação (/)</option>
                    <option value="/ranking">Ranking (/ranking)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
              >
                <Send size={16} />
                <span>Enviar Comunicado para Todos</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: STATS */}
      {activeTab === 'stats' && (
        <div className="animate-fade-in">
          <div className="admin-actions-bar">
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Métricas do Evento</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Visão geral da participação na Tech Week</p>
            </div>
          </div>

          <div className="admin-stats-grid">
            <div className="card admin-stat-card">
              <div className="stat-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                <Users size={24} color="#3b82f6" />
              </div>
              <div className="stat-value">{participants.length}</div>
              <div className="stat-label">Participantes Registrados</div>
            </div>

            <div className="card admin-stat-card">
              <div className="stat-icon-wrap" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                <Trophy size={24} color="#fbbf24" />
              </div>
              <div className="stat-value">{totalPointsDistributed}</div>
              <div className="stat-label">Total de Pontos Concedidos</div>
            </div>

            <div className="card admin-stat-card">
              <div className="stat-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                <Zap size={24} color="#a855f7" />
              </div>
              <div className="stat-value">{missions.filter((m) => m.active !== false).length}</div>
              <div className="stat-label">Missões Ativas no App</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE MISSÃO */}
      {isMissionModalOpen && (
        <div className="notification-backdrop animate-fade-in" onClick={() => setIsMissionModalOpen(false)}>
          <div
            className="card"
            style={{ maxWidth: '480px', width: '100%', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '4px' }}>
              {editingMission ? 'Editar Missão' : missionForm.isFlash ? '⚡ Criar Missão Relâmpago' : 'Criar Nova Missão'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {missionForm.isFlash
                ? 'Missões relâmpago ganham destaque no topo e notificam todos os participantes.'
                : 'Defina o título, regras e pontuação da missão.'}
            </p>

            <form onSubmit={handleSaveMission} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nome da Missão
                </label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Ex: Foto no Stand da Empresa"
                  value={missionForm.name}
                  onChange={(e) => setMissionForm({ ...missionForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Descrição / Instrução para o Participante
                </label>
                <textarea
                  className="login-input"
                  rows="3"
                  style={{ resize: 'none' }}
                  placeholder="Ex: Visite o stand, tire uma foto ou descubra a resposta da pergunta."
                  value={missionForm.description}
                  onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Pontuação (+pts)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    className="login-input"
                    value={missionForm.points}
                    onChange={(e) => setMissionForm({ ...missionForm, points: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Tipo de Validação
                  </label>
                  <select
                    className="login-input"
                    value={missionForm.type}
                    onChange={(e) => setMissionForm({ ...missionForm, type: e.target.value })}
                  >
                    <option value="photo">Foto / Comprovante Fotográfico 📸</option>
                    <option value="manual">Manual (Formulário / Pergunta)</option>
                    <option value="auto">QR Code / Auto</option>
                  </select>
                </div>
              </div>

              {missionForm.isFlash && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#fbbf24', marginBottom: '4px' }}>
                    Duração da Missão Relâmpago (minutos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    className="login-input"
                    value={missionForm.durationMinutes}
                    onChange={(e) => setMissionForm({ ...missionForm, durationMinutes: Number(e.target.value) })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="notifyUsersCheck"
                  checked={missionForm.notifyUsers}
                  onChange={(e) => setMissionForm({ ...missionForm, notifyUsers: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="notifyUsersCheck" style={{ fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                  Enviar notificação automática para todos os usuários
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="card"
                  style={{ flex: 1, padding: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ffffff', cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => setIsMissionModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="login-btn"
                  style={{ flex: 1, margin: 0 }}
                >
                  Salvar Missão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

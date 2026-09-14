import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import logoTw from '../../assets/logo-tw.png';

export default function AdminLogin({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Validação com credenciais admin requisitadas pelo time
    const isValidAdmin =
      (cleanUser === 'admin' || cleanUser === 'admin@admin.com' || cleanUser === 'admin@techweek.facom.ufu.br') &&
      (cleanPass === 'TW123@' || cleanPass === 'admin' || cleanPass === 'Admin123@');

    if (isValidAdmin) {
      localStorage.setItem('facom_admin_logged_in', 'true');
      localStorage.setItem('facom_admin_user', cleanUser);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate('/admin');
      }
    } else {
      setError('Credenciais inválidas. Verifique o usuário e a senha de administrador.');
    }

    setLoading(false);
  };

  return (
    <div className="login-container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="login-glass-card" style={{ maxWidth: '420px', width: '100%', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(59, 130, 246, 0.15)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Voltar ao site"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 12px', borderRadius: '20px' }}>
            <Shield size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa' }}>ADMIN PORTAL</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src={logoTw} alt="FACOM Tech Week" style={{ height: '60px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
            Painel do Administrador
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Gerencie missões, participantes e avisos do evento
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '0.82rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Usuário Admin
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="login-input"
                placeholder="Ex: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                style={{ paddingLeft: '40px' }}
              />
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '40px' }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Shield size={18} />
            <span>{loading ? 'Verificando...' : 'Acessar Painel'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2, ArrowLeft, X } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { loginWithEmailAndPassword, sendPasswordReset } from '../lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'email', 'password', or null
  const [showPassword, setShowPassword] = useState(false);

  // Estados para o modal de Recuperação de Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginWithEmailAndPassword(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Sucesso
    localStorage.setItem('facom_logged_in', 'true');
    navigate('/');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetErrorMessage('');
    setResetSuccessMessage('');
    setResetLoading(true);

    const result = await sendPasswordReset(resetEmail || email);
    setResetLoading(false);

    if (result.success) {
      setResetSuccessMessage(result.message);
    } else {
      setResetErrorMessage(result.message);
    }
  };

  const openResetModal = (e) => {
    e.preventDefault();
    setResetEmail(email); // Preenche automaticamente com o e-mail digitado
    setResetErrorMessage('');
    setResetSuccessMessage('');
    setIsResetModalOpen(true);
  };

  const closeResetModal = () => {
    setIsResetModalOpen(false);
    setResetErrorMessage('');
    setResetSuccessMessage('');
  };

  // Cálculo da posição dos olhos do Teko
  const lookOffset = focusedInput === 'email' ? -4 + (email.length * 0.8) : 0;
  const lookOffsetY = focusedInput === 'email' ? 6 : 0;
  
  // Teko cobre os olhos ao digitar senha
  const isCoveringEyes = focusedInput === 'password';
  // Teko espia se o campo de senha estiver em foco E a senha estiver visível
  const isPeeking = focusedInput === 'password' && showPassword;

  return (
    <div className="login-container animate-fade-in" style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto', width: '100%', maxWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Weeka espiando pelo canto */}
      <div 
        style={{
          position: 'absolute',
          bottom: '10px',
          right: showPassword ? '-80px' : '-200px',
          transition: 'right 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 10,
          transform: 'scale(0.85) rotate(-15deg)'
        }}
      >
        <Mascot color="purple" />
      </div>

      <div className="login-glow"></div>
      
      <div className="login-glass-card" style={{ zIndex: 2, position: 'relative', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img src={logoTw} alt="FACOM Tech Week" style={{ height: '50px', marginBottom: '8px' }} />
          
          {/* Mascote Interativo Teko */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0px', marginTop: '-10px' }}>
            <Mascot 
              color="blue" 
              isCoveringEyes={isCoveringEyes} 
              isPeeking={isPeeking}
              lookOffset={lookOffset} 
              lookOffsetY={lookOffsetY}
            />
          </div>
          <h2 className="font-lastica" style={{ fontSize: '1.4rem', fontWeight: '500', letterSpacing: '1px', marginTop: '16px' }}>
            Login
          </h2>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>
              E-mail
            </label>
            <input 
              type="email" 
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              className="login-input"
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                className="login-input"
                style={{ paddingRight: '48px' }}
                required
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '-10px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: '-10px' }}>
            <button
              type="button"
              onClick={openResetModal}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #9ca3af)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: '2px 4px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary, #9ca3af)'}
            >
              Esqueceu a senha?
            </button>
          </div>

          <button 
            type="submit" 
            className="login-btn" 
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} 
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: '16px' }}>
          <Link 
            to="/cadastro" 
            className="login-btn" 
            style={{ 
              display: 'block', 
              textAlign: 'center', 
              textDecoration: 'none', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              marginTop: '0' 
            }}
          >
            Cadastre-se
          </Link>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {isResetModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div 
            className="login-glass-card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={closeResetModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0, 210, 255, 0.1)',
                  color: '#00d2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <KeyRound size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '6px' }}>
                Recuperar Senha
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Digite seu e-mail cadastrado para receber o link de redefinição de senha oficial.
              </p>
            </div>

            {resetSuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '16px', lineHeight: '1.4' }}>
                  {resetSuccessMessage}
                </p>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="login-btn"
                  style={{ width: '100%' }}
                >
                  Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Seu E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>

                {resetErrorMessage && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
                    {resetErrorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="login-btn"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  disabled={resetLoading}
                >
                  {resetLoading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Link de Recuperação'}
                </button>

                <button
                  type="button"
                  onClick={closeResetModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowLeft size={16} /> Cancelar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

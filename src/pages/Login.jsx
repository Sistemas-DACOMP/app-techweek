import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import Mascot from '../components/Mascot';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { supabase } from '../lib/supabaseClient';
import { suggestEmailCorrection } from '../lib/validators';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'email', 'password', or null
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Allow "admin" as a shortcut for the admin account
    const cleanEmail = email.trim().toLowerCase();
    const loginEmail = cleanEmail === 'admin' ? 'admin@admin.com' : cleanEmail;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
    });

    setLoading(false);

    if (error) {
      setError('Credenciais inválidas. Tente novamente.');
      return;
    }

    // Success
    localStorage.setItem('facom_logged_in', 'true');
    navigate('/');
  };

  // Calculate where Teko should look based on typing
  // Start looking slightly left (-4) and move right as text grows
  const lookOffset = focusedInput === 'email' ? -4 + (email.length * 0.8) : 0;
  // Look down when typing email
  const lookOffsetY = focusedInput === 'email' ? 6 : 0;
  
  // Teko covers his eyes if we are typing a password
  const isCoveringEyes = focusedInput === 'password';
  // Teko peeks if password field is focused AND password is shown
  const isPeeking = focusedInput === 'password' && showPassword;

  return (
    <div className="login-container animate-fade-in" style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto', width: '100%', maxWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Weeka peeking suspiciously from the corner when password is shown */}
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
          {/* Teko Interactive Mascot */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0px', marginTop: '-10px' }}>
            <Mascot 
              color="blue" 
              isCoveringEyes={isCoveringEyes} 
              isPeeking={isPeeking}
              lookOffset={lookOffset} 
              lookOffsetY={lookOffsetY}
            />
          </div>
          <h2 className="font-lastica" style={{ fontSize: '1.4rem', fontWeight: '500', letterSpacing: '1px', marginTop: '16px' }}>Login</h2>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>
              E-mail
            </label>
            <input 
              type="text" 
              placeholder="seu@email.com"
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
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '-10px' }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'left', marginTop: '-10px' }}>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textDecoration: 'none', marginLeft: '4px' }}>
              Esqueceu a Senha?
            </a>
          </div>

          <button type="submit" className="login-btn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={loading}>
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
    </div>
  );
}

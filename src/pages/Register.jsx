import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { signUpWithEmail } from '../lib/auth';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    participantType: '',
    course: 'Exatas', // Default
    period: '',
    linkedin: '',
    instagram: '',
    termsAccepted: false
  });
  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    if (!formData.termsAccepted) {
      setError("Você precisa aceitar os termos de privacidade (LGPD).");
      return;
    }
    
    setLoading(true);

    // Create user in Supabase Auth
    const result = await signUpWithEmail({
      email: formData.email,
      password: formData.password,
      metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        phone: formData.phone,
        participant_type: formData.participantType,
        course: formData.course,
        period: formData.period ? parseInt(formData.period) : null,
        linkedin: formData.linkedin,
        instagram: formData.instagram
      }
    });

    setLoading(false);

    if (result.status !== 'signed_in') {
      setError(result.message);
      return;
    }

    // Attempt to upload avatar if provided
    if (avatarFile && result.data?.user) {
      try {
        const { uploadAvatar } = await import('../lib/gameplay');
        await uploadAvatar(avatarFile);
      } catch (err) {
        console.error("Failed to upload avatar during registration:", err);
        // We don't block registration on avatar failure
      }
    }

    setLoading(false);

    // Success! O perfil é criado automaticamente
    localStorage.setItem('facom_logged_in', 'true');
    navigate('/onboarding');
  };

  // Teko interactivity logic
  const isTypingSomething = focusedInput !== null && focusedInput !== 'password' && focusedInput !== 'confirmPassword';
  const currentTextLength = isTypingSomething ? (formData[focusedInput] || '').length : 0;
  const lookOffset = isTypingSomething ? -4 + (currentTextLength * 0.5) : 0;
  const lookOffsetY = isTypingSomething ? 6 : 0;
  
  const isCoveringEyes = (focusedInput === 'password' || focusedInput === 'confirmPassword');
  const isPeeking = isCoveringEyes && showPassword;

  return (
    <div className="login-container animate-fade-in" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      
      {/* Weeka peeking */}
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
      
      <div className="login-glass-card" style={{ zIndex: 2, position: 'relative', width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img src={logoTw} alt="FACOM Tech Week" style={{ height: '40px', marginBottom: '8px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0px', marginTop: '-10px' }}>
            <Mascot 
              color="blue" 
              isCoveringEyes={isCoveringEyes} 
              isPeeking={isPeeking}
              lookOffset={lookOffset} 
              lookOffsetY={lookOffsetY}
            />
          </div>
          <h2 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500', letterSpacing: '1px', marginTop: '12px', marginBottom: '8px' }}>Cadastro</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '24px', fontWeight: 'bold' }}>
            Etapa {step} de 2: {step === 1 ? 'Essenciais' : 'Social'}
          </div>
        </div>

        <form onSubmit={step === 1 ? handleNextStep : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {step === 1 && (
            <>
              <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Nome</label>
              <input 
                name="firstName" type="text" placeholder="Nome"
                value={formData.firstName} onChange={handleChange}
                onFocus={() => setFocusedInput('firstName')} onBlur={() => setFocusedInput(null)}
                className="login-input" required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Sobrenome</label>
              <input 
                name="lastName" type="text" placeholder="Sobrenome"
                value={formData.lastName} onChange={handleChange}
                onFocus={() => setFocusedInput('lastName')} onBlur={() => setFocusedInput(null)}
                className="login-input" required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Nome de Usuário</label>
            <input 
              name="username" type="text" placeholder="Ex: devninja"
              value={formData.username} onChange={handleChange}
              onFocus={() => setFocusedInput('username')} onBlur={() => setFocusedInput(null)}
              className="login-input" required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>O que você é?</label>
            <select 
              name="participantType"
              value={formData.participantType} onChange={handleChange}
              onFocus={() => setFocusedInput('participantType')} onBlur={() => setFocusedInput(null)}
              className="login-input" required
              style={{ width: '100%' }}
            >
              <option value="" disabled>Selecione uma opção</option>
              <option value="Aluno da UFU">Aluno da UFU</option>
              <option value="Aluno de outra instituição">Aluno de outra instituição</option>
              <option value="Servidor">Servidor</option>
              <option value="Organizador">Organizador</option>
              <option value="Patrocinador">Patrocinador</option>
            </select>
          </div>

          {(formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição') && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Curso</label>
                <input 
                  name="course" type="text" placeholder="Qual curso você faz?"
                  value={formData.course} onChange={handleChange}
                  onFocus={() => setFocusedInput('course')} onBlur={() => setFocusedInput(null)}
                  className="login-input" required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Período</label>
                <input 
                  name="period" type="number" placeholder="Ex: 1" min="1" max="20"
                  value={formData.period} onChange={handleChange}
                  onFocus={() => setFocusedInput('period')} onBlur={() => setFocusedInput(null)}
                  className="login-input" required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>E-mail</label>
            <input 
              name="email" type="email" placeholder="seu@email.com"
              value={formData.email} onChange={handleChange}
              onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)}
              className="login-input" required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Telefone</label>
            <input 
              name="phone" type="tel" placeholder="(00) 00000-0000"
              value={formData.phone} onChange={handleChange}
              onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)}
              className="login-input" required
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input 
                  name="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={formData.password} onChange={handleChange}
                  onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)}
                  className="login-input" style={{ paddingRight: '40px' }} required
                />
                <button
                  type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Confirmar Senha</label>
              <div style={{ position: 'relative' }}>
                <input 
                  name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={formData.confirmPassword} onChange={handleChange}
                  onFocus={() => setFocusedInput('confirmPassword')} onBlur={() => setFocusedInput(null)}
                  className="login-input" style={{ paddingRight: '40px' }} required
                />
              </div>
            </div>
          </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Foto de Perfil (Opcional)</label>
                <input 
                  type="file" accept="image/*" onChange={handleAvatarChange}
                  className="login-input" style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>LinkedIn (Opcional)</label>
                  <input 
                    name="linkedin" type="text" placeholder="URL ou Username"
                    value={formData.linkedin} onChange={handleChange}
                    onFocus={() => setFocusedInput('linkedin')} onBlur={() => setFocusedInput(null)}
                    className="login-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Instagram (Opcional)</label>
                  <input 
                    name="instagram" type="text" placeholder="@username"
                    value={formData.instagram} onChange={handleChange}
                    onFocus={() => setFocusedInput('instagram')} onBlur={() => setFocusedInput(null)}
                    className="login-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
                <input 
                  name="termsAccepted" type="checkbox" id="terms"
                  checked={formData.termsAccepted} onChange={handleChange}
                  style={{ marginTop: '2px', accentColor: 'var(--primary-color)' }}
                />
                <label htmlFor="terms" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Ao me cadastrar, concordo com a coleta dos meus dados (nome, e-mail, foto e redes sociais) para fins de identificação, networking e gamificação durante o evento, conforme as diretrizes da LGPD.
                </label>
              </div>
            </>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="login-btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.1)' }}>
                Voltar
              </button>
            )}
            <button type="submit" className="login-btn" style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 1 ? 'Próximo' : 'Criar Conta')}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Já possui conta? <Link to="/login" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}>Fazer Login</Link>
        </div>
      </div>
    </div>
  );
}

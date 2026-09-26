import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import AvatarCropperModal from '../components/AvatarCropperModal';
import { Eye, EyeOff, Loader2, Upload, Camera, RefreshCw, Trash2, Plus, ShieldCheck } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { signUpWithEmail } from '../lib/auth';
import { createUserProfile, uploadUserAvatar } from '../lib/userService';
import { getPasswordStrength, suggestEmailCorrection, MIN_PASSWORD_LENGTH } from '../lib/validators';

const UFU_COURSES = [
  'Sistemas de Informação',
  'Ciência da Computação',
  'Inteligência Artificial',
  'Engenharia de Computação',
  'Engenharia Elétrica',
  'Engenharia Biomédica',
  'Engenharia Mecatrônica',
  'Ciência de Dados',
  'Cibersegurança',
  'Design',
  'Outro (especificar)'
];

export default function Register() {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    participantType: 'Aluno da UFU',
    course: 'Sistemas de Informação',
    customCourse: '',
    period: '',
    linkedin: '',
    instagram: '',
    termsAccepted: false
  });
  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setRawImageForCrop(imageUrl);
      e.target.value = ''; // Permite selecionar o mesmo arquivo novamente se quiser
    }
  };

  const handleCropComplete = (croppedFile, previewUrl) => {
    setAvatarFile(croppedFile);
    setAvatarPreview(previewUrl);
    setRawImageForCrop(null);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);

    const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
    if (isStudent && formData.course === 'Outro (especificar)' && !formData.customCourse.trim()) {
      setError("Por favor, digite o nome do seu curso.");
      return;
    }

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

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

    const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
    const finalCourse = isStudent 
      ? (formData.course === 'Outro (especificar)' ? formData.customCourse.trim() : formData.course)
      : '';
    
    setLoading(true);

    try {
      // 1. Cria a conta no Firebase Auth
      const authResult = await signUpWithEmail({
        email: formData.email,
        password: formData.password,
        metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username
        }
      });

      if (authResult.status !== 'signed_in' || !authResult.data?.user) {
        setError(authResult.message || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      const uid = authResult.data.user.uid;

      // 2. Cria o documento de perfil no Cloud Firestore
      await createUserProfile(uid, {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        phone: formData.phone,
        participantType: formData.participantType,
        course: finalCourse,
        period: isStudent ? formData.period : null,
        linkedin: formData.linkedin,
        instagram: formData.instagram,
        symplaTicket: null
      });

      // 4. Faz o upload da foto de perfil no Firebase Storage se fornecida
      if (avatarFile) {
        try {
          await uploadUserAvatar(uid, avatarFile);
        } catch (avatarErr) {
          console.warn("Aviso: Falha ao enviar foto durante o cadastro:", avatarErr);
          // Não bloqueia o cadastro se o upload da foto falhar
        }
      }

      setLoading(false);
      localStorage.setItem('facom_logged_in', 'true');
      navigate('/onboarding');
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setError(err.message || "Erro inesperado ao realizar cadastro.");
      setLoading(false);
    }
  };

  // Lógica de interação do mascote Alan
  const isPasswordFocused = (focusedInput === 'password' || focusedInput === 'confirmPassword');
  const isTypingSomething = focusedInput !== null && !isPasswordFocused;
  const currentTextLength = isTypingSomething ? (formData[focusedInput] || '').length : 0;
  const lookOffset = isTypingSomething ? -4 + (currentTextLength * 0.5) : 0;
  const lookOffsetY = isTypingSomething ? 6 : 0;
  
  const isCoveringEyes = isPasswordFocused;
  const isPeeking = isPasswordFocused && showPassword;

  return (
    <div className="login-container animate-fade-in" style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto', width: '100%', maxWidth: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px 40px 16px' }}>
      <div className="login-glow"></div>
      
      <div className="login-glass-card" style={{ zIndex: 2, position: 'relative', width: '100%', maxWidth: '500px', padding: '36px 24px 28px 24px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '14px', paddingTop: '4px' }}>
          <img 
            src={logoTw} 
            alt="FACOM Tech Week" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain', marginBottom: '14px', display: 'inline-block' }} 
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0px' }}>
            <Mascot 
              color="blue" 
              isCoveringEyes={isCoveringEyes} 
              isPeeking={isPeeking}
              lookOffset={lookOffset} 
              lookOffsetY={lookOffsetY}
            />
          </div>
          <h2 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500', letterSpacing: '1px', marginTop: '14px', marginBottom: '6px' }}>Cadastro</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary-color, #00d2ff)', marginBottom: '20px', fontWeight: 'bold' }}>
            Etapa {step} de 2: {step === 1 ? 'Dados da Conta' : 'Perfil & Foto'}
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
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Nome de Usuário (@handle)</label>
                <input 
                  name="username" type="text" placeholder="Ex: devninja"
                  value={formData.username} onChange={handleChange}
                  onFocus={() => setFocusedInput('username')} onBlur={() => setFocusedInput(null)}
                  className="login-input" required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Perfil no Evento</label>
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
                  <option value="Servidor / Professor">Servidor / Professor</option>
                  <option value="Comunidade Externa">Comunidade Externa</option>
                </select>
              </div>

              {(formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição') && (
                <>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Curso</label>
                      <select 
                        name="course"
                        value={formData.course} onChange={handleChange}
                        onFocus={() => setFocusedInput('course')} onBlur={() => setFocusedInput(null)}
                        className="login-input" required
                        style={{ width: '100%' }}
                      >
                        <option value="" disabled>Selecione seu curso</option>
                        {UFU_COURSES.map(courseName => (
                          <option key={courseName} value={courseName}>{courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Período</label>
                      <input 
                        name="period" type="number" placeholder="Ex: 3" min="1" max="20"
                        value={formData.period} onChange={handleChange}
                        onFocus={() => setFocusedInput('period')} onBlur={() => setFocusedInput(null)}
                        className="login-input" required
                      />
                    </div>
                  </div>

                  {formData.course === 'Outro (especificar)' && (
                    <div className="animate-fade-in" style={{ marginTop: '-4px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary-color, #00d2ff)', marginBottom: '4px', marginLeft: '4px', fontWeight: '500' }}>
                        Qual é o seu curso?
                      </label>
                      <input 
                        name="customCourse" type="text" placeholder="Digite o nome completo do seu curso..."
                        value={formData.customCourse} onChange={handleChange}
                        onFocus={() => setFocusedInput('customCourse')} onBlur={() => setFocusedInput(null)}
                        className="login-input" required
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>E-mail (preferencialmente o mesmo do Sympla)</label>
                <input 
                  name="email" type="email" placeholder="seu.email@exemplo.com"
                  value={formData.email} onChange={handleChange}
                  onFocus={() => setFocusedInput('email')} 
                  onBlur={() => setFocusedInput(null)}
                  className="login-input" required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>WhatsApp / Telefone</label>
                <input 
                  name="phone" type="tel" placeholder="(34) 99999-9999"
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

              {/* Barra Reativa de Força de Senha (KAN-27 / KAN-45) */}
              {formData.password && (
                <div style={{ marginTop: '-8px', marginLeft: '4px', marginRight: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Força da Senha:</span>
                    <span style={{ fontSize: '0.7rem', color: passwordStrength.color, fontWeight: 'bold' }}>{passwordStrength.label}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${passwordStrength.percent}%`, 
                        height: '100%', 
                        background: passwordStrength.color, 
                        transition: 'width 0.3s ease, background 0.3s ease' 
                      }} 
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Seletor de Foto de Perfil com Preview Ampliado e Clicável */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para escolher ou trocar sua foto"
                  style={{
                    width: '124px',
                    height: '124px',
                    borderRadius: '50%',
                    border: '3px solid rgba(0, 210, 255, 0.4)',
                    boxShadow: avatarPreview 
                      ? '0 0 20px rgba(0, 210, 255, 0.25)' 
                      : '0 0 10px rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    background: avatarPreview ? '#09090b' : 'rgba(255, 255, 255, 0.04)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.borderColor = '#00d2ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.4)';
                  }}
                >
                  {avatarPreview ? (
                    <>
                      <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: '#00d2ff',
                          borderRadius: '50%',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(0, 210, 255, 0.4)'
                        }}
                      >
                        <Camera size={14} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div 
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'rgba(0, 210, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '6px',
                          color: '#00d2ff'
                        }}
                      >
                        <Camera size={24} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Toque para foto
                      </span>
                    </>
                  )}
                </div>

                {/* Botões de Ação do Avatar */}
                {!avatarPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="login-btn"
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '8px 18px',
                      background: 'rgba(0, 210, 255, 0.12)',
                      border: '1px solid rgba(0, 210, 255, 0.35)',
                      color: '#00d2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '0',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={16} /> Adicionar Foto de Perfil
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '280px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="login-btn"
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '0',
                        borderRadius: '8px'
                      }}
                    >
                      <RefreshCw size={14} /> Trocar Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="login-btn"
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '0',
                        borderRadius: '8px'
                      }}
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                )}

                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  PNG, JPG ou WebP até 2MB (opcional)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>LinkedIn (Opcional)</label>
                  <input 
                    name="linkedin" type="text" placeholder="linkedin.com/in/seu-perfil"
                    value={formData.linkedin} onChange={handleChange}
                    onFocus={() => setFocusedInput('linkedin')} onBlur={() => setFocusedInput(null)}
                    className="login-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Instagram (Opcional)</label>
                  <input 
                    name="instagram" type="text" placeholder="@seu_usuario"
                    value={formData.instagram} onChange={handleChange}
                    onFocus={() => setFocusedInput('instagram')} onBlur={() => setFocusedInput(null)}
                    className="login-input"
                  />
                </div>
              </div>

              {/* Termo de Consentimento LGPD */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '10px', 
                  marginTop: '8px', 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255,255,255,0.08)' 
                }}
              >
                <input 
                  name="termsAccepted" type="checkbox" id="terms"
                  checked={formData.termsAccepted} onChange={handleChange}
                  style={{ marginTop: '3px', accentColor: 'var(--primary-color, #00d2ff)' }}
                  required
                />
                <label htmlFor="terms" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: 'white', marginBottom: '2px' }}>
                    <ShieldCheck size={14} color="#10b981" /> Termo de Privacidade (LGPD)
                  </span>
                  Concordo com a coleta dos meus dados para identificação, emissão de crachá, networking e gamificação durante a FACOM Tech Week.
                </label>
              </div>
            </>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {step === 2 && (
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="login-btn" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.1)' }}
              >
                Voltar
              </button>
            )}
            <button 
              type="submit" 
              className="login-btn" 
              style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 1 ? 'Próximo' : 'Concluir Cadastro')}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Já possui conta? <Link to="/login" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}>Fazer Login</Link>
        </div>
      </div>

      {/* Modal Interativo de Corte de Foto */}
      {rawImageForCrop && (
        <AvatarCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}
    </div>
  );
}

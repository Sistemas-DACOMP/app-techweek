import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import AvatarCropperModal from '../components/AvatarCropperModal';
import Terms from './Terms';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Camera, 
  RefreshCw, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  X,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { auth } from '../lib/firebase';
import { signUpWithEmail } from '../lib/auth';
import { createUserProfile, uploadUserAvatar, findUserByUsername } from '../lib/userService';
import { 
  getPasswordStrength, 
  MIN_PASSWORD_LENGTH, 
  isValidEmail, 
  isValidName, 
  isValidUsername, 
  formatPhone, 
  isValidPhone, 
  passwordsMatch 
} from '../lib/validators';
import { verifySymplaTicket } from '../lib/sympla';

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
    github: '',
    termsAccepted: false
  });
  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const handleTogglePassword = () => {
    const passEl = passwordInputRef.current;
    const confEl = confirmPasswordInputRef.current;

    const isPassActive = document.activeElement === passEl;
    const isConfActive = document.activeElement === confEl;

    const passStart = passEl ? passEl.selectionStart : null;
    const passEnd = passEl ? passEl.selectionEnd : null;
    const confStart = confEl ? confEl.selectionStart : null;
    const confEnd = confEl ? confEl.selectionEnd : null;

    setShowPassword((prev) => !prev);

    requestAnimationFrame(() => {
      if (isPassActive && passEl) {
        passEl.focus();
        if (passStart !== null && passEnd !== null) {
          passEl.setSelectionRange(passStart, passEnd);
        }
      } else if (isConfActive && confEl) {
        confEl.focus();
        if (confStart !== null && confEnd !== null) {
          confEl.setSelectionRange(confStart, confEnd);
        }
      } else {
        if (passEl && passStart !== null && passEnd !== null) {
          passEl.setSelectionRange(passStart, passEnd);
        }
        if (confEl && confStart !== null && confEnd !== null) {
          confEl.setSelectionRange(confStart, confEnd);
        }
      }
    });
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    existingUser: null,
    message: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona apenas se o usuário já abrir a tela autenticado
    if (auth.currentUser && !loading) {
      const hasOnboarding = localStorage.getItem('facom_onboarding_completed') === 'true';
      navigate(hasOnboarding ? '/' : '/onboarding', { replace: true });
    }
  }, []);

  // Verificação em tempo real de unicidade de username (chave única) com debounce
  useEffect(() => {
    const rawUsername = formData.username ? formData.username.trim() : '';
    const cleanUsername = rawUsername.replace(/^@/, '').toLowerCase();

    if (!cleanUsername) {
      setUsernameCheck({ status: 'idle', existingUser: null, message: '' });
      return;
    }

    if (!isValidUsername(cleanUsername)) {
      setUsernameCheck({
        status: 'invalid',
        existingUser: null,
        message: 'Usuário deve ter de 3 a 20 caracteres (letras, números, . ou _).'
      });
      return;
    }

    setUsernameCheck({ status: 'checking', existingUser: null, message: 'Verificando...' });

    const timer = setTimeout(async () => {
      try {
        const existing = await findUserByUsername(cleanUsername);
        if (existing) {
          const displayName = existing.displayName || [existing.firstName, existing.lastName].filter(Boolean).join(' ') || existing.name || existing.username || 'Outro participante';
          const avatar = existing.avatarUrl || existing.photoURL || null;
          setUsernameCheck({
            status: 'taken',
            existingUser: {
              name: displayName,
              avatarUrl: avatar,
              username: cleanUsername,
              course: existing.course || existing.participantType || ''
            },
            message: `O @${cleanUsername} já está cadastrado para outro participante.`
          });
          setFieldErrors(prev => ({
            ...prev,
            username: `O @${cleanUsername} já está em uso.`
          }));
        } else {
          setUsernameCheck({
            status: 'available',
            existingUser: null,
            message: `@${cleanUsername} está disponível!`
          });
          setFieldErrors(prev => {
            const updated = { ...prev };
            delete updated.username;
            return updated;
          });
        }
      } catch (_e) {
        setUsernameCheck({ status: 'idle', existingUser: null, message: '' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.username]);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    let newVal = type === 'checkbox' ? checked : value;

    // Máscara automática de telefone para evitar letras e formatar como (XX) XXXXX-XXXX
    if (name === 'phone') {
      newVal = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: newVal }));

    // Limpa o erro do campo quando o usuário edita
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
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

  const validateStep1 = () => {
    const errors = {};

    if (!isValidName(formData.firstName)) {
      errors.firstName = 'Nome deve ter pelo menos 2 caracteres.';
    }

    if (!isValidName(formData.lastName)) {
      errors.lastName = 'Sobrenome deve ter pelo menos 2 caracteres.';
    }

    if (!isValidUsername(formData.username)) {
      errors.username = 'Usuário deve ter de 3 a 20 caracteres (letras, números, . ou _).';
    }

    if (!isValidEmail(formData.email)) {
      errors.email = 'Insira um e-mail válido com domínio (ex: usuario@exemplo.com).';
    }

    if (!isValidPhone(formData.phone)) {
      errors.phone = 'Insira um telefone válido com DDD (10 ou 11 dígitos numéricos).';
    }

    const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
    if (isStudent && formData.course === 'Outro (especificar)' && !formData.customCourse.trim()) {
      errors.customCourse = 'Por favor, digite o nome do seu curso.';
    }

    if (!formData.password || formData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    if (!passwordsMatch(formData.password, formData.confirmPassword)) {
      errors.confirmPassword = 'As senhas não coincidem!';
    }

    return errors;
  };

  const handleNextStep = async (e) => {
    e.preventDefault();
    setError(null);

    const step1Errors = validateStep1();
    if (Object.keys(step1Errors).length > 0) {
      setFieldErrors(step1Errors);
      setError('Por favor, corrija os erros nos campos antes de prosseguir.');
      return;
    }

    if (usernameCheck.status === 'taken') {
      setError(`O nome de usuário '@${formData.username}' já está em uso por outro participante.`);
      return;
    }

    // Validação ativa no banco antes de prosseguir para etapa 2
    setLoading(true);
    try {
      const cleanUsername = formData.username.trim().replace(/^@/, '').toLowerCase();
      const existing = await findUserByUsername(cleanUsername);
      if (existing) {
        const displayName = existing.displayName || [existing.firstName, existing.lastName].filter(Boolean).join(' ') || existing.name || existing.username;
        setUsernameCheck({
          status: 'taken',
          existingUser: {
            name: displayName,
            avatarUrl: existing.avatarUrl || existing.photoURL || null,
            username: cleanUsername,
            course: existing.course || existing.participantType || ''
          },
          message: `O @${cleanUsername} já está cadastrado para outro participante.`
        });
        setFieldErrors(prev => ({
          ...prev,
          username: `O @${cleanUsername} já está em uso.`
        }));
        setError(`O nome de usuário '@${cleanUsername}' já está cadastrado para outro participante. Escolha outro.`);
        setLoading(false);
        return;
      }
    } catch (_e) {}
    setLoading(false);

    setFieldErrors({});
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

    const cleanUsername = formData.username ? formData.username.trim().replace(/^@/, '').toLowerCase() : '';

    // Bloqueia caso o username esteja ocupado
    if (usernameCheck.status === 'taken') {
      setError(`O nome de usuário '@${cleanUsername}' já está em uso.`);
      return;
    }

    const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
    const finalCourse = isStudent 
      ? (formData.course === 'Outro (especificar)' ? formData.customCourse.trim() : formData.course)
      : '';
    
    setLoading(true);

    try {
      // 0. Valida unicidade de username final
      const existing = await findUserByUsername(cleanUsername).catch(() => null);
      if (existing) {
        setError(`O nome de usuário '@${cleanUsername}' já foi registrado por outro participante. Por favor, escolha outro.`);
        setLoading(false);
        return;
      }

      // 1. Cria a conta no Firebase Auth
      const authResult = await signUpWithEmail({
        email: formData.email,
        password: formData.password,
        metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: cleanUsername
        }
      });

      if (authResult.status !== 'signed_in' || !authResult.data?.user) {
        setError(authResult.message || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      const uid = authResult.data.user.uid;

      // 2. Consulta automática do Sympla pelo e-mail informado (timeout resiliente de 3s)
      let symplaTicketData = null;
      try {
        const symplaPromise = verifySymplaTicket({ email: formData.email });
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        const symplaRes = await Promise.race([symplaPromise, timeoutPromise]);
        
        if (symplaRes?.verified && (symplaRes.symplaTicket || symplaRes.participant)) {
          const p = symplaRes.participant;
          symplaTicketData = symplaRes.symplaTicket || {
            participantId: p?.id,
            orderId: p?.orderId,
            ticketNumber: p?.ticketNumber,
            ticketName: p?.ticketName,
            qrCodeData: p?.qrCodeData || p?.ticketNumber,
            syncedAt: new Date().toISOString()
          };
        }
      } catch (symplaErr) {
        console.warn('Aviso: Verificação preliminar do Sympla falhou, prosseguindo:', symplaErr);
      }

      // 3. Processa a foto de perfil imediatamente antes de gravar o perfil
      let finalAvatarUrl = avatarPreview || null;
      if (avatarFile) {
        try {
          finalAvatarUrl = await uploadUserAvatar(uid, avatarFile);
        } catch (avatarErr) {
          console.warn("Aviso: Upload para o Storage falhou, mantendo prévia local:", avatarErr);
          // finalAvatarUrl permanece como avatarPreview (Base64) garantindo que a foto não suma
        }
      }

      // 4. Cria o documento de perfil no Firestore e no cache local com todos os dados
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
        github: formData.github,
        avatarUrl: finalAvatarUrl,
        hasSymplaTicket: !!symplaTicketData,
        symplaTicket: symplaTicketData
      });

      try {
        localStorage.removeItem('facom_onboarding_completed');
        localStorage.setItem('facom_logged_in', 'true');
      } catch (_e) {}
      setLoading(false);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setError(err.message || "Erro inesperado ao realizar cadastro.");
      setLoading(false);
    }
  };

  // Lógica de interação do mascote Alan
  const isStep2 = step === 2;
  const isPasswordFocused = !isStep2 && (focusedInput === 'password' || focusedInput === 'confirmPassword');
  const isTypingSomething = !isStep2 && focusedInput !== null && !isPasswordFocused;
  const currentTextLength = isTypingSomething ? (formData[focusedInput] || '').length : 0;
  
  // Na Etapa 2 de cadastro, o mascote Alan destampa os olhos e olha para baixo
  const lookOffset = isStep2 ? 0 : (isTypingSomething ? -4 + (currentTextLength * 0.5) : 0);
  const lookOffsetY = isStep2 ? 8 : (isTypingSomething ? 6 : 0);
  
  const isCoveringEyes = !isStep2 && isPasswordFocused;
  const isPeeking = !isStep2 && isPasswordFocused && showPassword;

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
                    className="login-input" 
                    style={fieldErrors.firstName ? { borderColor: '#ef4444' } : {}}
                    required
                  />
                  {fieldErrors.firstName && (
                    <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                      {fieldErrors.firstName}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Sobrenome</label>
                  <input 
                    name="lastName" type="text" placeholder="Sobrenome"
                    value={formData.lastName} onChange={handleChange}
                    onFocus={() => setFocusedInput('lastName')} onBlur={() => setFocusedInput(null)}
                    className="login-input" 
                    style={fieldErrors.lastName ? { borderColor: '#ef4444' } : {}}
                    required
                  />
                  {fieldErrors.lastName && (
                    <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                      {fieldErrors.lastName}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', marginLeft: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nome de Usuário (@handle)</label>
                  {usernameCheck.status === 'checking' && (
                    <span style={{ fontSize: '0.70rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} className="animate-spin" />
                      Verificando...
                    </span>
                  )}
                  {usernameCheck.status === 'available' && (
                    <span style={{ fontSize: '0.70rem', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <CheckCircle2 size={12} />
                      Disponível
                    </span>
                  )}
                  {usernameCheck.status === 'taken' && (
                    <span style={{ fontSize: '0.70rem', color: '#F87171', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertCircle size={12} />
                      Já em uso
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input 
                    name="username" type="text" placeholder="Ex: devninja"
                    value={formData.username} onChange={handleChange}
                    onFocus={() => setFocusedInput('username')} onBlur={() => setFocusedInput(null)}
                    className="login-input" 
                    style={{
                      borderColor: (usernameCheck.status === 'taken' || fieldErrors.username)
                        ? '#ef4444' 
                        : (usernameCheck.status === 'available' ? '#22c55e' : undefined),
                      paddingRight: '38px',
                      width: '100%'
                    }}
                    required
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    {usernameCheck.status === 'checking' && <Loader2 size={16} className="animate-spin" color="#38BDF8" />}
                    {usernameCheck.status === 'available' && <CheckCircle2 size={16} color="#22c55e" />}
                    {usernameCheck.status === 'taken' && <AlertCircle size={16} color="#ef4444" />}
                  </div>
                </div>

                {/* Card de Alerta visual mostrando o usuário que já tem este @ */}
                {usernameCheck.status === 'taken' && (
                  <div
                    className="animate-fade-in"
                    style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F87171',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {usernameCheck.existingUser?.avatarUrl ? (
                        <img 
                          src={usernameCheck.existingUser.avatarUrl} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FCA5A5', lineHeight: 1.2 }}>
                        @{usernameCheck.existingUser?.username || formData.username} já existe!
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px', lineHeight: 1.3 }}>
                        Pertence a <strong>{usernameCheck.existingUser?.name || 'outro participante'}</strong>. Escolha outro nome de usuário.
                      </div>
                    </div>
                  </div>
                )}

                {fieldErrors.username && usernameCheck.status !== 'taken' && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                    {fieldErrors.username}
                  </div>
                )}
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
                        className="login-input" 
                        style={fieldErrors.customCourse ? { borderColor: '#ef4444' } : {}}
                        required
                      />
                      {fieldErrors.customCourse && (
                        <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                          {fieldErrors.customCourse}
                        </div>
                      )}
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
                  className="login-input" 
                  style={fieldErrors.email ? { borderColor: '#ef4444' } : {}}
                  required
                />
                {fieldErrors.email && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>WhatsApp / Telefone (apenas números)</label>
                <input 
                  name="phone" type="tel" placeholder="(34) 99999-9999"
                  value={formData.phone} onChange={handleChange}
                  onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)}
                  className="login-input" 
                  style={fieldErrors.phone ? { borderColor: '#ef4444' } : {}}
                  required
                />
                {fieldErrors.phone && (
                  <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                    {fieldErrors.phone}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      ref={passwordInputRef}
                      name="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={formData.password} onChange={handleChange}
                      onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)}
                      className="login-input" 
                      style={fieldErrors.password ? { paddingRight: '40px', borderColor: '#ef4444' } : { paddingRight: '40px' }} 
                      required
                    />
                    <button
                      type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleTogglePassword}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                      {fieldErrors.password}
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>Confirmar Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      ref={confirmPasswordInputRef}
                      name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={formData.confirmPassword} onChange={handleChange}
                      onFocus={() => setFocusedInput('confirmPassword')} onBlur={() => setFocusedInput(null)}
                      className="login-input" 
                      style={fieldErrors.confirmPassword ? { paddingRight: '40px', borderColor: '#ef4444' } : { paddingRight: '40px' }} 
                      required
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '4px', marginLeft: '4px' }}>
                      {fieldErrors.confirmPassword}
                    </div>
                  )}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px' }}>GitHub (Opcional)</label>
                <input 
                  name="github" type="text" placeholder="github.com/seu-usuario ou @seu-usuario"
                  value={formData.github} onChange={handleChange}
                  onFocus={() => setFocusedInput('github')} onBlur={() => setFocusedInput(null)}
                  className="login-input"
                />
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
                  Concordo com a coleta dos meus dados conforme os{' '}
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} 
                    style={{ background: 'none', border: 'none', color: '#00d2ff', textDecoration: 'underline', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Termos de Uso
                  </button>{' '}
                  e a{' '}
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} 
                    style={{ background: 'none', border: 'none', color: '#10b981', textDecoration: 'underline', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Política de Privacidade (LGPD)
                  </button>{' '}
                  da FACOM Tech Week.
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

      {/* Modal Interativo de Termos de Uso e LGPD */}
      {showTermsModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            overflowY: 'auto',
            padding: '20px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '880px' }}>
            <button
              onClick={() => setShowTermsModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <Terms isModal={true} onClose={() => setShowTermsModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

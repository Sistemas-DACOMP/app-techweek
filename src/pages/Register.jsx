import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import AvatarCropperModal from '../components/AvatarCropperModal';
import Terms from './Terms';
import { Eye, EyeOff, Loader2, Camera, Trash2, ChevronLeft, ArrowRight, Check, User } from 'lucide-react';
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
  passwordsMatch,
  normalizeGithub,
  isValidGithub
} from '../lib/validators';
import { verifySymplaTicket } from '../lib/sympla';
import '../styles/entrada.css';

const SOCIAL_PREFIX_RE = {
  linkedin: /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i,
  instagram: /^((https?:\/\/)?(www\.)?instagram\.com\/|@)/i,
  github: /^((https?:\/\/)?(www\.)?github\.com\/|@)/i
};

// Só visual (check verde no campo): não bloqueia o cadastro. GitHub usa a regra real (KAN-96).
const SOCIAL_LOOKS_OK = {
  linkedin: (v) => /^[A-Za-z0-9\-_%]{3,100}\/?$/.test(v),
  instagram: (v) => /^[A-Za-z0-9._]{1,30}$/.test(v),
  github: (v) => isValidGithub(normalizeGithub(v))
};

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
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken'
    message: ''
  });
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  // Troca de etapa começa do topo da tela
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    // Redireciona apenas se o usuário já abrir a tela autenticado
    if (auth.currentUser && !loading) {
      const hasOnboarding = localStorage.getItem('facom_onboarding_completed') === 'true';
      navigate(hasOnboarding ? '/' : '/onboarding', { replace: true });
    }
  }, []);

  // Verificação em tempo real de unicidade de username (chave única) com debounce
  useEffect(() => {
    const cleanUsername = formData.username ? formData.username.trim().replace(/^@/, '').toLowerCase() : '';

    if (!cleanUsername || !isValidUsername(cleanUsername)) {
      setUsernameCheck({ status: 'idle', message: '' });
      return;
    }

    setUsernameCheck({ status: 'checking', message: 'Verificando disponibilidade...' });

    const timer = setTimeout(async () => {
      try {
        const existing = await findUserByUsername(cleanUsername);
        setUsernameCheck(existing
          ? { status: 'taken', message: `O @${cleanUsername} já está em uso por outro participante.` }
          : { status: 'available', message: `@${cleanUsername} está disponível!` });
      } catch (_e) {
        setUsernameCheck({ status: 'idle', message: '' });
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

    // Campo de rede tem prefixo fixo na tela: quem colar a URL inteira fica só com o usuário
    if (name in SOCIAL_PREFIX_RE) {
      newVal = value.trim().replace(SOCIAL_PREFIX_RE[name], '');
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
      setFieldErrors(prev => ({ ...prev, username: usernameCheck.message }));
      setError('Esse nome de usuário já está em uso. Escolha outro.');
      return;
    }

    // Revalida no banco antes de avançar, caso o debounce ainda não tenha resolvido
    setLoading(true);
    const cleanUsername = formData.username.trim().replace(/^@/, '').toLowerCase();
    const existing = await findUserByUsername(cleanUsername).catch(() => null);
    setLoading(false);
    if (existing) {
      setUsernameCheck({ status: 'taken', message: `O @${cleanUsername} já está em uso por outro participante.` });
      setFieldErrors(prev => ({ ...prev, username: `O @${cleanUsername} já está em uso.` }));
      setError('Esse nome de usuário já está em uso. Escolha outro.');
      return;
    }

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

    const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
    const finalCourse = isStudent 
      ? (formData.course === 'Outro (especificar)' ? formData.customCourse.trim() : formData.course)
      : '';
    
    setLoading(true);

    const cleanUsername = formData.username.trim().replace(/^@/, '').toLowerCase();
    const existingUsername = await findUserByUsername(cleanUsername).catch(() => null);
    if (existingUsername) {
      setError(`O nome de usuário '@${cleanUsername}' já foi registrado por outro participante. Por favor, escolha outro.`);
      setStep(1);
      setUsernameCheck({ status: 'taken', message: `O @${cleanUsername} já está em uso por outro participante.` });
      setLoading(false);
      return;
    }

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

  const isStudent = formData.participantType === 'Aluno da UFU' || formData.participantType === 'Aluno de outra instituição';
  const cleanUsernameView = formData.username.trim().replace(/^@/, '').toLowerCase();
  const usernameError = fieldErrors.username || (usernameCheck.status === 'taken' ? usernameCheck.message : '');
  const strengthTone = passwordStrength.score >= 3 ? 'var(--ok)' : passwordStrength.score === 2 ? 'var(--warn)' : 'var(--err)';
  const socialOk = (name) => Boolean(formData[name]) && SOCIAL_LOOKS_OK[name](formData[name]);

  return (
    <div ref={scrollRef} className={`${isStep2 ? 'ent-bg-form-2' : 'ent-bg-form'} relative flex h-full w-full flex-col overflow-x-hidden overflow-y-auto text-text`}>
      <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-3 pt-2.5">
        {isStep2 ? (
          <button type="button" onClick={() => setStep(1)} aria-label="Voltar para a etapa 1" className="flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent text-text">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        ) : (
          <Link to="/login" aria-label="Voltar para o login" className="flex size-11 items-center justify-center text-text">
            <ChevronLeft size={22} aria-hidden="true" />
          </Link>
        )}
        <div className="text-center text-[13px] font-bold text-text-2">Etapa {step} de 2</div>
        <span />
      </header>
      <div className="mx-5 mt-2 grid shrink-0 grid-cols-2 gap-1.5" aria-hidden="true">
        <span className="h-[5px] rounded-[3px] bg-[linear-gradient(90deg,#2563EB,#7C3AED)]" />
        <span className={`h-[5px] rounded-[3px] ${isStep2 ? 'bg-[linear-gradient(90deg,#5B3BE0,#7C3AED)]' : 'bg-surface-raised'}`} />
      </div>

      <form onSubmit={step === 1 ? handleNextStep : handleRegister} className="flex flex-1 flex-col" noValidate>
        {step === 1 && (
          <>
            <div className="mx-5 mt-[22px] flex items-center gap-3">
              <div className="flex-1">
                <h1 className="text-2xl leading-[1.2] font-extrabold">Vamos montar<br /><span className="ent-grad-text">o seu crachá</span></h1>
                <p className="mt-1.5 text-sm text-text-2">Leva menos de 2 minutos.</p>
              </div>
              <div aria-hidden="true">
                <Mascot
                  color="blue"
                  className="ent-still"
                  style={{ width: 84, height: 84 }}
                  isCoveringEyes={isCoveringEyes}
                  isPeeking={isPeeking}
                  lookOffset={lookOffset}
                  lookOffsetY={lookOffsetY}
                />
              </div>
            </div>

            <div className="mx-5 mt-[22px] flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex min-w-0 flex-col">
                  <label htmlFor="reg-nome" className="field-label">Nome</label>
                  <input
                    id="reg-nome" name="firstName" type="text" autoComplete="given-name"
                    value={formData.firstName} onChange={handleChange}
                    onFocus={() => setFocusedInput('firstName')} onBlur={() => setFocusedInput(null)}
                    className="field ent-field"
                    aria-invalid={fieldErrors.firstName ? 'true' : undefined}
                    aria-describedby={fieldErrors.firstName ? 'reg-nome-err' : undefined}
                    required
                  />
                  {fieldErrors.firstName && <p id="reg-nome-err" className="field-error">{fieldErrors.firstName}</p>}
                </div>
                <div className="flex min-w-0 flex-col">
                  <label htmlFor="reg-sobrenome" className="field-label">Sobrenome</label>
                  <input
                    id="reg-sobrenome" name="lastName" type="text" autoComplete="family-name"
                    value={formData.lastName} onChange={handleChange}
                    onFocus={() => setFocusedInput('lastName')} onBlur={() => setFocusedInput(null)}
                    className="field ent-field"
                    aria-invalid={fieldErrors.lastName ? 'true' : undefined}
                    aria-describedby={fieldErrors.lastName ? 'reg-sobrenome-err' : undefined}
                    required
                  />
                  {fieldErrors.lastName && <p id="reg-sobrenome-err" className="field-error">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="reg-user" className="field-label">Nome de usuário</label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-text-3" aria-hidden="true">@</span>
                  <input
                    id="reg-user" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    placeholder="seu.usuario"
                    value={formData.username} onChange={handleChange}
                    onFocus={() => setFocusedInput('username')} onBlur={() => setFocusedInput(null)}
                    className="field ent-field ent-field-at"
                    data-ok={!usernameError && usernameCheck.status === 'available' ? 'true' : undefined}
                    aria-invalid={usernameError ? 'true' : undefined}
                    aria-describedby="reg-user-status"
                    required
                  />
                </div>
                <div id="reg-user-status" aria-live="polite">
                  {usernameError ? (
                    <p className="field-error">{usernameError}</p>
                  ) : usernameCheck.status === 'available' ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                      <Check size={14} strokeWidth={2.8} aria-hidden="true" />@{cleanUsernameView} está disponível
                    </p>
                  ) : usernameCheck.status === 'checking' ? (
                    <p className="mt-1.5 text-[13px] text-text-3">Verificando…</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="reg-perfil" className="field-label">Você vem como</label>
                <select
                  id="reg-perfil" name="participantType"
                  value={formData.participantType} onChange={handleChange}
                  onFocus={() => setFocusedInput('participantType')} onBlur={() => setFocusedInput(null)}
                  className="field ent-field font-semibold" required
                >
                  <option value="" disabled>Selecione uma opção</option>
                  <option value="Aluno da UFU">Aluno da UFU</option>
                  <option value="Aluno de outra instituição">Aluno de outra instituição</option>
                  <option value="Servidor / Professor">Servidor ou professor</option>
                  <option value="Comunidade Externa">Comunidade externa</option>
                </select>
              </div>

              {isStudent && (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2.5">
                    <div className="flex min-w-0 flex-col">
                      <label htmlFor="reg-curso" className="field-label">Curso</label>
                      <select
                        id="reg-curso" name="course"
                        value={formData.course} onChange={handleChange}
                        onFocus={() => setFocusedInput('course')} onBlur={() => setFocusedInput(null)}
                        className="field ent-field ent-field-sm" required
                      >
                        <option value="" disabled>Selecione seu curso</option>
                        {UFU_COURSES.map(courseName => (
                          <option key={courseName} value={courseName}>{courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="reg-periodo" className="field-label">Período</label>
                      <input
                        id="reg-periodo" name="period" type="number" inputMode="numeric" placeholder="3" min="1" max="20"
                        value={formData.period} onChange={handleChange}
                        onFocus={() => setFocusedInput('period')} onBlur={() => setFocusedInput(null)}
                        className="field ent-field" required
                      />
                    </div>
                  </div>

                  {formData.course === 'Outro (especificar)' && (
                    <div className="flex flex-col">
                      <label htmlFor="reg-curso-outro" className="field-label">Qual é o seu curso?</label>
                      <input
                        id="reg-curso-outro" name="customCourse" type="text" placeholder="Nome completo do curso"
                        value={formData.customCourse} onChange={handleChange}
                        onFocus={() => setFocusedInput('customCourse')} onBlur={() => setFocusedInput(null)}
                        className="field ent-field"
                        aria-invalid={fieldErrors.customCourse ? 'true' : undefined}
                        aria-describedby={fieldErrors.customCourse ? 'reg-curso-outro-err' : undefined}
                        required
                      />
                      {fieldErrors.customCourse && <p id="reg-curso-outro-err" className="field-error">{fieldErrors.customCourse}</p>}
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col">
                <label htmlFor="reg-email" className="field-label">E-mail</label>
                <input
                  id="reg-email" name="email" type="email" autoComplete="email" placeholder="seu.email@exemplo.com"
                  value={formData.email} onChange={handleChange}
                  onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)}
                  className="field ent-field"
                  aria-invalid={fieldErrors.email ? 'true' : undefined}
                  aria-describedby="reg-email-hint"
                  required
                />
                {fieldErrors.email
                  ? <p id="reg-email-hint" className="field-error">{fieldErrors.email}</p>
                  : <p id="reg-email-hint" className="mt-1.5 text-[13px] text-text-2">Use o mesmo e-mail do seu ingresso Sympla.</p>}
              </div>

              <div className="flex flex-col">
                <label htmlFor="reg-tel" className="field-label">WhatsApp</label>
                <input
                  id="reg-tel" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(34) 99999-9999"
                  value={formData.phone} onChange={handleChange}
                  onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)}
                  className="field ent-field"
                  aria-invalid={fieldErrors.phone ? 'true' : undefined}
                  aria-describedby={fieldErrors.phone ? 'reg-tel-err' : undefined}
                  required
                />
                {fieldErrors.phone && <p id="reg-tel-err" className="field-error">{fieldErrors.phone}</p>}
              </div>

              <div className="flex flex-col">
                <label htmlFor="reg-senha" className="field-label">Senha</label>
                <div className="relative">
                  <input
                    id="reg-senha" ref={passwordInputRef}
                    name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                    value={formData.password} onChange={handleChange}
                    onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)}
                    className="field ent-field ent-field-pw"
                    aria-invalid={fieldErrors.password ? 'true' : undefined}
                    aria-describedby="reg-senha-forca"
                    required
                  />
                  <button
                    type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleTogglePassword}
                    className="absolute top-[5px] right-[5px] flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-text-2"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                  </button>
                </div>
                <div id="reg-senha-forca">
                  {fieldErrors.password ? (
                    <p className="field-error">{fieldErrors.password}</p>
                  ) : formData.password ? (
                    <p className="mt-2 flex items-center gap-2 text-[13px] text-text-2">
                      <span className="grid grid-cols-[repeat(4,22px)] gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((n) => (
                          <span key={n} className="h-1 rounded-sm" style={{ background: n <= Math.max(passwordStrength.score, 1) ? strengthTone : 'var(--surface-raised)' }} />
                        ))}
                      </span>
                      Senha {passwordStrength.label.toLowerCase()}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="reg-senha2" className="field-label">Confirmar senha</label>
                <input
                  id="reg-senha2" ref={confirmPasswordInputRef}
                  name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                  value={formData.confirmPassword} onChange={handleChange}
                  onFocus={() => setFocusedInput('confirmPassword')} onBlur={() => setFocusedInput(null)}
                  className="field ent-field"
                  aria-invalid={fieldErrors.confirmPassword ? 'true' : undefined}
                  aria-describedby={fieldErrors.confirmPassword ? 'reg-senha2-err' : undefined}
                  required
                />
                {fieldErrors.confirmPassword && <p id="reg-senha2-err" className="field-error">{fieldErrors.confirmPassword}</p>}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mx-6 mt-6 text-center">
              <h1 className="text-[25px] leading-[1.2] font-extrabold">Como você quer<br />ser <span className="ent-grad-text-social">encontrado?</span></h1>
              <p className="mt-2 text-sm leading-normal text-text-2">Sua foto e suas redes aparecem para quem escanear o seu crachá.</p>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

            {/* Órbita: foto no centro, redes em volta (acendem quando preenchidas) */}
            <div className="relative mx-auto mt-[18px] h-[230px] w-[280px] shrink-0">
              <svg aria-hidden="true" width="280" height="230" viewBox="0 0 280 230" className="absolute top-0 left-0">
                <defs>
                  <linearGradient id="reg-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2563EB" /><stop offset="1" stopColor="#E1306C" /></linearGradient>
                </defs>
                <circle cx="140" cy="115" r="98" fill="none" stroke="#2A3460" strokeWidth="1.5" strokeDasharray="4 6" />
                <circle cx="140" cy="115" r="98" fill="none" stroke="url(#reg-arc)" strokeWidth="2.5" strokeDasharray="120 500" strokeLinecap="round" transform="rotate(200 140 115)" />
              </svg>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={avatarPreview ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
                className="press absolute top-[51px] left-[76px] size-32 cursor-pointer rounded-full border-0 bg-[linear-gradient(135deg,#2563EB,#7C3AED)] p-1 shadow-[0_14px_36px_rgba(91,59,224,0.45)]"
              >
                {/* Moldura com overflow hidden só para a foto; o selo da câmera fica fora dela (KAN-103) */}
                <span className="flex size-full items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#8F7BFF] bg-surface-raised text-you-text">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" className="size-full object-cover" />
                    : <User size={56} strokeWidth={1.6} aria-hidden="true" />}
                </span>
                <span className="absolute right-0.5 bottom-1.5 flex size-[38px] items-center justify-center rounded-full border-[3px] border-bg bg-white text-[#3730A3]">
                  <Camera size={18} strokeWidth={2.2} aria-hidden="true" />
                </span>
              </button>
              <SocialBubble className="top-[26px] left-[28px]" filled={!!formData.linkedin} ok={socialOk('linkedin')} ring="#0A66C2"><LinkedInLogo size={26} /></SocialBubble>
              <SocialBubble className="top-[26px] left-[200px]" filled={!!formData.instagram} ok={socialOk('instagram')} ring="#E1306C"><InstagramLogo size={26} /></SocialBubble>
              <SocialBubble className="top-[148px] left-[218px]" filled={!!formData.github} ok={socialOk('github')} ring="#EEF1FA"><GithubLogo size={26} /></SocialBubble>
            </div>

            <div className="mt-1 flex justify-center gap-2">
              {!avatarPreview ? (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-[22px] border-[1.5px] border-[#8F7BFF] bg-[rgba(124,58,237,0.16)] px-[18px] text-sm font-extrabold text-text">
                  <Camera size={18} className="text-[#C4B5FD]" aria-hidden="true" /> Adicionar foto de perfil
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-[22px] border-[1.5px] border-[#8F7BFF] bg-[rgba(124,58,237,0.16)] px-[18px] text-sm font-extrabold text-text">
                    <Camera size={18} className="text-[#C4B5FD]" aria-hidden="true" /> Trocar foto
                  </button>
                  <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-[22px] border-0 bg-[rgba(245,154,154,0.1)] px-4 text-sm font-bold text-err">
                    <Trash2 size={16} aria-hidden="true" /> Remover
                  </button>
                </>
              )}
            </div>
            <p className="mt-1.5 text-center text-xs text-text-3">Opcional · PNG, JPG ou WebP até 2 MB</p>

            <div className="mx-5 mt-[18px] flex flex-col gap-3.5">
              <SocialField id="reg-li" name="linkedin" label="LinkedIn" prefix="linkedin.com/in/" placeholder="seu-perfil" brand="#0A66C2" value={formData.linkedin} ok={socialOk('linkedin')} onChange={handleChange} logo={<LinkedInLogo />} />
              <SocialField id="reg-ig" name="instagram" label="Instagram" prefix="@" placeholder="seu.usuario" brand="#E1306C" value={formData.instagram} ok={socialOk('instagram')} onChange={handleChange} logo={<InstagramLogo />} />
              <SocialField id="reg-gh" name="github" label="GitHub" prefix="github.com/" placeholder="usuario" brand="#8FA0FF" value={formData.github} ok={socialOk('github')} onChange={handleChange} logo={<GithubLogo />} />
            </div>

            <div className="mx-5 mt-5 flex items-start gap-3 text-[13px] leading-normal text-[#C3C9DE]">
              <input
                id="terms" name="termsAccepted" type="checkbox"
                checked={formData.termsAccepted} onChange={handleChange}
                className="m-0 mt-px size-[22px] shrink-0 cursor-pointer accent-[#5B3BE0]"
                required
              />
              <label htmlFor="terms" className="cursor-pointer">
                Li e concordo com os{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="cursor-pointer border-0 bg-transparent p-0 font-bold text-link underline">
                  Termos de Uso
                </button>{' '}e a{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="cursor-pointer border-0 bg-transparent p-0 font-bold text-link underline">
                  Política de Privacidade (LGPD)
                </button>.
              </label>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mx-5 mt-4 rounded-xl bg-[rgba(245,154,154,0.1)] px-3.5 py-2.5 text-[13px] font-semibold text-err">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 z-20 mt-auto bg-[linear-gradient(180deg,rgba(10,15,36,0),#0A0F24_30%)] px-5 pt-3.5 pb-[26px]">
          <button type="submit" className="btn btn-primary btn-block ent-btn-lg ent-cta" disabled={loading}>
            {loading
              ? <><Loader2 className="animate-spin" size={20} aria-hidden="true" /> {step === 1 ? 'Verificando' : 'Criando seu crachá'}</>
              : step === 1
                ? <>Continuar <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" /></>
                : 'Criar meu crachá'}
          </button>
        </div>
      </form>

      {/* Modal Interativo de Corte de Foto */}
      {rawImageForCrop && (
        <AvatarCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}

      {/* Termos de Uso e LGPD */}
      {showTermsModal && (
        <div
          role="dialog" aria-modal="true" aria-label="Termos de Uso e Política de Privacidade"
          className="fixed inset-0 z-[9999] overflow-y-auto bg-[rgba(5,8,20,0.85)]"
          onKeyDown={(e) => e.key === 'Escape' && setShowTermsModal(false)}
        >
          <Terms isModal={true} onClose={() => setShowTermsModal(false)} />
        </div>
      )}
    </div>
  );
}

function SocialField({ id, name, label, prefix, placeholder, brand, value, ok, onChange, logo }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="ent-social" style={{ '--ent-brand': brand, '--ent-brand-halo': `${brand}2E`, ...(ok ? { borderColor: 'rgba(111,216,166,0.35)' } : null) }}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0D1430]" aria-hidden="true">{logo}</span>
        <span className="text-[15px] whitespace-nowrap text-text-4" aria-hidden="true">{prefix}</span>
        <input id={id} name={name} type="text" autoCapitalize="none" spellCheck={false} placeholder={placeholder} value={value} onChange={onChange} />
        {ok && (
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ok text-[#0A2A1C]" role="img" aria-label="válido">
            <Check size={13} strokeWidth={3.2} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

function SocialBubble({ className, filled, ok, ring, children }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute flex size-[52px] items-center justify-center rounded-full transition-opacity duration-200 ${className} ${filled ? 'bg-surface' : 'border-[1.5px] border-dashed border-[#3A4675] bg-[#0F1530] opacity-75'}`}
      style={filled ? { boxShadow: `0 0 0 2px ${ok ? 'var(--ok)' : ring}, 0 6px 18px rgba(0,0,0,0.4)` } : undefined}
    >
      {children}
      {ok && (
        <span className="absolute -right-1 -bottom-1 flex size-[22px] items-center justify-center rounded-full bg-ok text-[#0A2A1C]" style={{ animation: 'dsPop 300ms var(--spring) both' }}>
          <Check size={13} strokeWidth={3.2} />
        </span>
      )}
    </span>
  );
}

/* Logos reais das redes (marca registrada de cada uma; lucide não tem ícone de marca) */
function LinkedInLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <circle cx="7" cy="7.4" r="1.7" fill="#fff" />
      <rect x="5.5" y="9.8" width="3" height="8.4" rx="0.5" fill="#fff" />
      <path d="M10.6 9.8h2.7v1.2c.4-.7 1.3-1.4 2.7-1.4 2.6 0 3.1 1.6 3.1 3.8v4.8h-2.8v-4.2c0-1-.1-2.2-1.4-2.2s-1.6 1-1.6 2.1v4.3h-2.7z" fill="#fff" />
    </svg>
  );
}

function InstagramLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`ig-${size}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F58529" /><stop offset="0.5" stopColor="#DD2A7B" /><stop offset="1" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#ig-${size})`} />
      <rect x="5" y="5" width="14" height="14" rx="4.2" fill="none" stroke="#fff" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.9" />
      <circle cx="16.3" cy="7.7" r="1" fill="#fff" />
    </svg>
  );
}

function GithubLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#EEF1FA" />
      <g transform="translate(4 4)">
        <path fill="#0A0F24" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </g>
    </svg>
  );
}

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import Mascot from '../components/Mascot';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Check } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';
import { loginWithEmailAndPassword, sendPasswordReset } from '../lib/auth';
import { getUserProfile } from '../lib/userService';
import { useScrollLock } from '../hooks/useScrollLock';
import '../styles/entrada.css';

const RESEND_COOLDOWN_S = 45;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'email', 'password', or null
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef(null);

  const handleTogglePassword = () => {
    const input = passwordInputRef.current;
    const isInputActive = document.activeElement === input;
    const start = input ? input.selectionStart : null;
    const end = input ? input.selectionEnd : null;

    setShowPassword((prev) => !prev);

    requestAnimationFrame(() => {
      if (input) {
        if (isInputActive) {
          input.focus();
        }
        if (start !== null && end !== null) {
          input.setSelectionRange(start, end);
        }
      }
    });
  };

  // Estados da folha de Recuperação de Senha
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  useScrollLock(isResetModalOpen);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginWithEmailAndPassword(email, password);

    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }

    // Aquece o cache do perfil antes da transição de tela para eliminar qualquer atraso visual
    try {
      const uid = result.user?.uid || result.data?.user?.uid;
      if (uid) {
        await getUserProfile(uid);
      }
    } catch (_e) {}

    setLoading(false);
    localStorage.setItem('facom_logged_in', 'true');
    navigate('/');
  };

  const handlePasswordReset = async (e) => {
    e?.preventDefault();
    setResetErrorMessage('');
    setResetLoading(true);

    const result = await sendPasswordReset(resetEmail || email);
    setResetLoading(false);

    if (result.success) {
      setResetSuccessMessage(result.message);
      setResendIn(RESEND_COOLDOWN_S);
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

  useEffect(() => {
    if (!isResetModalOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeResetModal();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isResetModalOpen]);

  // Cálculo da posição dos olhos do Alan
  const lookOffset = focusedInput === 'email' ? -4 + (email.length * 0.8) : 0;
  const lookOffsetY = focusedInput === 'email' ? 6 : 0;

  // Alan cobre os olhos ao digitar senha
  const isCoveringEyes = focusedInput === 'password';
  // Alan espia se o campo de senha estiver em foco E a senha estiver visível
  const isPeeking = focusedInput === 'password' && showPassword;

  const sentTo = resetEmail || email;

  return (
    <div className="ent-bg-login relative flex h-full w-full flex-col overflow-x-hidden overflow-y-auto px-5 text-text">
      <div className="relative mx-auto mt-[172px] w-full max-w-[400px] shrink-0">
        {/* Alan (interativo) e Ada espiando por trás do cartão */}
        <div className="ent-float absolute -top-[68px] left-[10px]" aria-hidden="true">
          <Mascot
            color="blue"
            className="ent-still"
            style={{ width: 116, height: 116 }}
            isCoveringEyes={isCoveringEyes}
            isPeeking={isPeeking}
            lookOffset={lookOffset}
            lookOffsetY={lookOffsetY}
          />
        </div>
        <div className="absolute -top-[60px] right-[10px]" aria-hidden="true">
          <Mascot color="purple" className="ent-still" style={{ width: 108, height: 108 }} lookOffset={-7} lookOffsetY={4} />
        </div>

        <section className="relative rounded-[26px] border border-[#2A3460] bg-[linear-gradient(180deg,#151E40_0%,#111833_100%)] px-[22px] pt-[26px] pb-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <img src={logoTw} alt="FACOM Tech Week" className="mx-auto mt-1 block h-11 w-[168px] object-contain" />
          <h1 className="mt-3.5 text-center text-[25px] leading-[1.2] font-extrabold tracking-[-0.01em]">
            Boas-vindas à<br /><span className="ent-grad-text">Tech Week 2026</span>
          </h1>
          <p className="mt-2 text-center text-sm text-text-2">21–26 de outubro · FACOM · UFU</p>

          <form onSubmit={handleLogin} className="mt-[22px] flex flex-col gap-3" noValidate={false}>
            <div className="flex flex-col">
              <label htmlFor="login-email" className="field-label">E-mail</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                className="field ent-field"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                required
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="login-senha" className="field-label">Senha</label>
              <div className="relative">
                <input
                  id="login-senha"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  className="field ent-field ent-field-pw"
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleTogglePassword}
                  className="absolute top-[5px] right-[5px] flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-text-2"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <p id="login-error" role="alert" className="m-0 text-[13px] font-semibold text-err">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={openResetModal}
              className="-mt-1 flex h-10 cursor-pointer items-center self-end border-0 bg-transparent p-0 text-sm font-bold text-link"
            >
              Esqueci minha senha
            </button>

            <button type="submit" className="btn btn-primary btn-block ent-btn-lg ent-cta mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="animate-spin" size={20} aria-hidden="true" /> Entrando</>
              ) : (
                <>Entrar <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" /></>
              )}
            </button>
          </form>
        </section>
      </div>

      <p className="mt-auto shrink-0 pt-8 pb-[26px] text-center text-sm text-text-2">
        Primeira vez aqui? <Link to="/cadastro" className="font-extrabold text-link no-underline">Criar conta</Link>
      </p>

      {/* Folha de recuperação de senha (LoginSenha / LoginSenhaOk) */}
      {isResetModalOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="ds-scrim" onClick={closeResetModal} aria-hidden="true" />
          <div className="ds-sheet px-[22px] pb-7 text-text" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            {resetSuccessMessage ? (
              <div className="flex flex-col items-center pt-2 text-center" role="status">
                <span className="relative flex size-[72px] items-center justify-center rounded-[22px] bg-[rgba(61,80,230,0.2)] text-link">
                  <Mail size={34} strokeWidth={1.9} aria-hidden="true" />
                  <span className="absolute -right-1.5 -bottom-1.5 flex size-[30px] items-center justify-center rounded-full border-[3px] border-surface bg-[#10B981] text-white" style={{ animation: 'dsPop 400ms var(--spring) 150ms both' }}>
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  </span>
                </span>
                <h2 id="reset-title" className="mt-4 text-[22px] font-black">Link enviado!</h2>
                <p className="mt-1.5 text-[15px] leading-normal text-[#C3C9DE]">
                  Confira a caixa de entrada de <b className="text-text">{sentTo}</b>. Se não aparecer, olhe o spam.
                </p>
                <button type="button" onClick={closeResetModal} className="btn btn-primary btn-block mt-5 ent-btn-lg">
                  Voltar ao login
                </button>
                <div className="mt-3 flex w-full items-center justify-center text-sm">
                  {resendIn > 0 ? (
                    <span className="text-text-3">
                      Não chegou? Reenviar em <b className="text-[#C3C9DE]">0:{String(resendIn).padStart(2, '0')}</b>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={resetLoading}
                      className="flex min-h-11 cursor-pointer items-center border-0 bg-transparent font-bold text-link"
                    >
                      {resetLoading ? 'Reenviando…' : 'Não chegou? Reenviar link'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="mt-1 flex items-end gap-3">
                  <Mascot color="blue" className="ent-still" style={{ width: 72, height: 72, flexShrink: 0 }} isCoveringEyes />
                  <div className="pb-2">
                    <h2 id="reset-title" className="m-0 text-[22px] font-black">Esqueceu a senha?</h2>
                    <p className="mt-0.5 text-[13px] text-text-2">Acontece. O Alan nem olhou.</p>
                  </div>
                </div>
                <p className="mt-3.5 text-[15px] leading-normal text-[#C3C9DE]">
                  Mandamos um link para o seu e-mail para você criar uma senha nova.
                </p>
                <div className="mt-3.5 flex flex-col">
                  <label htmlFor="reset-email" className="field-label">E-mail da sua conta</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.email@exemplo.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="field ent-field"
                    aria-invalid={resetErrorMessage ? 'true' : undefined}
                    aria-describedby={resetErrorMessage ? 'reset-error' : undefined}
                    autoFocus
                    required
                  />
                  {resetErrorMessage && <p id="reset-error" role="alert" className="field-error">{resetErrorMessage}</p>}
                </div>
                <button type="submit" className="btn btn-primary btn-block mt-[18px] ent-btn-lg" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <Mail size={20} strokeWidth={1.9} aria-hidden="true" />}
                  {resetLoading ? 'Enviando' : 'Enviar link'}
                </button>
                <button type="button" onClick={closeResetModal} className="btn btn-block ent-btn-link mt-2">
                  Voltar para o login
                </button>
              </form>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

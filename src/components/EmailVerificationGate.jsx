import { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, LogOut, Loader2, Edit3, X } from 'lucide-react';
import Mascot from './Mascot';
import logoTw from '../assets/logo-tw.png';
import { useAuth } from '../contexts/AuthContext';
import { requestEmailCorrection, mapUpdateEmailError } from '../lib/auth';
import { isValidEmail } from '../lib/validators';
import '../styles/entrada.css';

const RESEND_COOLDOWN_S = 60;

/**
 * Valida o novo e-mail informado para correção no gate (KAN-116).
 */
export function validateEmailCorrection(newEmail, currentEmail) {
  const cleanEmail = (newEmail || '').trim().toLowerCase();
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return { valid: false, error: 'Por favor, insira um e-mail válido.' };
  }
  const cleanCurrent = (currentEmail || '').trim().toLowerCase();
  if (cleanEmail === cleanCurrent) {
    return { valid: false, error: 'O novo e-mail informado é idêntico ao atual.' };
  }
  return { valid: true, email: cleanEmail };
}

export default function EmailVerificationGate({
  onVerified,
  initialModalOpen = false,
  initialPendingEmail = null,
  initialFeedback = null
}) {
  const { user, reloadUser, resendVerification, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState(initialFeedback);

  // Estados do Modal de Correção de E-mail (KAN-116)
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [pendingNewEmail, setPendingNewEmail] = useState(initialPendingEmail);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [modalError, setModalError] = useState(null);

  const isCheckingRef = useRef(false);
  const isVerifiedRef = useRef(false);

  // Fecha o modal ao pressionar a tecla ESC
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !updatingEmail) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, updatingEmail]);

  // Temporizador para contagem regressiva de reenvio
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-detecção ao retornar para a aba (visibilitychange) ou focar na janela (focus)
  useEffect(() => {
    let active = true;

    const handleAutoCheck = async () => {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      if (isCheckingRef.current || isVerifiedRef.current) return;

      isCheckingRef.current = true;
      try {
        const refreshedUser = await reloadUser();
        if (!active) return;
        if (refreshedUser?.emailVerified) {
          isVerifiedRef.current = true;
          setFeedback({
            type: 'success',
            message: 'E-mail confirmado com sucesso! Redirecionando...'
          });
          setTimeout(() => {
            if (active && onVerified) onVerified();
          }, 800);
        }
      } catch (_err) {
        // Silencioso em caso de erro na checagem em background para não poluir a tela
      } finally {
        isCheckingRef.current = false;
      }
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleAutoCheck);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', handleAutoCheck);
    }

    return () => {
      active = false;
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleAutoCheck);
      }
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('focus', handleAutoCheck);
      }
    };
  }, [reloadUser, onVerified]);

  // Checagem manual clicando em "Já confirmei meu e-mail"
  const handleCheckVerification = async () => {
    if (isCheckingRef.current || isVerifiedRef.current) return;
    isCheckingRef.current = true;
    setChecking(true);
    setFeedback(null);
    try {
      const refreshedUser = await reloadUser();
      if (refreshedUser?.emailVerified) {
        isVerifiedRef.current = true;
        setFeedback({
          type: 'success',
          message: 'E-mail confirmado com sucesso! Redirecionando...'
        });
        setTimeout(() => {
          if (onVerified) onVerified();
        }, 800);
      } else {
        setFeedback({
          type: 'info',
          message: 'Seu e-mail ainda não consta como verificado. Clique no link que enviamos para sua caixa de entrada (ou pasta de spam) e tente novamente.'
        });
      }
    } catch (_err) {
      setFeedback({
        type: 'error',
        message: 'Erro ao verificar o status da conta. Verifique sua conexão e tente novamente.'
      });
    } finally {
      isCheckingRef.current = false;
      setChecking(false);
    }
  };

  const hasPasswordProvider =
    !user?.providerData ||
    user.providerData.length === 0 ||
    user.providerData.some((p) => p?.providerId === 'password');

  const handleOpenModal = () => {
    setNewEmailInput(pendingNewEmail || user?.email || '');
    setPasswordInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (updatingEmail) return;
    setIsModalOpen(false);
    setModalError(null);
    setPasswordInput('');
  };

  const handleUpdateEmailSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setModalError(null);

    const currentEmail = pendingNewEmail || user?.email || '';
    const validation = validateEmailCorrection(newEmailInput, currentEmail);
    if (!validation.valid) {
      setModalError(validation.error);
      return;
    }

    setUpdatingEmail(true);
    try {
      await requestEmailCorrection(user, validation.email, passwordInput);
      setPendingNewEmail(validation.email);
      setIsModalOpen(false);
      setPasswordInput('');
      setCooldown(RESEND_COOLDOWN_S);
      setFeedback({
        type: 'success',
        message: `Enviamos um novo link de confirmação para ${validation.email}! Verifique sua caixa de entrada e spam.`
      });
    } catch (err) {
      console.error('[EmailVerificationGate] Erro ao corrigir e-mail:', err);
      setModalError(mapUpdateEmailError(err));
    } finally {
      setUpdatingEmail(false);
    }
  };

  // Reenvio do e-mail de verificação com cooldown
  const handleResendEmail = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setFeedback(null);
    try {
      if (pendingNewEmail) {
        await requestEmailCorrection(user, pendingNewEmail);
        setCooldown(RESEND_COOLDOWN_S);
        setFeedback({
          type: 'success',
          message: `Novo link de confirmação reenviado para ${pendingNewEmail}! Verifique sua caixa de entrada e spam.`
        });
      } else {
        const result = await resendVerification();
        if (result.success) {
          setCooldown(RESEND_COOLDOWN_S);
          setFeedback({
            type: 'success',
            message: result.message || 'E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada e spam.'
          });
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Não foi possível reenviar o e-mail no momento. Aguarde alguns instantes.'
          });
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: mapUpdateEmailError(err) || 'Falha ao reenviar e-mail de confirmação.'
      });
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const emailDisplay = pendingNewEmail || user?.email || 'seu e-mail cadastrado';

  return (
    <div className="ent-bg-login relative flex h-full w-full flex-col overflow-x-hidden overflow-y-auto px-5 text-text">
      <div className="relative mx-auto my-auto w-full max-w-[420px] shrink-0 py-8">
        {/* Alan e Ada espiando no topo */}
        <div className="ent-float absolute -top-[36px] left-[18px]" aria-hidden="true">
          <Mascot
            color="blue"
            isWaving
            className="ent-still"
            style={{ width: 110, height: 110 }}
          />
        </div>
        <div className="absolute -top-[28px] right-[18px]" aria-hidden="true">
          <Mascot
            color="purple"
            className="ent-still"
            style={{ width: 95, height: 95 }}
            lookOffset={-6}
            lookOffsetY={4}
          />
        </div>

        <section className="relative rounded-[26px] border border-[#2A3460] bg-[linear-gradient(180deg,#151E40_0%,#111833_100%)] px-[22px] pt-[26px] pb-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <img
            src={logoTw}
            alt="FACOM Tech Week"
            className="mx-auto mt-1 block h-10 w-[150px] object-contain"
          />

          <div className="mx-auto mt-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-[0_0_20px_rgba(91,124,255,0.2)]">
            <Mail className="size-7 animate-pulse text-[#7B96FF]" />
          </div>

          <h1 className="mt-3.5 text-center text-[23px] font-extrabold leading-[1.2] tracking-[-0.01em]">
            Confirme seu <span className="ent-grad-text">e-mail</span>
          </h1>

          <p className="mt-2 text-center text-sm text-text-2">
            Enviamos um link de confirmação oficial para:
          </p>

          <div className="mt-2.5 rounded-xl border border-[#2E3878] bg-[#0E152E]/90 px-3.5 py-2.5 text-center text-sm font-semibold text-primary break-all">
            {emailDisplay}
          </div>

          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 text-xs text-[#7B96FF] hover:text-[#9bb1ff] transition-colors focus:outline-none"
            >
              <Edit3 className="size-3.5" />
              <span>Digitou o e-mail errado? <strong>Alterar e-mail</strong></span>
            </button>
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-text-2">
            Para sua segurança e acesso completo às credenciais e atividades do evento, abra a mensagem e clique no link de validação.
          </p>

          <div className="mt-2 rounded-lg bg-[#2E3878]/30 px-3 py-2 text-center text-[11px] text-[#A6B2D4]">
            💡 Não encontrou? Verifique sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
          </div>

          {/* Feedback dinâmico */}
          {feedback && (
            <div
              role="alert"
              className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-all ${
                feedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  : 'border-blue-500/40 bg-blue-500/15 text-blue-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Ações */}
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={checking}
              className="ent-btn-submit flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {checking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  <span>Já confirmei meu e-mail</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendEmail}
              disabled={cooldown > 0 || resending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#2E3878] bg-[#1A234A]/80 text-xs font-semibold text-text-1 hover:bg-[#232F63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Reenviando e-mail...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Reenviar em {cooldown}s</span>
              ) : (
                <>
                  <Mail className="size-3.5 text-primary" />
                  <span>Reenviar e-mail de confirmação</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex items-center justify-center gap-1.5 py-2 text-center text-xs font-medium text-text-2 hover:text-rose-300 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Sair / Entrar com outra conta</span>
            </button>
          </div>
        </section>
      </div>

      {/* Modal de Correção de E-mail (KAN-116) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-email-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-[400px] rounded-2xl border border-[#2A3460] bg-[linear-gradient(180deg,#151E40_0%,#111833_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-[#7B96FF] border border-primary/30">
                  <Edit3 className="size-4" />
                </div>
                <h2 id="modal-edit-email-title" className="text-base font-bold text-white">
                  Corrigir endereço de e-mail
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={updatingEmail}
                className="text-text-3 hover:text-white p-1 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-text-2">
              Informe o e-mail correto para onde devemos enviar o link de confirmação.
            </p>

            {modalError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-2.5 text-xs text-rose-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateEmailSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="gate-new-email" className="block text-[11px] font-bold uppercase tracking-wider text-text-2 mb-1">
                  Novo e-mail
                </label>
                <input
                  id="gate-new-email"
                  type="email"
                  required
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="seu-email-correto@exemplo.com"
                  disabled={updatingEmail}
                  autoFocus
                  className="w-full h-11 px-3.5 rounded-xl border border-[#2E3878] bg-[#0E152E] text-sm text-text placeholder:text-[#5B6B9E] focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              {hasPasswordProvider && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="gate-password" className="block text-[11px] font-bold uppercase tracking-wider text-text-2">
                      Sua senha atual
                    </label>
                    <span className="text-[10px] text-text-3">(caso solicitada)</span>
                  </div>
                  <input
                    id="gate-password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite sua senha"
                    disabled={updatingEmail}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#2E3878] bg-[#0E152E] text-sm text-text placeholder:text-[#5B6B9E] focus:border-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={updatingEmail}
                  className="ent-btn-submit flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {updatingEmail ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Enviando confirmação...</span>
                    </>
                  ) : (
                    <span>Enviar confirmação para o novo e-mail</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={updatingEmail}
                  className="flex h-10 w-full items-center justify-center rounded-xl border border-[#2E3878]/60 bg-[#1A234A]/40 text-xs font-semibold text-text-2 hover:bg-[#1A234A] hover:text-text-1 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

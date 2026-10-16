import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, GraduationCap, Sparkles, Trophy, ExternalLink, Check, X, Lock } from 'lucide-react';
import { SYMPLA_EVENT_URL, verifySymplaTicket } from '../lib/sympla';
import { updateUserProfile } from '../lib/userService';
import { auth } from '../lib/firebase';

// Acima do painel da atividade (z 2000/2001) para o aviso aparecer na frente dele (KAN-112)
export const SYMPLA_SHEET_Z = 2200;

const BENEFITS = [
  {
    title: 'Workshops',
    subtitle: 'Vagas exclusivas',
    Icon: GraduationCap,
    badgeColor: 'text-[#67D4E8] bg-[#67D4E8]/10 border-[#67D4E8]/25',
  },
  {
    title: 'Missões',
    subtitle: 'Desafios & prêmios',
    Icon: Sparkles,
    badgeColor: 'text-[#B9A6F5] bg-[#B9A6F5]/10 border-[#B9A6F5]/25',
  },
  {
    title: 'Ranking',
    subtitle: 'Pontuação oficial',
    Icon: Trophy,
    badgeColor: 'text-gold bg-amber-500/10 border-amber-500/25',
  },
];

/**
 * Bottom sheet "Desbloquear Passaporte Completo" (SymplaRequirementModal).
 * Alinhado ao Design System TechWeek: dourado + roxo, benefícios reais
 * (Workshops, Missões, Ranking) e fluxo priorizado para vínculo rápido.
 */
export default function SymplaRequirementModal({ isOpen, onClose, onLinked, featureName }) {
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(
    <LinkTicketSheet onClose={onClose} onLinked={onLinked} featureName={featureName} />,
    document.body
  );
}

function LinkTicketSheet({ onClose, onLinked, featureName }) {
  const [email, setEmail] = useState(() => auth?.currentUser?.email || '');
  const [state, setState] = useState('idle'); // idle | loading | error | done
  const [message, setMessage] = useState('');
  const [keyboardStyle, setKeyboardStyle] = useState({});
  const sheetRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const updateViewport = () => {
      if (!vv) return;
      const keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (keyboardInset > 40) {
        setKeyboardStyle({
          bottom: `${keyboardInset}px`,
          maxHeight: `${Math.max(240, Math.round(vv.height - 12))}px`,
        });
      } else {
        setKeyboardStyle({});
      }
    };

    if (vv) {
      updateViewport();
      vv.addEventListener('resize', updateViewport);
      vv.addEventListener('scroll', updateViewport);
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      if (vv) {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      }
    };
  }, [onClose]);

  const handleInputFocus = (e) => {
    const target = e.currentTarget;
    setTimeout(() => {
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setState('error');
      setMessage('Digite o e-mail que você usou para comprar o ingresso.');
      return;
    }
    setState('loading');
    setMessage('');
    try {
      const res = await verifySymplaTicket({ email: cleanEmail });
      const p = res?.participant || res?.ticket;
      if (res?.verified && (res.symplaTicket || p)) {
        const ticketObj = res.symplaTicket || {
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber,
          orderId: p.orderId,
        };
        const uid = auth?.currentUser?.uid;
        if (uid) {
          try {
            await updateUserProfile(uid, { symplaTicket: ticketObj, hasSymplaTicket: true });
          } catch (updateErr) {
            console.warn('[Sympla] Atualização client-side secundária (já salvo pelo backend):', updateErr);
          }
        }
        setState('done');
      } else {
        setState('error');
        setMessage(res?.message || 'Não achamos ingresso com esse e-mail. Confira se é o mesmo da compra no Sympla.');
      }
    } catch {
      setState('error');
      setMessage('Não conseguimos falar com o Sympla agora. Tente de novo em instantes.');
    }
  };

  const finish = () => {
    onClose();
    if (onLinked) onLinked();
    else window.location.reload();
  };

  return (
    <>
      <div className="ds-scrim" style={{ zIndex: SYMPLA_SHEET_Z }} aria-hidden="true" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sympla-sheet-title"
        className="fixed inset-x-0 bottom-0 z-[2201] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border-t border-amber-500/25 bg-[#0C1024] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(245,158,11,0.08),transparent_70%)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 text-text shadow-[0_-16px_48px_rgba(0,0,0,0.75)] animate-[dsSheetUp_250ms_var(--ease-out)] max-h-[92dvh] overflow-y-auto overscroll-contain transition-[bottom,max-height] duration-150"
        style={keyboardStyle}
      >

        {/* Alça superior nativa de bottom sheet do App */}
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-3.5 flex size-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-white/[0.08] hover:text-text active:scale-95"
        >
          <X size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>

        {state === 'done' ? (
          <div className="flex flex-col items-center py-6 text-center" role="status">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-ok text-[#0A2A1C] shadow-[0_0_24px_rgba(111,216,166,0.35)]"
              style={{ animation: 'dsPop 380ms var(--spring) both' }}
            >
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 id="sympla-sheet-title" className="m-0 mt-4 text-[21px] font-extrabold text-text">
              Ingresso vinculado
            </h2>
            <p className="m-0 mt-1 max-w-[280px] text-sm text-text-2">
              Passaporte Completo ativado. Workshops exclusivos, missões e ranking liberados!
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block mt-6 !min-h-[50px] !rounded-xl text-base font-extrabold"
              onClick={finish}
            >
              Continuar
            </button>
          </div>
        ) : (
          <>
            {/* Topo com Cadeado âmbar elegante substituindo o ícone de estrela */}
            <div className="flex items-start gap-3.5 pr-8">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-gold shadow-[0_0_16px_rgba(245,158,11,0.12)]">
                <Lock size={20} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="sympla-sheet-title" className="m-0 text-[19px] font-extrabold tracking-tight text-text sm:text-[21px]">
                  Passaporte Completo
                </h2>
                <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-text-2">
                  {featureName ? (
                    <>Necessário para liberar <span className="font-semibold text-text">{featureName}</span>.</>
                  ) : (
                    'Vincule seu ingresso Sympla para liberar atividades exclusivas e pontuação.'
                  )}
                </p>
              </div>
            </div>

            {/* Shelf horizontal unificado: elegante, sem caixas aninhadas nem bordas pesadas de template */}
            <div className="mt-3.5 grid grid-cols-3 divide-x divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-center">
              <div className="flex items-center justify-center gap-1.5 px-1">
                <GraduationCap size={14} strokeWidth={2.2} className="shrink-0 text-[#67D4E8]" aria-hidden="true" />
                <span className="truncate text-xs font-bold text-text">Workshops</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-1">
                <Sparkles size={14} strokeWidth={2.2} className="shrink-0 text-[#B9A6F5]" aria-hidden="true" />
                <span className="truncate text-xs font-bold text-text">Missões</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-1">
                <Trophy size={14} strokeWidth={2.2} className="shrink-0 text-gold" aria-hidden="true" />
                <span className="truncate text-xs font-bold text-text">Ranking</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4">
              <div>
                <label htmlFor="sympla-email" className="field-label text-xs font-bold text-text-2">
                  E-mail usado na compra do ingresso
                </label>
                <input
                  ref={inputRef}
                  id="sympla-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seu-email@exemplo.com"
                  className="field !min-h-[48px] !rounded-xl !bg-[#131B3A] !border-[#26305A] !px-4 text-[15px] text-text placeholder:text-text-4 focus:!border-amber-500/60 focus:!ring-2 focus:!ring-amber-500/20"
                  value={email}
                  onFocus={handleInputFocus}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === 'error') setState('idle');
                  }}
                  aria-invalid={state === 'error'}
                  aria-describedby="sympla-email-hint"
                />
                {state === 'error' ? (
                  <p id="sympla-email-hint" className="field-error m-0 mt-1.5 text-xs text-[#F59A9A]" role="alert">
                    {message}
                  </p>
                ) : (
                  <p id="sympla-email-hint" className="m-0 mt-1.5 text-[11.5px] text-text-3">
                    A gente procura seu ingresso no Sympla com esse e-mail.
                  </p>
                )}
              </div>

              {/* Botão de ação oficial TechWeek: consistente, imponente e sem degradê comercial chamativo */}
              <button
                type="submit"
                className="btn btn-primary btn-block mt-4 !min-h-[50px] !rounded-xl text-[15px] font-extrabold text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98] hover:brightness-105 border-t border-white/20"
                disabled={state === 'loading'}
              >
                {state === 'loading' ? (
                  <>
                    <span
                      className="size-[18px] rounded-full border-2 border-white/30 border-t-white"
                      style={{ animation: 'dsSpin 800ms linear infinite' }}
                      aria-hidden="true"
                    />
                    <span>Procurando ingresso...</span>
                  </>
                ) : (
                  <>
                    <Ticket size={18} strokeWidth={2.2} aria-hidden="true" />
                    <span>Vincular ingresso</span>
                  </>
                )}
              </button>
            </form>

            {/* Rodapé limpo e elegante: link direto em vez de card pesado com botão empilhado */}
            <div className="mt-4 border-t border-white/[0.06] pt-3 text-center">
              <p className="m-0 text-xs text-text-3">
                Ainda não tem ingresso?{' '}
                <a
                  href={SYMPLA_EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-gold transition-colors hover:text-amber-300 hover:underline"
                >
                  <span>Garantir no Sympla</span>
                  <ExternalLink size={12} strokeWidth={2.4} aria-hidden="true" className="opacity-80" />
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

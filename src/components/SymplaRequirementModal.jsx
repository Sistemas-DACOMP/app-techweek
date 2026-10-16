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
        className="ds-sheet relative !px-[22px] border-t border-amber-500/20 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
        style={{ zIndex: SYMPLA_SHEET_Z + 1, ...keyboardStyle }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sympla-sheet-title"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-white/[0.08] hover:text-text active:scale-95"
        >
          <X size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>

        {state === 'done' ? (
          <div className="flex flex-col items-center py-5 text-center" role="status">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-ok text-[#0A2A1C] shadow-[0_0_24px_rgba(111,216,166,0.35)]"
              style={{ animation: 'dsPop 380ms var(--spring) both' }}
            >
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 id="sympla-sheet-title" className="m-0 mt-4 text-[21px] font-black text-text">
              Ingresso vinculado
            </h2>
            <p className="m-0 mt-1 max-w-[280px] text-sm text-text-2">
              Passaporte Completo ativado. Workshops exclusivos, missões e ranking liberados!
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block mt-6 !min-h-[52px] text-base font-extrabold"
              onClick={finish}
            >
              Continuar
            </button>
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex items-start gap-3.5 pr-8">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-[linear-gradient(135deg,rgba(217,119,6,0.22)_0%,rgba(147,51,234,0.18)_100%)] text-gold shadow-[0_0_18px_rgba(245,158,11,0.15)]">
                <Sparkles size={24} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="sympla-sheet-title" className="m-0 text-[20px] font-black tracking-tight text-text sm:text-[22px]">
                  Passaporte Completo
                </h2>
                <p className="m-0 mt-0.5 text-[13px] leading-snug text-text-2">
                  Vincule seu ingresso do Sympla para liberar acesso total às atividades e missões.
                </p>
              </div>
            </div>

            {featureName && (
              <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-gold">
                <Lock size={12} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                <span className="truncate">Necessário para {featureName}</span>
              </div>
            )}

            <ul className="m-0 mt-4 grid list-none grid-cols-3 gap-2.5 p-0">
              {BENEFITS.map(({ title, subtitle, Icon, badgeColor }) => (
                <li
                  key={title}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/[0.08] bg-surface-raised/70 px-2 py-3 text-center transition-all hover:bg-surface-raised"
                >
                  <span className={`flex size-8 items-center justify-center rounded-xl border ${badgeColor}`}>
                    <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-extrabold leading-tight text-text">
                    {title}
                  </span>
                  <span className="text-[10.5px] font-medium leading-tight text-text-3">
                    {subtitle}
                  </span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleSubmit} noValidate className="mt-4">
              <div>
                <label htmlFor="sympla-email" className="field-label">
                  E-mail usado na compra do ingresso
                </label>
                <input
                  ref={inputRef}
                  id="sympla-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seu-email@exemplo.com"
                  className="field !min-h-[50px] !rounded-2xl !px-4"
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
                  <p id="sympla-email-hint" className="field-error m-0" role="alert">
                    {message}
                  </p>
                ) : (
                  <p id="sympla-email-hint" className="m-0 mt-1.5 text-xs text-text-3">
                    A gente procura seu ingresso no Sympla com esse e-mail.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-block mt-3.5 !min-h-[50px] rounded-2xl !bg-[linear-gradient(135deg,#F59E0B,#D97706)] !text-[#1F1603] text-[15px] !font-black shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-transform active:scale-[0.98] hover:brightness-105"
                disabled={state === 'loading'}
              >
                {state === 'loading' ? (
                  <>
                    <span
                      className="size-[18px] rounded-full border-2 border-[#1F1603]/30 border-t-[#1F1603]"
                      style={{ animation: 'dsSpin 800ms linear infinite' }}
                      aria-hidden="true"
                    />
                    <span>Procurando ingresso...</span>
                  </>
                ) : (
                  <>
                    <Ticket size={18} strokeWidth={2.4} aria-hidden="true" />
                    <span>Vincular ingresso</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 border-t border-line/60 pt-3.5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 px-3.5 transition-colors hover:bg-white/[0.04]">
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-text">
                    Ainda não tem ingresso?
                  </span>
                  <span className="block text-[11px] text-text-3">
                    Garanta seu passaporte no Sympla
                  </span>
                </div>
                <a
                  href={SYMPLA_EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-extrabold text-gold transition-all hover:bg-amber-500/20 active:scale-95 no-underline"
                >
                  <span>Comprar</span>
                  <ExternalLink size={12} strokeWidth={2.4} aria-hidden="true" className="opacity-80" />
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, CalendarDays, QrCode, Trophy, ExternalLink, Check } from 'lucide-react';
import { SYMPLA_EVENT_URL, verifySymplaTicket } from '../lib/sympla';
import { updateUserProfile } from '../lib/userService';
import { auth } from '../lib/firebase';

// Acima do painel da atividade (z 2000/2001) para o aviso aparecer na frente dele (KAN-112)
export const SYMPLA_SHEET_Z = 2200;

const BENEFITS = [
  { label: 'Reservar vagas', Icon: CalendarDays, color: 'text-link' },
  { label: 'QR do crachá', Icon: QrCode, color: 'text-cat-minicurso' },
  { label: 'Pontos e ranking', Icon: Trophy, color: 'text-warn' }
];

/**
 * Bottom sheet "Vincule seu ingresso" (board VincularIngresso).
 * Mesma API de antes (isOpen, onClose, featureName) + `onLinked` opcional pra quem quiser
 * recarregar o perfil depois do vínculo. Sem `onLinked`, "Continuar" recarrega a página.
 * Vínculo usa o mesmo caminho do Perfil (verifySymplaTicket por e-mail → updateUserProfile).
 */
export default function SymplaRequirementModal({ isOpen, onClose, onLinked, featureName }) {
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(<LinkTicketSheet onClose={onClose} onLinked={onLinked} featureName={featureName} />, document.body);
}

function LinkTicketSheet({ onClose, onLinked, featureName }) {
  const [email, setEmail] = useState(() => auth?.currentUser?.email || '');
  const [state, setState] = useState('idle'); // idle | loading | error | done
  const [message, setMessage] = useState('');
  const [keyboardStyle, setKeyboardStyle] = useState({});
  const sheetRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const updateViewport = () => {
      if (!vv) return;
      const keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (keyboardInset > 40) {
        setKeyboardStyle({
          bottom: `${keyboardInset}px`,
          maxHeight: `${Math.max(240, Math.round(vv.height - 12))}px`
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
          orderId: p.orderId
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
        className="ds-sheet !px-[22px]"
        style={{ zIndex: SYMPLA_SHEET_Z + 1, ...keyboardStyle }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sympla-sheet-title"
      >
        {state === 'done' ? (
          <div className="flex flex-col items-center py-4 text-center" role="status">
            <span className="flex size-14 items-center justify-center rounded-full bg-ok text-[#0A2A1C]" style={{ animation: 'dsPop 380ms var(--spring) both' }}>
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 id="sympla-sheet-title" className="m-0 mt-4 text-[21px] font-black text-text">Ingresso vinculado</h2>
            <p className="m-0 mt-1 text-sm text-text-2">Reservas, QR do crachá e pontos liberados.</p>
            <button type="button" className="btn btn-primary btn-block mt-6 !min-h-[54px] text-base" onClick={finish}>
              Continuar
            </button>
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-amber-500/20 text-gold">
                <Ticket size={26} strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h2 id="sympla-sheet-title" className="m-0 text-[20px] font-black text-text">Vincule seu ingresso</h2>
                <p className="m-0 mt-0.5 text-[13px] text-text-2">Desbloqueie o Passaporte Completo Tech Week.</p>
              </div>
            </div>

            {featureName && (
              <p className="m-0 mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1 text-xs font-bold text-warn">
                Necessário para {featureName}
              </p>
            )}

            <ul className="m-0 mt-3.5 grid list-none grid-cols-3 gap-2 p-0">
              {BENEFITS.map(({ label, Icon, color }) => (
                <li key={label} className="flex flex-col items-center gap-2 rounded-[14px] bg-surface-raised px-1.5 py-3 text-center">
                  <Icon size={22} strokeWidth={1.9} className={color} aria-hidden="true" />
                  <span className="text-xs font-bold leading-[1.3] text-text">{label}</span>
                </li>
              ))}
            </ul>

            {/* CTA Hero: para quem ainda não comprou no Sympla */}
            <a
              href={SYMPLA_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-block mt-4 flex !min-h-[50px] items-center justify-center gap-2 rounded-2xl !bg-[linear-gradient(135deg,#F59E0B,#D97706)] !text-[#1F1603] text-[15px] !font-extrabold no-underline shadow-[0_4px_16px_rgba(217,119,6,0.3)] transition-transform active:scale-[0.98]"
            >
              <Ticket size={19} strokeWidth={2.2} aria-hidden="true" />
              Garantir Passaporte no Sympla
              <ExternalLink size={15} strokeWidth={2.2} aria-hidden="true" className="opacity-75" />
            </a>

            {/* Divisor elegante */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-line" />
              <span className="absolute bg-surface px-2.5 text-[11px] font-bold uppercase tracking-wider text-text-3">
                Já comprou? Vincule aqui
              </span>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="sympla-email" className="field-label">E-mail usado na compra do ingresso</label>
                <input
                  ref={inputRef}
                  id="sympla-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="field !min-h-[50px] !rounded-2xl !px-4"
                  value={email}
                  onFocus={handleInputFocus}
                  onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
                  aria-invalid={state === 'error'}
                  aria-describedby="sympla-email-hint"
                />
                {state === 'error' ? (
                  <p id="sympla-email-hint" className="field-error m-0" role="alert">{message}</p>
                ) : (
                  <p id="sympla-email-hint" className="m-0 mt-1.5 text-xs text-text-3">A gente procura seu ingresso no Sympla com esse e-mail.</p>
                )}
              </div>

              <button type="submit" className="btn btn-secondary btn-block mt-3.5 !min-h-[48px] text-[15px]" disabled={state === 'loading'}>
                {state === 'loading' ? (
                  <>
                    <span className="size-[18px] rounded-full border-2 border-white/40 border-t-white" style={{ animation: 'dsSpin 800ms linear infinite' }} aria-hidden="true" />
                    Procurando ingresso
                  </>
                ) : (
                  <>
                    <Ticket size={18} strokeWidth={1.9} aria-hidden="true" />
                    Vincular ingresso
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

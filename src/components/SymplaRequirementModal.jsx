import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, CalendarDays, QrCode, Trophy, ExternalLink, Check } from 'lucide-react';
import { SYMPLA_EVENT_URL, verifySymplaTicket } from '../lib/sympla';
import { updateUserProfile } from '../lib/userService';
import { auth } from '../lib/firebase';

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
export default function SymplaRequirementModal({ isOpen, onClose, onLinked }) {
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(<LinkTicketSheet onClose={onClose} onLinked={onLinked} />, document.body);
}

function LinkTicketSheet({ onClose, onLinked }) {
  const [email, setEmail] = useState(() => auth?.currentUser?.email || '');
  const [state, setState] = useState('idle'); // idle | loading | error | done
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div className="ds-sheet !px-[22px]" role="dialog" aria-modal="true" aria-labelledby="sympla-sheet-title">
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
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(61,80,230,0.2)] text-link">
                <Ticket size={26} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div>
                <h2 id="sympla-sheet-title" className="m-0 text-[21px] font-black text-text">Vincule seu ingresso</h2>
                <p className="m-0 mt-0.5 text-[13px] text-text-2">Leva menos de 1 minuto.</p>
              </div>
            </div>

            <ul className="m-0 mt-4 grid list-none grid-cols-3 gap-2 p-0">
              {BENEFITS.map(({ label, Icon, color }) => (
                <li key={label} className="flex flex-col items-center gap-2 rounded-[14px] bg-surface-raised px-1.5 py-3 text-center">
                  <Icon size={22} strokeWidth={1.9} className={color} aria-hidden="true" />
                  <span className="text-xs font-bold leading-[1.3] text-text">{label}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mt-[18px]">
                <label htmlFor="sympla-email" className="field-label">E-mail usado na compra do ingresso</label>
                <input
                  ref={inputRef}
                  id="sympla-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="field !min-h-[54px] !rounded-2xl !px-4"
                  value={email}
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

              <button type="submit" className="btn btn-primary btn-block mt-[18px] !min-h-[54px] text-base" disabled={state === 'loading'}>
                {state === 'loading' ? (
                  <>
                    <span className="size-[18px] rounded-full border-2 border-white/40 border-t-white" style={{ animation: 'dsSpin 800ms linear infinite' }} aria-hidden="true" />
                    Procurando ingresso
                  </>
                ) : (
                  <>
                    <Ticket size={20} strokeWidth={1.9} aria-hidden="true" />
                    Vincular ingresso
                  </>
                )}
              </button>
            </form>

            <a
              href={SYMPLA_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex min-h-11 items-center justify-center gap-1.5 text-center text-sm font-bold text-link no-underline"
            >
              Ainda não tem ingresso? Garantir no Sympla
              <ExternalLink size={15} strokeWidth={1.9} aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </>
  );
}

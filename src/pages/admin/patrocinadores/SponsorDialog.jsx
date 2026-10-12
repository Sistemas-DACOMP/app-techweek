import { useRef, useState } from 'react';
import { Copy, Loader2, Send, Upload, X } from 'lucide-react';
import { Dialog, Field, SwitchRow, Stepper, btn } from '../ui';
import { isValidEmail } from '../../../lib/validators';
import { uploadFeedMedia } from '../../../lib/feedService';
import { createSponsor, updateSponsor, inviteErrorMessage, splitEmails } from '../../../lib/sponsorInviteService';
import { TIER_KEYS, TierText, LogoPlate } from './shared';

/* Modal "Novo patrocinador" (e edição). Convites só na criação; depois, pela linha da empresa. */

const DEFAULT_LIMIT = { DIAMANTE: 5, OURO: 4, PRATA: 3 };
const domainOf = (email) => (email.split('@')[1] || '').toLowerCase();

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function SponsorDialog({ sponsor, onClose, onSaved, onNotify }) {
  const editing = !!sponsor;
  const [name, setName] = useState(sponsor?.name || '');
  const [logoUrl, setLogoUrl] = useState(sponsor?.logoUrl || '');
  const [logoBusy, setLogoBusy] = useState(false);
  const [tier, setTier] = useState(sponsor?.tier || 'DIAMANTE');
  const [boothCode, setBoothCode] = useState(sponsor?.booth?.code || '');
  const [boothArea, setBoothArea] = useState(sponsor?.booth?.area || '');
  const [teamLimit, setTeamLimit] = useState(sponsor?.teamLimit ?? DEFAULT_LIMIT.DIAMANTE);
  const [limitTouched, setLimitTouched] = useState(editing);
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState('');
  const [restrict, setRestrict] = useState(!!sponsor?.allowedEmailDomain);
  const [domainInput, setDomainInput] = useState(sponsor?.allowedEmailDomain || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const firstDomain = emails[0] ? domainOf(emails[0]) : '';
  const domain = (firstDomain || domainInput.replace(/^@/, '')).trim().toLowerCase();

  const pickTier = (t) => {
    setTier(t);
    if (!limitTouched) setTeamLimit(DEFAULT_LIMIT[t]);
  };

  const commitDraft = (text = draft) => {
    const parts = splitEmails(text);
    if (!parts.length) { setDraft(''); return; }
    const bad = parts.filter((e) => !isValidEmail(e));
    const good = parts.filter((e) => isValidEmail(e) && !emails.includes(e));
    if (good.length) setEmails((list) => [...list, ...good]);
    setDraft(bad.join(' '));
    setError(bad.length ? `E-mail inválido: ${bad.join(', ')}` : '');
  };

  const onLogo = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('O logo precisa ser uma imagem.'); return; }
    setLogoBusy(true);
    setError('');
    try { setLogoUrl(await uploadFeedMedia(file)); } catch (e) { setError(e.message || 'Não foi possível enviar o logo.'); }
    setLogoBusy(false);
  };

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) { setError('Informe o nome da empresa.'); return; }
    const pending = splitEmails(draft);
    const allEmails = [...new Set([...emails, ...pending.filter(isValidEmail)])];
    if (pending.some((e) => !isValidEmail(e))) { setError('Há um e-mail inválido no campo de convites.'); return; }
    if (restrict && !domain) { setError('Informe o domínio da empresa para restringir os e-mails.'); return; }
    const body = {
      name: name.trim(),
      ...(logoUrl ? { logoUrl } : {}),
      tier,
      ...(boothCode.trim() ? { booth: { code: boothCode.trim(), area: boothArea.trim() } } : {}),
      ...(Number(teamLimit) > 0 ? { teamLimit: Number(teamLimit) } : {}),
      ...(restrict && domain ? { allowedEmailDomain: domain } : {}),
    };
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updateSponsor(sponsor.sponsorId, body);
        onSaved();
        onNotify({ type: 'success', title: 'Patrocinador atualizado' });
        onClose();
      } else {
        const res = await createSponsor({ ...body, ...(allEmails.length ? { emails: allEmails } : {}) });
        onSaved(res.invites || [], body.name);
        setResult(res.invites || []);
      }
    } catch (e) {
      setError(inviteErrorMessage(e));
    }
    setBusy(false);
  };

  const copy = async (link) => {
    const ok = await copyText(link);
    onNotify(ok ? { type: 'success', title: 'Link copiado' } : { type: 'error', title: 'Não deu para copiar', message: link });
  };

  /* ---- Resultado da criação: cada convite com seu estado de envio ---- */
  if (result) {
    return (
      <Dialog
        title="Patrocinador criado"
        onClose={onClose}
        footer={<button type="button" className={btn('action')} onClick={onClose}>Concluir</button>}
      >
        {result.length === 0 ? (
          <p className="m-0 text-[14px] text-text-2">A empresa foi criada sem convites. Use "Copiar convite" na lista para gerar um link.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {result.map((inv) => {
              const failed = inv.email && !inv.emailSent;
              return (
                <li key={inv.inviteId} className="flex items-center gap-3 rounded-[14px] bg-bg p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{inv.email || 'Link para qualquer pessoa da empresa'}</span>
                    <span className={`block text-[12px] font-bold ${failed || !inv.email ? 'text-warn' : 'text-ok'}`}>
                      {!inv.email ? 'Link genérico, serve para várias pessoas' : failed ? 'E-mail não enviado, copie o link' : 'E-mail enviado'}
                    </span>
                  </span>
                  <button type="button" className={btn('secondary', 'min-h-11 shrink-0')} onClick={() => copy(inv.link)}>
                    <Copy size={15} aria-hidden="true" /> Copiar link
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      wide
      title={editing ? 'Editar patrocinador' : 'Novo patrocinador'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={btn('quiet', 'text-link')} onClick={onClose}>Cancelar</button>
          <button type="button" className={btn('action')} disabled={busy || logoBusy} onClick={submit}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : !editing && <Send size={16} aria-hidden="true" />}
            {editing ? 'Salvar' : emails.length || splitEmails(draft).length ? 'Criar e enviar convites' : 'Criar patrocinador'}
          </button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Empresa" aside={<span className="text-[12px] font-bold text-text-3">obrigatório</span>}>
            {(id) => <input id={id} className="field" value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <div>
            <span className="field-label">Logo</span>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label={logoUrl ? 'Trocar logo' : 'Enviar logo'} className="press relative block rounded-[10px] outline-offset-2">
              {logoUrl ? <LogoPlate src={logoUrl} name={name} height={50} width={160} /> : (
                <span className="flex h-[50px] w-[160px] items-center justify-center gap-2 rounded-[10px] border border-dashed border-field-line text-[13px] font-bold text-text-2">
                  {logoBusy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />} Enviar logo
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
          </div>
        </div>

        <div role="radiogroup" aria-label="Cota" className="min-w-0">
          <span className="field-label">Cota</span>
          <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-bg p-1">
            {TIER_KEYS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => pickTier(t)} className={`press mo-hover min-h-11 rounded-[10px] text-[14px] ${tier === t ? 'border border-link bg-surface-selected' : 'border border-transparent'}`}>
                <TierText tier={t} prefix={false} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estande">
            {(id) => <input id={id} className="field" placeholder="01" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} />}
          </Field>
          <Field label="Área do estande">
            {(id) => <input id={id} className="field" placeholder="Hall Central" value={boothArea} onChange={(e) => setBoothArea(e.target.value)} />}
          </Field>
        </div>
        <Stepper label="Limite da equipe" value={teamLimit} min={1} onChange={(v) => { setLimitTouched(true); setTeamLimit(v); }} hint="Quantas pessoas da empresa podem criar conta." />

        {!editing && (
          <Field label="Convidar por e-mail" hint="Separe por vírgula ou espaço. Sem e-mails, cria um link único para a empresa.">
            {(id) => (
              <div className="flex min-h-[52px] flex-wrap items-center gap-1.5 rounded-xl border-[1.5px] border-field-line bg-field p-2 focus-within:border-link">
                {emails.map((em) => (
                  <span key={em} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-surface-selected pl-2.5 pr-1 text-[12px] font-bold">
                    {em}
                    <button type="button" aria-label={`Remover ${em}`} onClick={() => setEmails((l) => l.filter((x) => x !== em))} className="flex h-6 w-6 items-center justify-center rounded text-text-3"><X size={13} aria-hidden="true" /></button>
                  </span>
                ))}
                <input
                  id={id}
                  type="email"
                  inputMode="email"
                  value={draft}
                  placeholder={emails.length ? 'mais e-mails...' : 'nome@empresa.com'}
                  onChange={(e) => (/[\s,;]$/.test(e.target.value) ? commitDraft(e.target.value) : setDraft(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } if (e.key === 'Backspace' && !draft && emails.length) setEmails((l) => l.slice(0, -1)); }}
                  onBlur={() => commitDraft()}
                  onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[\s,;]/.test(t.trim())) { e.preventDefault(); commitDraft(t); } }}
                  className="min-w-[140px] flex-1 border-0 bg-transparent px-1.5 text-[14px] text-text outline-none placeholder:text-text-4"
                />
              </div>
            )}
          </Field>
        )}

        <div className="rounded-[14px] bg-bg px-3.5 py-1.5">
          <SwitchRow
            title={domain ? `Só aceitar e-mails @${domain}` : 'Só aceitar e-mails do domínio da empresa'}
            hint="O link de convite recusa outros domínios."
            checked={restrict}
            onChange={setRestrict}
          />
          {restrict && !firstDomain && (
            <div className="pb-3">
              <Field label="Domínio da empresa">
                {(id) => <input id={id} className="field" placeholder="empresa.com.br" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />}
              </Field>
            </div>
          )}
        </div>

        {error && <p role="alert" className="m-0 text-[13px] font-semibold text-err">{error}</p>}
      </div>
    </Dialog>
  );
}

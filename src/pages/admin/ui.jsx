import { useEffect, useId, useRef, useState } from 'react';
import { Check, X, MoreHorizontal, Minus, Plus, AlertTriangle } from 'lucide-react';

/* Peças visuais compartilhadas do painel admin (DESIGN.md §6). Sem regra de negócio aqui. */

export const BTN = {
  base: 'press inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-50',
  action: 'bg-action text-white',
  secondary: 'bg-surface-selected text-text',
  quiet: 'bg-transparent text-text-2',
  danger: 'bg-[rgba(245,154,154,0.08)] text-err',
};
export const btn = (v = 'secondary', extra = '') => `${BTN.base} ${BTN[v]} ${extra}`;

export const ICON_BTN = 'press inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-raised text-text-2';

/* Tipos de atividade: só ponto ou faixa (§2.3). */
const TYPE_COLORS = [
  [/palestra|mesa|painel|submiss/, 'var(--cat-palestra)'],
  [/workshop/, 'var(--cat-workshop)'],
  [/minicurso|curso/, 'var(--cat-minicurso)'],
  [/ativa/, 'var(--cat-ativacao)'],
  [/hackathon/, 'var(--cat-hackathon)'],
];
export function typeColor(type = '') {
  const t = String(type).toLowerCase();
  return (TYPE_COLORS.find(([re]) => re.test(t)) || [null, 'var(--text-3)'])[1];
}
export function typeLabel(type = '') {
  const t = String(type || 'palestra');
  const low = t.toLowerCase();
  if (low === 'curso') return 'Minicurso';
  if (low.startsWith('ativa')) return 'Ativação';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* Datas do evento (21 a 26 de outubro, como no board 2.03). */
export const EVENT_DAYS = [
  { date: '2026-10-21', wd: 'qua', label: 'Qua 21' },
  { date: '2026-10-22', wd: 'qui', label: 'Qui 22' },
  { date: '2026-10-23', wd: 'sex', label: 'Sex 23' },
  { date: '2026-10-24', wd: 'sáb', label: 'Sáb 24' },
  { date: '2026-10-25', wd: 'dom', label: 'Dom 25' },
  { date: '2026-10-26', wd: 'seg', label: 'Seg 26' },
];
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function isoToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
export function dayLabel(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${WD[new Date(y, m - 1, d).getDay()]} ${d}`;
}

/* Sessões normalizadas de uma atividade (mesma leitura que a tabela antiga fazia). */
export function sessionsOf(act) {
  return act.schedule && act.schedule.length > 0
    ? act.schedule
    : [{ date: act.date || '2026-10-21', startTime: act.time || '14:00', endTime: act.endTime || '15:30', location: act.location }];
}
export function firstDate(act) {
  const s = sessionsOf(act)[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : act.date || '';
}
export function startTime(act) {
  const s = sessionsOf(act)[0];
  return s.startTime || s.time || act.time || '';
}

/* agora / encerrada / futura — pelo relógio do aparelho, só para rótulo visual. */
export function liveStatus(act, now = new Date()) {
  const date = firstDate(act);
  const start = startTime(act);
  const end = sessionsOf(act)[0].endTime || act.endTime;
  if (!date || !start) return 'future';
  const s = new Date(`${date}T${start}`);
  const e = end ? new Date(`${date}T${end}`) : new Date(s.getTime() + 90 * 60000);
  if (now >= s && now <= e) return 'live';
  return now > e ? 'past' : 'future';
}

export function capacityOf(act) {
  const total = Number(act.vagas_totais || act.maxCapacity || 0);
  const limited = act.hasCapacityLimit !== false && total > 0 && total < 900;
  return { total, taken: Number(act.total_inscritos || 0), limited };
}

export function initials(name = '') {
  return name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export function TypeTag({ type, children, className = '' }) {
  const color = typeColor(type);
  return (
    <span className={`flex items-center gap-2 text-[12px] font-extrabold ${className}`} style={{ color }}>
      <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color }} />
      {typeLabel(type)}
      {children}
    </span>
  );
}

/* Lotação: barra fina; cheia vira amarelo (§2.4 aviso). */
export function OccBar({ taken, total, className = '' }) {
  const pct = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;
  return (
    <span className={`block h-1.5 overflow-hidden rounded-full bg-surface-raised ${className}`}>
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--warn)' : 'var(--progress-fill)' }} />
    </span>
  );
}

export function Section({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-[20px] bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            {title && <h2 className="m-0 text-[16px] font-extrabold">{title}</h2>}
            {subtitle && <p className="m-0 mt-1 text-[13px] text-text-3">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* Cabeçalho de página no desktop (no celular o título vai centralizado no header do shell). */
export function PageHead({ title, subtitle, children, crumb }) {
  return (
    <div className="mb-6 hidden flex-wrap items-center gap-4 lg:flex">
      <div className="min-w-0 flex-[1_1_300px]">
        {crumb}
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-[14px] text-text-2">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, accent, children }) {
  return (
    <div className="rounded-2xl bg-surface p-3.5 lg:rounded-[18px] lg:p-[18px]" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <div className="text-[12px] font-bold text-text-2 lg:text-[13px]">{label}</div>
      <div className="mt-1.5 text-[26px] font-black leading-none lg:mt-3 lg:text-[32px]" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-text-3 lg:mt-2 lg:text-[13px] lg:text-text-2">{hint}</div>}
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} className="adm-switch" onClick={() => onChange(!checked)} />
  );
}

export function SwitchRow({ title, hint, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex min-h-[52px] items-center gap-3">
      <span className="flex-1" id={id}>
        <span className="block text-[14px] font-bold">{title}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-text-3">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={!!checked} aria-labelledby={id} className="adm-switch" onClick={() => onChange(!checked)} />
    </div>
  );
}

/* Campo com rótulo ligado (§6 Campos, §10). */
export function Field({ label, hint, children, className = '', aside }) {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="field-label">{label}</label>
        {aside}
      </div>
      {child}
      {hint && <p className="m-0 mt-1.5 text-[12px] text-text-4">{hint}</p>}
    </div>
  );
}

export function Stepper({ label, value, onChange, step = 1, min = 0, hint, disabled }) {
  const n = Number(value) || 0;
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex h-[52px] items-center gap-1 rounded-xl border-[1.5px] border-field-line bg-field p-1">
          <button type="button" aria-label={`Diminuir ${label}`} disabled={disabled || n <= min} className={`${ICON_BTN} h-11 w-11 bg-surface-selected text-text disabled:opacity-40`} onClick={() => onChange(Math.max(min, n - step))}>
            <Minus size={18} aria-hidden="true" />
          </button>
          <input id={id} type="number" inputMode="numeric" min={min} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-full min-w-0 flex-1 border-0 bg-transparent text-center text-[17px] font-extrabold text-text outline-none disabled:opacity-50" />
          <button type="button" aria-label={`Aumentar ${label}`} disabled={disabled} className={`${ICON_BTN} h-11 w-11 bg-surface-selected text-text disabled:opacity-40`} onClick={() => onChange(n + step)}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </Field>
  );
}

/* Diálogo centrado (desktop) / folha (celular). role=dialog, Esc fecha (§10). */
export function Dialog({ title, onClose, children, footer, wide }) {
  const id = useId();
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ds-scrim flex items-end justify-center lg:items-center lg:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-surface outline-none lg:rounded-[24px] ${wide ? 'lg:max-w-[620px]' : 'lg:max-w-[480px]'}`}
        style={{ animation: 'dsSheetUp 250ms var(--ease-out)' }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          <h2 id={id} className="m-0 text-[18px] font-extrabold">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className={`${ICON_BTN} h-11 w-11`}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* Toast (§6): sucesso some em 4 s; erro fica até fechar e usa role="alert". */
export function Toast({ feedback, onClose }) {
  const isError = feedback?.type === 'error';
  useEffect(() => {
    if (!feedback || isError) return undefined;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [feedback, isError, onClose]);
  if (!feedback) return null;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className="fixed inset-x-4 bottom-[92px] z-[3000] mx-auto flex max-w-[480px] items-center gap-3 rounded-2xl bg-surface-selected px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)] lg:inset-x-auto lg:bottom-6 lg:right-8"
      style={{ animation: 'dsFadeUp 220ms var(--ease-out)' }}
    >
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: isError ? 'rgba(245,154,154,0.18)' : 'rgba(111,216,166,0.18)', color: isError ? 'var(--err)' : 'var(--ok)' }}>
        {isError ? <AlertTriangle size={17} /> : <Check size={17} strokeWidth={2.6} />}
      </span>
      <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">
        {feedback.title && <span className="block font-bold">{feedback.title}</span>}
        {feedback.message && <span className="block text-[13px] font-medium text-text-2">{feedback.message}</span>}
      </span>
      {feedback.action && (
        <button type="button" className="press min-h-11 shrink-0 px-2 text-[14px] font-bold text-link" onClick={() => { feedback.action.run(); onClose(); }}>
          {feedback.action.label}
        </button>
      )}
      {isError && (
        <button type="button" aria-label="Fechar aviso" className={`${ICON_BTN} h-11 w-11 shrink-0 bg-transparent`} onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* Menu "Mais ações" — lista de botões; fecha com Esc ou clique fora. */
export function MoreMenu({ label = 'Mais ações', items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} className={ICON_BTN} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={17} aria-hidden="true" />
      </button>
      {open && (
        <span role="menu" className="absolute right-0 top-full z-50 mt-1.5 flex min-w-[210px] flex-col rounded-2xl bg-surface-selected p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          {items.filter(Boolean).map(({ label: l, icon: Icon, onClick, danger }) => (
            <button key={l} type="button" role="menuitem" className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-semibold hover:bg-surface-raised ${danger ? 'text-err' : 'text-text'}`} onClick={() => { setOpen(false); onClick(); }}>
              {Icon && <Icon size={16} aria-hidden="true" />}
              {l}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* Chip de filtro (§6 Busca e filtros): selecionado é branco. */
export function Chip({ selected, onClick, dot, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`press inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-bold ${selected ? 'border-transparent bg-text text-bg' : 'border-line-2 bg-transparent text-text'}`}
    >
      {dot && <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

export function EmptyState({ children }) {
  return <p className="m-0 px-4 py-10 text-center text-[14px] text-text-3">{children}</p>;
}

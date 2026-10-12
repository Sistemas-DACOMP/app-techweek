import { Star, Check, X, ChevronRight } from 'lucide-react';
import { TIER_BAR, tierLabel, initialsOf, toneFor, ratingColor } from './util';

/* Peças visuais do app do patrocinador (DESIGN.md). Cor só nos dados; gradiente da cota só em detalhe. */

export function Avatar({ name, size = 42, tone, photo }) {
  const t = tone || toneFor(name);
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold"
      style={{ width: size, height: size, background: `${t}2B`, color: t, fontSize: Math.round(size / 3) }}>
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
    </span>
  );
}

export function TierStripe({ tier }) {
  if (!tier || !TIER_BAR[tier]) return null;
  return <div aria-hidden="true" className="h-[3px]" style={{ background: TIER_BAR[tier] }} />;
}

// "Cota X" em gradiente. Sem cota, nada (nunca assume Ouro).
export function CotaText({ tier, className = '' }) {
  if (!tier || !TIER_BAR[tier]) return null;
  return (
    <span className={`font-extrabold ${className}`} style={{ background: TIER_BAR[tier], WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
      Cota {tierLabel(tier)}
    </span>
  );
}

const Star1 = ({ on, color, size, i }) => (
  <Star size={size} aria-hidden="true" className={on ? 'tw-pop shrink-0' : 'shrink-0'} style={{ '--i': i }}
    fill={on ? color : 'none'} stroke={on ? color : 'var(--text-4)'} strokeWidth={1.6} />
);

// Nota so em estrelas, sem rotulo de nivel.
export function Stars({ value, size = 13 }) {
  const color = ratingColor(value);
  return (
    <span role="img" aria-label={`${value} de 5 estrelas`} className="flex gap-px">
      {[1, 2, 3, 4, 5].map((n) => <Star1 key={n} on={n <= value} color={color} size={size} i={n} />)}
    </span>
  );
}

export function StarsInput({ value, onChange }) {
  const color = ratingColor(value);
  return (
    <div role="radiogroup" aria-label="Nota do candidato" className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`} onClick={() => onChange(n)}
          className="tw-press flex size-11 items-center justify-center rounded-xl"
          style={{ background: value === n ? `${color}1F` : 'transparent' }}>
          <Star1 on={n <= value} color={color} size={30} i={n} />
        </button>
      ))}
    </div>
  );
}

export function MoreLink({ onClick, children, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="tw-press flex min-h-11 items-center gap-1 text-[14px] font-bold text-link">
      {children}<ChevronRight size={14} aria-hidden="true" />
    </button>
  );
}

export function SectionCard({ title, action, onAction, actionLabel, children, flush, i = 0, className = '' }) {
  return (
    <section className={`tw-rise overflow-hidden rounded-[20px] bg-surface p-5 ${className}`} style={{ '--i': i }}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="m-0 flex-1 text-[16px] font-extrabold">{title}</h2>
          {action && <MoreLink onClick={onAction} label={actionLabel}>{action}</MoreLink>}
        </div>
      )}
      <div className={flush ? '-mx-5 -mb-5' : ''}>{children}</div>
    </section>
  );
}

// KPI: faixa no topo e numero na cor do dado. `tier` usa o gradiente da cota (so no card de destaque).
export function KpiTile({ label, value, hint, color = 'var(--link)', tier, bar, i = 0 }) {
  const grad = tier ? TIER_BAR[tier] : null;
  return (
    <div className="tw-rise tw-lift overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ '--i': i, borderTop: grad ? undefined : `3px solid ${color}` }}>
      {grad && <div aria-hidden="true" className="h-[3px]" style={{ background: grad }} />}
      <div className="px-4 py-3.5">
        <div className="text-[13px] font-semibold text-text-2">{label}</div>
        <div className="mt-1 inline-block text-[28px] font-extrabold leading-[1.1]"
          style={grad ? { background: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color }}>
          {value}
        </div>
        <div className="mt-1 text-[12px] text-text-3">{hint}</div>
        {bar != null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-surface-raised">
            <div className="tw-growx h-1.5 rounded-[3px]" style={{ width: `${bar}%`, background: grad || color }} />
          </div>
        )}
      </div>
    </div>
  );
}

// Tag marcavel (lg) ou so leitura (sm).
export function TagChip({ children, active, color = 'var(--link)', onClick, size = 'sm' }) {
  const lg = size === 'lg';
  const cls = `inline-flex items-center gap-1.5 rounded-full ${lg ? 'h-10 px-3.5 text-[13px] border-[1.5px]' : 'h-[22px] px-2 text-[12px] border'} ${active ? 'font-extrabold' : lg ? 'font-semibold' : ''}`;
  const style = { background: active ? `color-mix(in srgb, ${color} 14%, transparent)` : 'transparent', borderColor: active ? color : 'var(--line-2)', color: active ? color : 'var(--text-2)' };
  if (!onClick) return <span className={cls} style={style}>{children}</span>;
  return (
    <button type="button" aria-pressed={!!active} onClick={onClick} className={`tw-press ${cls}`} style={style}>
      {active && lg && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function CloseButton({ onClick, label = 'Fechar' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface">
      <X size={20} aria-hidden="true" />
    </button>
  );
}

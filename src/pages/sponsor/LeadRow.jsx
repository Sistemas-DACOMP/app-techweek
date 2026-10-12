import { ChevronRight } from 'lucide-react';
import { Avatar, Stars, TagChip } from './ui';
import { TIER_BAR, leadSubtitle, ratingColor } from './util';

/* Linha de lead (lista de Leads e "Leads recentes" do Início). Nota so em estrelas. */
export default function LeadRow({ lead, onClick, selected, tier, i = 0, showTags = true }) {
  const rating = Number(lead.rating) || 0;
  const tags = Array.isArray(lead.tags) ? lead.tags : [];
  return (
    <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined}
      className={`tw-rise relative flex w-full items-center gap-3 border-0 border-b border-line px-4 py-3 text-left ${selected ? 'bg-surface-selected' : 'bg-transparent hover:bg-white/[0.02]'}`}
      style={{ '--i': i }}>
      {selected && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-sm" style={{ background: tier ? TIER_BAR[tier] : 'var(--link)' }} />}
      <Avatar name={lead.name} tone={rating && rating !== 5 ? ratingColor(rating) : undefined} />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">{lead.name || 'Participante'}</div>
        <div className="mt-px truncate text-[13px] text-text-2">{leadSubtitle(lead)}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {rating > 0 ? <Stars value={rating} /> : <span className="text-[12px] font-extrabold text-link">Avaliar candidato</span>}
        </div>
        {showTags && tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => <TagChip key={t}>{t}</TagChip>)}
          </div>
        )}
      </div>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-4" />
    </button>
  );
}

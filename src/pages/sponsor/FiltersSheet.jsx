import { createPortal } from 'react-dom';
import { CloseButton, TagChip } from './ui';

const STARS = [['all', 'Todas'], ['5', '5 estrelas'], ['4', '4 ou mais'], ['3', '3 ou mais'], ['none', 'Sem nota']];
const SORTS = [['recent', 'Recentes'], ['rating', 'Maior nota'], ['name', 'A a Z']];

const Group = ({ title, children }) => (
  <div className="mb-[18px]">
    <div className="mb-2 text-[13px] font-bold text-text-2">{title}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

/* Bottom sheet de filtros do celular (nota, tag, ordem). Estado vive em Leads. */
export default function FiltersSheet({ filters, onChange, tags, resultCount, onClose }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  return createPortal(
    <>
      <div className="ds-scrim" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="sp-filters-title" className="ds-sheet">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sp-filters-title" className="m-0 text-[18px] font-extrabold">Filtrar leads</h2>
          <CloseButton onClick={onClose} />
        </div>
        <Group title="Nota">
          {STARS.map(([id, label]) => <TagChip key={id} size="lg" active={filters.stars === id} onClick={() => set('stars', id)}>{label}</TagChip>)}
        </Group>
        {tags.length > 0 && (
          <Group title="Tag">
            <TagChip size="lg" active={filters.tag === 'all'} onClick={() => set('tag', 'all')}>Todas</TagChip>
            {tags.map((t) => <TagChip key={t} size="lg" active={filters.tag === t} onClick={() => set('tag', t)}>{t}</TagChip>)}
          </Group>
        )}
        <Group title="Ordenar por">
          {SORTS.map(([id, label]) => <TagChip key={id} size="lg" active={filters.sort === id} onClick={() => set('sort', id)}>{label}</TagChip>)}
        </Group>
        <div className="grid grid-cols-[1fr_2fr] gap-2.5">
          <button type="button" onClick={() => onChange({ ...filters, stars: 'all', tag: 'all', sort: 'recent' })} className="btn btn-secondary btn-sm">Limpar</button>
          <button type="button" onClick={onClose} className="btn btn-action btn-sm">Ver {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}</button>
        </div>
      </div>
    </>,
    document.body,
  );
}

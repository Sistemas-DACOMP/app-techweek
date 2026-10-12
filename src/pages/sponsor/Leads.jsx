import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Download, QrCode, Search, SlidersHorizontal, X } from 'lucide-react';
import Mascot from '../../components/Mascot';
import LeadRow from './LeadRow';
import LeadDossier from './LeadDossier';
import FiltersSheet from './FiltersSheet';
import { filterLeads, leadKey } from './util';

const MQ = '(min-width: 1024px)';
function useDesktop() {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(MQ).matches);
  useEffect(() => {
    const m = window.matchMedia(MQ);
    const h = (e) => setOn(e.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return on;
}

const DEFAULT_FILTERS = { stars: 'all', tag: 'all', sort: 'recent' };
const STAR_OPTIONS = [['all', 'Nota: todas'], ['5', '5 estrelas'], ['4', '4 ou mais'], ['3', '3 ou mais'], ['none', 'Sem nota']];

/* Aba "Leads" (CRM). Desktop: lista + dossiê lado a lado. Celular: lista, e o dossiê abre em tela cheia. */
export default function Leads({
  myLeads, companyLeads, isLoading, tier, companyName, companyId,
  onUpdateLead, onNavigate, onExportCsv, focusLeadId, onFocusConsumed,
}) {
  const desktop = useDesktop();
  const [scope, setScope] = useState('mine');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!focusLeadId) return;
    if (!myLeads.some((l) => leadKey(l) === focusLeadId)) setScope('company');
    setActiveId(focusLeadId);
    onFocusConsumed?.();
  }, [focusLeadId, myLeads, onFocusConsumed]);

  const source = scope === 'mine' ? myLeads : companyLeads;
  const filtered = useMemo(() => filterLeads(source, { search, ...filters }), [source, search, filters]);
  const allTags = useMemo(() => [...new Set(source.flatMap((l) => (Array.isArray(l.tags) ? l.tags : [])))], [source]);
  const active = filtered.find((l) => leadKey(l) === activeId) || (desktop ? filtered[0] : null);
  const filterCount = (filters.stars !== 'all') + (filters.tag !== 'all') + (filters.sort !== 'recent');
  const filtering = Boolean(search.trim()) || filterCount > 0;

  // Dossiê em tela cheia (celular)
  if (!desktop && active) {
    return (
      <div className="tw-slide flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveId(null)} aria-label="Voltar para a lista de leads" className="tw-press flex size-11 items-center justify-center rounded-xl bg-surface-selected">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <h1 className="m-0 text-[18px] font-extrabold">Candidato</h1>
        </div>
        <LeadDossier key={leadKey(active)} lead={active} tier={tier} companyName={companyName} companyId={companyId} onUpdate={onUpdateLead} onManageTags={() => onNavigate('settings')} />
      </div>
    );
  }

  const list = (
    <div className="overflow-hidden rounded-[20px] border border-line bg-bg">
      <div className="flex flex-col gap-2.5 border-b border-line p-3.5">
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-line-2 bg-surface px-3.5 text-text-3 focus-within:border-link">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar leads por nome, curso, telefone ou anotação</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou curso" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-text-4" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="flex size-6 items-center justify-center text-text-3"><X size={14} /></button>}
        </label>
        {desktop ? (
          <div className="grid grid-cols-2 gap-2.5">
            <select aria-label="Filtrar por nota" value={filters.stars} onChange={(e) => setFilters({ ...filters, stars: e.target.value })} className="field" style={{ minHeight: 44, fontSize: 14 }}>
              {STAR_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select aria-label="Filtrar por tag" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} className="field" style={{ minHeight: 44, fontSize: 14 }}>
              <option value="all">Tag: todas</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setSheet(true)} className="tw-press flex h-11 items-center gap-2 rounded-xl bg-surface-selected px-4 text-[14px] font-bold">
              <SlidersHorizontal size={16} aria-hidden="true" />Filtros
              {filterCount > 0 && <span className="rounded-full bg-action px-1.5 text-[11px] font-extrabold text-white">{filterCount}</span>}
            </button>
            <span className="flex-1 text-right text-[13px] text-text-3">{filtered.length} {filtered.length === 1 ? 'candidato' : 'candidatos'}</span>
            <button type="button" onClick={() => onExportCsv(filtered)} disabled={!filtered.length} aria-label="Exportar CSV" className="tw-press flex size-11 items-center justify-center rounded-xl bg-surface-selected disabled:opacity-40">
              <Download size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isLoading && source.length === 0 ? (
        <div className="flex flex-col gap-2 p-3.5" aria-busy="true" aria-label="Carregando leads">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[84px]" />)}
        </div>
      ) : source.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-9 text-center">
          <Mascot size={56} name="alan" mood="waving" className="mb-2.5" />
          <h2 className="m-0 mb-1 text-[15px] font-extrabold">{scope === 'mine' ? 'Nenhum lead coletado por você ainda' : 'Nenhum lead registrado pela empresa'}</h2>
          <p className="m-0 mb-3.5 max-w-[280px] text-[13px] leading-normal text-text-3">Aponte a câmera para o crachá dos participantes para salvar contatos, notas e avaliações.</p>
          <button type="button" onClick={() => onNavigate('scanner')} className="tw-press inline-flex h-11 items-center gap-2 rounded-xl bg-action px-4 text-[14px] font-bold text-white"><QrCode size={16} aria-hidden="true" />Escanear primeiro participante</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-9 text-center">
          <h2 className="m-0 mb-1 text-[15px] font-extrabold">Nenhum lead com estes filtros</h2>
          <button type="button" onClick={() => { setSearch(''); setFilters(DEFAULT_FILTERS); }} className="btn btn-secondary btn-sm mt-3">Limpar filtros</button>
        </div>
      ) : (
        filtered.map((l, i) => <LeadRow key={leadKey(l)} lead={l} tier={tier} i={i} selected={desktop && active && leadKey(l) === leadKey(active)} onClick={() => setActiveId(leadKey(l))} />)
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div role="tablist" aria-label="Escopo dos leads" className="ds-tabs w-full border border-line lg:w-[340px]">
          <button type="button" role="tab" aria-selected={scope === 'mine'} className="ds-tab" onClick={() => setScope('mine')}>Meus leads {myLeads.length}</button>
          <button type="button" role="tab" aria-selected={scope === 'company'} className="ds-tab" onClick={() => setScope('company')}>Toda a empresa {companyLeads.length}</button>
        </div>
        {desktop && (
          <>
            <span className="flex-1 text-[13px] text-text-3">{filtering ? `${filtered.length} de ${source.length} candidatos` : `${source.length} ${source.length === 1 ? 'candidato' : 'candidatos'}`}</span>
          </>
        )}
      </div>

      {desktop ? (
        <div className="tw-fade grid items-start gap-5" style={{ gridTemplateColumns: '400px minmax(0,1fr)' }}>
          {list}
          {active && <LeadDossier key={leadKey(active)} lead={active} tier={tier} companyName={companyName} companyId={companyId} onUpdate={onUpdateLead} onManageTags={() => onNavigate('settings')} />}
        </div>
      ) : list}

      {sheet && <FiltersSheet filters={filters} onChange={setFilters} tags={allTags} resultCount={filtered.length} onClose={() => setSheet(false)} />}
    </div>
  );
}

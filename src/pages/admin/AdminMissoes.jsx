import { Plus, Zap, RefreshCw, Pencil, Trash2, Search } from 'lucide-react';
import { btn, ICON_BTN, PageHead, Kpi, Switch, Chip, MoreMenu, EmptyState } from './ui';
import { CARD_STYLES, STYLE_BY_KEY, styleOfMission } from './MissionPreview';

/* 2.05 Missões (lista). Mesmos filtros e ações de antes; só a apresentação mudou. */

const TRIGGER_LABEL = { form: 'Formulário', secret: 'Palavra secreta', quiz: 'Quiz', auto: 'Automático' };
const howCompletes = (m) => (m.triggerMode === 'form' && (m.fields || []).some((f) => f.type === 'photo') ? 'Foto' : TRIGGER_LABEL[m.triggerMode] || 'Formulário');
const isOn = (m) => (m.status || 'active') === 'active';

export default function AdminMissoes({
  missions, all, loading, categories, category, onCategory, status, onStatus, search, onSearch,
  seeding, onSeed, onNew, onFlash, onEdit, onToggle, onDelete,
}) {
  const active = all.filter(isOn).length;
  const flash = all.filter((m) => m.isFlash).length;
  const totalPts = all.filter(isOn).reduce((s, m) => s + (Number(m.points) || 0), 0);

  return (
    <div className="pb-8">
      <PageHead title="Missões" subtitle={`${all.length} missões${flash ? ` · ${flash} relâmpago` : ''}`}>
        <button type="button" className={btn('secondary')} onClick={onSeed} disabled={seeding}>
          <RefreshCw size={18} aria-hidden="true" className={seeding ? 'animate-spin' : ''} /> {seeding ? 'Sincronizando' : 'Popular missões padrão'}
        </button>
        <button type="button" className={btn('secondary')} onClick={() => onFlash()}><Zap size={18} aria-hidden="true" /> Missão relâmpago</button>
        <button type="button" className={btn('action')} onClick={onNew}><Plus size={18} aria-hidden="true" /> Nova missão</button>
      </PageHead>

      <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
        <button type="button" className={btn('secondary', 'flex-1')} onClick={() => onFlash()}><Zap size={18} aria-hidden="true" /> Relâmpago</button>
        <button type="button" className={btn('secondary', 'flex-1')} onClick={onSeed} disabled={seeding}><RefreshCw size={18} aria-hidden="true" /> Popular</button>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <Kpi label="Missões ativas" value={active} />
        <Kpi label="Relâmpago" value={flash} />
        <Kpi label="Pontos disponíveis" value={totalPts.toLocaleString('pt-BR')} />
      </div>

      <div className="adm-noscroll -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
        {categories.map((c) => <Chip key={c.id} selected={category === c.id} dot={c.id === 'ALL' ? undefined : c.color} onClick={() => onCategory(c.id)}>{c.id === 'ALL' ? 'Todas' : c.label}</Chip>)}
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 focus-within:border-link">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar missão</span>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por título, descrição ou palavra-chave" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-text-4" />
        </label>
        <select aria-label="Filtrar por status" className="field h-11 w-auto" value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="ALL">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="paused">Pausadas</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[20px] bg-surface px-2 pb-1 pt-4">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              {['Missão', 'Como completa', 'Pontos', 'Ativa'].map((h) => <th key={h} className="px-3 pb-3 text-left text-[12px] font-bold text-text-3">{h}</th>)}
              <th className="px-3 pb-3 text-left"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5}><EmptyState>Carregando missões...</EmptyState></td></tr>}
            {!loading && missions.length === 0 && <tr><td colSpan={5}><EmptyState>Nenhuma missão com esses filtros.</EmptyState></td></tr>}
            {missions.map((m) => {
              const meta = STYLE_BY_KEY[styleOfMission(m)] || CARD_STYLES[0];
              const Icon = meta.icon;
              const name = m.title || m.name || 'Missão';
              return (
                <tr key={m.id} className="border-t border-line">
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.color}24`, color: meta.color }}><Icon size={18} aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold">{name}</span>
                        <span className="block text-[12px] text-text-3">{meta.label}</span>
                      </span>
                    </span>
                  </td>
                  <td className="p-3"><span className="whitespace-nowrap rounded-[10px] bg-surface-raised px-2.5 py-1 text-[12px] font-bold text-text-2">{howCompletes(m)}</span></td>
                  <td className="p-3"><span className="rounded-[10px] bg-[rgba(124,58,237,0.22)] px-2.5 py-1 text-[13px] font-extrabold text-[#D6CBFF]">+{Number(m.points) || 0}</span></td>
                  <td className="p-3"><Switch checked={isOn(m)} label={`Missão ${name} ativa`} onChange={() => onToggle(m)} /></td>
                  <td className="whitespace-nowrap p-3">
                    <span className="inline-flex gap-1.5">
                      <button type="button" aria-label={`Editar ${name}`} title="Editar missão" className={ICON_BTN} onClick={() => onEdit(m)}><Pencil size={16} aria-hidden="true" /></button>
                      <MoreMenu label={`Mais ações de ${name}`} items={[
                        { label: 'Disparar como relâmpago', icon: Zap, onClick: () => onFlash(m) },
                        { label: 'Excluir missão', icon: Trash2, danger: true, onClick: () => onDelete(m) },
                      ]} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

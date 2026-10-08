import { useMemo, useState } from 'react';
import { Plus, Monitor, Pencil, QrCode, Trash2, Download, MapPin, Search } from 'lucide-react';
import Mascot from '../../components/Mascot';
import { LinkedinIcon, GithubIcon, InstagramIcon } from './SocialIcons';
import {
  btn, ICON_BTN, Chip, PageHead, TypeTag, OccBar, MoreMenu, EmptyState, typeColor, typeLabel, sessionsOf, firstDate, startTime,
  dayLabel, liveStatus, capacityOf, isoToday,
} from './ui';

/* 2.02 Programação (desktop) e 2.09 (celular). Operações iguais às de antes: editar, excluir, QR, telão, exportar. */

const CLASS_COLORS = {
  'Convidado Externo': 'var(--link)',
  'Professor UFU': 'var(--you-text)',
  'Aluno Pesquisador': 'var(--ok)',
  Patrocinador: 'var(--gold)',
};

const presenceLabel = (a) => (a.attendanceMode === 'DOUBLE_CHECK' ? '2 etapas' : 'QR do telão');

function PresenceTag({ act }) {
  const two = act.attendanceMode === 'DOUBLE_CHECK';
  return (
    <span className={`whitespace-nowrap rounded-[10px] px-2.5 py-1 text-[12px] font-bold ${two ? 'bg-[rgba(103,212,232,0.14)] text-[#67D4E8]' : 'bg-surface-raised text-[#C3C9DE]'}`}>
      {presenceLabel(act)}
    </span>
  );
}

function speakerOf(act) {
  return act.speaker || (Array.isArray(act.speakers) && act.speakers.length ? act.speakers.map((s) => s.name).join(', ') : 'Comissão FACOM');
}

function locationOf(act) {
  const s = sessionsOf(act);
  return s.length > 1 ? [...new Set(s.map((x) => x.location || act.location).filter(Boolean))].join(' / ') : act.location || 'Anfiteatro FACOM';
}

function whenOf(act) {
  return sessionsOf(act).map((s) => `${dayLabel(/^\d{4}-/.test(s.date || '') ? s.date : firstDate(act))} · ${s.startTime || s.time || ''}`).join(' · ');
}

function Capacity({ act, compact }) {
  const c = capacityOf(act);
  if (!c.limited) return <span className="text-[13px] text-text-3">Sem limite</span>;
  return (
    <span className={compact ? 'flex items-center gap-3' : 'block min-w-[130px]'}>
      {!compact && <span className="mb-1.5 block text-[14px] font-extrabold">{c.taken} / {c.total}</span>}
      <OccBar className={compact ? 'flex-1' : ''} taken={c.taken} total={c.total} />
      {compact && <span className="text-[13px] font-extrabold">{c.taken}/{c.total}</span>}
    </span>
  );
}

export default function AdminProgramacao(p) {
  const {
    progTab, setProgTab, activities, filteredActivities, activityFilter, setActivityFilter, activitySearch, setActivitySearch, mobileSearchOpen,
    speakers, filteredSpeakers, speakerSearch, setSpeakerSearch, speakerClassificationFilter, setSpeakerClassificationFilter, classifications,
    locations, onNew, onEdit, onDelete, onTelao, onQr, onExport, onNewSpeaker, onEditSpeaker, onDeleteSpeaker, onNewLocation, photoFallback,
  } = p;
  const [day, setDay] = useState('ALL');
  const now = new Date();

  const types = useMemo(() => [...new Set(activities.map((a) => (a.type || 'palestra').toLowerCase()))], [activities]);
  const days = useMemo(() => [...new Set(activities.map(firstDate).filter(Boolean))].sort(), [activities]);
  const list = filteredActivities.filter((a) => day === 'ALL' || sessionsOf(a).some((s) => (s.date || firstDate(a)) === day));
  const full = activities.filter((a) => { const c = capacityOf(a); return c.limited && c.taken >= c.total; }).length;

  const today = isoToday(now);
  const tipDay = days.includes(today) ? today : days.find((d) => d > today);
  const tipActs = activities.filter((a) => firstDate(a) === tipDay);
  const tipFull = tipActs.find((a) => { const c = capacityOf(a); return c.limited && c.taken >= c.total; });

  const menuFor = (act) => [
    { label: 'QR de check-in', icon: QrCode, onClick: () => onQr(act) },
    { label: 'Excluir atividade', icon: Trash2, onClick: () => onDelete(act.id, act.title), danger: true },
  ];

  const tabs = [
    { key: 'atividades', label: 'Atividades', n: activities.length },
    { key: 'convidados', label: 'Convidados', n: speakers.length },
    { key: 'locais', label: 'Locais', n: locations.length },
  ];

  return (
    <>
      <PageHead title="Programação" subtitle={`${activities.length} atividades em ${days.length} ${days.length === 1 ? 'dia' : 'dias'}${full ? ` · ${full} ${full === 1 ? 'lotada' : 'lotadas'}` : ''}`}>
        <button type="button" className={btn()} onClick={onExport}><Download size={18} aria-hidden="true" /> Exportar grade</button>
        <button type="button" className={btn('action')} onClick={onNew}><Plus size={18} aria-hidden="true" /> Nova atividade</button>
      </PageHead>

      {/* Abas (sublinhado) */}
      <div role="tablist" aria-label="Programação" className="mb-5 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={progTab === t.key}
            onClick={() => setProgTab(t.key)}
            className={`-mb-px min-h-11 border-b-[3px] text-[15px] transition-colors ${progTab === t.key ? 'border-you font-extrabold text-text' : 'border-transparent font-semibold text-text-2'}`}
            style={progTab === t.key ? { borderImage: 'var(--title-bar) 1' } : undefined}
          >
            {t.label} · {t.n}
          </button>
        ))}
      </div>

      {progTab === 'atividades' && (
        <>
          {/* Dica do Alan (celular) */}
          {tipDay && (
            <div className="mb-3.5 flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 lg:hidden">
              <Mascot style={{ width: 44, height: 44, animation: 'none', flexShrink: 0 }} />
              <p className="m-0 text-[14px] leading-snug text-text-2">
                <strong className="text-link">Alan:</strong> {tipActs.length} {tipActs.length === 1 ? 'atividade' : 'atividades'} {tipDay === today ? 'hoje' : `em ${dayLabel(tipDay).toLowerCase()}`}.
                {tipFull ? ` ${tipFull.title} já lotou.` : ' Nenhuma lotada ainda.'}
              </p>
            </div>
          )}

          {mobileSearchOpen && (
            <label className="mb-3 flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 lg:hidden">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Buscar atividade</span>
              <input autoFocus type="search" value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} placeholder="Título, palestrante ou local" className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-text outline-none" />
            </label>
          )}

          {/* Filtros */}
          <div className="adm-noscroll -mx-5 mb-4 flex items-center gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
            <label className="hidden lg:block">
              <span className="sr-only">Dia</span>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="field !min-h-11 !w-auto rounded-full !text-[14px] font-bold">
                <option value="ALL">Todos os dias</option>
                {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </label>
            <span className="contents lg:hidden">
              {days.map((d) => (
                <Chip key={d} selected={day === d} onClick={() => setDay(day === d ? 'ALL' : d)}>{dayLabel(d).toLowerCase()}</Chip>
              ))}
            </span>
            <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-line-2 lg:block" />
            <span className="hidden flex-wrap gap-2 lg:flex">
              <Chip selected={activityFilter === 'ALL'} onClick={() => setActivityFilter('ALL')}>Tudo</Chip>
              {types.map((t) => (
                <Chip key={t} selected={activityFilter === t} dot={typeColor(t)} onClick={() => setActivityFilter(activityFilter === t ? 'ALL' : t)}>{typeLabel(t)}</Chip>
              ))}
            </span>
          </div>

          {/* Tabela (desktop) */}
          <div className="hidden overflow-x-auto rounded-[20px] bg-surface px-2 pb-1 pt-4 lg:block">
            {list.length === 0 ? (
              <EmptyState>Nenhuma atividade com esses filtros.</EmptyState>
            ) : (
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="text-[12px] font-bold text-text-3">
                    {['Atividade', 'Palestrante', 'Local', 'Lotação', 'Pontos', 'Presença'].map((h) => <th key={h} className="px-3 pb-3 font-bold">{h}</th>)}
                    <th className="px-3 pb-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((act) => (
                    <tr key={act.id} className="border-t border-line align-middle" style={{ opacity: liveStatus(act, now) === 'past' ? 0.6 : 1 }}>
                      <td className="max-w-[300px] px-3 py-4">
                        <TypeTag type={act.type} />
                        <button type="button" onClick={() => onEdit(act)} className="mt-1 block text-left text-[15px] font-bold leading-snug text-text hover:text-link">{act.title}</button>
                        <span className="mt-0.5 block text-[13px] text-text-2">{whenOf(act)}</span>
                      </td>
                      <td className="max-w-[170px] px-3 py-4 text-[14px] text-text-2">{speakerOf(act)}</td>
                      <td className="max-w-[150px] px-3 py-4 text-[14px] text-text-2">{locationOf(act)}</td>
                      <td className="px-3 py-4"><Capacity act={act} /></td>
                      <td className="px-3 py-4"><span className="pts-chip text-[13px]">+{act.points || 50}</span></td>
                      <td className="px-3 py-4"><PresenceTag act={act} /></td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <span className="inline-flex gap-1.5">
                          <button type="button" aria-label={`Abrir telão de ${act.title}`} title="Abrir telão" className={ICON_BTN} onClick={() => onTelao(act)}><Monitor size={16} aria-hidden="true" /></button>
                          <button type="button" aria-label={`Editar ${act.title}`} title="Editar" className={ICON_BTN} onClick={() => onEdit(act)}><Pencil size={16} aria-hidden="true" /></button>
                          <MoreMenu items={menuFor(act)} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cartões (celular) */}
          <div className="flex flex-col gap-3 lg:hidden">
            {list.length === 0 && <EmptyState>Nenhuma atividade nesse dia.</EmptyState>}
            {list.map((act) => {
              const live = liveStatus(act, now) === 'live';
              return (
                <article key={act.id} className="relative overflow-hidden rounded-[18px] bg-surface p-4 pl-[18px]" style={{ background: live ? '#161F45' : undefined, opacity: liveStatus(act, now) === 'past' ? 0.6 : 1 }}>
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: typeColor(act.type) }} />
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold" style={{ color: typeColor(act.type) }}>{typeLabel(act.type)}</span>
                        {live && <span className="rounded-lg bg-[rgba(111,216,166,0.14)] px-2 py-0.5 text-[12px] font-bold text-ok">Agora</span>}
                      </span>
                      <button type="button" onClick={() => onEdit(act)} className="mt-1.5 block text-left text-[16px] font-bold leading-snug text-text">{act.title}</button>
                      <span className="mt-1 block text-[14px] text-text-2">{startTime(act)} · {locationOf(act)}</span>
                    </div>
                    <MoreMenu items={[{ label: 'Abrir telão', icon: Monitor, onClick: () => onTelao(act) }, { label: 'Editar', icon: Pencil, onClick: () => onEdit(act) }, ...menuFor(act)]} />
                  </div>
                  <div className="mt-3.5 flex items-center gap-3">
                    <span className="flex-1"><Capacity act={act} compact /></span>
                    <PresenceTag act={act} />
                  </div>
                </article>
              );
            })}
          </div>

          <button type="button" onClick={onNew} className={btn('action', 'fixed bottom-[88px] right-5 z-30 h-14 rounded-full px-6 text-[16px] shadow-[0_12px_30px_rgba(61,80,230,0.45)] lg:hidden')}>
            <Plus size={20} aria-hidden="true" /> Nova
          </button>
        </>
      )}

      {progTab === 'convidados' && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-2.5">
            <label className="min-w-[220px] flex-1 lg:max-w-[320px]">
              <span className="sr-only">Buscar palestrante</span>
              <input type="search" className="field" placeholder="Buscar palestrante" value={speakerSearch} onChange={(e) => setSpeakerSearch(e.target.value)} />
            </label>
            <label>
              <span className="sr-only">Classificação</span>
              <select className="field !w-auto" value={speakerClassificationFilter} onChange={(e) => setSpeakerClassificationFilter(e.target.value)}>
                <option value="ALL">Todas as classificações</option>
                {classifications.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <button type="button" className={btn('action', 'ml-auto')} onClick={onNewSpeaker}><Plus size={18} aria-hidden="true" /> Novo palestrante</button>
          </div>
          {filteredSpeakers.length === 0 ? <EmptyState>Nenhum palestrante encontrado.</EmptyState> : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {filteredSpeakers.map((spk) => {
                const color = CLASS_COLORS[spk.classification] || CLASS_COLORS['Convidado Externo'];
                const social = spk.socialLinks && !Array.isArray(spk.socialLinks) && typeof spk.socialLinks === 'object'
                  ? spk.socialLinks
                  : { linkedin: spk.socialLinks?.[0], github: spk.socialLinks?.[1], instagram: spk.socialLinks?.[2] };
                return (
                  <article key={spk.id} className="flex flex-col gap-3 rounded-[18px] bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <img src={spk.photo || photoFallback} alt="" className="h-[52px] w-[52px] rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold">{spk.name}</div>
                        <div className="truncate text-[13px] text-text-2">{spk.role || spk.institution}</div>
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color }}>
                          <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
                          {spk.classification || 'Convidado Externo'}
                        </span>
                      </div>
                    </div>
                    {spk.bio && <p className="m-0 line-clamp-2 text-[13px] leading-snug text-text-2">{spk.bio}</p>}
                    <div className="mt-auto flex items-center justify-between border-t border-line pt-2.5">
                      <span className="flex gap-1">
                        {social.linkedin && <a href={social.linkedin} target="_blank" rel="noreferrer" aria-label={`LinkedIn de ${spk.name}`} className={`${ICON_BTN} bg-transparent text-[#8FA0FF]`}><LinkedinIcon size={16} /></a>}
                        {social.github && <a href={social.github} target="_blank" rel="noreferrer" aria-label={`GitHub de ${spk.name}`} className={`${ICON_BTN} bg-transparent`}><GithubIcon size={16} /></a>}
                        {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label={`Instagram de ${spk.name}`} className={`${ICON_BTN} bg-transparent text-[#F59AC0]`}><InstagramIcon size={16} /></a>}
                      </span>
                      <span className="flex gap-1.5">
                        <button type="button" className={ICON_BTN} aria-label={`Editar ${spk.name}`} title="Editar" onClick={() => onEditSpeaker(spk)}><Pencil size={16} aria-hidden="true" /></button>
                        <button type="button" className={`${ICON_BTN} text-err`} aria-label={`Excluir ${spk.name}`} title="Excluir" onClick={() => onDeleteSpeaker(spk.id, spk.name)}><Trash2 size={16} aria-hidden="true" /></button>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {progTab === 'locais' && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="m-0 text-[14px] text-text-2">Salas e espaços onde as atividades acontecem.</p>
            <button type="button" className={btn('action')} onClick={onNewLocation}><Plus size={18} aria-hidden="true" /> Novo local</button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center gap-3 rounded-[18px] bg-surface p-4">
                <MapPin size={18} aria-hidden="true" className="shrink-0 text-link" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">{loc.name}</span>
                  <span className="block text-[13px] text-text-2">{loc.capacity} lugares</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

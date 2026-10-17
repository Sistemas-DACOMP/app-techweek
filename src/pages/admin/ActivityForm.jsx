import { useMemo, useState } from 'react';
import { Check, AlertTriangle, X, Plus, ArrowRight, Trash2, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import Mascot from '../../components/Mascot';
import { btn, ICON_BTN, Section, Field, Stepper, SwitchRow, EVENT_DAYS, dayLabel, typeColor, typeLabel, initials } from './ui';

/* 2.03 Nova atividade (desktop) e 2.10/2.11 (celular, 2 etapas). Mesmo formulário e mesmo salvar de antes;
   a apresentação virou página com prévia ao vivo. */

const FORM_ID = 'adm-activity-form';
const toMin = (t = '') => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

function durationLabel(start, end) {
  const d = toMin(end) - toMin(start);
  if (!start || !end || d <= 0) return null;
  const h = Math.floor(d / 60); const m = d % 60;
  return `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''} de duração`;
}

function findConflict(activities, editingId, row) {
  if (!row?.date || !row.location || !row.startTime) return null;
  const s = toMin(row.startTime); const e = toMin(row.endTime || row.startTime);
  for (const a of activities) {
    if (a.id === editingId) continue;
    const sessions = a.schedule?.length ? a.schedule : [{ date: a.date, startTime: a.time, endTime: a.endTime, location: a.location }];
    for (const x of sessions) {
      if ((x.date || a.date) !== row.date || (x.location || a.location) !== row.location) continue;
      const xs = toMin(x.startTime || x.time || a.time); const xe = toMin(x.endTime || a.endTime || x.startTime);
      if (s < xe && xs < e) return { act: a, start: x.startTime || x.time || a.time, end: x.endTime || a.endTime };
    }
  }
  return null;
}

function AgendaPreview({ form, speakersSel = [] }) {
  const row = form.scheduleRows[0] || {};
  const color = typeColor(form.type);
  const isLocked = !form.isOpenEvent;
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-surface p-4 pl-5">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      {isLocked && (
        <Lock
          size={76}
          strokeWidth={1.5}
          className="pointer-events-none absolute -bottom-3 -left-2 text-[rgba(245,158,11,0.07)]"
          aria-hidden="true"
        />
      )}
      <div className="flex items-center justify-between text-[13px] font-extrabold">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{typeLabel(form.type)}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
            form.isOpenEvent ? 'bg-ok/15 text-ok' : 'bg-gold/15 text-gold'
          }`}>
            {form.isOpenEvent ? 'Entrada Livre' : 'Passaporte Completo'}
          </span>
        </div>
        <span className="text-you-text">+{Number(form.points) || 0} pts</span>
      </div>
      <div className="mt-1.5 text-[17px] font-extrabold leading-snug">{form.title || 'Título da atividade'}</div>
      <div className="mt-2 text-[14px] text-text-2">
        {dayLabel(row.date)} · {row.startTime}{row.endTime ? ` – ${row.endTime}` : ''}
        <span className="ml-3">{row.location}</span>
      </div>
      {speakersSel.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          {speakersSel.length > 1 && (
            <div className="flex -space-x-1.5 overflow-hidden">
              {speakersSel.slice(0, 3).map((s, i) => (
                s.photo ? (
                  <img key={i} src={s.photo} alt="" className="inline-block h-6 w-6 rounded-full ring-2 ring-surface object-cover" />
                ) : (
                  <span key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#2A3570] text-[9px] font-black text-text ring-2 ring-surface">
                    {initials(s.name)}
                  </span>
                )
              ))}
            </div>
          )}
          <div className="truncate text-[13px] font-medium text-text-3">
            {speakersSel.map((s) => s.name).filter(Boolean).join(', ')}
          </div>
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between text-[14px]">
        <span className="font-bold text-link">{form.requiresRegistration ? 'Reservar vaga' : 'Entrada livre'}</span>
        <span className="text-text-2">{form.hasCapacityLimit ? `${form.capacity} vagas` : 'Sem limite'}</span>
      </div>
    </div>
  );
}

function OpenPreview({ form, speakersSel = [] }) {
  const row = form.scheduleRows[0] || {};
  return (
    <div className="overflow-hidden rounded-[18px] bg-surface">
      <div className="p-4" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(124,58,237,0.35))' }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[12px] font-bold">{typeLabel(form.type)}</span>
          <span className={`rounded-lg px-2 py-0.5 text-[12px] font-bold ${
            form.isOpenEvent ? 'bg-ok/20 text-ok' : 'bg-gold/20 text-gold'
          }`}>
            {form.isOpenEvent ? 'Entrada Livre' : 'Passaporte Completo'}
          </span>
          <span className="pts-chip">+{Number(form.points) || 0} pts</span>
        </div>
        <div className="mt-2 text-[19px] font-extrabold leading-snug">{form.title || 'Título da atividade'}</div>
        <div className="mt-1 text-[14px] text-text-2">{dayLabel(row.date)} · {row.startTime}{row.endTime ? ` – ${row.endTime}` : ''} · {row.location}</div>
      </div>
      <div className="p-4">
        <p className="m-0 text-[14px] leading-normal text-text-2">{form.description || 'Descrição da atividade.'}</p>
        {speakersSel.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5 border-t border-line pt-3">
            <span className="text-[12px] font-extrabold uppercase text-text-3">Palestrantes convidados ({speakersSel.length})</span>
            {speakersSel.map((s, idx) => (
              <div key={s.id || idx} className="flex items-center gap-2.5">
                {s.photo ? (
                  <img src={s.photo} alt="" className="h-9 w-9 rounded-full border border-line-2 object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2A3570] text-[12px] font-extrabold text-text">
                    {initials(s.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <span className="block truncate text-[14px] font-bold text-text">{s.name || 'Nome do Palestrante'}</span>
                  {s.role && <span className="block truncate text-[12px] text-text-3">{s.role}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Checklist({ items, mascot }) {
  return (
    <section className="flex gap-3 rounded-[20px] bg-surface p-5">
      {mascot && <Mascot style={{ width: 52, height: 52, animation: 'none', flexShrink: 0 }} />}
      <div className="min-w-0 flex-1">
        <h2 className="m-0 mb-2 text-[16px] font-extrabold">Antes de publicar</h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {items.map(({ ok, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-[14px] text-text">
              {ok ? <Check size={18} aria-hidden="true" className="mt-px shrink-0 text-ok" /> : <AlertTriangle size={18} aria-hidden="true" className="mt-px shrink-0 text-warn" />}
              <span><span className="sr-only">{ok ? 'Ok: ' : 'Atenção: '}</span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function ActivityForm({ form, setForm, editingId, types, speakers, locations, activities, onSubmit, onCancel, onNewSpeaker, onDelete }) {
  const [step, setStep] = useState(1);
  const [previewTab, setPreviewTab] = useState('agenda');
  const [spkQuery, setSpkQuery] = useState('');
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const rows = form.scheduleRows;
  const row0 = rows[0] || {};
  const setRow = (idx, patch) => setForm((prev) => {
    const scheduleRows = prev.scheduleRows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    return { ...prev, scheduleRows, location: idx === 0 && patch.location ? patch.location : prev.location };
  });
  const addRow = () => setForm((prev) => ({
    ...prev,
    isMultiSession: true,
    scheduleRows: [...prev.scheduleRows, { date: EVENT_DAYS[Math.min(prev.scheduleRows.length, EVENT_DAYS.length - 1)].date, startTime: '14:00', endTime: '15:30', location: prev.scheduleRows[0]?.location || 'Anfiteatro FACOM' }],
  }));
  const removeRow = (idx) => setForm((prev) => {
    const scheduleRows = prev.scheduleRows.filter((_, i) => i !== idx);
    return { ...prev, scheduleRows, isMultiSession: scheduleRows.length > 1 };
  });

  // Inicialização da lista dinâmica de palestrantes
  const initialSpeakersList = useMemo(() => {
    if (Array.isArray(form.speakersList) && form.speakersList.length > 0) {
      return form.speakersList;
    }
    if (Array.isArray(form.selectedSpeakerIds) && form.selectedSpeakerIds.length > 0) {
      const fromIds = form.selectedSpeakerIds.map((id) => {
        const s = speakers.find((x) => x.id === id);
        return s ? { id: s.id, name: s.name, role: s.role || s.institution || '', photo: s.photo || '', bio: s.bio || '' } : null;
      }).filter(Boolean);
      if (fromIds.length > 0) return fromIds;
    }
    if (form.speakerName || form.speaker) {
      return [{
        id: form.speakerId || `spk_${Date.now()}`,
        name: form.speakerName || form.speaker,
        role: form.speakerRole || '',
        photo: form.speakerPhoto || '',
        bio: ''
      }];
    }
    return [];
  }, []);

  const [speakersList, setSpeakersList] = useState(initialSpeakersList);

  const updateSpeakers = (newList) => {
    setSpeakersList(newList);
    const names = newList.map((s) => s.name).filter(Boolean);
    const ids = newList.map((s) => s.id).filter(Boolean);
    setForm((prev) => ({
      ...prev,
      speakersList: newList,
      selectedSpeakerIds: ids,
      speaker: names.join(', '),
      speakerName: names[0] || '',
      speakerRole: newList[0]?.role || '',
      speakerPhoto: newList[0]?.photo || '',
      speakerId: newList[0]?.id || ''
    }));
  };

  const addEmptySpeaker = () => {
    const newSpk = {
      id: `spk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      role: '',
      photo: '',
      bio: ''
    };
    updateSpeakers([...speakersList, newSpk]);
  };

  const addExistingSpeaker = (s) => {
    if (speakersList.some((x) => x.id === s.id)) return;
    const newSpk = {
      id: s.id,
      name: s.name,
      role: s.role || s.institution || '',
      photo: s.photo || '',
      bio: s.bio || ''
    };
    updateSpeakers([...speakersList, newSpk]);
    setSpkQuery('');
  };

  const updateSpeakerField = (index, field, value) => {
    const updated = speakersList.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    updateSpeakers(updated);
  };

  const moveSpeaker = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= speakersList.length) return;
    const item = speakersList[fromIndex];
    const updated = [...speakersList];
    updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    updateSpeakers(updated);
  };

  const removeSpeaker = (index) => {
    const updated = speakersList.filter((_, i) => i !== index);
    updateSpeakers(updated);
  };

  const matches = spkQuery.trim()
    ? speakers.filter((s) => !speakersList.some((x) => x.id === s.id) && `${s.name} ${s.institution || ''} ${s.role || ''}`.toLowerCase().includes(spkQuery.toLowerCase())).slice(0, 6)
    : [];

  const conflict = useMemo(() => findConflict(activities, editingId, row0), [activities, editingId, row0]);
  const room = locations.find((l) => l.name === row0.location);
  const dayOptions = EVENT_DAYS.some((d) => d.date === row0.date) || !row0.date ? EVENT_DAYS : [{ date: row0.date, wd: dayLabel(row0.date).split(' ')[0].toLowerCase(), label: dayLabel(row0.date) }, ...EVENT_DAYS];
  const dur = durationLabel(row0.startTime, row0.endTime);

  const checklist = [
    { ok: !!(form.title && form.description), text: 'Título, tipo e descrição' },
    { ok: !!(row0.date && dur), text: 'Dia e horário' },
    conflict ? { ok: false, text: `Conflito de sala no ${row0.location}` } : { ok: true, text: 'Sala livre no horário' },
    speakersList.length === 0 ? { ok: false, text: 'Nenhum palestrante escolhido' } : speakersList.some((s) => !s.photo) ? { ok: false, text: 'Palestrante sem foto' } : { ok: true, text: 'Palestrante com foto' },
  ];

  const title = editingId ? 'Editar atividade' : 'Nova atividade';
  const submitLabel = editingId ? 'Salvar alterações' : 'Publicar';

  return (
    <>
      {/* Cabeçalho (desktop) */}
      <div className="mb-6 hidden items-end gap-3 lg:flex">
        <div className="flex-1">
          <div className="text-[13px] text-text-2">
            <button type="button" onClick={onCancel} className="font-semibold text-link">Programação</button> / {title}
          </div>
          <h1 className="m-0 mt-1.5 text-[28px] font-extrabold">{title}</h1>
        </div>
        {editingId && onDelete && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-err/30 bg-err/10 px-4 text-[14px] font-bold text-err transition-colors hover:bg-err/20"
            onClick={() => onDelete(editingId, form.title)}
          >
            <Trash2 size={16} aria-hidden="true" /> Excluir atividade
          </button>
        )}
        <button type="button" className={btn('quiet')} onClick={onCancel}>Cancelar</button>
        <button type="submit" form={FORM_ID} className={btn('action')}><Check size={18} aria-hidden="true" /> {submitLabel}</button>
      </div>

      {/* Etapa (celular) */}
      <div className="-mt-2 mb-4 lg:hidden">
        <p className="m-0 text-center text-[13px] font-bold text-link">Etapa {step} de 2 · {step === 1 ? 'Dados' : 'Como fica no app'}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5" aria-hidden="true">
          <span className="h-1 rounded-full bg-action" />
          <span className={`h-1 rounded-full ${step === 2 ? 'bg-action' : 'bg-surface-raised'}`} />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form id={FORM_ID} onSubmit={onSubmit} className={`flex-col gap-4 ${step === 1 ? 'flex' : 'hidden lg:flex'}`}>
          <Section title="Sobre a atividade" subtitle="O que o participante vê primeiro.">
            <div className="flex flex-col gap-4">
              <Field label="Título">
                {(id) => <input id={id} className="field" required value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Arquitetura Serverless com Firebase" />}
              </Field>
              <fieldset className="m-0 border-0 p-0">
                <legend className="field-label">Tipo</legend>
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => {
                    const sel = form.type === t;
                    return (
                      <button key={t} type="button" aria-pressed={sel} onClick={() => set({ type: t })}
                        className={`press inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] px-3.5 text-[14px] font-bold ${sel ? 'border-link bg-surface-selected text-text' : 'border-line-2 text-text-2'}`}>
                        <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: typeColor(t) }} /> {typeLabel(t)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Field label="Descrição" aside={<span className="text-[13px] text-text-3">{(form.description || '').length}/400</span>}>
                {(id) => <textarea id={id} rows={3} maxLength={400} className="field resize-y py-3 leading-normal" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="O que a pessoa vai aprender ou fazer." />}
              </Field>
            </div>
          </Section>

          <Section title="Data e horário" subtitle="O evento acontece de 21 a 26 de outubro.">
            <fieldset className="m-0 border-0 p-0">
              <legend className="field-label">Dia</legend>
              <div className="adm-noscroll -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-6 lg:px-0">
                {dayOptions.map((d) => {
                  const sel = row0.date === d.date;
                  return (
                    <button key={d.date} type="button" aria-pressed={sel} onClick={() => setRow(0, { date: d.date })}
                      className={`press flex min-w-[70px] shrink-0 flex-col items-center rounded-xl border-[1.5px] py-2 ${sel ? 'border-transparent bg-action text-white' : 'border-line-2 text-text'}`}>
                      <span className={`text-[12px] ${sel ? 'text-white/80' : 'text-text-3'}`}>{d.wd}</span>
                      <span className="text-[19px] font-extrabold leading-tight">{d.date.slice(8)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-4 grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <Field label="Início">{(id) => <input id={id} type="time" className="field font-bold" value={row0.startTime || ''} onChange={(e) => setRow(0, { startTime: e.target.value })} />}</Field>
              <Field label="Término">{(id) => <input id={id} type="time" className="field font-bold" value={row0.endTime || ''} onChange={(e) => setRow(0, { endTime: e.target.value })} />}</Field>
              <span className="col-span-2 inline-flex min-h-[50px] items-center justify-self-start rounded-xl bg-surface-raised px-3.5 text-[14px] font-bold lg:col-span-1" style={{ color: dur ? 'var(--text)' : 'var(--err)' }}>
                {dur || 'Término antes do início'}
              </span>
            </div>

            {rows.slice(1).map((r, i) => (
              <div key={i + 1} className="mt-4 rounded-2xl bg-surface-raised p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-text-2">Sessão {i + 2}</span>
                  <button type="button" aria-label={`Remover sessão ${i + 2}`} className={`${ICON_BTN} h-11 w-11 bg-transparent text-err`} onClick={() => removeRow(i + 1)}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  <Field label="Dia">{(id) => <input id={id} type="date" className="field" value={r.date || ''} onChange={(e) => setRow(i + 1, { date: e.target.value })} />}</Field>
                  <Field label="Local">{(id) => (
                    <select id={id} className="field" value={r.location || ''} onChange={(e) => setRow(i + 1, { location: e.target.value })}>
                      {locations.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  )}</Field>
                  <Field label="Início">{(id) => <input id={id} type="time" className="field" value={r.startTime || ''} onChange={(e) => setRow(i + 1, { startTime: e.target.value })} />}</Field>
                  <Field label="Término">{(id) => <input id={id} type="time" className="field" value={r.endTime || ''} onChange={(e) => setRow(i + 1, { endTime: e.target.value })} />}</Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={addRow} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-link">
              <Plus size={16} aria-hidden="true" /> Adicionar outro dia ou horário
            </button>
          </Section>

          <Section title="Local e palestrante" subtitle="Avisamos se a sala já estiver ocupada.">
            <Field label="Local" hint={room ? `A sala comporta ${room.capacity}` : null}>
              {(id) => (
                <select id={id} className="field font-bold" value={row0.location || form.location || ''} onChange={(e) => { const loc = e.target.value; setRow(0, { location: loc }); const locObj = locations.find(l => l.name === loc); if (locObj && locObj.capacity) { set({ capacity: locObj.capacity }); } }}>
                  {locations.map((l) => <option key={l.id} value={l.name}>{l.name} · {l.capacity} lugares</option>)}
                </select>
              )}
            </Field>
            {conflict && (
              <p role="status" className="m-0 mt-2.5 flex gap-2.5 rounded-xl border-l-[3px] border-warn bg-[#10172F] px-3.5 py-3 text-[14px] leading-snug text-text-2">
                <AlertTriangle size={18} aria-hidden="true" className="mt-px shrink-0 text-warn" />
                <span>O {row0.location} já tem <strong className="text-text">{conflict.act.title}</strong> das {conflict.start}{conflict.end ? ` às ${conflict.end}` : ''} neste dia. Escolha outro horário ou local.</span>
              </p>
            )}
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="m-0 text-[15px] font-bold text-text">Palestrantes e Convidados ({speakersList.length})</h3>
                  <p className="m-0 text-[12px] text-text-3">Adicione um ou mais palestrantes para esta atividade</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addEmptySpeaker}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-line-2 bg-surface-raised px-3 py-1.5 text-[13px] font-bold text-text hover:border-link hover:text-link"
                  >
                    <Plus size={15} aria-hidden="true" /> + Convidado Personalizado
                  </button>
                </div>
              </div>

              {/* Seletor rápido de convidados da base */}
              <div className="relative">
                <div className="rounded-xl border-[1.5px] border-field-line bg-field p-2 focus-within:border-link">
                  <input
                    value={spkQuery}
                    onChange={(e) => setSpkQuery(e.target.value)}
                    placeholder="Buscar e vincular convidado cadastrado na base..."
                    autoComplete="off"
                    className="w-full border-0 bg-transparent px-2 text-[14px] text-text outline-none placeholder:text-text-4"
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-20 m-0 mt-1 max-h-56 list-none overflow-y-auto rounded-xl border border-line-2 bg-surface-selected p-1.5 shadow-xl">
                    {matches.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => addExistingSpeaker(s)}
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-raised"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2A3570] text-[12px] font-extrabold text-white">
                            {s.photo ? (
                              <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                            ) : (
                              initials(s.name)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-bold text-text">{s.name}</span>
                            <span className="block truncate text-[12px] text-text-3">{s.institution || s.role || 'Convidado'}</span>
                          </div>
                          <span className="text-[12px] font-bold text-link">+ Vincular</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {spkQuery.trim() && matches.length === 0 && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2 text-[13px] text-text-3">
                    <span>Nenhum palestrante cadastrado encontrado.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newSpk = {
                          id: `spk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                          name: spkQuery.trim(),
                          role: '',
                          photo: '',
                          bio: ''
                        };
                        updateSpeakers([...speakersList, newSpk]);
                        setSpkQuery('');
                      }}
                      className="font-bold text-link hover:underline"
                    >
                      Adicionar "{spkQuery.trim()}"
                    </button>
                  </div>
                )}
              </div>

              {/* Lista dinâmica de palestrantes */}
              {speakersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 bg-surface/40 p-6 text-center">
                  <p className="m-0 text-[14px] text-text-3">Nenhum palestrante adicionado ainda.</p>
                  <p className="m-0 mt-1 text-[12px] text-text-4">Busque acima ou clique para adicionar manualmente.</p>
                  <button
                    type="button"
                    onClick={addEmptySpeaker}
                    className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-action px-3.5 py-1.5 text-[13px] font-bold text-white hover:opacity-90"
                  >
                    <Plus size={15} aria-hidden="true" /> Adicionar Palestrante
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {speakersList.map((spk, idx) => (
                    <div
                      key={spk.id || idx}
                      className="rounded-2xl border border-line-2 bg-surface-raised p-4 transition-all hover:border-link/40"
                    >
                      {/* Top bar do card: Avatar + Ordem + Ações */}
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-2 bg-[#2A3570] text-[13px] font-bold text-white">
                            {spk.photo ? (
                              <img src={spk.photo} alt={spk.name || 'Palestrante'} className="h-full w-full object-cover" />
                            ) : (
                              initials(spk.name || '?')
                            )}
                          </div>
                          <div>
                            <span className="text-[12px] font-extrabold uppercase tracking-wide text-text-3">
                              Palestrante #{idx + 1} {idx === 0 ? '· Principal' : ''}
                            </span>
                            <div className="text-[14px] font-bold text-text truncate max-w-[200px] sm:max-w-[280px]">
                              {spk.name || 'Nome não preenchido'}
                            </div>
                          </div>
                        </div>

                        {/* Botões de reordenação e exclusão */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Subir na ordem"
                            disabled={idx === 0}
                            onClick={() => moveSpeaker(idx, idx - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:bg-surface-selected hover:text-text disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronUp size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            title="Descer na ordem"
                            disabled={idx === speakersList.length - 1}
                            onClick={() => moveSpeaker(idx, idx + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:bg-surface-selected hover:text-text disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronDown size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            title="Remover palestrante"
                            onClick={() => removeSpeaker(idx)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-err/80 hover:bg-err/10 hover:text-err"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Inputs do palestrante */}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            value={spk.name || ''}
                            onChange={(e) => updateSpeakerField(idx, 'name', e.target.value)}
                            placeholder="Ex: Dra. Ana Paula Costa"
                            className="w-full rounded-xl border border-field-line bg-field px-3 py-2 text-[14px] text-text outline-none focus:border-link"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
                            Cargo / Empresa / Instituição
                          </label>
                          <input
                            type="text"
                            value={spk.role || ''}
                            onChange={(e) => updateSpeakerField(idx, 'role', e.target.value)}
                            placeholder="Ex: Staff Engineer · Nubank"
                            className="w-full rounded-xl border border-field-line bg-field px-3 py-2 text-[14px] text-text outline-none focus:border-link"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
                            URL da Foto (Avatar)
                          </label>
                          <input
                            type="url"
                            value={spk.photo || ''}
                            onChange={(e) => updateSpeakerField(idx, 'photo', e.target.value)}
                            placeholder="https://... link da foto pública"
                            className="w-full rounded-xl border border-field-line bg-field px-3 py-2 text-[14px] text-text outline-none focus:border-link"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
                            Mini-Bio / Apresentação
                          </label>
                          <textarea
                            rows={2}
                            value={spk.bio || ''}
                            onChange={(e) => updateSpeakerField(idx, 'bio', e.target.value)}
                            placeholder="Breve resumo da trajetória ou especialidade do palestrante..."
                            className="w-full resize-y rounded-xl border border-field-line bg-field px-3 py-2 text-[13px] text-text outline-none focus:border-link"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section title="Vagas, pontos e presença" subtitle="Regras de reserva e pontuação.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Stepper label="Vagas" value={form.capacity} min={1} disabled={!form.hasCapacityLimit} onChange={(v) => set({ capacity: v })} hint={room ? `A sala comporta ${room.capacity}` : null} />
              <Stepper label="Pontos" value={form.points} step={5} onChange={(v) => set({ points: v })} hint="Creditados na presença" />
            </div>
            <div className="mt-2 border-t border-line">
              <SwitchRow title="Limite de vagas" hint="Desligado, a atividade não tem lotação." checked={form.hasCapacityLimit} onChange={(v) => set({ hasCapacityLimit: v })} />
              <SwitchRow title="Exige inscrição no app" hint="A pessoa reserva a vaga antes de entrar." checked={form.requiresRegistration} onChange={(v) => set({ requiresRegistration: v })} />
              <SwitchRow title="Entrada Livre (Não exige Passaporte Completo)" hint="Qualquer participante cadastrado no app pode se inscrever, mesmo sem Passaporte Completo." checked={form.isOpenEvent} onChange={(v) => set({ isOpenEvent: v })} />
            </div>
            <fieldset className="m-0 mt-3 border-0 p-0">
              <legend className="field-label">Como a presença é confirmada</legend>
              <div className="grid gap-2.5 lg:grid-cols-2">
                {[
                  { v: 'SELF_SCAN', t: 'Só QR do telão', d: 'O participante lê o QR projetado na sala.' },
                  { v: 'DOUBLE_CHECK', t: 'Em 2 etapas', d: 'A Staff registra a entrada na porta e o participante lê o telão antes de sair.' },
                ].map((o) => {
                  const sel = (form.attendanceMode || 'SELF_SCAN') === o.v;
                  return (
                    <label key={o.v} className={`flex cursor-pointer gap-3 rounded-2xl border-[1.5px] p-3.5 ${sel ? 'border-link bg-surface-selected' : 'border-line-2'}`}>
                      <input type="radio" name="attendanceMode" value={o.v} checked={sel} onChange={() => set({ attendanceMode: o.v })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#3D50E6]" />
                      <span>
                        <span className="block text-[15px] font-bold">{o.t}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-text-2">{o.d}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Section>
        </form>

        {/* Prévia */}
        <div className={`flex-col gap-4 lg:sticky lg:top-5 ${step === 2 ? 'flex' : 'hidden lg:flex'}`}>
          <section className="rounded-[20px] bg-surface p-5 lg:bg-surface">
            <h2 className="m-0 mb-3.5 text-[16px] font-extrabold">Como aparece no app</h2>
            <div className="ds-tabs mb-3.5 bg-bg lg:hidden" role="tablist" aria-label="Prévia">
              <button type="button" role="tab" className="ds-tab" aria-selected={previewTab === 'agenda'} onClick={() => setPreviewTab('agenda')}>Na agenda</button>
              <button type="button" role="tab" className="ds-tab" aria-selected={previewTab === 'aberta'} onClick={() => setPreviewTab('aberta')}>Ao abrir</button>
            </div>
            <div className="rounded-[18px] bg-bg p-2.5">
              <div className={previewTab === 'aberta' ? 'hidden lg:block' : ''}><AgendaPreview form={form} speakersSel={speakersList} /></div>
              <div className={`lg:hidden ${previewTab === 'aberta' ? '' : 'hidden'}`}><OpenPreview form={form} speakersSel={speakersList} /></div>
            </div>
          </section>
          <div className="hidden lg:block"><Checklist items={checklist} /></div>
          <div className="lg:hidden"><Checklist items={checklist} mascot /></div>
        </div>
      </div>

      {/* Rodapé fixo (celular) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-nav px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        {step === 1 ? (
          <>
            {editingId && onDelete && (
              <button
                type="button"
                className="inline-flex h-[52px] items-center justify-center rounded-xl border border-err/30 bg-err/10 px-4 text-[14px] font-bold text-err"
                onClick={() => onDelete(editingId, form.title)}
                title="Excluir atividade"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )}
            <button type="button" className={btn('action', 'h-[52px] flex-1 text-[16px]')} onClick={() => { setStep(2); window.scrollTo(0, 0); }}>
              Ver prévia <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btn('secondary', 'h-[52px] px-6')} onClick={() => { setStep(1); window.scrollTo(0, 0); }}>Editar</button>
            <button type="submit" form={FORM_ID} className={btn('action', 'h-[52px] flex-1 text-[16px]')}><Check size={18} aria-hidden="true" /> {editingId ? 'Salvar alterações' : 'Publicar atividade'}</button>
          </>
        )}
      </div>
    </>
  );
}

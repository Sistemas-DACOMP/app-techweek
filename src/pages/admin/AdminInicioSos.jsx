import { useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Plus, Wrench, CheckCircle2, MessageSquare, Send, ShieldAlert, X, Building2, ShieldCheck, Home, ChevronRight } from 'lucide-react';
import { btn, isoToday } from './ui';
import {
  getRoomIncidents,
  dispatchIncidentSupport,
  resolveIncident,
  createRoomIncident,
} from '../../lib/liveOpsService';
import {
  getTickets,
  updateTicketStatus,
  addTicketNote,
  createTicket,
  TICKETS_UPDATED_EVENT,
} from '../../lib/ticketService';

/* Central de apoio e chamados SOS (Visão geral, desktop e celular): quadro de 3 colunas.
   Dados e regras vêm de liveOpsService (salas) e ticketService (patrocinador/staff), sem mudança de contrato. */

const INCIDENTS_UPDATED_EVENT = 'techweek_incidents_updated';

const ORIGINS = {
  ROOM: { label: () => 'Sala FACOM', color: 'var(--cat-workshop)', icon: Home },
  SPONSOR: { label: (n) => `Patrocinador · ${n}`, color: 'var(--role-patrocinador)', icon: Building2 },
  STAFF: { label: (n) => `Staff · ${n}`, color: 'var(--role-staff)', icon: ShieldCheck },
};

const COLUMNS = [
  { key: 'open', label: 'Aguardando', color: 'var(--warn)' },
  { key: 'dispatched', label: 'Suporte a caminho', color: 'var(--link)' },
  { key: 'resolved', label: 'Resolvidos hoje', color: 'var(--ok)' },
];

const FILTERS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'SPONSOR', label: 'Patrocinadores' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'ROOM', label: 'Salas FACOM' },
];

function ago(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
}

const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/* Une salas e chamados num formato só. Estados do ticketService: open | in_progress | resolved. */
function normalize(incidents, tickets) {
  const rooms = incidents.map((i) => ({
    id: i.id,
    isTicket: false,
    origin: 'ROOM',
    status: i.status,
    title: i.room,
    text: i.issue,
    who: i.technician,
    at: i.reportedAt,
    doneAt: i.resolvedAt,
    notes: [],
  }));
  const tix = tickets.map((t) => ({
    id: t.id,
    isTicket: true,
    origin: t.role === 'STAFF' ? 'STAFF' : 'SPONSOR',
    sender: t.senderName,
    status: t.status === 'in_progress' ? 'dispatched' : t.status === 'resolved' ? 'resolved' : 'open',
    title: t.location || (t.role === 'SPONSOR' ? 'Estande' : 'Portaria'),
    short: t.title,
    text: t.description || t.title,
    who: t.assignedTo,
    at: t.createdAt,
    doneAt: t.resolvedAt,
    notes: Array.isArray(t.notes) ? t.notes : [],
  }));
  return [...rooms, ...tix].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function ActionBtn({ tone, icon: Icon, children, ...rest }) {
  const tones = {
    quiet: 'bg-surface-raised text-text-2',
    link: 'bg-action/20 text-link',
    ok: 'bg-ok/15 text-ok',
  };
  return (
    <button type="button" className={`press inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold lg:min-h-[30px] ${tones[tone]}`} {...rest}>
      <Icon size={14} aria-hidden="true" className="shrink-0" /> {children}
    </button>
  );
}

function TicketCard({ item, color, reply, onToggleReply, onChangeReply, onSendReply, onDispatch, onResolve }) {
  const origin = ORIGINS[item.origin];
  const OriginIcon = origin.icon;
  const lastNote = item.notes[item.notes.length - 1];
  return (
    <article className="rounded-[14px] bg-[#10172F] p-3.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-[22px] min-w-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold" style={{ background: tint(origin.color), color: origin.color }}>
          <OriginIcon size={13} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{origin.label(item.sender || 'Estande')}</span>
        </span>
        <span className="whitespace-nowrap text-[11px] text-text-4">{ago(item.at)}</span>
      </div>
      <div className="mt-2.5 text-[14px] font-extrabold">{item.title}</div>
      <p className="m-0 mt-1 text-[13px] leading-[1.45] text-text-2">{item.text}</p>
      {item.who && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-text-3">
          <Wrench size={13} aria-hidden="true" className="shrink-0 text-link" />
          <span>Atendente: <b className="text-link">{item.who}</b></span>
        </div>
      )}
      {lastNote && (
        <div className="mt-2 rounded-lg bg-nav px-2.5 py-2 text-[12px] leading-[1.45] text-text-2">
          <b className="text-text">Última nota:</b> {lastNote.text}
        </div>
      )}
      {reply !== null && (
        <form className="mt-2.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); onSendReply(); }}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Mensagem para {item.sender || item.title}</span>
            <input
              type="text"
              autoFocus
              value={reply}
              onChange={(e) => onChangeReply(e.target.value)}
              placeholder="Escreva uma resposta"
              className="h-9 w-full rounded-lg border border-field-line bg-field px-2.5 text-[13px] text-text outline-none placeholder:text-text-4 focus:border-link"
            />
          </label>
          <button type="submit" disabled={!reply.trim()} className="press inline-flex h-9 items-center gap-1.5 rounded-lg bg-action px-3 text-[12px] font-bold text-white disabled:opacity-50">
            <Send size={13} aria-hidden="true" /> Enviar
          </button>
        </form>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.isTicket && (
          <ActionBtn tone="quiet" icon={MessageSquare} onClick={onToggleReply} aria-expanded={reply !== null}>
            {reply !== null ? 'Fechar' : 'Responder'}
          </ActionBtn>
        )}
        {item.status === 'open' && <ActionBtn tone="link" icon={Wrench} onClick={onDispatch}>Despachar</ActionBtn>}
        <ActionBtn tone="ok" icon={CheckCircle2} onClick={onResolve}>Resolver</ActionBtn>
      </div>
    </article>
  );
}

function ResolvedList({ items }) {
  const shown = items.slice(0, 4);
  return (
    <div className="rounded-[14px] bg-[#10172F] px-3.5 pb-3.5 pt-0.5">
      {shown.map((it) => (
        <div key={it.id} className="flex items-start gap-2.5 border-b border-line py-3 last:border-b-0">
          <CheckCircle2 size={18} aria-hidden="true" className="mt-px shrink-0 text-ok" />
          <span className="min-w-0">
            <span className="block text-[13px] font-bold">{it.short || it.text}</span>
            <span className="mt-0.5 block text-[12px] text-text-3">{[it.who || it.sender, ago(it.doneAt)].filter(Boolean).join(' · ')}</span>
          </span>
        </div>
      ))}
      {items.length > shown.length && (
        <div className="flex items-center gap-1 pt-3 text-[13px] font-bold text-text-3">+{items.length - shown.length} resolvidos hoje <ChevronRight size={14} aria-hidden="true" /></div>
      )}
    </div>
  );
}

export default function AdminInicioSos({ firstName }) {
  const [incidents, setIncidents] = useState(() => getRoomIncidents());
  const [tickets, setTickets] = useState(() => getTickets());
  const [filter, setFilter] = useState('ALL');
  const [replies, setReplies] = useState({}); // id -> texto; id ausente = campo fechado

  const [modalOpen, setModalOpen] = useState(false);
  const [origin, setOrigin] = useState('ROOM');
  const [room, setRoom] = useState('Anfiteatro FACOM');
  const [sender, setSender] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('alta');

  const refresh = () => { setTickets(getTickets()); setIncidents(getRoomIncidents()); };

  useEffect(() => {
    window.addEventListener(TICKETS_UPDATED_EVENT, refresh);
    window.addEventListener(INCIDENTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(TICKETS_UPDATED_EVENT, refresh);
      window.removeEventListener(INCIDENTS_UPDATED_EVENT, refresh);
    };
  }, []);

  const all = useMemo(() => normalize(incidents, tickets), [incidents, tickets]);
  const today = isoToday();
  // Resolvidos só contam no dia em que foram resolvidos.
  const board = all.filter((i) => i.status !== 'resolved' || (i.doneAt && isoToday(new Date(i.doneAt)) === today));
  const counts = { ALL: 0, SPONSOR: 0, STAFF: 0, ROOM: 0 };
  board.filter((i) => i.status !== 'resolved').forEach((i) => { counts.ALL += 1; counts[i.origin] += 1; });
  const visible = board.filter((i) => filter === 'ALL' || i.origin === filter);

  const dispatch = (it) => {
    if (it.isTicket) updateTicketStatus(it.id, 'in_progress', it.origin === 'SPONSOR' ? 'Responsável Patrocinadores (Rádio)' : 'Apoio Operacional (Rádio)');
    else dispatchIncidentSupport(it.id, 'Técnico de Plantão FACOM');
    refresh();
  };
  const resolve = (it) => {
    if (it.isTicket) updateTicketStatus(it.id, 'resolved');
    else resolveIncident(it.id);
    refresh();
  };
  const sendReply = (it) => {
    const text = (replies[it.id] || '').trim();
    if (!text) return;
    addTicketNote(it.id, { author: `Coordenação (${firstName || 'Admin'})`, text, isStaffOrAdmin: true });
    setReplies(({ [it.id]: _gone, ...rest }) => rest);
    refresh();
  };

  const pickOrigin = (key) => {
    setOrigin(key);
    setRoom(key === 'ROOM' ? 'Anfiteatro FACOM' : key === 'SPONSOR' ? 'Estande Principal' : 'Portaria / Scanner');
  };

  const createItem = (e) => {
    e.preventDefault();
    if (!issue.trim()) return;
    if (origin === 'ROOM') {
      createRoomIncident({ room, issue: issue.trim(), priority, reporter: `Admin (${firstName || 'Operador'})` });
    } else {
      createTicket({
        role: origin,
        senderName: sender.trim() || (origin === 'SPONSOR' ? 'Estande Patrocinador' : 'Staff Portaria'),
        category: 'other',
        title: issue.trim().slice(0, 48),
        description: issue.trim(),
        location: room,
        priority,
      });
    }
    refresh();
    setIssue('');
    setSender('');
    setModalOpen(false);
  };

  return (
    <section aria-labelledby="adm-sos" className="mt-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="adm-sos" className="m-0 flex items-center gap-2.5 text-[15px] font-extrabold lg:text-[17px]">
          <LifeBuoy size={20} aria-hidden="true" className="shrink-0 text-warn" />
          Central de apoio e chamados SOS
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label="Filtrar chamados" className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ key, label }) => {
              const on = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(key)}
                  className={`press inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-bold lg:h-8 lg:min-h-0 ${on ? 'bg-action text-white' : 'bg-surface-raised text-text-2'}`}
                >
                  {label}<span className="opacity-75">{counts[key]}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="press inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-action px-3 text-[12px] font-bold text-white lg:h-8 lg:min-h-0">
            <Plus size={14} aria-hidden="true" /> Novo chamado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((i) => i.status === col.key);
          return (
            <div key={col.key} className="flex min-w-0 flex-col gap-2.5">
              <h3 className="m-0 flex items-center gap-2 px-0.5 pb-0.5 text-[13px] font-extrabold text-text-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                {col.label}
                <span className="ml-auto inline-flex h-5 min-w-[22px] items-center justify-center rounded-md bg-surface-raised px-1.5 text-[11px]" style={{ color: col.color }}>{items.length}</span>
              </h3>
              {items.length === 0 ? (
                <p className="m-0 rounded-[14px] bg-[#10172F] px-3.5 py-4 text-[13px] text-text-3">
                  {col.key === 'resolved' ? 'Nada resolvido ainda hoje.' : col.key === 'open' ? 'Nenhum chamado esperando.' : 'Ninguém despachado agora.'}
                </p>
              ) : col.key === 'resolved' ? (
                <ResolvedList items={items} />
              ) : (
                items.map((it) => (
                  <TicketCard
                    key={it.id}
                    item={it}
                    color={col.color}
                    reply={it.id in replies ? replies[it.id] : null}
                    onToggleReply={() => setReplies(({ [it.id]: cur, ...rest }) => (cur === undefined ? { ...rest, [it.id]: '' } : rest))}
                    onChangeReply={(v) => setReplies((r) => ({ ...r, [it.id]: v }))}
                    onSendReply={() => sendReply(it)}
                    onDispatch={() => dispatch(it)}
                    onResolve={() => resolve(it)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="adm-sos-new" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line-2 bg-surface-raised p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-warn">
                <ShieldAlert size={20} aria-hidden="true" />
                <h3 id="adm-sos-new" className="m-0 text-[16px] font-extrabold text-text">Novo chamado</h3>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setModalOpen(false)} className="flex h-9 w-9 items-center justify-center text-text-3 hover:text-text">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={createItem} className="mt-4 space-y-4">
              <div>
                <span className="mb-1 block text-[12px] font-bold text-text-2">Origem</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[['ROOM', 'Sala FACOM'], ['SPONSOR', 'Patrocinador'], ['STAFF', 'Staff']].map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={origin === key} onClick={() => pickOrigin(key)} className={`press min-h-10 rounded-lg text-[12px] font-extrabold ${origin === key ? 'bg-action text-white' : 'bg-surface text-text-3'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {origin !== 'ROOM' && (
                <label className="block">
                  <span className="mb-1 block text-[12px] font-bold text-text-2">{origin === 'SPONSOR' ? 'Empresa ou solicitante' : 'Membro do staff'}</span>
                  <input type="text" value={sender} onChange={(e) => setSender(e.target.value)} placeholder={origin === 'SPONSOR' ? 'Ex: Kanastra' : 'Ex: Carlos, portaria'} required className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link" />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-text-2">{origin === 'ROOM' ? 'Sala' : 'Estande ou ponto'}</span>
                <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} required className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-bold text-text-2">O que está acontecendo</span>
                <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} required className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link" />
              </label>

              <div>
                <span className="mb-1 block text-[12px] font-bold text-text-2">Prioridade</span>
                <div className="flex gap-2">
                  {[['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']].map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={priority === key} onClick={() => setPriority(key)} className={`press min-h-10 flex-1 rounded-xl text-[12px] font-extrabold ${priority === key ? 'bg-action text-white' : 'bg-surface text-text-3'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-line pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className={btn('quiet', 'text-[13px]')}>Cancelar</button>
                <button type="submit" className={btn('action', 'text-[13px]')}>Abrir chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

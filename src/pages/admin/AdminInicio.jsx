import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Megaphone, Zap, Monitor, AlertTriangle, Ticket, ChevronRight, BarChart3,
  LifeBuoy, Wrench, CheckCircle2, Radio, QrCode, Calendar, Trophy, X, ShieldAlert,
  Phone, Send, Clock, User, MessageSquare, Check, Sparkles, Building2
} from 'lucide-react';
import Mascot from '../../components/Mascot';
import iconeTw from '../../assets/icone.png';
import {
  btn, Kpi, OccBar, Section, TypeTag, EVENT_DAYS, isoToday, dayLabel, firstDate, startTime, liveStatus, capacityOf, EmptyState,
} from './ui';
import {
  getRoomIncidents,
  dispatchIncidentSupport,
  resolveIncident,
  createRoomIncident,
  getStageDisplayMode,
  setStageDisplayMode,
  STAGE_MODES,
} from '../../lib/liveOpsService';
import {
  getTickets,
  updateTicketStatus,
  addTicketNote,
  createTicket,
  TICKETS_UPDATED_EVENT,
} from '../../lib/ticketService';

/* 2.01 Visão geral (desktop) e 2.08 Início (celular) + Central de Chamados SOS & Orquestrador de Telão */

const fmtInt = (n) => Number(n || 0).toLocaleString('pt-BR');

function greeting(now) {
  const h = now.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function longDate(now) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).replace('-feira', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function createdToday(u, today) {
  const c = u.createdAt;
  const d = c?.toDate ? c.toDate() : c?.seconds ? new Date(c.seconds * 1000) : typeof c === 'string' ? new Date(c) : null;
  return d && !Number.isNaN(d.getTime()) && isoToday(d) === today;
}

export function useAdminStats({ activities, usersList, missionsList }) {
  return useMemo(() => {
    const now = new Date();
    const today = isoToday(now);
    const days = [...new Set(activities.map(firstDate).filter(Boolean))].sort();
    const shownDay = days.includes(today) ? today : days.find((d) => d > today) || days[0] || today;
    const dayActs = activities
      .filter((a) => firstDate(a) === shownDay)
      .sort((a, b) => startTime(a).localeCompare(startTime(b)));
    const live = activities.filter((a) => liveStatus(a, now) === 'live');
    const limited = activities.map(capacityOf).filter((c) => c.limited);
    const occupancy = limited.length ? Math.round((limited.reduce((s, c) => s + Math.min(1, c.taken / c.total), 0) / limited.length) * 100) : null;
    const participants = usersList.filter((u) => !u.role || u.role === 'PARTICIPANT');
    return {
      now,
      today,
      isToday: shownDay === today,
      shownDay,
      dayActs,
      live,
      occupancy,
      newToday: usersList.filter((u) => createdToday(u, today)).length,
      points: usersList.reduce((s, u) => s + (Number(u.totalPoints ?? u.pontuacaoTotal) || 0), 0),
      activeMissions: missionsList.filter((m) => m.status === 'active').length,
      noTicket: participants.filter((u) => !u.hasSymplaTicket).length,
      full: activities.filter((a) => { const c = capacityOf(a); return c.limited && c.taken >= c.total; }),
    };
  }, [activities, usersList, missionsList]);
}

function attentionItems(stats, { onEditActivity, onNavigate }) {
  const items = stats.full.slice(0, 2).map((a) => ({
    key: a.id,
    color: 'var(--warn)',
    icon: AlertTriangle,
    title: `${a.title} lotada`,
    text: a.total_espera > 0 ? `${a.total_espera} na lista de espera · ${dayLabel(firstDate(a))}, ${startTime(a)}.` : `Todas as ${capacityOf(a).total} vagas ocupadas.`,
    short: `${a.title} lotada${a.total_espera > 0 ? ` · ${a.total_espera} na espera` : ''}`,
    action: 'Aumentar vagas',
    run: () => onEditActivity(a),
  }));
  if (stats.noTicket > 0) {
    items.push({
      key: 'ticket',
      color: 'var(--link)',
      icon: Ticket,
      title: `${stats.noTicket} ${stats.noTicket === 1 ? 'inscrito' : 'inscritos'} sem ingresso Sympla`,
      text: 'Sem ingresso, não reservam vaga nem pontuam.',
      short: `${stats.noTicket} sem ingresso Sympla`,
      action: 'Ver pessoas',
      run: () => onNavigate('pessoas'),
    });
  }
  return items;
}

function statusText(a, now, isToday) {
  const st = liveStatus(a, now);
  if (st === 'live') return <span className="text-ok">· agora</span>;
  if (st === 'past') return <span className="text-text-3">· encerrada</span>;
  return <span className="text-text-2">· {isToday ? 'mais tarde' : dayLabel(firstDate(a)).toLowerCase()}</span>;
}

function placeLine(a) {
  const c = capacityOf(a);
  return [a.location, c.taken > 0 ? `${c.taken} ${c.taken === 1 ? 'inscrito' : 'inscritos'}` : null].filter(Boolean).join(' · ');
}

export default function AdminInicio({
  firstName,
  activities,
  usersList,
  missionsList,
  feedPosts,
  onNavigate,
  onNewActivity,
  onOpenFlash,
  onOpenTelao,
  onEditActivity,
}) {
  const stats = useAdminStats({ activities, usersList, missionsList });
  const { now, isToday, dayActs, live } = stats;
  const attention = attentionItems(stats, { onEditActivity, onNavigate });
  const highlight = live[0] || dayActs.find((a) => liveStatus(a, now) === 'future') || null;
  const lastPost = feedPosts[0];

  // Gestão de Incidentes SOS & Chamados em Tempo Real
  const [incidents, setIncidents] = useState(() => getRoomIncidents());
  const [tickets, setTickets] = useState(() => getTickets());
  const [ticketFilter, setTicketFilter] = useState('ALL'); // 'ALL' | 'SPONSOR' | 'STAFF' | 'ROOMS'
  const [replyInputMap, setReplyInputMap] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const [newIncidentModal, setNewIncidentModal] = useState(false);
  const [newTicketOrigin, setNewTicketOrigin] = useState('ROOM'); // 'ROOM' | 'SPONSOR' | 'STAFF'
  const [newIncRoom, setNewIncRoom] = useState('Anfiteatro FACOM');
  const [newIncSenderName, setNewIncSenderName] = useState('');
  const [newIncIssue, setNewIncIssue] = useState('');
  const [newIncPriority, setNewIncPriority] = useState('alta');

  // Gestão do Modo do Telão
  const [currentStageMode, setCurrentStageMode] = useState(() => getStageDisplayMode());

  // Atualização em tempo real via evento de tickets
  useEffect(() => {
    const handleUpdate = () => {
      setTickets(getTickets());
      setIncidents(getRoomIncidents());
    };
    window.addEventListener(TICKETS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(TICKETS_UPDATED_EVENT, handleUpdate);
  }, []);

  const openIncidents = incidents.filter((i) => i.status !== 'resolved');
  const openTickets = tickets.filter((t) => t.status !== 'RESOLVED');

  const sponsorOpenCount = openTickets.filter((t) => t.role === 'SPONSOR').length;
  const staffOpenCount = openTickets.filter((t) => t.role === 'STAFF').length;
  const roomOpenCount = openIncidents.length;
  const totalOpenCount = sponsorOpenCount + staffOpenCount + roomOpenCount;

  const handleDispatchSupport = (id, isTicket = false) => {
    if (isTicket) {
      updateTicketStatus(id, 'IN_PROGRESS', 'Coordenação TechWeek');
      setTickets(getTickets());
    } else {
      dispatchIncidentSupport(id, 'Técnico de Plantão FACOM');
      setIncidents(getRoomIncidents());
    }
  };

  const handleResolveIncident = (id, isTicket = false) => {
    if (isTicket) {
      updateTicketStatus(id, 'RESOLVED');
      setTickets(getTickets());
    } else {
      resolveIncident(id);
      setIncidents(getRoomIncidents());
    }
  };

  const handleSendTicketReply = (ticketId) => {
    const text = replyInputMap[ticketId];
    if (!text || !text.trim()) return;
    addTicketNote(ticketId, text.trim(), `Coordenação (${firstName || 'Admin'})`);
    setReplyInputMap((prev) => ({ ...prev, [ticketId]: '' }));
    setActiveReplyId(null);
    setTickets(getTickets());
  };

  const handleCreateIncident = (e) => {
    e.preventDefault();
    if (!newIncIssue.trim()) return;

    if (newTicketOrigin === 'ROOM') {
      createRoomIncident({
        room: newIncRoom,
        issue: newIncIssue.trim(),
        priority: newIncPriority,
        reporter: `Admin (${firstName || 'Operador'})`,
      });
      setIncidents(getRoomIncidents());
    } else {
      createTicket({
        role: newTicketOrigin,
        senderName: newIncSenderName.trim() || (newTicketOrigin === 'SPONSOR' ? 'Estande Patrocinador' : 'Staff Portaria'),
        category: 'geral',
        title: newIncIssue.trim().slice(0, 48),
        description: newIncIssue.trim(),
        location: newIncRoom,
        priority: newIncPriority === 'alta' ? 'URGENT' : newIncPriority === 'media' ? 'MEDIUM' : 'LOW',
      });
      setTickets(getTickets());
    }

    setNewIncIssue('');
    setNewIncSenderName('');
    setNewIncidentModal(false);
  };

  const handleSwitchStageMode = (mode) => {
    setStageDisplayMode(mode);
    setCurrentStageMode(mode);
    if (highlight && onOpenTelao) {
      onOpenTelao(highlight);
    }
  };

  const filteredItems = useMemo(() => {
    const list = [];

    if (ticketFilter === 'ALL' || ticketFilter === 'ROOMS') {
      openIncidents.forEach((inc) => {
        list.push({
          id: inc.id,
          kind: 'ROOM',
          room: inc.room,
          issue: inc.issue,
          priority: inc.priority,
          status: inc.status,
          technician: inc.technician,
          createdAt: inc.timestamp,
        });
      });
    }

    if (ticketFilter === 'ALL' || ticketFilter === 'SPONSOR' || ticketFilter === 'STAFF') {
      openTickets.forEach((t) => {
        if (ticketFilter === 'ALL' || ticketFilter === t.role) {
          list.push({
            id: t.id,
            kind: 'TICKET',
            ticket: t,
            room: t.location || (t.role === 'SPONSOR' ? 'Estande' : 'Portaria'),
            issue: t.description || t.title,
            priority: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'alta' : 'media',
            status: t.status === 'IN_PROGRESS' ? 'dispatched' : 'open',
            technician: t.assignedTo,
            createdAt: t.createdAt,
            senderName: t.senderName,
            senderPhone: t.senderPhone,
            role: t.role,
            notes: t.notes || [],
          });
        }
      });
    }

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [ticketFilter, openIncidents, openTickets]);

  const subtitle = isToday
    ? `${longDate(now)} · ${dayActs.length} ${dayActs.length === 1 ? 'atividade' : 'atividades'} hoje${live.length ? ` · ${live.length} acontecendo agora` : ''}`
    : `${longDate(now)} · ${activities.length} atividades na grade`;

  const kpis = [
    { label: 'Inscritos', value: fmtInt(usersList.length), hint: stats.newToday ? `+${stats.newToday} hoje` : 'contas no app', accent: 'var(--link)' },
    { label: isToday ? 'Atividades hoje' : 'Atividades', value: fmtInt(isToday ? dayActs.length : activities.length), hint: isToday ? `${live.length} agora` : `em ${EVENT_DAYS.length} dias`, accent: 'var(--ok)' },
    { label: 'Ocupação média', value: stats.occupancy === null ? '—' : `${stats.occupancy}%`, hint: 'das atividades com vagas', mhint: 'com limite de vagas', accent: 'var(--warn)', bar: stats.occupancy },
    { label: 'Pontos distribuídos', value: fmtInt(stats.points), hint: `${stats.activeMissions} missões ativas`, accent: '#C4B5FD' },
  ];

  return (
    <>
      {/* Saudação */}
      <div className="flex items-center gap-3 lg:gap-4">
        <Mascot style={{ width: 52, height: 52, animation: 'none', flexShrink: 0 }} />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[19px] font-extrabold lg:text-[28px] lg:tracking-[-0.01em]">
            {greeting(now)}, {firstName}
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-text-2 lg:mt-1 lg:text-[14px]">{subtitle}</p>
        </div>
        <div className="hidden flex-wrap gap-2.5 lg:flex">
          <button type="button" className={btn()} onClick={() => onNavigate('dados')}><BarChart3 size={18} aria-hidden="true" /> Dados & Ao Vivo</button>
          <button type="button" className={btn()} onClick={() => onNavigate('feed')}><Megaphone size={18} aria-hidden="true" /> Publicar aviso</button>
          <button type="button" className={btn()} onClick={onOpenFlash}><Zap size={18} aria-hidden="true" /> Missão relâmpago</button>
          <button type="button" className={btn('action')} onClick={onNewActivity}><Plus size={18} aria-hidden="true" /> Nova atividade</button>
        </div>
      </div>

      {/* Ações rápidas (celular) */}
      <div className="adm-noscroll -mx-5 mt-[18px] flex gap-2 overflow-x-auto px-5 lg:hidden">
        <button type="button" className={btn('action', 'shrink-0 px-3.5')} onClick={onNewActivity}><Plus size={18} aria-hidden="true" /> Nova atividade</button>
        <button type="button" className={btn('secondary', 'shrink-0 px-3.5')} onClick={() => onNavigate('dados')}><BarChart3 size={18} aria-hidden="true" /> Dados</button>
        <button type="button" className={btn('secondary', 'shrink-0 px-3.5')} onClick={() => onNavigate('feed')}><Megaphone size={18} aria-hidden="true" /> Aviso</button>
        <button type="button" className={btn('secondary', 'shrink-0 px-3.5')} onClick={onOpenFlash}><Zap size={18} aria-hidden="true" /> Relâmpago</button>
      </div>

      {/* Números */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:mt-6 lg:grid-cols-[repeat(auto-fit,minmax(210px,1fr))] lg:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="contents">
            <div className="lg:hidden"><Kpi label={k.label === 'Ocupação média' ? 'Ocupação' : k.label} value={k.value} hint={k.mhint || k.hint} accent={k.accent} /></div>
            <div className="hidden lg:block">
              <Kpi label={k.label} value={k.value} hint={k.bar === undefined ? k.hint : null}>
                {k.bar !== undefined && k.bar !== null && (
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-raised">
                    <span className="block h-full rounded-full bg-warn" style={{ width: `${k.bar}%` }} />
                  </span>
                )}
              </Kpi>
            </div>
          </div>
        ))}
      </div>

      {/* Destaque "agora" (celular) */}
      {highlight && (
        <section className="mt-4 rounded-[18px] bg-surface p-4 lg:hidden" aria-label="Atividade em destaque">
          <TypeTag type={highlight.type}>
            <span className={liveStatus(highlight, now) === 'live' ? 'text-ok' : 'text-text-2'}>
              · {liveStatus(highlight, now) === 'live' ? 'Agora' : `Próxima${isToday ? '' : ` · ${dayLabel(firstDate(highlight))}`}`} · {startTime(highlight)}
            </span>
          </TypeTag>
          <div className="mt-1.5 text-[17px] font-extrabold leading-snug">{highlight.title}</div>
          {capacityOf(highlight).limited && (
            <>
              <div className="mt-3 flex justify-between text-[13px] text-text-2">
                <span>{placeLine(highlight)}</span>
                <span className="font-bold text-text">{capacityOf(highlight).taken} / {capacityOf(highlight).total}</span>
              </div>
              <OccBar className="mt-1.5" taken={capacityOf(highlight).taken} total={capacityOf(highlight).total} />
            </>
          )}
          <button type="button" className={btn('secondary', 'mt-3.5')} onClick={() => onOpenTelao(highlight)}>
            <Monitor size={18} aria-hidden="true" /> Abrir telão
          </button>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        {/* Grade do dia (desktop) */}
        <Section
          className="hidden min-w-0 flex-[2_1_560px] self-start lg:block"
          title={isToday ? 'Hoje na grade' : `Próximo dia · ${dayLabel(stats.shownDay)}`}
          action={<button type="button" className="min-h-11 text-[14px] font-bold text-link" onClick={() => onNavigate('programacao')}>Ver programação</button>}
        >
          {dayActs.length === 0 ? (
            <EmptyState>Nenhuma atividade na grade ainda.</EmptyState>
          ) : (
            dayActs.map((a) => {
              const st = liveStatus(a, now);
              const c = capacityOf(a);
              return (
                <div key={a.id} className="grid grid-cols-[64px_minmax(0,1fr)_160px_auto] items-center gap-4 border-t border-line py-3.5" style={{ opacity: st === 'past' ? 0.6 : 1 }}>
                  <span className="text-[16px] font-extrabold">{startTime(a)}</span>
                  <span className="min-w-0">
                    <TypeTag type={a.type}>{statusText(a, now, isToday)}</TypeTag>
                    <span className="mt-1 block text-[15px] font-bold">{a.title}</span>
                    <span className="mt-0.5 block text-[13px] text-text-2">{placeLine(a)}</span>
                  </span>
                  <span>
                    {c.limited ? (
                      <>
                        <span className="mb-1.5 flex justify-between text-[12px] text-text-2">
                          <span>Lotação</span>
                          <span className="font-bold text-text">{c.taken} / {c.total}</span>
                        </span>
                        <OccBar taken={c.taken} total={c.total} />
                      </>
                    ) : (
                      <span className="text-[12px] text-text-3">Sem limite de vagas</span>
                    )}
                  </span>
                  <span>
                    {st === 'live' && (
                      <button type="button" className={btn()} onClick={() => onOpenTelao(a)}>
                        <Monitor size={18} aria-hidden="true" /> Abrir telão
                      </button>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </Section>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {/* PILAR 1: Central de Apoio & Chamados SOS */}
          <section aria-labelledby="adm-sos" className="rounded-[20px] bg-surface p-4 lg:p-5 border border-line">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-warn" aria-hidden="true" />
                <h2 id="adm-sos" className="m-0 text-[15px] font-extrabold lg:text-[17px]">
                  Central de Apoio & Chamados SOS
                </h2>
                {totalOpenCount > 0 && (
                  <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[11px] font-extrabold text-warn">
                    {totalOpenCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNewIncidentModal(true)}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-link hover:underline"
              >
                <Plus size={14} /> Novo Chamado
              </button>
            </div>

            {/* Abas de Origem / Filtro */}
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-line pb-2.5">
              {[
                { key: 'ALL', label: 'Todos', count: totalOpenCount },
                { key: 'SPONSOR', label: 'Patrocinadores', count: sponsorOpenCount },
                { key: 'STAFF', label: 'Staff', count: staffOpenCount },
                { key: 'ROOMS', label: 'Salas FACOM', count: roomOpenCount },
              ].map((tab) => {
                const isActive = ticketFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTicketFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                      isActive
                        ? 'bg-link text-[#0A0F24]'
                        : 'bg-surface-raised text-text-3 hover:text-text'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isActive ? 'bg-[#0A0F24]/20 text-[#0A0F24]' : 'bg-surface text-text-2'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {filteredItems.length === 0 ? (
              <p className="m-0 text-[13px] text-text-3 py-2">
                Nenhum chamado aberto nesta categoria. Tudo operando normalmente.
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-line-2 bg-surface-raised p-3 text-left shadow-sm"
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: item.priority === 'alta' ? 'var(--warn)' : 'var(--link)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.kind === 'ROOM' && (
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-text-2">
                            Sala FACOM
                          </span>
                        )}
                        {item.kind === 'TICKET' && item.role === 'SPONSOR' && (
                          <span className="inline-flex items-center gap-1 rounded bg-link/15 px-1.5 py-0.5 text-[10px] font-bold text-link">
                            <Building2 size={11} /> Patrocinador · {item.senderName}
                          </span>
                        )}
                        {item.kind === 'TICKET' && item.role === 'STAFF' && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#C4B5FD]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#C4B5FD]">
                            <User size={11} /> Staff · {item.senderName}
                          </span>
                        )}
                        <span className="text-[12px] font-extrabold text-text">
                          {item.room}
                        </span>
                      </div>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0"
                        style={{
                          background: item.status === 'dispatched' ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)',
                          color: item.status === 'dispatched' ? '#60A5FA' : '#FBBF24',
                        }}
                      >
                        {item.status === 'dispatched' ? 'Suporte a caminho' : 'Aguardando'}
                      </span>
                    </div>

                    <p className="m-0 mt-1.5 text-[12px] font-medium text-text-2 leading-relaxed">
                      {item.issue}
                    </p>

                    {item.technician && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-link">
                        <Wrench size={12} />
                        <span>Atendente/Suporte: <b>{item.technician}</b></span>
                      </div>
                    )}

                    {/* Resposta recente da coordenação se houver */}
                    {item.kind === 'TICKET' && item.notes && item.notes.length > 0 && (
                      <div className="mt-2 rounded-lg bg-surface/80 p-2 border border-line text-[11px] text-text-2">
                        <span className="font-bold text-text">Última nota ({item.notes[item.notes.length - 1].author}):</span>{' '}
                        {item.notes[item.notes.length - 1].text}
                      </div>
                    )}

                    {/* Formulário de resposta rápida inline */}
                    {activeReplyId === item.id && (
                      <div className="mt-2.5 pt-2 border-t border-line/60 flex gap-2">
                        <input
                          type="text"
                          placeholder="Digite uma mensagem para o solicitante..."
                          value={replyInputMap[item.id] || ''}
                          onChange={(e) => setReplyInputMap({ ...replyInputMap, [item.id]: e.target.value })}
                          className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[12px] text-text outline-none focus:border-link"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendTicketReply(item.id);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSendTicketReply(item.id)}
                          className="press inline-flex items-center gap-1 rounded-lg bg-link px-2.5 py-1 text-[11px] font-bold text-[#0A0F24]"
                        >
                          <Send size={11} /> Enviar
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1.5 border-t border-line/60 pt-2">
                      {item.senderPhone && (
                        <a
                          href={`https://wa.me/55${item.senderPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="press inline-flex items-center gap-1 rounded-lg bg-[#25D366]/15 px-2 py-1 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366]/25"
                        >
                          <Phone size={11} /> WhatsApp
                        </a>
                      )}

                      {item.kind === 'TICKET' && (
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(activeReplyId === item.id ? null : item.id)}
                          className="press inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-[11px] font-bold text-text-2 hover:text-text"
                        >
                          <MessageSquare size={11} /> {activeReplyId === item.id ? 'Fechar' : 'Responder'}
                        </button>
                      )}

                      {item.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleDispatchSupport(item.id, item.kind === 'TICKET')}
                          className="press inline-flex items-center gap-1 rounded-lg bg-link/15 px-2.5 py-1 text-[11px] font-bold text-link hover:bg-link/25"
                        >
                          <Wrench size={12} /> Despachar Suporte
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolveIncident(item.id, item.kind === 'TICKET')}
                        className="press inline-flex items-center gap-1 rounded-lg bg-ok/15 px-2.5 py-1 text-[11px] font-bold text-ok hover:bg-ok/25"
                      >
                        <CheckCircle2 size={12} /> Resolver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PILAR 3: Controle Remoto do Telão */}
          <section aria-labelledby="adm-telao-ctrl" className="rounded-[20px] bg-surface p-4 lg:p-5 border border-line">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={18} className="text-link" aria-hidden="true" />
                <h2 id="adm-telao-ctrl" className="m-0 text-[15px] font-extrabold lg:text-[17px]">
                  Controle Remoto do Telão
                </h2>
              </div>
              <span className="rounded-full bg-link/15 px-2 py-0.5 text-[10px] font-extrabold text-link uppercase">
                {currentStageMode}
              </span>
            </div>

            <p className="m-0 text-[12px] text-text-3 mb-3">
              Mude a transmissão no palco em 1 toque sincronizando todos os monitores:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {STAGE_MODES.map((sm) => {
                const isActive = currentStageMode === sm.id;
                return (
                  <button
                    key={sm.id}
                    type="button"
                    onClick={() => handleSwitchStageMode(sm.id)}
                    className={`press flex flex-col items-start rounded-xl p-2.5 text-left border transition-all ${
                      isActive
                        ? 'border-link bg-surface-selected text-text shadow-sm'
                        : 'border-line bg-surface-raised text-text-3 hover:text-text'
                    }`}
                  >
                    <span className="text-[12px] font-black text-text">{sm.label}</span>
                    <span className="text-[10px] text-text-3 line-clamp-1">{sm.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Precisa de atenção */}
          <section aria-labelledby="adm-atencao" className="lg:rounded-[20px] lg:bg-surface lg:p-5">
            <h2 id="adm-atencao" className="m-0 mb-2.5 flex items-center gap-2 text-[15px] font-extrabold lg:mb-3.5 lg:text-[17px]">
              Precisa de atenção
              {attention.length > 0 && <span className="rounded-[10px] bg-[rgba(242,196,106,0.18)] px-2 py-0.5 text-[12px] font-extrabold text-warn lg:hidden">{attention.length}</span>}
            </h2>
            {attention.length === 0 ? (
              <p className="m-0 text-[14px] text-text-2">Tudo certo por aqui. Nada lotado e todo mundo com ingresso.</p>
            ) : (
              <div className="flex flex-col gap-2 lg:gap-2.5">
                {attention.map(({ key, color, icon: Icon, title, text, short, action, run }) => (
                  <div key={key}>
                    <button type="button" onClick={run} className="flex min-h-14 w-full items-center gap-3 rounded-[14px] bg-[#10172F] px-3 py-2.5 text-left lg:hidden" style={{ borderLeft: `3px solid ${color}` }}>
                      <Icon size={18} aria-hidden="true" style={{ color }} className="shrink-0" />
                      <span className="flex-1 text-[14px] font-semibold leading-snug">{short}</span>
                      <ChevronRight size={18} aria-hidden="true" className="text-text-4" />
                    </button>
                    <div className="hidden gap-3 rounded-[14px] bg-[#10172F] py-3.5 pl-3 pr-3.5 lg:flex" style={{ borderLeft: `3px solid ${color}` }}>
                      <Icon size={18} aria-hidden="true" style={{ color }} className="mt-px shrink-0" />
                      <span className="flex-1">
                        <span className="block text-[14px] font-bold">{title}</span>
                        <span className="mt-0.5 block text-[13px] text-text-2">{text}</span>
                        <button type="button" onClick={run} className="mt-1 min-h-9 text-[13px] font-bold text-link">{action}</button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Último aviso (desktop) */}
          <Section
            className="hidden lg:block"
            title="Último aviso"
            action={<button type="button" className="min-h-11 text-[14px] font-bold text-link" onClick={() => onNavigate('feed')}>Novo aviso</button>}
          >
            {lastPost ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-selected">
                    <img src={iconeTw} alt="" className="h-5 w-[18px] object-contain" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold">{lastPost.author}</span>
                    <span className="block text-[12px] text-text-3">{lastPost.formattedTime || 'Recente'}</span>
                  </span>
                </div>
                <p className="m-0 mt-2.5 line-clamp-3 text-[14px] leading-normal text-[#C3C9DE]">{lastPost.content}</p>
              </>
            ) : (
              <p className="m-0 text-[14px] text-text-2">Nenhum aviso publicado ainda.</p>
            )}
          </Section>
        </div>
      </div>

      {/* Modal Novo Chamado SOS */}
      {newIncidentModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-line-2 bg-surface-raised p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-warn">
                <ShieldAlert size={20} />
                <h3 className="m-0 text-[16px] font-extrabold text-text">Novo Chamado de Suporte / SOS</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewIncidentModal(false)}
                className="text-text-3 hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-text-2 mb-1">Origem do Chamado</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'ROOM', label: 'Sala FACOM' },
                    { key: 'SPONSOR', label: 'Patrocinador' },
                    { key: 'STAFF', label: 'Staff' },
                  ].map((orig) => {
                    const isSel = newTicketOrigin === orig.key;
                    return (
                      <button
                        key={orig.key}
                        type="button"
                        onClick={() => {
                          setNewTicketOrigin(orig.key);
                          if (orig.key === 'ROOM') setNewIncRoom('Anfiteatro FACOM');
                          else if (orig.key === 'SPONSOR') setNewIncRoom('Estande Principal');
                          else setNewIncRoom('Portaria / Scanner');
                        }}
                        className={`rounded-lg py-1.5 text-[11px] font-extrabold transition-all ${
                          isSel
                            ? 'bg-link text-[#0A0F24]'
                            : 'bg-surface text-text-3 hover:text-text'
                        }`}
                      >
                        {orig.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {newTicketOrigin !== 'ROOM' && (
                <div>
                  <label className="block text-[12px] font-bold text-text-2 mb-1">
                    {newTicketOrigin === 'SPONSOR' ? 'Empresa / Solicitante' : 'Membro do Staff / Portaria'}
                  </label>
                  <input
                    type="text"
                    value={newIncSenderName}
                    onChange={(e) => setNewIncSenderName(e.target.value)}
                    placeholder={newTicketOrigin === 'SPONSOR' ? 'Ex: Google Cloud, Kanastra...' : 'Ex: Carlos Portaria...'}
                    required
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link"
                  />
                </div>
              )}

              <div>
                <label className="block text-[12px] font-bold text-text-2 mb-1">
                  {newTicketOrigin === 'ROOM' ? 'Local / Sala' : 'Local / Estande / Ponto'}
                </label>
                <input
                  type="text"
                  value={newIncRoom}
                  onChange={(e) => setNewIncRoom(e.target.value)}
                  placeholder="Ex: Anfiteatro FACOM, Estande KANASTRA, Portaria Bloco B..."
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-text-2 mb-1">Descrição do Problema</label>
                <textarea
                  value={newIncIssue}
                  onChange={(e) => setNewIncIssue(e.target.value)}
                  placeholder="Descreva o que está ocorrendo ou o que precisa de suporte..."
                  rows={3}
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] text-text outline-none focus:border-link resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-text-2 mb-1">Prioridade</label>
                <div className="flex gap-2">
                  {['alta', 'media', 'baixa'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewIncPriority(p)}
                      className={`flex-1 rounded-xl py-1.5 text-[12px] font-extrabold uppercase transition-all ${
                        newIncPriority === p
                          ? p === 'alta'
                            ? 'bg-warn text-[#0A0F24]'
                            : 'bg-link text-[#0A0F24]'
                          : 'bg-surface text-text-3'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2.5 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setNewIncidentModal(false)}
                  className="rounded-xl px-4 py-2 text-[13px] font-bold text-text-3 hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={btn('action', 'text-[13px]')}
                >
                  Abrir Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

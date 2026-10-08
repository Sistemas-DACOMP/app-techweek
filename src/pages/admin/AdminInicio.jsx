import { useMemo } from 'react';
import { Plus, Megaphone, Zap, Monitor, AlertTriangle, Ticket, ChevronRight } from 'lucide-react';
import Mascot from '../../components/Mascot';
import iconeTw from '../../assets/icone.png';
import {
  btn, Kpi, OccBar, Section, TypeTag, EVENT_DAYS, isoToday, dayLabel, firstDate, startTime, liveStatus, capacityOf, EmptyState,
} from './ui';

/* 2.01 Visão geral (desktop) e 2.08 Início (celular). Só números que o app já tem; nada inventado. */

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

export default function AdminInicio({ firstName, activities, usersList, missionsList, feedPosts, onNavigate, onNewActivity, onOpenFlash, onOpenTelao, onEditActivity }) {
  const stats = useAdminStats({ activities, usersList, missionsList });
  const { now, isToday, dayActs, live } = stats;
  const attention = attentionItems(stats, { onEditActivity, onNavigate });
  const highlight = live[0] || dayActs.find((a) => liveStatus(a, now) === 'future') || null;
  const lastPost = feedPosts[0];

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
          <button type="button" className={btn()} onClick={() => onNavigate('feed')}><Megaphone size={18} aria-hidden="true" /> Publicar aviso</button>
          <button type="button" className={btn()} onClick={onOpenFlash}><Zap size={18} aria-hidden="true" /> Missão relâmpago</button>
          <button type="button" className={btn('action')} onClick={onNewActivity}><Plus size={18} aria-hidden="true" /> Nova atividade</button>
        </div>
      </div>

      {/* Ações rápidas (celular) */}
      <div className="adm-noscroll -mx-5 mt-[18px] flex gap-2 overflow-x-auto px-5 lg:hidden">
        <button type="button" className={btn('action', 'shrink-0 px-3.5')} onClick={onNewActivity}><Plus size={18} aria-hidden="true" /> Nova atividade</button>
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
    </>
  );
}

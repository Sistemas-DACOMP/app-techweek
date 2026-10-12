import { useMemo, useState } from 'react';
import { Download, FileText, Printer, RefreshCw, Sparkles } from 'lucide-react';
import './dados.css';
import { SPONSORS_CONFIG } from '../../../components/PassportTab';
import { EVENT_DAYS, firstDate } from '../ui';
import { useDadosAoVivo } from './useDadosAoVivo';
import { AffluenceCurve, Sparkline } from './charts';
import SalasTab from './SalasTab';
import EstandesTab from './EstandesTab';
import ConteudoTab from './ConteudoTab';
import PublicoTab from './PublicoTab';
import AcoesAoVivo from './AcoesAoVivo';
import {
  PALETTE, buildAlerts, buildCurve, buildSponsors, cumulativeSpark, dayKey, dayLabel, eventDays, fmt,
  groupCount, isParticipant, missionDropoff, occupancyRank, participantKinds, periodBuckets, periodPeaks,
  pickReferenceDay, prevDayKey, ratingsFrom, retention, roomOccupancy, tierTotals, toDate, topRatedActivities
} from './derive';

const TABS = [['salas', 'Salas'], ['estandes', 'Estandes'], ['conteudo', 'Conteúdo'], ['publico', 'Público']];
const pad = (n) => String(n).padStart(2, '0');

function Kpi({ label, value, sub, color, spark, i }) {
  return (
    <div className="dd-kpi tw-up" style={{ borderTopColor: color, '--i': i }}>
      <div className="dd-kpi-l">{label}</div>
      <div className="dd-kpi-v" style={{ color }}>{value}</div>
      <div className="dd-kpi-s">{sub}</div>
      <Sparkline values={spark} color={color} />
    </div>
  );
}

export default function DadosAoVivo({ activities = [], usersList = [], missionsList = [], onNavigate }) {
  const [day, setDay] = useState('ALL');
  const [tab, setTab] = useState('salas');
  const [nonce, setNonce] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const sponsorUids = useMemo(() => usersList.filter((u) => u.role === 'SPONSOR').map((u) => u.uid || u.id).sort(), [usersList]);
  const live = useDadosAoVivo(sponsorUids, nonce);

  const m = useMemo(() => {
    const now = new Date();
    const days = eventDays(activities).length ? eventDays(activities) : EVENT_DAYS.map((d) => d.date);
    const inDay = (d) => day === 'ALL' || (d && dayKey(d) === day);
    const acts = day === 'ALL' ? activities : activities.filter((a) => firstDate(a) === day);
    const checkins = live.checkins.filter((c) => inDay(toDate(c.entranceAt)));
    const events = live.pointEvents.filter((p) => inDay(toDate(p.createdAt)));
    const participants = usersList.filter(isParticipant);

    const rooms = roomOccupancy(acts);
    const ret = retention(acts, checkins);
    const present = new Set(checkins.map((c) => c.uid)).size;
    const activeNow = new Set(checkins.filter((c) => {
      const e = toDate(c.entranceAt);
      return !c.checkoutAt && e && now - e < 90 * 60000 && now >= e;
    }).map((c) => c.uid)).size;
    const points = events.reduce((s, p) => s + (Number(p.points) || 0), 0);

    const ref = day !== 'ALL' ? day : pickReferenceDay(days, live.checkins, now);
    const curve = buildCurve(live.checkins, ref);
    const prev = buildCurve(live.checkins, prevDayKey(ref));
    const isToday = ref === dayKey(now);

    const ratings = ratingsFrom(events);
    const sponsors = buildSponsors(usersList, live.leadsBySponsor, participants.length, SPONSORS_CONFIG);
    const courseOf = (u) => (u.course || '').trim() || 'Não informado';
    const presentByDay = (d) => new Set(live.checkins.filter((c) => { const e = toDate(c.entranceAt); return e && dayKey(e) === d; }).map((c) => c.uid)).size;

    return {
      days, acts, rooms, ret, present, activeNow, points, participants, ref, curve, prev, isToday,
      nowMin: isToday ? now.getHours() * 60 + now.getMinutes() : null,
      avgOcc: rooms.length ? Math.round(rooms.reduce((s, r) => s + r.pct, 0) / rooms.length) : 0,
      mostSought: occupancyRank(acts),
      alerts: buildAlerts(acts, rooms, ret),
      periods: periodPeaks(curve),
      sparkCheckins: cumulativeSpark(checkins.map((c) => toDate(c.entranceAt))),
      sparkPoints: cumulativeSpark(events.map((p) => toDate(p.createdAt))),
      ratings, topRated: topRatedActivities(ratings.list, activities),
      dropoff: missionDropoff(missionsList, live.pointEvents, participants.length),
      sponsors, tiers: tierTotals(sponsors),
      courses: groupCount(participants, courseOf, 5),
      periodsCourse: periodBuckets(participants),
      kinds: participantKinds(participants),
      byDay: days.map((d) => ({ label: dayLabel(d), a: participants.length, b: presentByDay(d) }))
    };
  }, [activities, usersList, missionsList, live.checkins, live.pointEvents, live.leadsBySponsor, day]);

  const stamp = live.updatedAt ? `${pad(live.updatedAt.getHours())}:${pad(live.updatedAt.getMinutes())}:${pad(live.updatedAt.getSeconds())}` : null;

  const exportCsv = () => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Check-ins', m.present], ['Inscritos', m.participants.length], ['Ocupação média das salas (%)', m.avgOcc],
      ['Ativos agora', m.activeNow], ['Pontos distribuídos', m.points], [],
      ['Sala', 'Inscritos', 'Vagas', 'Ocupação (%)'], ...m.rooms.map((r) => [r.name, r.taken, r.cap, r.pct]), [],
      ['Atividade', '1º scan', '2º scan', 'Permanência (%)'], ...m.ret.map((r) => [r.title, r.entered, r.stayed, r.stayPct]), [],
      ['Empresa', 'Visitas', 'Leads', 'Conversão (%)', 'Alcance (%)'], ...m.sponsors.map((s) => [s.name, s.visits, s.leads, s.conversion, s.reach])
    ];
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `techweek-dados-${day === 'ALL' ? 'todos' : day}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(), selectedDay: day,
      summary: { checkins: m.present, inscritos: m.participants.length, ocupacaoMedia: m.avgOcc, ativosAgora: m.activeNow, pontos: m.points },
      afluencia: m.curve, salas: m.rooms, retencao: m.ret, estandes: m.sponsors, publico: { cursos: m.courses, periodos: m.periodsCourse, tipos: m.kinds }
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    a.download = `techweek-dados-${day === 'ALL' ? 'todos' : day}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const pick = (fn) => () => { setMenuOpen(false); fn(); };

  return (
    <div className="dd">
      <header className="dd-head tw-up">
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>Dados e ao vivo</h1>
          <div className="dd-sub" aria-live="polite">
            {live.error ? 'Parte dos dados não carregou (sem permissão ou sem rede).' : stamp ? `Atualizado às ${stamp}` : 'Carregando…'}
          </div>
        </div>
        <button type="button" className="dd-btn" onClick={() => setNonce((n) => n + 1)}><RefreshCw size={18} aria-hidden="true" />Atualizar</button>
        <div className="dd-menu-wrap">
          <button type="button" className="dd-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}><Download size={18} aria-hidden="true" />Exportar</button>
          {menuOpen && (
            <div role="menu" className="dd-menu" onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}>
              <button type="button" role="menuitem" onClick={pick(exportCsv)}><Download size={16} aria-hidden="true" />Planilha CSV</button>
              <button type="button" role="menuitem" onClick={pick(exportJson)}><Sparkles size={16} aria-hidden="true" />Dados brutos (JSON)</button>
              <button type="button" role="menuitem" onClick={pick(() => window.print())}><Printer size={16} aria-hidden="true" />Imprimir / PDF</button>
            </div>
          )}
        </div>
      </header>

      <div className="dd-chips" role="group" aria-label="Filtrar por dia">
        <button type="button" className="dd-chip" aria-pressed={day === 'ALL'} onClick={() => setDay('ALL')}>Todos os dias</button>
        {m.days.map((d) => <button key={d} type="button" className="dd-chip" aria-pressed={day === d} onClick={() => setDay(d)}>{dayLabel(d)}</button>)}
      </div>

      <div className="dd-kpis">
        <Kpi i={0} label="Check-ins" value={fmt(m.present)} sub={`de ${fmt(m.participants.length)} inscritos`} color="var(--link)" spark={m.sparkCheckins} />
        <Kpi i={1} label="Ocupação das salas" value={`${m.avgOcc}%`} sub="média das atividades" color={PALETTE[1]} />
        <Kpi i={2} label="Ativos agora" value={fmt(m.activeNow)} sub="no campus" color="var(--ok)" />
        <Kpi i={3} label="Pontos distribuídos" value={fmt(m.points)} sub="em missões e presença" color="var(--light-yellow)" spark={m.sparkPoints} />
      </div>

      <section className="dd-card bordered tw-up" aria-labelledby="dd-afl">
        <div className="dd-card-h big" style={{ flexWrap: 'wrap' }}>
          <h2 id="dd-afl">Afluência ao longo do dia</h2>
          <div className="dd-legend">
            <span><span style={{ width: 16, height: 3, borderRadius: 2, background: 'var(--link)' }} />{m.isToday ? 'Hoje' : dayLabel(m.ref)}</span>
            {m.prev.some(Boolean) && <span><span style={{ width: 16, borderTop: '2px dashed var(--text-4)' }} />{m.isToday ? 'Ontem' : dayLabel(prevDayKey(m.ref))}</span>}
          </div>
        </div>
        <AffluenceCurve curve={m.curve} prev={m.prev} nowMin={m.nowMin} label={m.isToday ? 'hoje' : dayLabel(m.ref)} />
        <div className="dd-periods">
          {m.periods.map((p) => (
            <div key={p.id} className="dd-period" style={{ borderTopColor: p.color }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{p.peak}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{String(p.from).padStart(2, '0')}h–{Number.isInteger(p.to) ? `${p.to}h` : '22h30'} · <span className="dd-desk-i">pessoas no pico</span></div>
            </div>
          ))}
        </div>
        <div className="dd-note">Estimado a partir das presenças confirmadas (check-ins). Sem dado, a curva fica vazia.</div>
      </section>

      <div role="tablist" aria-label="Seções de dados" className="dd-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`dd-tab-${id}`} aria-selected={tab === id} aria-controls="dd-panel" className="dd-tab" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div id="dd-panel" role="tabpanel" aria-labelledby={`dd-tab-${tab}`} className="dd-stack" style={{ gap: 20 }}>
        {tab === 'salas' && <SalasTab rooms={m.rooms} ret={m.ret} mostSought={m.mostSought} alerts={m.alerts} onNavigate={onNavigate} />}
        {tab === 'estandes' && <EstandesTab sponsors={m.sponsors} tiers={m.tiers} />}
        {tab === 'conteudo' && <ConteudoTab ratings={m.ratings} topRated={m.topRated} dropoff={m.dropoff} />}
        {tab === 'publico' && <PublicoTab total={m.participants.length} courses={m.courses} byDay={m.byDay} periods={m.periodsCourse} kinds={m.kinds} />}
      </div>

      <AcoesAoVivo activities={m.acts} sponsors={m.sponsors} courses={m.courses} />
    </div>
  );
}

import { normalizeDate } from '../../../lib/analyticsService';
import { isoToday, dayLabel } from '../ui';

// Derivações puras (sem Firestore) para Admin > Dados e ao vivo.
// Tudo aqui sai de dados que o app já grava: activities, users, checkins, pointEvents, leads/{sponsor}/contacts.

export const PALETTE = ['#8FA0FF', '#B9A6F5', '#67D4E8', '#F59AC0', '#FBBF24', '#6FD8A6'];
export const OK = '#6FD8A6';
export const WARN = '#F2C46A';

export const TIERS = {
  diamante: { label: 'Diamante', gradient: 'linear-gradient(90deg,#22D3EE,#A78BFA,#F0ABFC)', solid: '#22D3EE' },
  ouro: { label: 'Ouro', gradient: 'linear-gradient(90deg,#FDE68A,#FBBF24,#D97706)', solid: '#FBBF24' },
  prata: { label: 'Prata', gradient: 'linear-gradient(90deg,#E2E8F0,#94A3B8)', solid: '#CBD5E1' }
};

export const toDate = normalizeDate;
export const dayKey = isoToday;
export { dayLabel };

export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

export function eventDays(activities) {
  return [...new Set(activities.map((a) => a.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '')))].sort();
}

// ---- Afluência: pessoas distintas presentes em cada janela de 30 min (08h00-22h30) ----
export const CURVE_START = 8 * 60;
export const CURVE_END = 22 * 60 + 30;
const STEP = 30;
export const CURVE_N = (CURVE_END - CURVE_START) / STEP + 1;

export function buildCurve(checkins, key) {
  const sets = Array.from({ length: CURVE_N }, () => new Set());
  for (const c of checkins) {
    const start = toDate(c.entranceAt);
    if (!start || dayKey(start) !== key) continue;
    const end = toDate(c.checkoutAt) || new Date(start.getTime() + 60 * 60000);
    const s = start.getHours() * 60 + start.getMinutes();
    const e = end.getHours() * 60 + end.getMinutes();
    for (let i = 0; i < CURVE_N; i++) {
      const t = CURVE_START + i * STEP;
      if (t >= s - STEP + 1 && t <= Math.max(e, s)) sets[i].add(c.uid);
    }
  }
  return sets.map((s) => s.size);
}

export const PERIODS = [
  { id: 'cred', label: 'Credenciamento', from: 8, to: 10, color: '#67D4E8' },
  { id: 'man', label: 'Manhã', from: 10, to: 12, color: '#8FA0FF' },
  { id: 'alm', label: 'Almoço', from: 12, to: 14, color: '#B9A6F5' },
  { id: 'tar', label: 'Tarde', from: 14, to: 18, color: '#FBBF24' },
  { id: 'noi', label: 'Noite', from: 18, to: 22.5, color: '#F59AC0' }
];

export function periodPeaks(curve) {
  return PERIODS.map((p) => {
    const vals = curve.filter((_, i) => {
      const h = (CURVE_START + i * STEP) / 60;
      return h >= p.from && h < p.to;
    });
    return { ...p, peak: vals.length ? Math.max(...vals) : 0 };
  });
}

export function pickReferenceDay(days, checkins, now = new Date()) {
  const today = dayKey(now);
  const withData = new Set(checkins.map((c) => toDate(c.entranceAt)).filter(Boolean).map(dayKey));
  if (withData.has(today) || !withData.size) return today;
  return [...withData].sort().pop();
}

export function prevDayKey(key) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

// ---- Salas ----
export function roomOccupancy(activities) {
  const map = new Map();
  for (const a of activities) {
    const name = a.location || 'Sem local';
    const cap = Number(a.vagas_totais) || 0;
    const taken = Number.isFinite(Number(a.total_inscritos)) && a.total_inscritos != null
      ? Number(a.total_inscritos)
      : Math.max(0, cap - (Number(a.vagas_disponiveis) || 0));
    const r = map.get(name) || { name, cap: 0, taken: 0 };
    r.cap += cap; r.taken += taken;
    map.set(name, r);
  }
  return [...map.values()].filter((r) => r.cap > 0)
    .map((r) => ({ ...r, pct: pct(r.taken, r.cap) }))
    .sort((a, b) => b.pct - a.pct);
}

export function retention(activities, checkins) {
  return activities.map((a) => {
    const mine = checkins.filter((c) => c.activityId === a.id);
    const entered = mine.length;
    const stayed = mine.filter((c) => c.checkoutAt).length;
    return { id: a.id, title: a.title, entered, stayed, stayPct: pct(stayed, entered) };
  }).filter((r) => r.entered > 0).sort((a, b) => b.entered - a.entered);
}

export function buildAlerts(activities, rooms, ret) {
  const out = [];
  for (const a of activities) {
    const cap = Number(a.vagas_totais) || 0;
    if (cap > 0 && (Number(a.total_inscritos) || 0) >= cap) out.push({ tone: 'warn', title: `${a.title} lotado`, text: 'Sem vagas livres.' });
  }
  for (const r of ret) {
    if (r.entered >= 5 && r.stayPct <= 70) out.push({ tone: 'warn', title: `${r.title}: evasão de ${100 - r.stayPct}%`, text: 'Menos gente no 2º scan do que na entrada.' });
  }
  for (const r of rooms) {
    if (r.cap > 0 && r.pct < 60) out.push({ tone: 'info', title: `${r.name} com ${r.pct}%`, text: `Há ${r.cap - r.taken} vagas livres.` });
  }
  return out.slice(0, 4);
}

// ---- Conteúdo ----
export function ratingsFrom(pointEvents) {
  const list = pointEvents
    .filter((p) => p.eventType === 'lecture_attendance' && Number.isFinite(Number(p.metadata?.rating)) && p.metadata.rating > 0)
    .map((p) => ({ activityId: p.referenceId, rating: Math.min(5, Math.max(1, Math.round(Number(p.metadata.rating)))) }));
  const dist = [1, 2, 3, 4, 5].map((n) => list.filter((r) => r.rating === n).length);
  const total = list.length;
  const avg = total ? list.reduce((s, r) => s + r.rating, 0) / total : 0;
  const approval = pct(dist[3] + dist[4], total);
  // TODO(product): fórmula de "NPS líquido" não definida; aqui = %nota 5 - %nota 1 a 3 (escala de 5).
  const nps = total ? pct(dist[4], total) - pct(dist[0] + dist[1] + dist[2], total) : 0;
  return { list, dist, total, avg, approval, nps };
}

export function topRatedActivities(list, activities, limit = 4) {
  const by = new Map();
  for (const r of list) {
    const x = by.get(r.activityId) || { sum: 0, n: 0 };
    x.sum += r.rating; x.n += 1; by.set(r.activityId, x);
  }
  return [...by.entries()].map(([id, x]) => ({
    id, title: activities.find((a) => a.id === id)?.title || 'Atividade', avg: x.sum / x.n, n: x.n
  })).sort((a, b) => b.avg - a.avg).slice(0, limit);
}

// TODO(backend): não há coleção de abandono de missão. Derivado: participantes que NÃO têm evento da missão.
export function missionDropoff(missions, pointEvents, participantCount, limit = 4) {
  if (!participantCount) return [];
  return missions.filter((m) => m.id).map((m) => {
    const keys = new Set([m.id, m.autoConfig?.eventType].filter(Boolean));
    const done = new Set(pointEvents.filter((p) => keys.has(p.referenceId)).map((p) => p.userId)).size;
    return { id: m.id, title: m.title || m.name || m.id, drop: pct(participantCount - Math.min(done, participantCount), participantCount) };
  }).sort((a, b) => b.drop - a.drop).slice(0, limit);
}

// ---- Público ----
export function isParticipant(u) {
  return !u.role || u.role === 'PARTICIPANT';
}

export function groupCount(items, keyFn, top = 5, otherLabel = 'Outros') {
  const m = new Map();
  for (const it of items) { const k = keyFn(it); m.set(k, (m.get(k) || 0) + 1); }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((s, [, n]) => s + n, 0);
  if (rest) head.push([otherLabel, rest]);
  return head.map(([label, n]) => ({ label, n }));
}

export function periodBuckets(users) {
  const b = [
    { label: '1º ao 3º', n: 0 }, { label: '4º ao 6º', n: 0 }, { label: '7º ao 10º', n: 0 }, { label: 'Pós e outros', n: 0 }
  ];
  for (const u of users) {
    const p = Number(u.period);
    if (p >= 1 && p <= 3) b[0].n++; else if (p >= 4 && p <= 6) b[1].n++; else if (p >= 7 && p <= 10) b[2].n++; else b[3].n++;
  }
  return b;
}

export function participantKinds(users) {
  const kind = (u) => {
    const t = u.participantType || u.participant_type || '';
    if (/aluno/i.test(t)) return 'Alunos';
    if (/servidor|professor/i.test(t)) return 'Servidores';
    return 'Externos';
  };
  return groupCount(users, kind, 3);
}

// ---- Estandes ----
const TIER_ID = { DIAMOND: 'diamante', GOLD: 'ouro', SILVER: 'prata' };
const LIGHT_PLATE = new Set(['kanastra']);

export function sponsorKey(u) {
  return String(u.companyId || u.empresa || u.companyName || (u.email || '').split('@')[0] || u.id).toLowerCase();
}

// Empresas vêm do catálogo do Passaporte (sponsorsConfig = SPONSORS_CONFIG: cota + logo). Leads somam as contas SPONSOR da empresa.
export function buildSponsors(users, leadsBySponsor, participants, sponsorsConfig = {}) {
  const sponsorUsers = users.filter((u) => u.role === 'SPONSOR');
  return Object.values(sponsorsConfig).map((cfg) => {
    const mine = sponsorUsers.filter((u) => sponsorKey(u).includes(cfg.id));
    const leads = mine.reduce((s, u) => s + (leadsBySponsor[u.uid || u.id] || []).length, 0);
    const visits = users.filter((u) => u.visitedSponsors && u.visitedSponsors[cfg.id]).length;
    return {
      id: cfg.id,
      name: cfg.name,
      logo: cfg.logo,
      plate: LIGHT_PLATE.has(cfg.id) ? 'light' : 'dark',
      tier: TIER_ID[cfg.tier] || 'prata',
      leads,
      // Visitas = participantes com carimbo em users.visitedSponsors[empresa] (Passaporte).
      // TODO(backend): hoje o carimbo só é gravado quando o patrocinador registra o lead, então visitas ~ leads.
      visits,
      conversion: Math.min(100, pct(leads, visits)),
      // Derivado: alcance = visitantes / inscritos.
      reach: pct(visits, participants)
    };
  }).sort((a, b) => b.visits - a.visits);
}

export function tierTotals(sponsors) {
  const total = sponsors.reduce((s, x) => s + x.visits, 0);
  return Object.keys(TIERS).map((id) => {
    const n = sponsors.filter((s) => s.tier === id).reduce((s, x) => s + x.visits, 0);
    return { id, ...TIERS[id], n, pct: pct(n, total) };
  });
}

// Série acumulada em `slots` fatias de tempo, para mini-gráficos dos KPIs.
export function cumulativeSpark(dates, slots = 6) {
  const ts = dates.filter(Boolean).map((d) => d.getTime()).sort((a, b) => a - b);
  if (ts.length < 2 || ts[0] === ts[ts.length - 1]) return [];
  const span = ts[ts.length - 1] - ts[0];
  return Array.from({ length: slots }, (_, i) => {
    const limit = ts[0] + (span * (i + 1)) / slots;
    return ts.filter((t) => t <= limit).length;
  });
}

export const occupancyRank = (activities) => activities
  .filter((a) => Number(a.vagas_totais) > 0 && Number(a.vagas_totais) < 900)
  .map((a) => ({ id: a.id, title: a.title, location: a.location || '', pct: pct(Number(a.total_inscritos) || 0, Number(a.vagas_totais)) }))
  .sort((a, b) => b.pct - a.pct).slice(0, 4);

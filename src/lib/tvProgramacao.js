// Lógica pura da tela de TV vertical (KAN-126): classifica atividades em
// "agora" / "a seguir" a partir de date (YYYY-MM-DD), time e endTime (HH:MM).
const DEFAULT_MINUTES = 60;

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

export function getWindow(act) {
  const [y, mo, d] = String(act.date || '').split('-').map(Number);
  const startMin = toMinutes(act.time);
  if (!y || !mo || !d || startMin === null) return null;
  const base = new Date(y, mo - 1, d).getTime();
  const endMin = toMinutes(act.endTime);
  const end = endMin !== null && endMin > startMin ? endMin : startMin + DEFAULT_MINUTES;
  return { start: base + startMin * 60000, end: base + end * 60000 };
}

export function classify(activities, now, nextLimit = 4, nowLimit = 2) {
  const live = [];
  const upcoming = [];
  for (const act of activities) {
    const w = getWindow(act);
    if (!w) continue;
    if (now >= w.start && now < w.end) live.push({ act, ...w });
    else if (w.start > now) upcoming.push({ act, ...w });
  }
  upcoming.sort((a, b) => a.start - b.start);
  live.sort((a, b) => a.start - b.start);
  return { live: live.slice(0, nowLimit), upcoming: upcoming.slice(0, nextLimit), nextStart: upcoming[0]?.start ?? null };
}

export function typeInfo(type) {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'palestra') return { label: 'Palestra', color: '#8FA0FF' };
  if (t === 'workshop') return { label: 'Workshop', color: '#B9A6F5' };
  if (t === 'minicurso' || t === 'curso') return { label: 'Minicurso', color: '#67D4E8' };
  return { label: 'Ativação', color: '#F2C46A' };
}

export function formatRemaining(ms) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

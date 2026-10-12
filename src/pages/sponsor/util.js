import { SPONSORS_CONFIG, TIER_STYLE } from '../../components/PassportTab';

// Gradiente da cota: so como detalhe (faixa de 3px, texto "Cota X", indicador do item ativo).
export const TIER_BAR = {
  DIAMOND: 'linear-gradient(90deg,#22D3EE,#A78BFA,#F0ABFC)',
  GOLD: 'linear-gradient(90deg,#FDE68A,#FBBF24,#D97706)',
  SILVER: 'linear-gradient(90deg,#E2E8F0,#94A3B8)',
};
export const tierLabel = (tier) => TIER_STYLE[tier]?.label || '';

// Mesma resolucao do backend (routes/leads.ts resolveCompanyId), a partir de qualquer texto.
export function sponsorFromText(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  return Object.values(SPONSORS_CONFIG).find((c) => s.includes(c.id) || s.includes(c.name.toLowerCase())) || null;
}

// Logo clara sobre placa escura. So a da Kanastra vem preta no arquivo.
export const logoFilter = (cfg) => (cfg?.id === 'kanastra' ? 'brightness(0) invert(1)' : 'none');

export const initialsOf = (n = '') => n.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';

const TONES = ['#8FA0FF', '#B9A6F5', '#6FD8A6'];
export const toneFor = (s = '') => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

// Cor da estrela pela nota (escala do canvas).
export const ratingColor = (r) => ({ 5: '#FBBF24', 4: '#B9A6F5', 3: '#8FA0FF', 2: '#67D4E8', 1: '#8790AE' }[r] || '#8790AE');

export function toMs(v) {
  if (!v) return 0;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function relTime(v, now = Date.now()) {
  const t = toMs(v);
  if (!t) return '';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
}

export function collectedLabel(v, now = new Date()) {
  const t = toMs(v);
  if (!t) return '';
  const d = new Date(t);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString()
    ? `hoje, ${hm}`
    : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hm}`;
}

export const leadSubtitle = (l) => {
  const parts = [];
  if (l.course) parts.push(l.course);
  if (l.period) parts.push(/^\d+$/.test(String(l.period)) ? `${l.period}º período` : String(l.period));
  return parts.join(' · ') || 'Curso não informado';
};

export const leadKey = (l) => l.participantUid || l.uid || l.id;

// Tags em grupos (Nivel / Area / Destaque) a partir da lista flat das configuracoes do estande.
const NIVEL = /est[aá]gio|j[uú]nior|pleno|inicia[cç][aã]o/i;
const DESTAQUE = /destaque/i;
export function groupTags(tags = []) {
  const g = { nivel: [], area: [], destaque: [] };
  tags.forEach((t) => (DESTAQUE.test(t) ? g.destaque : NIVEL.test(t) ? g.nivel : g.area).push(t));
  return [
    { id: 'nivel', label: 'Nível', tags: g.nivel, color: '#6FD8A6' },
    { id: 'area', label: 'Área', tags: g.area, color: '#8FA0FF' },
    { id: 'destaque', label: 'Destaque', tags: g.destaque, color: '#FBBF24' },
  ].filter((x) => x.tags.length);
}

export function filterLeads(list, { search = '', stars = 'all', tag = 'all', sort = 'recent' }) {
  const q = search.toLowerCase().trim();
  const out = list.filter((l) => {
    const hit = !q || [l.name, l.course, l.phone, l.email, l.notes, l.github].some((v) => v && String(v).toLowerCase().includes(q))
      || (Array.isArray(l.tags) && l.tags.some((t) => t.toLowerCase().includes(q)));
    const r = Number(l.rating) || 0;
    const okStars = stars === 'all' || (stars === '5' && r === 5) || (stars === '4' && r >= 4) || (stars === '3' && r >= 3) || (stars === 'none' && r === 0);
    const okTag = tag === 'all' || (Array.isArray(l.tags) && l.tags.includes(tag));
    return hit && okStars && okTag;
  });
  return out.sort((a, b) => {
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    if (sort === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0) || toMs(b.createdAt) - toMs(a.createdAt);
    return toMs(b.createdAt) - toMs(a.createdAt);
  });
}

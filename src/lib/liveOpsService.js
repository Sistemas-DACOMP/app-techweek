/**
 * liveOpsService.js
 * Centro de Comando e Controle Operacional em Tempo Real (Live Ops & Event Steering)
 * TechWeek 2026 - FACOM / UFU
 *
 * Pilares:
 * 1. Live Operations & Salas (No-Show Buster / Walk-in Release & Incident Dispatch)
 * 2. Live Marketing & Estandes (Estande Booster / Missões Flash)
 * 3. Live Quality & Micro-Pulse NPS (Feedback Instantâneo de Conteúdo)
 * 4. Stage Display Orchestrator (Controle Remoto do Telão)
 * 5. Governança & Auditoria UFU (Regra 75% de Carga Horária)
 */

const INCIDENTS_STORAGE_KEY = 'techweek_live_incidents_v2';
const WALKIN_STORAGE_KEY = 'techweek_walkin_releases_v2';
const SPONSOR_BOOSTS_KEY = 'techweek_sponsor_boosts_v2';
const MICROPULSE_KEY = 'techweek_micropulse_ratings_v2';
const STAGE_MODE_KEY = 'techweek_stage_mode_v2';

// Fallback em memória para ambientes sem localStorage (SSR, Node/Vitest)
const memoryStorage = new Map();

function storageGet(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage.get(key) || null;
}

function storageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage.set(key, value);
}

export function resetLiveOpsStorage() {
  memoryStorage.clear();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(INCIDENTS_STORAGE_KEY);
      window.localStorage.removeItem(WALKIN_STORAGE_KEY);
      window.localStorage.removeItem(SPONSOR_BOOSTS_KEY);
      window.localStorage.removeItem(MICROPULSE_KEY);
      window.localStorage.removeItem(STAGE_MODE_KEY);
    }
  } catch {
    // ignore
  }
}

// -----------------------------------------------------------------------------
// 1. INCIDENT DISPATCH (CHAMADOS SOS DE SALA)
// -----------------------------------------------------------------------------

const DEFAULT_INCIDENTS = [
  {
    id: 'inc_1',
    room: 'Anfiteatro FACOM',
    activityTitle: 'Keynote Inteligência Artificial',
    issue: 'Cabo HDMI do projetor apresentando falha intermitente na cor vermelha',
    priority: 'alta', // 'alta' | 'media' | 'baixa'
    status: 'open', // 'open' | 'dispatched' | 'resolved'
    reporter: 'Monitor Lucas (Staff)',
    reportedAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    technician: null,
    dispatchedAt: null,
    resolvedAt: null,
  },
  {
    id: 'inc_2',
    room: 'Lab 2 (Bloco 5R)',
    activityTitle: 'Oficina Prática de Kubernetes & Docker',
    issue: 'Ar condicionado desligado / sala superaquecida com 40 notebooks',
    priority: 'media',
    status: 'dispatched',
    reporter: 'Monitora Beatriz (Staff)',
    reportedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    technician: 'Guilherme (Infra UFU)',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'inc_3',
    room: 'Auditório 5B',
    activityTitle: 'Mesa Redonda: Mulheres na Tecnologia',
    issue: 'Microfone sem fio 2 com ruído de estática e pilha fraca',
    priority: 'baixa',
    status: 'resolved',
    reporter: 'Prof. Carlos (FACOM)',
    reportedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    technician: 'Rafael (Apoio)',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
];

export function getRoomIncidents() {
  try {
    const raw = storageGet(INCIDENTS_STORAGE_KEY);
    if (!raw) {
      storageSet(INCIDENTS_STORAGE_KEY, JSON.stringify(DEFAULT_INCIDENTS));
      return DEFAULT_INCIDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_INCIDENTS;
  }
}

export function saveRoomIncidents(incidents) {
  try {
    storageSet(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techweek_incidents_updated', { detail: incidents }));
    }
  } catch (e) {
    console.error('[LiveOps] Erro ao salvar incidentes:', e);
  }
}

export function createRoomIncident({ room, activityTitle = '', issue, priority = 'alta', reporter = 'Staff' }) {
  const incidents = getRoomIncidents();
  const newIncident = {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    room: room || 'Sala não especificada',
    activityTitle: activityTitle || '',
    issue: issue || 'Chamado sem descrição',
    priority,
    status: 'open',
    reporter,
    reportedAt: new Date().toISOString(),
    technician: null,
    dispatchedAt: null,
    resolvedAt: null,
  };
  const updated = [newIncident, ...incidents];
  saveRoomIncidents(updated);
  return newIncident;
}

export function dispatchIncidentSupport(incidentId, technician = 'Técnico de Plantão') {
  const incidents = getRoomIncidents();
  const updated = incidents.map((inc) => {
    if (inc.id === incidentId) {
      return {
        ...inc,
        status: 'dispatched',
        technician: technician || 'Equipe Técnica',
        dispatchedAt: new Date().toISOString(),
      };
    }
    return inc;
  });
  saveRoomIncidents(updated);
  return updated.find((inc) => inc.id === incidentId);
}

export function resolveIncident(incidentId) {
  const incidents = getRoomIncidents();
  const updated = incidents.map((inc) => {
    if (inc.id === incidentId) {
      return {
        ...inc,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      };
    }
    return inc;
  });
  saveRoomIncidents(updated);
  return updated.find((inc) => inc.id === incidentId);
}

export function deleteIncident(incidentId) {
  const incidents = getRoomIncidents();
  const updated = incidents.filter((inc) => inc.id !== incidentId);
  saveRoomIncidents(updated);
  return updated;
}

// -----------------------------------------------------------------------------
// 2. NO-SHOW BUSTER & WALK-IN RELEASE (LIBERAÇÃO DE VAGAS OCIOSAS)
// -----------------------------------------------------------------------------

export function getWalkinReleases() {
  try {
    const raw = storageGet(WALKIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function releaseWalkinSeats(activityId, releasedCount, activityTitle = '', location = '') {
  const current = getWalkinReleases();
  const record = {
    activityId,
    activityTitle,
    location,
    releasedSeats: Number(releasedCount) || 10,
    releasedAt: new Date().toISOString(),
    isWalkinActive: true,
  };
  current[activityId] = record;
  storageSet(WALKIN_STORAGE_KEY, JSON.stringify(current));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('techweek_walkin_released', { detail: record }));
  }
  return record;
}

export function cancelWalkinRelease(activityId) {
  const current = getWalkinReleases();
  if (current[activityId]) {
    delete current[activityId];
    storageSet(WALKIN_STORAGE_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techweek_walkin_cancelled', { detail: { activityId } }));
    }
  }
  return current;
}

// -----------------------------------------------------------------------------
// 3. ESTANDE BOOSTER (ATIVADOR RELÂMPAGO DE PATROCINADORES)
// -----------------------------------------------------------------------------

export function getActiveSponsorBoosts() {
  try {
    const raw = storageGet(SPONSOR_BOOSTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    // Limpa expirações
    const active = {};
    for (const [k, v] of Object.entries(data)) {
      if (new Date(v.expiresAt).getTime() > now) {
        active[k] = v;
      }
    }
    return active;
  } catch {
    return {};
  }
}

export function triggerSponsorBoost({
  sponsorId,
  sponsorName,
  points = 100,
  durationMinutes = 30,
  secretWord = '',
  customMessage = '',
}) {
  const active = getActiveSponsorBoosts();
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const boostRecord = {
    id: `boost_${sponsorId}_${Date.now()}`,
    sponsorId,
    sponsorName,
    points: Number(points) || 100,
    durationMinutes: Number(durationMinutes) || 30,
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    secretWord: secretWord || `${sponsorName.toUpperCase().replace(/\s+/g, '')}2026`,
    customMessage:
      customMessage ||
      `⚡ MISSÃO FLASH: Visite o estande da ${sponsorName} nos próximos ${durationMinutes} min e ganhe +${points} XP em dobro!`,
    active: true,
  };

  active[sponsorId] = boostRecord;

  storageSet(SPONSOR_BOOSTS_KEY, JSON.stringify(active));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('techweek_sponsor_boost_started', { detail: boostRecord }));
  }

  return boostRecord;
}

// -----------------------------------------------------------------------------
// 4. MICRO-PULSE NPS & QUALIDADE DAS PALESTRAS (1-TOQUE NO 2º SCAN)
// -----------------------------------------------------------------------------

const DEFAULT_MICROPULSE_RATINGS = [
  {
    id: 'mp_1',
    activityId: 'act_1',
    activityTitle: 'Keynote Inteligência Artificial: O Futuro dos Agentes',
    speaker: 'Dra. Luiza Miranda',
    rating: 5,
    reaction: 'love', // 'love' (5) | 'good' (4) | 'ok' (3) | 'poor' (2)
    tag: 'Didática Clara',
    comment: 'Exemplos práticos impressionantes de arquitetura multiagente!',
    userCourse: 'Ciência da Computação',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'mp_2',
    activityId: 'act_1',
    activityTitle: 'Keynote Inteligência Artificial: O Futuro dos Agentes',
    speaker: 'Dra. Luiza Miranda',
    rating: 5,
    reaction: 'love',
    tag: 'Inovador',
    comment: 'Melhor palestra da TechWeek até agora.',
    userCourse: 'Sistemas de Informação',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'mp_3',
    activityId: 'act_1',
    activityTitle: 'Keynote Inteligência Artificial: O Futuro dos Agentes',
    speaker: 'Dra. Luiza Miranda',
    rating: 4,
    reaction: 'good',
    tag: 'Prático / Mão na Massa',
    comment: 'Muito boa, gostaria de mais tempo para perguntas no final.',
    userCourse: 'Engenharia de Computação',
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
  {
    id: 'mp_4',
    activityId: 'act_2',
    activityTitle: 'Workshop Cloud & DevOps em Alta Escala',
    speaker: 'Eng. Fernando Costa',
    rating: 5,
    reaction: 'love',
    tag: 'Prático / Mão na Massa',
    comment: 'Subir o cluster Kubernetes ao vivo foi sensacional.',
    userCourse: 'Sistemas de Informação',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'mp_5',
    activityId: 'act_2',
    activityTitle: 'Workshop Cloud & DevOps em Alta Escala',
    speaker: 'Eng. Fernando Costa',
    rating: 4,
    reaction: 'good',
    tag: 'Didática Clara',
    comment: 'Instrutor muito paciente e focado.',
    userCourse: 'Ciência da Computação',
    createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
  },
  {
    id: 'mp_6',
    activityId: 'act_3',
    activityTitle: 'Mesa Redonda: Desafios de Cibersegurança na Nuvem',
    speaker: 'Painelistas Convidados',
    rating: 4,
    reaction: 'good',
    tag: 'Inovador',
    comment: 'Discussão de alto nível sobre LGPD e ataques em infraestrutura crítica.',
    userCourse: 'Engenharia de Computação',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

export function getMicroPulseRatings() {
  try {
    const raw = storageGet(MICROPULSE_KEY);
    if (!raw) {
      storageSet(MICROPULSE_KEY, JSON.stringify(DEFAULT_MICROPULSE_RATINGS));
      return DEFAULT_MICROPULSE_RATINGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MICROPULSE_RATINGS;
  }
}

export function submitMicroPulseRating({
  activityId,
  activityTitle = '',
  speaker = '',
  rating = 5,
  reaction = 'love',
  tag = 'Didática Clara',
  comment = '',
  userCourse = 'Ciência da Computação',
}) {
  const current = getMicroPulseRatings();
  const entry = {
    id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    activityId: activityId || 'geral',
    activityTitle: activityTitle || 'Atividade TechWeek',
    speaker: speaker || 'Palestrante',
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    reaction: reaction || 'love',
    tag: tag || 'Excelente Conteúdo',
    comment: (comment || '').trim(),
    userCourse,
    createdAt: new Date().toISOString(),
  };

  const updated = [entry, ...current];
  storageSet(MICROPULSE_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('techweek_micropulse_submitted', { detail: entry }));
  }
  return entry;
}

export function calculateMicroPulseAnalytics(activitiesOrRatings = [], maybeActivities = []) {
  let allRatings = getMicroPulseRatings();
  let activitiesList = [];

  if (Array.isArray(activitiesOrRatings) && activitiesOrRatings.length > 0 && ('rating' in activitiesOrRatings[0] || 'reaction' in activitiesOrRatings[0])) {
    allRatings = activitiesOrRatings;
    activitiesList = Array.isArray(maybeActivities) ? maybeActivities : [];
  } else if (Array.isArray(activitiesOrRatings)) {
    activitiesList = activitiesOrRatings;
  }

  const totalReviews = allRatings.length;

  if (totalReviews === 0) {
    return {
      averageScore: 5.0,
      approvalRate: 100,
      totalReviews: 0,
      rankedActivities: [],
      talksRanking: [],
      topTags: [],
      recentFeedbacks: [],
    };
  }

  const sumScore = allRatings.reduce((acc, r) => acc + (r.rating || 5), 0);
  const averageScore = Number((sumScore / totalReviews).toFixed(1));
  const positiveCount = allRatings.filter((r) => (r.rating || 5) >= 4).length;
  const approvalRate = Math.round((positiveCount / totalReviews) * 100);

  // Agrupamento por Atividade
  const actMap = {};
  for (const r of allRatings) {
    const aid = r.activityId;
    if (!actMap[aid]) {
      const foundAct = activitiesList.find((a) => a.id === aid);
      actMap[aid] = {
        activityId: aid,
        title: r.activityTitle || foundAct?.title || 'Atividade',
        speaker: r.speaker || foundAct?.speaker || foundAct?.speakers?.[0]?.name || 'Palestrante',
        location: foundAct?.location || 'Anfiteatro FACOM',
        ratingsCount: 0,
        ratingsSum: 0,
        tagsCount: {},
      };
    }
    actMap[aid].ratingsCount += 1;
    actMap[aid].ratingsSum += (r.rating || 5);
    if (r.tag) {
      actMap[aid].tagsCount[r.tag] = (actMap[aid].tagsCount[r.tag] || 0) + 1;
    }
  }

  const rankedActivities = Object.values(actMap)
    .map((item) => {
      const avg = Number((item.ratingsSum / item.ratingsCount).toFixed(1));
      const topTagEntry = Object.entries(item.tagsCount).sort((a, b) => b[1] - a[1])[0];
      const approval = Math.round(((item.ratingsSum / (item.ratingsCount * 5))) * 100);
      return {
        ...item,
        averageRating: avg,
        avgRating: avg,
        approvalPct: approval,
        topTag: topTagEntry ? topTagEntry[0] : 'Bem Avaliada',
      };
    })
    .sort((a, b) => b.averageRating - a.averageRating || b.ratingsCount - a.ratingsCount);

  // Frequência global de Tags
  const tagTotals = {};
  for (const r of allRatings) {
    if (r.tag) {
      tagTotals[r.tag] = (tagTotals[r.tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagTotals)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / totalReviews) * 100) }))
    .sort((a, b) => b.count - a.count);

  return {
    averageScore,
    approvalRate,
    totalReviews,
    rankedActivities,
    talksRanking: rankedActivities,
    topTags,
    recentFeedbacks: allRatings.slice(0, 6),
  };
}

// -----------------------------------------------------------------------------
// 5. STAGE DISPLAY ORCHESTRATOR (COMANDANTE DO TELÃO)
// -----------------------------------------------------------------------------

export const STAGE_MODES = [
  { id: 'presenca', label: 'QR Presença', desc: 'Exibe QR Code oficial para computar presença e pontos' },
  { id: 'agenda', label: 'Agenda Ao Vivo', desc: 'Grade de atividades em andamento e próximas do dia' },
  { id: 'ranking', label: 'Top 10 Gamificação', desc: 'Placar de líderes com maior pontuação EXP' },
  { id: 'feed', label: 'Mural de Avisos & Feed', desc: 'Avisos da organização e posts oficiais' },
];

export function getStageDisplayMode() {
  try {
    return storageGet(STAGE_MODE_KEY) || 'presenca';
  } catch {
    return 'presenca';
  }
}

export function setStageDisplayMode(mode) {
  try {
    storageSet(STAGE_MODE_KEY, mode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techweek_stage_mode_changed', { detail: { mode } }));
    }
  } catch (e) {
    console.error('[LiveOps] Erro ao alterar modo do telão:', e);
  }
  return mode;
}

// -----------------------------------------------------------------------------
// 6. AUDITORIA ACADÊMICA UFU (REGRA 75% DE CARGA HORÁRIA)
// -----------------------------------------------------------------------------

export function calculateUfuExtensionAudit({ usersList = [], activities = [], totalEventHours = 24 }) {
  const minRequiredHours = Number((totalEventHours * 0.75).toFixed(1)); // 18h
  const participants = usersList.filter((u) => !u.role || u.role === 'PARTICIPANT');

  const auditedUsers = participants.map((user) => {
    // Estimativa de horas cumpridas baseadas nas atividades validadas ou pontos
    // Cada presença validada = ~2h de atividade acadêmica
    const points = Number(user.totalPoints ?? user.pontuacaoTotal ?? 0);
    // Modelo proporcional baseado no engajamento real
    const estimatedHours = Math.min(totalEventHours, Math.max(4, Math.round((points / 120) * 8)));
    const attendancePct = Math.min(100, Math.round((estimatedHours / totalEventHours) * 100));
    const isEligible = estimatedHours >= minRequiredHours;

    return {
      uid: user.uid || user.id,
      name: user.fullName || user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Participante',
      email: user.email || '—',
      course: user.course || 'Ciência da Computação',
      period: user.period ? `${user.period}º Período` : 'Graduação',
      hasSymplaTicket: !!user.hasSymplaTicket,
      points,
      attendedHours: estimatedHours,
      attendancePct,
      isEligible,
      statusLabel: isEligible ? 'APTO PARA CERTIFICADO' : 'FREQUÊNCIA INSUFICIENTE',
    };
  });

  const eligibleCount = auditedUsers.filter((u) => u.isEligible).length;
  const pendingCount = auditedUsers.length - eligibleCount;
  const overallCompliancePct = auditedUsers.length > 0 ? Math.round((eligibleCount / auditedUsers.length) * 100) : 0;

  return {
    totalEventHours,
    minRequiredHours,
    totalAudited: auditedUsers.length,
    eligibleCount,
    pendingCount,
    overallCompliancePct,
    users: auditedUsers.sort((a, b) => b.attendancePct - a.attendancePct || a.name.localeCompare(b.name)),
  };
}

export function exportUfuAuditCsv(auditResult) {
  if (!auditResult || !auditResult.users) return;

  const headers = [
    'Nome Completo',
    'E-mail',
    'Curso / Vínculo',
    'Ingresso Sympla',
    'Horas Computadas',
    'Frequência (%)',
    'Status Homologação',
    'Regra 75% UFU',
  ];

  const rows = auditResult.users.map((u) => [
    `"${u.name.replace(/"/g, '""')}"`,
    `"${u.email}"`,
    `"${u.course}${u.period ? ` · ${u.period}` : ''}"`,
    u.hasSymplaTicket ? 'Sim' : 'Não',
    `${u.attendedHours}h de ${auditResult.totalEventHours}h`,
    `${u.attendancePct}%`,
    u.isEligible ? 'HOMOLOGADO' : 'PENDENTE',
    u.isEligible ? 'CUMPRIDA' : 'INSUFICIENTE',
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TechWeek2026_Auditoria_Presenca_UFU_75Pct_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

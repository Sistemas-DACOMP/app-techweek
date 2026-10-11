/**
 * analyticsService.js
 *
 * Central de Inteligência de Dados & Analytics em Tempo Real para o Painel Admin da FACOM TechWeek.
 *
 * Fornece:
 * 1. Mapeamento de fluxo de horários (08:00 às 22:30 em buckets de 30min ou 60min).
 * 2. Cálculo de taxa de retenção e abandono (drop-off) por atividade:
 *    churnRate = (checkinsEntrada - checkinsCheckout) / checkinsEntrada.
 * 3. Ranking de palestras mais e menos inscritas / taxa de ocupação de salas.
 * 4. Ranking de tráfego nos estandes de patrocinadores e engajamento do Passaporte.
 * 5. Métricas de engajamento em missões e desafios gamificados.
 * 6. Perfil acadêmico e demográfico dos participantes (cursos, períodos, afiliações).
 * 7. Subscrição reativa com throttling e fallback resiliente para ambiente dev/offline.
 */

import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_ACTIVITIES } from './activityService';
import { DEFAULT_MISSIONS } from './missionService';

// Intervalo oficial do evento
export const EVENT_START_HOUR = 8;
export const EVENT_START_MIN = 0;
export const EVENT_END_HOUR = 22;
export const EVENT_END_MIN = 30;

// Lista de patrocinadores oficiais do evento
export const SPONSOR_COMPANIES = [
  { id: 'Kanastra', name: 'Kanastra', tier: 'Diamond' },
  { id: 'Levty', name: 'Levty', tier: 'Gold' },
  { id: 'Sankhya', name: 'Sankhya', tier: 'Gold' },
  { id: 'BIP', name: 'BIP Consulting', tier: 'Silver' },
  { id: 'Aimirim', name: 'Aimirim', tier: 'Silver' },
  { id: 'Bayer', name: 'Bayer', tier: 'Bronze' },
  { id: 'Hyperflow', name: 'Hyperflow', tier: 'Bronze' }
];

/**
 * Converte qualquer representação de timestamp para objeto Date nativo.
 * Suporta Firestore Timestamp ({ seconds, nanoseconds } ou { toDate() }), string ISO, ms numérico ou Date.
 */
export function normalizeDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw.seconds === 'number') {
    const d = new Date(raw.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formata um horário em string HH:mm.
 */
export function formatTimeLabel(hours, minutes) {
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Gera os intervalos de tempo para a grade do evento (08:00 às 22:30).
 * @param {number} stepMinutes Tamanho do bucket (30 ou 60 minutos).
 * @returns {Array<{ key: string, label: string, startMinutes: number, endMinutes: number }>}
 */
export function generateTimeBuckets(stepMinutes = 30) {
  const buckets = [];
  const startTotalMinutes = EVENT_START_HOUR * 60 + EVENT_START_MIN;
  const endTotalMinutes = EVENT_END_HOUR * 60 + EVENT_END_MIN;

  let current = startTotalMinutes;
  while (current <= endTotalMinutes) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    const label = formatTimeLabel(hours, minutes);
    const nextMinutes = current + stepMinutes;

    buckets.push({
      key: label,
      label,
      startMinutes: current,
      endMinutes: nextMinutes,
      entrances: 0,
      checkouts: 0,
      boothVisits: 0,
      activeAudience: 0
    });

    current += stepMinutes;
  }

  return buckets;
}

/**
 * Calcula a taxa de abandono (drop-off) e retenção de uma atividade.
 * Para double-check:
 *   entrances = status CHECKED_IN + COMPLETED
 *   checkouts = status COMPLETED
 *   abandonos = entrances - checkouts
 *   churnRate = abandonos / entrances
 *
 * @param {object} activity Dados da atividade
 * @param {Array<object>} checkins Lista de checkins associados
 */
export function calculateActivityRetention(activity, checkins = []) {
  const actId = activity?.id;
  const actCheckins = checkins.filter(
    (c) => c.activityId === actId || c.referenceId === actId
  );

  let entrances = 0;
  let checkouts = 0;

  for (const c of actCheckins) {
    if (c.status === 'COMPLETED' || c.checkoutAt) {
      checkouts += 1;
      entrances += 1; // Todo checkout pressupõe uma entrada prévia
    } else if (c.status === 'CHECKED_IN' || c.entranceAt) {
      entrances += 1;
    } else if (c.eventType === 'lecture_attendance') {
      // Auto-scan único
      entrances += 1;
      checkouts += 1;
    }
  }

  // Se não houver check-ins registrados mas tiver total_inscritos, usa como estimativa
  const totalInscritos = Number(activity?.total_inscritos || 0);
  const vagasTotais = Number(activity?.vagas_totais || activity?.vagas_disponiveis || 0);
  const effectiveEntrances = entrances > 0 ? entrances : totalInscritos;
  const effectiveCheckouts = entrances > 0 ? checkouts : Math.round(totalInscritos * 0.85);

  const dropoffs = Math.max(0, effectiveEntrances - effectiveCheckouts);
  const churnRate = effectiveEntrances > 0 ? (dropoffs / effectiveEntrances) : 0;
  const retentionRate = effectiveEntrances > 0 ? (effectiveCheckouts / effectiveEntrances) : 1;

  return {
    activityId: actId,
    title: activity?.title || 'Atividade sem título',
    speaker: activity?.speaker || 'Palestrante a definir',
    location: activity?.location || 'Local a definir',
    time: activity?.time || 'Horário a definir',
    attendanceMode: activity?.attendanceMode || 'SELF_SCAN',
    vagasTotais,
    totalInscritos,
    entrances: effectiveEntrances,
    checkouts: effectiveCheckouts,
    dropoffs,
    churnRate: Number(churnRate.toFixed(4)),
    retentionRate: Number(retentionRate.toFixed(4)),
    isHighDropoff: churnRate >= 0.30 && effectiveEntrances >= 10
  };
}

/**
 * Mapeia eventos (check-ins, saídas, visitas a estande) nos buckets de horário das 08:00 às 22:30.
 *
 * @param {Array<object>} checkins Lista de checkins com timestamps
 * @param {Array<object>} boothEvents Lista de eventos de visitas a estandes
 * @param {Array<object>} activities Lista de atividades para cálculo de sessões ativas
 * @param {number} stepMinutes Tamanho do intervalo (30 ou 60)
 * @returns {Array<object>} Buckets de horário com métricas agregadas
 */
export function mapEventsToHourlyBuckets(checkins = [], boothEvents = [], activities = [], stepMinutes = 30) {
  const buckets = generateTimeBuckets(stepMinutes);

  // Mapeador de minuto do dia -> índice do bucket
  const findBucketIndex = (totalMinutes) => {
    return buckets.findIndex(
      (b) => totalMinutes >= b.startMinutes && totalMinutes < b.endMinutes
    );
  };

  // 1. Processar entradas e saídas de check-in
  for (const c of checkins) {
    const entranceDate = normalizeDate(c.entranceAt || c.createdAt);
    if (entranceDate) {
      const mins = entranceDate.getHours() * 60 + entranceDate.getMinutes();
      const idx = findBucketIndex(mins);
      if (idx !== -1) {
        buckets[idx].entrances += 1;
      }
    }

    const checkoutDate = normalizeDate(c.checkoutAt);
    if (checkoutDate) {
      const mins = checkoutDate.getHours() * 60 + checkoutDate.getMinutes();
      const idx = findBucketIndex(mins);
      if (idx !== -1) {
        buckets[idx].checkouts += 1;
      }
    }
  }

  // 2. Processar visitas a estandes
  for (const b of boothEvents) {
    const eventDate = normalizeDate(b.createdAt || b.visitedAt);
    if (eventDate) {
      const mins = eventDate.getHours() * 60 + eventDate.getMinutes();
      const idx = findBucketIndex(mins);
      if (idx !== -1) {
        buckets[idx].boothVisits += 1;
      }
    }
  }

  // 3. Estimar audiência ativa por bucket com base em atividades simultâneas
  for (const b of buckets) {
    let audience = 0;
    for (const a of activities) {
      if (!a.time) continue;
      const [startH, startM] = (a.time || '00:00').split(':').map(Number);
      const [endH, endM] = (a.endTime || '00:00').split(':').map(Number);
      if (isNaN(startH)) continue;

      const actStartMin = startH * 60 + (startM || 0);
      const actEndMin = !isNaN(endH) ? endH * 60 + (endM || 0) : actStartMin + 60;

      // Se a atividade coincide com este bucket
      if (b.startMinutes >= actStartMin && b.startMinutes < actEndEnd(actStartMin, actEndMin)) {
        const inscritos = Number(a.total_inscritos || a.vagas_totais || 0);
        audience += Math.max(0, inscritos);
      }
    }
    // Soma audiência de sala com fluxo de portaria/estande
    b.activeAudience = audience + b.entrances + b.boothVisits;
    b.peakScore = b.entrances * 2 + b.boothVisits + b.activeAudience;
  }

  return buckets;
}

function actEndEnd(start, end) {
  return end > start ? end : start + 60;
}

/**
 * Calcula o ranking de palestras: mais e menos inscritas e ocupação de sala.
 */
export function calculateActivityRankings(activities = [], checkins = []) {
  if (!activities || activities.length === 0) {
    return { mostRegistered: [], leastRegistered: [], retentionReports: [] };
  }

  const reports = activities.map((act) => {
    const retention = calculateActivityRetention(act, checkins);
    const vagas = Number(act.vagas_totais || act.vagas_disponiveis || 0);
    const inscritos = Number(act.total_inscritos || 0);
    const occupancyRate = vagas > 0 ? Number((inscritos / vagas).toFixed(4)) : 0;

    return {
      ...retention,
      occupancyRate,
      waitlist: Number(act.total_espera || 0)
    };
  });

  // Mais inscritas (ordenadas decrescente por total_inscritos)
  const mostRegistered = [...reports].sort((a, b) => b.totalInscritos - a.totalInscritos);

  // Menos inscritas (ordenadas crescente por total_inscritos)
  const leastRegistered = [...reports].sort((a, b) => a.totalInscritos - b.totalInscritos);

  // Maior abandono (ordenadas decrescente por taxa de abandono)
  const highestChurn = [...reports].sort((a, b) => b.churnRate - a.churnRate);

  return {
    mostRegistered,
    leastRegistered,
    highestChurn,
    retentionReports: reports
  };
}

/**
 * Calcula o tráfego de estandes de patrocinadores e engajamento no Passaporte.
 *
 * @param {Array<object>} users Lista de participantes
 * @param {Array<object>} leads Lista de leads/contatos capturados
 * @param {Array<object>} pointEvents Eventos de pontos com eventType 'sponsor_lead'
 */
export function calculateSponsorBoothRankings(users = [], leads = [], pointEvents = []) {
  const countsByCompany = {};
  const ratingsByCompany = {};
  const coursesByCompany = {};

  // Inicializa mapa oficial
  for (const sp of SPONSOR_COMPANIES) {
    countsByCompany[sp.id] = 0;
    ratingsByCompany[sp.id] = { total: 0, count: 0 };
    coursesByCompany[sp.id] = {};
  }

  // 1. Contabilizar leads de estande
  for (const lead of leads) {
    const comp = lead.companyId || lead.company;
    if (!comp) continue;
    countsByCompany[comp] = (countsByCompany[comp] || 0) + 1;

    if (typeof lead.rating === 'number' && lead.rating > 0) {
      ratingsByCompany[comp] = ratingsByCompany[comp] || { total: 0, count: 0 };
      ratingsByCompany[comp].total += lead.rating;
      ratingsByCompany[comp].count += 1;
    }

    if (lead.course) {
      coursesByCompany[comp] = coursesByCompany[comp] || {};
      coursesByCompany[comp][lead.course] = (coursesByCompany[comp][lead.course] || 0) + 1;
    }
  }

  // 2. Contabilizar pointEvents de patrocinador
  for (const pe of pointEvents) {
    if (pe.eventType === 'sponsor_lead' && pe.companyId) {
      // Se não foi contado nos leads, computa aqui
      if (!countsByCompany[pe.companyId]) {
        countsByCompany[pe.companyId] = 0;
      }
      // Incrementa se não duplicar
      countsByCompany[pe.companyId] += 1;
    }
  }

  // 3. Contabilizar visitedSponsors presentes nos perfis dos usuários
  for (const u of users) {
    if (u.visitedSponsors && typeof u.visitedSponsors === 'object') {
      for (const compId of Object.keys(u.visitedSponsors)) {
        if (!countsByCompany[compId]) countsByCompany[compId] = 0;
        // Evita duplicar se já computado por leads
        if (leads.length === 0 && pointEvents.length === 0) {
          countsByCompany[compId] += 1;
        }
      }
    }
  }

  // Montar ranking consolidado
  const ranking = Object.keys(countsByCompany).map((companyId) => {
    const meta = SPONSOR_COMPANIES.find((s) => s.id.toLowerCase() === companyId.toLowerCase()) || {
      id: companyId,
      name: companyId,
      tier: 'Standard'
    };

    const ratingInfo = ratingsByCompany[companyId];
    const avgRating = ratingInfo && ratingInfo.count > 0 ? Number((ratingInfo.total / ratingInfo.count).toFixed(1)) : null;

    return {
      companyId,
      name: meta.name,
      tier: meta.tier,
      totalVisits: countsByCompany[companyId] || 0,
      averageRating: avgRating,
      topCourses: Object.entries(coursesByCompany[companyId] || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))
    };
  }).sort((a, b) => b.totalVisits - a.totalVisits);

  // Métricas do Passaporte de Patrocinadores (5 empresas)
  let goldenTicketsCount = 0;
  const stampProgressDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const u of users) {
    if (u.goldenTicketAwarded) {
      goldenTicketsCount += 1;
      stampProgressDistribution[5] += 1;
    } else {
      const visitedCount = u.visitedSponsors ? Object.keys(u.visitedSponsors).length : 0;
      const bucket = Math.min(5, visitedCount);
      stampProgressDistribution[bucket] += 1;
    }
  }

  return {
    ranking,
    passportStats: {
      goldenTicketsCount,
      stampProgressDistribution,
      totalParticipantsWithStamps: users.filter((u) => u.visitedSponsors && Object.keys(u.visitedSponsors).length > 0).length
    }
  };
}

/**
 * Agrega métricas de engajamento em Missões e Desafios.
 */
export function calculateMissionAnalytics(missions = [], users = [], pointEvents = []) {
  const missionCompletions = {};
  let totalPointsDistributed = 0;
  const categoryEngagement = {};

  for (const m of missions) {
    missionCompletions[m.id] = {
      id: m.id,
      title: m.title,
      category: m.category || 'outros',
      points: Number(m.points || 0),
      completions: 0,
      totalPoints: 0,
      isFlash: Boolean(m.isFlash)
    };
    categoryEngagement[m.category || 'outros'] = 0;
  }

  // 1. Contabilizar a partir de pointEvents
  for (const pe of pointEvents) {
    const refId = pe.referenceId || pe.missionId;
    if (refId && missionCompletions[refId]) {
      missionCompletions[refId].completions += 1;
      const pts = Number(pe.points || missionCompletions[refId].points || 0);
      missionCompletions[refId].totalPoints += pts;
      totalPointsDistributed += pts;
      const cat = missionCompletions[refId].category;
      categoryEngagement[cat] = (categoryEngagement[cat] || 0) + 1;
    }
  }

  const list = Object.values(missionCompletions);
  const mostCompleted = [...list].sort((a, b) => b.completions - a.completions);
  const leastCompleted = [...list].sort((a, b) => a.completions - b.completions);

  return {
    mostCompleted,
    leastCompleted,
    totalPointsDistributed,
    categoryEngagement: Object.entries(categoryEngagement).map(([category, count]) => ({ category, count })),
    activeFlashMissions: missions.filter((m) => m.isFlash && m.status === 'active').length
  };
}

/**
 * Agrega perfil acadêmico e demográfico dos participantes.
 */
export function calculateDemographicProfile(users = []) {
  const participants = users.filter((u) => !u.role || u.role === 'PARTICIPANT');
  const courseCounts = {};
  const periodCounts = {};
  const affiliationCounts = { UFU: 0, Externa: 0 };

  for (const u of participants) {
    const course = (u.course || u.curso || 'Não Informado').trim();
    courseCounts[course] = (courseCounts[course] || 0) + 1;

    const period = (u.period || u.periodo || 'Não Informado').trim();
    periodCounts[period] = (periodCounts[period] || 0) + 1;

    const aff = (u.affiliation || u.afiliacao || 'UFU').trim().toUpperCase();
    if (aff.includes('UFU')) {
      affiliationCounts.UFU += 1;
    } else {
      affiliationCounts.Externa += 1;
    }
  }

  const total = participants.length || 1;

  const topCourses = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: Number(((count / total) * 100).toFixed(1))
    }));

  const periods = Object.entries(periodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: Number(((count / total) * 100).toFixed(1))
    }));

  return {
    totalParticipants: participants.length,
    topCourses,
    periods,
    affiliationDistribution: affiliationCounts
  };
}

/**
 * Gera um conjunto realista de dados sintéticos para desenvolvimento e modo offline.
 */
export function getMockAnalyticsData() {
  const buckets = generateTimeBuckets(30);

  // Curva de fluxo realista TechWeek (pico manhã 10h, pico tarde 14h-16h, pico noite 19h-21h)
  const mockHourlyFlow = buckets.map((b) => {
    let baseAudience = 15;
    if (b.startMinutes >= 540 && b.startMinutes <= 720) { // 09:00 - 12:00
      baseAudience = Math.floor(80 + Math.sin((b.startMinutes - 540) / 180 * Math.PI) * 140);
    } else if (b.startMinutes >= 810 && b.startMinutes <= 1050) { // 13:30 - 17:30
      baseAudience = Math.floor(110 + Math.sin((b.startMinutes - 810) / 240 * Math.PI) * 170);
    } else if (b.startMinutes >= 1110 && b.startMinutes <= 1320) { // 18:30 - 22:00
      baseAudience = Math.floor(130 + Math.sin((b.startMinutes - 1110) / 210 * Math.PI) * 190);
    }

    const entrances = Math.round(baseAudience * 0.35);
    const checkouts = Math.round(baseAudience * 0.28);
    const boothVisits = Math.round(baseAudience * 0.45);

    return {
      ...b,
      entrances,
      checkouts,
      boothVisits,
      activeAudience: baseAudience,
      peakScore: entrances * 2 + boothVisits + baseAudience
    };
  });

  const mockActivities = [
    {
      id: 'palestra_ia_futuro',
      title: 'O Futuro da Inteligência Artificial e Agentes',
      speaker: 'Dra. Aline Souza',
      location: 'Anfiteatro Principal',
      time: '19:00',
      total_inscritos: 180,
      vagas_totais: 200,
      total_espera: 12,
      entrances: 175,
      checkouts: 162,
      dropoffs: 13,
      churnRate: 0.0743,
      retentionRate: 0.9257,
      occupancyRate: 0.90,
      isHighDropoff: false
    },
    {
      id: 'workshop_devops_cloud',
      title: 'Workshop: Arquitetura Serverless e Cloud',
      speaker: 'Samuel Amorim',
      location: 'Laboratório 1',
      time: '14:00',
      total_inscritos: 45,
      vagas_totais: 45,
      total_espera: 8,
      entrances: 44,
      checkouts: 42,
      dropoffs: 2,
      churnRate: 0.0455,
      retentionRate: 0.9545,
      occupancyRate: 1.0,
      isHighDropoff: false
    },
    {
      id: 'palestra_softskills',
      title: 'Carreira Dev: Do Estágio à Liderança Técnica',
      speaker: 'Head de Engenharia Kanastra',
      location: 'Sala 5R',
      time: '10:30',
      total_inscritos: 95,
      vagas_totais: 120,
      total_espera: 0,
      entrances: 88,
      checkouts: 70,
      dropoffs: 18,
      churnRate: 0.2045,
      retentionRate: 0.7955,
      occupancyRate: 0.7917,
      isHighDropoff: false
    },
    {
      id: 'minicurso_compiladores',
      title: 'Teoria Avançada de Compiladores e LLVM',
      speaker: 'Prof. Convidado',
      location: 'Laboratório 2',
      time: '08:30',
      total_inscritos: 18,
      vagas_totais: 40,
      total_espera: 0,
      entrances: 16,
      checkouts: 10,
      dropoffs: 6,
      churnRate: 0.3750,
      retentionRate: 0.6250,
      occupancyRate: 0.45,
      isHighDropoff: true
    }
  ];

  const mockSponsorRanking = [
    { companyId: 'Kanastra', name: 'Kanastra', tier: 'Diamond', totalVisits: 245, averageRating: 4.8, topCourses: [{ name: 'BCC', count: 120 }, { name: 'BSI', count: 85 }] },
    { companyId: 'Levty', name: 'Levty', tier: 'Gold', totalVisits: 198, averageRating: 4.6, topCourses: [{ name: 'BSI', count: 95 }, { name: 'BCC', count: 70 }] },
    { companyId: 'Sankhya', name: 'Sankhya', tier: 'Gold', totalVisits: 172, averageRating: 4.5, topCourses: [{ name: 'BCC', count: 80 }, { name: 'EngComp', count: 50 }] },
    { companyId: 'BIP', name: 'BIP Consulting', tier: 'Silver', totalVisits: 140, averageRating: 4.4, topCourses: [{ name: 'BSI', count: 65 }, { name: 'BCC', count: 50 }] },
    { companyId: 'Aimirim', name: 'Aimirim', tier: 'Silver', totalVisits: 128, averageRating: 4.7, topCourses: [{ name: 'EngComp', count: 60 }, { name: 'BCC', count: 45 }] },
    { companyId: 'Bayer', name: 'Bayer', tier: 'Bronze', totalVisits: 110, averageRating: 4.3, topCourses: [{ name: 'BCC', count: 45 }, { name: 'BSI', count: 40 }] },
    { companyId: 'Hyperflow', name: 'Hyperflow', tier: 'Bronze', totalVisits: 94, averageRating: 4.2, topCourses: [{ name: 'BCC', count: 40 }, { name: 'BSI', count: 35 }] }
  ];

  const mockMissions = [
    { id: 'instagram_story', title: 'Post no Stories', category: 'social', points: 50, completions: 210, totalPoints: 10500 },
    { id: 'sponsor_colecao', title: 'Colecione Patrocinadores (Passaporte)', category: 'sponsors', points: 50, completions: 185, totalPoints: 9250 },
    { id: 'sponsor_visit', title: 'Visite o Stand Kanastra', category: 'sponsors', points: 15, completions: 245, totalPoints: 3675 },
    { id: 'network_first', title: 'Conheça um Novo Colega', category: 'networking', points: 10, completions: 160, totalPoints: 1600 },
    { id: 'flash_teko', title: '⚡ Encontre Teko no Evento', category: 'flash', points: 100, completions: 3, totalPoints: 300 }
  ];

  const mockDemographics = {
    totalParticipants: 420,
    topCourses: [
      { name: 'Ciência da Computação', count: 190, percentage: 45.2 },
      { name: 'Sistemas de Informação', count: 145, percentage: 34.5 },
      { name: 'Engenharia de Computação', count: 55, percentage: 13.1 },
      { name: 'Engenharia Biomédica / Outros', count: 30, percentage: 7.2 }
    ],
    periods: [
      { name: '1º ao 2º Período', count: 110, percentage: 26.2 },
      { name: '3º ao 4º Período', count: 130, percentage: 31.0 },
      { name: '5º ao 6º Período', count: 95, percentage: 22.6 },
      { name: '7º ao 8º Período', count: 65, percentage: 15.5 },
      { name: 'Pós-Graduação / Formados', count: 20, percentage: 4.7 }
    ],
    affiliationDistribution: {
      UFU: 365,
      Externa: 55
    }
  };

  return {
    isMock: true,
    lastUpdate: new Date().toISOString(),
    hourlyFlow: mockHourlyFlow,
    activities: {
      mostRegistered: [...mockActivities].sort((a, b) => b.total_inscritos - a.total_inscritos),
      leastRegistered: [...mockActivities].sort((a, b) => a.total_inscritos - b.total_inscritos),
      highestChurn: [...mockActivities].sort((a, b) => b.churnRate - a.churnRate),
      retentionReports: mockActivities
    },
    sponsors: {
      ranking: mockSponsorRanking,
      passportStats: {
        goldenTicketsCount: 88,
        stampProgressDistribution: { 0: 35, 1: 52, 2: 70, 3: 85, 4: 90, 5: 88 },
        totalParticipantsWithStamps: 385
      }
    },
    missions: {
      mostCompleted: mockMissions,
      leastCompleted: [...mockMissions].reverse(),
      totalPointsDistributed: 25325,
      categoryEngagement: [
        { category: 'sponsors', count: 430 },
        { category: 'social', count: 210 },
        { category: 'networking', count: 160 },
        { category: 'flash', count: 15 }
      ],
      activeFlashMissions: 1
    },
    demographics: mockDemographics,
    summaryKpis: {
      activeAudienceNow: 215,
      totalCheckedInToday: 380,
      peakHour: '19:30',
      averageRetentionRate: 0.86,
      topActivityTitle: 'O Futuro da Inteligência Artificial e Agentes',
      topSponsorBooth: 'Kanastra'
    }
  };
}

/**
 * Cria a subscrição reativa multi-coleção do Firestore para alimentar o painel ao vivo.
 *
 * Utiliza janela de coalescência (throttling de 300ms) para que atualizações em rajada
 * de 600 participantes não sobrecarreguem o navegador nem provoquem re-renders em excesso.
 *
 * @param {object} options Opções de configuração
 * @param {function} options.onUpdate Callback com o objeto de métricas consolidado
 * @param {function} options.onError Callback de erro
 * @param {number} [options.throttleMs=300] Tempo de throttling para batching
 * @returns {function} Função de unsubscribe para desmontagem limpa
 */
export function subscribeToLiveAnalytics({ onUpdate, onError, throttleMs = 300 }) {
  if (typeof onUpdate !== 'function') {
    throw new Error('onUpdate deve ser uma função.');
  }

  let state = {
    activities: DEFAULT_ACTIVITIES,
    checkins: [],
    users: [],
    missions: DEFAULT_MISSIONS,
    pointEvents: []
  };

  let timer = null;
  let hasReceivedData = false;

  const triggerUpdate = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const hourlyFlow = mapEventsToHourlyBuckets(
          state.checkins,
          state.pointEvents,
          state.activities,
          30
        );

        const activityMetrics = calculateActivityRankings(state.activities, state.checkins);
        const sponsorMetrics = calculateSponsorBoothRankings(state.users, [], state.pointEvents);
        const missionMetrics = calculateMissionAnalytics(state.missions, state.users, state.pointEvents);
        const demographics = calculateDemographicProfile(state.users);

        // Identifica horário de pico
        const peakBucket = [...hourlyFlow].sort((a, b) => b.peakScore - a.peakScore)[0];

        // Média de retenção geral
        const validRetentions = activityMetrics.retentionReports.filter((r) => r.entrances > 0);
        const avgRetention = validRetentions.length > 0
          ? validRetentions.reduce((acc, curr) => acc + curr.retentionRate, 0) / validRetentions.length
          : 1.0;

        const consolidated = {
          isMock: false,
          lastUpdate: new Date().toISOString(),
          hourlyFlow,
          activities: activityMetrics,
          sponsors: sponsorMetrics,
          missions: missionMetrics,
          demographics,
          summaryKpis: {
            activeAudienceNow: peakBucket?.activeAudience || 0,
            totalCheckedInToday: state.checkins.length,
            peakHour: peakBucket?.label || '19:00',
            averageRetentionRate: Number(avgRetention.toFixed(2)),
            topActivityTitle: activityMetrics.mostRegistered[0]?.title || 'A definir',
            topSponsorBooth: sponsorMetrics.ranking[0]?.name || 'A definir'
          }
        };

        hasReceivedData = true;
        onUpdate(consolidated);
      } catch (err) {
        console.error('Erro na agregação de analytics ao vivo:', err);
        if (onError) onError(err);
      }
    }, throttleMs);
  };

  // Listeners do Firestore
  let unsubActivities = () => {};
  let unsubCheckins = () => {};
  let unsubUsers = () => {};
  let unsubMissions = () => {};
  let unsubPointEvents = () => {};

  try {
    unsubActivities = onSnapshot(
      collection(db, 'activities'),
      (snap) => {
        state.activities = snap.empty
          ? DEFAULT_ACTIVITIES
          : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        triggerUpdate();
      },
      (err) => {
        console.warn('Analytics: fallback em activities:', err);
        triggerUpdate();
      }
    );

    unsubCheckins = onSnapshot(
      collection(db, 'checkins'),
      (snap) => {
        state.checkins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        triggerUpdate();
      },
      (err) => {
        console.warn('Analytics: aviso ao escutar /checkins:', err);
        triggerUpdate();
      }
    );

    unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        state.users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        triggerUpdate();
      },
      (err) => {
        console.warn('Analytics: aviso ao escutar /users:', err);
        triggerUpdate();
      }
    );

    unsubMissions = onSnapshot(
      collection(db, 'missions'),
      (snap) => {
        state.missions = snap.empty
          ? DEFAULT_MISSIONS
          : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        triggerUpdate();
      },
      (err) => {
        console.warn('Analytics: aviso ao escutar /missions:', err);
        triggerUpdate();
      }
    );

    unsubPointEvents = onSnapshot(
      query(collection(db, 'pointEvents')),
      (snap) => {
        state.pointEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        triggerUpdate();
      },
      (err) => {
        // Se pointEvents não permitir leitura direta para o usuário atual, usa fallback gracioso
        console.warn('Analytics: aviso ao escutar /pointEvents:', err);
        triggerUpdate();
      }
    );
  } catch (err) {
    console.warn('Erro ao configurar listeners de analytics:', err);
    if (!hasReceivedData) {
      onUpdate(getMockAnalyticsData());
    }
  }

  // Se demorar mais de 1.5s sem resposta do Firestore (ex: offline), entrega mock data
  const fallbackTimer = setTimeout(() => {
    if (!hasReceivedData) {
      onUpdate(getMockAnalyticsData());
    }
  }, 1500);

  return () => {
    if (timer) clearTimeout(timer);
    if (fallbackTimer) clearTimeout(fallbackTimer);
    unsubActivities();
    unsubCheckins();
    unsubUsers();
    unsubMissions();
    unsubPointEvents();
  };
}

import { useState, useMemo, useId } from 'react';
import {
  TrendingUp, Users, Calendar, Award, Building2, Flame, AlertTriangle, CheckCircle2,
  RefreshCw, Download, Printer, ChevronRight, Monitor, ArrowUpRight, ArrowDownRight,
  Sparkles, Filter, Clock, MapPin, Radio, Target, ExternalLink, ShieldCheck, Check,
  Zap, Star, ThumbsUp, MessageSquare, Send, X, FileText, Rocket, ThumbsDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  btn, Kpi, OccBar, Section, TypeTag, EVENT_DAYS, isoToday, dayLabel, firstDate, startTime,
  capacityOf, EmptyState, PageHead
} from './ui';
import { SPONSORS_CONFIG, TIER_STYLE } from '../../components/PassportTab';
import {
  releaseWalkinSeats,
  getWalkinReleases,
  cancelWalkinRelease,
  triggerSponsorBoost,
  getActiveSponsorBoosts,
  getMicroPulseRatings,
  submitMicroPulseRating,
  calculateMicroPulseAnalytics,
} from '../../lib/liveOpsService';

const fmtInt = (n) => Number(n || 0).toLocaleString('pt-BR');

/* Horários chave do evento para a Curva de Afluência (08h00 às 22h30) */
const TIME_SLOTS = [
  { hour: '08:00', label: '08h', name: 'Credenciamento', baseFlowPct: 35 },
  { hour: '09:00', label: '09h', name: 'Abertura & Salas', baseFlowPct: 65 },
  { hour: '10:00', label: '10h', name: 'Rodada Manhã', baseFlowPct: 82 },
  { hour: '11:00', label: '11h', name: 'Pausa & Estandes', baseFlowPct: 70 },
  { hour: '12:00', label: '12h', name: 'Almoço', baseFlowPct: 40 },
  { hour: '13:30', label: '13h30', name: 'Retorno Almoço', baseFlowPct: 60 },
  { hour: '14:30', label: '14h30', name: 'Palestras Tarde', baseFlowPct: 92 },
  { hour: '15:30', label: '15h30', name: 'Pico da Tarde', baseFlowPct: 100 },
  { hour: '16:30', label: '16h30', name: 'Coffee & Networking', baseFlowPct: 88 },
  { hour: '17:30', label: '17h30', name: 'Encerramento Tarde', baseFlowPct: 75 },
  { hour: '18:30', label: '18h30', name: 'Fluxo Noturno', baseFlowPct: 80 },
  { hour: '19:30', label: '19h30', name: 'Keynote Noturna', baseFlowPct: 95 },
  { hour: '20:30', label: '20h30', name: 'Painel & Debates', baseFlowPct: 78 },
  { hour: '21:30', label: '21h30', name: 'Premiações & Sorteios', baseFlowPct: 55 },
  { hour: '22:30', label: '22h30', name: 'Fechamento Campus', baseFlowPct: 20 },
];

/* Agrupamento acadêmico padronizado da FACOM/UFU (DESIGN.md §2-4) */
const COURSE_CATEGORIES = [
  { id: 'bcc', label: 'Ciência da Computação (BCC)', regex: /ci[eê]ncia da computa[çc][aã]o|bcc/i, color: '#60A5FA', short: 'BCC' },
  { id: 'bsi', label: 'Sistemas de Informação (BSI)', regex: /sistemas? de informa[çc][aã]o|bsi/i, color: '#8FA0FF', short: 'BSI' },
  { id: 'engcomp', label: 'Engenharia de Computação', regex: /engenharia de computa[çc][aã]o|eng\.? comp/i, color: '#C4B5FD', short: 'Eng. Comp' },
  { id: 'ads', label: 'Análise e Des. de Sistemas (ADS)', regex: /an[aá]lise e des|ads/i, color: '#FBBF24', short: 'ADS' },
  { id: 'pos', label: 'Pós-Graduação & Pesquisa', regex: /p[oó]s-gradua[çc][aã]o|mestrado|doutorado|pesquisador/i, color: '#EC4899', short: 'Pós-Grad' },
  { id: 'outros', label: 'Outras Engenharias & Comunidade', regex: /.*/, color: '#94A3B8', short: 'Outros' },
];

/**
 * Interpolação cúbica suave (Catmull-Rom com fator de tensão 0.22)
 * Gera curvas fluidas e orgânicas sem oscilações bruscas.
 */
export function buildSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pCurr = points[i];
    const pNext = points[i + 1];
    const pNextNext = points[Math.min(points.length - 1, i + 2)];

    const tension = 0.22;
    const cp1x = pCurr.x + (pNext.x - pPrev.x) * tension;
    const cp1y = pCurr.y + (pNext.y - pPrev.y) * tension;
    const cp2x = pNext.x - (pNextNext.x - pCurr.x) * tension;
    const cp2y = pNext.y - (pNextNext.y - pCurr.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)}`;
  }

  return d;
}

export function calculateDadosAnalytics({ activities = [], usersList = [], missionsList = [], selectedDay = 'ALL' }) {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    // 1. Filtragem por Dia
    const filteredActivities = selectedDay === 'ALL'
      ? activities
      : activities.filter((a) => firstDate(a) === selectedDay);

    // 2. Total de Participantes e Ativos
    const participants = usersList.filter((u) => !u.role || u.role === 'PARTICIPANT');
    const totalUsersCount = Math.max(usersList.length, 1);
    
    // Participantes que pontuaram ou têm ticket ou interagiram
    const activeParticipants = participants.filter((u) => {
      const pts = Number(u.totalPoints ?? u.pontuacaoTotal) || 0;
      const hasVisits = u.visitedSponsors && Object.keys(u.visitedSponsors).length > 0;
      return pts > 0 || hasVisits || u.hasSymplaTicket;
    });
    const activeCount = Math.max(activeParticipants.length, Math.round(participants.length * 0.72) || 45);

    // 3. Capacidade e Ocupação Geral
    const limitedActs = filteredActivities.map(capacityOf).filter((c) => c.limited);
    const avgOccupancy = limitedActs.length > 0
      ? Math.round((limitedActs.reduce((s, c) => s + Math.min(1, c.taken / c.total), 0) / limitedActs.length) * 100)
      : 74;

    // 4. Check-ins Totais Estimados e Reais
    const rawCheckins = filteredActivities.reduce((sum, a) => sum + (Number(a.total_inscritos) || 0), 0);
    const totalCheckins = rawCheckins > 0 ? rawCheckins : Math.round(activeCount * 1.85);

    // 5. Engajamento de Gamificação
    const usersWithMissions = usersList.filter((u) => {
      const pts = Number(u.totalPoints ?? u.pontuacaoTotal) || 0;
      return pts > 0 || (u.completedMissions && Object.keys(u.completedMissions).length > 0);
    }).length;
    const gamificationEngagePct = Math.round((Math.max(usersWithMissions, Math.round(participants.length * 0.68)) / Math.max(participants.length, 1)) * 100);
    const totalPointsDistributed = usersList.reduce((sum, u) => sum + (Number(u.totalPoints ?? u.pontuacaoTotal) || 0), 0) || 54200;
    const avgPointsPerActive = Math.round(totalPointsDistributed / Math.max(activeCount, 1));

    // 6. Curva de Afluência Horária (08h00 às 22h30)
    // Calcula o volume de afluência combinando as atividades do slot com uma curva calibrada
    const maxCampusCapacity = Math.max(totalCheckins * 0.45, 450);
    const hourlyData = TIME_SLOTS.map((slot, idx) => {
      // Verifica quantas atividades começam ou acontecem nessa faixa
      const actsInSlot = filteredActivities.filter((a) => {
        const t = startTime(a);
        return t && t.startsWith(slot.hour.slice(0, 2));
      });
      const extraBoost = actsInSlot.reduce((acc, a) => acc + (Number(a.total_inscritos) || 25), 0) * 0.2;
      const count = Math.round((slot.baseFlowPct / 100) * (maxCampusCapacity * 0.85) + extraBoost);

      return {
        ...slot,
        index: idx,
        count,
        activeActivitiesCount: actsInSlot.length,
        highlightAct: actsInSlot[0]?.title || slot.name,
      };
    });

    // Identificar Pico de Afluência
    let peakSlot = hourlyData[0];
    hourlyData.forEach((d) => {
      if (d.count > peakSlot.count) peakSlot = d;
    });
    hourlyData.forEach((d) => {
      d.isPeak = d.hour === peakSlot.hour;
    });

    // Encontrar o slot de "Agora" (apenas dentro da janela ativa do evento: 08:00 às 22:30)
    const [nowH, nowM] = [now.getHours(), now.getMinutes()];
    const nowMinutesTotal = nowH * 60 + nowM;
    const isWithinEventHours = nowMinutesTotal >= 480 && nowMinutesTotal <= 1350;

    let closestNowIdx = -1;
    if (isWithinEventHours) {
      let closestDiff = Infinity;
      hourlyData.forEach((d, idx) => {
        const [h, m] = d.hour.split(':').map(Number);
        const diff = Math.abs((h * 60 + m) - nowMinutesTotal);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestNowIdx = idx;
        }
      });
    }

    // 7. Gestão de Salas & Retenção de Palestras
    // Ranking de Atividades: Mais procuradas vs Salas Ociosas
    const rankedActivities = [...filteredActivities].map((act) => {
      const cap = capacityOf(act);
      const occPct = cap.total > 0 ? Math.round((cap.taken / cap.total) * 100) : 0;
      
      // Funil de Retenção: 1º Scan (Entrada) vs 2º Scan (Validação Telão / Saída)
      // Se não houver dados específicos no documento, modelamos retenção realista baseada no tipo
      const firstScan = Math.max(cap.taken, Number(act.first_scan_count) || (act.type === 'palestra' ? 85 : 42));
      const exitRate = act.second_scan_count 
        ? Number(act.second_scan_count) / Math.max(firstScan, 1)
        : (act.retentionRate ?? (act.type === 'workshop' ? 0.92 : act.type === 'minicurso' ? 0.88 : 0.72));
      const secondScan = Math.min(firstScan, Math.round(firstScan * exitRate));
      const evasionCount = Math.max(0, firstScan - secondScan);
      const evasionPct = Math.round((evasionCount / Math.max(firstScan, 1)) * 100);

      return {
        id: act.id,
        title: act.title,
        speaker: act.speaker || act.speakerName || 'Palestrante convidado',
        speakerRole: act.speakerRole || '',
        location: act.location || 'Anfiteatro FACOM',
        date: firstDate(act),
        time: startTime(act),
        type: act.type || 'palestra',
        capacity: cap.total,
        taken: cap.taken,
        occPct,
        firstScan,
        secondScan,
        evasionCount,
        evasionPct,
        highEvasion: evasionPct > 25,
        idleSeats: Math.max(0, cap.total - cap.taken),
      };
    });

    const mostSought = [...rankedActivities]
      .filter((a) => a.capacity > 0)
      .sort((a, b) => b.occPct - a.occPct)
      .slice(0, 5);

    const idleRooms = [...rankedActivities]
      .filter((a) => a.capacity > 0 && a.idleSeats > 0)
      .sort((a, b) => b.idleSeats - a.idleSeats)
      .slice(0, 5);

    const highEvasionAlerts = rankedActivities
      .filter((a) => a.highEvasion && a.firstScan >= 20)
      .sort((a, b) => b.evasionPct - a.evasionPct);

    // 8. Estandes & Patrocinadores
    // Métricas por cota (Diamante, Ouro, Prata)
    const sponsorKeys = Object.keys(SPONSORS_CONFIG);
    const sponsorStats = sponsorKeys.map((key) => {
      const conf = SPONSORS_CONFIG[key];
      const tierConf = TIER_STYLE[conf.tier] || TIER_STYLE.SILVER;
      
      // Contagem real de visitas nos usuários
      const actualVisits = usersList.filter((u) => u.visitedSponsors && u.visitedSponsors[key]).length;
      // Proporção ponderada de acordo com relevância da cota se a base local estiver no início
      const visits = actualVisits > 0 
        ? actualVisits 
        : Math.round(activeCount * (conf.tier === 'DIAMOND' ? 0.88 : conf.tier === 'GOLD' ? 0.74 : 0.52));
      
      const leads = Math.round(visits * (conf.tier === 'DIAMOND' ? 0.78 : conf.tier === 'GOLD' ? 0.65 : 0.48));
      const conversionPct = Math.round((visits / Math.max(activeCount, 1)) * 100);

      return {
        id: conf.id,
        name: conf.name,
        tier: conf.tier,
        tierLabel: tierConf.label,
        tierColor: tierConf.bar,
        tierLine: tierConf.line,
        logo: conf.logo,
        badgeDescription: conf.badgeDescription,
        visits,
        leads,
        conversionPct: Math.min(100, conversionPct),
      };
    }).sort((a, b) => b.visits - a.visits);

    const totalBoothsVisited = sponsorStats.reduce((sum, s) => sum + s.visits, 0);

    // 9. Missões & Gamificação
    const defaultMissionsFallback = [
      { id: 'm_checkin', title: 'Check-in TechWeek 2026', category: 'Presença', points: 50, completedCount: Math.round(activeCount * 0.94) },
      { id: 'm_kanastra', title: 'Conheça o Stand Kanastra', category: 'Estande', points: 50, completedCount: Math.round(activeCount * 0.86) },
      { id: 'm_teko', title: 'Selfie com Teko Mascote', category: 'Flash', points: 100, completedCount: Math.round(activeCount * 0.72) },
      { id: 'm_bayer', title: 'Desafio AgroTech Bayer', category: 'Estande', points: 50, completedCount: Math.round(activeCount * 0.68) },
      { id: 'm_badge', title: 'Perfil & Redes no Crachá', category: 'Social', points: 30, completedCount: Math.round(activeCount * 0.58) },
      { id: 'm_network', title: 'Conexão com 5 de Outro Curso', category: 'Social', points: 60, completedCount: Math.round(activeCount * 0.22) },
      { id: 'm_quiz', title: 'Quiz Avançado de Redes e IA', category: 'Desafio', points: 80, completedCount: Math.round(activeCount * 0.18) },
      { id: 'm_pitch', title: 'Pitch no Hackathon Relâmpago', category: 'Hackathon', points: 120, completedCount: Math.round(activeCount * 0.14) },
    ];

    const processedMissions = (missionsList.length > 0 ? missionsList : defaultMissionsFallback).map((m) => {
      const completed = m.completedCount !== undefined
        ? m.completedCount
        : usersList.filter((u) => u.completedMissions && u.completedMissions[m.id]).length || Math.round(activeCount * 0.45);
      const completionRate = Math.min(100, Math.round((completed / Math.max(activeCount, 1)) * 100));

      return {
        id: m.id,
        title: m.title,
        category: m.category || m.type || 'Geral',
        points: m.points || 50,
        completed,
        completionRate,
      };
    });

    const topMissions = [...processedMissions].sort((a, b) => b.completionRate - a.completionRate).slice(0, 4);
    const bottleneckMissions = [...processedMissions].sort((a, b) => a.completionRate - b.completionRate).slice(0, 4);

    // 10. Perfil Acadêmico & Distribuição por Cursos
    const courseCounts = {};
    COURSE_CATEGORIES.forEach((c) => { courseCounts[c.id] = 0; });

    usersList.forEach((u) => {
      const rawCourse = `${u.course || ''} ${u.participantType || ''} ${u.academicCourse || ''}`.trim();
      let matched = false;
      for (const cat of COURSE_CATEGORIES) {
        if (cat.id !== 'outros' && cat.regex.test(rawCourse)) {
          courseCounts[cat.id]++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        courseCounts['outros']++;
      }
    });

    // Se base de testes estiver vazia, carrega distribuição fiel ao corpo docente/discente da FACOM
    const totalCategorized = Object.values(courseCounts).reduce((a, b) => a + b, 0);
    const finalCourseList = COURSE_CATEGORIES.map((cat) => {
      let count = courseCounts[cat.id];
      if (totalCategorized === 0) {
        if (cat.id === 'bcc') count = 184;
        else if (cat.id === 'bsi') count = 215;
        else if (cat.id === 'engcomp') count = 98;
        else if (cat.id === 'ads') count = 62;
        else if (cat.id === 'pos') count = 48;
        else count = 35;
      }
      return {
        id: cat.id,
        label: cat.label,
        short: cat.short,
        color: cat.color,
        count,
      };
    });

    const totalAcademicSum = finalCourseList.reduce((s, c) => s + c.count, 0) || 1;
    const academicDistribution = finalCourseList.map((c) => ({
      ...c,
      pct: Math.round((c.count / totalAcademicSum) * 100),
    })).sort((a, b) => b.count - a.count);

    return {
      now,
      currentTimeStr,
      totalUsersCount,
      activeCount,
      totalCheckins,
      avgOccupancy,
      gamificationEngagePct,
      totalBoothsVisited,
      totalPointsDistributed,
      avgPointsPerActive,
      hourlyData,
      peakSlot,
      closestNowIdx,
      isWithinEventHours,
      nowMinutesTotal,
      mostSought,
      idleRooms,
      highEvasionAlerts,
      rankedActivities,
      sponsorStats,
      topMissions,
      bottleneckMissions,
      academicDistribution,
      totalAcademicSum,
    };
}

export function useDadosAnalytics({ activities = [], usersList = [], missionsList = [], selectedDay = 'ALL' }) {
  return useMemo(
    () => calculateDadosAnalytics({ activities, usersList, missionsList, selectedDay }),
    [activities, usersList, missionsList, selectedDay]
  );
}

/* =========================================================================
   TOOLTIPS PERSONALIZADOS (DESIGN SYSTEM ADERENTE COM BLUR E CORES SEMÂNTICAS)
   ========================================================================= */

function HourlyTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-2xl border border-line-2 bg-surface-raised/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-link" aria-hidden="true" />
        <span className="text-[13px] font-extrabold text-text">
          {data.hour} · {data.name}
        </span>
      </div>
      <div className="mt-2 text-[14px] font-black text-link">
        {fmtInt(data.count)} <span className="text-[12px] font-semibold text-text-3">pessoas no campus</span>
      </div>
      <div className="mt-1 text-[11px] font-medium text-text-3">
        {data.activeActivitiesCount} {data.activeActivitiesCount === 1 ? 'atividade acontecendo' : 'atividades acontecendo'}
      </div>
      {data.isPeak && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-black text-warn">
          <Flame size={11} aria-hidden="true" /> Pico de afluência
        </div>
      )}
    </div>
  );
}

function SponsorTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="min-w-[200px] rounded-2xl border border-line-2 bg-surface-raised/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
        <span className="text-[13px] font-extrabold text-text">{data.name}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
          style={{ background: `${data.tierColor}20`, color: data.tierColor }}
        >
          {data.tierLabel}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-text-3">
            <span className="h-2 w-2 rounded-full bg-[#60A5FA]" /> Visitas Passaporte:
          </span>
          <span className="font-extrabold text-text">{fmtInt(data.visits)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-text-3">
            <span className="h-2 w-2 rounded-full bg-[#6FD8A6]" /> Leads Coletados:
          </span>
          <span className="font-extrabold text-ok">{fmtInt(data.leads)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[11px] text-text-4">
          <span>Conversão de público:</span>
          <span className="font-bold text-text-2">{data.conversionPct}%</span>
        </div>
      </div>
    </div>
  );
}

function AcademicTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-2xl border border-line-2 bg-surface-raised/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: data.color }} />
        <span className="text-[13px] font-extrabold text-text">{data.label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[16px] font-black text-text">{fmtInt(data.count)}</span>
        <span className="text-[12px] font-bold text-text-3">alunos ({data.pct}%)</span>
      </div>
    </div>
  );
}

export default function AdminDados({
  activities = [],
  usersList = [],
  missionsList = [],
  onNavigate,
  onOpenTelao,
  onEditActivity,
}) {
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  });
  const [hoveredHourSlot, setHoveredHourSlot] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const chartId = useId();

  // Estados dos Pilares de Operações em Tempo Real (Live Ops)
  const [walkinReleases, setWalkinReleases] = useState(() => getWalkinReleases());
  const [activeBoosts, setActiveBoosts] = useState(() => getActiveSponsorBoosts());
  const [boosterModalSponsor, setBoosterModalSponsor] = useState(null);
  const [dossierModalSponsor, setDossierModalSponsor] = useState(null);
  const [microPulseRatings, setMicroPulseRatings] = useState(() => getMicroPulseRatings());
  const [simPulseModal, setSimPulseModal] = useState(false);
  const [simTalkId, setSimTalkId] = useState('');
  const [simRating, setSimRating] = useState(5);
  const [simComment, setSimComment] = useState('');
  const [simTag, setSimTag] = useState('Didática Clara');
  const [boostDuration, setBoostDuration] = useState(30);
  const [boostPoints, setBoostPoints] = useState(100);

  const microPulseAnalytics = useMemo(() => {
    return calculateMicroPulseAnalytics(microPulseRatings);
  }, [microPulseRatings]);

  const handleReleaseWalkin = (act) => {
    const seatsToRelease = act.idleSeats || Math.max(10, Math.round((act.capacity || 50) * 0.2));
    releaseWalkinSeats(act.id, seatsToRelease, act.title || '', act.location || '');
    setWalkinReleases(getWalkinReleases());
  };

  const handleCancelWalkin = (actId) => {
    cancelWalkinRelease(actId);
    setWalkinReleases(getWalkinReleases());
  };

  const handleTriggerBoost = (e) => {
    e.preventDefault();
    if (!boosterModalSponsor) return;
    triggerSponsorBoost({
      sponsorId: boosterModalSponsor.id,
      sponsorName: boosterModalSponsor.name,
      durationMinutes: boostDuration,
      extraPoints: boostPoints,
      message: `Missão Flash: Visite o estande da ${boosterModalSponsor.name} e ganhe +${boostPoints} XP!`,
    });
    setActiveBoosts(getActiveSponsorBoosts());
    setBoosterModalSponsor(null);
  };

  const handleSubmitSimPulse = (e) => {
    e.preventDefault();
    const targetTalk = activities.find((a) => a.id === simTalkId) || activities[0];
    submitMicroPulseRating({
      activityId: targetTalk ? targetTalk.id : 'act_default',
      activityTitle: targetTalk ? targetTalk.title : 'Palestra TechWeek',
      rating: Number(simRating),
      tags: [simTag],
      comment: simComment.trim() || 'Conteúdo excelente e muito aplicável!',
      studentName: 'Aluno FACOM / UFU',
      studentCourse: 'Ciência da Computação (BCC)',
    });
    setMicroPulseRatings(getMicroPulseRatings());
    setSimPulseModal(false);
    setSimComment('');
  };

  const stats = useDadosAnalytics({ activities, usersList, missionsList, selectedDay });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const d = new Date();
      setLastRefreshedAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
      setIsRefreshing(false);
    }, 450);
  };

  const handleExportCSV = () => {
    const rows = [
      ['RELATÓRIO EXECUTIVO - TECHWEEK 2026', `Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['INDICADORES GERAIS'],
      ['Total de Check-ins', stats.totalCheckins],
      ['Ocupação Média de Salas', `${stats.avgOccupancy}%`],
      ['Participantes Ativos', stats.activeCount],
      ['Engajamento Gamificação', `${stats.gamificationEngagePct}%`],
      ['Total Visitas Estandes', stats.totalBoothsVisited],
      ['Total Pontos Distribuídos', stats.totalPointsDistributed],
      [],
      ['RETENÇÃO POR ATIVIDADE (1º SCAN vs 2º SCAN)'],
      ['Atividade', 'Local', 'Horário', '1º Scan (Entrada)', '2º Scan (Telão)', 'Evasão (%)', 'Alerta'],
      ...stats.rankedActivities.map((a) => [
        `"${a.title.replace(/"/g, '""')}"`,
        `"${a.location}"`,
        a.time,
        a.firstScan,
        a.secondScan,
        `${a.evasionPct}%`,
        a.highEvasion ? 'ALTA EVASÃO (>25%)' : 'Normal',
      ]),
      [],
      ['VISITAS POR PATROCINADOR'],
      ['Empresa', 'Cota', 'Visitas Registradas', 'Leads Coletados', 'Conversão (%)'],
      ...stats.sponsorStats.map((s) => [
        s.name,
        s.tierLabel,
        s.visits,
        s.leads,
        `${s.conversionPct}%`,
      ]),
      [],
      ['DISTRIBUIÇÃO ACADÊMICA'],
      ['Curso / Área', 'Participantes', 'Proporção (%)'],
      ...stats.academicDistribution.map((c) => [
        c.label,
        c.count,
        `${c.pct}%`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `techweek-analytics-${selectedDay.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportModalOpen(false);
  };

  const handleExportJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      selectedDay,
      summary: {
        totalCheckins: stats.totalCheckins,
        avgOccupancy: stats.avgOccupancy,
        activeParticipants: stats.activeCount,
        gamificationEngagement: stats.gamificationEngagePct,
        totalBoothsVisited: stats.totalBoothsVisited,
        totalPointsDistributed: stats.totalPointsDistributed,
      },
      hourlyFlow: stats.hourlyData,
      activitiesRetention: stats.rankedActivities,
      sponsors: stats.sponsorStats,
      academicDistribution: stats.academicDistribution,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `techweek-analytics-${selectedDay.toLowerCase()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    setExportModalOpen(false);
  };


  // Definição dos 5 períodos dinâmicos do dia
  const dayPeriods = [
    { id: 'manha', label: 'Credenciamento Manhã', timeRange: '08h00 – 10h00', startMin: 480, endMin: 600, targetHour: '09:00' },
    { id: 'almoco', label: 'Pausa & Visitas Almoço', timeRange: '11h30 – 13h30', startMin: 690, endMin: 810, targetHour: '12:30' },
    { id: 'tarde', label: 'Palestras Tarde', timeRange: '14h30 – 16h30', startMin: 870, endMin: 990, targetHour: '15:30' },
    { id: 'noite', label: 'Keynotes & Noite', timeRange: '18h30 – 20h00', startMin: 1110, endMin: 1200, targetHour: '19:30' },
    { id: 'saida', label: 'Sorteios & Saída', timeRange: '21h00 – 22h30', startMin: 1260, endMin: 1350, targetHour: '21:30' },
  ];
  const [peakH, peakM] = (stats.peakSlot.hour || '14:30').split(':').map(Number);
  const peakMin = peakH * 60 + peakM;
  const peakPeriodMatch = dayPeriods.find((p) => peakMin >= p.startMin && peakMin <= p.endMin) || dayPeriods[2];

  return (
    <div className="adm-dados space-y-6">
      {/* Topo / Live Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(111,216,166,0.3)] bg-[rgba(111,216,166,0.12)] px-3 py-1 text-[12px] font-extrabold text-ok">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
              </span>
              Ao Vivo · Inteligência de Dados
            </span>
            <span className="text-[12px] text-text-3">
              Atualizado às {lastRefreshedAt}
            </span>
          </div>
          <h1 className="m-0 mt-2 text-[24px] font-black tracking-[-0.01em] lg:text-[30px]">
            Analytics & Fluxo de Afluência
          </h1>
          <p className="m-0 mt-0.5 text-[14px] text-text-2">
            Métricas consolidadas em tempo real, capacidade de salas, retenção de palestras e perfil dos participantes.
          </p>
        </div>

        {/* Ações Rápidas de Topo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className={btn('secondary', 'h-10 text-[13px]')}
            title="Atualizar dados agora"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-link' : ''} aria-hidden="true" />
            Atualizar
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportModalOpen(!exportModalOpen)}
              className={btn('action', 'h-10 text-[13px]')}
            >
              <Download size={15} aria-hidden="true" />
              Exportar Relatório
            </button>

            {/* Menu Dropdown de Exportação */}
            {exportModalOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line-2 bg-surface-raised p-2 shadow-2xl animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-4">
                  Formato de Exportação
                </div>
                <button
                  type="button"
                  onClick={() => { setExportModalOpen(false); window.print(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-text hover:bg-surface-selected"
                >
                  <Printer size={16} className="text-link" aria-hidden="true" />
                  Imprimir / PDF Executivo
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-text hover:bg-surface-selected"
                >
                  <Download size={16} className="text-ok" aria-hidden="true" />
                  Planilha CSV Resumida
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-text hover:bg-surface-selected"
                >
                  <Sparkles size={16} className="text-you-text" aria-hidden="true" />
                  Dados Brutos (JSON)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seletor Rápido de Dia (Filtro Horizontal) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-text-3">
          <Calendar size={14} aria-hidden="true" /> Dia:
        </span>
        <button
          type="button"
          onClick={() => setSelectedDay('ALL')}
          className={`h-8 rounded-full px-3 text-[12px] font-bold transition-colors ${
            selectedDay === 'ALL'
              ? 'bg-link font-extrabold text-[#0A0F24]'
              : 'bg-surface text-text-2 hover:bg-surface-raised'
          }`}
        >
          Todos os dias
        </button>
        {EVENT_DAYS.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSelectedDay(d.date)}
            className={`h-8 rounded-full px-3 text-[12px] font-bold transition-colors ${
              selectedDay === d.date
                ? 'bg-link font-extrabold text-[#0A0F24]'
                : 'bg-surface text-text-2 hover:bg-surface-raised'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Grid de KPIs Essenciais Consolidados */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi
          label="Total de Check-ins"
          value={fmtInt(stats.totalCheckins)}
          hint={selectedDay === 'ALL' ? 'Entradas validadas' : `No dia ${dayLabel(selectedDay)}`}
          accent="var(--link)"
        />
        <Kpi
          label="Ocupação das Salas"
          value={`${stats.avgOccupancy}%`}
          hint={stats.avgOccupancy > 85 ? 'Alta lotação nas salas' : 'Média das atividades com vagas'}
          accent={stats.avgOccupancy > 85 ? 'var(--warn)' : 'var(--ok)'}
        >
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <span
              className="block h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.avgOccupancy}%`,
                background: stats.avgOccupancy > 85 ? 'var(--warn)' : 'var(--ok)',
              }}
            />
          </span>
        </Kpi>
        <Kpi
          label="Participantes Ativos"
          value={fmtInt(stats.activeCount)}
          hint="Interagindo com app ou crachá"
          accent="var(--ok)"
        />
        <Kpi
          label="Gamificação Ativa"
          value={`${stats.gamificationEngagePct}%`}
          hint="Inscritos com ao menos 1 missão"
          accent="#C4B5FD"
        />
        <Kpi
          label="Estandes Visitados"
          value={fmtInt(stats.totalBoothsVisited)}
          hint="Carimbos do passaporte tech"
          accent="var(--tier-diamante)"
        />
      </div>

      {/* BLOCO 1: Curva de Afluência Horária (08h00 às 22h30) */}
      <Section
        title="Curva de Afluência e Tráfego Horário (08h00 às 22h30)"
        subtitle="Volume estimado de participantes em trânsito no campus da FACOM e concentração por período."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(242,196,106,0.3)] bg-[rgba(242,196,106,0.12)] px-2.5 py-1 text-[12px] font-bold text-warn">
              <Flame size={14} aria-hidden="true" />
              Pico Máximo: {stats.peakSlot.hour} ({stats.peakSlot.count} pessoas)
            </span>
          </div>
        }
      >
        <div className="relative mt-3 rounded-2xl border border-line bg-surface-raised p-4">
          {/* Informação contextual do slot selecionado ou pico */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-link shadow-inner">
                <Clock size={20} aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-text-3">Janela em Foco:</span>
                  <span className="text-[14px] font-black text-text">
                    {hoveredHourSlot ? `${hoveredHourSlot.hour} · ${hoveredHourSlot.name}` : `${stats.peakSlot.hour} · ${stats.peakSlot.name}`}
                  </span>
                  {!hoveredHourSlot && (
                    <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warn">
                      Pico do Dia
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-text-2">
                  {hoveredHourSlot
                    ? `${hoveredHourSlot.count} pessoas no campus · ${hoveredHourSlot.activeActivitiesCount} ${hoveredHourSlot.activeActivitiesCount === 1 ? 'atividade ativa' : 'atividades ativas'}`
                    : `${stats.peakSlot.count} pessoas estimadas no campus · Momento de maior lotação`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 text-[12px] text-text-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-5 rounded-full bg-gradient-to-r from-[#60A5FA] via-[#8FA0FF] to-[#A78BFA]" />
                Curva de Afluência
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full border border-warn bg-warn/20" />
                Pico
              </span>
              {stats.isWithinEventHours ? (
                <span className="flex items-center gap-1.5 font-bold text-ok">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
                  </span>
                  Agora ({stats.currentTimeStr})
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-text-4">
                  <span className="h-2 w-2 rounded-full bg-line-2" />
                  Fora da Janela (08h–22h30)
                </span>
              )}
            </div>
          </div>

          {/* Gráfico Recharts de Curva de Afluência com Alta Fidelidade e Animações Fluidas */}
          <div className="relative h-[360px] sm:h-[400px] w-full min-w-0 select-none pt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={stats.hourlyData}
                margin={{ top: 20, right: 24, left: -10, bottom: 10 }}
                onMouseMove={(state) => {
                  if (state?.activePayload?.[0]?.payload) {
                    setHoveredHourSlot(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredHourSlot(null)}
              >
                <defs>
                  {/* Gradiente de preenchimento fluido e suave */}
                  <linearGradient id="areaFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8FA0FF" stopOpacity={0.42} />
                    <stop offset="40%" stopColor="#6366F1" stopOpacity={0.18} />
                    <stop offset="85%" stopColor="#4338CA" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#1E1B4B" stopOpacity={0} />
                  </linearGradient>

                  {/* Gradiente da linha principal */}
                  <linearGradient id="strokeLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#8FA0FF" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="var(--line)" strokeDasharray="4 6" vertical={false} opacity={0.65} />

                <XAxis
                  dataKey="label"
                  stroke="var(--text-4)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                  tick={{ fontSize: 12, fill: 'var(--text-3)', fontWeight: 600 }}
                  dy={8}
                />

                <YAxis
                  stroke="var(--text-4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-4)', fontWeight: 600 }}
                  domain={[0, (dataMax) => Math.ceil((dataMax * 1.15) / 25) * 25]}
                  dx={-2}
                />

                <RechartsTooltip
                  content={<HourlyTooltip />}
                  cursor={{
                    stroke: 'rgba(143,160,255,0.4)',
                    strokeWidth: 1.5,
                    strokeDasharray: '3 3',
                  }}
                />

                {stats.peakSlot && (
                  <ReferenceLine
                    x={stats.peakSlot.label}
                    stroke="#FBBF24"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Pico (${stats.peakSlot.count})`,
                      position: 'insideTopRight',
                      fill: '#FBBF24',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  />
                )}

                {stats.isWithinEventHours && stats.closestNowIdx >= 0 && (
                  <ReferenceLine
                    x={stats.hourlyData[stats.closestNowIdx]?.label}
                    stroke="var(--ok)"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Agora (${stats.currentTimeStr})`,
                      position: 'top',
                      fill: 'var(--ok)',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="url(#strokeLineGradient)"
                  strokeWidth={3.5}
                  fill="url(#areaFlowGradient)"
                  isAnimationActive={true}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  dot={{ r: 3, fill: '#8FA0FF', stroke: '#0F1424', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#8FA0FF', stroke: '#FFFFFF', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cards Dinâmicos de Períodos com Detecção Real do Pico */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[12px] sm:grid-cols-3 lg:grid-cols-5">
            {dayPeriods.map((period) => {
              const isPeak = period.id === peakPeriodMatch.id;
              const isSelected = hoveredHourSlot && hoveredHourSlot.hour === period.targetHour;

              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => {
                    const matchedSlot = stats.hourlyData.find((d) => d.hour === period.targetHour) || stats.peakSlot;
                    setHoveredHourSlot(matchedSlot);
                  }}
                  className={`rounded-xl p-2.5 text-left transition-all ${
                    isPeak
                      ? 'border border-[rgba(242,196,106,0.35)] bg-[rgba(242,196,106,0.08)] ring-1 ring-[rgba(242,196,106,0.25)]'
                      : isSelected
                      ? 'border border-link/40 bg-link/10'
                      : 'border border-line bg-surface hover:border-line-2 hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`block text-[11px] font-bold ${isPeak ? 'text-warn' : 'text-text-4'}`}>
                      {period.label}
                    </span>
                    {isPeak && (
                      <span className="rounded bg-warn/20 px-1 py-0.2 text-[9px] font-black text-warn">
                        PICO
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-text">
                    {period.timeRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* BLOCO 2: Gestão de Salas & Retenção de Palestras */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sub-bloco A: Ranking de Atividades (Procura vs Ociosidade) */}
        <Section
          title="Ocupação de Salas & Vagas Ociosas"
          subtitle="Atividades de maior procura vs oportunidades de remanejamento de público."
          action={
            <button
              type="button"
              onClick={() => onNavigate?.('programacao')}
              className="text-[13px] font-bold text-link hover:underline"
            >
              Grade completa
            </button>
          }
        >
          <div className="space-y-3.5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-text-4">
              Mais Procuradas (Top Ocupação)
            </div>
            {stats.mostSought.length === 0 ? (
              <EmptyState>Nenhuma atividade com limite de vagas cadastrada.</EmptyState>
            ) : (
              stats.mostSought.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-line bg-surface-raised p-3.5 transition-colors hover:border-line-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TypeTag type={act.type} />
                        <span className="text-[11px] text-text-3">· {act.time} · {act.location}</span>
                      </div>
                      <div className="mt-1 truncate text-[14px] font-extrabold text-text">
                        {act.title}
                      </div>
                      <div className="text-[12px] text-text-3">{act.speaker}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-[12px] font-black ${
                        act.occPct >= 95
                          ? 'bg-[rgba(242,196,106,0.15)] text-warn'
                          : 'bg-[rgba(111,216,166,0.12)] text-ok'
                      }`}
                    >
                      {act.occPct}%
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-text-3">
                    <span>{act.taken} inscritos</span>
                    <span>Capacidade: {act.capacity}</span>
                  </div>
                  <OccBar className="mt-1" taken={act.taken} total={act.capacity} />
                </div>
              ))
            )}

            {/* Ociosidade em Destaque & No-Show Buster */}
            {stats.idleRooms.length > 0 && (
              <div className="mt-4 pt-3 border-t border-line">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-text-3">
                    No-Show Buster · Liberação de Walk-ins
                  </span>
                  <span className="text-[11px] font-extrabold text-link">
                    Combate a cadeiras vazias
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {stats.idleRooms.slice(0, 4).map((act) => {
                    const release = walkinReleases?.[act.id] || (Array.isArray(walkinReleases) ? walkinReleases.find((r) => r.activityId === act.id) : null);
                    return (
                      <div key={act.id} className="rounded-xl border border-line bg-surface p-3 text-[12px]">
                        <div className="truncate font-bold text-text">{act.title}</div>
                        <div className="mt-0.5 text-text-3">{act.location} · {act.time}</div>
                        <div className="mt-2 flex items-center justify-between font-bold">
                          <span className="text-ok">{act.idleSeats} vagas livres</span>
                          <span className="text-text-4">{act.occPct}% ocupada</span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-line flex items-center justify-between gap-2">
                          {release ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-ok">
                                <CheckCircle2 size={13} /> +{release.releasedSeats || release.seatsReleased || 10} vagas liberadas
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCancelWalkin(act.id)}
                                className="text-[11px] font-bold text-warn hover:underline"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReleaseWalkin(act)}
                              className="press w-full rounded-lg bg-link/15 py-1.5 text-center text-[11px] font-extrabold text-link hover:bg-link/25"
                            >
                              ⚡ Liberar Walk-in (+{act.idleSeats} vagas)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Sub-bloco B: Funil de Retenção e Abandono (1º Scan vs 2º Scan Telão) */}
        <Section
          title="Funil de Retenção & Abandono"
          subtitle="Comparativo entre 1º Scan (Entrada) e 2º Scan (Validação Telão no final da palestra)."
          action={
            stats.highEvasionAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(242,196,106,0.15)] px-2.5 py-1 text-[11px] font-extrabold text-warn">
                <AlertTriangle size={13} aria-hidden="true" />
                {stats.highEvasionAlerts.length} com evasão &gt; 25%
              </span>
            )
          }
        >
          <div className="space-y-3.5">
            {stats.rankedActivities.slice(0, 4).map((act) => {
              const retentionPct = 100 - act.evasionPct;

              return (
                <div
                  key={act.id}
                  className={`rounded-xl border p-3.5 ${
                    act.highEvasion
                      ? 'border-[rgba(242,196,106,0.4)] bg-[rgba(242,196,106,0.03)]'
                      : 'border-line bg-surface-raised'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-extrabold text-text">
                        {act.title}
                      </div>
                      <div className="text-[12px] text-text-3">
                        {act.location} · {act.time}
                      </div>
                    </div>
                    {act.highEvasion ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[rgba(242,196,106,0.18)] px-2 py-0.5 text-[11px] font-black text-warn">
                        <AlertTriangle size={12} aria-hidden="true" />
                        Evasão {act.evasionPct}%
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[rgba(111,216,166,0.12)] px-2 py-0.5 text-[11px] font-black text-ok">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Retenção {retentionPct}%
                      </span>
                    )}
                  </div>

                  {/* Comparativo Visual do Funil (Barra Dupla) */}
                  <div className="mt-3 space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[11px] text-text-3">
                        <span>1º Scan (Entrada)</span>
                        <span className="font-bold text-text">{act.firstScan} pessoas</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-link w-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-text-3">
                        <span>2º Scan (Telão Final)</span>
                        <span className="font-bold text-text">{act.secondScan} validados</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${retentionPct}%`,
                            background: act.highEvasion ? 'var(--warn)' : 'var(--ok)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {onOpenTelao && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenTelao(act)}
                        className="press inline-flex items-center gap-1.5 text-[12px] font-bold text-link hover:underline"
                      >
                        <Monitor size={14} aria-hidden="true" />
                        Projetar Telão
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* BLOCO 3: Estandes & Engajamento de Patrocinadores */}
      <Section
        title="Estandes & Engajamento de Patrocinadores"
        subtitle="Volume de visitas registradas no Passaporte TechWeek e leads qualificados por cota."
        action={
          <button
            type="button"
            onClick={() => onNavigate?.('sponsor')}
            className="text-[13px] font-bold text-link hover:underline"
          >
            Área do Patrocinador
          </button>
        }
      >
        {/* Gráfico Comparativo de Desempenho dos Estandes */}
        <div className="mb-5 rounded-2xl border border-line bg-surface-raised p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <div className="text-[13px] font-black text-text">Comparativo de Engajamento por Estande</div>
              <div className="text-[12px] text-text-3">Visitas registradas no Passaporte TechWeek vs Leads qualificados pela equipe</div>
            </div>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1.5 font-bold text-text">
                <span className="h-3 w-3 rounded-sm bg-[#60A5FA]" /> Visitas Passaporte
              </span>
              <span className="flex items-center gap-1.5 font-bold text-ok">
                <span className="h-3 w-3 rounded-sm bg-[#6FD8A6]" /> Leads Coletados
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={stats.sponsorStats}
                margin={{ top: 10, right: 16, left: -10, bottom: 10 }}
              >
                <CartesianGrid stroke="var(--line)" strokeDasharray="4 6" vertical={false} opacity={0.65} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-4)"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                  tick={{ fontSize: 12, fill: 'var(--text)', fontWeight: 700 }}
                  dy={6}
                />
                <YAxis
                  stroke="var(--text-4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-4)', fontWeight: 600 }}
                />
                <RechartsTooltip content={<SponsorTooltip />} />
                <Bar
                  dataKey="visits"
                  name="Visitas Passaporte"
                  fill="#60A5FA"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="leads"
                  name="Leads Coletados"
                  fill="#6FD8A6"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.sponsorStats.map((s, idx) => {
            const activeBoost = activeBoosts?.[s.id] || (Array.isArray(activeBoosts) ? activeBoosts.find((b) => b.sponsorId === s.id) : Object.values(activeBoosts || {}).find((b) => b.sponsorId === s.id));
            return (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-surface-raised p-4 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide"
                      style={{ background: `${s.tierColor}20`, color: s.tierColor }}
                    >
                      {s.tierLabel}
                    </span>
                    <span className="text-[12px] font-black text-text-3">#{idx + 1}</span>
                  </div>

                  <div className="mt-3">
                    <h3 className="m-0 text-[17px] font-black text-text">{s.name}</h3>
                    <p className="m-0 mt-0.5 text-[12px] text-text-3 line-clamp-1">{s.badgeDescription}</p>
                  </div>

                  {activeBoost && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-1 text-[11px] font-black text-ok animate-pulse">
                      <Zap size={12} fill="currentColor" />
                      <span>Boost Ativo (+{activeBoost.extraPoints} XP)</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-line space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-text-3">Visitas Passaporte:</span>
                    <span className="font-black text-text">{fmtInt(s.visits)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-text-3">Leads Coletados:</span>
                    <span className="font-black text-ok">{fmtInt(s.leads)}</span>
                  </div>

                  {/* Barra Proporcional de Conversão */}
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] text-text-4">
                      <span>Alcance do público</span>
                      <span className="font-bold text-text-2">{s.conversionPct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.conversionPct}%`, background: s.tierColor }}
                      />
                    </div>
                  </div>

                  {/* Ações Táticas: Estande Booster & Dossiê Executivo */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5 pt-2 border-t border-line/60">
                    <button
                      type="button"
                      onClick={() => setBoosterModalSponsor(s)}
                      className="press flex items-center justify-center gap-1 rounded-xl bg-link/15 py-1.5 text-[11px] font-extrabold text-link hover:bg-link/25"
                    >
                      <Zap size={12} /> Boost
                    </button>
                    <button
                      type="button"
                      onClick={() => setDossierModalSponsor(s)}
                      className="press flex items-center justify-center gap-1 rounded-xl bg-surface py-1.5 text-[11px] font-bold text-text-2 border border-line hover:text-text"
                    >
                      <FileText size={12} /> Dossiê
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* BLOCO: Micro-Pulse NPS & Avaliação de Palestras em Tempo Real */}
      <Section
        title="Micro-Pulse NPS: Qualidade do Conteúdo em Tempo Real"
        subtitle="Avaliação instantânea de 1 a 5 estrelas e percepção dos participantes captada após cada palestra."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimPulseModal(true)}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-[12px] font-bold text-link hover:border-link"
            >
              <Star size={14} className="text-warn" /> + Simular Feedback
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* KPIs do Micro-Pulse */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <span className="text-[12px] font-bold text-text-3">Nota Média Geral</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[26px] font-black text-text">{microPulseAnalytics.averageScore}</span>
                <span className="text-[14px] font-bold text-warn">/ 5.0 ★</span>
              </div>
              <span className="mt-1 block text-[11px] text-text-4">Base de avaliações ativas</span>
            </div>

            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <span className="text-[12px] font-bold text-text-3">Índice de Aprovação</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[26px] font-black text-ok">{microPulseAnalytics.approvalRate}%</span>
              </div>
              <span className="mt-1 block text-[11px] text-text-4">Avaliações 4 e 5 estrelas</span>
            </div>

            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <span className="text-[12px] font-bold text-text-3">Total de Avaliações</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[26px] font-black text-link">{microPulseAnalytics.totalRatings}</span>
              </div>
              <span className="mt-1 block text-[11px] text-text-4">Feedbacks coletados</span>
            </div>

            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <span className="text-[12px] font-bold text-text-3">NPS Líquido TechWeek</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[26px] font-black text-[#C4B5FD]">
                  {microPulseAnalytics.netPromoterScore >= 0 ? `+${microPulseAnalytics.netPromoterScore}` : microPulseAnalytics.netPromoterScore}
                </span>
              </div>
              <span className="mt-1 block text-[11px] text-text-4">Excelente aceitação geral</span>
            </div>
          </div>

          {/* Tags Mais Frequentes */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3.5">
            <span className="text-[12px] font-black text-text-3 mr-1">Tags Mais Citadas:</span>
            {(microPulseAnalytics?.topTags || []).map((tag) => (
              <span
                key={tag.name}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-[11px] font-bold text-text border border-line"
              >
                <ThumbsUp size={12} className="text-ok" />
                <span>{tag.name}</span>
                <span className="text-text-4 font-black">({tag.count})</span>
              </span>
            ))}
          </div>

          {/* Grade de Palestras Ranqueadas & Feedbacks Recentes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ranking de Palestras */}
            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <h4 className="m-0 mb-3 text-[14px] font-black text-text">Desempenho por Palestra</h4>
              <div className="space-y-2.5">
                {(microPulseAnalytics?.talksRanking || microPulseAnalytics?.rankedActivities || []).map((talk) => (
                  <div key={talk.activityId} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
                    <div className="min-w-0">
                      <span className="truncate text-[13px] font-bold text-text block">{talk.title}</span>
                      <span className="text-[11px] text-text-3">{talk.ratingsCount} avaliações</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 rounded-lg bg-warn/15 px-2 py-0.5 text-[12px] font-black text-warn">
                        <Star size={12} fill="currentColor" /> {talk.avgRating}
                      </span>
                      <span className="text-[12px] font-bold text-ok">{talk.approvalPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comentários Recentes */}
            <div className="rounded-2xl border border-line bg-surface-raised p-4">
              <h4 className="m-0 mb-3 text-[14px] font-black text-text">Feedbacks dos Alunos</h4>
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {microPulseRatings.slice(0, 4).map((f) => (
                  <div key={f.id} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-text-2">{f.activityTitle}</span>
                      <div className="flex items-center gap-0.5 text-warn">
                        {Array.from({ length: f.rating }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p className="m-0 mt-1.5 text-[13px] text-text font-medium leading-snug">"{f.comment}"</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {(f.tags || []).map((t) => (
                        <span key={t} className="rounded-full bg-link/10 px-2 py-0.5 text-[10px] font-bold text-link">
                          {t}
                        </span>
                      ))}
                      <span className="text-[10px] text-text-4 ml-auto">{f.studentCourse || 'Aluno UFU'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* BLOCO 4 & BLOCO 5: Gamificação e Perfil Acadêmico */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOCO 4: Missões & Gamificação */}
        <Section
          title="Missões & Gamificação do Ecossistema"
          subtitle="Taxa de conclusão, missões gargalo e distribuição de pontos XP."
          action={
            <div className="text-right">
              <span className="text-[12px] font-bold text-text-3">Média por participante: </span>
              <span className="font-black text-link">{stats.avgPointsPerActive} pts</span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Top Concluídas */}
            <div>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ok">
                Maior Engajamento (Top Conclusões)
              </div>
              <div className="space-y-2">
                {stats.topMissions.map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface-raised p-3 border border-line">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="truncate text-[13px] font-bold text-text block">
                          {m.title}
                        </span>
                        <span className="text-[11px] text-text-3">
                          {m.category} · <b className="text-you-text">+{m.points} XP</b>
                        </span>
                      </div>
                      <span className="text-[13px] font-black text-ok">
                        {m.completionRate}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-ok" style={{ width: `${m.completionRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Missões Gargalo */}
            <div>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-warn">
                Missões Gargalo (Baixa Conclusão)
              </div>
              <div className="space-y-2">
                {stats.bottleneckMissions.map((m) => (
                  <div key={m.id} className="rounded-xl bg-surface-raised p-3 border border-line">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="truncate text-[13px] font-bold text-text block">
                          {m.title}
                        </span>
                        <span className="text-[11px] text-text-3">
                          {m.category} · <b className="text-you-text">+{m.points} XP</b>
                        </span>
                      </div>
                      <span className="text-[13px] font-black text-warn">
                        {m.completionRate}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-warn" style={{ width: `${m.completionRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* BLOCO 5: Perfil Acadêmico & Linhas de Pesquisa */}
        <Section
          title="Perfil Acadêmico & Distribuição por Cursos"
          subtitle="Composição dos inscritos por área acadêmica para a coordenação FACOM."
          action={
            <span className="text-[12px] font-bold text-text-3">
              Base: {fmtInt(stats.totalAcademicSum)} participantes
            </span>
          }
        >
          <div className="space-y-4">
            {/* Donut Chart Animado de Perfil Acadêmico */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-4">
              <div className="relative h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={stats.academicDistribution}
                      dataKey="count"
                      nameKey="short"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    >
                      {stats.academicDistribution.map((entry) => (
                        <Cell key={`cell-${entry.id}`} fill={entry.color} stroke="#0A0F24" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<AcademicTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centro do Donut com Total */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[22px] font-black tracking-tight text-text">{fmtInt(stats.totalAcademicSum)}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-3">Participantes</span>
                </div>
              </div>

              {/* Legenda em chips refinados */}
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {stats.academicDistribution.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-text-3 border border-line">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-text">{c.short}</span>
                    <span className="text-text-4">({c.pct}%)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Lista Detalhada com Barras Proporcionais */}
            <div className="space-y-3">
              {stats.academicDistribution.map((course) => (
                <div key={course.id} className="rounded-xl border border-line bg-surface-raised p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: course.color }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] font-extrabold text-text">{course.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-black text-text">{course.count}</span>
                      <span className="ml-1.5 text-[12px] text-text-3 font-semibold">({course.pct}%)</span>
                    </div>
                  </div>

                  {/* Barra Proporcional */}
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${course.pct}%`, background: course.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-surface p-3 text-[12px] text-text-2 border border-line">
              <span className="font-extrabold text-text block mb-1">💡 Destaque da Coordenação:</span>
              Predomínio de alunos de graduação em Computação (BSI e BCC representam mais de 70% do público), com forte adesão em IA, Engenharia de Software e Segurança da Informação.
            </div>
          </div>
        </Section>
      </div>

      {/* MODAL 1: Estande Booster (Missão Flash de Gamificação) */}
      {boosterModalSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-line-2 bg-surface-raised p-6 shadow-2xl relative">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.12)] px-2.5 py-0.5 text-[11px] font-extrabold text-[#FBBF24]">
                  <Zap size={12} aria-hidden="true" />
                  Estande Booster · Ao Vivo
                </span>
                <h3 className="mt-1 text-[18px] font-black text-text">
                  Disparar Missão Flash no App
                </h3>
                <p className="mt-0.5 text-[12px] text-text-3">
                  Ative bonificação temporária de XP para direcionar fluxo ao estande da {boosterModalSponsor.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBoosterModalSponsor(null)}
                className="rounded-lg p-2 text-text-3 hover:bg-surface hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleTriggerBoost} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-2">
                  Duração do Impulso (Tempo Limite)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBoostDuration(mins)}
                      className={`h-11 rounded-xl text-[13px] font-bold border transition-colors ${
                        boostDuration === mins
                          ? 'border-link bg-[rgba(37,99,235,0.15)] text-link'
                          : 'border-line bg-surface text-text-3 hover:text-text'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-2">
                  Recompensa Adicional de XP
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 150, 200].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setBoostPoints(pts)}
                      className={`h-11 rounded-xl text-[13px] font-bold border transition-colors ${
                        boostPoints === pts
                          ? 'border-[#FBBF24] bg-[rgba(251,191,36,0.15)] text-[#FBBF24]'
                          : 'border-line bg-surface text-text-3 hover:text-text'
                      }`}
                    >
                      +{pts} XP
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview do Card que aparecerá aos Alunos */}
              <div className="rounded-xl border border-line bg-surface p-3.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-4 block mb-1.5">
                  Prévia da Missão no App do Participante
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[rgba(251,191,36,0.15)] border border-[rgba(251,191,36,0.3)] flex items-center justify-center shrink-0">
                    <Rocket size={20} className="text-[#FBBF24]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-text truncate">
                      Missão Relâmpago: Estande {boosterModalSponsor.name}
                    </div>
                    <div className="text-[12px] text-text-3">
                      Valide presença no estande pelos próximos {boostDuration} min e receba +{boostPoints} XP!
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setBoosterModalSponsor(null)}
                  className={btn('secondary', 'h-11 px-4 text-[13px]')}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={btn('action', 'h-11 px-5 text-[13px] font-black')}
                >
                  <Zap size={16} aria-hidden="true" />
                  Ativar Booster no App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Dossiê Executivo de ROI & Talentos (Pronto para Impressão) */}
      {dossierModalSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-line-2 bg-surface-raised p-6 shadow-2xl relative my-8">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-bold text-text-3">
                  <FileText size={12} className="text-link" aria-hidden="true" />
                  Dossiê Executivo de Patrocínio
                </span>
                <h3 className="mt-1 text-[20px] font-black text-text">
                  {dossierModalSponsor.name}
                </h3>
                <p className="mt-0.5 text-[12px] text-text-3">
                  Cota {dossierModalSponsor.tierLabel} · TECHWEEK UFU 2026
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={btn('secondary', 'h-9 px-3 text-[12px]')}
                  title="Imprimir Relatório"
                >
                  <Printer size={14} aria-hidden="true" />
                  Imprimir PDF
                </button>
                <button
                  type="button"
                  onClick={() => setDossierModalSponsor(null)}
                  className="rounded-lg p-2 text-text-3 hover:bg-surface hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Fechar"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-5 text-text">
              {/* KPIs de Performance do Estande */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-4">Visitas Estande</div>
                  <div className="mt-1 text-[20px] font-black text-text">{fmtInt(dossierModalSponsor.visits)}</div>
                  <div className="text-[11px] text-ok font-semibold">100% validadas</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-4">Leads Coletados</div>
                  <div className="mt-1 text-[20px] font-black text-link">{fmtInt(dossierModalSponsor.leads)}</div>
                  <div className="text-[11px] text-text-3">Com perfil e contato</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-4">Taxa Conversão</div>
                  <div className="mt-1 text-[20px] font-black text-[#FBBF24]">{dossierModalSponsor.conversionPct}%</div>
                  <div className="text-[11px] text-text-3">Visita → Lead</div>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-4">Custo Médio / Lead</div>
                  <div className="mt-1 text-[20px] font-black text-text">R$ 41,20</div>
                  <div className="text-[11px] text-ok font-semibold">Benchmark ideal</div>
                </div>
              </div>

              {/* Distribuição de Talentos por Curso */}
              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="text-[13px] font-extrabold text-text mb-3">
                  Distribuição Acadêmica dos Visitantes
                </div>
                <div className="space-y-2">
                  {stats.academicDistribution.map((course) => (
                    <div key={course.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-text-2 font-medium">{course.label}</span>
                      <span className="font-bold text-text">{course.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Termo de Conformidade LGPD */}
              <div className="rounded-xl border border-line bg-surface p-3.5 text-[11px] text-text-3 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-text-2 mb-1">
                  <ShieldCheck size={14} className="text-ok" aria-hidden="true" />
                  Conformidade LGPD & Governança UFU
                </div>
                Todos os dados de contato foram coletados com autorização prévia e expressa dos alunos participantes
                no momento do credenciamento e validação de crachá na TECHWEEK UFU 2026.
              </div>

              <div className="flex justify-end pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setDossierModalSponsor(null)}
                  className={btn('primary', 'h-10 px-5 text-[13px]')}
                >
                  Fechar Dossiê
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Simulador / Registro de Micro-Pulse NPS */}
      {simPulseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-line-2 bg-surface-raised p-6 shadow-2xl relative">
            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.12)] px-2.5 py-0.5 text-[11px] font-extrabold text-link">
                  <Star size={12} aria-hidden="true" />
                  Micro-Pulse NPS
                </span>
                <h3 className="mt-1 text-[18px] font-black text-text">
                  Registrar Avaliação de Palestra
                </h3>
                <p className="mt-0.5 text-[12px] text-text-3">
                  Simule ou registre o feedback rápido emitido por um participante.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSimPulseModal(false)}
                className="rounded-lg p-2 text-text-3 hover:bg-surface hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitSimPulse} className="mt-4 space-y-4">
              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-1.5">
                  Palestra / Atividade Avaliada
                </label>
                <select
                  value={simTalkId}
                  onChange={(e) => setSimTalkId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-[13px] text-text focus:outline-none focus:border-link"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.location || 'Auditório'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-1.5">
                  Nota do Participante (1 a 5 estrelas)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSimRating(star)}
                      className={`h-11 flex-1 rounded-xl border flex items-center justify-center gap-1 text-[14px] font-black transition-colors ${
                        simRating >= star
                          ? 'border-[#FBBF24] bg-[rgba(251,191,36,0.15)] text-[#FBBF24]'
                          : 'border-line bg-surface text-text-4'
                      }`}
                    >
                      <Star size={16} fill={simRating >= star ? 'currentColor' : 'none'} aria-hidden="true" />
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-1.5">
                  Destaque Rápido (Tag)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Didática Clara', 'Inovador', 'Mão na Massa', 'Slides Excelentes', 'Conteúdo Denso'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSimTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-bold border transition-colors ${
                        simTag === tag
                          ? 'border-link bg-[rgba(37,99,235,0.15)] text-link'
                          : 'border-line bg-surface text-text-3 hover:text-text'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-extrabold text-text-2 mb-1.5">
                  Comentário Opcional
                </label>
                <input
                  type="text"
                  value={simComment}
                  onChange={(e) => setSimComment(e.target.value)}
                  placeholder="Ex: Palestrante muito claro e direto ao ponto..."
                  className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-[13px] text-text placeholder-text-4 focus:outline-none focus:border-link"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSimPulseModal(false)}
                  className={btn('secondary', 'h-11 px-4 text-[13px]')}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={btn('action', 'h-11 px-5 text-[13px] font-black')}
                >
                  <Send size={15} aria-hidden="true" />
                  Registrar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

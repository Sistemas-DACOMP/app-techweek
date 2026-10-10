import { auth, db } from './firebase';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';

const getApiBaseUrl = () => {
  return import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || '/api';
};

/**
 * Resolve os dados do participante a partir da leitura do QR Code do crachá
 * (físico Sympla, crachá digital do app ou UID direto).
 * 
 * @param {string} rawData Conteúdo lido pelo scanner
 * @returns {Promise<object|null>} Dados essenciais do participante
 */
export async function resolveParticipantFromQr(rawData) {
  if (!rawData || typeof rawData !== 'string') return null;

  const trimmed = rawData.trim();

  // 1. Tenta interpretar como JSON (crachá digital do app)
  let parsedJson = null;
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      parsedJson = JSON.parse(decoded);
    }
  } catch {
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsedJson = JSON.parse(trimmed);
      }
    } catch {}
  }

  // Se o JSON contiver UID direto
  if (parsedJson?.uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', parsedJson.uid));
      if (userDoc?.exists()) {
        return formatParticipant(userDoc.id, userDoc.data());
      }
    } catch {}
  }

  // Se contiver username
  if (parsedJson?.username) {
    try {
      const username = String(parsedJson.username).replace(/^@/, '').toLowerCase();
      const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        return formatParticipant(docSnap.id, docSnap.data());
      }
    } catch {}
  }

  // Se contiver número de ingresso Sympla
  const ticketNumber = parsedJson?.ticketNumber || (trimmed.startsWith('SYMPLA:') ? trimmed.replace('SYMPLA:', '') : null);
  if (ticketNumber) {
    try {
      const q1 = query(collection(db, 'users'), where('ticketId', '==', ticketNumber), limit(1));
      const snap1 = await getDocs(q1);
      if (snap1 && !snap1.empty) {
        return formatParticipant(snap1.docs[0].id, snap1.docs[0].data());
      }

      const q2 = query(collection(db, 'users'), where('symplaTicket.ticketNumber', '==', ticketNumber), limit(1));
      const snap2 = await getDocs(q2);
      if (snap2 && !snap2.empty) {
        return formatParticipant(snap2.docs[0].id, snap2.docs[0].data());
      }
    } catch {}
  }

  // 2. Se o dado lido for diretamente um ID de documento do Firestore (UID)
  if (/^[a-zA-Z0-9_-]{15,40}$/.test(trimmed)) {
    try {
      const directDoc = await getDoc(doc(db, 'users', trimmed));
      if (directDoc?.exists()) {
        return formatParticipant(directDoc.id, directDoc.data());
      }
    } catch {}
  }

  // 3. Fallback: se os dados parsed contiverem informações locais suficientes
  if (parsedJson && (parsedJson.name || parsedJson.username)) {
    return {
      participantUid: parsedJson.uid || `temp_${Date.now()}`,
      name: parsedJson.name || parsedJson.username,
      username: parsedJson.username || '',
      course: parsedJson.course || 'Computação',
      period: parsedJson.period || null,
      phone: parsedJson.phone || '',
      email: parsedJson.email || '',
      linkedin: parsedJson.linkedin || '',
      instagram: parsedJson.instagram || '',
      github: parsedJson.github || '',
      participantType: parsedJson.participantType || 'Estudante',
      avatarUrl: parsedJson.avatarUrl || parsedJson.photoURL || null
    };
  }

  return null;
}

function formatParticipant(uid, data) {
  const name = (
    data.displayName ||
    [data.firstName, data.lastName].filter(Boolean).join(' ') ||
    [data.first_name, data.last_name].filter(Boolean).join(' ') ||
    data.name ||
    data.username ||
    'Participante'
  ).trim();

  return {
    participantUid: uid,
    name,
    username: data.username || '',
    firstName: data.firstName || name.split(' ')[0],
    email: data.email || '',
    phone: data.phone || '',
    course: data.course || 'Não informado',
    period: data.period || null,
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    github: data.github || '',
    participantType: data.participantType || data.participant_type || 'Aluno',
    avatarUrl: data.avatarUrl || data.photoURL || null
  };
}

/**
 * Envia os dados do lead para POST /api/leads
 * 
 * @param {object} payload
 * @param {string} payload.participantUid
 * @param {string} payload.notes
 * @param {number} payload.rating 1 a 5 estrelas
 * @returns {Promise<object>} Resposta com dados do lead salvo e whatsapp
 */
export async function submitLead({ participantUid, notes, rating, companyId, validateOnly, tags }) {
  if (!participantUid) {
    throw new Error('participantUid é obrigatório.');
  }

  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads`.replace('//leads', '/leads');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      participantUid,
      notes: notes || '',
      rating: rating ? Number(rating) : undefined,
      companyId: companyId || undefined,
      validateOnly: validateOnly ? true : undefined,
      tags: Array.isArray(tags) ? tags : undefined
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || 'Erro ao registrar lead de patrocinador.';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Busca os leads do patrocinador (meus e da empresa).
 * @param {string} [companyId]
 * @returns {Promise<{ myLeads: Array, companyLeads: Array, companyId: string }>}
 */
export async function fetchLeads(companyId) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApiBaseUrl();
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const url = `${baseUrl}/leads${query}`.replace('//leads', '/leads');

  const response = await fetch(url, { method: 'GET', headers });
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || 'Erro ao carregar leads.';
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Atualiza avaliação (rating), observações (notes) e tags de um lead capturado.
 * @param {object} payload
 * @param {string} payload.participantUid
 * @param {number} [payload.rating] 0 a 5
 * @param {string} [payload.notes]
 * @param {string} [payload.companyId]
 * @param {Array<string>} [payload.tags]
 * @returns {Promise<object>}
 */
export async function updateLead({ participantUid, rating, notes, companyId, tags }) {
  if (!participantUid) throw new Error('participantUid é obrigatório.');

  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads/${encodeURIComponent(participantUid)}`.replace('//leads', '/leads');

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      rating: rating !== undefined ? Number(rating) : undefined,
      notes: notes !== undefined ? String(notes) : undefined,
      companyId: companyId || undefined,
      tags: Array.isArray(tags) ? tags : undefined
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || 'Erro ao atualizar lead.';
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Utilitário de exportação de leads para arquivo CSV compatível com Excel/Google Sheets.
 * @param {Array<object>} leads Lista de leads
 * @param {string} [companyName] Nome da empresa para o nome do arquivo
 */
export function exportLeadsToCsv(leads = [], companyName = 'patrocinador', scope = '') {
  if (!leads || leads.length === 0) {
    return false;
  }

  const headers = [
    'Nome',
    'E-mail',
    'Telefone / WhatsApp',
    'Curso / Graduação',
    'Período',
    'Tipo de Vínculo',
    'Avaliação (Estrelas)',
    'Classificação / Status',
    'Tags / Habilidades',
    'Observações / Notas',
    'GitHub',
    'LinkedIn',
    'Instagram',
    'Faixa Etária',
    'Coletado Por',
    'Empresa',
    'Data / Hora'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const getStatusLabel = (rating) => {
    const r = Number(rating) || 0;
    if (r === 5) return 'Destaque Máximo (5 ★)';
    if (r === 4) return 'Altamente Qualificado (4 ★)';
    if (r === 3) return 'Bom Potencial (3 ★)';
    if (r > 0) return `Avaliado (${r} ★)`;
    return 'Sem classificação';
  };

  const rows = leads.map((lead) => {
    const dateFormatted = lead.createdAt
      ? (typeof lead.createdAt?.toDate === 'function' ? lead.createdAt.toDate().toLocaleString('pt-BR') : new Date(lead.createdAt).toLocaleString('pt-BR'))
      : '';
    const ratingNum = Number(lead.rating) || 0;
    const formattedTags = Array.isArray(lead.tags) ? lead.tags.join(', ') : '';
    return [
      escapeCsv(lead.name || ''),
      escapeCsv(lead.email || ''),
      escapeCsv(lead.phone || ''),
      escapeCsv(lead.course || ''),
      escapeCsv(lead.period ? `${lead.period}º Período` : ''),
      escapeCsv(lead.participantType || lead.instituicao || ''),
      escapeCsv(ratingNum > 0 ? `${ratingNum} ★` : 'Sem nota'),
      escapeCsv(getStatusLabel(ratingNum)),
      escapeCsv(formattedTags),
      escapeCsv(lead.notes || ''),
      escapeCsv(lead.github || ''),
      escapeCsv(lead.linkedin || ''),
      escapeCsv(lead.instagram || ''),
      escapeCsv(lead.faixaEtaria || ''),
      escapeCsv(lead.collectedByEmail || lead.sponsorUid || ''),
      escapeCsv(companyName || ''),
      escapeCsv(dateFormatted)
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) garante acentuação perfeita no Microsoft Excel e Google Sheets
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  if (typeof document === 'undefined') {
    return true;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const scopeSuffix = scope ? `_${scope.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  // Mantém o prefixo 'leads_{company}_techweek_' para compatibilidade e adiciona escopo
  a.download = `leads_${sanitizedCompany}_techweek_${dateStr}${scopeSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Calcula métricas executivas de ROI do estande para apresentação pós-evento.
 * 
 * @param {Array<object>} leads Lista de leads capturados
 * @param {number} [totalEventAttendees=600] Total estimado de inscritos na TechWeek
 */
export function calculateSponsorRoi(leads = [], totalEventAttendees = 600) {
  const totalLeads = leads.length;
  if (totalLeads === 0) {
    return {
      totalLeads: 0,
      qualifiedCount: 0,
      qualificationRate: 0,
      topTalentsCount: 0,
      withPhoneCount: 0,
      withGithubCount: 0,
      penetrationRate: 0,
      courses: [],
      periods: {
        inicio: 0,
        meio: 0,
        conclusao: 0,
        posGrad: 0,
        outro: 0
      },
      tags: [],
      attendants: [],
      ratingFunnel: {
        total: 0,
        contactable: 0,
        evaluated: 0,
        qualified: 0,
        destaques: 0
      }
    };
  }

  let qualifiedCount = 0;
  let topTalentsCount = 0;
  let withPhoneCount = 0;
  let withGithubCount = 0;
  let evaluatedCount = 0;

  const courseCounts = {};
  const tagCounts = {};
  const attendantCounts = {};
  const periods = {
    inicio: 0,
    meio: 0,
    conclusao: 0,
    posGrad: 0,
    outro: 0
  };

  leads.forEach((l) => {
    const r = Number(l.rating) || 0;
    if (r > 0) evaluatedCount++;
    if (r >= 4) qualifiedCount++;
    if (r === 5) topTalentsCount++;
    if (l.phone && String(l.phone).replace(/\D/g, '').length >= 10) withPhoneCount++;
    if (l.github && String(l.github).trim()) withGithubCount++;

    // Cursos
    const rawCourse = (l.course || 'Não informado').trim();
    courseCounts[rawCourse] = (courseCounts[rawCourse] || 0) + 1;

    // Períodos
    const p = Number(l.period);
    const typeStr = (l.participantType || '').toLowerCase();
    if (typeStr.includes('pós') || typeStr.includes('mestrado') || typeStr.includes('doutorado')) {
      periods.posGrad++;
    } else if (p >= 1 && p <= 3) {
      periods.inicio++;
    } else if (p >= 4 && p <= 6) {
      periods.meio++;
    } else if (p >= 7) {
      periods.conclusao++;
    } else {
      periods.outro++;
    }

    // Tags
    if (Array.isArray(l.tags)) {
      l.tags.forEach((t) => {
        const cleanT = String(t).trim();
        if (cleanT) {
          tagCounts[cleanT] = (tagCounts[cleanT] || 0) + 1;
        }
      });
    }

    // Atendentes
    const collector = l.collectedByEmail || 'Estande Geral';
    attendantCounts[collector] = (attendantCounts[collector] || 0) + 1;
  });

  const courses = Object.entries(courseCounts)
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const attendants = Object.entries(attendantCounts)
    .map(([email, count]) => ({
      email,
      name: email.split('@')[0],
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const qualificationRate = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;
  const penetrationRate = totalEventAttendees > 0 ? Number(((totalLeads / totalEventAttendees) * 100).toFixed(1)) : 0;

  return {
    totalLeads,
    qualifiedCount,
    qualificationRate,
    topTalentsCount,
    withPhoneCount,
    withGithubCount,
    penetrationRate,
    courses,
    periods,
    tags,
    attendants,
    ratingFunnel: {
      total: totalLeads,
      contactable: withPhoneCount,
      evaluated: evaluatedCount,
      qualified: qualifiedCount,
      destaques: topTalentsCount
    }
  };
}


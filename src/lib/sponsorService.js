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
      course: parsedJson.course || 'Computação',
      period: parsedJson.period || null,
      phone: parsedJson.phone || '',
      email: parsedJson.email || '',
      linkedin: parsedJson.linkedin || '',
      participantType: parsedJson.participantType || 'Estudante'
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
    firstName: data.firstName || name.split(' ')[0],
    email: data.email || '',
    phone: data.phone || '',
    course: data.course || 'Não informado',
    period: data.period || null,
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
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
export async function submitLead({ participantUid, notes, rating }) {
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
      rating: rating ? Number(rating) : undefined
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

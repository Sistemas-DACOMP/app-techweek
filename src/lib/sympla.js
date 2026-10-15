/**
 * Utilitários de Integração do Frontend com o Backend do Sympla
 */
import { auth } from './firebase';

export const SYMPLA_EVENT_URL = 'https://www.sympla.com.br/evento/teste-facom-tech-weak/3575331';

export function hasSymplaTicket(userProfile) {
  if (!userProfile) return false;
  return Boolean(userProfile.symplaTicket || userProfile.sympla_ticket);
}

const memoryTicketCache = new Map();

export function getCachedSymplaTicket(email, uid) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail && memoryTicketCache.has(`email:${cleanEmail}`)) {
    return memoryTicketCache.get(`email:${cleanEmail}`);
  }
  if (uid && memoryTicketCache.has(`uid:${uid}`)) {
    return memoryTicketCache.get(`uid:${uid}`);
  }
  if (typeof localStorage === 'undefined') return null;
  try {
    if (cleanEmail) {
      const byEmail = localStorage.getItem(`facom_sympla_ticket_${cleanEmail}`);
      if (byEmail) {
        const parsed = JSON.parse(byEmail);
        if (parsed && (parsed.qrCodeData || parsed.ticketNumber)) {
          memoryTicketCache.set(`email:${cleanEmail}`, parsed);
          return parsed;
        }
      }
    }
    if (uid) {
      const byUid = localStorage.getItem(`facom_sympla_uid_${uid}`);
      if (byUid) {
        const parsed = JSON.parse(byUid);
        if (parsed && (parsed.qrCodeData || parsed.ticketNumber)) {
          memoryTicketCache.set(`uid:${uid}`, parsed);
          return parsed;
        }
      }
    }
  } catch (_e) {}
  return null;
}

export function setCachedSymplaTicket(email, uid, ticket, participant = null) {
  if (!ticket || (!ticket.qrCodeData && !ticket.ticketNumber)) return;
  const cleanEmail = (email || participant?.email || '').trim().toLowerCase();
  if (cleanEmail) {
    memoryTicketCache.set(`email:${cleanEmail}`, ticket);
  }
  if (uid) {
    memoryTicketCache.set(`uid:${uid}`, ticket);
  }
  const codes = [ticket.ticketNumber, ticket.qrCodeData]
    .filter(Boolean)
    .map((c) => String(c).replace(/^SYMPLA:/i, '').trim().toUpperCase());

  let existingEntry = null;
  for (const code of codes) {
    if (memoryTicketCache.has(`code:${code}`)) {
      existingEntry = memoryTicketCache.get(`code:${code}`);
      break;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`facom_sympla_code_${code}`);
        if (raw) {
          existingEntry = JSON.parse(raw);
          break;
        }
      } catch (_e) {}
    }
  }

  let localProfile = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const resolvedUid = uid || existingEntry?.uid;
      if (resolvedUid) {
        const rawP = localStorage.getItem(`facom_profile_${resolvedUid}`) || localStorage.getItem(`facom_user_dir_${resolvedUid}`);
        if (rawP) localProfile = JSON.parse(rawP);
      }
      if (!localProfile && cleanEmail) {
        const rawE = localStorage.getItem(`facom_user_dir_email_${cleanEmail}`);
        if (rawE) localProfile = JSON.parse(rawE);
      }
    } catch (_e) {}
  }

  const mergedParticipant = {
    ...(existingEntry?.participant || {}),
    ...(existingEntry || {}),
    ...(localProfile || {}),
    ...(participant || {})
  };
  delete mergedParticipant.ticket;
  delete mergedParticipant.participant;

  const codeEntry = {
    ...mergedParticipant,
    ticket,
    participant: Object.keys(mergedParticipant).length > 0 ? mergedParticipant : ticket,
    email: cleanEmail || existingEntry?.email || localProfile?.email || '',
    uid: uid || existingEntry?.uid || localProfile?.uid || null
  };

  for (const code of codes) {
    if (code) {
      memoryTicketCache.set(`code:${code}`, codeEntry);
      memoryTicketCache.set(`code:${code.replace(/[-\s]/g, '')}`, codeEntry);
    }
  }
  if (typeof localStorage === 'undefined') return;
  try {
    if (cleanEmail) {
      localStorage.setItem(`facom_sympla_ticket_${cleanEmail}`, JSON.stringify(ticket));
    }
    if (uid) {
      localStorage.setItem(`facom_sympla_uid_${uid}`, JSON.stringify(ticket));
    }
    for (const code of codes) {
      if (code) {
        localStorage.setItem(`facom_sympla_code_${code}`, JSON.stringify(codeEntry));
      }
    }
  } catch (_e) {}
}

export function getCachedSymplaByCode(rawCode) {
  const clean = String(rawCode || '').replace(/^SYMPLA:/i, '').trim().toUpperCase();
  if (!clean) return null;
  const norm = clean.replace(/[-\s]/g, '');

  const enrichWithLocalDir = (entry) => {
    if (!entry || typeof localStorage === 'undefined') return entry;
    try {
      const uid = entry.uid || entry.participant?.uid;
      const email = (entry.email || entry.participant?.email || '').trim().toLowerCase();
      let dirProfile = null;
      if (uid) {
        const raw = localStorage.getItem(`facom_profile_${uid}`) || localStorage.getItem(`facom_user_dir_${uid}`);
        if (raw) dirProfile = JSON.parse(raw);
      }
      if (!dirProfile && email) {
        const raw = localStorage.getItem(`facom_user_dir_email_${email}`);
        if (raw) dirProfile = JSON.parse(raw);
      }
      if (dirProfile) {
        return {
          ...entry,
          ...(entry.participant || {}),
          ...dirProfile,
          email: dirProfile.email || entry.email || email,
          uid: dirProfile.uid || entry.uid || uid
        };
      }
    } catch (_e) {}
    return entry;
  };

  if (memoryTicketCache.has(`code:${clean}`)) return enrichWithLocalDir(memoryTicketCache.get(`code:${clean}`));
  if (memoryTicketCache.has(`code:${norm}`)) return enrichWithLocalDir(memoryTicketCache.get(`code:${norm}`));
  if (typeof localStorage === 'undefined') return null;
  try {
    const direct = localStorage.getItem(`facom_sympla_code_${clean}`);
    if (direct) {
      const parsed = JSON.parse(direct);
      if (parsed) {
        const enriched = enrichWithLocalDir(parsed);
        memoryTicketCache.set(`code:${clean}`, enriched);
        return enriched;
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('facom_profile_') ||
        key.startsWith('facom_user_dir_') ||
        key.startsWith('facom_user_profile_') ||
        key.startsWith('facom_sympla_')
      ) {
        const rawVal = localStorage.getItem(key);
        if (!rawVal) continue;
        const parsed = JSON.parse(rawVal);
        const t = parsed?.symplaTicket || parsed?.ticket || parsed;
        const candidates = [t?.ticketNumber, t?.qrCodeData, parsed?.ticketId]
          .filter(Boolean)
          .map((c) => String(c).replace(/^SYMPLA:/i, '').trim().toUpperCase());
        if (candidates.some((c) => c === clean || c.replace(/[-\s]/g, '') === norm)) {
          return enrichWithLocalDir(parsed);
        }
      }
    }
  } catch (_e) {}
  return null;
}

/**
 * Valor codificado no QR do crachá digital (KAN-47). Mesmo `ticketId`/`qrCodeData` do crachá
 * físico impresso quando o ingresso Sympla está vinculado; cai pra um identificador local só até
 * o participante vincular o ingresso (nunca bloqueia a tela por falta de ingresso).
 */
export function getBadgeQrValue(profile) {
  const ticket =
    profile?.symplaTicket ||
    profile?.sympla_ticket ||
    getCachedSymplaTicket(profile?.email, profile?.uid || profile?.id);

  if (ticket?.qrCodeData) return ticket.qrCodeData;
  if (ticket?.ticketNumber) return ticket.ticketNumber;
  if (profile?.ticketId) return profile.ticketId;

  const payload = {
    username: (profile?.username || 'user').replace(/^@/, ''),
    participantType: profile?.participantType || profile?.participant_type || 'Participante',
    course: profile?.course || '',
    period: profile?.period || null
  };
  if (profile?.uid || profile?.id) payload.uid = profile.uid || profile.id;
  if (profile?.name) payload.name = profile.name;
  if (profile?.email) payload.email = profile.email;
  if (profile?.phone) payload.phone = profile.phone;
  if (profile?.linkedin) payload.linkedin = profile.linkedin;
  if (profile?.instagram) payload.instagram = profile.instagram;
  if (profile?.github) payload.github = profile.github;
  return JSON.stringify(payload);
}

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
};

const SYMPLA_PUBLIC_TOKEN = 'ea3f626667739b2909c1208ed0c15eac41f59b53313cce349e7abf837f57b9b8';
const SYMPLA_EVENT_ID = '3575331';

/**
 * Consulta direta à API oficial do Sympla como fallback resiliente caso o backend Cloud Function
 * esteja offline ou ainda não implantado.
 */
export async function verifySymplaDirectly({ email, ticketNumber }) {
  try {
    const res = await fetch(`https://api.sympla.com.br/public/v3/events/${SYMPLA_EVENT_ID}/participants?page_size=200`, {
      headers: {
        's_token': SYMPLA_PUBLIC_TOKEN
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    const participants = data?.data || [];

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanTicket = (ticketNumber || '').replace(/^SYMPLA:/i, '').trim().toUpperCase();
    const normTicket = cleanTicket.replace(/[-\s]/g, '');

    const participant = participants.find(p => {
      const pEmail = (p.email || '').trim().toLowerCase();
      const pTicket = (p.ticket_number || '').replace(/^SYMPLA:/i, '').trim().toUpperCase();
      const pQr = (p.ticket_num_qr_code || p.qr_code || '').replace(/^SYMPLA:/i, '').trim().toUpperCase();
      if (cleanEmail && pEmail === cleanEmail) return true;
      if (cleanTicket) {
        if (pTicket === cleanTicket || pQr === cleanTicket) return true;
        if (normTicket && (pTicket.replace(/[-\s]/g, '') === normTicket || pQr.replace(/[-\s]/g, '') === normTicket)) {
          return true;
        }
      }
      return false;
    });

    if (participant) {
      const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;
      return {
        status: 'success',
        verified: true,
        hasTicket: true,
        participant: {
          id: participant.id,
          orderId: participant.order_id,
          ticketNumber: participant.ticket_number,
          ticketName: participant.ticket_name,
          firstName: participant.first_name,
          lastName: participant.last_name,
          email: participant.email,
          qrCodeData: qrCodeData,
          checkInStatus: participant.checkin?.[0]?.check_in || false
        },
        symplaTicket: {
          participantId: participant.id,
          orderId: participant.order_id,
          ticketNumber: participant.ticket_number,
          ticketName: participant.ticket_name,
          qrCodeData: qrCodeData,
          syncedAt: new Date().toISOString()
        }
      };
    }
  } catch (directErr) {
    console.warn('Aviso ao consultar Sympla API diretamente:', directErr);
    throw directErr;
  }
  return null;
}

/**
 * Valida se um e-mail ou número de ingresso possui compra ativa no Sympla
 */
export async function verifySymplaTicket({ email, ticketNumber }) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken(true);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (_e) {}
  }

  let directLookupFailed = false;

  // 1. Tenta via Backend Cloud Function primeiro (com timeout de 8s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${getApiBaseUrl()}/sympla/verify-ticket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, ticketNumber }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (json && json.verified) {
        const p = json.participant || json.ticket;
        const ticketToCache = json.symplaTicket || (p ? {
          participantId: p.id,
          orderId: p.orderId,
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber
        } : null);
        if (ticketToCache) {
          const targetEmail = (email || p?.email || '').trim().toLowerCase();
          const currentUserEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
          const targetUid = (!currentUserEmail || targetEmail === currentUserEmail) ? auth?.currentUser?.uid : null;
          setCachedSymplaTicket(targetEmail, targetUid, ticketToCache, p);
        }
        return { ...json, hasTicket: true };
      }
    } else if (response.status === 409) {
      // Ingresso já vinculado a outra conta (KAN-108): não tenta o fallback direto
      const json = await response.json().catch(() => ({}));
      return {
        status: 'conflict',
        verified: false,
        message: json?.message || 'Este ingresso já está vinculado a outra conta.'
      };
    }
  } catch (_backendErr) {
    // Backend offline, timeout ou 404 - fallback direto garantido
  }

  // 2. Fallback resiliente direto para a API oficial do Sympla (api.sympla.com.br)
  try {
    const directResult = await verifySymplaDirectly({ email, ticketNumber });
    if (directResult && directResult.verified) {
      if (directResult.symplaTicket) {
        const targetEmail = (email || directResult.participant?.email || '').trim().toLowerCase();
        const currentUserEmail = (auth?.currentUser?.email || '').trim().toLowerCase();
        const targetUid = (!currentUserEmail || targetEmail === currentUserEmail) ? auth?.currentUser?.uid : null;
        setCachedSymplaTicket(targetEmail, targetUid, directResult.symplaTicket, directResult.participant);
      }
      return directResult;
    }
  } catch (_directErr) {
    directLookupFailed = true;
  }

  if (directLookupFailed) {
    return { 
      status: 'error', 
      verified: false, 
      message: 'Serviço de validação temporariamente indisponível. Verifique sua conexão.' 
    };
  }

  return { 
    status: 'not_found', 
    verified: false, 
    message: 'Ingresso não localizado no Sympla para os dados informados.' 
  };
}

/**
 * Sincroniza o ingresso do Sympla do usuário logado diretamente com o Firestore
 */
export async function syncUserSymplaTicket() {
  const user = auth?.currentUser;
  if (!user) return { status: 'unauthenticated', synced: false };

  try {
    const token = await user.getIdToken(true);
    const response = await fetch(`${getApiBaseUrl()}/sympla/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email: user.email })
    });

    if (response.ok) {
      const json = await response.json();
      if (json?.synced) return json;
    }
  } catch (_error) {}

  // Fallback direto
  const direct = await verifySymplaDirectly({ email: user.email });
  if (direct?.verified && direct?.symplaTicket) {
    return {
      status: 'success',
      synced: true,
      ticket: direct.symplaTicket,
      participant: direct.participant
    };
  }

  return { status: 'not_found', synced: false };
}


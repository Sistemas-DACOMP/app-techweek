/**
 * Utilitários de Integração do Frontend com o Backend do Sympla
 */
import { auth } from './firebase';

export const SYMPLA_EVENT_URL =
  import.meta.env?.VITE_SYMPLA_EVENT_URL ||
  'https://www.sympla.com.br/evento/facom-tech-week-2026';

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
 * Valor codificado no QR do crachá digital.
 * Se o participante possui ingresso Sympla confirmado, utiliza o QR / número oficial do Sympla.
 * Se NÃO possui ingresso Sympla, gera o QR padronizado de Acesso Geral:
 * { type: 'GENERAL_ACCESS', uid, email }
 * (Sem menção ao Sympla ou códigos fictícios)
 */
export function getBadgeQrValue(profile) {
  const ticket =
    profile?.symplaTicket ||
    profile?.sympla_ticket ||
    getCachedSymplaTicket(profile?.email, profile?.uid || profile?.id);

  if (ticket?.qrCodeData) return ticket.qrCodeData;
  if (ticket?.ticketNumber) return ticket.ticketNumber;
  if (profile?.ticketId) return profile.ticketId;

  return JSON.stringify({
    type: 'GENERAL_ACCESS',
    uid: profile?.uid || profile?.id || '',
    email: profile?.email || ''
  });
}

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
};

/**
 * Valida se um e-mail ou número de ingresso possui compra ativa no Sympla.
 * Consulta exclusivamente o backend autenticado da aplicação (/api/sympla/verify-ticket).
 * Nenhuma requisição sai do navegador diretamente para a API do Sympla.
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
      const json = await response.json().catch(() => ({}));
      return {
        status: 'conflict',
        verified: false,
        hasTicket: false,
        message: json?.message || 'Este ingresso já está vinculado a outra conta.'
      };
    } else if (response.status === 404) {
      const json = await response.json().catch(() => ({}));
      return {
        status: 'not_found',
        verified: false,
        hasTicket: false,
        message: json?.message || 'Ingresso não localizado no Sympla para os dados informados.'
      };
    }
  } catch (err) {
    return {
      status: 'error',
      verified: false,
      hasTicket: false,
      message: 'Serviço de validação temporariamente indisponível. Verifique sua conexão.'
    };
  }

  return {
    status: 'not_found',
    verified: false,
    hasTicket: false,
    message: 'Ingresso não localizado no Sympla para os dados informados.'
  };
}

/**
 * Sincroniza o ingresso do Sympla do usuário logado via backend (/api/sympla/sync-user).
 */
export async function syncUserSymplaTicket() {
  const user = auth?.currentUser;
  if (!user) return { status: 'unauthenticated', synced: false, hasTicket: false };

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
      if (json?.synced) return { ...json, hasTicket: true };
    } else if (response.status === 404) {
      return { status: 'not_found', synced: false, hasTicket: false };
    }
  } catch (_error) {
    return { status: 'error', synced: false, hasTicket: false };
  }

  return { status: 'not_found', synced: false, hasTicket: false };
}

/**
 * Limpa todos os caches locais em memória e localStorage associados ao ingresso Sympla.
 */
export function clearCachedSymplaTicket(email, uid) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    memoryTicketCache.delete(`email:${cleanEmail}`);
  }
  if (uid) {
    memoryTicketCache.delete(`uid:${uid}`);
  }
  if (typeof localStorage === 'undefined') return;
  try {
    if (cleanEmail) {
      localStorage.removeItem(`facom_sympla_ticket_${cleanEmail}`);
    }
    if (uid) {
      localStorage.removeItem(`facom_sympla_uid_${uid}`);
      const rawP = localStorage.getItem(`facom_profile_${uid}`);
      if (rawP) {
        const parsed = JSON.parse(rawP);
        parsed.symplaTicket = null;
        parsed.hasSymplaTicket = false;
        parsed.ticketId = null;
        parsed.symplaTicketCode = null;
        localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(parsed));
      }
    }
  } catch (_e) {}
}

/**
 * Desvincula o ingresso Sympla do usuário logado através do backend (/api/sympla/unlink-ticket)
 * e limpa o cache local.
 */
export async function unlinkUserSymplaTicket() {
  const user = auth?.currentUser;
  if (!user) return { status: 'unauthenticated', unlinked: false };

  try {
    const token = await user.getIdToken(true);
    const response = await fetch(`${getApiBaseUrl()}/sympla/unlink-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uid: user.uid })
    });

    if (response.ok) {
      clearCachedSymplaTicket(user.email, user.uid);
      return { status: 'success', unlinked: true };
    }
    const json = await response.json().catch(() => ({}));
    return {
      status: 'error',
      unlinked: false,
      message: json?.message || 'Falha ao desvincular ingresso.'
    };
  } catch (_error) {
    return {
      status: 'error',
      unlinked: false,
      message: 'Serviço temporariamente indisponível. Verifique sua conexão.'
    };
  }
}



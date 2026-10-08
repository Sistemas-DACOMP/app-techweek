/**
 * Utilitários de Integração do Frontend com o Backend do Sympla
 */
import { auth } from './firebase';

export const SYMPLA_EVENT_URL = 'https://www.sympla.com.br/evento/teste-facom-tech-weak/3575331';

export function hasSymplaTicket(userProfile) {
  if (!userProfile) return false;
  return Boolean(userProfile.symplaTicket || userProfile.sympla_ticket);
}

/**
 * Valor codificado no QR do crachá digital (KAN-47). Mesmo `ticketId`/`qrCodeData` do crachá
 * físico impresso quando o ingresso Sympla está vinculado; cai pra um identificador local só até
 * o participante vincular o ingresso (nunca bloqueia a tela por falta de ingresso).
 */
export function getBadgeQrValue(profile) {
  const ticket = profile?.symplaTicket;
  if (ticket?.qrCodeData) return ticket.qrCodeData;
  if (ticket?.ticketNumber) return ticket.ticketNumber;
  return JSON.stringify({
    username: (profile?.username || 'user').replace(/^@/, ''),
    participantType: profile?.participantType || 'Participante',
    course: profile?.course || '',
    period: profile?.period || null
  });
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
    const res = await fetch(`https://api.sympla.com.br/public/v3/events/${SYMPLA_EVENT_ID}/participants`, {
      headers: {
        's_token': SYMPLA_PUBLIC_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    const participants = data?.data || [];

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanTicket = (ticketNumber || '').trim().toUpperCase();

    const participant = participants.find(p => {
      const pEmail = (p.email || '').trim().toLowerCase();
      const pTicket = (p.ticket_number || '').trim().toUpperCase();
      const pQr = (p.ticket_num_qr_code || '').trim().toUpperCase();
      if (cleanEmail && pEmail === cleanEmail) return true;
      if (cleanTicket && (pTicket === cleanTicket || pQr === cleanTicket)) return true;
      return false;
    });

    if (participant) {
      const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;
      return {
        status: 'success',
        verified: true,
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

  // 1. Tenta via Backend Cloud Function primeiro (com timeout rápido de 2.5s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${getApiBaseUrl()}/sympla/verify-ticket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, ticketNumber }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (json && json.verified) return json;
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


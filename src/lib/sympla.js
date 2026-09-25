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

/**
 * Valida se um e-mail ou número de ingresso possui compra ativa no Sympla
 */
export async function verifySymplaTicket({ email, ticketNumber }) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (_e) {}
    }

    const response = await fetch(`${getApiBaseUrl()}/sympla/verify-ticket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, ticketNumber })
    });

    return await response.json();
  } catch (error) {
    console.warn('Não foi possível conectar com o serviço Sympla:', error);
    return { status: 'error', verified: false, message: 'Serviço de validação temporariamente indisponível.' };
  }
}

/**
 * Sincroniza o ingresso do Sympla do usuário logado diretamente com o Firestore
 */
export async function syncUserSymplaTicket() {
  try {
    const user = auth.currentUser;
    if (!user) return { status: 'unauthenticated', synced: false };

    const token = await user.getIdToken();
    const response = await fetch(`${getApiBaseUrl()}/sympla/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email: user.email })
    });

    return await response.json();
  } catch (error) {
    console.warn('Falha ao sincronizar ingresso com Firestore:', error);
    return { status: 'error', synced: false };
  }
}


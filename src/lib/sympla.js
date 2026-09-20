/**
 * Utilitários de Integração do Frontend com o Backend do Sympla
 */
import { auth } from './firebase';

export const SYMPLA_EVENT_URL = 'https://www.sympla.com.br/evento/teste-facom-tech-weak/3575331';

export function hasSymplaTicket(userProfile) {
  if (!userProfile) return false;
  return Boolean(userProfile.symplaTicket || userProfile.sympla_ticket);
}

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '/api';
};

/**
 * Valida se um e-mail ou número de ingresso possui compra ativa no Sympla
 */
export async function verifySymplaTicket({ email, ticketNumber }) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/sympla/verify-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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


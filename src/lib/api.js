import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Utilitário centralizado para requisições autenticadas ao Backend Firebase/Express.
 * Injeta automaticamente o token JWT (Bearer) do usuário logado.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Se houver usuário autenticado no Firebase, obtém e anexa o ID Token
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('[API] Falha ao obter token JWT:', err);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (typeof data === 'object' && (data.error || data.message)) || `Erro HTTP ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Utilitário centralizado para requisições autenticadas ao Backend Firebase/Express.
 * Injeta automaticamente o token JWT (Bearer) do usuário logado.
 */
export async function apiRequest(endpoint, options = {}) {
  let url;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (API_BASE) {
      const baseHasApi = API_BASE.endsWith('/api');
      const endpointHasApi = cleanEndpoint.startsWith('/api/');
      if (baseHasApi && endpointHasApi) {
        url = `${API_BASE}${cleanEndpoint.slice(4)}`;
      } else {
        url = `${API_BASE}${cleanEndpoint}`;
      }
    } else {
      url = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api${cleanEndpoint}`;
    }
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Se houver usuário autenticado no Firebase, obtém e anexa o ID Token (caso não tenha sido injetado previamente em retry)
  if (auth?.currentUser && !headers['Authorization']) {
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
    // KAN-127: Se receber 401 (token expirado/inválido/revogado) e houver usuário autenticado,
    // tenta forçar a renovação do token (force refresh) e retenta a requisição uma única vez.
    if (response.status === 401 && auth?.currentUser && !options._isRetry) {
      let freshToken = null;
      try {
        freshToken = await auth.currentUser.getIdToken(true);
      } catch (refreshErr) {
        console.warn('[API] Falha ao obter novo token JWT após 401:', refreshErr);
      }

      if (freshToken) {
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${freshToken}`
        };
        return await apiRequest(endpoint, {
          ...options,
          _isRetry: true,
          headers: retryHeaders
        });
      }
    }

    let errorMsg = (typeof data === 'object' && (data.message || data.error)) || `Erro HTTP ${response.status}`;
    if (response.status === 401) {
      errorMsg = 'Sua sessão expirou ou é inválida. Por favor, faça login novamente para continuar.';
    }

    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = response.status === 401 ? 'SESSION_EXPIRED' : (typeof data === 'object' ? data.code || data.error : undefined);
    error.data = data;
    throw error;
  }

  return data;
}

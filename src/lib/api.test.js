import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from './api';
import { auth } from './firebase';

vi.mock('./firebase', () => ({
  auth: {
    currentUser: null
  }
}));

describe('Utilitário apiRequest (src/lib/api.js) — KAN-127 Token Auto-Refresh & Error Handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('anexa token Bearer quando há usuário logado e retorna JSON em requisição 200', async () => {
    auth.currentUser = {
      getIdToken: vi.fn().mockResolvedValue('jwt-token-123')
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null)
      },
      json: vi.fn().mockResolvedValue({ success: true, bookingId: 'u1_act1' })
    });

    const result = await apiRequest('/activities/act1/reserve', { method: 'POST' });

    expect(result).toEqual({ success: true, bookingId: 'u1_act1' });
    expect(auth.currentUser.getIdToken).toHaveBeenCalledWith();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = global.fetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer jwt-token-123');
  });

  it('quando recebe 401 (token expirado/inválido), força refresh com getIdToken(true) e retenta com sucesso', async () => {
    const mockGetIdToken = vi.fn()
      .mockResolvedValueOnce('stale-expired-token')
      .mockResolvedValueOnce('fresh-new-token');

    auth.currentUser = {
      getIdToken: mockGetIdToken
    };

    let fetchCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url, opts) => {
      fetchCount++;
      if (fetchCount === 1) {
        // Primeira tentativa com token antigo retorna 401 INVALID_TOKEN
        expect(opts.headers['Authorization']).toBe('Bearer stale-expired-token');
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({
            error: 'INVALID_TOKEN',
            message: 'Token de autenticação inválido, expirado ou revogado.'
          })
        };
      }
      // Segunda tentativa com novo token retorna 200 OK
      expect(opts.headers['Authorization']).toBe('Bearer fresh-new-token');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          status: 'CONFIRMED',
          bookingId: 'u1_act1'
        })
      };
    });

    const result = await apiRequest('/activities/act1/reserve', { method: 'POST' });

    expect(result).toEqual({ success: true, status: 'CONFIRMED', bookingId: 'u1_act1' });
    expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).toHaveBeenLastCalledWith(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('quando 401 persiste após o refresh, lança erro com SESSION_EXPIRED e mensagem orientativa', async () => {
    const mockGetIdToken = vi.fn()
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('refreshed-token');

    auth.currentUser = {
      getIdToken: mockGetIdToken
    };

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({
          error: 'INVALID_TOKEN',
          message: 'Token de autenticação inválido, expirado ou revogado.'
        })
      };
    });

    await expect(apiRequest('/activities/act1/reserve', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED',
      message: 'Sua sessão expirou ou é inválida. Por favor, faça login novamente para continuar.'
    });

    // Garante que não entra em loop infinito (máximo 1 retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('quando não há usuário autenticado e recebe 401, formata mensagem orientativa de sessão expirada', async () => {
    auth.currentUser = null;

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'UNAUTHORIZED',
        message: 'Token de autenticação ausente.'
      })
    });

    await expect(apiRequest('/activities/act1/reserve', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED',
      message: 'Sua sessão expirou ou é inválida. Por favor, faça login novamente para continuar.'
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});


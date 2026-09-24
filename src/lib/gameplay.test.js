import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from './api';
import { getUserPointEvents } from './userService';

vi.mock('./api', () => ({
  apiRequest: vi.fn()
}));

vi.mock('./userService', () => ({
  getUserProfile: vi.fn(),
  uploadUserAvatar: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserPointEvents: vi.fn(),
  getLeaderboardUsers: vi.fn()
}));

vi.mock('./firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
  storage: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
}));

import { addPointEvent, getMyPointEvents } from './gameplay';
import { getDocs } from 'firebase/firestore';

describe('addPointEvent (KAN-79)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sucesso: chama apiRequest com o payload certo e retorna o resultado do backend', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, points: 50 });

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(apiRequest).toHaveBeenCalledWith('/points/claim', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'mission', referenceId: 'm1', points: 50, metadata: null })
    });
    expect(result).toEqual({ success: true, points: 50 });
  });

  it('evento já resgatado (409/alreadyClaimed): retorna {success:false, alreadyClaimed:true}, não lança', async () => {
    const err = new Error('já resgatado');
    err.status = 409;
    err.data = { alreadyClaimed: true };
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result).toEqual({ success: false, alreadyClaimed: true });
  });

  it('erro real (rede/500): retorna {success:false, error}, NUNCA {success:true} (regressão do bug original)', async () => {
    const err = new Error('Falha ao conectar ao backend');
    err.status = 500;
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result.success).toBe(false);
    expect(result).not.toEqual(expect.objectContaining({ success: true }));
    expect(result.error).toBe('Falha ao conectar ao backend');
  });

  it('falha por ausência de ingresso Sympla (403 SYMPLA_TICKET_REQUIRED): retorna {success:false, code: "SYMPLA_TICKET_REQUIRED"}', async () => {
    const err = new Error('Acesso negado');
    err.status = 403;
    err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: 'Ingresso do Sympla obrigatório.' };
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result.success).toBe(false);
    expect(result.code).toBe('SYMPLA_TICKET_REQUIRED');
    expect(result.error).toBe('Ingresso do Sympla obrigatório.');
  });
});

describe('getMyPointEvents (KAN-79/KAN-71)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('une eventos de users/{uid}/point_events e da coleção pointEvents de nível raiz, sem descartar um pelo outro', async () => {
    getUserPointEvents.mockResolvedValueOnce([
      { id: 'mission_m1', eventType: 'mission', referenceId: 'm1', points: 50 }
    ]);
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'user-1_lecture_attendance_l1',
          data: () => ({ eventType: 'lecture_attendance', referenceId: 'l1', points: 10 })
        }
      ]
    });

    const result = await getMyPointEvents();

    const refs = result.map((e) => e.reference_id);
    expect(refs).toContain('m1');
    expect(refs).toContain('l1');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiRequest = vi.fn();
const mockGetCachedUserProfile = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((_db, coll, id) => ({ coll, id }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: (...args) => mockDoc(...args),
  getDoc: vi.fn(),
  setDoc: (...args) => mockSetDoc(...args),
  deleteDoc: vi.fn(),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'user_sympla_test',
      email: 'test@ufu.br',
    },
  },
}));

vi.mock('../../src/lib/api', () => ({
  apiRequest: (...args) => mockApiRequest(...args),
}));

vi.mock('../../src/lib/userService', () => ({
  getCachedUserProfile: () => mockGetCachedUserProfile(),
}));

import { reserveActivity } from '../../src/lib/activityService';

describe('reserveActivity - Sistema de Inscrições e Eventos Abertos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  it('bloqueia reserva em evento fechado para usuário sem ingresso Sympla (SYMPLA_TICKET_REQUIRED)', async () => {
    mockGetCachedUserProfile.mockReturnValue({
      uid: 'user_sympla_test',
      hasSymplaTicket: false,
      symplaTicket: null,
      role: 'USER',
    });

    const closedActivityMeta = {
      id: 'act_workshop_fechado',
      isOpenEvent: false,
    };

    await expect(
      reserveActivity('act_workshop_fechado', closedActivityMeta)
    ).rejects.toMatchObject({
      code: 'SYMPLA_TICKET_REQUIRED',
    });

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('permite reserva direta em evento aberto (isOpenEvent: true) mesmo para usuário sem Sympla', async () => {
    mockGetCachedUserProfile.mockReturnValue({
      uid: 'user_sympla_test',
      hasSymplaTicket: false,
      symplaTicket: null,
      role: 'USER',
    });

    mockApiRequest.mockResolvedValueOnce({
      status: 'CONFIRMED',
      activityId: 'act_aberta_1',
      bookingId: 'user_sympla_test_act_aberta_1',
    });

    const openActivityMeta = {
      id: 'act_aberta_1',
      isOpenEvent: true,
    };

    const result = await reserveActivity('act_aberta_1', openActivityMeta);

    expect(result.status).toBe('CONFIRMED');
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/activities/act_aberta_1/reserve',
      { method: 'POST' }
    );
  });

  it('permite reserva em evento fechado para usuário com ingresso Sympla confirmado', async () => {
    mockGetCachedUserProfile.mockReturnValue({
      uid: 'user_sympla_test',
      hasSymplaTicket: true,
      symplaTicket: { id: 'sympla_12345', status: 'CONFIRMED' },
      role: 'USER',
    });

    mockApiRequest.mockResolvedValueOnce({
      status: 'CONFIRMED',
      activityId: 'act_workshop_fechado',
    });

    const closedActivityMeta = {
      id: 'act_workshop_fechado',
      isOpenEvent: false,
    };

    const result = await reserveActivity('act_workshop_fechado', closedActivityMeta);

    expect(result.status).toBe('CONFIRMED');
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/activities/act_workshop_fechado/reserve',
      { method: 'POST' }
    );
  });

  it('garante fallback offline/resiliente salvando localmente se API backend estiver offline', async () => {
    mockGetCachedUserProfile.mockReturnValue({
      uid: 'user_sympla_test',
      hasSymplaTicket: true,
      role: 'USER',
    });

    const networkErr = new Error('Failed to fetch');
    networkErr.status = 503;
    mockApiRequest.mockRejectedValueOnce(networkErr);
    mockSetDoc.mockResolvedValueOnce();

    const openActivityMeta = {
      id: 'act_fallback_test',
      isOpenEvent: true,
    };

    const result = await reserveActivity('act_fallback_test', openActivityMeta);

    expect(result.status).toBe('CONFIRMED');
    expect(result.success).toBe(true);
    expect(result.bookingId).toBe('user_sympla_test_act_fallback_test');
    expect(mockSetDoc).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  subscribeToActivities, 
  subscribeToUserBookings, 
  subscribeToUserCheckins, 
  subscribeToUserPointEvents,
  reserveActivity,
  checkoutDoubleCheck,
  calculateActivityStatus,
  formatActivityType,
  DEFAULT_ACTIVITIES
} from './activityService';
import { apiRequest } from './api';

vi.mock('./firebase', () => ({
  db: { mock: 'db' },
  auth: {
    currentUser: { uid: 'test_user_id' }
  }
}));

vi.mock('./userService', () => ({
  getCachedUserProfile: vi.fn().mockReturnValue({
    hasSymplaTicket: true,
    role: 'PARTICIPANT'
  })
}));

vi.mock('./api', () => ({
  apiRequest: vi.fn()
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    query: vi.fn((coll, ...clauses) => ({ coll, clauses })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    onSnapshot: vi.fn((ref, onNext, _onError) => {
      return vi.fn();
    }),
    doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    setDoc: vi.fn().mockResolvedValue(),
    deleteDoc: vi.fn().mockResolvedValue(),
    updateDoc: vi.fn().mockResolvedValue()
  };
});

describe('activityService (KAN-50)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateActivityStatus', () => {
    it('deve retornar NONE se o usuário não possuir nenhum registro para a atividade', () => {
      const status = calculateActivityStatus('act_1', [], [], []);
      expect(status).toBe('NONE');
    });

    it('deve retornar BOOKED quando o usuário possui booking confirmado', () => {
      const bookings = [{ activityId: 'act_1', status: 'CONFIRMED' }];
      const status = calculateActivityStatus('act_1', bookings, [], []);
      expect(status).toBe('BOOKED');
    });

    it('deve retornar WAITING_LIST quando o usuário está na lista de espera', () => {
      const bookings = [{ activityId: 'act_1', status: 'WAITING_LIST', position: 2 }];
      const status = calculateActivityStatus('act_1', bookings, [], []);
      expect(status).toBe('WAITING_LIST');
    });

    it('deve retornar CHECKED_IN quando o Staff registrou entrada (double-check)', () => {
      const bookings = [{ activityId: 'act_1', status: 'CONFIRMED' }];
      const checkins = [{ activityId: 'act_1', status: 'CHECKED_IN' }];
      const status = calculateActivityStatus('act_1', bookings, checkins, []);
      expect(status).toBe('CHECKED_IN');
    });

    it('deve retornar COMPLETED quando o checkin foi finalizado (COMPLETED)', () => {
      const bookings = [{ activityId: 'act_1', status: 'CONFIRMED' }];
      const checkins = [{ activityId: 'act_1', status: 'COMPLETED' }];
      const status = calculateActivityStatus('act_1', bookings, checkins, []);
      expect(status).toBe('COMPLETED');
    });

    it('deve retornar COMPLETED quando houver evento de ponto registrado para a palestra', () => {
      const pointEvents = [{ referenceId: 'act_1', eventType: 'lecture_attendance' }];
      const status = calculateActivityStatus('act_1', [], [], pointEvents);
      expect(status).toBe('COMPLETED');
    });
  });

  describe('formatActivityType', () => {
    it('formata Palestra com cores e label corretos', () => {
      const formatted = formatActivityType('palestra');
      expect(formatted.label).toBe('Palestra');
      expect(formatted.color).toBe('#8fa0ff');
    });

    it('formata Workshop com cores e label corretos', () => {
      const formatted = formatActivityType('workshop');
      expect(formatted.label).toBe('Workshop');
      expect(formatted.color).toBe('#b9a6f5');
    });

    it('formata Minicurso com cores e label corretos', () => {
      const formatted = formatActivityType('minicurso');
      expect(formatted.label).toBe('Minicurso');
      expect(formatted.color).toBe('#67d4e8');
    });

    it('formata Ativação com cores e label corretos', () => {
      const formatted = formatActivityType('ativacao');
      expect(formatted.label).toBe('Ativação');
      expect(formatted.color).toBe('#f2c46a');
    });
  });

  describe('reserveActivity', () => {
    it('deve chamar POST /activities/:id/reserve via apiRequest', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({
        status: 'CONFIRMED',
        position: null
      });

      const res = await reserveActivity('palestra_abertura');
      expect(apiRequest).toHaveBeenCalledWith('/activities/palestra_abertura/reserve', {
        method: 'POST'
      });
      expect(res.status).toBe('CONFIRMED');
    });

    it('deve acionar fallback resiliente no Firestore se apiRequest falhar com Failed to fetch', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const res = await reserveActivity('palestra_abertura');
      expect(res.success).toBe(true);
      expect(res.status).toBe('CONFIRMED');
      expect(res.bookingId).toBe('test_user_id_palestra_abertura');
    });

    it('deve rejeitar se activityId não for fornecido', async () => {
      await expect(reserveActivity('')).rejects.toThrow('activityId é obrigatório');
    });
  });

  describe('checkoutDoubleCheck', () => {
    it('deve chamar POST /checkin/checkout via apiRequest com token', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        status: 'COMPLETED',
        pointsCredited: 20
      });

      const res = await checkoutDoubleCheck('signed_token_123');
      expect(apiRequest).toHaveBeenCalledWith('/checkin/checkout', {
        method: 'POST',
        body: JSON.stringify({ token: 'signed_token_123' })
      });
      expect(res.pointsCredited).toBe(20);
    });

    it('deve rejeitar se o token estiver vazio', async () => {
      await expect(checkoutDoubleCheck('')).rejects.toThrow('Token do QR Code é obrigatório');
    });
  });

  describe('Listeners e Subscriptions', () => {
    it('subscribeToUserBookings deve chamar onUpdate com array vazio se userId for nulo', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToUserBookings(null, onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToUserCheckins deve chamar onUpdate com array vazio se userId for nulo', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToUserCheckins(null, onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToUserPointEvents deve chamar onUpdate com array vazio se userId for nulo', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToUserPointEvents(null, onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });
  });
});

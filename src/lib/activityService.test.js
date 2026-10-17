import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  subscribeToActivities, 
  subscribeToUserBookings, 
  subscribeToUserCheckins, 
  subscribeToUserPointEvents,
  reserveActivity,
  checkoutDoubleCheck,
  registerActivityAttendance,
  calculateActivityStatus,
  formatActivityType,
  DEFAULT_ACTIVITIES,
  toEpochMillis,
  formatBookingDateTime,
  subscribeToActivityBookings
} from './activityService';
import { apiRequest } from './api';
import { getCachedUserProfile } from './userService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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

    it('deve repassar erro 401 (SESSION_EXPIRED) para a UI orientar nova autenticação (KAN-127)', async () => {
      const err = new Error('Sua sessão expirou ou é inválida. Por favor, faça login novamente para continuar.');
      err.status = 401;
      err.code = 'SESSION_EXPIRED';
      err.data = { error: 'INVALID_TOKEN' };
      vi.mocked(apiRequest).mockRejectedValueOnce(err);

      await expect(reserveActivity('palestra_abertura')).rejects.toMatchObject({
        status: 401,
        code: 'SESSION_EXPIRED'
      });
    });

    it('deve rejeitar se activityId não for fornecido', async () => {
      await expect(reserveActivity('')).rejects.toThrow('activityId é obrigatório');
    });

    it('deve bloquear reserva de atividade exclusiva se o participante não tiver ingresso Sympla', async () => {
      vi.mocked(getCachedUserProfile).mockReturnValueOnce({ hasSymplaTicket: false, role: 'PARTICIPANT' });
      await expect(reserveActivity('act_fechada', { isOpenEvent: false })).rejects.toMatchObject({
        status: 403,
        code: 'SYMPLA_TICKET_REQUIRED'
      });
    });

    it('deve permitir reserva de atividade aberta mesmo se o participante não tiver ingresso Sympla', async () => {
      vi.mocked(getCachedUserProfile).mockReturnValueOnce({ hasSymplaTicket: false, role: 'PARTICIPANT' });
      vi.mocked(apiRequest).mockResolvedValueOnce({
        status: 'CONFIRMED',
        position: null
      });

      const res = await reserveActivity('act_aberta', { isOpenEvent: true });
      expect(res.status).toBe('CONFIRMED');
      expect(apiRequest).toHaveBeenCalledWith('/activities/act_aberta/reserve', {
        method: 'POST'
      });
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

    it('subscribeToUserBookings deve registrar snapshot e mesclar dados locais com remotos do Firestore', () => {
      const mockUnsubSnapshot = vi.fn();
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();

      vi.stubGlobal('window', { addEventListener, removeEventListener });
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => JSON.stringify([{ activityId: 'act_local', title: 'Local' }])),
        setItem: vi.fn()
      });

      onSnapshot.mockImplementationOnce((_q, onNext) => {
        onNext({
          docs: [
            { id: 'book_remote', data: () => ({ activityId: 'act_remote', title: 'Remote' }) }
          ]
        });
        return mockUnsubSnapshot;
      });

      const onUpdate = vi.fn();
      const unsub = subscribeToUserBookings('user_123', onUpdate);

      expect(where).toHaveBeenCalledWith('userId', '==', 'user_123');
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'bookings');
      expect(addEventListener).toHaveBeenCalledWith('techweek_bookings_updated', expect.any(Function));

      // Deve ter sido chamado inicialmente com local, e depois mesclado com snapshot
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ activityId: 'act_local' }),
          expect.objectContaining({ activityId: 'act_remote' })
        ])
      );

      unsub();
      expect(removeEventListener).toHaveBeenCalledWith('techweek_bookings_updated', expect.any(Function));
      expect(mockUnsubSnapshot).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('subscribeToUserBookings deve responder a evento techweek_bookings_updated e propagar erro no listener', () => {
      let windowHandler = null;
      vi.stubGlobal('window', {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'techweek_bookings_updated') windowHandler = handler;
        }),
        removeEventListener: vi.fn()
      });
      vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });

      let errorCallback = null;
      onSnapshot.mockImplementationOnce((_q, _onNext, onError) => {
        errorCallback = onError;
        return vi.fn();
      });

      const onUpdate = vi.fn();
      const onError = vi.fn();
      subscribeToUserBookings('user_123', onUpdate, onError);

      // Simula evento da janela emitido com atualização local
      expect(windowHandler).toBeInstanceOf(Function);
      windowHandler({ detail: { userId: 'user_123', bookings: [{ activityId: 'act_window', status: 'CONFIRMED' }] } });
      expect(onUpdate).toHaveBeenCalledWith([expect.objectContaining({ activityId: 'act_window' })]);

      // Simula erro no Firestore listener
      const firestoreErr = { code: 'unavailable', message: 'Network offline' };
      errorCallback(firestoreErr);
      expect(onError).toHaveBeenCalledWith(firestoreErr);

      vi.unstubAllGlobals();
    });

    it('subscribeToUserCheckins deve chamar onUpdate com array vazio se userId for nulo', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToUserCheckins(null, onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToUserCheckins deve escutar /checkins filtrando por uid do usuário', () => {
      const mockUnsub = vi.fn();
      onSnapshot.mockImplementationOnce((_q, onNext) => {
        onNext({
          docs: [
            { id: 'chk_1', data: () => ({ uid: 'user_123', activityId: 'act_10', status: 'COMPLETED' }) }
          ]
        });
        return mockUnsub;
      });

      const onUpdate = vi.fn();
      const unsub = subscribeToUserCheckins('user_123', onUpdate);

      expect(where).toHaveBeenCalledWith('uid', '==', 'user_123');
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'checkins');
      expect(onUpdate).toHaveBeenCalledWith([
        { id: 'chk_1', uid: 'user_123', activityId: 'act_10', status: 'COMPLETED' }
      ]);
      expect(unsub).toBe(mockUnsub);
    });

    it('subscribeToUserCheckins deve invocar onError e emitir array vazio em caso de falha', () => {
      onSnapshot.mockImplementationOnce((_q, _onNext, onErrorCb) => {
        onErrorCb(new Error('Falha de permissão'));
        return vi.fn();
      });

      const onUpdate = vi.fn();
      const onError = vi.fn();
      subscribeToUserCheckins('user_123', onUpdate, onError);

      expect(onError).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledWith([]);
    });

    it('subscribeToUserPointEvents deve chamar onUpdate com array vazio se userId for nulo', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToUserPointEvents(null, onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToUserPointEvents deve escutar /pointEvents filtrando por userId', () => {
      const mockUnsub = vi.fn();
      onSnapshot.mockImplementationOnce((_q, onNext) => {
        onNext({
          docs: [
            { id: 'pe_1', data: () => ({ userId: 'user_123', points: 30, type: 'CHECKIN' }) }
          ]
        });
        return mockUnsub;
      });

      const onUpdate = vi.fn();
      const unsub = subscribeToUserPointEvents('user_123', onUpdate);

      expect(where).toHaveBeenCalledWith('userId', '==', 'user_123');
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'pointEvents');
      expect(onUpdate).toHaveBeenCalledWith([
        { id: 'pe_1', userId: 'user_123', points: 30, type: 'CHECKIN' }
      ]);
      expect(unsub).toBe(mockUnsub);
    });

    it('subscribeToUserPointEvents deve invocar onError e emitir array vazio em caso de erro', () => {
      onSnapshot.mockImplementationOnce((_q, _onNext, onErrorCb) => {
        onErrorCb(new Error('Erro no firestore'));
        return vi.fn();
      });

      const onUpdate = vi.fn();
      const onError = vi.fn();
      subscribeToUserPointEvents('user_123', onUpdate, onError);

      expect(onError).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledWith([]);
    });
  });

  describe('contadores de vaga ao vivo (KAN-109)', () => {
    it('cópia local da atividade não sobrescreve vagas vindas do Firestore', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const stale = { id: 'act_x', title: 'X', vagas_totais: 10, vagas_disponiveis: 10, total_inscritos: 0, total_espera: 0 };
      vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify([stale]), setItem: vi.fn() });
      onSnapshot.mockImplementationOnce((_ref, onNext) => {
        onNext({ empty: false, docs: [{ id: 'act_x', data: () => ({ ...stale, vagas_disponiveis: 7, total_inscritos: 3 }) }] });
        return vi.fn();
      });
      const onUpdate = vi.fn();
      subscribeToActivities(onUpdate);
      vi.unstubAllGlobals();
      const act = onUpdate.mock.calls.at(-1)[0].find((a) => a.id === 'act_x');
      expect(act.vagas_disponiveis).toBe(7);
      expect(act.total_inscritos).toBe(3);
    });
  });

  describe('registerActivityAttendance', () => {
    it('retorna erro se activityId não for fornecido', async () => {
      const res = await registerActivityAttendance(null);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Identificador da atividade não informado.');
    });

    it('registra presença via sessionToken (double check) com sucesso', async () => {
      apiRequest.mockResolvedValueOnce({
        success: true,
        pointsCredited: 25,
        activityId: 'act_1588971'
      });

      const res = await registerActivityAttendance('act_1588971', 'session_token_123');
      expect(res.success).toBe(true);
      expect(res.points).toBe(25);
      expect(res.mode).toBe('double_check');
      expect(apiRequest).toHaveBeenCalledWith('/checkin/checkout', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'session_token_123' })
      }));
    });

    it('permite ler novamente presença já registrada (409) com sucesso e 0 pontos', async () => {
      const conflictError = new Error('Presença já confirmada');
      conflictError.status = 409;
      conflictError.data = { error: 'CHECKIN_DUPLICATE' };
      apiRequest.mockRejectedValueOnce(conflictError);

      const res = await registerActivityAttendance('act_1588971', 'session_token_123');
      expect(res.success).toBe(true);
      expect(res.points).toBe(0);
      expect(res.alreadyCheckedIn).toBe(true);
    });

    it('identifica exigência de ingresso Sympla (403) adequadamente', async () => {
      const ticketError = new Error('Ingresso Sympla obrigatório');
      ticketError.status = 403;
      ticketError.code = 'SYMPLA_TICKET_REQUIRED';
      ticketError.data = { error: 'SYMPLA_TICKET_REQUIRED' };
      apiRequest.mockRejectedValueOnce(ticketError);

      const res = await registerActivityAttendance('act_1588971', null);
      expect(res.success).toBe(false);
      expect(res.symplaRequired).toBe(true);
    });

    it('registra presença direta por autoatendimento (/activities/:id/checkin)', async () => {
      apiRequest.mockResolvedValueOnce({
        success: true,
        pointsCredited: 20
      });

      const res = await registerActivityAttendance('act_1588971', null);
      expect(res.success).toBe(true);
      expect(res.points).toBe(20);
      expect(res.mode).toBe('self_scan');
    });
  });

  describe('toEpochMillis & formatBookingDateTime', () => {
    it('toEpochMillis lida com datas nos formatos Date, Timestamp, seconds e ISO string', () => {
      const fixedIso = '2026-10-21T14:30:00.000Z';
      const expectedMs = Date.parse(fixedIso);

      expect(toEpochMillis(new Date(fixedIso))).toBe(expectedMs);
      expect(toEpochMillis(fixedIso)).toBe(expectedMs);
      expect(toEpochMillis({ toDate: () => new Date(fixedIso) })).toBe(expectedMs);
      expect(toEpochMillis({ toMillis: () => expectedMs })).toBe(expectedMs);
      expect(toEpochMillis({ seconds: Math.floor(expectedMs / 1000), nanoseconds: 0 })).toBe(Math.floor(expectedMs / 1000) * 1000);
      expect(toEpochMillis(null)).toBe(0);
      expect(toEpochMillis(undefined)).toBe(0);
    });

    it('formatBookingDateTime formata datas de forma amigável em pt-BR', () => {
      const date = new Date(2026, 9, 21, 14, 32, 10);
      const formatted = formatBookingDateTime(date);
      expect(formatted).toBe('21/10 às 14:32');

      const formattedWithSec = formatBookingDateTime(date, { withSeconds: true });
      expect(formattedWithSec).toBe('21/10 às 14:32:10');

      expect(formatBookingDateTime(null)).toBe('Data não registrada');
    });
  });

  describe('subscribeToActivityBookings', () => {
    it('retorna estrutura vazia caso a atividade não seja informada', () => {
      const onUpdate = vi.fn();
      const unsub = subscribeToActivityBookings(null, onUpdate);

      expect(onUpdate).toHaveBeenCalledWith({
        confirmed: [],
        waitingList: [],
        all: [],
        stats: { confirmedCount: 0, waitingCount: 0, checkedInCount: 0 }
      });
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('escuta bookings e checkins, cruzando com usersList e ordenando cronologicamente', () => {
      let bookingsListener = null;
      let checkinsListener = null;

      onSnapshot.mockImplementation((q, onNext) => {
        const collName = q?.coll?.path;
        if (collName === 'bookings') {
          bookingsListener = onNext;
        } else if (collName === 'checkins') {
          checkinsListener = onNext;
        }
        return vi.fn();
      });

      const onUpdate = vi.fn();
      const usersList = [
        {
          uid: 'u_1',
          displayName: 'Mariana Silva',
          username: 'mariana',
          email: 'mariana@ufu.br',
          course: 'Sistemas de Informação',
          period: '6º período',
          hasSymplaTicket: true,
          ticketNumber: 'SYM-123'
        },
        {
          uid: 'u_2',
          displayName: 'Carlos Souza',
          username: 'carlos',
          email: 'carlos@ufu.br',
          course: 'Ciência da Computação',
          hasSymplaTicket: false
        },
        {
          uid: 'u_3',
          displayName: 'Beatriz Lima',
          email: 'beatriz@ufu.br',
          hasSymplaTicket: true
        }
      ];

      const unsub = subscribeToActivityBookings('act_workshop_ia', onUpdate, null, { usersList });

      expect(onSnapshot).toHaveBeenCalled();

      // Simula emissão do Firestore /bookings com 2 confirmados e 1 em fila de espera
      const mockBookingsSnapshot = {
        docs: [
          {
            id: 'b_2',
            data: () => ({
              userId: 'u_2',
              activityId: 'act_workshop_ia',
              status: 'CONFIRMED',
              createdAt: '2026-10-21T10:15:00.000Z'
            })
          },
          {
            id: 'b_1',
            data: () => ({
              userId: 'u_1',
              activityId: 'act_workshop_ia',
              status: 'CONFIRMED',
              createdAt: '2026-10-21T10:00:00.000Z'
            })
          },
          {
            id: 'b_3',
            data: () => ({
              userId: 'u_3',
              activityId: 'act_workshop_ia',
              status: 'WAITING_LIST',
              position: 1,
              createdAt: '2026-10-21T10:30:00.000Z'
            })
          }
        ]
      };

      bookingsListener(mockBookingsSnapshot);

      expect(onUpdate).toHaveBeenCalled();
      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];

      // Confirmados devem vir ordenados cronologicamente: u_1 (10:00) depois u_2 (10:15)
      expect(lastCall.confirmed).toHaveLength(2);
      expect(lastCall.confirmed[0].userId).toBe('u_1');
      expect(lastCall.confirmed[0].rank).toBe(1);
      expect(lastCall.confirmed[0].rankLabel).toBe('1º');
      expect(lastCall.confirmed[0].fullName).toBe('Mariana Silva');
      expect(lastCall.confirmed[0].hasSymplaTicket).toBe(true);

      expect(lastCall.confirmed[1].userId).toBe('u_2');
      expect(lastCall.confirmed[1].rank).toBe(2);
      expect(lastCall.confirmed[1].rankLabel).toBe('2º');

      // Fila de espera
      expect(lastCall.waitingList).toHaveLength(1);
      expect(lastCall.waitingList[0].userId).toBe('u_3');
      expect(lastCall.waitingList[0].rankLabel).toBe('1º da fila');

      // Simula checkin presencial emitido para u_1
      const mockCheckinsSnapshot = {
        docs: [
          {
            id: 'u_1_act_workshop_ia',
            data: () => ({
              uid: 'u_1',
              activityId: 'act_workshop_ia',
              status: 'CHECKED_IN',
              entranceAt: '2026-10-21T13:55:00.000Z'
            })
          }
        ]
      };

      checkinsListener(mockCheckinsSnapshot);

      const updatedCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
      expect(updatedCall.confirmed[0].checkedIn).toBe(true);
      expect(updatedCall.confirmed[0].checkedInAtFormatted).toContain('10:55');
      expect(updatedCall.confirmed[1].checkedIn).toBe(false);
      expect(updatedCall.stats.checkedInCount).toBe(1);

      unsub();
    });
  });
});


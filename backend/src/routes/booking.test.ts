import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const { mockMessagingSend } = vi.hoisted(() => ({
  mockMessagingSend: vi.fn().mockResolvedValue('fcm-msg-1')
}));

vi.mock('../config/firebaseAdmin', () => {
  const adminMock = {
    messaging: vi.fn(() => ({
      send: mockMessagingSend
    }))
  };
  return {
    default: adminMock,
    admin: adminMock,
    db: {
      collection: vi.fn(),
      runTransaction: vi.fn()
    }
  };
});

vi.mock('../services/webPushService', () => ({
  sendWebPushToSubscription: vi.fn().mockResolvedValue({ ok: true })
}));

import router, {
  DEFAULT_ACTIVITIES_CATALOG,
  processExpiredWaitingBookings,
  calculateConfirmationDeadline,
  EVENT_DAY_TTL_MS,
  PRE_EVENT_TTL_MS
} from './booking';
import { db } from '../config/firebaseAdmin';
import { sendWebPushToSubscription } from '../services/webPushService';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { requireSymplaTicket, requireVerifiedEmail } from '../middlewares/authMiddleware';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(activityId = 'lecture-1', uid = 'user-1') {
  return { params: { activityId }, user: { uid, role: 'PARTICIPANT', emailVerified: true } } as unknown as Request;
}

// booking.ts só exporta o router default (sem handler nomeado, diferente de
// auth.ts) e o projeto não tem supertest instalado. Em vez de adicionar uma
// dependência nova só pra isso, extrai o handler direto do stack da rota —
// mesma ideia de chamar middleware direto que já aparece em
// authMiddleware.test.ts, só que pra rota em vez de middleware isolado.
function getRouteHandler(path: string, method: 'post' | 'delete' = 'post') {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method]
  );
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

const handler = getRouteHandler('/:activityId/reserve', 'post');

// KAN-75: prova que o rate limiter está montado na rota real (não só que a
// função do limiter funciona isolada, ver rateLimiter.test.ts).
it('KAN-75: participantActionLimiter está montado na rota real, antes do handler final', () => {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve'
  );
  const handles = layer.route.stack.map((l: any) => l.handle);
  expect(handles).toContain(participantActionLimiter);
  expect(handles.indexOf(participantActionLimiter)).toBeLessThan(handles.length - 1);
});

// OPEN-EVENTS: prova que a rota avalia requireSymplaTicket dinamicamente para não bloquear eventos abertos
it('OPEN-EVENTS: requireSymplaTicket não está como middleware estático bloqueando reservas abertas', () => {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve'
  );
  const handles = layer.route.stack.map((l: any) => l.handle);
  expect(handles).not.toContain(requireSymplaTicket);
});

// KAN-116: prova que requireVerifiedEmail está montado nas rotas reais de reserva e cancelamento
it('KAN-116: requireVerifiedEmail está montado na rota de reserva e cancelamento, antes do handler final', () => {
  const reserveLayer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve' && l.route?.methods?.post
  );
  const reserveHandles = reserveLayer.route.stack.map((l: any) => l.handle);
  expect(reserveHandles).toContain(requireVerifiedEmail);
  expect(reserveHandles.indexOf(requireVerifiedEmail)).toBeLessThan(reserveHandles.length - 1);

  const deleteLayer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve' && l.route?.methods?.delete
  );
  const deleteHandles = deleteLayer.route.stack.map((l: any) => l.handle);
  expect(deleteHandles).toContain(requireVerifiedEmail);

  const cancelLayer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/cancel' && l.route?.methods?.post
  );
  const cancelHandles = cancelLayer.route.stack.map((l: any) => l.handle);
  expect(cancelHandles).toContain(requireVerifiedEmail);
});

const mockNotificationsSet = vi.fn().mockResolvedValue(undefined);
const mockUserDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({ fcmTokens: ['fcm-token-abc'] })
});
const mockPushSubsGet = vi.fn().mockResolvedValue({
  empty: false,
  docs: [
    {
      ref: { path: 'push_subscriptions/sub-1', delete: vi.fn() },
      data: () => ({
        endpoint: 'https://push.example.com/sub-1',
        keys: { p256dh: 'k1', auth: 'k2' }
      })
    }
  ]
});

function makeQueryMock(name: string, getImpl?: () => Promise<any>) {
  const q: any = {
    __kind: `${name}Query`,
    where: vi.fn(() => q),
    orderBy: vi.fn(() => q),
    limit: vi.fn(() => q),
    get: vi.fn(getImpl ?? (() => Promise.resolve({ empty: true, docs: [] })))
  };
  return q;
}

function mockCollection(name: string) {
  const q = makeQueryMock(
    name,
    name === 'push_subscriptions' ? () => mockPushSubsGet() : undefined
  );
  return {
    doc: (id: string) => {
      if (name === 'users') return { path: `${name}/${id}`, get: mockUserDocGet };
      if (name === 'notifications') return { path: `${name}/${id}`, set: mockNotificationsSet };
      return { path: `${name}/${id}` };
    },
    where: q.where,
    orderBy: q.orderBy,
    limit: q.limit,
    get: q.get,
    __kind: q.__kind
  };
}

function makeTx(snaps: { bookingSnap: any; activitySnap: any; waitingSnap?: any; userSnap?: any }) {
  const { bookingSnap, activitySnap, waitingSnap, userSnap } = snaps;
  return {
    get: vi.fn((ref: any) => {
      if (ref?.__kind === 'bookingsQuery') {
        return Promise.resolve(waitingSnap ?? { empty: true, docs: [] });
      }
      if (ref?.path?.startsWith('bookings/')) return Promise.resolve(bookingSnap);
      if (ref?.path?.startsWith('activities/')) return Promise.resolve(activitySnap);
      if (ref?.path?.startsWith('users/')) return Promise.resolve(userSnap ?? { exists: true, data: () => ({ hasSymplaTicket: true }) });
      throw new Error(`ref inesperada no mock: ${JSON.stringify(ref)}`);
    }),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

describe('POST /:activityId/reserve (KAN-49)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation(mockCollection);
  });

  it('reserva com vaga disponível: 200 CONFIRMED, decrementa vagas e incrementa total_inscritos', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 3, total_inscritos: 7 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { vagas_disponiveis: 2, total_inscritos: 8 }
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      expect.objectContaining({
        userId: 'user-1',
        activityId: 'lecture-1',
        status: 'CONFIRMED',
        position: null,
        createdAt: expect.any(Date)
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'CONFIRMED', position: null });
  });

  it('reserva sem vaga (vagas_disponiveis = 0): 200 WAITING_LIST, posição = total_espera+1, vagas não muda', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0, total_espera: 4 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    // toHaveBeenCalledWith exige igualdade exata do objeto — se o código
    // também mexesse em vagas_disponiveis aqui, este assert quebraria.
    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 5, waiting_seq: 5 });
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      expect.objectContaining({ status: 'WAITING_LIST', position: 5 })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 5 });
  });

  it('reserva sem vaga após promoções/cancelamentos na fila: usa waiting_seq monotônico para evitar colisão de position e furar fila FIFO', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0, total_espera: 1, waiting_seq: 3 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 2, waiting_seq: 4 });
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      expect.objectContaining({ status: 'WAITING_LIST', position: 4 })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 4 });
  });

  it('vagas_disponiveis negativo (dado corrompido) também cai na lista de espera, sem decrementar', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: -2, total_espera: 0 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 1, waiting_seq: 1 });
    expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 1 });
  });

  it('reserva repetida: 200 alreadyBooked com o status já salvo, sem tocar a transação de novo', async () => {
    const tx = makeTx({
      bookingSnap: { exists: true, data: () => ({ status: 'WAITING_LIST', position: 3 }) },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 5 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 3, alreadyBooked: true });
  });

  it('activityId inválido (ex: path traversal via %2F): 400 antes de tocar o Firestore', async () => {
    const req = makeReq('x/y');
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_ACTIVITY_ID' }));
  });

  it('atividade inexistente: 404 ACTIVITY_NOT_FOUND', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACTIVITY_NOT_FOUND' }));
  });

  it('ERR-071: auto-seed de atividade do DEFAULT_ACTIVITIES_CATALOG com vagas cria atividade e confirma reserva (200 CONFIRMED)', async () => {
    const activityId = 'palestra_abertura';
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq(activityId);
    const res = makeRes();
    await handler(req, res);

    const defaultCatalogItem = DEFAULT_ACTIVITIES_CATALOG[activityId];
    expect(tx.set).toHaveBeenCalledWith(
      { path: `activities/${activityId}` },
      expect.objectContaining({
        ...defaultCatalogItem,
        vagas_disponiveis: defaultCatalogItem.vagas_disponiveis - 1,
        total_inscritos: defaultCatalogItem.total_inscritos + 1,
        createdAt: expect.any(Date)
      })
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: `bookings/user-1_${activityId}` },
      expect.objectContaining({
        userId: 'user-1',
        activityId,
        status: 'CONFIRMED',
        position: null,
        createdAt: expect.any(Date)
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'CONFIRMED', position: null });
  });

  it('ERR-071: auto-seed de atividade do catálogo com zero vagas cria atividade com total_espera: 1 e reserva WAITING_LIST (200 WAITING_LIST)', async () => {
    const activityId = 'workshop_esgotado_seed';
    DEFAULT_ACTIVITIES_CATALOG[activityId] = {
      title: 'Workshop Esgotado',
      description: 'Workshop de teste esgotado',
      speaker: 'Instrutor',
      type: 'workshop',
      day: '20/10',
      date: '2026-10-20',
      time: '14:00',
      location: 'Lab 1',
      vagas_disponiveis: 0,
      vagas_totais: 30,
      total_inscritos: 30,
      total_espera: 0,
      points: 25,
      attendanceMode: 'SELF_SCAN'
    };

    try {
      const tx = makeTx({
        bookingSnap: { exists: false },
        activitySnap: { exists: false }
      });
      (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

      const req = makeReq(activityId);
      const res = makeRes();
      await handler(req, res);

      expect(tx.set).toHaveBeenCalledWith(
        { path: `activities/${activityId}` },
        expect.objectContaining({
          ...DEFAULT_ACTIVITIES_CATALOG[activityId],
          total_espera: 1,
          createdAt: expect.any(Date)
        })
      );
      expect(tx.set).toHaveBeenCalledWith(
        { path: `bookings/user-1_${activityId}` },
        expect.objectContaining({
          userId: 'user-1',
          activityId,
          status: 'WAITING_LIST',
          position: 1,
          createdAt: expect.any(Date)
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 1 });
    } finally {
      delete DEFAULT_ACTIVITIES_CATALOG[activityId];
    }
  });

  it('erro inesperado do Firestore dentro da transação: 500 INTERNAL_ERROR, sem vazar detalhe do erro', async () => {
    (db.runTransaction as any).mockRejectedValue(new Error('boom - detalhe interno do Firestore'));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    // Igualdade exata (não objectContaining): garante que nenhum campo extra
    // com stack/mensagem crua do erro vaza na resposta.
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível processar a reserva.'
    });
  });

  it('bloqueia com 403 SYMPLA_TICKET_REQUIRED para atividade fechada quando participante não tem ingresso Sympla', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 10, total_inscritos: 2, isOpenEvent: false }) },
      userSnap: { exists: true, data: () => ({ hasSymplaTicket: false }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'SYMPLA_TICKET_REQUIRED',
      message: 'É necessário possuir um ingresso oficial do Sympla vinculado à conta para realizar esta ação.'
    });
    expect(tx.set).not.toHaveBeenCalled();
  });

  it('permite reserva com 200 CONFIRMED em evento aberto (isOpenEvent: true) mesmo se o participante não tiver ingresso Sympla', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 10, total_inscritos: 2, isOpenEvent: true }) },
      userSnap: { exists: true, data: () => ({ hasSymplaTicket: false }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'CONFIRMED', position: null });
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      expect.objectContaining({ status: 'CONFIRMED' })
    );
  });

  it('permite reserva para usuário ADMIN em atividade fechada mesmo sem doc de usuário com ingresso Sympla', async () => {
    const tx = makeTx({
      bookingSnap: { exists: false },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 10, total_inscritos: 2, isOpenEvent: false }) },
      userSnap: { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq();
    req.user!.role = 'ADMIN';
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'CONFIRMED', position: null });
  });
});

describe('POST /:activityId/cancel (KAN-110 + Promoção WAITING_CONFIRMATION)', () => {
  const cancel = getRouteHandler('/:activityId/cancel', 'post');

  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation(mockCollection);
  });

  it('cancelar reserva confirmada devolve a vaga quando não há fila de espera', async () => {
    const tx = makeTx({
      bookingSnap: { exists: true, data: () => ({ status: 'CONFIRMED' }) },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 2, total_inscritos: 8, total_espera: 0 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const res = makeRes();
    await cancel(makeReq(), res);

    expect(tx.delete).toHaveBeenCalledWith({ path: 'bookings/user-1_lecture-1' });
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { vagas_disponiveis: 3, total_inscritos: 7 }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('ERR-070: cancelar reserva confirmada quando há fila de espera promove o 1º da fila (WAITING_LIST -> WAITING_CONFIRMATION) com TTL e dispara notificações FCM + In-App', async () => {
    const promotedDocRef = { path: 'bookings/waiting-user-1_lecture-1' };
    const waitingSnap = {
      empty: false,
      docs: [
        {
          ref: promotedDocRef,
          data: () => ({ userId: 'waiting-user-1', activityId: 'lecture-1', status: 'WAITING_LIST', position: 1 })
        }
      ]
    };

    const tx = makeTx({
      bookingSnap: { exists: true, data: () => ({ status: 'CONFIRMED' }) },
      activitySnap: {
        exists: true,
        data: () => ({
          title: 'Palestra de IA',
          vagas_disponiveis: 0,
          total_inscritos: 10,
          total_espera: 2
        })
      },
      waitingSnap
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const res = makeRes();
    await cancel(makeReq(), res);

    expect(tx.delete).toHaveBeenCalledWith({ path: 'bookings/user-1_lecture-1' });
    expect(tx.update).toHaveBeenCalledWith(
      promotedDocRef,
      expect.objectContaining({
        status: 'WAITING_CONFIRMATION',
        confirmationDeadline: expect.any(Date),
        notifiedAt: expect.any(Date)
      })
    );
    // Retém a vaga (vagas_disponiveis continua 0) e decrementa total_inscritos
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { total_inscritos: 9 }
    );
    // Dispara registro no feed de notificações + FCM + Web Push
    expect(mockNotificationsSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'waiting-user-1',
        activityId: 'lecture-1',
        type: 'WAITING_CONFIRMATION',
        body: expect.stringContaining('Uma vaga abriu para Palestra de IA!')
      })
    );
    expect(mockMessagingSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fcm-token-abc',
        notification: expect.objectContaining({
          body: expect.stringContaining('Uma vaga abriu para Palestra de IA!')
        })
      })
    );
    expect(sendWebPushToSubscription).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Reserva cancelada com sucesso.' });
  });

  it('ERR-070: se total_espera > 0 mas fila estiver vazia no Firestore, faz fallback liberando a vaga', async () => {
    const tx = makeTx({
      bookingSnap: { exists: true, data: () => ({ status: 'CONFIRMED' }) },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0, total_inscritos: 10, total_espera: 1 }) },
      waitingSnap: { empty: true, docs: [] }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const res = makeRes();
    await cancel(makeReq(), res);

    expect(tx.delete).toHaveBeenCalledWith({ path: 'bookings/user-1_lecture-1' });
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { vagas_disponiveis: 1, total_inscritos: 9 }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('sair da lista de espera diminui total_espera e não mexe nas vagas', async () => {
    const tx = makeTx({
      bookingSnap: { exists: true, data: () => ({ status: 'WAITING_LIST' }) },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0, total_espera: 3 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const res = makeRes();
    await cancel(makeReq(), res);

    expect(tx.delete).toHaveBeenCalledWith({ path: 'bookings/user-1_lecture-1' });
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 2 });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('POST /:activityId/confirm-waiting & /:activityId/decline-waiting', () => {
  const confirmWaiting = getRouteHandler('/:activityId/confirm-waiting', 'post');
  const declineWaiting = getRouteHandler('/:activityId/decline-waiting', 'post');

  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation(mockCollection);
  });

  it('confirmação dentro do prazo: altera WAITING_CONFIRMATION -> CONFIRMED, remove confirmationDeadline, incrementa total_inscritos e decrementa total_espera', async () => {
    const futureDeadline = new Date(Date.now() + 60 * 60 * 1000);
    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'user-1',
          activityId: 'lecture-1',
          status: 'WAITING_CONFIRMATION',
          position: 1,
          confirmationDeadline: futureDeadline
        })
      },
      activitySnap: {
        exists: true,
        data: () => ({ vagas_disponiveis: 0, total_inscritos: 9, total_espera: 2 })
      }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const res = makeRes();
    await confirmWaiting(makeReq('lecture-1', 'user-1'), res);

    expect(tx.update).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      {
        status: 'CONFIRMED',
        position: null,
        confirmationDeadline: null,
        confirmedAt: expect.any(Date)
      }
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { total_inscritos: 10, total_espera: 1 }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMED', position: null })
    );
  });

  it('rejeita confirmação após o deadline (410 CONFIRMATION_EXPIRED) sem conceder a vaga', async () => {
    const pastDeadline = new Date(Date.now() - 5 * 60 * 1000);
    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'user-1',
          activityId: 'lecture-1',
          status: 'WAITING_CONFIRMATION',
          position: 1,
          confirmationDeadline: pastDeadline
        })
      },
      activitySnap: {
        exists: true,
        data: () => ({ vagas_disponiveis: 0, total_inscritos: 9, total_espera: 2 })
      }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const res = makeRes();
    await confirmWaiting(makeReq('lecture-1', 'user-1'), res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'CONFIRMATION_EXPIRED' })
    );
  });

  it('rejeita confirmação quando o booking já foi marcado como EXPIRED pelo job (410 CONFIRMATION_EXPIRED)', async () => {
    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'user-1',
          activityId: 'lecture-1',
          status: 'EXPIRED',
          position: null
        })
      },
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const res = makeRes();
    await confirmWaiting(makeReq('lecture-1', 'user-1'), res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'CONFIRMATION_EXPIRED' })
    );
  });

  it('concorrência/corrida: garante que apenas o usuário em WAITING_CONFIRMATION consiga a vaga (usuário em WAITING_LIST recebe 409 e chamada concorrente duplicada não duplica vaga)', async () => {
    const futureDeadline = new Date(Date.now() + 60 * 60 * 1000);
    // Estado mutável em memória simulando o Firestore sob concorrência:
    // user-promoted está em WAITING_CONFIRMATION; user-waiting-2 ainda está em WAITING_LIST (posição 2).
    const bookingsState: Record<string, any> = {
      'bookings/user-promoted_lecture-1': {
        userId: 'user-promoted',
        activityId: 'lecture-1',
        status: 'WAITING_CONFIRMATION',
        position: 1,
        confirmationDeadline: futureDeadline
      },
      'bookings/user-waiting-2_lecture-1': {
        userId: 'user-waiting-2',
        activityId: 'lecture-1',
        status: 'WAITING_LIST',
        position: 2
      }
    };
    const activityState = { vagas_disponiveis: 0, total_inscritos: 9, total_espera: 2 };

    (db.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn(async (ref: any) => {
          if (ref.path === 'activities/lecture-1') {
            return { exists: true, data: () => ({ ...activityState }) };
          }
          const b = bookingsState[ref.path];
          return b ? { exists: true, data: () => ({ ...b }) } : { exists: false };
        }),
        update: vi.fn((ref: any, patch: any) => {
          if (ref.path === 'activities/lecture-1') {
            Object.assign(activityState, patch);
          } else if (bookingsState[ref.path]) {
            Object.assign(bookingsState[ref.path], patch);
          }
        })
      };
      return cb(tx);
    });

    const resWaiting2 = makeRes();
    const resPromoted1 = makeRes();
    const resPromotedDuplicate = makeRes();

    await Promise.all([
      confirmWaiting(makeReq('lecture-1', 'user-waiting-2'), resWaiting2),
      confirmWaiting(makeReq('lecture-1', 'user-promoted'), resPromoted1),
      confirmWaiting(makeReq('lecture-1', 'user-promoted'), resPromotedDuplicate)
    ]);

    // O participante que ainda estava em WAITING_LIST é barrado com 409
    expect(resWaiting2.status).toHaveBeenCalledWith(409);
    expect(resWaiting2.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'INVALID_BOOKING_STATUS' })
    );

    // Exatamente uma das duas requisições de user-promoted confirma (200) e a segunda recebe 409
    const statuses = [
      (resPromoted1.status as any).mock.calls[0][0],
      (resPromotedDuplicate.status as any).mock.calls[0][0]
    ].sort();
    expect(statuses).toEqual([200, 409]);

    // Invariante de assentos preservada: apenas +1 inscrito e -1 na espera
    expect(activityState.total_inscritos).toBe(10);
    expect(activityState.total_espera).toBe(1);
    expect(bookingsState['bookings/user-promoted_lecture-1'].status).toBe('CONFIRMED');
    expect(bookingsState['bookings/user-waiting-2_lecture-1'].status).toBe('WAITING_LIST');
  });

  it('recusa voluntária (decline-waiting): altera status para CANCELLED e promove imediatamente o próximo da WAITING_LIST para WAITING_CONFIRMATION', async () => {
    const nextDocRef = { path: 'bookings/user-next_lecture-1' };
    const waitingSnap = {
      empty: false,
      docs: [
        {
          ref: nextDocRef,
          data: () => ({
            userId: 'user-next',
            activityId: 'lecture-1',
            status: 'WAITING_LIST',
            position: 2
          })
        }
      ]
    };

    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'user-1',
          activityId: 'lecture-1',
          status: 'WAITING_CONFIRMATION',
          position: 1
        })
      },
      activitySnap: {
        exists: true,
        data: () => ({
          title: 'Workshop Cloud',
          vagas_disponiveis: 0,
          total_inscritos: 9,
          total_espera: 2
        })
      },
      waitingSnap
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const res = makeRes();
    await declineWaiting(makeReq('lecture-1', 'user-1'), res);

    expect(tx.update).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      {
        status: 'CANCELLED',
        position: null,
        confirmationDeadline: null,
        cancelledAt: expect.any(Date)
      }
    );
    expect(tx.update).toHaveBeenCalledWith(
      nextDocRef,
      expect.objectContaining({
        status: 'WAITING_CONFIRMATION',
        confirmationDeadline: expect.any(Date),
        notifiedAt: expect.any(Date)
      })
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { total_espera: 1 }
    );
    expect(mockNotificationsSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-next',
        activityId: 'lecture-1',
        type: 'WAITING_CONFIRMATION'
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED' })
    );
  });

  it('recusa voluntária (decline-waiting) sem mais ninguém na fila devolve a vaga para vagas_disponiveis', async () => {
    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'user-1',
          activityId: 'lecture-1',
          status: 'WAITING_CONFIRMATION',
          position: 1
        })
      },
      activitySnap: {
        exists: true,
        data: () => ({
          vagas_disponiveis: 0,
          total_inscritos: 9,
          total_espera: 1
        })
      },
      waitingSnap: { empty: true, docs: [] }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const res = makeRes();
    await declineWaiting(makeReq('lecture-1', 'user-1'), res);

    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { vagas_disponiveis: 1, total_espera: 0 }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('processExpiredWaitingBookings (Scheduler / Timeout Job)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expira bookings com confirmationDeadline < now, marca como EXPIRED e promove o próximo da WAITING_LIST', async () => {
    const now = new Date('2026-10-20T15:00:00.000Z');
    const expiredDeadline = new Date('2026-10-20T14:00:00.000Z');
    const expiredBookingRef = { path: 'bookings/expired-user_lecture-1' };
    const nextBookingRef = { path: 'bookings/next-user_lecture-1' };

    const expiredQuerySnap = {
      empty: false,
      docs: [
        {
          id: 'expired-user_lecture-1',
          ref: expiredBookingRef,
          data: () => ({
            userId: 'expired-user',
            activityId: 'lecture-1',
            status: 'WAITING_CONFIRMATION',
            confirmationDeadline: expiredDeadline
          })
        }
      ]
    };

    const waitingSnap = {
      empty: false,
      docs: [
        {
          ref: nextBookingRef,
          data: () => ({
            userId: 'next-user',
            activityId: 'lecture-1',
            status: 'WAITING_LIST',
            position: 2
          })
        }
      ]
    };

    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'bookings') {
        const q = makeQueryMock('bookings', () => Promise.resolve(expiredQuerySnap));
        return {
          doc: (id: string) => ({ path: `bookings/${id}` }),
          where: q.where,
          orderBy: q.orderBy,
          limit: q.limit,
          get: q.get,
          __kind: q.__kind
        };
      }
      return mockCollection(name);
    });

    const tx = makeTx({
      bookingSnap: {
        exists: true,
        data: () => ({
          userId: 'expired-user',
          activityId: 'lecture-1',
          status: 'WAITING_CONFIRMATION',
          confirmationDeadline: expiredDeadline
        })
      },
      activitySnap: {
        exists: true,
        data: () => ({
          title: 'Palestra Magna',
          date: '2026-10-20',
          vagas_disponiveis: 0,
          total_inscritos: 9,
          total_espera: 2
        })
      },
      waitingSnap
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const stats = await processExpiredWaitingBookings(now);

    expect(stats).toEqual({ expiredCount: 1, promotedCount: 1 });
    expect(tx.update).toHaveBeenCalledWith(expiredBookingRef, {
      status: 'EXPIRED',
      position: null,
      confirmationDeadline: null,
      expiredAt: now
    });
    expect(tx.update).toHaveBeenCalledWith(
      nextBookingRef,
      expect.objectContaining({
        status: 'WAITING_CONFIRMATION',
        confirmationDeadline: expect.any(Date),
        notifiedAt: now
      })
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { total_espera: 1 }
    );
    expect(mockNotificationsSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'next-user',
        activityId: 'lecture-1',
        type: 'WAITING_CONFIRMATION'
      })
    );
  });

  it('calculateConfirmationDeadline aplica 2h durante o dia do evento e 12h antes do evento', () => {
    const nowOnEventDay = new Date('2026-10-20T12:00:00.000Z');
    const deadlineEventDay = calculateConfirmationDeadline({ date: '2026-10-20' }, nowOnEventDay);
    expect(deadlineEventDay.getTime() - nowOnEventDay.getTime()).toBe(EVENT_DAY_TTL_MS);

    const nowPreEvent = new Date('2026-10-15T12:00:00.000Z');
    const deadlinePreEvent = calculateConfirmationDeadline({ date: '2026-10-20' }, nowPreEvent);
    expect(deadlinePreEvent.getTime() - nowPreEvent.getTime()).toBe(PRE_EVENT_TTL_MS);
  });
});


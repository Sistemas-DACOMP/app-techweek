import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import router, { DEFAULT_ACTIVITIES_CATALOG } from './booking';
import { db } from '../config/firebaseAdmin';
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
function getReserveHandler() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve'
  );
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

const handler = getReserveHandler();

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

// KAN-84: prova que requireSymplaTicket está montado na rota real, antes do handler final
it('KAN-84: requireSymplaTicket está montado na rota real, antes do handler final', () => {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/reserve'
  );
  const handles = layer.route.stack.map((l: any) => l.handle);
  expect(handles).toContain(requireSymplaTicket);
  expect(handles.indexOf(requireSymplaTicket)).toBeLessThan(handles.length - 1);
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

function makeQueryMock(name: string) {
  const q: any = {
    __kind: `${name}Query`,
    where: vi.fn(() => q),
    orderBy: vi.fn(() => q),
    limit: vi.fn(() => q)
  };
  return q;
}

function mockCollection(name: string) {
  const q = makeQueryMock(name);
  return {
    doc: (id: string) => ({ path: `${name}/${id}` }),
    where: q.where,
    orderBy: q.orderBy,
    limit: q.limit,
    __kind: q.__kind
  };
}

function makeTx(snaps: { bookingSnap: any; activitySnap: any; waitingSnap?: any }) {
  const { bookingSnap, activitySnap, waitingSnap } = snaps;
  return {
    get: vi.fn((ref: any) => {
      if (ref?.__kind === 'bookingsQuery') {
        return Promise.resolve(waitingSnap ?? { empty: true, docs: [] });
      }
      if (ref?.path?.startsWith('bookings/')) return Promise.resolve(bookingSnap);
      if (ref?.path?.startsWith('activities/')) return Promise.resolve(activitySnap);
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
    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 5 });
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'bookings/user-1_lecture-1' },
      expect.objectContaining({ status: 'WAITING_LIST', position: 5 })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'WAITING_LIST', position: 5 });
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

    expect(tx.update).toHaveBeenCalledWith({ path: 'activities/lecture-1' }, { total_espera: 1 });
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
});

function getCancelHandler() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/cancel'
  );
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

describe('POST /:activityId/cancel (KAN-110)', () => {
  const cancel = getCancelHandler();

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

  it('ERR-070: cancelar reserva confirmada quando há fila de espera: promove o 1º da fila (WAITING_LIST -> CONFIRMED), decrementa total_espera e não altera vagas_disponiveis', async () => {
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
      activitySnap: { exists: true, data: () => ({ vagas_disponiveis: 0, total_inscritos: 10, total_espera: 2 }) },
      waitingSnap
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const res = makeRes();
    await cancel(makeReq(), res);

    expect(tx.delete).toHaveBeenCalledWith({ path: 'bookings/user-1_lecture-1' });
    expect(tx.update).toHaveBeenCalledWith(
      promotedDocRef,
      expect.objectContaining({
        status: 'CONFIRMED',
        position: null,
        promotedAt: expect.any(Date)
      })
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'activities/lecture-1' },
      { total_espera: 1 }
    );
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

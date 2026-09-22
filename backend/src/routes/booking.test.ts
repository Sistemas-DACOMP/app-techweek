import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import router from './booking';
import { db } from '../config/firebaseAdmin';
import { participantActionLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(activityId = 'lecture-1', uid = 'user-1') {
  return { params: { activityId }, user: { uid } } as unknown as Request;
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

function makeTx(snaps: { bookingSnap: any; activitySnap: any }) {
  const { bookingSnap, activitySnap } = snaps;
  return {
    get: vi.fn((ref: { path: string }) => {
      if (ref.path.startsWith('bookings/')) return Promise.resolve(bookingSnap);
      if (ref.path.startsWith('activities/')) return Promise.resolve(activitySnap);
      throw new Error(`ref inesperada no mock: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /:activityId/reserve (KAN-49)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
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

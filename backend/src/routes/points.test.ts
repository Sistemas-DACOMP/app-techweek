import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import router from './points';
import { db } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(body: any = {}, uid = 'user-1') {
  return { body, user: { uid } } as unknown as Request;
}

// points.ts só exporta o router default — mesma técnica de booking.test.ts:
// extrai o handler direto do stack da rota em vez de instalar supertest.
function getClaimHandler() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/claim'
  );
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

const handler = getClaimHandler();

function makeTx(snaps: { eventSnap: any; userSnap: any }) {
  const { eventSnap, userSnap } = snaps;
  return {
    get: vi.fn((ref: { path: string }) => {
      if (ref.path.includes('/point_events/')) return Promise.resolve(eventSnap);
      if (ref.path.startsWith('users/')) return Promise.resolve(userSnap);
      throw new Error(`ref inesperada no mock: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /api/points/claim (KAN-79)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({
        path: `${name}/${id}`,
        collection: (subName: string) => ({
          doc: (subId: string) => ({ path: `${name}/${id}/${subName}/${subId}` })
        })
      })
    }));
  });

  it('credita pontos: grava o evento na subcollection e incrementa totalPoints na mesma transação', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points: 50 });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).toHaveBeenCalledWith(
      { path: 'users/user-1/point_events/mission_m1' },
      expect.objectContaining({ eventType: 'mission', referenceId: 'm1', points: 50 })
    );
    expect(tx.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1' }),
      expect.objectContaining({ totalPoints: expect.anything() })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, points: 50 });
  });

  it.each([
    [{ eventType: '', referenceId: 'r1', points: 10 }],
    [{ referenceId: 'r1', points: 10 }],
    [{ eventType: 'mission', referenceId: '', points: 10 }],
    [{ eventType: 'mission', points: 10 }]
  ])('eventType/referenceId ausente ou vazio (%o): 400 INVALID_PAYLOAD sem tocar a transação', async (body) => {
    const req = makeReq(body);
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it.each([
    [-1],
    [1001],
    ['dez'],
    [NaN],
    [Infinity]
  ])('points inválido (%p): 400 INVALID_PAYLOAD sem tocar a transação', async (points) => {
    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points });
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('evento já resgatado: 200 alreadyClaimed, sem gravar/incrementar de novo', async () => {
    const tx = makeTx({
      eventSnap: { exists: true },
      userSnap: { exists: true }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points: 50 });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: false, alreadyClaimed: true });
  });

  it('usuário sem doc em /users/{uid}: 404 PARTICIPANT_NOT_FOUND', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points: 50 });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'PARTICIPANT_NOT_FOUND' }));
  });

  it('erro inesperado do Firestore: 500 INTERNAL_ERROR sem vazar detalhe', async () => {
    (db.runTransaction as any).mockRejectedValue(new Error('boom - detalhe interno do Firestore'));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points: 50 });
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar os pontos.'
    });
  });
});

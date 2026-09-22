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

function makeTx(snaps: { eventSnap: any; userSnap: any; missionSnap?: any }) {
  const { eventSnap, userSnap, missionSnap = { exists: true, data: () => ({ points: 50 }) } } = snaps;
  return {
    get: vi.fn((ref: { path: string }) => {
      if (ref.path.includes('/point_events/')) return Promise.resolve(eventSnap);
      if (ref.path.startsWith('missions/')) return Promise.resolve(missionSnap);
      if (ref.path.startsWith('users/')) return Promise.resolve(userSnap);
      throw new Error(`ref inesperada no mock: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /api/points/claim (KAN-79, KAN-80)', () => {
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

  it('credita pontos do catálogo (ignora points do body): grava o evento e incrementa totalPoints na mesma transação', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true },
      missionSnap: { exists: true, data: () => ({ points: 50 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    // points: 999999 no body é ignorado — o crédito real vem do catálogo (50).
    const req = makeReq({ eventType: 'mission', referenceId: 'm1', points: 999999 });
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

  it('eventType "scan" consulta o catálogo pela chave fixa "scan", não pelo referenceId dinâmico', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true },
      missionSnap: { exists: true, data: () => ({ points: 5 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'scan', referenceId: 'user_qualquercoisa' });
    const res = makeRes();
    await handler(req, res);

    expect(tx.get).toHaveBeenCalledWith(expect.objectContaining({ path: 'missions/scan' }));
    expect(res.json).toHaveBeenCalledWith({ success: true, points: 5 });
  });

  it.each([
    [{ eventType: '', referenceId: 'r1' }],
    [{ referenceId: 'r1' }],
    [{ eventType: 'mission', referenceId: '' }],
    [{ eventType: 'mission' }]
  ])('eventType/referenceId ausente ou vazio (%o): 400 INVALID_PAYLOAD sem tocar a transação', async (body) => {
    const req = makeReq(body);
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  // BLOCKER do security review: referenceId com "/" formando número ímpar de
  // segmentos faz o Admin SDK real lançar exceção SÍNCRONA em .doc(...), fora
  // do try/catch — derrubaria a instância inteira. Este teste não reproduz o
  // crash em si (o mock de db.collection nunca lança), prova que a validação
  // barra o id ANTES de chegar em .doc('missions').doc(missionId) — cobertura
  // de que o guard existe e funciona pro caso que causaria o crash real.
  it('referenceId com "/" pra eventType não-scan: 400 INVALID_PAYLOAD sem tocar a transação (evita crash síncrono do Admin SDK)', async () => {
    const req = makeReq({ eventType: 'challenge', referenceId: 'a/b' });
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('eventType "scan" com referenceId contendo "/" (QR/perfil arbitrário): não rejeita, pois a missão é sempre a chave fixa "scan"', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true },
      missionSnap: { exists: true, data: () => ({ points: 5 }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'scan', referenceId: 'algum/codigo/estranho' });
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, points: 5 });
  });

  it('evento já resgatado: 200 alreadyClaimed, sem gravar/incrementar de novo', async () => {
    const tx = makeTx({
      eventSnap: { exists: true },
      userSnap: { exists: true }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1' });
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

    const req = makeReq({ eventType: 'mission', referenceId: 'm1' });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'PARTICIPANT_NOT_FOUND' }));
  });

  it('missão não existe no catálogo: 404 MISSION_NOT_FOUND, sem gravar/incrementar', async () => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true },
      missionSnap: { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq({ eventType: 'challenge', referenceId: 'missao_inventada' });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'MISSION_NOT_FOUND' }));
  });

  it.each([
    [{ points: 'cinquenta' }],
    [{ points: -10 }],
    [{}]
  ])('catálogo com points mal formado (%o): 500 INTERNAL_ERROR, sem gravar/incrementar', async (missionData) => {
    const tx = makeTx({
      eventSnap: { exists: false },
      userSnap: { exists: true },
      missionSnap: { exists: true, data: () => missionData }
    });
    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(tx));

    const req = makeReq({ eventType: 'challenge', referenceId: 'missao_quebrada' });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
  });

  it('erro inesperado do Firestore: 500 INTERNAL_ERROR sem vazar detalhe', async () => {
    (db.runTransaction as any).mockRejectedValue(new Error('boom - detalhe interno do Firestore'));

    const req = makeReq({ eventType: 'mission', referenceId: 'm1' });
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar os pontos.'
    });
  });
});

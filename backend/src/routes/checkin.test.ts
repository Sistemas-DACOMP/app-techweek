import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));
vi.mock('../config/firebaseAdmin', async () => {
  const admin = await import('firebase-admin');
  return {
    db: {
      collection: vi.fn(),
      runTransaction: vi.fn()
    },
    FieldValue: admin.firestore.FieldValue
  };
});

import router from './checkin';
import { db } from '../config/firebaseAdmin';
import { participantActionLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(activityId: string, lectureId: string, uid = 'user-1', bodyExtra: Record<string, unknown> = {}) {
  return { params: { activityId }, body: { lectureId, ...bodyExtra }, user: { uid } } as unknown as Request;
}

// Mesma técnica de extração de handler usada em booking.test.ts — checkin.ts
// só exporta o router default, sem supertest instalado no projeto.
function getCheckinHandler() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/checkin'
  );
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

const handler = getCheckinHandler();

// KAN-75 (achado do security review): prova que o rate limiter está de fato
// montado na rota real, não só que a função do limiter funciona isolada —
// um refactor que reordenasse os middlewares não quebraria nenhum outro teste.
it('KAN-75: participantActionLimiter está montado na rota real, antes do handler final', () => {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/checkin'
  );
  const handles = layer.route.stack.map((l: any) => l.handle);
  expect(handles).toContain(participantActionLimiter);
  expect(handles.indexOf(participantActionLimiter)).toBeLessThan(handles.length - 1);
});

describe('POST /:activityId/checkin — validação de activityId (KAN-49 security review, achado HIGH aplicado aqui também)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
  });

  it('activityId inválido (ex: path traversal via %2F), mesmo com lectureId batendo: 400 antes de tocar o Firestore', async () => {
    const req = makeReq('x/y', 'x/y');
    const res = makeRes();
    await handler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_ACTIVITY_ID' }));
  });

  it('lectureId diferente de activityId continua barrado antes da checagem de formato (ordem preservada)', async () => {
    const req = makeReq('lecture-1', 'lecture-2');
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'QR_MISMATCH' }));
  });
});

function makeCheckinTx(activityData: Record<string, unknown> | null, pointEventExists = false) {
  return {
    get: vi.fn((ref: { path: string }) => {
      if (ref.path.startsWith('activities/')) {
        return Promise.resolve(activityData ? { exists: true, data: () => activityData } : { exists: false });
      }
      if (ref.path.startsWith('pointEvents/')) return Promise.resolve({ exists: pointEventExists });
      throw new Error(`ref inesperada no mock: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /:activityId/checkin — attendanceMode (KAN-51/D2, convivência com o double-check novo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
  });

  it('recusa 400 WRONG_ATTENDANCE_MODE se a atividade usa double-check (KAN-51)', async () => {
    const tx = makeCheckinTx({ attendanceMode: 'DOUBLE_CHECK', points: 10 });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'WRONG_ATTENDANCE_MODE' }));
  });

  it('continua funcionando normal (201) quando attendanceMode está ausente (atividade cadastrada antes do campo existir)', async () => {
    const tx = makeCheckinTx({ points: 10 });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('continua funcionando normal (201) quando attendanceMode é explicitamente SELF_SCAN', async () => {
    const tx = makeCheckinTx({ attendanceMode: 'SELF_SCAN', points: 10 });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('POST /:activityId/checkin — fluxos de negócio e erros (ERR-072)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
  });

  it('retorna 404 ACTIVITY_NOT_FOUND quando a atividade não existe', async () => {
    const tx = makeCheckinTx(null);
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-999', 'lecture-999');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ACTIVITY_NOT_FOUND',
      message: 'Palestra não encontrada.'
    });
  });

  it('retorna 409 CHECKIN_DUPLICATE quando a presença já foi registrada anteriormente', async () => {
    const tx = makeCheckinTx({ points: 20 }, true);
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'CHECKIN_DUPLICATE',
      message: 'Presença já registrada para esta palestra.'
    });
  });

  it('registra presença com sucesso (201) e grava metadata.rating quando rating numérico é informado', async () => {
    const tx = makeCheckinTx({ points: 25 });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1', 'user-1', { rating: 5 });
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).toHaveBeenCalledWith(
      { path: 'pointEvents/user-1_lecture_attendance_lecture-1' },
      expect.objectContaining({
        userId: 'user-1',
        eventType: 'lecture_attendance',
        referenceId: 'lecture-1',
        points: 25,
        metadata: { rating: 5 },
        createdAt: expect.any(Date)
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, points: 25 });
  });

  it('registra presença com sucesso (201) com metadata null quando rating não é informado', async () => {
    const tx = makeCheckinTx({ points: 25 });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeReq('lecture-1', 'lecture-1', 'user-1');
    const res = makeRes();
    await handler(req, res);

    expect(tx.set).toHaveBeenCalledWith(
      { path: 'pointEvents/user-1_lecture_attendance_lecture-1' },
      expect.objectContaining({
        userId: 'user-1',
        eventType: 'lecture_attendance',
        referenceId: 'lecture-1',
        points: 25,
        metadata: null,
        createdAt: expect.any(Date)
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, points: 25 });
  });

  it('retorna 500 INTERNAL_ERROR quando a transação do Firestore falha inesperadamente', async () => {
    (db.runTransaction as any).mockRejectedValue(new Error('transação falhou'));

    const req = makeReq('lecture-1', 'lecture-1');
    const res = makeRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar a presença.'
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import router from './checkin';
import { db } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(activityId: string, lectureId: string, uid = 'user-1') {
  return { params: { activityId }, body: { lectureId }, user: { uid } } as unknown as Request;
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

function makeCheckinTx(activityData: Record<string, unknown>, pointEventExists = false) {
  return {
    get: vi.fn((ref: { path: string }) => {
      if (ref.path.startsWith('activities/')) return Promise.resolve({ exists: true, data: () => activityData });
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

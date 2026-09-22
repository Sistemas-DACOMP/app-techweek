import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn()
  }
}));

import router from './screenToken';
import { db } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(activityId: string, role: 'STAFF' | 'ADMIN' | 'PARTICIPANT', uid = 'staff-1') {
  return { params: { activityId }, user: { uid, role } } as unknown as Request;
}

function mockActivity(exists: boolean) {
  (db.collection as any).mockImplementation((name: string) => ({
    doc: (id: string) => ({
      path: `${name}/${id}`,
      get: vi.fn().mockResolvedValue({ exists })
    })
  }));
}

// A rota encadeia requireAuth -> requireRole(['STAFF','ADMIN']) -> handler.
// requireAuth já tem cobertura própria em authMiddleware.test.ts; aqui simulamos
// que ele já rodou (req.user pronto, mesma técnica de booking.test.ts/checkin.test.ts)
// e encadeamos requireRole + handler de verdade, pra provar que ESTA rota está
// protegida — não só que a função requireRole funciona isolada.
function getScreenTokenHandlers() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/:activityId/screen-token'
  );
  return layer.route.stack.map((l: any) => l.handle) as Array<
    (req: Request, res: Response, next: () => void) => unknown
  >;
}

async function runChain(handlers: Array<(req: Request, res: Response, next: () => void) => unknown>, req: Request, res: Response) {
  let i = -1;
  const next = async (): Promise<void> => {
    i++;
    const fn = handlers[i];
    if (fn) await fn(req, res, next);
  };
  await next();
}

const [, requireRoleHandler, finalHandler] = getScreenTokenHandlers();

describe('GET /:activityId/screen-token (KAN-51/D1)', () => {
  beforeAll(() => {
    process.env.SCREEN_TOKEN_SECRET = 'test-secret-kan-51-com-pelo-menos-32-chars';
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('STAFF autenticado recebe token válido por 5 minutos', async () => {
    mockActivity(true);
    const req = makeReq('activity-1', 'STAFF');
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const [[body]] = (res.json as any).mock.calls;
    expect(typeof body.token).toBe('string');
    expect(body.expiresAt).toBeGreaterThan(Date.now());
  });

  it('ADMIN autenticado também recebe token (RBAC: ADMIN sempre passa)', async () => {
    mockActivity(true);
    const req = makeReq('activity-1', 'ADMIN');
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('PARTICIPANT recebe 403 e nem chega a consultar a atividade', async () => {
    const req = makeReq('activity-1', 'PARTICIPANT');
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('atividade inexistente: 404 ACTIVITY_NOT_FOUND', async () => {
    mockActivity(false);
    const req = makeReq('activity-1', 'ADMIN');
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACTIVITY_NOT_FOUND' }));
  });

  it('activityId inválido (ex: path traversal via %2F): 400 antes de tocar o Firestore', async () => {
    const req = makeReq('x/y', 'STAFF');
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_ACTIVITY_ID' }));
  });
});

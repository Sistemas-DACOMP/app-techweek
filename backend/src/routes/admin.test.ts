import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn()
  },
  auth: {
    setCustomUserClaims: vi.fn(),
    getUser: vi.fn()
  }
}));

import router, { updateUserRoleHandler } from './admin';
import { db, auth } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(uid: string, body: any = {}, user: any = { uid: 'admin-1', role: 'ADMIN' }) {
  return { params: { uid }, body, user } as unknown as Request;
}

// Mesma técnica de cadeia real de screenToken.test.ts/checkinDoubleCheck.test.ts —
// requireAuth/requireRole já têm cobertura própria em authMiddleware.test.ts;
// aqui só precisamos provar que a rota de fato usa requireRole(['ADMIN']).
function getRoleChain() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/users/:uid/role'
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

const [, requireRoleHandler] = getRoleChain();

describe('PUT /api/admin/users/:uid/role (KAN-60)', () => {
  let userDoc: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    userDoc = {
      get: vi.fn().mockResolvedValue({ exists: true }),
      update: vi.fn().mockResolvedValue(undefined)
    };
    (db.collection as any).mockImplementation(() => ({
      doc: () => userDoc
    }));
    (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
    (auth.getUser as any).mockResolvedValue({ customClaims: {} });
  });

  it('preserva claims existentes ao setar a role nova (merge, não sobrescreve)', async () => {
    (auth.getUser as any).mockResolvedValue({ customClaims: { somethingElse: 'kept' } });
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('part-1', { somethingElse: 'kept', role: 'STAFF' });
  });

  it('sucesso: seta o custom claim, sincroniza o Firestore e responde 200', async () => {
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('part-1', { role: 'STAFF' });
    expect(userDoc.update).toHaveBeenCalledWith({ role: 'STAFF' });
    // update no Firestore só pode acontecer depois do claim ter sido setado.
    expect(auth.setCustomUserClaims.mock.invocationCallOrder[0]).toBeLessThan(
      userDoc.update.mock.invocationCallOrder[0]
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, uid: 'part-1', role: 'STAFF' });
  });

  it('400 INVALID_PAYLOAD se uid tiver path traversal (%2F decodificado), nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1/x', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role estiver ausente, nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', {});
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role for string vazia, nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', { role: '' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role estiver fora da allowlist (ex: "HACKER"), nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', { role: 'HACKER' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('404 USER_NOT_FOUND se o doc /users/{uid} não existir, setCustomUserClaims nunca é chamado', async () => {
    userDoc.get.mockResolvedValue({ exists: false });
    const req = makeReq('part-404', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'USER_NOT_FOUND' }));
  });

  it('404 AUTH_USER_NOT_FOUND se auth.getUser (leitura dos claims atuais) rejeitar com auth/user-not-found', async () => {
    (auth.getUser as any).mockRejectedValue({ code: 'auth/user-not-found' });
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'AUTH_USER_NOT_FOUND' }));
  });

  it('404 AUTH_USER_NOT_FOUND se setCustomUserClaims rejeitar com auth/user-not-found', async () => {
    (auth.setCustomUserClaims as any).mockRejectedValue({ code: 'auth/user-not-found' });
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(userDoc.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'AUTH_USER_NOT_FOUND' }));
  });

  it('500 INTERNAL_ERROR se setCustomUserClaims rejeitar com outro erro, userRef.update nunca é chamado', async () => {
    (auth.setCustomUserClaims as any).mockRejectedValue(new Error('boom'));
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(userDoc.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
  });

  it('500 ROLE_PARTIALLY_UPDATED se o claim for setado mas o update no Firestore falhar', async () => {
    userDoc.update.mockRejectedValue(new Error('firestore down'));
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('part-1', { role: 'STAFF' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'ROLE_PARTIALLY_UPDATED',
        message: expect.stringContaining('part-1')
      })
    );
  });

  it('cadeia real: STAFF (não-ADMIN) recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeReq('part-1', { role: 'ADMIN' }, { uid: 'staff-1', role: 'STAFF' });
    const res = makeRes();

    await runChain([requireRoleHandler, updateUserRoleHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('cadeia real: PARTICIPANT recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeReq('part-1', { role: 'ADMIN' }, { uid: 'part-1', role: 'PARTICIPANT' });
    const res = makeRes();

    await runChain([requireRoleHandler, updateUserRoleHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('cadeia real: ADMIN passa pelo requireRole (chama next, não responde 403)', () => {
    // Não encadeia até o handler final aqui: updateUserRoleHandler tem 4
    // awaits em sequência (get, getUser, setCustomUserClaims, update), e o
    // runChain genérico (next() disparado de dentro de um middleware síncrono,
    // sem `return next()`) tem corrida real de promise nesse caso — o
    // `await runChain(...)` do teste resolvia antes do handler terminar.
    // A parte que realmente pertence a este teste (requireRole libera ADMIN)
    // já fica provada só checando a chamada de next(); o handler em si já
    // tem cobertura direta no teste de sucesso acima.
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();
    const next = vi.fn();

    requireRoleHandler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  auth: { verifyIdToken: vi.fn() },
  db: {
    collection: vi.fn()
  }
}));

import { requireAuth, requireRole, requireSymplaTicket } from './authMiddleware';
import { auth, db } from '../config/firebaseAdmin';
import type { AuthUser } from '../types/express';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('requireAuth (KAN-72 — /api/auth/register precisa de token válido)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há header Authorization', async () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o header não usa o formato "Bearer <token>"', async () => {
    const req = { headers: { authorization: 'Token abc123' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 INVALID_TOKEN quando o token é inválido/expirado', async () => {
    (auth.verifyIdToken as any).mockRejectedValue(new Error('token expirado'));
    const req = { headers: { authorization: 'Bearer token-invalido' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('popula req.user e chama next() quando o token é válido', async () => {
    (auth.verifyIdToken as any).mockResolvedValue({
      uid: 'uid-1',
      email: 'a@b.com',
      email_verified: true
    });
    const req = { headers: { authorization: 'Bearer token-valido' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      uid: 'uid-1',
      email: 'a@b.com',
      role: 'PARTICIPANT',
      emailVerified: true
    });
  });

  it('passa checkRevoked=true pro Admin SDK (KAN-67 — token de conta desabilitada/deslogada não pode colar)', async () => {
    (auth.verifyIdToken as any).mockResolvedValue({ uid: 'uid-1', email_verified: true });
    const req = { headers: { authorization: 'Bearer token-valido' } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('token-valido', true);
  });
});

describe('requireRole (KAN-67 — RBAC reaproveitado por toda rota de negócio nova)', () => {
  function makeReq(user?: AuthUser): Request {
    return { user } as unknown as Request;
  }

  it('retorna 401 quando não há req.user (rota mal montada sem requireAuth antes)', () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    requireRole(['STAFF'])(makeReq(undefined), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 quando a role do usuário não está em allowedRoles', () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    requireRole(['STAFF', 'ADMIN'])(makeReq({ uid: 'u1', role: 'PARTICIPANT' }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() quando a role do usuário está em allowedRoles', () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    requireRole(['STAFF', 'ADMIN'])(makeReq({ uid: 'u1', role: 'STAFF' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('ADMIN sempre passa, mesmo fora de allowedRoles (bypass documentado)', () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    requireRole(['SPONSOR'])(makeReq({ uid: 'u1', role: 'ADMIN' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireSymplaTicket (KAN-84 — bloqueio de ações para usuários sem ingresso)', () => {
  function makeReq(user?: AuthUser): Request {
    return { user } as unknown as Request;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando req.user não está definido', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireSymplaTicket(makeReq(undefined), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('ADMIN sempre passa direto sem consultar Firestore (bypass de administração)', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await requireSymplaTicket(makeReq({ uid: 'admin-1', role: 'ADMIN' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('retorna 403 SYMPLA_TICKET_REQUIRED quando documento do usuário não existe', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    (db.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null })
      })
    });

    await requireSymplaTicket(makeReq({ uid: 'user-no-doc', role: 'PARTICIPANT' }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'SYMPLA_TICKET_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 SYMPLA_TICKET_REQUIRED quando usuário não possui hasSymplaTicket: true', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    (db.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ email: 'test@example.com', hasSymplaTicket: false })
        })
      })
    });

    await requireSymplaTicket(makeReq({ uid: 'user-no-ticket', role: 'PARTICIPANT' }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'SYMPLA_TICKET_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() quando o usuário possui hasSymplaTicket: true', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    (db.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            email: 'valid@example.com',
            hasSymplaTicket: true,
            symplaTicket: { ticketNumber: '123' }
          })
        })
      })
    });

    await requireSymplaTicket(makeReq({ uid: 'user-valid', role: 'PARTICIPANT' }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 500 INTERNAL_ERROR caso ocorra erro inesperado no banco', async () => {
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    (db.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Firestore indisponível'))
      })
    });

    await requireSymplaTicket(makeReq({ uid: 'user-err', role: 'PARTICIPANT' }), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
    expect(next).not.toHaveBeenCalled();
  });
});


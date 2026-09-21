import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  auth: { verifyIdToken: vi.fn() }
}));

import { requireAuth, requireRole } from './authMiddleware';
import { auth } from '../config/firebaseAdmin';
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

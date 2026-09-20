import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  auth: { verifyIdToken: vi.fn() }
}));

import { requireAuth } from './authMiddleware';
import { auth } from '../config/firebaseAdmin';

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
});

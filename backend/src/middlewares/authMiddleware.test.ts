import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireVerifiedEmail } from './authMiddleware';

describe('Middleware: requireVerifiedEmail (KAN-116 / SEC)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('retorna 401 se req.user não existir', () => {
    req.user = undefined;

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 EMAIL_NOT_VERIFIED se emailVerified for false', () => {
    req.user = {
      uid: 'user-123',
      email: 'user@example.com',
      role: 'PARTICIPANT',
      emailVerified: false
    };

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'É necessário confirmar seu endereço de e-mail antes de realizar esta ação.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 EMAIL_NOT_VERIFIED se emailVerified for undefined', () => {
    req.user = {
      uid: 'user-123',
      email: 'user@example.com',
      role: 'PARTICIPANT',
      emailVerified: undefined
    };

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'É necessário confirmar seu endereço de e-mail antes de realizar esta ação.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() se o usuário possuir emailVerified: true', () => {
    req.user = {
      uid: 'user-123',
      email: 'user@example.com',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('chama next() para usuário com role ADMIN mesmo se emailVerified for false', () => {
    req.user = {
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      emailVerified: false
    };

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('chama next() para usuário com role ADMIN se emailVerified for undefined', () => {
    req.user = {
      uid: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      emailVerified: undefined
    };

    requireVerifiedEmail(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

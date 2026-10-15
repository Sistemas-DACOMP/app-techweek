import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const { mockVerifyIdToken, mockDocGet } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockDocGet: vi.fn()
}));

vi.mock('../config/firebaseAdmin', () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken
  },
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mockDocGet
      }))
    }))
  }
}));

import { requireAuth, requireVerifiedEmail } from './authMiddleware';

describe('Middleware: requireAuth', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('faz fallback para verifyIdToken(token, false) quando checkRevoked=true falha com auth/insufficient-permission', async () => {
    req.headers = { authorization: 'Bearer valid-jwt-token' };

    mockVerifyIdToken
      .mockRejectedValueOnce({
        code: 'auth/insufficient-permission',
        message: 'Insufficient permission to access the requested resource.'
      })
      .mockResolvedValueOnce({
        uid: 'user-123',
        email: 'user@example.com',
        email_verified: true
      });

    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ role: 'PARTICIPANT' })
    });

    await requireAuth(req as Request, res as Response, next);

    expect(mockVerifyIdToken).toHaveBeenNthCalledWith(1, 'valid-jwt-token', true);
    expect(mockVerifyIdToken).toHaveBeenNthCalledWith(2, 'valid-jwt-token', false);
    expect(req.user).toEqual({
      uid: 'user-123',
      email: 'user@example.com',
      role: 'PARTICIPANT',
      emailVerified: true
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 401 INVALID_TOKEN quando o token realmente está expirado ou revogado', async () => {
    req.headers = { authorization: 'Bearer revoked-jwt-token' };

    mockVerifyIdToken.mockRejectedValueOnce({
      code: 'auth/id-token-revoked',
      message: 'The Firebase ID token has been revoked.'
    });

    await requireAuth(req as Request, res as Response, next);

    expect(mockVerifyIdToken).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_TOKEN',
      code: 'auth/id-token-revoked',
      message: 'Token de autenticação inválido, expirado ou revogado.'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

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


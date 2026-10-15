import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  auth: {
    verifyIdToken: vi.fn()
  },
  db: {
    collection: vi.fn()
  }
}));

import { auth, db } from '../config/firebaseAdmin';
import {
  requireAuth,
  requireRole,
  requireSymplaTicket,
  requireVerifiedEmail
} from './authMiddleware';

describe('Middleware: requireAuth (ERR-060 / KAN-75 / SEC)', () => {
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

  it('retorna 401 UNAUTHORIZED se o header Authorization estiver ausente', async () => {
    req.headers = {};

    await requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'UNAUTHORIZED',
        message: expect.stringContaining('Bearer <token>')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 UNAUTHORIZED se o header Authorization não iniciar com "Bearer "', async () => {
    req.headers = { authorization: 'Basic token-123' };

    await requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'UNAUTHORIZED',
        message: expect.stringContaining('Bearer <token>')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 UNAUTHORIZED se o token após "Bearer " for vazio ou composto só por espaços', async () => {
    req.headers = { authorization: 'Bearer    ' };

    await requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação não fornecido.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 INVALID_TOKEN se a verificação do token falhar (expirado, revogado ou inválido)', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(auth.verifyIdToken).mockRejectedValue(new Error('Firebase ID token has expired.'));

    await requireAuth(req as Request, res as Response, next);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('invalid-token', true);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_TOKEN',
      code: 'auth/invalid-token',
      message: 'Token de autenticação inválido, expirado ou revogado.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('decodifica token com sucesso e injeta req.user com papel default PARTICIPANT', async () => {
    req.headers = { authorization: 'Bearer valid-participant-token' };
    vi.mocked(auth.verifyIdToken).mockResolvedValue({
      uid: 'user-p1',
      email: 'part@ufu.br',
      email_verified: true
    } as any);

    await requireAuth(req as Request, res as Response, next);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('valid-participant-token', true);
    expect(req.user).toEqual({
      uid: 'user-p1',
      email: 'part@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('reconhece papel ADMIN via role: "ADMIN"', async () => {
    req.headers = { authorization: 'Bearer valid-admin-token' };
    vi.mocked(auth.verifyIdToken).mockResolvedValue({
      uid: 'admin-u1',
      email: 'admin@ufu.br',
      role: 'ADMIN',
      email_verified: true
    } as any);

    await requireAuth(req as Request, res as Response, next);

    expect(req.user?.role).toBe('ADMIN');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reconhece papel ADMIN via custom claim admin: true', async () => {
    req.headers = { authorization: 'Bearer valid-claim-admin-token' };
    vi.mocked(auth.verifyIdToken).mockResolvedValue({
      uid: 'admin-u2',
      email: 'admin2@ufu.br',
      admin: true,
      email_verified: true
    } as any);

    await requireAuth(req as Request, res as Response, next);

    expect(req.user?.role).toBe('ADMIN');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserva roles especiais como STAFF ou SPONSOR', async () => {
    req.headers = { authorization: 'Bearer valid-staff-token' };
    vi.mocked(auth.verifyIdToken).mockResolvedValue({
      uid: 'staff-u1',
      email: 'staff@ufu.br',
      role: 'STAFF',
      email_verified: true
    } as any);

    await requireAuth(req as Request, res as Response, next);

    expect(req.user?.role).toBe('STAFF');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('Middleware: requireRole (ERR-060 / RBAC / SEC)', () => {
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

  it('retorna 401 UNAUTHORIZED se req.user não existir', () => {
    req.user = undefined;

    requireRole(['STAFF'])(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() se o usuário tiver role ADMIN (acesso irrestrito a qualquer papel)', () => {
    req.user = {
      uid: 'admin-1',
      email: 'admin@ufu.br',
      role: 'ADMIN',
      emailVerified: true
    };

    requireRole(['STAFF', 'SPONSOR'])(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('chama next() se o usuário tiver exatamente o papel permitido', () => {
    req.user = {
      uid: 'staff-1',
      email: 'staff@ufu.br',
      role: 'STAFF',
      emailVerified: true
    };

    requireRole(['STAFF'])(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 403 FORBIDDEN se o usuário possuir papel insuficiente', () => {
    req.user = {
      uid: 'part-1',
      email: 'part@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    requireRole(['STAFF', 'SPONSOR'])(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'FORBIDDEN',
      message: 'Acesso restrito. Esta ação requer permissão de: STAFF, SPONSOR.'
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Middleware: requireSymplaTicket (ERR-060 / KAN-84 / SEC)', () => {
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

  it('retorna 401 UNAUTHORIZED se req.user não existir', async () => {
    req.user = undefined;

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('concede bypass imediato e chama next() se req.user for ADMIN (sem consultar Firestore)', async () => {
    req.user = {
      uid: 'admin-1',
      email: 'admin@ufu.br',
      role: 'ADMIN',
      emailVerified: true
    };

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(db.collection).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('chama next() se o participante possuir hasSymplaTicket: true no documento', async () => {
    req.user = {
      uid: 'user-ticket-1',
      email: 'ticket1@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ hasSymplaTicket: true })
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
    vi.mocked(db.collection).mockReturnValue({ doc: mockDoc } as any);

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(db.collection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('user-ticket-1');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('chama next() se o participante possuir symplaTicket: true ou sympla_ticket: true', async () => {
    req.user = {
      uid: 'user-ticket-2',
      email: 'ticket2@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ sympla_ticket: true })
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
    vi.mocked(db.collection).mockReturnValue({ doc: mockDoc } as any);

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('retorna 403 SYMPLA_TICKET_REQUIRED se o documento do usuário não existir no Firestore', async () => {
    req.user = {
      uid: 'user-ghost',
      email: 'ghost@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    const mockGet = vi.fn().mockResolvedValue({
      exists: false,
      data: () => undefined
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
    vi.mocked(db.collection).mockReturnValue({ doc: mockDoc } as any);

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'SYMPLA_TICKET_REQUIRED',
      message: 'É necessário possuir um ingresso oficial do Sympla vinculado à conta para realizar esta ação.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 SYMPLA_TICKET_REQUIRED se o participante não tiver nenhuma flag de ingresso', async () => {
    req.user = {
      uid: 'user-noticket',
      email: 'noticket@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ name: 'Participante Sem Ingresso' })
    });
    const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
    vi.mocked(db.collection).mockReturnValue({ doc: mockDoc } as any);

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'SYMPLA_TICKET_REQUIRED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 500 INTERNAL_ERROR caso ocorra erro ao consultar o Firestore', async () => {
    req.user = {
      uid: 'user-err',
      email: 'err@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    };

    const mockDoc = vi.fn().mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error('Firestore read failure'))
    });
    vi.mocked(db.collection).mockReturnValue({ doc: mockDoc } as any);

    await requireSymplaTicket(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Erro interno ao validar ingresso do participante.'
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole, requireVerifiedEmail } from '../../backend/src/middlewares/authMiddleware';
import { auth } from '../../backend/src/config/firebaseAdmin';

// Mock do Firebase Auth
vi.mock('../../backend/src/config/firebaseAdmin', () => ({
  auth: {
    verifyIdToken: vi.fn()
  },
  db: {}
}));

describe('Middleware: requireAuth', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('deve retornar 401 se o header Authorization estiver ausente', async () => {
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o header Authorization não começar com "Bearer "', async () => {
    req.headers.authorization = 'Basic dXNlcjpwYXNz';
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o token estiver vazio após "Bearer "', async () => {
    req.headers.authorization = 'Bearer   ';
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 se o Firebase Auth rejeitar o token (inválido/expirado)', async () => {
    req.headers.authorization = 'Bearer token-invalido';
    auth.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired.'));

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_TOKEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve anexar req.user e chamar next() quando o token for válido', async () => {
    req.headers.authorization = 'Bearer token-valido';
    auth.verifyIdToken.mockResolvedValue({
      uid: 'user-123',
      email: 'aluno@ufu.br',
      role: 'PARTICIPANT',
      email_verified: true
    });

    await requireAuth(req, res, next);

    expect(req.user).toEqual({
      uid: 'user-123',
      email: 'aluno@ufu.br',
      role: 'PARTICIPANT',
      emailVerified: true
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve assumir role "PARTICIPANT" como padrão se o token não tiver role customizada', async () => {
    req.headers.authorization = 'Bearer token-valido';
    auth.verifyIdToken.mockResolvedValue({
      uid: 'user-sem-role',
      email: 'teste@ufu.br'
    });

    await requireAuth(req, res, next);

    expect(req.user.role).toBe('PARTICIPANT');
    expect(next).toHaveBeenCalled();
  });

  it('sam03amorim@gmail.com sem custom claim no token é tratado como PARTICIPANT (sem auto-promoção por e-mail)', async () => {
    req.headers.authorization = 'Bearer token-sam';
    auth.verifyIdToken.mockResolvedValue({
      uid: 'uid-sam',
      email: 'sam03amorim@gmail.com',
      email_verified: true
    });

    await requireAuth(req, res, next);

    expect(req.user.role).toBe('PARTICIPANT');
    expect(next).toHaveBeenCalled();
  });

  it('token com custom claim role: "ADMIN" recebe role "ADMIN"', async () => {
    req.headers.authorization = 'Bearer token-admin';
    auth.verifyIdToken.mockResolvedValue({
      uid: 'uid-admin-1',
      email: 'outro@admin.com',
      role: 'ADMIN',
      email_verified: true
    });

    await requireAuth(req, res, next);

    expect(req.user.role).toBe('ADMIN');
    expect(next).toHaveBeenCalled();
  });

  it('token com custom claim admin: true recebe role "ADMIN"', async () => {
    req.headers.authorization = 'Bearer token-admin-bool';
    auth.verifyIdToken.mockResolvedValue({
      uid: 'uid-admin-2',
      email: 'outro2@admin.com',
      admin: true,
      email_verified: true
    });

    await requireAuth(req, res, next);

    expect(req.user.role).toBe('ADMIN');
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware: requireRole', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('deve retornar 401 se req.user não existir', () => {
    const middleware = requireRole(['STAFF', 'ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o usuário não possuir um papel permitido', () => {
    req.user = { uid: 'u1', role: 'PARTICIPANT' };
    const middleware = requireRole(['STAFF', 'ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('deve chamar next() se o usuário possuir papel permitido', () => {
    req.user = { uid: 'u2', role: 'STAFF' };
    const middleware = requireRole(['STAFF', 'ADMIN']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve sempre permitir acesso irrestrito para role ADMIN', () => {
    req.user = { uid: 'u-admin', role: 'ADMIN' };
    const middleware = requireRole(['SPONSOR']); // Rota só para patrocinadores, mas ADMIN passa!
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Middleware: requireVerifiedEmail (KAN-116 / SEC)', () => {
  let req;
  let res;
  let next;

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
    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 EMAIL_NOT_VERIFIED se emailVerified for false', () => {
    req.user = { uid: 'u1', role: 'PARTICIPANT', emailVerified: false };
    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'É necessário confirmar seu endereço de e-mail antes de realizar esta ação.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 EMAIL_NOT_VERIFIED se emailVerified for undefined', () => {
    req.user = { uid: 'u1', role: 'PARTICIPANT' };
    requireVerifiedEmail(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'É necessário confirmar seu endereço de e-mail antes de realizar esta ação.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() se emailVerified for true', () => {
    req.user = { uid: 'u1', role: 'PARTICIPANT', emailVerified: true };
    requireVerifiedEmail(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('chama next() para ADMIN mesmo se emailVerified for false', () => {
    req.user = { uid: 'u-admin', role: 'ADMIN', emailVerified: false };
    requireVerifiedEmail(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});


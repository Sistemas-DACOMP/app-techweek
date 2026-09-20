import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole } from '../../backend/src/middlewares/authMiddleware';
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({ db: {} }));
vi.mock('../services/registerUser', () => ({
  registerUser: vi.fn()
}));

import router, { registerHandler } from './auth';
import { registerUser } from '../services/registerUser';
import { participantActionLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

// KAN-75: prova que o rate limiter está montado na rota real (não só que a
// função do limiter funciona isolada, ver rateLimiter.test.ts).
it('KAN-75: participantActionLimiter está montado na rota real, antes do handler final', () => {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/register'
  );
  const handles = layer.route.stack.map((l: any) => l.handle);
  expect(handles).toContain(participantActionLimiter);
  expect(handles.indexOf(participantActionLimiter)).toBeLessThan(handles.length - 1);
});

describe('POST /api/auth/register (registerHandler) — REG-LGPD-001 / KAN-72', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita com 400 TERMS_NOT_ACCEPTED quando termsAccepted não vem no corpo', async () => {
    const req = { body: {}, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TERMS_NOT_ACCEPTED' }));
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('rejeita com 400 TERMS_NOT_ACCEPTED quando termsAccepted é false', async () => {
    const req = { body: { termsAccepted: false }, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('rejeita com 400 quando termsAccepted vem como string "true" (não é === true)', async () => {
    const req = { body: { termsAccepted: 'true' }, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('cria o cadastro e retorna 201 quando termsAccepted é true e o usuário é novo', async () => {
    (registerUser as any).mockResolvedValue({
      status: 'created',
      user: { uid: 'uid-1', email: 'a@b.com', role: 'PARTICIPANT' }
    });
    const req = { body: { termsAccepted: true }, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: { uid: 'uid-1', email: 'a@b.com', role: 'PARTICIPANT' } });
  });

  it('usa email null quando o token do Firebase Auth não traz email', async () => {
    (registerUser as any).mockResolvedValue({
      status: 'created',
      user: { uid: 'uid-1', email: null, role: 'PARTICIPANT' }
    });
    const req = { body: { termsAccepted: true }, user: { uid: 'uid-1', email: undefined } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(registerUser).toHaveBeenCalledWith({}, 'uid-1', null);
  });

  it('retorna 409 ALREADY_REGISTERED quando o usuário já tem cadastro concluído', async () => {
    (registerUser as any).mockResolvedValue({ status: 'already-registered' });
    const req = { body: { termsAccepted: true }, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ALREADY_REGISTERED' }));
  });

  it('retorna 500 INTERNAL_ERROR se a transação falhar de forma inesperada', async () => {
    (registerUser as any).mockRejectedValue(new Error('boom'));
    const req = { body: { termsAccepted: true }, user: { uid: 'uid-1', email: 'a@b.com' } } as unknown as Request;
    const res = makeRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
  });
});

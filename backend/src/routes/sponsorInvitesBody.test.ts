import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({ db: {}, auth: {} }));

vi.mock('../services/sponsorInvites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/sponsorInvites')>();
  return {
    ...actual,
    getInvitePreview: vi.fn(),
    acceptInvite: vi.fn()
  };
});

import router, {
  parseAcceptBody,
  previewInviteHandler,
  acceptInviteHandler
} from './sponsorInvites';
import { requireAuth } from '../middlewares/authMiddleware';
import { sponsorInviteIpLimiter, debugClientIp, resetDebugClientIpCount } from '../middlewares/rateLimiter';
import {
  InviteError,
  RolePartiallyUpdatedError,
  getInvitePreview,
  acceptInvite
} from '../services/sponsorInvites';

const base = { firstName: 'Ana', lastName: 'Silva', jobTitle: 'Dev', phone: '34999990000' };

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function getRouteHandlers(path: string, method: string) {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === path && l.route?.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack.map((l: any) => l.handle) as Array<
    (req: Request, res: Response, next: () => void) => unknown
  >;
}

describe('parseAcceptBody (B6 / ERR-082)', () => {
  it('rejeita linkedin/photoURL que não sejam https', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://linkedin.com/in/a', 'linkedin.com/in/a', 'ftp://x.com']) {
      expect(parseAcceptBody({ ...base, linkedin: url })).toBe('linkedin deve ser uma URL https.');
      expect(parseAcceptBody({ ...base, photoURL: url })).toBe('photoURL deve ser uma URL https.');
    }
    expect(parseAcceptBody({ ...base, linkedin: 'https://linkedin.com/in/ana' })).toMatchObject({
      linkedin: 'https://linkedin.com/in/ana'
    });
  });

  it('lookingFor só aceita itens da lista permitida', () => {
    expect(typeof parseAcceptBody({ ...base, lookingFor: ['Frontend', 'Hacker'] })).toBe('string');
    expect(typeof parseAcceptBody({ ...base, lookingFor: ['frontend'] })).toBe('string');
    expect(typeof parseAcceptBody({ ...base, lookingFor: [{ a: 1 }] })).toBe('string');
    expect(parseAcceptBody({ ...base, lookingFor: ['Frontend', 'Dados / IA', 'Estágio', 'Frontend'] })).toMatchObject({
      lookingFor: ['Frontend', 'Dados / IA', 'Estágio']
    });
  });

  it('rejeita campos obrigatórios ausentes, vazios ou contendo apenas espaços (ERR-082)', () => {
    const errorMsg = 'firstName, lastName e jobTitle são obrigatórios.';
    expect(parseAcceptBody({ ...base, firstName: '' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, firstName: '   ' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, firstName: undefined })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, firstName: null })).toBe(errorMsg);

    expect(parseAcceptBody({ ...base, lastName: '' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, lastName: ' \t\n ' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, lastName: undefined })).toBe(errorMsg);

    expect(parseAcceptBody({ ...base, jobTitle: '' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, jobTitle: '   ' })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, jobTitle: undefined })).toBe(errorMsg);
  });

  it('rejeita campos de texto que excedam o limite máximo de caracteres (ERR-082)', () => {
    const errorMsg = 'firstName, lastName e jobTitle são obrigatórios.';
    expect(parseAcceptBody({ ...base, firstName: 'a'.repeat(81) })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, lastName: 'b'.repeat(81) })).toBe(errorMsg);
    expect(parseAcceptBody({ ...base, jobTitle: 'c'.repeat(101) })).toBe(errorMsg);
  });

  it('aceita campos de texto no limite exato de caracteres (ERR-082)', () => {
    const exactFirst = 'a'.repeat(80);
    const exactLast = 'b'.repeat(80);
    const exactJob = 'c'.repeat(100);

    const result = parseAcceptBody({
      ...base,
      firstName: exactFirst,
      lastName: exactLast,
      jobTitle: exactJob
    });

    expect(result).toMatchObject({
      firstName: exactFirst,
      lastName: exactLast,
      jobTitle: exactJob
    });
  });

  it('valida formato e dígitos do telefone (ERR-082)', () => {
    expect(parseAcceptBody({ ...base, phone: '' })).toBe('phone inválido.');
    expect(parseAcceptBody({ ...base, phone: '   ' })).toBe('phone inválido.');
    expect(parseAcceptBody({ ...base, phone: undefined })).toBe('phone inválido.');
    expect(parseAcceptBody({ ...base, phone: null })).toBe('phone inválido.');

    // Menos de 10 dígitos numéricos
    expect(parseAcceptBody({ ...base, phone: '123456789' })).toBe('phone inválido.');
    expect(parseAcceptBody({ ...base, phone: '(11) 9999-99' })).toBe('phone inválido.');

    // Mais de 15 dígitos numéricos
    expect(parseAcceptBody({ ...base, phone: '1234567890123456' })).toBe('phone inválido.');

    // Telefones válidos entre 10 e 15 dígitos
    expect(parseAcceptBody({ ...base, phone: '3432320000' })).toMatchObject({ phone: '3432320000' });
    expect(parseAcceptBody({ ...base, phone: '(34) 99999-0000' })).toMatchObject({ phone: '(34) 99999-0000' });
    expect(parseAcceptBody({ ...base, phone: '+55 34 99999-0000' })).toMatchObject({ phone: '+55 34 99999-0000' });
  });

  it('valida restrições adicionais de lookingFor (ERR-082)', () => {
    expect(parseAcceptBody({ ...base, lookingFor: 'Frontend' })).toBe('lookingFor deve ser uma lista de até 10 textos.');
    expect(parseAcceptBody({ ...base, lookingFor: 123 })).toBe('lookingFor deve ser uma lista de até 10 textos.');
    expect(parseAcceptBody({ ...base, lookingFor: Array(11).fill('Frontend') })).toBe(
      'lookingFor deve ser uma lista de até 10 textos.'
    );

    // lookingFor omitido vira lista vazia
    expect(parseAcceptBody({ ...base, lookingFor: undefined })).toMatchObject({ lookingFor: [] });
    expect(parseAcceptBody({ ...base, lookingFor: null })).toMatchObject({ lookingFor: [] });
  });

  it('valida limites de tamanho de URL para photoURL e linkedin (ERR-082)', () => {
    const longPhoto = 'https://exemplo.com/' + 'a'.repeat(500);
    expect(parseAcceptBody({ ...base, photoURL: longPhoto })).toBe('photoURL deve ser uma URL https.');

    const longLinkedin = 'https://linkedin.com/in/' + 'a'.repeat(200);
    expect(parseAcceptBody({ ...base, linkedin: longLinkedin })).toBe('linkedin deve ser uma URL https.');

    // Valores vazios/nulos não disparam validação nem erro
    expect(parseAcceptBody({ ...base, photoURL: '', linkedin: '' })).toMatchObject({
      firstName: 'Ana',
      lastName: 'Silva'
    });
  });
});

describe('debugClientIp (M4)', () => {
  beforeEach(() => {
    resetDebugClientIpCount();
  });
  afterEach(() => {
    resetDebugClientIpCount();
    vi.restoreAllMocks();
  });
  const req = {
    ip: '1.2.3.4',
    headers: { 'x-forwarded-for': '1.2.3.4' },
    originalUrl: '/api/sponsor-invites/SEGREDO'
  } as unknown as Request;

  it('desligado por padrão: não loga e segue a cadeia', () => {
    delete process.env.DEBUG_CLIENT_IP;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const next = vi.fn();
    debugClientIp(req, {} as any, next);
    expect(warn).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('com a flag loga o diagnóstico sem vazar a URL/token', () => {
    process.env.DEBUG_CLIENT_IP = '1';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    debugClientIp(req, {} as any, vi.fn());
    delete process.env.DEBUG_CLIENT_IP;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SEGREDO');
  });
});

describe('Rotas HTTP de Onboarding de Patrocinadores (ERR-081)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('garante que as rotas HTTP registram os middlewares corretos', () => {
    const getHandlers = getRouteHandlers('/:token', 'get');
    expect(getHandlers).toContain(sponsorInviteIpLimiter);
    expect(getHandlers).toContain(previewInviteHandler);

    const postHandlers = getRouteHandlers('/:token/accept', 'post');
    expect(postHandlers).toContain(sponsorInviteIpLimiter);
    expect(postHandlers).toContain(requireAuth);
    expect(postHandlers).toContain(acceptInviteHandler);
  });

  describe('previewInviteHandler (GET /api/sponsor-invites/:token)', () => {
    it('retorna 200 com os dados públicos do convite', async () => {
      const mockPreview = {
        sponsorName: 'TechCorp',
        tier: 'DIAMANTE',
        email: 'sponsor@corp.com',
        generic: false,
        expiresAt: '2026-10-20T00:00:00Z'
      };
      vi.mocked(getInvitePreview).mockResolvedValueOnce(mockPreview as any);

      const req = { params: { token: 'valid-token' } } as unknown as Request;
      const res = makeRes();

      await previewInviteHandler(req, res);

      expect(getInvitePreview).toHaveBeenCalledWith('valid-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPreview);
    });

    it('retorna 404 quando o convite não é encontrado (InviteError 404)', async () => {
      vi.mocked(getInvitePreview).mockRejectedValueOnce(
        new InviteError('INVITE_NOT_FOUND', 404, 'Convite não encontrado.')
      );

      const req = { params: { token: 'nonexistent-token' } } as unknown as Request;
      const res = makeRes();

      await previewInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVITE_NOT_FOUND',
        message: 'Convite não encontrado.'
      });
    });

    it('retorna 410 quando o convite expirou (InviteError 410)', async () => {
      vi.mocked(getInvitePreview).mockRejectedValueOnce(
        new InviteError('INVITE_EXPIRED', 410, 'Convite expirado.')
      );

      const req = { params: { token: 'expired-token' } } as unknown as Request;
      const res = makeRes();

      await previewInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVITE_EXPIRED',
        message: 'Convite expirado.'
      });
    });

    it('retorna 500 com erro genérico INTERNAL_ERROR em caso de falha inesperada', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getInvitePreview).mockRejectedValueOnce(new Error('Firestore connection error'));

      const req = { params: { token: 'token-error' } } as unknown as Request;
      const res = makeRes();

      await previewInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: 'Não foi possível processar o convite. Tente novamente.'
      });
    });
  });

  describe('acceptInviteHandler (POST /api/sponsor-invites/:token/accept)', () => {
    it('retorna 400 TERMS_NOT_ACCEPTED se termsAccepted !== true', async () => {
      const req = {
        params: { token: 'valid-token' },
        user: { uid: 'user-1' },
        body: { ...base, termsAccepted: false }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'TERMS_NOT_ACCEPTED',
        message: expect.stringContaining('É necessário aceitar os termos')
      });
      expect(acceptInvite).not.toHaveBeenCalled();
    });

    it('retorna 400 INVALID_PAYLOAD se o corpo do formulário for inválido', async () => {
      const req = {
        params: { token: 'valid-token' },
        user: { uid: 'user-1' },
        body: { ...base, phone: '123', termsAccepted: true }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVALID_PAYLOAD',
        message: 'phone inválido.'
      });
      expect(acceptInvite).not.toHaveBeenCalled();
    });

    it('retorna 201 com o usuário quando o aceite é concluído com sucesso', async () => {
      const mockUser = { uid: 'user-1', role: 'SPONSOR', sponsorId: 'sp-1' };
      vi.mocked(acceptInvite).mockResolvedValueOnce(mockUser as any);

      const req = {
        params: { token: 'valid-token' },
        user: { uid: 'user-1', email: 'sponsor@corp.com' },
        body: { ...base, termsAccepted: true }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(acceptInvite).toHaveBeenCalledWith(
        'valid-token',
        { uid: 'user-1', email: 'sponsor@corp.com' },
        expect.objectContaining({ firstName: 'Ana', lastName: 'Silva', jobTitle: 'Dev' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('retorna 409 quando o convite já foi utilizado (InviteError 409)', async () => {
      vi.mocked(acceptInvite).mockRejectedValueOnce(
        new InviteError('INVITE_ALREADY_USED', 409, 'Convite já utilizado.')
      );

      const req = {
        params: { token: 'used-token' },
        user: { uid: 'user-1' },
        body: { ...base, termsAccepted: true }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVITE_ALREADY_USED',
        message: 'Convite já utilizado.'
      });
    });

    it('retorna 500 com ROLE_PARTIALLY_UPDATED quando custom claim falha após gravação', async () => {
      vi.mocked(acceptInvite).mockRejectedValueOnce(new RolePartiallyUpdatedError());

      const req = {
        params: { token: 'valid-token' },
        user: { uid: 'user-1' },
        body: { ...base, termsAccepted: true }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ROLE_PARTIALLY_UPDATED',
        message: expect.stringContaining('permissão de patrocinador não foi aplicada')
      });
    });

    it('retorna 500 com INTERNAL_ERROR em caso de erro desconhecido no aceite', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(acceptInvite).mockRejectedValueOnce(new Error('Transaction timeout'));

      const req = {
        params: { token: 'valid-token' },
        user: { uid: 'user-1' },
        body: { ...base, termsAccepted: true }
      } as unknown as Request;
      const res = makeRes();

      await acceptInviteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: 'Não foi possível processar o convite. Tente novamente.'
      });
    });
  });
});

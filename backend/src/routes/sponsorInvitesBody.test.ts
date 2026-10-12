import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Request } from 'express';

vi.mock('../config/firebaseAdmin', () => ({ db: {}, auth: {} }));

import { parseAcceptBody } from './sponsorInvites';
import { debugClientIp } from '../middlewares/rateLimiter';

const base = { firstName: 'Ana', lastName: 'Silva', jobTitle: 'Dev', phone: '34999990000' };

describe('parseAcceptBody (B6)', () => {
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
});

describe('debugClientIp (M4)', () => {
  afterEach(() => vi.restoreAllMocks());
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

  it('com a flag loga uma vez só e nunca a URL/token', () => {
    process.env.DEBUG_CLIENT_IP = '1';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    debugClientIp(req, {} as any, vi.fn());
    debugClientIp(req, {} as any, vi.fn());
    delete process.env.DEBUG_CLIENT_IP;
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SEGREDO');
  });
});

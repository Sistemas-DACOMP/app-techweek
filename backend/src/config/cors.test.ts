import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cors from 'cors';
import { isOriginAllowed, corsOptions } from './cors';

describe('CORS Configuration (KAN-116 / SEC)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isOriginAllowed', () => {
    describe('Requisições sem header Origin (curl, server-to-server, health check)', () => {
      it('permite quando origin é undefined', () => {
        expect(isOriginAllowed(undefined)).toBe(true);
      });

      it('permite quando origin é vazio', () => {
        expect(isOriginAllowed('')).toBe(true);
      });
    });

    describe('Ambiente de desenvolvimento e teste (NODE_ENV !== production)', () => {
      it('permite localhost com qualquer porta em dev', () => {
        process.env.NODE_ENV = 'development';
        expect(isOriginAllowed('http://localhost:5173')).toBe(true);
        expect(isOriginAllowed('http://localhost:3000')).toBe(true);
        expect(isOriginAllowed('http://localhost:8080')).toBe(true);
      });

      it('permite 127.0.0.1 com qualquer porta em dev', () => {
        process.env.NODE_ENV = 'development';
        expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
        expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
      });

      it('permite localhost em ambiente de teste', () => {
        process.env.NODE_ENV = 'test';
        expect(isOriginAllowed('http://localhost:5173')).toBe(true);
      });
    });

    describe('Ambiente de produção (NODE_ENV === production)', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOWED_ORIGINS;
        delete process.env.CORS_ALLOWED_ORIGINS;
      });

      it('bloqueia localhost e 127.0.0.1 se não estiverem em ALLOWED_ORIGINS', () => {
        expect(isOriginAllowed('http://localhost:5173')).toBe(false);
        expect(isOriginAllowed('http://localhost:3000')).toBe(false);
        expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(false);
      });

      it('permite domínios oficiais Firebase Hosting com .web.app', () => {
        expect(isOriginAllowed('https://facom-techweek-2026.web.app')).toBe(true);
        expect(isOriginAllowed('https://facom-techweek.web.app')).toBe(true);
        expect(isOriginAllowed('https://facom-techweek-staging.web.app')).toBe(true);
      });

      it('permite domínios oficiais Firebase Hosting com .firebaseapp.com', () => {
        expect(isOriginAllowed('https://facom-techweek.firebaseapp.com')).toBe(true);
        expect(isOriginAllowed('https://facom-techweek-2026.firebaseapp.com')).toBe(true);
      });

      it('permite origens configuradas via ALLOWED_ORIGINS com suporte a vírgulas e trim', () => {
        process.env.ALLOWED_ORIGINS = 'https://techweek.facom.ufu.br, https://custom-domain.com ,https://staging.ufu.br';
        expect(isOriginAllowed('https://techweek.facom.ufu.br')).toBe(true);
        expect(isOriginAllowed('https://custom-domain.com')).toBe(true);
        expect(isOriginAllowed('https://staging.ufu.br')).toBe(true);
      });

      it('permite origens configuradas via CORS_ALLOWED_ORIGINS (ex: domínios de hosting)', () => {
        process.env.CORS_ALLOWED_ORIGINS = 'https://app-techweek.web.app,https://app-techweek.firebaseapp.com';
        expect(isOriginAllowed('https://app-techweek.web.app')).toBe(true);
        expect(isOriginAllowed('https://app-techweek.firebaseapp.com')).toBe(true);
      });

      it('bloqueia origens não autorizadas ou ataques de phishing', () => {
        expect(isOriginAllowed('https://evil-site.com')).toBe(false);
        expect(isOriginAllowed('https://attacker.org')).toBe(false);
        // Tentativa de sufixar domínio malicioso
        expect(isOriginAllowed('https://facom-techweek.attacker.com')).toBe(false);
        // Tentativa de prefixar domínio oficial
        expect(isOriginAllowed('https://attacker-facom-techweek.web.app')).toBe(false);
        // Tentativa com http em vez de https nos domínios oficiais
        expect(isOriginAllowed('http://facom-techweek.web.app')).toBe(false);
      });
    });
  });

  describe('corsOptions', () => {
    it('possui credentials configurado como true', () => {
      expect(corsOptions.credentials).toBe(true);
    });

    it('restringe os métodos HTTP permitidos', () => {
      expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    });

    it('define os headers permitidos explicitamente', () => {
      expect(corsOptions.allowedHeaders).toEqual(['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']);
    });

    it('invoca o callback com sucesso quando a origem é permitida', () => {
      process.env.NODE_ENV = 'development';
      const originCallback = corsOptions.origin as (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
      const cb = vi.fn();

      originCallback('http://localhost:5173', cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('invoca o callback com erro quando a origem não é permitida', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ALLOWED_ORIGINS;
      const originCallback = corsOptions.origin as (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
      const cb = vi.fn();

      originCallback('https://evil-site.com', cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      const errorArg = cb.mock.calls[0][0];
      expect(errorArg.message).toBe('Origem não permitida pela política de CORS.');
    });
  });

  describe('Integração com middleware Express', () => {
    it('permite requisição de origem autorizada e injeta headers de CORS', () => {
      process.env.NODE_ENV = 'production';
      const corsMiddleware = cors(corsOptions);

      const headers: Record<string, string> = {};
      const req: any = {
        method: 'GET',
        headers: {
          origin: 'https://facom-techweek-2026.web.app'
        }
      };
      const res: any = {
        setHeader: vi.fn((key: string, val: string) => {
          headers[key.toLowerCase()] = val;
        }),
        getHeader: vi.fn((key: string) => headers[key.toLowerCase()])
      };
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(headers['access-control-allow-origin']).toBe('https://facom-techweek-2026.web.app');
      expect(headers['access-control-allow-credentials']).toBe('true');
    });

    it('passa requisição sem Origin adiante sem erro', () => {
      const corsMiddleware = cors(corsOptions);

      const req: any = {
        method: 'GET',
        headers: {}
      };
      const res: any = {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      };
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('rejeita requisição de origem proibida enviando erro para o next', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ALLOWED_ORIGINS;
      const corsMiddleware = cors(corsOptions);

      const req: any = {
        method: 'GET',
        headers: {
          origin: 'https://evil-hacker.com'
        }
      };
      const res: any = {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      };
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const err = next.mock.calls[0][0];
      expect(err.message).toBe('Origem não permitida pela política de CORS.');
    });
  });
});


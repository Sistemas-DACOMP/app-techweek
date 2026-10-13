import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  participantActionLimiter,
  adminBroadcastLimiter,
  adminSponsorLimiter,
  sponsorInviteIpLimiter,
  debugClientIp,
  keyGenerator
} from './rateLimiter';

function makeReq(uid: string | undefined, ip = '127.0.0.1'): Request {
  return {
    user: uid ? { uid } : undefined,
    method: 'POST',
    path: '/x',
    headers: {},
    ip,
    app: {
      get: (_key: string) => false
    }
  } as unknown as Request;
}

function makeRes(): Response {
  const res: any = {};
  res.setHeader = () => res;
  res.getHeader = () => undefined;
  res.removeHeader = () => res;
  res.status = () => res;
  res.json = () => res;
  res.end = () => res;
  res.on = () => res;
  return res as Response;
}

// express-rate-limit real, sem mock — a lib mantém o próprio contador em
// memória por keyGenerator; testamos o comportamento de verdade (não uma
// simulação), com `limit` baixo pra não depender de tempo real.
describe('participantActionLimiter (KAN-75)', () => {
  it('libera as primeiras N requisições do mesmo uid e bloqueia a seguinte com 429 RATE_LIMITED', async () => {
    const uid = `user-${Date.now()}-a`;
    const req = makeReq(uid);
    let blocked: any = null;
    const res = makeRes();
    (res as any).status = (code: number) => {
      blocked = { code };
      return res;
    };
    (res as any).json = (body: any) => {
      if (blocked) blocked.body = body;
      return res;
    };

    let nextCalls = 0;
    const next = () => {
      nextCalls++;
    };

    // limit configurado é 30 (ver rateLimiter.ts) — chama 31 vezes pro mesmo uid.
    for (let i = 0; i < 31; i++) {
      await participantActionLimiter(req, res, next);
    }

    expect(nextCalls).toBe(30);
    expect(blocked).toEqual({ code: 429, body: expect.objectContaining({ error: 'RATE_LIMITED' }) });
  });

  it('uids diferentes têm contadores independentes — um uid bloqueado não afeta outro', async () => {
    const uidA = `user-${Date.now()}-b1`;
    const uidB = `user-${Date.now()}-b2`;
    const reqA = makeReq(uidA);
    const reqB = makeReq(uidB);
    const res = makeRes();
    let nextCalls = 0;
    const next = () => {
      nextCalls++;
    };

    for (let i = 0; i < 30; i++) {
      await participantActionLimiter(reqA, res, next);
    }
    expect(nextCalls).toBe(30); // uidA esgotou o próprio limite

    await participantActionLimiter(reqB, res, next);
    expect(nextCalls).toBe(31); // uidB não foi afetado pelo consumo de uidA
  });
});

describe('adminBroadcastLimiter (KAN-75, KAN-61)', () => {
  it('teto bem mais baixo que o das rotas de participante (10, não 30)', async () => {
    const uid = `admin-${Date.now()}`;
    const req = makeReq(uid);
    const res = makeRes();
    let nextCalls = 0;
    let blockedStatus: number | null = null;
    (res as any).status = (code: number) => {
      blockedStatus = code;
      return res;
    };
    const next = () => {
      nextCalls++;
    };

    for (let i = 0; i < 11; i++) {
      await adminBroadcastLimiter(req, res, next);
    }

    expect(nextCalls).toBe(10);
    expect(blockedStatus).toBe(429);
  });
});

describe('adminSponsorLimiter (KAN-124 / ERR-061)', () => {
  it('permite até 60 requisições do mesmo admin e bloqueia a 61ª com 429', async () => {
    const uid = `admin-sponsor-${Date.now()}`;
    const req = makeReq(uid);
    const res = makeRes();
    let nextCalls = 0;
    let blockedStatus: number | null = null;
    (res as any).status = (code: number) => {
      blockedStatus = code;
      return res;
    };
    const next = () => {
      nextCalls++;
    };

    for (let i = 0; i < 61; i++) {
      await adminSponsorLimiter(req, res, next);
    }

    expect(nextCalls).toBe(60);
    expect(blockedStatus).toBe(429);
  });
});

describe('sponsorInviteIpLimiter (KAN-124 / ERR-061)', () => {
  it('limita requisições por IP (60 permitidas, 61ª bloqueada)', async () => {
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const req = makeReq(undefined, testIp);
    const res = makeRes();
    let nextCalls = 0;
    let blocked: any = null;
    (res as any).status = (code: number) => {
      blocked = { code };
      return res;
    };
    (res as any).json = (body: any) => {
      if (blocked) blocked.body = body;
      return res;
    };
    const next = () => {
      nextCalls++;
    };

    for (let i = 0; i < 61; i++) {
      await sponsorInviteIpLimiter(req, res, next);
    }

    expect(nextCalls).toBe(60);
    expect(blocked).toEqual({
      code: 429,
      body: expect.objectContaining({ error: 'RATE_LIMITED' })
    });
  });

  it('IPs distintos possuem baldes independentes', async () => {
    const base = Math.floor(Math.random() * 100) + 1;
    const ipA = `203.0.113.${base}`;
    const ipB = `203.0.113.${base + 1}`;
    const reqA = makeReq(undefined, ipA);
    const reqB = makeReq(undefined, ipB);
    const res = makeRes();
    let nextCalls = 0;
    const next = () => {
      nextCalls++;
    };

    for (let i = 0; i < 60; i++) {
      await sponsorInviteIpLimiter(reqA, res, next);
    }
    expect(nextCalls).toBe(60);

    await sponsorInviteIpLimiter(reqB, res, next);
    expect(nextCalls).toBe(61);
  });
});

describe('keyGenerator & fallback de segurança (ERR-061 / Security)', () => {
  it('retorna uid do usuário quando autenticado sem emitir erro', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = makeReq('user-auth-1');

    const key = keyGenerator(req);

    expect(key).toBe('user-auth-1');
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('quando req.user está ausente, alerta no console e gera chave única por randomUUID (evita balde compartilhado)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req1 = makeReq(undefined);
    const req2 = makeReq(undefined);

    const key1 = keyGenerator(req1);
    const key2 = keyGenerator(req2);

    expect(errSpy).toHaveBeenCalledTimes(2);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('rateLimiter: req.user.uid ausente'),
      'POST',
      '/x'
    );
    expect(key1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(key2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(key1).not.toBe(key2);
    errSpy.mockRestore();
  });
});

describe('debugClientIp (ERR-061 / Ops)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('chama next() sem logar no console se DEBUG_CLIENT_IP não estiver configurado', () => {
    delete process.env.DEBUG_CLIENT_IP;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const req = makeReq(undefined, '10.0.0.1');
    const res = makeRes();
    const next = vi.fn();

    debugClientIp(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('loga diagnóstico quando DEBUG_CLIENT_IP for "1"', () => {
    process.env.DEBUG_CLIENT_IP = '1';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const req = {
      ...makeReq(undefined, '10.0.0.5'),
      headers: { 'x-forwarded-for': '203.0.113.195' }
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    debugClientIp(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DEBUG_CLIENT_IP'),
      expect.anything(),
      expect.anything(),
      '203.0.113.195'
    );
    warnSpy.mockRestore();
  });
});

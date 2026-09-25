import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { participantActionLimiter, adminBroadcastLimiter } from './rateLimiter';

function makeReq(uid: string | undefined): Request {
  return { user: uid ? { uid } : undefined, method: 'POST', path: '/x', headers: {} } as unknown as Request;
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

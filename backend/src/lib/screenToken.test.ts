import { describe, it, expect, beforeAll } from 'vitest';
import { issueScreenToken, verifyScreenToken } from './screenToken';

beforeAll(() => {
  process.env.SCREEN_TOKEN_SECRET = 'test-secret-kan-51-com-pelo-menos-32-chars';
});

describe('issueScreenToken / verifyScreenToken (KAN-51/D1 — QR dinâmico do telão)', () => {
  it('token emitido é válido dentro do TTL de 5 minutos', () => {
    const now = Date.now();
    const { token, expiresAt } = issueScreenToken('activity-1', now);

    expect(expiresAt).toBe(now + 5 * 60 * 1000);
    expect(verifyScreenToken(token, now + 60_000)).toEqual({ valid: true, activityId: 'activity-1' });
  });

  it('token expira depois de 5 minutos', () => {
    const now = Date.now();
    const { token, expiresAt } = issueScreenToken('activity-1', now);

    expect(verifyScreenToken(token, expiresAt + 1)).toEqual({ valid: false, reason: 'EXPIRED' });
  });

  it('assinatura adulterada é rejeitada', () => {
    const now = Date.now();
    const { token } = issueScreenToken('activity-1', now);

    const [activityId, expiresAtRaw, signature] = Buffer.from(token, 'base64url').toString('utf8').split('.');
    // Flip do último char do hex: continua um hex válido de mesmo tamanho, então
    // cai na comparação timingSafeEqual em vez do early-return de tamanho diferente.
    const flipped = signature.at(-1) === '0' ? '1' : '0';
    const tamperedSignature = signature.slice(0, -1) + flipped;
    const tampered = Buffer.from(`${activityId}.${expiresAtRaw}.${tamperedSignature}`).toString('base64url');

    expect(verifyScreenToken(tampered, now)).toEqual({ valid: false, reason: 'BAD_SIGNATURE' });
  });

  it('rejeita token com activityId trocado sem re-assinar (não dá pra reusar um QR pra outra atividade)', () => {
    const now = Date.now();
    const { token } = issueScreenToken('activity-A', now);

    const [, expiresAtRaw, signature] = Buffer.from(token, 'base64url').toString('utf8').split('.');
    const swapped = Buffer.from(`activity-B.${expiresAtRaw}.${signature}`).toString('base64url');

    expect(verifyScreenToken(swapped, now)).toEqual({ valid: false, reason: 'BAD_SIGNATURE' });
  });

  it('rejeita token malformado (não decodifica em activityId.expiresAt.assinatura)', () => {
    const garbage = Buffer.from('lixo-sem-pontos').toString('base64url');
    expect(verifyScreenToken(garbage, Date.now())).toEqual({ valid: false, reason: 'MALFORMED' });
  });
});

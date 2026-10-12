import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createFakeDb } from './fakeFirestore.testutil';

const fake = createFakeDb();

vi.mock('../config/firebaseAdmin', () => ({
  get db() {
    return fake.db;
  },
  auth: {
    getUser: vi.fn(),
    setCustomUserClaims: vi.fn()
  }
}));

vi.mock('firebase-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin')>();
  return { ...actual, firestore: actual.firestore };
});

import * as admin from 'firebase-admin';
import { auth } from '../config/firebaseAdmin';
import {
  acceptInvite,
  getInvitePreview,
  generateToken,
  hashToken,
  normalizeDomain,
  emailInDomain,
  resetInvalidAttempts,
  InviteError,
  RolePartiallyUpdatedError,
  SPONSOR_TERMS_VERSION,
  AcceptProfile
} from './sponsorInvites';
import router, { acceptInviteHandler, previewInviteHandler } from '../routes/sponsorInvites';
import { requireAuth } from '../middlewares/authMiddleware';
import { sponsorInviteIpLimiter } from '../middlewares/rateLimiter';

const profile: AcceptProfile = {
  firstName: 'Ana',
  lastName: 'Silva',
  jobTitle: 'Recrutadora',
  phone: '(34) 99999-0000',
  lookingFor: ['estagio']
};

const future = () => admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3600_000));
const past = () => admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600_000));

function seedSponsor(over: Record<string, any> = {}) {
  fake.store.set('sponsors/sp1', {
    name: 'Kanastra',
    tier: 'DIAMANTE',
    teamLimit: 5,
    booth: null,
    logoUrl: null,
    allowedEmailDomain: null,
    legacyCompanyId: 'kanastra',
    ...over
  });
}

function seedInvite(over: Record<string, any> = {}) {
  const token = generateToken();
  const id = `inv${fake.store.size}`;
  fake.store.set(`sponsorInvites/${id}`, {
    sponsorId: 'sp1',
    tokenHash: hashToken(token),
    email: null,
    status: 'PENDING',
    expiresAt: future(),
    ...over
  });
  return { token, id };
}

const caller = (n: number | string, email = `p${n}@kanastra.com.br`, emailVerified = true) => ({
  uid: `u${n}`,
  email,
  emailVerified
});

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'OK';
  } catch (e: any) {
    return e instanceof InviteError ? e.code : e instanceof RolePartiallyUpdatedError ? 'PARTIAL' : `OTHER:${e?.message}`;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.store.clear();
  resetInvalidAttempts();
  (auth.getUser as any).mockResolvedValue({ customClaims: { foo: 1 } });
  (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('helpers de domínio', () => {
  it('normaliza e compara por igualdade exata', () => {
    expect(normalizeDomain(' @Kanastra.com.br ')).toBe('kanastra.com.br');
    expect(normalizeDomain('kanastra')).toBeNull();
    expect(emailInDomain('a@kanastra.com.br', 'kanastra.com.br')).toBe(true);
    expect(emailInDomain('a@kanastra.com.br.evil.com', 'kanastra.com.br')).toBe(false);
    expect(emailInDomain('a@sub.kanastra.com.br', 'kanastra.com.br')).toBe(false);
    expect(emailInDomain('a@evilkanastra.com.br', 'kanastra.com.br')).toBe(false);
  });
});

describe('acceptInvite (KAN-124)', () => {
  it('N aceites paralelos com 1 vaga = exatamente 1 sucesso', async () => {
    seedSponsor({ teamLimit: 1 });
    const { token } = seedInvite(); // genérico, multiuso
    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => code(acceptInvite(token, caller(n), profile))));
    expect(results.filter((r) => r === 'OK')).toHaveLength(1);
    expect(results.filter((r) => r === 'TEAM_FULL')).toHaveLength(4);
    const members = [...fake.store.keys()].filter((k) => k.startsWith('sponsors/sp1/members/'));
    expect(members).toHaveLength(1);
  });

  it('convite genérico é multiuso até encher e continua PENDING', async () => {
    seedSponsor({ teamLimit: 2 });
    const { token, id } = seedInvite();
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('OK');
    expect(await code(acceptInvite(token, caller(2), profile))).toBe('OK');
    expect(await code(acceptInvite(token, caller(3), profile))).toBe('TEAM_FULL');
    expect(fake.store.get(`sponsorInvites/${id}`)!.status).toBe('PENDING');
  });

  it('convite nominal é de uso único (segundo uso, mesmo e-mail, vira INVITE_INVALID)', async () => {
    seedSponsor();
    const { token, id } = seedInvite({ email: 'ana@kanastra.com.br' });
    expect(await code(acceptInvite(token, caller(1, 'Ana@Kanastra.com.br'), profile))).toBe('OK');
    expect(fake.store.get(`sponsorInvites/${id}`)).toMatchObject({ status: 'ACCEPTED', acceptedBy: 'u1' });
    expect(await code(acceptInvite(token, caller(2, 'ana@kanastra.com.br'), profile))).toBe('INVITE_INVALID');
  });

  it('expirado nunca cria conta (410 INVITE_EXPIRED)', async () => {
    seedSponsor();
    const { token } = seedInvite({ expiresAt: past() });
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('INVITE_EXPIRED');
    expect(fake.store.has('users/u1')).toBe(false);
    expect([...fake.store.keys()].some((k) => k.includes('/members/'))).toBe(false);
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('inexistente, usado, revogado e mal formado respondem igual (mesmo código e mensagem)', async () => {
    seedSponsor();
    const used = seedInvite({ status: 'ACCEPTED' });
    const revoked = seedInvite({ status: 'REVOKED' });
    const outcomes: Array<[string, string]> = [];
    for (const t of [generateToken(), used.token, revoked.token, 'lixo']) {
      try {
        await acceptInvite(t, caller(1), profile);
      } catch (e: any) {
        outcomes.push([e.code, e.message]);
      }
    }
    expect(outcomes).toHaveLength(4);
    expect(new Set(outcomes.map((o) => o.join('|'))).size).toBe(1);
    expect(outcomes[0][0]).toBe('INVITE_INVALID');
  });

  it('só o hash do token é persistido', async () => {
    seedSponsor();
    const { token } = seedInvite();
    await acceptInvite(token, caller(1), profile);
    expect(JSON.stringify([...fake.store.values()])).not.toContain(token);
  });

  it('e-mail diferente do convite nominal => EMAIL_MISMATCH', async () => {
    seedSponsor();
    const { token } = seedInvite({ email: 'ana@kanastra.com.br' });
    expect(await code(acceptInvite(token, caller(1, 'outra@kanastra.com.br'), profile))).toBe('EMAIL_MISMATCH');
    expect(fake.store.has('users/u1')).toBe(false);
  });

  it('domínio forjado é recusado; igualdade exata passa', async () => {
    seedSponsor({ allowedEmailDomain: 'kanastra.com.br' });
    const { token } = seedInvite();
    for (const email of ['x@kanastra.com.br.evil.com', 'x@evilkanastra.com.br', 'x@sub.kanastra.com.br', 'x@gmail.com']) {
      expect(await code(acceptInvite(token, caller('f', email), profile))).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
    }
    expect(await code(acceptInvite(token, caller(1, 'ok@kanastra.com.br'), profile))).toBe('OK');
  });

  it('domínio restrito exige e-mail verificado', async () => {
    seedSponsor({ allowedEmailDomain: 'kanastra.com.br' });
    const { token } = seedInvite();
    expect(await code(acceptInvite(token, caller(1, 'ok@kanastra.com.br', false), profile))).toBe('EMAIL_NOT_VERIFIED');
  });

  it('conta já cadastrada => ALREADY_REGISTERED (mensagem genérica) e não vira SPONSOR', async () => {
    seedSponsor();
    fake.store.set('users/u1', { role: 'PARTICIPANT', termsAcceptedAt: 'x' });
    const { token } = seedInvite();
    await expect(acceptInvite(token, caller(1), profile)).rejects.toMatchObject({ code: 'ALREADY_REGISTERED', httpStatus: 409 });
    expect(fake.store.get('users/u1')!.role).toBe('PARTICIPANT');
  });

  it('grava SPONSOR com sponsorId do convite, termo versionado e claim com merge', async () => {
    seedSponsor();
    const { token } = seedInvite();
    const out = await acceptInvite(token, caller(1), profile);
    expect(out).toEqual({ uid: 'u1', role: 'SPONSOR', sponsorId: 'sp1' });
    expect(fake.store.get('users/u1')).toMatchObject({
      role: 'SPONSOR',
      sponsorId: 'sp1',
      jobTitle: 'Recrutadora',
      sponsorTermsVersion: SPONSOR_TERMS_VERSION,
      lookingFor: ['estagio']
    });
    expect(fake.store.get('users/u1')!.termsAcceptedAt).toBeTruthy();
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('u1', { foo: 1, role: 'SPONSOR' });
  });

  it('claim falha depois do Firestore => ROLE_PARTIALLY_UPDATED', async () => {
    seedSponsor();
    const { token } = seedInvite();
    (auth.setCustomUserClaims as any).mockRejectedValue(new Error('auth fora'));
    await expect(acceptInvite(token, caller(1), profile)).rejects.toBeInstanceOf(RolePartiallyUpdatedError);
    expect(fake.store.get('users/u1')!.role).toBe('SPONSOR');
  });

  it('teto de tentativas inválidas por token => 429 RATE_LIMITED', async () => {
    const ghost = generateToken();
    for (let i = 0; i < 10; i++) expect(await code(acceptInvite(ghost, caller(1), profile))).toBe('INVITE_INVALID');
    expect(await code(acceptInvite(ghost, caller(1), profile))).toBe('RATE_LIMITED');
  });
});

describe('getInvitePreview', () => {
  it('devolve só dados públicos mínimos', async () => {
    seedSponsor({ allowedEmailDomain: 'kanastra.com.br', booth: { code: 'A1', area: 'Hall' } });
    const { token } = seedInvite({ email: 'ana@kanastra.com.br' });
    const view = await getInvitePreview(token);
    expect(view).toMatchObject({
      sponsorName: 'Kanastra',
      tier: 'DIAMANTE',
      booth: { code: 'A1', area: 'Hall' },
      emailLocked: true,
      emailDomain: 'kanastra.com.br'
    });
    expect(Object.keys(view).sort()).toEqual(['booth', 'emailDomain', 'emailLocked', 'expiresAt', 'logoUrl', 'sponsorName', 'tier']);
  });

  it('expirado => 410 e revogado => 404', async () => {
    seedSponsor();
    expect(await code(getInvitePreview(seedInvite({ expiresAt: past() }).token))).toBe('INVITE_EXPIRED');
    expect(await code(getInvitePreview(seedInvite({ status: 'REVOKED' }).token))).toBe('INVITE_INVALID');
  });
});

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('POST /api/sponsor-invites/:token/accept (handler)', () => {
  const req = (token: string, body: any, user: any = caller(1)) => ({ params: { token }, body, user }) as unknown as Request;
  const goodBody = { ...profile, termsAccepted: true };

  it('sem termsAccepted === true => 400 TERMS_NOT_ACCEPTED e nada gravado', async () => {
    seedSponsor();
    const { token } = seedInvite();
    for (const termsAccepted of [undefined, false, 'true', 1]) {
      const res = makeRes();
      await acceptInviteHandler(req(token, { ...goodBody, termsAccepted }), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TERMS_NOT_ACCEPTED' }));
    }
    expect(fake.store.has('users/u1')).toBe(false);
  });

  it('payload inválido => 400 INVALID_PAYLOAD', async () => {
    seedSponsor();
    const { token } = seedInvite();
    for (const bad of [{ ...goodBody, firstName: '' }, { ...goodBody, phone: '12' }, { ...goodBody, lookingFor: 'x' }, { ...goodBody, photoURL: 'http://x' }]) {
      const res = makeRes();
      await acceptInviteHandler(req(token, bad), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
    }
  });

  it('role/sponsorId/teamLimit/email vindos do cliente são ignorados', async () => {
    seedSponsor({ teamLimit: 3 });
    const { token } = seedInvite({ email: 'p1@kanastra.com.br' });
    const res = makeRes();
    await acceptInviteHandler(
      req(token, { ...goodBody, role: 'ADMIN', sponsorId: 'outro', teamLimit: 999, email: 'ceo@outra.com', uid: 'uX' }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: { uid: 'u1', role: 'SPONSOR', sponsorId: 'sp1' } });
    expect(fake.store.get('users/u1')).toMatchObject({ role: 'SPONSOR', sponsorId: 'sp1', email: 'p1@kanastra.com.br' });
    expect(fake.store.get('sponsors/sp1')!.teamLimit).toBe(3);
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('u1', expect.objectContaining({ role: 'SPONSOR' }));
  });

  it('claim falha => 500 ROLE_PARTIALLY_UPDATED; token inexistente => 404', async () => {
    seedSponsor();
    const { token } = seedInvite();
    (auth.setCustomUserClaims as any).mockRejectedValue(new Error('x'));
    const res = makeRes();
    await acceptInviteHandler(req(token, goodBody), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ROLE_PARTIALLY_UPDATED' }));

    const res2 = makeRes();
    await acceptInviteHandler(req(generateToken(), goodBody, caller(2)), res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('GET de preview expirado devolve 410', async () => {
    seedSponsor();
    const { token } = seedInvite({ expiresAt: past() });
    const res = makeRes();
    await previewInviteHandler({ params: { token } } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(410);
  });

  it('limiter por IP roda antes de requireAuth em ambas as rotas públicas', () => {
    const stack = (router as unknown as { stack: any[] }).stack;
    const accept = stack.find((l) => l.route?.path === '/:token/accept').route.stack.map((l: any) => l.handle);
    expect(accept.indexOf(sponsorInviteIpLimiter)).toBeGreaterThanOrEqual(0);
    expect(accept.indexOf(sponsorInviteIpLimiter)).toBeLessThan(accept.indexOf(requireAuth));
    const get = stack.find((l) => l.route?.path === '/:token').route.stack.map((l: any) => l.handle);
    expect(get[0]).toBe(sponsorInviteIpLimiter);
  });
});

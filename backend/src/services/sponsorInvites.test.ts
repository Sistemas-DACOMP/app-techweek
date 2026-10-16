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

vi.mock('./emailService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./emailService')>();
  return {
    ...actual,
    sendSponsorInviteEmail: vi.fn(),
    buildInviteLink: vi.fn((token: string) => `https://app.example/#/sponsor/invite/${token}`)
  };
});

import * as admin from 'firebase-admin';
import { auth } from '../config/firebaseAdmin';
import {
  acceptInvite,
  getInvitePreview,
  prepareInvite,
  dispatchInvite,
  INVITE_TTL_MS,
  GENERIC_INVITE_TTL_MS,
  generateToken,
  hashToken,
  normalizeDomain,
  emailInDomain,
  isTokenLocked,
  recordInvalidAttempt,
  resetInvalidAttempts,
  InviteError,
  RolePartiallyUpdatedError,
  SPONSOR_TERMS_VERSION,
  AcceptProfile
} from './sponsorInvites';
import { sendSponsorInviteEmail, buildInviteLink } from './emailService';
import router, { acceptInviteHandler, previewInviteHandler } from '../routes/sponsorInvites';
import { requireAuth } from '../middlewares/authMiddleware';
import { sponsorInviteIpLimiter } from '../middlewares/rateLimiter';

const profile: AcceptProfile = {
  firstName: 'Ana',
  lastName: 'Silva',
  jobTitle: 'Recrutadora',
  phone: '(34) 99999-0000',
  lookingFor: ['Estágio']
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
    allowedEmailDomain: 'kanastra.com.br',
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
      lookingFor: ['Estágio']
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

  it('ERR-065: flooding com milhares de tokens falsos não zera bloqueios ativos (resiste a bypass de rate limit)', async () => {
    const ghost = generateToken();
    const ghostHash = hashToken(ghost);

    // 10 tentativas inválidas bloqueiam o token
    for (let i = 0; i < 10; i++) {
      expect(await code(acceptInvite(ghost, caller(1), profile))).toBe('INVITE_INVALID');
    }
    expect(isTokenLocked(ghostHash)).toBe(true);
    expect(await code(acceptInvite(ghost, caller(1), profile))).toBe('RATE_LIMITED');

    // Atacante tenta floodar o cache com mais de 5000 tokens inválidos novos para forçar limpeza total
    for (let i = 0; i < 5050; i++) {
      recordInvalidAttempt(`attacker-flood-token-${i}`);
    }

    // Com o algoritmo anterior (invalidAttempts.clear()), o token bloqueado teria sido apagado
    // e o invasor teria burlado o bloqueio (retornando INVITE_INVALID em vez de RATE_LIMITED).
    // Com a purga seletiva e priorização de tokens bloqueados, o token bloqueado continua protegido
    // contra despejo causado por flood de tentativas efêmeras.
    expect(isTokenLocked(ghostHash)).toBe(true);
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

describe('prepareInvite e dispatchInvite (KAN-124 / ERR-064)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = 'https://app.example/';
  });

  describe('prepareInvite', () => {
    it('cria convite nominal com TTL de 7 dias (INVITE_TTL_MS) e status PENDING', () => {
      const before = Date.now();
      const prepared = prepareInvite('sp1', 'recrutador@kanastra.com.br', 'admin-1');
      const after = Date.now();

      expect(prepared.ref).toBeDefined();
      expect(prepared.ref.path).toMatch(/^sponsorInvites\//);
      expect(prepared.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(prepared.data.tokenHash).toBe(hashToken(prepared.token));
      expect(prepared.data.sponsorId).toBe('sp1');
      expect(prepared.data.email).toBe('recrutador@kanastra.com.br');
      expect(prepared.data.status).toBe('PENDING');
      expect(prepared.data.createdBy).toBe('admin-1');
      expect(prepared.data.resentFromInviteId).toBeNull();

      // TTL nominal: 7 dias
      const expiresAtMs = prepared.expiresAt.getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + INVITE_TTL_MS);
      expect(expiresAtMs).toBeLessThanOrEqual(after + INVITE_TTL_MS);
    });

    it('cria convite genérico (email null) com TTL de 48 horas (GENERIC_INVITE_TTL_MS)', () => {
      const before = Date.now();
      const prepared = prepareInvite('sp1', null, 'admin-1');
      const after = Date.now();

      expect(prepared.data.email).toBeNull();
      const expiresAtMs = prepared.expiresAt.getTime();
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + GENERIC_INVITE_TTL_MS);
      expect(expiresAtMs).toBeLessThanOrEqual(after + GENERIC_INVITE_TTL_MS);
    });

    it('registra resentFromInviteId quando informado', () => {
      const prepared = prepareInvite('sp1', 'a@b.com', 'admin-1', 'inv-original-123');
      expect(prepared.data.resentFromInviteId).toBe('inv-original-123');
    });
  });

  describe('dispatchInvite', () => {
    it('para convite nominal dispara e-mail com link e retorna emailSent: true em caso de sucesso', async () => {
      (sendSponsorInviteEmail as any).mockResolvedValue(true);

      const prepared = prepareInvite('sp1', 'ana@kanastra.com.br', 'admin-1');
      const result = await dispatchInvite(prepared, 'ana@kanastra.com.br', 'Kanastra');

      expect(result.inviteId).toBe(prepared.ref.id);
      expect(result.email).toBe('ana@kanastra.com.br');
      expect(result.expiresAt).toBe(prepared.expiresAt.toISOString());
      expect(result.link).toBe(`https://app.example/#/sponsor/invite/${prepared.token}`);
      expect(result.emailSent).toBe(true);

      expect(sendSponsorInviteEmail).toHaveBeenCalledWith({
        to: 'ana@kanastra.com.br',
        sponsorName: 'Kanastra',
        link: result.link,
        expiresAt: prepared.expiresAt
      });
    });

    it('para convite nominal propaga emailSent: false quando o envio de e-mail falha', async () => {
      (sendSponsorInviteEmail as any).mockResolvedValue(false);

      const prepared = prepareInvite('sp1', 'falha@kanastra.com.br', 'admin-1');
      const result = await dispatchInvite(prepared, 'falha@kanastra.com.br', 'Kanastra');

      expect(result.emailSent).toBe(false);
      expect(result.link).toContain(prepared.token);
    });

    it('para convite genérico (email null) não dispara e-mail e retorna emailSent: false', async () => {
      vi.clearAllMocks();

      const prepared = prepareInvite('sp1', null, 'admin-1');
      const result = await dispatchInvite(prepared, null, 'Kanastra');

      expect(sendSponsorInviteEmail).not.toHaveBeenCalled();
      expect(result.email).toBeNull();
      expect(result.emailSent).toBe(false);
      expect(result.link).toContain(prepared.token);
    });
  });
});


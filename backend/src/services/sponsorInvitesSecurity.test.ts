import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb } from './fakeFirestore.testutil';

const fake = createFakeDb();

vi.mock('../config/firebaseAdmin', () => ({
  get db() {
    return fake.db;
  },
  auth: { getUser: vi.fn(), setCustomUserClaims: vi.fn() }
}));

vi.mock('firebase-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin')>();
  return { ...actual, firestore: actual.firestore };
});

import * as admin from 'firebase-admin';
import { auth } from '../config/firebaseAdmin';
import {
  acceptInvite,
  generateToken,
  hashToken,
  resetInvalidAttempts,
  InviteError,
  RolePartiallyUpdatedError,
  AcceptProfile
} from './sponsorInvites';

const profile: AcceptProfile = { firstName: 'A', lastName: 'B', jobTitle: 'Dev', phone: '34999990000', lookingFor: [] };
const future = () => admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3600_000));
const caller = (n: number, email = `p${n}@kanastra.com.br`, emailVerified = true) => ({ uid: `u${n}`, email, emailVerified });

function seedSponsor(over: Record<string, any> = {}) {
  fake.store.set('sponsors/sp1', {
    name: 'Kanastra',
    tier: 'DIAMANTE',
    teamLimit: 5,
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
  (auth.getUser as any).mockResolvedValue({ customClaims: {} });
  (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('revisão de segurança KAN-124 (aceite)', () => {
  it('A2: convite genérico em sponsor sem allowedEmailDomain nunca é aceito', async () => {
    seedSponsor({ allowedEmailDomain: null });
    const { token } = seedInvite();
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('INVITE_INVALID');
    expect(fake.store.has('users/u1')).toBe(false);
  });

  it('M1: convite nominal também exige e-mail verificado', async () => {
    seedSponsor({ allowedEmailDomain: null });
    const { token } = seedInvite({ email: 'ana@acme.com' });
    expect(await code(acceptInvite(token, caller(1, 'ana@acme.com', false), profile))).toBe('EMAIL_NOT_VERIFIED');
    expect(fake.store.has('users/u1')).toBe(false);
    expect(await code(acceptInvite(token, caller(1, 'ana@acme.com', true), profile))).toBe('OK');
  });

  it('M2: nunca rebaixa ADMIN/STAFF (claim admin, claim role ou role no doc) e não mexe nas claims', async () => {
    seedSponsor();
    const { token } = seedInvite();
    for (const claims of [{ admin: true }, { role: 'ADMIN' }, { role: 'STAFF' }]) {
      (auth.getUser as any).mockResolvedValue({ customClaims: claims });
      expect(await code(acceptInvite(token, caller(1), profile))).toBe('ALREADY_REGISTERED');
    }
    (auth.getUser as any).mockResolvedValue({ customClaims: {} });
    fake.store.set('users/u2', { role: 'ADMIN' });
    expect(await code(acceptInvite(token, caller(2), profile))).toBe('ALREADY_REGISTERED');
    expect(fake.store.get('users/u2')).toEqual({ role: 'ADMIN' });
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(fake.store.has('users/u1')).toBe(false);

    (auth.getUser as any).mockResolvedValue({ customClaims: { role: 'PARTICIPANT' } });
    expect(await code(acceptInvite(token, caller(3), profile))).toBe('OK');
  });

  it('M3: falha do claim seguida de retry dá sucesso, sem duplicar membro', async () => {
    seedSponsor({ teamLimit: 1 });
    const { token, id } = seedInvite({ email: 'p1@kanastra.com.br' });
    (auth.setCustomUserClaims as any).mockRejectedValueOnce(new Error('auth fora'));
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('PARTIAL');
    expect(fake.store.get(`sponsorInvites/${id}`)!.status).toBe('ACCEPTED');

    expect(await acceptInvite(token, caller(1), profile)).toEqual({ uid: 'u1', role: 'SPONSOR', sponsorId: 'sp1' });
    expect(auth.setCustomUserClaims).toHaveBeenLastCalledWith('u1', expect.objectContaining({ role: 'SPONSOR' }));
    expect([...fake.store.keys()].filter((k) => k.includes('/members/'))).toHaveLength(1);
    // outro usuário com o mesmo token nominal continua barrado
    expect(await code(acceptInvite(token, caller(2, 'p1@kanastra.com.br'), profile))).toBe('INVITE_INVALID');
  });

  it('M3: replay num convite genérico com equipe cheia (já é membro) não vira TEAM_FULL', async () => {
    seedSponsor({ teamLimit: 1 });
    const { token } = seedInvite();
    (auth.setCustomUserClaims as any).mockRejectedValueOnce(new Error('x'));
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('PARTIAL');
    expect(await code(acceptInvite(token, caller(1), profile))).toBe('OK');
    expect(await code(acceptInvite(token, caller(2), profile))).toBe('TEAM_FULL');
  });
});

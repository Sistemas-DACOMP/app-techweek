import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createFakeDb } from '../services/fakeFirestore.testutil';

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

import {
  createSponsorHandler,
  createInvitesHandler,
  resendInviteHandler,
  updateSponsorHandler
} from './sponsorsAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}
const req = (body: any = {}, params: any = {}) =>
  ({ body, params, user: { uid: 'admin-1', role: 'ADMIN' } }) as unknown as Request;
const sent = (res: Response) => (res.json as any).mock.calls[0][0];
const DAY = 24 * 3600_000;

beforeEach(() => {
  vi.clearAllMocks();
  fake.store.clear();
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('A2: link genérico exige domínio', () => {
  it('POST /sponsors sem emails e sem domínio => 400 SPONSOR_DOMAIN_REQUIRED_FOR_LINK, nada gravado', async () => {
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sent(res).error).toBe('SPONSOR_DOMAIN_REQUIRED_FOR_LINK');
    expect(fake.store.size).toBe(0);
  });

  it('POST /sponsors/:id/invites sem emails em sponsor sem domínio => 400; com domínio => 201', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', emails: ['a@acme.com'] }), res0);
    const { sponsorId } = sent(res0);
    const bad = makeRes();
    await createInvitesHandler(req({}, { id: sponsorId }), bad);
    expect(bad.status).toHaveBeenCalledWith(400);
    expect(sent(bad).error).toBe('SPONSOR_DOMAIN_REQUIRED_FOR_LINK');

    const patch = makeRes();
    await updateSponsorHandler(req({ allowedEmailDomain: 'acme.com' }, { id: sponsorId }), patch);
    const ok = makeRes();
    await createInvitesHandler(req({}, { id: sponsorId }), ok);
    expect(ok.status).toHaveBeenCalledWith(201);
  });

  it('reenviar link genérico depois que o domínio foi removido => 400', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', allowedEmailDomain: 'acme.com' }), res0);
    const { sponsorId, invites } = sent(res0);
    await updateSponsorHandler(req({ allowedEmailDomain: null }, { id: sponsorId }), makeRes());
    const res = makeRes();
    await resendInviteHandler(req({}, { inviteId: invites[0].inviteId }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(fake.store.get(`sponsorInvites/${invites[0].inviteId}`)!.status).toBe('PENDING');
  });

  it('TTL: genérico 48h, nominal 7 dias', async () => {
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', allowedEmailDomain: 'acme.com' }), res);
    const generic = new Date(sent(res).invites[0].expiresAt).getTime() - Date.now();
    expect(generic).toBeGreaterThan(47.9 * 3600_000);
    expect(generic).toBeLessThanOrEqual(48 * 3600_000);

    const res2 = makeRes();
    await createSponsorHandler(req({ name: 'Beta', tier: 'OURO', emails: ['a@beta.com'] }), res2);
    const nominal = new Date(sent(res2).invites[0].expiresAt).getTime() - Date.now();
    expect(nominal).toBeGreaterThan(6.99 * DAY);
    expect(nominal).toBeLessThanOrEqual(7 * DAY);
  });
});

describe('PATCH legacyCompanyId', () => {
  it('aceita um dos 5 valores ou null; rejeita outros', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', emails: ['a@acme.com'] }), res0);
    const { sponsorId } = sent(res0);

    const ok = makeRes();
    await updateSponsorHandler(req({ legacyCompanyId: 'bayer' }, { id: sponsorId }), ok);
    expect(ok.status).toHaveBeenCalledWith(200);
    expect(fake.store.get(`sponsors/${sponsorId}`)!.legacyCompanyId).toBe('bayer');

    for (const bad of ['outra', 'BAYER', 5, '']) {
      const res = makeRes();
      await updateSponsorHandler(req({ legacyCompanyId: bad }, { id: sponsorId }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(fake.store.get(`sponsors/${sponsorId}`)!.legacyCompanyId).toBe('bayer');

    const clear = makeRes();
    await updateSponsorHandler(req({ legacyCompanyId: null }, { id: sponsorId }), clear);
    expect(fake.store.get(`sponsors/${sponsorId}`)!.legacyCompanyId).toBeNull();
  });
});

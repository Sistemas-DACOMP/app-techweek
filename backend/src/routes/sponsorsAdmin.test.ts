import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import router, {
  createSponsorHandler,
  listSponsorsHandler,
  updateSponsorHandler,
  createInvitesHandler,
  resendInviteHandler,
  revokeInviteHandler,
  removeSponsorMemberHandler
} from './sponsorsAdmin';
import * as sponsorInvitesService from '../services/sponsorInvites';
import { acceptInvite, getInvitePreview, hashToken, resetInvalidAttempts, AcceptProfile } from '../services/sponsorInvites';
import { requireRole } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';
import { auth } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}
const req = (body: any = {}, params: any = {}) =>
  ({ body, params, user: { uid: 'admin-1', role: 'ADMIN' } }) as unknown as Request;
const sent = (res: Response) => (res.json as any).mock.calls[0][0];
const profile: AcceptProfile = { firstName: 'A', lastName: 'B', jobTitle: 'Dev', phone: '34999990000', lookingFor: [] };
const tokenOf = (link: string) => link.split('/').pop()!;

beforeEach(() => {
  vi.clearAllMocks();
  fake.store.clear();
  resetInvalidAttempts();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  process.env.APP_BASE_URL = 'https://app.example/';
  (auth.getUser as any).mockResolvedValue({ customClaims: {} });
  (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => vi.unstubAllGlobals());

describe('rotas de admin de patrocinadores', () => {
  it('todas exigem ADMIN (403 para SPONSOR) e têm limiter', () => {
    const stack = (router as unknown as { stack: any[] }).stack.filter((l) => l.route);
    expect(stack).toHaveLength(7);
    for (const layer of stack) {
      const handles = layer.route.stack.map((l: any) => l.handle);
      expect(handles).toContain(adminSponsorLimiter);
      const roleMw = handles[1];
      const res = makeRes();
      const next = vi.fn();
      roleMw({ user: { uid: 's', role: 'SPONSOR' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
    expect(typeof requireRole).toBe('function');
  });
});

describe('POST /api/admin/sponsors', () => {
  it('cria sponsor + convites nominais; link só na resposta, só hash no banco, emailSent:false sem Resend', async () => {
    const res = makeRes();
    await createSponsorHandler(
      req({ name: ' Acme ', tier: 'OURO', emails: ['A@Acme.com', 'a@acme.com', 'b@acme.com'] }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const body = sent(res);
    expect(body.invites).toHaveLength(2);
    expect(body.invites.every((i: any) => i.emailSent === false && i.link.startsWith('https://app.example/#/sponsor/invite/'))).toBe(true);
    const sponsor = fake.store.get(`sponsors/${body.sponsorId}`)!;
    expect(sponsor).toMatchObject({ name: 'Acme', tier: 'OURO', teamLimit: 4, legacyCompanyId: null });
    const stored = JSON.stringify([...fake.store.entries()]);
    for (const i of body.invites) {
      expect(stored).not.toContain(tokenOf(i.link));
      expect(fake.store.get(`sponsorInvites/${i.inviteId}`)).toMatchObject({
        tokenHash: hashToken(tokenOf(i.link)),
        status: 'PENDING'
      });
    }
  });

  it('sem emails cria um link genérico; teamLimit explícito vence o default', async () => {
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'PRATA', teamLimit: 8, allowedEmailDomain: 'acme.com' }), res);
    const body = sent(res);
    expect(body.invites).toEqual([expect.objectContaining({ email: null, emailSent: false })]);
    expect(fake.store.get(`sponsors/${body.sponsorId}`)!.teamLimit).toBe(8);
  });

  it('valida payload (tier, e-mail fora do domínio, domínio inválido, logo http)', async () => {
    for (const bad of [
      { name: 'A', tier: 'BRONZE' },
      { name: '', tier: 'OURO' },
      { name: 'A', tier: 'OURO', allowedEmailDomain: 'acme.com', emails: ['x@acme.com.evil.com'] },
      { name: 'A', tier: 'OURO', allowedEmailDomain: 'sem-ponto' },
      { name: 'A', tier: 'OURO', logoUrl: 'http://x/logo.png' },
      { name: 'A', tier: 'OURO', teamLimit: 0 }
    ]) {
      const res = makeRes();
      await createSponsorHandler(req(bad), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(fake.store.size).toBe(0);
  });

  it('com RESEND_API_KEY chama a API do Resend e marca emailSent; token não vai pro log', async () => {
    process.env.RESEND_API_KEY = 're_test_fake';
    process.env.EMAIL_FROM = 'T <t@example.com>';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', emails: ['a@acme.com'] }), res);
    const invite = sent(res).invites[0];
    expect(invite.emailSent).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_fake');
    expect(JSON.parse(init.body)).toMatchObject({ to: ['a@acme.com'], from: 'T <t@example.com>' });
    expect(JSON.parse(init.body).text).toContain(invite.link);
    const logged = JSON.stringify([...(console.warn as any).mock.calls, ...(console.error as any).mock.calls]);
    expect(logged).not.toContain(tokenOf(invite.link));
  });

  it('falha do Resend não derruba a criação (emailSent:false)', async () => {
    process.env.RESEND_API_KEY = 're_test_fake';
    process.env.EMAIL_FROM = 'T <t@example.com>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', emails: ['a@acme.com'] }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(sent(res).invites[0].emailSent).toBe(false);
  });

  it('retorna 500 INVITES_DISPATCH_FAILED caso o despacho de convites falhe (ERR-086)', async () => {
    vi.spyOn(sponsorInvitesService, 'dispatchInvite').mockRejectedValueOnce(new Error('Erro de envio SMTP'));
    const res = makeRes();
    await createSponsorHandler(
      req({ name: 'Acme Error', tier: 'OURO', emails: ['admin@acme.com'] }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(sent(res)).toEqual({
      error: 'INVITES_DISPATCH_FAILED',
      message: 'Patrocinador criado, mas ocorreu um erro no envio dos convites de e-mail.'
    });
  });
});

describe('reenvio e revogação', () => {
  async function createOne(emails?: string[]) {
    const res = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'OURO', emails }), res);
    const body = sent(res);
    return { sponsorId: body.sponsorId as string, invite: body.invites[0] };
  }

  it('reenvio gera token novo e revoga o antigo (que passa a ser INVITE_INVALID)', async () => {
    const { invite } = await createOne(['a@acme.com']);
    const res = makeRes();
    await resendInviteHandler(req({}, { inviteId: invite.inviteId }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    const fresh = sent(res);
    expect(fresh.inviteId).not.toBe(invite.inviteId);
    expect(tokenOf(fresh.link)).not.toBe(tokenOf(invite.link));
    expect(fake.store.get(`sponsorInvites/${invite.inviteId}`)!.status).toBe('REVOKED');
    expect(fake.store.get(`sponsorInvites/${fresh.inviteId}`)).toMatchObject({
      status: 'PENDING',
      resentFromInviteId: invite.inviteId,
      email: 'a@acme.com'
    });
    await expect(getInvitePreview(tokenOf(invite.link))).rejects.toMatchObject({ code: 'INVITE_INVALID' });
    await expect(getInvitePreview(tokenOf(fresh.link))).resolves.toMatchObject({ sponsorName: 'Acme' });
  });

  it('reenviar/revogar convite aceito => 409; inexistente => 404', async () => {
    const { invite } = await createOne(['a@acme.com']);
    await acceptInvite(tokenOf(invite.link), { uid: 'u1', email: 'a@acme.com', emailVerified: true }, profile);
    for (const handler of [resendInviteHandler, revokeInviteHandler]) {
      const res = makeRes();
      await handler(req({}, { inviteId: invite.inviteId }), res);
      expect(res.status).toHaveBeenCalledWith(409);
      const res404 = makeRes();
      await handler(req({}, { inviteId: 'nao-existe' }), res404);
      expect(res404.status).toHaveBeenCalledWith(404);
    }
  });

  it('revogar é idempotente e bloqueia o aceite', async () => {
    const { invite } = await createOne(['a@acme.com']);
    for (let i = 0; i < 2; i++) {
      const res = makeRes();
      await revokeInviteHandler(req({}, { inviteId: invite.inviteId }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    }
    await expect(
      acceptInvite(tokenOf(invite.link), { uid: 'u1', email: 'a@acme.com', emailVerified: true }, profile)
    ).rejects.toMatchObject({ code: 'INVITE_INVALID' });
  });
});

describe('PATCH, convites extras e listagem', () => {
  it('teamLimit abaixo dos membros => 409 TEAM_LIMIT_BELOW_MEMBERS; acima passa', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'PRATA', allowedEmailDomain: 'acme.com' }), res0);
    const { sponsorId, invites } = sent(res0);
    for (const n of [1, 2]) {
      await acceptInvite(tokenOf(invites[0].link), { uid: `u${n}`, email: `p${n}@acme.com`, emailVerified: true }, profile);
    }
    const low = makeRes();
    await updateSponsorHandler(req({ teamLimit: 1 }, { id: sponsorId }), low);
    expect(low.status).toHaveBeenCalledWith(409);
    expect(sent(low).error).toBe('TEAM_LIMIT_BELOW_MEMBERS');
    expect(fake.store.get(`sponsors/${sponsorId}`)!.teamLimit).toBe(3);

    const ok = makeRes();
    await updateSponsorHandler(req({ teamLimit: 2, name: 'Acme 2' }, { id: sponsorId }), ok);
    expect(ok.status).toHaveBeenCalledWith(200);
    expect(fake.store.get(`sponsors/${sponsorId}`)).toMatchObject({ teamLimit: 2, name: 'Acme 2' });
  });

  it('PATCH 404 para sponsor inexistente e 400 sem campos', async () => {
    const res = makeRes();
    await updateSponsorHandler(req({ name: 'x' }, { id: 'nada' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    const res2 = makeRes();
    await updateSponsorHandler(req({}, { id: 'nada' }), res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('POST /sponsors/:id/invites cria convites e respeita o domínio do sponsor', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'PRATA', allowedEmailDomain: 'acme.com' }), res0);
    const { sponsorId } = sent(res0);
    const bad = makeRes();
    await createInvitesHandler(req({ emails: ['x@outro.com'] }, { id: sponsorId }), bad);
    expect(bad.status).toHaveBeenCalledWith(400);
    const ok = makeRes();
    await createInvitesHandler(req({ emails: ['x@acme.com'] }, { id: sponsorId }), ok);
    expect(ok.status).toHaveBeenCalledWith(201);
    const nf = makeRes();
    await createInvitesHandler(req({}, { id: 'nada' }), nf);
    expect(nf.status).toHaveBeenCalledWith(404);
  });

  it('GET lista membros, limite e convites por status (PENDING vencido conta como EXPIRED)', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme', tier: 'PRATA', allowedEmailDomain: 'acme.com' }), res0);
    const { sponsorId, invites } = sent(res0);
    await acceptInvite(tokenOf(invites[0].link), { uid: 'u1', email: 'p1@acme.com', emailVerified: true }, profile);
    fake.store.set('sponsorInvites/old', {
      sponsorId,
      status: 'PENDING',
      expiresAt: { toDate: () => new Date(Date.now() - 1000) }
    });
    fake.store.set('sponsorInvites/rev', { sponsorId, status: 'REVOKED', expiresAt: { toDate: () => new Date() } });
    const res = makeRes();
    await listSponsorsHandler(req(), res);
    const [s] = sent(res).sponsors;
    expect(s).toMatchObject({ sponsorId, teamLimit: 3, memberCount: 1 });
    expect(s.members[0]).toMatchObject({ uid: 'u1', email: 'p1@acme.com', jobTitle: 'Dev' });
    expect(s.invites).toEqual({ PENDING: 1, ACCEPTED: 0, EXPIRED: 1, REVOKED: 1 });
    expect(JSON.stringify(s)).not.toContain('tokenHash');
  });

  it('aplica limite defensivo de membros e query limit na listagem de sponsors (ERR-087)', async () => {
    const res0 = makeRes();
    await createSponsorHandler(req({ name: 'Acme Paginated', tier: 'PRATA', allowedEmailDomain: 'acme.com' }), res0);
    const { sponsorId } = sent(res0);

    const res = makeRes();
    const reqWithLimit = { ...req(), query: { limit: '10' } } as unknown as Request;
    await listSponsorsHandler(reqWithLimit, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = sent(res);
    expect(body.sponsors).toBeDefined();
    expect(Array.isArray(body.sponsors)).toBe(true);
    const found = body.sponsors.find((s: any) => s.sponsorId === sponsorId);
    expect(found).toBeDefined();
    expect(found.memberCount).toBeDefined();
  });

  describe('DELETE /api/admin/sponsors/:id/members/:memberUid', () => {
    it('retorna 400 para id ou memberUid inválido', async () => {
      const res = makeRes();
      await removeSponsorMemberHandler(req({}, { id: 'invalid/id', memberUid: 'u1' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 404 se sponsor não existir', async () => {
      const res = makeRes();
      await removeSponsorMemberHandler(req({}, { id: 'sp-not-found', memberUid: 'u1' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sent(res).error).toBe('SPONSOR_NOT_FOUND');
    });

    it('retorna 404 se membro não existir no sponsor', async () => {
      fake.store.set('sponsors/sp-1', { name: 'Empresa' });
      const res = makeRes();
      await removeSponsorMemberHandler(req({}, { id: 'sp-1', memberUid: 'u1' }), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sent(res).error).toBe('MEMBER_NOT_FOUND');
    });

    it('remove membro com sucesso pelo admin, reverte role e atualiza auth claims', async () => {
      fake.store.set('sponsors/sp-1', { name: 'Empresa' });
      fake.store.set('sponsors/sp-1/members/u1', { uid: 'u1', jobTitle: 'Dev' });
      fake.store.set('users/u1', { uid: 'u1', role: 'SPONSOR', sponsorId: 'sp-1' });

      const res = makeRes();
      await removeSponsorMemberHandler(req({}, { id: 'sp-1', memberUid: 'u1' }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(sent(res).success).toBe(true);

      expect(fake.store.has('sponsors/sp-1/members/u1')).toBe(false);
      const user = fake.store.get('users/u1')!;
      expect(user.role).toBe('PARTICIPANT');
      expect(user.sponsorId).toBeUndefined();
      expect(auth.setCustomUserClaims).toHaveBeenCalledWith('u1', expect.objectContaining({ role: 'PARTICIPANT' }));
    });
  });
});

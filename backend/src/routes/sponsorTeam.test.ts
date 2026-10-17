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
  getTeamHandler,
  createTeamInvitesHandler,
  removeTeamMemberHandler,
  revokeTeamInviteHandler,
  resendTeamInviteHandler,
  resolveSponsorId
} from './sponsorTeam';
import { requireRole } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';
import { auth } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const req = (opts: { user?: any; body?: any; params?: any; query?: any } = {}) =>
  ({
    user: opts.user || { uid: 'sponsor-user-1', role: 'SPONSOR' },
    body: opts.body || {},
    params: opts.params || {},
    query: opts.query || {}
  }) as unknown as Request;

const sent = (res: Response) => (res.json as any).mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  fake.store.clear();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  process.env.APP_BASE_URL = 'https://app.example/';
  (auth.getUser as any).mockResolvedValue({ customClaims: { role: 'SPONSOR' } });
  (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => vi.unstubAllGlobals());

describe('rotas de equipe do patrocinador (sponsorTeam)', () => {
  it('todas as rotas exigem papel SPONSOR ou ADMIN e possuem rate limiter', () => {
    const stack = (router as unknown as { stack: any[] }).stack.filter((l) => l.route);
    expect(stack.length).toBeGreaterThanOrEqual(5);
    for (const layer of stack) {
      const handles = layer.route.stack.map((l: any) => l.handle);
      expect(handles).toContain(adminSponsorLimiter);
      const roleMw = handles[1];
      const res = makeRes();
      const next = vi.fn();
      // PARTICIPANT deve ser barrado com 403
      roleMw({ user: { uid: 'p', role: 'PARTICIPANT' } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();

      // SPONSOR deve passar
      const nextSponsor = vi.fn();
      roleMw({ user: { uid: 's', role: 'SPONSOR' } }, res, nextSponsor);
      expect(nextSponsor).toHaveBeenCalled();

      // ADMIN deve passar
      const nextAdmin = vi.fn();
      roleMw({ user: { uid: 'a', role: 'ADMIN' } }, res, nextAdmin);
      expect(nextAdmin).toHaveBeenCalled();
    }
  });

  describe('resolveSponsorId', () => {
    it('retorna sponsorId direto do documento do usuário', async () => {
      fake.store.set('users/u1', { uid: 'u1', sponsorId: 'sp-123' });
      const r = req({ user: { uid: 'u1', role: 'SPONSOR' } });
      const id = await resolveSponsorId(r);
      expect(id).toBe('sp-123');
    });

    it('fallback por companyId/empresa legada', async () => {
      fake.store.set('users/u2', { uid: 'u2', companyId: 'kanastra' });
      fake.store.set('sponsors/sp-kanastra', { name: 'Kanastra', legacyCompanyId: 'kanastra' });
      const r = req({ user: { uid: 'u2', role: 'SPONSOR' } });
      const id = await resolveSponsorId(r);
      expect(id).toBe('sp-kanastra');
    });

    it('permite que ADMIN passe sponsorId via query', async () => {
      const r = req({ user: { uid: 'adm-1', role: 'ADMIN' }, query: { sponsorId: 'sp-target' } });
      const id = await resolveSponsorId(r);
      expect(id).toBe('sp-target');
    });
  });

  describe('GET /api/sponsor/team (getTeamHandler)', () => {
    it('retorna 404 se sponsor não for encontrado', async () => {
      const res = makeRes();
      await getTeamHandler(req({ user: { uid: 'u-none', role: 'SPONSOR' } }), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sent(res).error).toBe('SPONSOR_NOT_FOUND');
    });

    it('retorna membros enriquecidos, cota, convites pendentes e marca isCurrentUser', async () => {
      fake.store.set('users/recruiter-1', {
        uid: 'recruiter-1',
        sponsorId: 'sp-acme',
        displayName: 'Alice Silva',
        email: 'alice@acme.com',
        photoURL: 'https://img.example/alice.jpg'
      });
      fake.store.set('users/recruiter-2', {
        uid: 'recruiter-2',
        sponsorId: 'sp-acme',
        firstName: 'Bob',
        lastName: 'Santos',
        email: 'bob@acme.com'
      });
      fake.store.set('sponsors/sp-acme', {
        name: 'Acme Corp',
        tier: 'OURO',
        teamLimit: 4,
        allowedEmailDomain: 'acme.com'
      });
      fake.store.set('sponsors/sp-acme/members/recruiter-1', {
        uid: 'recruiter-1',
        jobTitle: 'Head de Tech',
        joinedAt: new Date('2026-10-10T10:00:00Z')
      });
      fake.store.set('sponsors/sp-acme/members/recruiter-2', {
        uid: 'recruiter-2',
        jobTitle: 'Tech Recruiter',
        joinedAt: new Date('2026-10-11T10:00:00Z')
      });
      fake.store.set('sponsorInvites/inv-1', {
        sponsorId: 'sp-acme',
        email: 'carlos@acme.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000)
      });
      fake.store.set('sponsorInvites/inv-exp', {
        sponsorId: 'sp-acme',
        email: 'old@acme.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 86400000)
      });

      const res = makeRes();
      await getTeamHandler(req({ user: { uid: 'recruiter-1', role: 'SPONSOR' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = sent(res);
      expect(data.name).toBe('Acme Corp');
      expect(data.tier).toBe('OURO');
      expect(data.teamLimit).toBe(4);
      expect(data.memberCount).toBe(2);
      expect(data.availableSlots).toBe(2);
      expect(data.members).toHaveLength(2);

      const alice = data.members.find((m: any) => m.uid === 'recruiter-1');
      expect(alice).toMatchObject({
        uid: 'recruiter-1',
        displayName: 'Alice Silva',
        email: 'alice@acme.com',
        jobTitle: 'Head de Tech',
        isCurrentUser: true
      });

      const bob = data.members.find((m: any) => m.uid === 'recruiter-2');
      expect(bob).toMatchObject({
        uid: 'recruiter-2',
        displayName: 'Bob Santos',
        email: 'bob@acme.com',
        isCurrentUser: false
      });

      // Convite expirado é filtrado de pendingInvites
      expect(data.pendingInvites).toHaveLength(1);
      expect(data.pendingInvites[0].email).toBe('carlos@acme.com');
    });
  });

  describe('POST /api/sponsor/team/invites (createTeamInvitesHandler)', () => {
    beforeEach(() => {
      fake.store.set('users/u-adm', { uid: 'u-adm', sponsorId: 'sp-1' });
      fake.store.set('sponsors/sp-1', {
        name: 'Inova',
        tier: 'PRATA',
        teamLimit: 3,
        allowedEmailDomain: 'inova.com'
      });
      fake.store.set('sponsors/sp-1/members/u-adm', { uid: 'u-adm', jobTitle: 'Líder' });
    });

    it('rejeita se os e-mails não pertencerem ao domínio permitido', async () => {
      const res = makeRes();
      await createTeamInvitesHandler(
        req({ user: { uid: 'u-adm', role: 'SPONSOR' }, body: { emails: ['invalido@gmail.com'] } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(sent(res).error).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
    });

    it('rejeita link genérico se a empresa não tiver allowedEmailDomain configurado', async () => {
      fake.store.set('sponsors/sp-nodomain', { name: 'Sem Dominio', tier: 'PRATA', teamLimit: 3 });
      fake.store.set('users/u-nodomain', { uid: 'u-nodomain', sponsorId: 'sp-nodomain' });

      const res = makeRes();
      await createTeamInvitesHandler(
        req({ user: { uid: 'u-nodomain', role: 'SPONSOR' }, body: { emails: [] } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(sent(res).error).toBe('SPONSOR_DOMAIN_REQUIRED_FOR_LINK');
    });

    it('bloqueia envio se a cota de membros for estourada (409 TEAM_FULL)', async () => {
      // 1 membro existente + cota 3 => cabem 2 convites. Tentar 3 deve estourar.
      const res = makeRes();
      await createTeamInvitesHandler(
        req({
          user: { uid: 'u-adm', role: 'SPONSOR' },
          body: { emails: ['a@inova.com', 'b@inova.com', 'c@inova.com'] }
        }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(sent(res).error).toBe('TEAM_FULL');
    });

    it('cria convites nominais com sucesso e decrementa availableSlots', async () => {
      const res = makeRes();
      await createTeamInvitesHandler(
        req({
          user: { uid: 'u-adm', role: 'SPONSOR' },
          body: { emails: ['dev@inova.com'] }
        }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
      const data = sent(res);
      expect(data.success).toBe(true);
      expect(data.invites).toHaveLength(1);
      expect(data.invites[0].email).toBe('dev@inova.com');
      expect(data.availableSlots).toBe(1); // 3 limit - (1 member + 1 invite) = 1
    });

    it('gera link genérico de convite rápido quando emails não é passado mas domínio existe', async () => {
      const res = makeRes();
      await createTeamInvitesHandler(
        req({
          user: { uid: 'u-adm', role: 'SPONSOR' },
          body: {}
        }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
      const data = sent(res);
      expect(data.success).toBe(true);
      expect(data.invites).toHaveLength(1);
      expect(data.invites[0].email).toBeNull();
      expect(data.invites[0].link).toContain('/#/sponsor/invite/');
    });
  });

  describe('DELETE /api/sponsor/team/members/:memberUid (removeTeamMemberHandler)', () => {
    beforeEach(() => {
      fake.store.set('users/admin-sp', { uid: 'admin-sp', sponsorId: 'sp-corp', role: 'SPONSOR' });
      fake.store.set('users/dev-target', {
        uid: 'dev-target',
        sponsorId: 'sp-corp',
        role: 'SPONSOR',
        email: 'dev@corp.com'
      });
      fake.store.set('sponsors/sp-corp', { name: 'Corp', tier: 'DIAMANTE', teamLimit: 5 });
      fake.store.set('sponsors/sp-corp/members/admin-sp', { uid: 'admin-sp', jobTitle: 'Gestor' });
      fake.store.set('sponsors/sp-corp/members/dev-target', { uid: 'dev-target', jobTitle: 'Engenheiro' });
    });

    it('impede que o usuário se remova a si mesmo (CANNOT_REMOVE_SELF)', async () => {
      const res = makeRes();
      await removeTeamMemberHandler(
        req({
          user: { uid: 'admin-sp', role: 'SPONSOR' },
          params: { memberUid: 'admin-sp' }
        }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(sent(res).error).toBe('CANNOT_REMOVE_SELF');
    });

    it('retorna 404 MEMBER_NOT_FOUND se o membro não pertencer a este patrocinador', async () => {
      const res = makeRes();
      await removeTeamMemberHandler(
        req({
          user: { uid: 'admin-sp', role: 'SPONSOR' },
          params: { memberUid: 'outro-user' }
        }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sent(res).error).toBe('MEMBER_NOT_FOUND');
    });

    it('remove membro com sucesso, reverte role para PARTICIPANT, remove sponsorId e atualiza claims no Auth', async () => {
      const res = makeRes();
      await removeTeamMemberHandler(
        req({
          user: { uid: 'admin-sp', role: 'SPONSOR' },
          params: { memberUid: 'dev-target' }
        }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sent(res).success).toBe(true);

      // Subcoleção members foi deletada
      expect(fake.store.has('sponsors/sp-corp/members/dev-target')).toBe(false);

      // Usuário teve role revertida e sponsorId apagado
      const targetUser = fake.store.get('users/dev-target')!;
      expect(targetUser.role).toBe('PARTICIPANT');
      expect(targetUser.sponsorId).toBeUndefined();

      // Custom claims do Auth foram atualizados
      expect(auth.setCustomUserClaims).toHaveBeenCalledWith('dev-target', expect.objectContaining({ role: 'PARTICIPANT' }));
    });
  });

  describe('DELETE /api/sponsor/team/invites/:inviteId (revokeTeamInviteHandler)', () => {
    beforeEach(() => {
      fake.store.set('users/caller-1', { uid: 'caller-1', sponsorId: 'sp-x' });
      fake.store.set('sponsorInvites/inv-pending', { sponsorId: 'sp-x', status: 'PENDING' });
      fake.store.set('sponsorInvites/inv-accepted', { sponsorId: 'sp-x', status: 'ACCEPTED' });
      fake.store.set('sponsorInvites/inv-other', { sponsorId: 'sp-other', status: 'PENDING' });
    });

    it('revoga convite pendente com sucesso', async () => {
      const res = makeRes();
      await revokeTeamInviteHandler(
        req({ user: { uid: 'caller-1', role: 'SPONSOR' }, params: { inviteId: 'inv-pending' } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(sent(res).success).toBe(true);
      expect(fake.store.get('sponsorInvites/inv-pending')!.status).toBe('REVOKED');
    });

    it('rejeita revogação de convite já aceito (409 INVITE_ALREADY_ACCEPTED)', async () => {
      const res = makeRes();
      await revokeTeamInviteHandler(
        req({ user: { uid: 'caller-1', role: 'SPONSOR' }, params: { inviteId: 'inv-accepted' } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(sent(res).error).toBe('INVITE_ALREADY_ACCEPTED');
    });

    it('rejeita revogação de convite de outro patrocinador (404 INVITE_NOT_FOUND)', async () => {
      const res = makeRes();
      await revokeTeamInviteHandler(
        req({ user: { uid: 'caller-1', role: 'SPONSOR' }, params: { inviteId: 'inv-other' } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sent(res).error).toBe('INVITE_NOT_FOUND');
    });
  });

  describe('POST /api/sponsor/team/invites/:inviteId/resend (resendTeamInviteHandler)', () => {
    beforeEach(() => {
      fake.store.set('users/caller-1', { uid: 'caller-1', sponsorId: 'sp-resend' });
      fake.store.set('sponsors/sp-resend', { name: 'Resend Co', allowedEmailDomain: 'resend.com' });
      fake.store.set('sponsorInvites/inv-old', {
        sponsorId: 'sp-resend',
        email: 'alice@resend.com',
        status: 'PENDING'
      });
    });

    it('marca o convite antigo como REVOKED e gera um novo convite', async () => {
      const res = makeRes();
      await resendTeamInviteHandler(
        req({ user: { uid: 'caller-1', role: 'SPONSOR' }, params: { inviteId: 'inv-old' } }),
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
      const data = sent(res);
      expect(data.email).toBe('alice@resend.com');
      expect(data.link).toContain('/#/sponsor/invite/');
      expect(fake.store.get('sponsorInvites/inv-old')!.status).toBe('REVOKED');
    });
  });
});

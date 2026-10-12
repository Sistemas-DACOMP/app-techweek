import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import {
  SPONSOR_TIERS,
  DEFAULT_TEAM_LIMIT,
  SponsorTier,
  CreatedInvite,
  normalizeDomain,
  normalizeEmail,
  emailInDomain,
  prepareInvite,
  dispatchInvite
} from '../services/sponsorInvites';

const router = Router();

const MAX_EMAILS_PER_CALL = 20;
const MAX_TEAM_LIMIT = 50;

class SponsorNotFoundError extends Error {}
class InviteNotFoundError extends Error {}
class InviteAcceptedError extends Error {}
class TeamLimitBelowMembersError extends Error {}

function bad(res: Response, message: string): void {
  res.status(400).json({ error: 'INVALID_PAYLOAD', message });
}

function toIso(value: any): string | null {
  if (!value) return null;
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function validHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Lista de e-mails opcional: normaliza, deduplica e (se houver domínio) exige igualdade exata. */
function parseEmails(raw: unknown, domain: string | null): string[] | string {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_EMAILS_PER_CALL) {
    return `emails deve ser uma lista com no máximo ${MAX_EMAILS_PER_CALL} itens.`;
  }
  const out = new Set<string>();
  for (const item of raw) {
    const email = normalizeEmail(item);
    if (!email) return 'emails contém um endereço inválido.';
    if (domain && !emailInDomain(email, domain)) return `Todos os e-mails devem ser do domínio @${domain}.`;
    out.add(email);
  }
  return [...out];
}

function parseBooth(raw: unknown): { code: string; area: string } | null | undefined | 'invalid' {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const b = raw as any;
  if (typeof b !== 'object' || typeof b.code !== 'string' || typeof b.area !== 'string') return 'invalid';
  const code = b.code.trim();
  const area = b.area.trim();
  if (!code || !area || code.length > 40 || area.length > 80) return 'invalid';
  return { code, area };
}

/** POST /api/admin/sponsors */
export async function createSponsorHandler(req: Request, res: Response): Promise<void> {
  const { name, logoUrl, tier, booth, teamLimit, allowedEmailDomain, emails } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return bad(res, 'name é obrigatório (até 120 caracteres).');
  }
  if (typeof tier !== 'string' || !SPONSOR_TIERS.includes(tier as SponsorTier)) {
    return bad(res, `tier deve ser um de: ${SPONSOR_TIERS.join(', ')}.`);
  }
  if (logoUrl !== undefined && logoUrl !== null && !validHttpsUrl(logoUrl)) {
    return bad(res, 'logoUrl deve ser uma URL https válida.');
  }
  const boothParsed = parseBooth(booth);
  if (boothParsed === 'invalid') return bad(res, 'booth deve ser { code, area } com textos não vazios.');
  let limit = DEFAULT_TEAM_LIMIT[tier as SponsorTier];
  if (teamLimit !== undefined && teamLimit !== null) {
    if (!Number.isInteger(teamLimit) || teamLimit < 1 || teamLimit > MAX_TEAM_LIMIT) {
      return bad(res, `teamLimit deve ser um inteiro entre 1 e ${MAX_TEAM_LIMIT}.`);
    }
    limit = teamLimit;
  }
  let domain: string | null = null;
  if (allowedEmailDomain !== undefined && allowedEmailDomain !== null && allowedEmailDomain !== '') {
    domain = normalizeDomain(allowedEmailDomain);
    if (!domain) return bad(res, 'allowedEmailDomain inválido (ex: empresa.com.br).');
  }
  const parsedEmails = parseEmails(emails, domain);
  if (typeof parsedEmails === 'string') return bad(res, parsedEmails);

  const adminUid = req.user!.uid;
  const sponsorRef = db.collection('sponsors').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const cleanName = name.trim();

  // Sem e-mails => um link genérico (multiuso até encher ou expirar).
  const targets: Array<string | null> = parsedEmails.length ? parsedEmails : [null];
  const prepared = targets.map((email) => ({ email, ...prepareInvite(sponsorRef.id, email, adminUid) }));

  try {
    const batch = db.batch();
    batch.set(sponsorRef, {
      name: cleanName,
      logoUrl: logoUrl ?? null,
      tier,
      teamLimit: limit,
      booth: boothParsed ?? null,
      allowedEmailDomain: domain,
      legacyCompanyId: null,
      createdBy: adminUid,
      createdAt: now,
      updatedAt: now
    });
    prepared.forEach((p) => batch.set(p.ref, p.data));
    await batch.commit();
  } catch (error) {
    console.error('Erro ao criar patrocinador:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível criar o patrocinador.' });
    return;
  }

  const invites: CreatedInvite[] = await Promise.all(prepared.map((p) => dispatchInvite(p, p.email, cleanName)));
  res.status(201).json({ sponsorId: sponsorRef.id, invites });
}

/** GET /api/admin/sponsors */
export async function listSponsorsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const [sponsorsSnap, invitesSnap] = await Promise.all([
      db.collection('sponsors').get(),
      db.collection('sponsorInvites').get()
    ]);

    const now = Date.now();
    const counts = new Map<string, Record<string, number>>();
    invitesSnap.docs.forEach((d: any) => {
      const inv = d.data();
      const exp = toIso(inv.expiresAt);
      // PENDING vencido conta como EXPIRED (a gravação do status é preguiçosa).
      const status = inv.status === 'PENDING' && exp && new Date(exp).getTime() <= now ? 'EXPIRED' : inv.status;
      const c = counts.get(inv.sponsorId) ?? { PENDING: 0, ACCEPTED: 0, EXPIRED: 0, REVOKED: 0 };
      c[status] = (c[status] ?? 0) + 1;
      counts.set(inv.sponsorId, c);
    });

    const sponsors = await Promise.all(
      sponsorsSnap.docs.map(async (d: any) => {
        const s = d.data();
        const membersSnap = await d.ref.collection('members').get();
        const members = membersSnap.docs.map((m: any) => {
          const md = m.data();
          return { uid: md.uid ?? m.id, email: md.email ?? null, jobTitle: md.jobTitle ?? null, joinedAt: toIso(md.joinedAt) };
        });
        return {
          sponsorId: d.id,
          name: s.name,
          logoUrl: s.logoUrl ?? null,
          tier: s.tier,
          teamLimit: s.teamLimit,
          booth: s.booth ?? null,
          allowedEmailDomain: s.allowedEmailDomain ?? null,
          legacyCompanyId: s.legacyCompanyId ?? null,
          memberCount: members.length,
          members,
          invites: counts.get(d.id) ?? { PENDING: 0, ACCEPTED: 0, EXPIRED: 0, REVOKED: 0 }
        };
      })
    );
    res.status(200).json({ sponsors });
  } catch (error) {
    console.error('Erro ao listar patrocinadores:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível listar os patrocinadores.' });
  }
}

/** PATCH /api/admin/sponsors/:id */
export async function updateSponsorHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidFirestoreId(id)) return bad(res, 'id inválido.');
  const { name, logoUrl, tier, booth, teamLimit, allowedEmailDomain } = req.body ?? {};
  const updates: Record<string, any> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) return bad(res, 'name inválido.');
    updates.name = name.trim();
  }
  if (logoUrl !== undefined) {
    if (logoUrl !== null && !validHttpsUrl(logoUrl)) return bad(res, 'logoUrl deve ser uma URL https válida.');
    updates.logoUrl = logoUrl;
  }
  if (tier !== undefined) {
    if (typeof tier !== 'string' || !SPONSOR_TIERS.includes(tier as SponsorTier)) {
      return bad(res, `tier deve ser um de: ${SPONSOR_TIERS.join(', ')}.`);
    }
    updates.tier = tier;
  }
  if (booth !== undefined) {
    const b = parseBooth(booth);
    if (b === 'invalid') return bad(res, 'booth deve ser { code, area } com textos não vazios.');
    updates.booth = b ?? null;
  }
  if (teamLimit !== undefined) {
    if (!Number.isInteger(teamLimit) || teamLimit < 1 || teamLimit > MAX_TEAM_LIMIT) {
      return bad(res, `teamLimit deve ser um inteiro entre 1 e ${MAX_TEAM_LIMIT}.`);
    }
    updates.teamLimit = teamLimit;
  }
  if (allowedEmailDomain !== undefined) {
    if (allowedEmailDomain === null || allowedEmailDomain === '') {
      updates.allowedEmailDomain = null;
    } else {
      const d = normalizeDomain(allowedEmailDomain);
      if (!d) return bad(res, 'allowedEmailDomain inválido (ex: empresa.com.br).');
      updates.allowedEmailDomain = d;
    }
  }
  if (Object.keys(updates).length === 0) return bad(res, 'Nenhum campo para atualizar.');

  const sponsorRef = db.collection('sponsors').doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const [snap, membersSnap] = await Promise.all([tx.get(sponsorRef), tx.get(sponsorRef.collection('members'))]);
      if (!snap.exists) throw new SponsorNotFoundError();
      if (updates.teamLimit !== undefined && updates.teamLimit < membersSnap.size) throw new TeamLimitBelowMembersError();
      tx.update(sponsorRef, { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
  } catch (error) {
    if (error instanceof SponsorNotFoundError) {
      res.status(404).json({ error: 'SPONSOR_NOT_FOUND', message: 'Patrocinador não encontrado.' });
      return;
    }
    if (error instanceof TeamLimitBelowMembersError) {
      res.status(409).json({
        error: 'TEAM_LIMIT_BELOW_MEMBERS',
        message: 'O limite da equipe não pode ficar abaixo do número de membros já cadastrados.'
      });
      return;
    }
    console.error('Erro ao atualizar patrocinador:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível atualizar o patrocinador.' });
    return;
  }
  res.status(200).json({ success: true, sponsorId: id });
}

/** POST /api/admin/sponsors/:id/invites */
export async function createInvitesHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!isValidFirestoreId(id)) return bad(res, 'id inválido.');

  try {
    const sponsorSnap = await db.collection('sponsors').doc(id).get();
    if (!sponsorSnap.exists) {
      res.status(404).json({ error: 'SPONSOR_NOT_FOUND', message: 'Patrocinador não encontrado.' });
      return;
    }
    const sponsor = sponsorSnap.data() as Record<string, any>;
    const parsedEmails = parseEmails(req.body?.emails, sponsor.allowedEmailDomain ?? null);
    if (typeof parsedEmails === 'string') return bad(res, parsedEmails);

    const targets: Array<string | null> = parsedEmails.length ? parsedEmails : [null];
    const prepared = targets.map((email) => ({ email, ...prepareInvite(id, email, req.user!.uid) }));
    const batch = db.batch();
    prepared.forEach((p) => batch.set(p.ref, p.data));
    await batch.commit();

    const invites = await Promise.all(prepared.map((p) => dispatchInvite(p, p.email, sponsor.name)));
    res.status(201).json({ invites });
  } catch (error) {
    console.error('Erro ao criar convites:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível criar os convites.' });
  }
}

/** POST /api/admin/sponsor-invites/:inviteId/resend — novo token; o antigo vira REVOKED na mesma transação. */
export async function resendInviteHandler(req: Request, res: Response): Promise<void> {
  const { inviteId } = req.params;
  if (!isValidFirestoreId(inviteId)) return bad(res, 'inviteId inválido.');

  const oldRef = db.collection('sponsorInvites').doc(inviteId);
  try {
    const out = await db.runTransaction(async (tx) => {
      const oldSnap = await tx.get(oldRef);
      if (!oldSnap.exists) throw new InviteNotFoundError();
      const old = oldSnap.data() as Record<string, any>;
      if (old.status === 'ACCEPTED') throw new InviteAcceptedError();
      const sponsorSnap = await tx.get(db.collection('sponsors').doc(old.sponsorId));
      if (!sponsorSnap.exists) throw new SponsorNotFoundError();

      const fresh = prepareInvite(old.sponsorId, old.email ?? null, req.user!.uid, inviteId);
      tx.update(oldRef, { status: 'REVOKED' });
      tx.set(fresh.ref, fresh.data);
      return { fresh, email: (old.email ?? null) as string | null, sponsorName: (sponsorSnap.data() as any).name as string };
    });

    const invite = await dispatchInvite(out.fresh, out.email, out.sponsorName);
    res.status(201).json(invite);
  } catch (error) {
    if (error instanceof InviteNotFoundError || error instanceof SponsorNotFoundError) {
      res.status(404).json({ error: 'INVITE_NOT_FOUND', message: 'Convite não encontrado.' });
      return;
    }
    if (error instanceof InviteAcceptedError) {
      res.status(409).json({ error: 'INVITE_ALREADY_ACCEPTED', message: 'Este convite já foi aceito.' });
      return;
    }
    console.error('Erro ao reenviar convite:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível reenviar o convite.' });
  }
}

/** DELETE /api/admin/sponsor-invites/:inviteId — revoga (idempotente). */
export async function revokeInviteHandler(req: Request, res: Response): Promise<void> {
  const { inviteId } = req.params;
  if (!isValidFirestoreId(inviteId)) return bad(res, 'inviteId inválido.');

  const ref = db.collection('sponsorInvites').doc(inviteId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new InviteNotFoundError();
      const status = (snap.data() as any).status;
      if (status === 'ACCEPTED') throw new InviteAcceptedError();
      if (status !== 'REVOKED') tx.update(ref, { status: 'REVOKED' });
    });
  } catch (error) {
    if (error instanceof InviteNotFoundError) {
      res.status(404).json({ error: 'INVITE_NOT_FOUND', message: 'Convite não encontrado.' });
      return;
    }
    if (error instanceof InviteAcceptedError) {
      res.status(409).json({ error: 'INVITE_ALREADY_ACCEPTED', message: 'Este convite já foi aceito e não pode ser revogado.' });
      return;
    }
    console.error('Erro ao revogar convite:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível revogar o convite.' });
    return;
  }
  res.status(200).json({ success: true, inviteId });
}

const guard = [requireAuth, requireRole(['ADMIN']), adminSponsorLimiter];

router.post('/sponsors', ...guard, createSponsorHandler);
router.get('/sponsors', ...guard, listSponsorsHandler);
router.patch('/sponsors/:id', ...guard, updateSponsorHandler);
router.post('/sponsors/:id/invites', ...guard, createInvitesHandler);
router.post('/sponsor-invites/:inviteId/resend', ...guard, resendInviteHandler);
router.delete('/sponsor-invites/:inviteId', ...guard, revokeInviteHandler);

export default router;

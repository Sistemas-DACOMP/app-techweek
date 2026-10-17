import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db, auth } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import {
  prepareInvite,
  dispatchInvite,
  CreatedInvite,
  normalizeEmail,
  emailInDomain,
  DEFAULT_TEAM_LIMIT,
  SponsorTier
} from '../services/sponsorInvites';

const router = Router();

const MAX_EMAILS_PER_CALL = 20;

export class SponsorNotFoundError extends Error {}
export class MemberNotFoundError extends Error {}
export class CannotRemoveSelfError extends Error {}
export class TeamFullError extends Error {
  constructor(public availableSlots: number) {
    super(`A equipe atingiu o limite de vagas disponíveis (${availableSlots}).`);
  }
}
export class InviteNotFoundError extends Error {}
export class InviteAcceptedError extends Error {}
export class DomainRequiredError extends Error {}

function toIso(value: any): string | null {
  if (!value) return null;
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Resolve o sponsorId associado ao usuário logado ou passado na requisição (para ADMIN).
 */
export async function resolveSponsorId(req: Request): Promise<string | null> {
  const user = req.user;
  if (!user) return null;

  // Se for ADMIN, permite especificar o sponsorId via param, query ou body
  if (user.role === 'ADMIN') {
    const candidate =
      (req.params as any)?.sponsorId ||
      (req.query as any)?.sponsorId ||
      (req.body as any)?.sponsorId;
    if (typeof candidate === 'string' && isValidFirestoreId(candidate)) {
      return candidate;
    }
  }

  // Busca no documento do usuário
  const userSnap = await db.collection('users').doc(user.uid).get();
  if (userSnap.exists) {
    const userData = userSnap.data();
    if (userData?.sponsorId && isValidFirestoreId(userData.sponsorId)) {
      return userData.sponsorId;
    }

    // Fallback: empresa/companyId
    const companyKey = (userData?.companyId || userData?.company || userData?.empresa || '').toLowerCase().trim();
    if (companyKey) {
      const directSnap = await db.collection('sponsors').doc(companyKey).get();
      if (directSnap.exists) return directSnap.id;

      const legacySnap = await db.collection('sponsors').where('legacyCompanyId', '==', companyKey).limit(1).get();
      if (!legacySnap.empty) return legacySnap.docs[0].id;
    }
  }

  return null;
}

/**
 * GET /api/sponsor/team
 * Retorna os dados da equipe do patrocinador logado (membros, cota e convites pendentes).
 */
export async function getTeamHandler(req: Request, res: Response): Promise<void> {
  try {
    const sponsorId = await resolveSponsorId(req);
    if (!sponsorId) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado para o usuário logado.'
      });
      return;
    }

    const sponsorSnap = await db.collection('sponsors').doc(sponsorId).get();
    if (!sponsorSnap.exists) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado no sistema.'
      });
      return;
    }

    const sponsor = sponsorSnap.data() as Record<string, any>;
    const tier = (sponsor.tier as SponsorTier) || 'PRATA';
    const teamLimit = Number.isInteger(sponsor.teamLimit) ? sponsor.teamLimit : (DEFAULT_TEAM_LIMIT[tier] || 3);

    const [membersSnap, invitesSnap] = await Promise.all([
      db.collection('sponsors').doc(sponsorId).collection('members').get(),
      db.collection('sponsorInvites').where('sponsorId', '==', sponsorId).get()
    ]);

    const memberDocs = membersSnap.docs;
    const memberUids = memberDocs.map((d: any) => d.id);

    // Enriquecimento dos membros com dados de users/{uid}
    const userDocs = await Promise.all(
      memberUids.map((uid: string) => db.collection('users').doc(uid).get().catch(() => null))
    );
    const usersMap = new Map<string, any>();
    userDocs.forEach((uSnap) => {
      if (uSnap?.exists) {
        usersMap.set(uSnap.id, uSnap.data());
      }
    });

    const members = memberDocs.map((mSnap: any) => {
      const mData = mSnap.data() || {};
      const uData = usersMap.get(mSnap.id) || {};
      const email = uData.email || mData.email || null;
      const firstName = uData.firstName || '';
      const lastName = uData.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = uData.displayName || fullName || email?.split('@')[0] || 'Membro da equipe';

      return {
        uid: mSnap.id,
        email,
        displayName,
        jobTitle: mData.jobTitle || uData.jobTitle || null,
        photoURL: uData.photoURL || null,
        joinedAt: toIso(mData.joinedAt),
        isCurrentUser: mSnap.id === req.user!.uid
      };
    });

    const now = Date.now();
    const pendingInvites = invitesSnap.docs
      .map((d: any) => {
        const inv = d.data();
        const expIso = toIso(inv.expiresAt);
        const expTime = expIso ? new Date(expIso).getTime() : 0;
        const isExpired = expTime <= now;
        return {
          inviteId: d.id,
          email: inv.email || null,
          status: inv.status === 'PENDING' && isExpired ? 'EXPIRED' : inv.status,
          expiresAt: expIso,
          createdAt: toIso(inv.createdAt),
          isExpired
        };
      })
      .filter((inv: any) => inv.status === 'PENDING' && !inv.isExpired);

    const memberCount = members.length;
    const availableSlots = Math.max(0, teamLimit - memberCount);

    res.status(200).json({
      sponsorId,
      name: sponsor.name,
      logoUrl: sponsor.logoUrl || null,
      tier,
      teamLimit,
      memberCount,
      availableSlots,
      allowedEmailDomain: sponsor.allowedEmailDomain || null,
      booth: sponsor.booth || null,
      members,
      pendingInvites
    });
  } catch (error) {
    console.error('Erro ao buscar equipe do patrocinador:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível buscar os dados da equipe do patrocinador.'
    });
  }
}

/**
 * POST /api/sponsor/team/invites
 * Dispara convite nominal ou gera link genérico para novos membros da equipe.
 */
export async function createTeamInvitesHandler(req: Request, res: Response): Promise<void> {
  try {
    const sponsorId = await resolveSponsorId(req);
    if (!sponsorId) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado para o usuário logado.'
      });
      return;
    }

    const sponsorSnap = await db.collection('sponsors').doc(sponsorId).get();
    if (!sponsorSnap.exists) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado.'
      });
      return;
    }

    const sponsor = sponsorSnap.data() as Record<string, any>;
    const domain = sponsor.allowedEmailDomain || null;
    const tier = (sponsor.tier as SponsorTier) || 'PRATA';
    const teamLimit = Number.isInteger(sponsor.teamLimit) ? sponsor.teamLimit : (DEFAULT_TEAM_LIMIT[tier] || 3);

    const membersSnap = await db.collection('sponsors').doc(sponsorId).collection('members').get();
    const currentMemberCount = membersSnap.size;

    // Parser dos e-mails
    const rawEmails = req.body?.emails;
    let parsedEmails: string[] = [];

    if (rawEmails !== undefined && rawEmails !== null) {
      if (!Array.isArray(rawEmails) || rawEmails.length > MAX_EMAILS_PER_CALL) {
        res.status(400).json({
          error: 'INVALID_PAYLOAD',
          message: `emails deve ser uma lista com no máximo ${MAX_EMAILS_PER_CALL} itens.`
        });
        return;
      }

      const deduplicated = new Set<string>();
      for (const item of rawEmails) {
        const email = normalizeEmail(item);
        if (!email) {
          res.status(400).json({
            error: 'INVALID_PAYLOAD',
            message: 'A lista de e-mails contém um endereço inválido.'
          });
          return;
        }
        if (domain && !emailInDomain(email, domain)) {
          res.status(400).json({
            error: 'EMAIL_DOMAIN_NOT_ALLOWED',
            message: `Todos os e-mails devem ser do domínio @${domain}.`
          });
          return;
        }
        deduplicated.add(email);
      }
      parsedEmails = [...deduplicated];
    }

    // Sem e-mails nominais => link genérico (exige allowedEmailDomain)
    if (parsedEmails.length === 0 && !domain) {
      res.status(400).json({
        error: 'SPONSOR_DOMAIN_REQUIRED_FOR_LINK',
        message: 'Para gerar um link de convite rápido, informe e-mails nominais ou configure o domínio permitido da empresa.'
      });
      return;
    }

    // Checagem de cota
    const slotsNeeded = parsedEmails.length > 0 ? parsedEmails.length : 1;
    if (currentMemberCount + slotsNeeded > teamLimit) {
      const available = Math.max(0, teamLimit - currentMemberCount);
      res.status(409).json({
        error: 'TEAM_FULL',
        message: `A equipe não possui vagas suficientes. Vagas disponíveis: ${available}.`
      });
      return;
    }

    const callerUid = req.user!.uid;
    const targets: Array<string | null> = parsedEmails.length > 0 ? parsedEmails : [null];
    const prepared = targets.map((email) => ({ email, ...prepareInvite(sponsorId, email, callerUid) }));

    const batch = db.batch();
    prepared.forEach((p) => batch.set(p.ref, p.data));
    await batch.commit();

    const invites: CreatedInvite[] = await Promise.all(
      prepared.map((p) => dispatchInvite(p, p.email, sponsor.name))
    );

    const availableSlots = Math.max(0, teamLimit - (currentMemberCount + invites.length));

    res.status(201).json({
      success: true,
      invites,
      availableSlots
    });
  } catch (error) {
    console.error('Erro ao criar convites para a equipe:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível gerar os convites da equipe.'
    });
  }
}

/**
 * DELETE /api/sponsor/team/members/:memberUid
 * Remove um membro da equipe do patrocinador, liberando a vaga na cota.
 */
export async function removeTeamMemberHandler(req: Request, res: Response): Promise<void> {
  const { memberUid } = req.params;
  if (!isValidFirestoreId(memberUid)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'memberUid inválido.'
    });
    return;
  }

  const callerUid = req.user!.uid;

  // Trava de segurança: impede que o próprio usuário se auto-remova da equipe
  if (callerUid === memberUid) {
    res.status(400).json({
      error: 'CANNOT_REMOVE_SELF',
      message: 'Você não pode remover a si mesmo da equipe para evitar perda acidental de acesso.'
    });
    return;
  }

  try {
    const sponsorId = await resolveSponsorId(req);
    if (!sponsorId) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado para o usuário logado.'
      });
      return;
    }

    const sponsorRef = db.collection('sponsors').doc(sponsorId);
    const memberRef = sponsorRef.collection('members').doc(memberUid);
    const userRef = db.collection('users').doc(memberUid);

    await db.runTransaction(async (tx) => {
      const [sponsorSnap, memberSnap, userSnap] = await Promise.all([
        tx.get(sponsorRef),
        tx.get(memberRef),
        tx.get(userRef)
      ]);

      if (!sponsorSnap.exists) {
        throw new SponsorNotFoundError();
      }
      if (!memberSnap.exists) {
        throw new MemberNotFoundError();
      }

      // Remove da subcoleção members
      tx.delete(memberRef);

      // Reverte o perfil do usuário para PARTICIPANT e limpa sponsorId
      if (userSnap.exists) {
        tx.update(userRef, {
          role: 'PARTICIPANT',
          sponsorId: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    // Atualiza custom claim no Firebase Auth (fora da transação Firestore)
    try {
      const existingAuth = await auth.getUser(memberUid);
      const claims = existingAuth.customClaims || {};
      await auth.setCustomUserClaims(memberUid, { ...claims, role: 'PARTICIPANT' });
    } catch (authErr: any) {
      console.warn('Aviso: Não foi possível atualizar claim do usuário removido no Firebase Auth:', authErr?.message);
    }

    res.status(200).json({
      success: true,
      removedUid: memberUid,
      message: 'Membro removido da equipe com sucesso.'
    });
  } catch (error) {
    if (error instanceof SponsorNotFoundError) {
      res.status(404).json({
        error: 'SPONSOR_NOT_FOUND',
        message: 'Patrocinador não encontrado.'
      });
      return;
    }
    if (error instanceof MemberNotFoundError) {
      res.status(404).json({
        error: 'MEMBER_NOT_FOUND',
        message: 'Membro não encontrado nesta equipe.'
      });
      return;
    }
    console.error('Erro ao remover membro da equipe:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível remover o membro da equipe.'
    });
  }
}

/**
 * DELETE /api/sponsor/team/invites/:inviteId
 * Revoga um convite pendente da equipe do patrocinador.
 */
export async function revokeTeamInviteHandler(req: Request, res: Response): Promise<void> {
  const { inviteId } = req.params;
  if (!isValidFirestoreId(inviteId)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'inviteId inválido.' });
    return;
  }

  try {
    const sponsorId = await resolveSponsorId(req);
    if (!sponsorId) {
      res.status(404).json({ error: 'SPONSOR_NOT_FOUND', message: 'Patrocinador não encontrado.' });
      return;
    }

    const ref = db.collection('sponsorInvites').doc(inviteId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new InviteNotFoundError();
      const invite = snap.data() as Record<string, any>;
      if (invite.sponsorId !== sponsorId) throw new InviteNotFoundError();
      if (invite.status === 'ACCEPTED') throw new InviteAcceptedError();
      if (invite.status !== 'REVOKED') {
        tx.update(ref, { status: 'REVOKED' });
      }
    });

    res.status(200).json({ success: true, inviteId });
  } catch (error) {
    if (error instanceof InviteNotFoundError) {
      res.status(404).json({ error: 'INVITE_NOT_FOUND', message: 'Convite não encontrado.' });
      return;
    }
    if (error instanceof InviteAcceptedError) {
      res.status(409).json({ error: 'INVITE_ALREADY_ACCEPTED', message: 'Este convite já foi aceito e não pode ser revogado.' });
      return;
    }
    console.error('Erro ao revogar convite da equipe:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível revogar o convite.' });
  }
}

/**
 * POST /api/sponsor/team/invites/:inviteId/resend
 * Reenvia um convite pendente da equipe.
 */
export async function resendTeamInviteHandler(req: Request, res: Response): Promise<void> {
  const { inviteId } = req.params;
  if (!isValidFirestoreId(inviteId)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'inviteId inválido.' });
    return;
  }

  try {
    const sponsorId = await resolveSponsorId(req);
    if (!sponsorId) {
      res.status(404).json({ error: 'SPONSOR_NOT_FOUND', message: 'Patrocinador não encontrado.' });
      return;
    }

    const oldRef = db.collection('sponsorInvites').doc(inviteId);
    const out = await db.runTransaction(async (tx) => {
      const oldSnap = await tx.get(oldRef);
      if (!oldSnap.exists) throw new InviteNotFoundError();
      const old = oldSnap.data() as Record<string, any>;
      if (old.sponsorId !== sponsorId) throw new InviteNotFoundError();
      if (old.status === 'ACCEPTED') throw new InviteAcceptedError();

      const sponsorSnap = await tx.get(db.collection('sponsors').doc(sponsorId));
      if (!sponsorSnap.exists) throw new SponsorNotFoundError();
      if (!old.email && !(sponsorSnap.data() as any).allowedEmailDomain) throw new DomainRequiredError();

      const fresh = prepareInvite(sponsorId, old.email ?? null, req.user!.uid, inviteId);
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
    if (error instanceof DomainRequiredError) {
      res.status(400).json({
        error: 'SPONSOR_DOMAIN_REQUIRED_FOR_LINK',
        message: 'Para reenviar link genérico, a empresa precisa ter domínio permitido configurado.'
      });
      return;
    }
    if (error instanceof InviteAcceptedError) {
      res.status(409).json({ error: 'INVITE_ALREADY_ACCEPTED', message: 'Este convite já foi aceito.' });
      return;
    }
    console.error('Erro ao reenviar convite da equipe:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível reenviar o convite.' });
  }
}

// Rotas protegidas para SPONSOR e ADMIN
const guard = [requireAuth, requireRole(['SPONSOR', 'ADMIN']), adminSponsorLimiter];

router.get('/', ...guard, getTeamHandler);
router.post('/invites', ...guard, createTeamInvitesHandler);
router.delete('/members/:memberUid', ...guard, removeTeamMemberHandler);
router.delete('/invites/:inviteId', ...guard, revokeTeamInviteHandler);
router.post('/invites/:inviteId/resend', ...guard, resendTeamInviteHandler);

export default router;

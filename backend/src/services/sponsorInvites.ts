import { createHash, randomBytes } from 'node:crypto';
import * as admin from 'firebase-admin';
import { db, auth } from '../config/firebaseAdmin';
import { buildInviteLink, sendSponsorInviteEmail } from './emailService';

export type SponsorTier = 'DIAMANTE' | 'OURO' | 'PRATA';
export const SPONSOR_TIERS: SponsorTier[] = ['DIAMANTE', 'OURO', 'PRATA'];
export const DEFAULT_TEAM_LIMIT: Record<SponsorTier, number> = { DIAMANTE: 5, OURO: 4, PRATA: 3 };

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// TODO(KAN-124): texto jurídico do termo de LGPD próprio do patrocinador ainda
// não existe. Enquanto isso o aceite grava esta versão provisória; trocar pela
// versão real (e exibir o texto no front) antes de produção.
export const SPONSOR_TERMS_VERSION = '2026-10-draft';

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const EMAIL_RE = /^[^\s@]{1,64}@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

/** "@Kanastra.com.br " -> "kanastra.com.br"; null se inválido. */
export function normalizeDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const domain = value.trim().toLowerCase().replace(/^@/, '');
  return DOMAIN_RE.test(domain) ? domain : null;
}

/** Igualdade exata do domínio (nada de endsWith/subdomínio). */
export function emailInDomain(email: string, domain: string): boolean {
  const at = email.lastIndexOf('@');
  return at > 0 && email.slice(at + 1).toLowerCase() === domain;
}

// ponytail: contador em memória por instância (maxInstances 10 => teto real
// ~10x). Só conta token bem formado que não existe; migrar pra Firestore se
// houver sondagem distribuída de verdade.
const MAX_INVALID_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const invalidAttempts = new Map<string, { count: number; resetAt: number }>();

export function isTokenLocked(tokenHash: string): boolean {
  const entry = invalidAttempts.get(tokenHash);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    invalidAttempts.delete(tokenHash);
    return false;
  }
  return entry.count >= MAX_INVALID_ATTEMPTS;
}

export function recordInvalidAttempt(tokenHash: string): void {
  if (invalidAttempts.size > 5000) invalidAttempts.clear();
  const entry = invalidAttempts.get(tokenHash);
  if (!entry || entry.resetAt <= Date.now()) {
    invalidAttempts.set(tokenHash, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function resetInvalidAttempts(): void {
  invalidAttempts.clear();
}

export class InviteError extends Error {
  constructor(public code: string, public httpStatus: number, message: string) {
    super(message);
  }
}

export const INVITE_INVALID_ERROR = () =>
  new InviteError('INVITE_INVALID', 404, 'Convite inválido ou indisponível.');

// ---------------------------------------------------------------------------
// Criação / envio de convites
// ---------------------------------------------------------------------------

export interface CreatedInvite {
  inviteId: string;
  email: string | null;
  expiresAt: string;
  link: string;
  emailSent: boolean;
}

function newInviteData(sponsorId: string, email: string | null, createdBy: string, resentFrom?: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const data: Record<string, any> = {
    sponsorId,
    tokenHash: hashToken(token),
    email,
    status: 'PENDING',
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedBy: null,
    acceptedAt: null,
    resentFromInviteId: resentFrom ?? null
  };
  return { token, expiresAt, data };
}

/** Prepara (sem gravar) um convite: o chamador grava no batch/transação que quiser. */
export function prepareInvite(sponsorId: string, email: string | null, createdBy: string, resentFrom?: string) {
  const ref = db.collection('sponsorInvites').doc();
  return { ref, ...newInviteData(sponsorId, email, createdBy, resentFrom) };
}

/** Envia o e-mail (se nominal) e monta o item de resposta. Nunca lança. */
export async function dispatchInvite(
  prepared: { ref: { id: string }; token: string; expiresAt: Date },
  email: string | null,
  sponsorName: string
): Promise<CreatedInvite> {
  const link = buildInviteLink(prepared.token);
  const emailSent = email
    ? await sendSponsorInviteEmail({ to: email, sponsorName, link, expiresAt: prepared.expiresAt })
    : false;
  return { inviteId: prepared.ref.id, email, expiresAt: prepared.expiresAt.toISOString(), link, emailSent };
}

// ---------------------------------------------------------------------------
// Visão pública e aceite
// ---------------------------------------------------------------------------

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function inviteIsExpired(invite: Record<string, any>): boolean {
  const expiresAt = toDate(invite.expiresAt);
  return !expiresAt || expiresAt.getTime() <= Date.now();
}

/** Estado do convite visto de fora: lança InviteError (404 genérico, 410 expirado). */
function assertUsable(invite: Record<string, any> | null): asserts invite is Record<string, any> {
  if (!invite) throw INVITE_INVALID_ERROR();
  if (invite.status === 'EXPIRED' || (invite.status === 'PENDING' && inviteIsExpired(invite))) {
    throw new InviteError('INVITE_EXPIRED', 410, 'Este convite expirou. Peça um novo à organização do evento.');
  }
  if (invite.status !== 'PENDING') throw INVITE_INVALID_ERROR();
}

async function findInviteByHash(read: (q: any) => Promise<any>, tokenHash: string) {
  const snap = await read(db.collection('sponsorInvites').where('tokenHash', '==', tokenHash).limit(1));
  const doc = snap?.docs?.[0];
  return doc ? { ref: doc.ref, data: doc.data() as Record<string, any> } : null;
}

export async function getInvitePreview(token: string) {
  if (!isWellFormedToken(token)) throw INVITE_INVALID_ERROR();
  const tokenHash = hashToken(token);
  if (isTokenLocked(tokenHash)) throw new InviteError('RATE_LIMITED', 429, 'Muitas tentativas. Aguarde um momento.');

  const found = await findInviteByHash((q) => q.get(), tokenHash);
  if (!found) {
    recordInvalidAttempt(tokenHash);
    throw INVITE_INVALID_ERROR();
  }
  assertUsable(found.data);

  const sponsorSnap = await db.collection('sponsors').doc(found.data.sponsorId).get();
  if (!sponsorSnap.exists) throw INVITE_INVALID_ERROR();
  const sponsor = sponsorSnap.data() as Record<string, any>;

  return {
    sponsorName: sponsor.name,
    logoUrl: sponsor.logoUrl ?? null,
    tier: sponsor.tier,
    booth: sponsor.booth ?? null,
    expiresAt: toDate(found.data.expiresAt)!.toISOString(),
    emailLocked: !!found.data.email,
    ...(sponsor.allowedEmailDomain ? { emailDomain: sponsor.allowedEmailDomain } : {})
  };
}

export interface AcceptProfile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  photoURL?: string;
  linkedin?: string;
  lookingFor: string[];
}

export class RolePartiallyUpdatedError extends Error {}

/**
 * Aceite em UMA transação (convite, e-mail/domínio, vaga da equipe, gravação do
 * usuário/membro e baixa do convite). O custom claim vem depois, fora da
 * transação (Firestore não cobre Auth): mesma ordem e mesmo erro de admin.ts.
 * E-mail vem do ID token, nunca do corpo; role/sponsorId/teamLimit nunca vêm do cliente.
 */
export async function acceptInvite(
  token: string,
  caller: { uid: string; email?: string; emailVerified?: boolean },
  profile: AcceptProfile
): Promise<{ uid: string; role: 'SPONSOR'; sponsorId: string }> {
  if (!isWellFormedToken(token)) throw INVITE_INVALID_ERROR();
  const tokenHash = hashToken(token);
  if (isTokenLocked(tokenHash)) throw new InviteError('RATE_LIMITED', 429, 'Muitas tentativas. Aguarde um momento.');

  const email = normalizeEmail(caller.email);
  const userRef = db.collection('users').doc(caller.uid);

  const result = await db.runTransaction(async (tx) => {
    const found = await findInviteByHash((q) => tx.get(q), tokenHash);
    if (!found) {
      recordInvalidAttempt(tokenHash);
      throw INVITE_INVALID_ERROR();
    }
    const invite = found.data;
    assertUsable(invite);

    const sponsorRef = db.collection('sponsors').doc(invite.sponsorId);
    const membersRef = sponsorRef.collection('members');
    const memberRef = membersRef.doc(caller.uid);
    const [sponsorSnap, userSnap, membersSnap] = await Promise.all([
      tx.get(sponsorRef),
      tx.get(userRef),
      tx.get(membersRef)
    ]);
    if (!sponsorSnap.exists) throw INVITE_INVALID_ERROR();
    const sponsor = sponsorSnap.data() as Record<string, any>;

    if (!email) {
      throw new InviteError('EMAIL_MISMATCH', 403, 'O e-mail da sua conta não corresponde ao convite.');
    }
    if (invite.email && invite.email !== email) {
      throw new InviteError('EMAIL_MISMATCH', 403, 'O e-mail da sua conta não corresponde ao convite.');
    }
    if (sponsor.allowedEmailDomain) {
      if (!emailInDomain(email, sponsor.allowedEmailDomain)) {
        throw new InviteError(
          'EMAIL_DOMAIN_NOT_ALLOWED',
          403,
          `Este convite só aceita e-mails do domínio @${sponsor.allowedEmailDomain}.`
        );
      }
      // Sem e-mail verificado qualquer um criaria conta com "x@dominio" no Firebase Auth.
      if (caller.emailVerified !== true) {
        throw new InviteError('EMAIL_NOT_VERIFIED', 403, 'Confirme seu e-mail antes de aceitar o convite.');
      }
    }

    const existing = userSnap.exists ? (userSnap.data() as Record<string, any>) : {};
    if (existing.termsAcceptedAt || existing.sponsorId || membersSnap.docs?.some((d: any) => d.id === caller.uid)) {
      throw new InviteError('ALREADY_REGISTERED', 409, 'Não foi possível concluir o cadastro com esta conta.');
    }

    const teamLimit = Number.isInteger(sponsor.teamLimit) ? sponsor.teamLimit : 0;
    if (membersSnap.size >= teamLimit) {
      throw new InviteError('TEAM_FULL', 409, 'A equipe deste patrocinador já atingiu o limite de vagas.');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const userDoc: Record<string, any> = {
      uid: caller.uid,
      email,
      role: 'SPONSOR',
      sponsorId: invite.sponsorId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      phone: profile.phone,
      jobTitle: profile.jobTitle,
      lookingFor: profile.lookingFor,
      totalPoints: existing.totalPoints ?? 0,
      pontuacaoTotal: existing.pontuacaoTotal ?? existing.totalPoints ?? 0,
      termsAcceptedAt: now,
      sponsorTermsVersion: SPONSOR_TERMS_VERSION,
      createdAt: existing.createdAt || now
    };
    if (profile.photoURL) userDoc.photoURL = profile.photoURL;
    if (profile.linkedin) userDoc.linkedin = profile.linkedin;

    tx.set(userRef, userDoc, { merge: true });
    tx.set(memberRef, {
      uid: caller.uid,
      email,
      jobTitle: profile.jobTitle,
      joinedAt: now,
      invitedBy: found.ref.id
    });
    // Convite nominal é de uso único; o genérico segue PENDING até expirar/ser revogado.
    if (invite.email) {
      tx.update(found.ref, { status: 'ACCEPTED', acceptedBy: caller.uid, acceptedAt: now });
    }
    return { sponsorId: invite.sponsorId as string };
  });

  try {
    const existingUser = await auth.getUser(caller.uid);
    await auth.setCustomUserClaims(caller.uid, { ...existingUser.customClaims, role: 'SPONSOR' });
  } catch (error: any) {
    console.error('Erro ao definir custom claim SPONSOR após aceite já gravado:', error?.message || error);
    throw new RolePartiallyUpdatedError();
  }

  // Sem revokeRefreshTokens: o claim novo chega com getIdToken(true) no cliente; revogar
  // derrubaria a sessão (requireAuth usa checkRevoked) sem ganho de segurança aqui.
  return { uid: caller.uid, role: 'SPONSOR', sponsorId: result.sponsorId };
}

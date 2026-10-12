import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import { sponsorInviteIpLimiter } from '../middlewares/rateLimiter';
import {
  InviteError,
  RolePartiallyUpdatedError,
  AcceptProfile,
  getInvitePreview,
  acceptInvite
} from '../services/sponsorInvites';

const router = Router();

function sendInviteError(res: Response, error: unknown, logLabel: string): void {
  if (error instanceof InviteError) {
    res.status(error.httpStatus).json({ error: error.code, message: error.message });
    return;
  }
  if (error instanceof RolePartiallyUpdatedError) {
    res.status(500).json({
      error: 'ROLE_PARTIALLY_UPDATED',
      message: 'Seu cadastro foi salvo, mas a permissão de patrocinador não foi aplicada. Fale com a organização do evento.'
    });
    return;
  }
  console.error(logLabel, (error as any)?.message || error);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível processar o convite. Tente novamente.' });
}

/** GET /api/sponsor-invites/:token — dados públicos mínimos pra tela de aceite. */
export async function previewInviteHandler(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await getInvitePreview(req.params.token));
  } catch (error) {
    sendInviteError(res, error, 'Erro ao consultar convite:');
  }
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v && v.length <= max ? v : null;
}

/** Valida o corpo do aceite. Só lê campos conhecidos: role/sponsorId/teamLimit/email do cliente são ignorados. */
export function parseAcceptBody(body: any): AcceptProfile | string {
  const firstName = str(body?.firstName, 80);
  const lastName = str(body?.lastName, 80);
  const jobTitle = str(body?.jobTitle, 100);
  if (!firstName || !lastName || !jobTitle) return 'firstName, lastName e jobTitle são obrigatórios.';

  const phoneRaw = str(body?.phone, 30);
  const digits = phoneRaw ? phoneRaw.replace(/\D/g, '') : '';
  if (digits.length < 10 || digits.length > 15) return 'phone inválido.';

  const profile: AcceptProfile = { firstName, lastName, jobTitle, phone: phoneRaw!, lookingFor: [] };

  if (body.photoURL !== undefined && body.photoURL !== null && body.photoURL !== '') {
    const url = str(body.photoURL, 500);
    if (!url || !/^https:\/\//i.test(url)) return 'photoURL deve ser uma URL https.';
    profile.photoURL = url;
  }
  if (body.linkedin !== undefined && body.linkedin !== null && body.linkedin !== '') {
    const l = str(body.linkedin, 200);
    if (!l) return 'linkedin inválido.';
    profile.linkedin = l;
  }
  if (body.lookingFor !== undefined && body.lookingFor !== null) {
    if (!Array.isArray(body.lookingFor) || body.lookingFor.length > 10) return 'lookingFor deve ser uma lista de até 10 textos.';
    for (const item of body.lookingFor) {
      const v = str(item, 60);
      if (!v) return 'lookingFor deve conter apenas textos curtos não vazios.';
      profile.lookingFor.push(v);
    }
  }
  return profile;
}

/** POST /api/sponsor-invites/:token/accept */
export async function acceptInviteHandler(req: Request, res: Response): Promise<void> {
  if (req.body?.termsAccepted !== true) {
    res.status(400).json({
      error: 'TERMS_NOT_ACCEPTED',
      message: 'É necessário aceitar os termos e a política de privacidade (LGPD) para concluir o cadastro.'
    });
    return;
  }

  const profile = parseAcceptBody(req.body);
  if (typeof profile === 'string') {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: profile });
    return;
  }

  try {
    const user = await acceptInvite(req.params.token, req.user!, profile);
    res.status(201).json({ user });
  } catch (error) {
    sendInviteError(res, error, 'Erro ao aceitar convite:');
  }
}

// Limiter por IP ANTES de qualquer trabalho (inclusive requireAuth, que consulta o Firebase Auth).
router.get('/:token', sponsorInviteIpLimiter, previewInviteHandler);
router.post('/:token/accept', sponsorInviteIpLimiter, requireAuth, acceptInviteHandler);

export default router;

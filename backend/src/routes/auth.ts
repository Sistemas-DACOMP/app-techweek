import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { registerUser, RegisterProfileData } from '../services/registerUser';

const router = Router();

/**
 * Finaliza o cadastro do usuário autenticado, gravando o perfil em /users/{uid}.
 * A conta no Firebase Auth já existe nesse ponto (o caller tem um ID token válido) -
 * o que essa rota garante é que o documento de perfil só é criado se o aceite dos
 * termos de uso / LGPD vier explícito no corpo da requisição (REG-LGPD-001).
 *
 * Exportado separado do `router.post` pra dar pra testar sem precisar de um
 * servidor Express de verdade (ver routes/auth.test.ts).
 */
export async function registerHandler(req: Request, res: Response): Promise<void> {
  const {
    termsAccepted,
    firstName,
    lastName,
    displayName,
    username,
    phone,
    participantType,
    course,
    period,
    linkedin,
    instagram,
    photoURL
  } = req.body ?? {};

  if (termsAccepted !== true) {
    res.status(400).json({
      error: 'TERMS_NOT_ACCEPTED',
      message: 'É necessário aceitar os termos de uso e a política de privacidade (LGPD) para concluir o cadastro.'
    });
    return;
  }

  const uid = req.user!.uid;
  const email = req.user!.email ?? null;

  const profileData: RegisterProfileData = {};
  if (firstName) profileData.firstName = firstName;
  if (lastName) profileData.lastName = lastName;
  if (displayName) profileData.displayName = displayName;
  if (username) profileData.username = username;
  if (phone) profileData.phone = phone;
  if (participantType) profileData.participantType = participantType;
  if (course) profileData.course = course;
  if (period) profileData.period = period;
  if (linkedin) profileData.linkedin = linkedin;
  if (instagram) profileData.instagram = instagram;
  if (photoURL) profileData.photoURL = photoURL;

  const hasProfile = Object.keys(profileData).length > 0;

  try {
    const result = hasProfile
      ? await registerUser(db, uid, email, profileData)
      : await registerUser(db, uid, email);

    if (result.status === 'already-registered') {
      res.status(409).json({
        error: 'ALREADY_REGISTERED',
        message: 'Este usuário já tem um cadastro concluído.'
      });
      return;
    }

    res.status(201).json({ user: result.user });
  } catch (error: any) {
    console.error('❌ Erro ao finalizar cadastro:', error?.message || error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir o cadastro. Tente novamente.'
    });
  }
}

router.post('/register', requireAuth, participantActionLimiter, registerHandler);

export default router;

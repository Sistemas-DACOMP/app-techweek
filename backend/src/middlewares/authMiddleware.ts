import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebaseAdmin';
import { UserRole, AuthUser } from '../types/express';

/**
 * Middleware para validar o token JWT emitido pelo Firebase Auth.
 * Espera o header: Authorization: Bearer <token>
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação ausente ou malformatado. Utilize o formato Bearer <token>.'
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token de autenticação não fornecido.'
    });
    return;
  }

  try {
    // checkRevoked=true: sem isso, token de conta desabilitada/deslogada à força
    // continua válido até expirar naturalmente (~1h). Custo é 1 chamada extra
    // à API do Firebase Auth por request — aceitável no volume do evento.
    const decodedToken = await auth.verifyIdToken(token, true);

    const userRole: UserRole = (decodedToken.role as UserRole) || 'PARTICIPANT';

    const user: AuthUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userRole,
      emailVerified: decodedToken.email_verified
    };

    req.user = user;
    next();
  } catch (error: any) {
    console.error('❌ Erro na verificação do token JWT:', error?.message || error);
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token de autenticação inválido, expirado ou revogado.'
    });
    return;
  }
}

/**
 * Middleware para checagem de permissões por perfil (Role-Based Access Control).
 * @param allowedRoles Lista de papéis permitidos para acessar a rota.
 * Nota: Usuários com role 'ADMIN' sempre possuem permissão irrestrita.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado.'
      });
      return;
    }

    const { role } = req.user;

    // ADMIN sempre possui acesso total
    if (role === 'ADMIN' || allowedRoles.includes(role)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'FORBIDDEN',
      message: `Acesso restrito. Esta ação requer permissão de: ${allowedRoles.join(', ')}.`
    });
  };
}

/**
 * Middleware para checar se o participante possui ingresso validado do Sympla (KAN-84).
 * Impede reserva de vagas e resgate de pontos para contas sem ingresso confirmado.
 * Nota: Usuários com role 'ADMIN' sempre possuem permissão irrestrita.
 */
export async function requireSymplaTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Usuário não autenticado.'
    });
    return;
  }

  // ADMIN sempre possui acesso total
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  try {
    const userSnap = await db.collection('users').doc(req.user.uid).get();
    const userData = userSnap.data();

    if (!userSnap.exists || !userData?.hasSymplaTicket) {
      res.status(403).json({
        error: 'SYMPLA_TICKET_REQUIRED',
        message: 'É necessário possuir um ingresso oficial do Sympla vinculado à conta para realizar esta ação.'
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('❌ Erro na verificação do ingresso Sympla:', error?.message || error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Erro interno ao validar ingresso do participante.'
    });
  }
}


import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { db, auth } from './config/firebaseAdmin';
import { requireAuth, requireRole } from './middlewares/authMiddleware';
import authRouter from './routes/auth';
import checkinRouter from './routes/checkin';

export { db, auth };

const app = express();

// Middlewares padrão
app.use(cors({ origin: true }));
app.use(express.json());

// Rotas de cadastro/autenticação (finalização de perfil pós Firebase Auth)
app.use('/api/auth', authRouter);

// Rota de Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    service: 'facom-techweek-api'
  });
});

// Rota protegida: Retorna os dados do usuário autenticado a partir do token JWT
app.get('/api/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user
  });
});

// Rota protegida para STAFF e ADMIN (ex: Validação de presença na portaria)
app.get('/api/staff/test', requireAuth, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Acesso autorizado para a equipe de Staff!',
    operator: req.user
  });
});

// Rota restrita exclusiva para ADMIN
app.get('/api/admin/test', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Acesso autorizado para Administrador!',
    admin: req.user
  });
});

// Check-in de presença em palestra (KAN-71)
app.use('/api/activities', checkinRouter);

// Exporta a Cloud Function 2nd Gen na região us-east1 (Free Tier)
export const api = onRequest(
  {
    region: 'us-east1',
    cors: true,
    memory: '256MiB',
    maxInstances: 10
  },
  app
);

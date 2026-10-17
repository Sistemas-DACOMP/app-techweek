import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { requireAuth, requireRole } from './middlewares/authMiddleware';
import authRouter from './routes/auth';
import checkinRouter from './routes/checkin';
import bookingRouter, { processExpiredWaitingBookings } from './routes/booking';
import symplaRouter from './routes/symplaRoutes';
import leadsRouter from './routes/leads';
import screenTokenRouter from './routes/screenToken';
import checkinDoubleCheckRouter from './routes/checkinDoubleCheck';
import pointsRouter from './routes/points';
import adminRouter from './routes/admin';
import entranceRouter from './routes/entrance';
import sponsorsAdminRouter from './routes/sponsorsAdmin';
import sponsorInvitesRouter from './routes/sponsorInvites';

import { corsOptions } from './config/cors';
import { debugClientIp } from './middlewares/rateLimiter';

const app = express();

/**
 * Retorna o número de proxies reversos confiáveis configurados à frente do Express.
 * - 1 hop: acesso direto à Cloud Function (*.cloudfunctions.net - 1 hop Google Cloud Run / GFE).
 * - 2 hops: acesso via Firebase Hosting rewrite (/api/** -> function api - Hosting CDN + Google Cloud Run).
 * Fallback seguro se omitido ou inválido: 1 hop.
 */
export function getTrustProxyHops(): number {
  const rawHops = process.env.TRUST_PROXY_HOPS;
  const parsedHops = rawHops ? parseInt(rawHops, 10) : NaN;
  return !Number.isNaN(parsedHops) && parsedHops >= 1 ? parsedHops : 1;
}

// Rate limit por IP das rotas públicas de convite (KAN-124) precisa do IP real do
// cliente. O número de hops varia conforme a topologia da rede:
// - Cloud Function direto: 1 hop (Google GFE / Cloud Run).
// - Firebase Hosting rewrite: 2 hops (Hosting CDN + Cloud Run).
const trustProxyHops = getTrustProxyHops();
app.set('trust proxy', trustProxyHops);

// Middlewares padrão
app.use(cors(corsOptions));
app.use(express.json());

// Rotas de cadastro/autenticação (finalização de perfil pós Firebase Auth)
app.use(['/api/auth', '/auth'], authRouter);

// Handler de Health Check (exportado para testes)
export function healthCheckHandler(req: Request, res: Response): void {
  const isDebug = process.env.DEBUG_CLIENT_IP === '1';
  const hops = getTrustProxyHops();
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    service: 'facom-techweek-api',
    ...(isDebug && {
      debug: {
        clientIp: req.ip,
        ips: req.ips,
        xForwardedFor: req.headers['x-forwarded-for'] || null,
        trustProxyHops: hops
      }
    })
  });
}

// Rota de Health Check (com debugClientIp para diagnóstico temporário de rede em homolog)
app.get(['/api/health', '/health'], debugClientIp, healthCheckHandler);

// Rota protegida: Retorna os dados do usuário autenticado a partir do token JWT
app.get(['/api/me', '/me'], requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user
  });
});

// Rota protegida para STAFF e ADMIN (ex: Validação de presença na portaria)
app.get(['/api/staff/test', '/staff/test'], requireAuth, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Acesso autorizado para a equipe de Staff!',
    operator: req.user
  });
});

// Rota restrita exclusiva para ADMIN
app.get(['/api/admin/test', '/admin/test'], requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Acesso autorizado para Administrador!',
    admin: req.user
  });
});

// Check-in de presença em palestra (KAN-71) e reserva de vaga (KAN-49)
app.use(['/api/activities', '/activities'], checkinRouter);
app.use(['/api/activities', '/activities'], bookingRouter);
app.use(['/api/sympla', '/sympla'], symplaRouter);
app.use(['/api/activities', '/activities'], screenTokenRouter);

// Double-check de presença: entrada (Staff) + checkout (aluno via QR do telão) (KAN-51)
app.use(['/api/checkin', '/checkin'], checkinDoubleCheckRouter);

// Modo Staff: entrada direta na portaria e salas (KAN-48)
app.use(['/api/staff', '/staff'], entranceRouter);

// Captura de Leads e Gamificação de Estande para Patrocinadores (KAN-55)
app.use(['/api/leads', '/leads'], leadsRouter);

// Crédito de pontos de missão/desafio via backend (KAN-79 — client não pode
// mais escrever totalPoints direto no Firestore desde o fix do SEC-003)
app.use(['/api/points', '/points'], pointsRouter);

// Gestão de papéis de usuário por ADMIN (KAN-60) — PUT /api/admin/users/:uid/role
app.use(['/api/admin', '/admin'], adminRouter);

// Patrocinadores e convites (KAN-124): gestão pelo ADMIN + rotas públicas de aceite
app.use(['/api/admin', '/admin'], sponsorsAdminRouter);
app.use(['/api/sponsor-invites', '/sponsor-invites'], sponsorInvitesRouter);

export { app };

// Exporta a Cloud Function 2nd Gen na região us-east1 (Free Tier)
export const api = onRequest(
  {
    region: 'us-east1',
    cors: false,
    memory: '256MiB',
    maxInstances: 10,
    invoker: 'public'
  },
  app
);

// Job agendado (a cada 5 minutos) para expirar reservas WAITING_CONFIRMATION cujo
// confirmationDeadline venceu e promover automaticamente o próximo da WAITING_LIST.
export const expireWaitingConfirmations = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'us-east1',
    memory: '256MiB',
    timeZone: 'America/Campo_Grande'
  },
  async () => {
    await processExpiredWaitingBookings(new Date());
  }
);

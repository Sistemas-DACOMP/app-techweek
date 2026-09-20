import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Inicializa o Firebase Admin SDK se ainda não foi inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();

const app = express();

// Middlewares padrão
app.use(cors({ origin: true }));
app.use(express.json());

// Rota de Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    service: 'facom-techweek-api'
  });
});

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


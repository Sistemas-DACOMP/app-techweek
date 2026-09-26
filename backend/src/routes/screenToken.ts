import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { isValidFirestoreId } from '../lib/firestoreId';
import { issueScreenToken } from '../lib/screenToken';

const router = Router();

// GET /api/activities/:activityId/screen-token
//
// QR dinâmico do telão (KAN-51/D1). A tela de projeção (fora de escopo desta
// mudança) chamaria isto periodicamente pra desenhar um QR novo a cada poucos
// minutos. Não decrementa nem grava nada — só emite um token HMAC de curta
// duração; toda a regra de negócio pesada (entrance prévio, dedup) acontece
// em POST /api/checkin/checkout, na hora de validar o token.
router.get('/:activityId/screen-token', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  const { activityId } = req.params;

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  try {
    const activitySnap = await db.collection('activities').doc(activityId).get();

    if (!activitySnap.exists) {
      res.status(404).json({ error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' });
      return;
    }

    const { token, expiresAt } = issueScreenToken(activityId);
    res.status(200).json({ token, expiresAt });
  } catch (error) {
    console.error('Erro ao emitir token de tela:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível emitir o token.' });
  }
});

export default router;

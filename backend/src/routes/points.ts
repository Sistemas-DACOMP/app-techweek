import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

const MAX_POINTS_PER_EVENT = 1000;

// Achado do security review: colapsar todo caractere fora de [a-zA-Z0-9_-]
// pro mesmo "_" fazia referenceIds distintos colidirem no mesmo doc id (ex:
// "foo/bar" e "foo:bar" viravam "foo_bar") — na pior hipótese nega um
// crédito legítimo como "alreadyClaimed", nunca duplica ponto, mas é bug
// real. Único caractere de fato proibido em doc id do Firestore é "/".
function sanitizeId(value: string): string {
  return value.replace(/\//g, '_');
}

// POST /api/points/claim
//
// KAN-79: antes disso, o client tentava creditar totalPoints direto no
// Firestore (userService.js::addUserPointEvent) — a regra de /users bloqueia
// isso desde o fix do SEC-003 (KAN-69), então todo crédito de missão/desafio
// falhava em silêncio (o erro era engolido e a UI mostrava sucesso mesmo
// assim). Mesmo padrão de dedup por doc id determinístico já usado em
// checkin.ts/checkinDoubleCheck.ts, só que na subcollection que o client já
// vinha usando (users/{uid}/point_events) — evita órfãos de tentativas
// anteriores à correção e mantém um único lugar de leitura.
router.post('/claim', requireAuth, async (req: Request, res: Response) => {
  const { eventType, referenceId, points, metadata } = req.body ?? {};
  const uid = req.user!.uid;

  if (typeof eventType !== 'string' || !eventType) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'eventType é obrigatório.' });
    return;
  }

  if (typeof referenceId !== 'string' || !referenceId) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'referenceId é obrigatório.' });
    return;
  }

  if (typeof points !== 'number' || !Number.isFinite(points) || points < 0 || points > MAX_POINTS_PER_EVENT) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: `points precisa ser um número entre 0 e ${MAX_POINTS_PER_EVENT}.`
    });
    return;
  }

  const eventDocId = `${sanitizeId(eventType)}_${sanitizeId(referenceId)}`;
  const eventRef = db.collection('users').doc(uid).collection('point_events').doc(eventDocId);
  const userRef = db.collection('users').doc(uid);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [eventSnap, userSnap] = await Promise.all([tx.get(eventRef), tx.get(userRef)]);

      if (eventSnap.exists) {
        return { status: 200 as const, body: { success: false, alreadyClaimed: true } };
      }

      if (!userSnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'PARTICIPANT_NOT_FOUND', message: 'Perfil do participante não encontrado.' }
        };
      }

      tx.set(eventRef, {
        eventType,
        referenceId,
        points,
        metadata: metadata ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.update(userRef, {
        totalPoints: admin.firestore.FieldValue.increment(points)
      });

      return { status: 200 as const, body: { success: true, points } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao creditar pontos:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível registrar os pontos.' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import { resolveAttendanceMode } from '../lib/attendanceMode';

const router = Router();

// POST /api/activities/:activityId/checkin
//
// Credita presença (e pontos) de uma palestra. Revalida no servidor, dentro
// de uma transação, que o lectureId decodificado do QR bate com a palestra
// selecionada (:activityId) — a mesma checagem que o LectureScanner.jsx já
// faz no client, mas o client sozinho não é confiável nessa arquitetura
// (REG-SCANNER-001 / KAN-71). Também garante que o mesmo usuário não credita
// pontos duas vezes pra mesma palestra (dedup via id determinístico do doc).
router.post('/:activityId/checkin', requireAuth, participantActionLimiter, async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { lectureId, rating } = req.body ?? {};
  const uid = req.user!.uid;

  if (typeof lectureId !== 'string' || !lectureId) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'lectureId é obrigatório no corpo da requisição.'
    });
    return;
  }

  if (lectureId !== activityId) {
    res.status(400).json({
      error: 'QR_MISMATCH',
      message: 'O QR Code escaneado não corresponde a esta palestra.'
    });
    return;
  }

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  // Id determinístico (usuário + tipo de evento + palestra) em vez de
  // auto-id: permite checar duplicidade dentro da própria transação, sem
  // depender de query.
  const pointEventRef = db.collection('pointEvents').doc(`${uid}_lecture_attendance_${activityId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [activitySnap, pointEventSnap] = await Promise.all([
        tx.get(activityRef),
        tx.get(pointEventRef)
      ]);

      if (!activitySnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Palestra não encontrada.' }
        };
      }

      const activityData = activitySnap.data() ?? {};

      // KAN-51/D2: atividade com double-check usa /api/checkin/entrance +
      // /checkout (Staff registra entrada, aluno faz checkout via QR do
      // telão) — este fluxo de autoatendimento não se aplica a ela, senão
      // dá pra contar presença duas vezes pela mesma atividade.
      if (resolveAttendanceMode(activityData) === 'DOUBLE_CHECK') {
        return {
          status: 400 as const,
          body: { error: 'WRONG_ATTENDANCE_MODE', message: 'Esta atividade usa double-check de presença (Staff + QR do telão).' }
        };
      }

      if (pointEventSnap.exists) {
        return {
          status: 409 as const,
          body: { error: 'CHECKIN_DUPLICATE', message: 'Presença já registrada para esta palestra.' }
        };
      }

      const points = typeof activityData.points === 'number' ? activityData.points : 0;

      tx.set(pointEventRef, {
        userId: uid,
        eventType: 'lecture_attendance',
        referenceId: activityId,
        points,
        metadata: typeof rating === 'number' ? { rating } : null,
        createdAt: new Date()
      });

      if (points > 0) {
        const userRef = db.collection('users').doc(uid);
        tx.set(userRef, {
          totalPoints: admin.firestore.FieldValue.increment(points)
        }, { merge: true });
      }

      return {
        status: 201 as const,
        body: { success: true, points }
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao registrar check-in de palestra:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar a presença.'
    });
  }
});

export default router;

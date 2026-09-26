import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/checkin/entrance
router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  const { participantUid, activityId } = req.body ?? {};
  const staffUid = req.user!.uid;

  if (!participantUid || !activityId) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid e activityId so obrigatrios.'
    });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const pointEventRef = db.collection('pointEvents').doc(`${participantUid}_entrance_${activityId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [activitySnap, pointEventSnap] = await Promise.all([
        tx.get(activityRef),
        tx.get(pointEventRef)
      ]);

      if (!activitySnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Palestra no encontrada.' }
        };
      }

      const activityData = activitySnap.data() ?? {};
      const requireRegistration = activityData.requireRegistration === true;

      if (requireRegistration) {
        // Verificar se aluno est inscrito
        const bookingRef = db.collection('bookings').doc(`${participantUid}_${activityId}`);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists) {
          return {
            status: 403 as const,
            body: { error: 'NOT_REGISTERED', message: 'Aluno no inscrito previamente.' }
          };
        }
      }

      if (pointEventSnap.exists) {
        return {
          status: 409 as const,
          body: { error: 'CHECKIN_DUPLICATE', message: 'Entrada duplicada (j havia feito check-in de entrada).' }
        };
      }

      const points = typeof activityData.entrancePoints === 'number' ? activityData.entrancePoints : 0;

      tx.set(pointEventRef, {
        userId: participantUid,
        eventType: 'entrance',
        referenceId: activityId,
        points,
        metadata: { staffUid },
        createdAt: new Date()
      });

      return {
        status: 201 as const,
        body: { success: true, points }
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao registrar check-in de entrada:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'No foi possvel registrar a entrada.'
    });
  }
});

export default router;


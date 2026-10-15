import { Router, Request, Response } from 'express';
import { db, FieldValue } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/checkin/entrance ou /api/staff/entrance
router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  const rawUid = req.body?.participantUid || req.body?.uid;
  const { activityId } = req.body ?? {};
  const staffUid = req.user!.uid;

  if (!rawUid || !activityId || typeof rawUid !== 'string') {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid e activityId são obrigatórios.'
    });
    return;
  }

  let resolvedUid = rawUid.replace(/^mailto:/i, '').trim();
  if (resolvedUid.startsWith('@')) {
    try {
      const cleanUsername = resolvedUid.replace(/^@/, '').toLowerCase();
      const userSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
      if (!userSnap.empty) {
        resolvedUid = userSnap.docs[0].id;
      }
    } catch (e) {
      console.warn('Erro ao buscar UID por username no checkin de entrada:', e);
    }
  } else if (resolvedUid.includes('@')) {
    try {
      const cleanEmail = resolvedUid.toLowerCase();
      const userSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!userSnap.empty) {
        resolvedUid = userSnap.docs[0].id;
      } else {
        const exactSnap = await db.collection('users').where('email', '==', resolvedUid).limit(1).get();
        if (!exactSnap.empty) {
          resolvedUid = exactSnap.docs[0].id;
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar UID por e-mail no checkin de entrada:', e);
    }
  }

  const activityRef = db.collection('activities').doc(activityId);
  const pointEventRef = db.collection('pointEvents').doc(`${resolvedUid}_entrance_${activityId}`);

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
      const requireRegistration = activityData.requireRegistration === true;

      if (requireRegistration) {
        // Verificar se aluno está inscrito
        const bookingRef = db.collection('bookings').doc(`${resolvedUid}_${activityId}`);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists) {
          return {
            status: 403 as const,
            body: { error: 'NOT_REGISTERED', message: 'Aluno não inscrito previamente.' }
          };
        }
      }

      if (pointEventSnap.exists) {
        return {
          status: 409 as const,
          body: { error: 'CHECKIN_DUPLICATE', message: 'Entrada duplicada (já havia feito check-in de entrada).' }
        };
      }

      const points = typeof activityData.entrancePoints === 'number'
        ? activityData.entrancePoints
        : (typeof activityData.points === 'number' ? activityData.points : 0);

      tx.set(pointEventRef, {
        userId: resolvedUid,
        eventType: 'entrance',
        referenceId: activityId,
        points,
        metadata: { staffUid },
        createdAt: new Date()
      });

      if (points > 0) {
        const userRef = db.collection('users').doc(resolvedUid);
        tx.set(userRef, {
          totalPoints: FieldValue.increment(points),
          pontuacaoTotal: FieldValue.increment(points)
        }, { merge: true });
      }

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
      message: 'Não foi possível registrar a entrada.'
    });
  }
});

export default router;


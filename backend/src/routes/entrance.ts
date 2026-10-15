import { Router, Request, Response } from 'express';
import { db, FieldValue } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

const DEFAULT_ACTIVITIES_FALLBACK: Record<string, { points: number; entrancePoints?: number; attendanceMode: string; requireRegistration?: boolean }> = {
  act_1588971: { points: 25, attendanceMode: 'SELF_SCAN' },
  act_1589102: { points: 30, attendanceMode: 'SELF_SCAN' },
  act_1588972: { points: 20, attendanceMode: 'SELF_SCAN' },
  palestra_abertura: { points: 20, attendanceMode: 'SELF_SCAN' },
  palestra_samuel_amorim: { points: 20, attendanceMode: 'SELF_SCAN' },
  workshop_firebase_node: { points: 35, attendanceMode: 'DOUBLE_CHECK' },
  minicurso_agentes_ia: { points: 40, attendanceMode: 'DOUBLE_CHECK' },
  ativacao_stands_tech: { points: 15, attendanceMode: 'SELF_SCAN' },
  hackathon_abertura: { points: 30, attendanceMode: 'SELF_SCAN' },
  hackathon_sprint: { points: 50, attendanceMode: 'DOUBLE_CHECK' },
  hackathon_submissao: { points: 50, attendanceMode: 'DOUBLE_CHECK' },
  hackathon_premiacao: { points: 30, attendanceMode: 'SELF_SCAN' }
};

// POST /api/checkin/entrance ou /api/staff/entrance
router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  const rawUid = req.body?.participantUid || req.body?.uid;
  const { activityId } = req.body ?? {};
  const staffUid = req.user!.uid;

  if (!rawUid || !activityId || typeof rawUid !== 'string') {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid e activityId so obrigatrios.'
    });
    return;
  }

  let resolvedUid = rawUid.replace(/^mailto:/i, '').replace(/^SYMPLA:/i, 'sympla_').trim();
  if (!resolvedUid) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid e activityId so obrigatrios.'
    });
    return;
  }

  if (resolvedUid.includes('@') && !resolvedUid.startsWith('@')) {
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
    if (resolvedUid.includes('@')) {
      resolvedUid = `email_${resolvedUid.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    }
  } else if (resolvedUid.startsWith('@')) {
    try {
      const cleanUsername = resolvedUid.replace(/^@/, '').toLowerCase();
      const userSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
      if (!userSnap.empty) {
        resolvedUid = userSnap.docs[0].id;
      }
    } catch (e) {
      console.warn('Erro ao buscar UID por username no checkin de entrada:', e);
    }
    if (resolvedUid.startsWith('@')) {
      resolvedUid = `user_${resolvedUid.replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
  } else if (resolvedUid.toLowerCase().startsWith('sympla_')) {
    try {
      const rawTicket = resolvedUid.replace(/^sympla_/i, '').trim().toUpperCase();
      const ticketDoc = await db.collection('symplaTickets').doc(encodeURIComponent(rawTicket)).get?.().catch?.(() => null);
      const ticketData = ticketDoc?.data?.();
      if (ticketDoc?.exists && ticketData?.uid) {
        resolvedUid = ticketData.uid;
      } else if (typeof db.collection('users').where === 'function') {
        const ticketUserSnap = await db.collection('users').where('symplaTicketCode', '==', rawTicket).limit(1).get();
        if (ticketUserSnap && !ticketUserSnap.empty) {
          resolvedUid = ticketUserSnap.docs[0].id;
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar UID por symplaTicket no checkin de entrada:', e);
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

      const fallbackActivity = DEFAULT_ACTIVITIES_FALLBACK[activityId];
      if (!activitySnap.exists && !fallbackActivity) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Palestra no encontrada.' }
        };
      }

      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : fallbackActivity;
      const requireRegistration = activityData.requireRegistration === true;

      if (requireRegistration) {
        // Verificar se aluno está inscrito
        const bookingRef = db.collection('bookings').doc(`${resolvedUid}_${activityId}`);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists || bookingSnap.data?.()?.status === 'CANCELLED') {
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
        const rankingRef = db.collection('ranking').doc(resolvedUid);
        tx.set(userRef, {
          totalPoints: FieldValue.increment(points),
          pontuacaoTotal: FieldValue.increment(points)
        }, { merge: true });
        tx.set(rankingRef, {
          uid: resolvedUid,
          totalPoints: FieldValue.increment(points),
          pontuacaoTotal: FieldValue.increment(points),
          updatedAt: typeof FieldValue.serverTimestamp === 'function' ? FieldValue.serverTimestamp() : new Date()
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
      message: 'No foi possvel registrar a entrada.'
    });
  }
});

export default router;


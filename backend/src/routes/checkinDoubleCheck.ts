import { Router, Request, Response } from 'express';
import { db, FieldValue } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import { verifyScreenToken } from '../lib/screenToken';
import { resolveAttendanceMode } from '../lib/attendanceMode';

const router = Router();

const DEFAULT_ACTIVITIES_FALLBACK: Record<string, { points: number; attendanceMode: string; requireRegistration?: boolean }> = {
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

// POST /api/checkin/entrance
//
// Staff/ADMIN registra a entrada do participante numa atividade com
// attendanceMode DOUBLE_CHECK (D2 do SPEC KAN-51). Sem isso registrado,
// o checkout do próprio aluno é recusado (ver ENTRANCE_NOT_FOUND abaixo).
router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), participantActionLimiter, async (req: Request, res: Response) => {
  const rawUid = req.body?.uid || req.body?.participantUid;
  const { activityId } = req.body ?? {};
  const staffUid = req.user!.uid;

  let uid = typeof rawUid === 'string' ? rawUid.replace(/^mailto:/i, '').replace(/^SYMPLA:/i, 'sympla_').trim() : '';
  if (uid && !uid.includes('/')) {
    if (uid.includes('@') && !uid.startsWith('@')) {
      try {
        const cleanEmail = uid.toLowerCase();
        const userSnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
        if (!userSnap.empty) {
          uid = userSnap.docs[0].id;
        } else {
          const exactSnap = await db.collection('users').where('email', '==', uid).limit(1).get();
          if (!exactSnap.empty) {
            uid = exactSnap.docs[0].id;
          }
        }
      } catch (e) {
        console.warn('Erro ao resolver UID por e-mail em checkinDoubleCheck:', e);
      }
      if (uid.includes('@')) {
        uid = `email_${uid.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
      }
    } else if (uid.startsWith('@')) {
      try {
        const cleanUsername = uid.replace(/^@/, '').toLowerCase();
        const userSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!userSnap.empty) {
          uid = userSnap.docs[0].id;
        }
      } catch (e) {
        console.warn('Erro ao resolver UID por username em checkinDoubleCheck:', e);
      }
      if (uid.startsWith('@')) {
        uid = `user_${uid.replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      }
    } else if (uid.toLowerCase().startsWith('sympla_')) {
      try {
        const rawTicket = uid.replace(/^sympla_/i, '').trim().toUpperCase();
        const ticketDoc = await db.collection('symplaTickets').doc(encodeURIComponent(rawTicket)).get?.().catch?.(() => null);
        const ticketData = ticketDoc?.data?.();
        if (ticketDoc?.exists && ticketData?.uid) {
          uid = ticketData.uid;
        } else if (typeof db.collection('users').where === 'function') {
          const ticketUserSnap = await db.collection('users').where('symplaTicketCode', '==', rawTicket).limit(1).get();
          if (ticketUserSnap && !ticketUserSnap.empty) {
            uid = ticketUserSnap.docs[0].id;
          }
        }
      } catch (e) {
        console.warn('Erro ao resolver UID por symplaTicket em checkinDoubleCheck:', e);
      }
    }
  }

  if (typeof uid !== 'string' || !uid || !isValidFirestoreId(uid)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'uid é obrigatório e deve ser um ID válido.' });
    return;
  }

  if (typeof activityId !== 'string' || !activityId || !isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'activityId é obrigatório e deve ser um ID válido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const checkinRef = db.collection('checkins').doc(`${uid}_${activityId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [activitySnap, checkinSnap] = await Promise.all([tx.get(activityRef), tx.get(checkinRef)]);

      const fallbackActivity = DEFAULT_ACTIVITIES_FALLBACK[activityId];
      if (!activitySnap.exists && !fallbackActivity) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : fallbackActivity;
      if (resolveAttendanceMode(activityData) !== 'DOUBLE_CHECK') {
        return {
          status: 400 as const,
          body: { error: 'WRONG_ATTENDANCE_MODE', message: 'Esta atividade não usa double-check de presença.' }
        };
      }

      if (activityData.requireRegistration === true) {
        const bookingRef = db.collection('bookings').doc(`${uid}_${activityId}`);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists || bookingSnap.data?.()?.status === 'CANCELLED') {
          return {
            status: 403 as const,
            body: { error: 'NOT_REGISTERED', message: 'Não encontramos inscrição dessa pessoa nesta atividade.' }
          };
        }
      }

      // Já concluído (checkout feito) não volta pra CHECKED_IN: reabrir aqui
      // permitiria um checkout duplicado creditar pontos de novo depois.
      if (checkinSnap.exists && checkinSnap.data()?.status === 'COMPLETED') {
        return {
          status: 409 as const,
          body: { error: 'CHECKIN_DUPLICATE', message: 'Presença desta atividade já foi concluída (checkout já realizado).' }
        };
      }

      tx.set(checkinRef, {
        uid,
        activityId,
        status: 'CHECKED_IN',
        entranceAt: new Date(),
        entranceBy: staffUid,
        checkoutAt: null,
        pointsCredited: null
      });

      return { status: 200 as const, body: { success: true, status: 'CHECKED_IN' } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível registrar a entrada.' });
  }
});

// POST /api/checkin/checkout
//
// O próprio aluno chama isto escaneando o QR dinâmico do telão. uid vem
// sempre do JWT (req.user), nunca do corpo — o token só prova "este QR era
// da atividade X e ainda não expirou", não quem está escaneando.
router.post('/checkout', requireAuth, participantActionLimiter, async (req: Request, res: Response) => {
  const { token } = req.body ?? {};
  const uid = req.user!.uid;

  if (typeof token !== 'string' || !token) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'token é obrigatório.' });
    return;
  }

  const validation = verifyScreenToken(token);
  if (!validation.valid) {
    if (validation.reason === 'EXPIRED') {
      res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'O QR Code expirou. Peça pro Staff atualizar a tela.' });
      return;
    }
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'QR Code inválido.' });
    return;
  }

  const { activityId } = validation;

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const userRef = db.collection('users').doc(uid);
  const checkinRef = db.collection('checkins').doc(`${uid}_${activityId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [activitySnap, checkinSnap, userSnap] = await Promise.all([
        tx.get(activityRef),
        tx.get(checkinRef),
        tx.get(userRef)
      ]);

      const fallbackActivity = DEFAULT_ACTIVITIES_FALLBACK[activityId];
      if (!activitySnap.exists && !fallbackActivity) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : fallbackActivity;
      if (resolveAttendanceMode(activityData) !== 'DOUBLE_CHECK') {
        return {
          status: 400 as const,
          body: { error: 'WRONG_ATTENDANCE_MODE', message: 'Esta atividade não usa double-check de presença.' }
        };
      }

      if (!checkinSnap.exists) {
        return {
          status: 409 as const,
          body: { error: 'ENTRANCE_NOT_FOUND', message: 'Nenhuma entrada registrada pelo Staff para este participante.' }
        };
      }

      if (checkinSnap.data()?.status === 'COMPLETED') {
        return {
          status: 409 as const,
          body: { error: 'CHECKIN_DUPLICATE', message: 'Check-out já registrado para esta atividade.' }
        };
      }

      if (!userSnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'PARTICIPANT_NOT_FOUND', message: 'Participante não encontrado no sistema.' }
        };
      }

      const points = typeof activityData.points === 'number' ? activityData.points : 0;

      tx.update(checkinRef, {
        status: 'COMPLETED',
        checkoutAt: new Date(),
        pointsCredited: points
      });

      tx.update(userRef, {
        totalPoints: FieldValue.increment(points),
        pontuacaoTotal: FieldValue.increment(points)
      });

      const userData = userSnap.data() ?? {};
      const rankingRef = db.collection('ranking').doc(uid);
      tx.set(rankingRef, {
        uid,
        username: userData.username ?? '',
        firstName: userData.firstName ?? '',
        lastName: userData.lastName ?? '',
        displayName: userData.displayName ?? '',
        avatarUrl: userData.avatarUrl ?? null,
        course: userData.course ?? '',
        mascot: userData.mascot ?? 'blue',
        role: userData.role ?? 'PARTICIPANT',
        totalPoints: FieldValue.increment(points),
        pontuacaoTotal: FieldValue.increment(points),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return { status: 200 as const, body: { success: true, status: 'COMPLETED', pointsCredited: points } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao registrar checkout:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível registrar o checkout.' });
  }
});

export default router;

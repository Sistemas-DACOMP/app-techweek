import { Router, Request, Response } from 'express';
import { db, FieldValue } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { isValidFirestoreId } from '../lib/firestoreId';
import { verifyScreenToken } from '../lib/screenToken';
import { resolveAttendanceMode } from '../lib/attendanceMode';

const router = Router();

// POST /api/checkin/entrance
//
// Staff/ADMIN registra a entrada do participante numa atividade com
// attendanceMode DOUBLE_CHECK (D2 do SPEC KAN-51). Sem isso registrado,
// o checkout do próprio aluno é recusado (ver ENTRANCE_NOT_FOUND abaixo).
router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  const { uid, activityId } = req.body ?? {};
  const staffUid = req.user!.uid;

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

      if (!activitySnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.data() ?? {};
      if (resolveAttendanceMode(activityData) !== 'DOUBLE_CHECK') {
        return {
          status: 400 as const,
          body: { error: 'WRONG_ATTENDANCE_MODE', message: 'Esta atividade não usa double-check de presença.' }
        };
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
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
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

      if (!activitySnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.data() ?? {};
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

      return { status: 200 as const, body: { success: true, status: 'COMPLETED', pointsCredited: points } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao registrar checkout:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível registrar o checkout.' });
  }
});

export default router;

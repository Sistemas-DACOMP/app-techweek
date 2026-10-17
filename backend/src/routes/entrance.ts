import { Router, Request, Response } from 'express';
import { db, FieldValue } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

const DEFAULT_ACTIVITIES_FALLBACK: Record<string, { points: number; entrancePoints?: number; attendanceMode: string; requireRegistration?: boolean; isOpenEvent?: boolean }> = {
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
      message: 'participantUid e activityId são obrigatórios.'
    });
    return;
  }

  let parsedUid = rawUid;
  let payloadEmail: string | null = null;
  let isGeneralAccess = false;

  if (typeof parsedUid === 'string' && parsedUid.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(parsedUid.trim());
      if (parsed.type === 'GENERAL_ACCESS') {
        isGeneralAccess = true;
        parsedUid = parsed.uid || parsedUid;
        payloadEmail = parsed.email ? String(parsed.email).toLowerCase().trim() : null;
      } else {
        parsedUid = parsed.uid || parsed.id || (parsed.username ? `@${parsed.username}` : (parsed.email || parsedUid));
      }
    } catch (_e) {}
  }

  let resolvedUid = String(parsedUid).replace(/^mailto:/i, '').replace(/^SYMPLA:/i, 'sympla_').trim();
  if (!resolvedUid) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid e activityId são obrigatórios.'
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
  const userRef = db.collection('users').doc(resolvedUid);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [activitySnap, pointEventSnap, userSnap] = await Promise.all([
        tx.get(activityRef),
        tx.get(pointEventRef),
        tx.get(userRef)
      ]);

      const fallbackActivity = DEFAULT_ACTIVITIES_FALLBACK[activityId];
      if (!activitySnap.exists && !fallbackActivity) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Palestra não encontrada.' }
        };
      }

      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : fallbackActivity;
      const isOpenEvent = Boolean(activityData.isOpenEvent);

      const userData = userSnap?.exists ? userSnap.data() : null;

      // Validação anti-forja: se o QR for do tipo GENERAL_ACCESS com e-mail informado,
      // confere se o e-mail bate com o usuário cadastrado no banco de dados.
      if (isGeneralAccess && payloadEmail && userData?.email) {
        const dbEmail = String(userData.email).toLowerCase().trim();
        if (dbEmail !== payloadEmail) {
          return {
            status: 400 as const,
            body: {
              error: 'INVALID_PAYLOAD',
              message: 'QR Code inconsistente ou forjado (e-mail não confere com o usuário).'
            }
          };
        }
      }

      const hasSymplaTicket = Boolean(
        userData?.hasSymplaTicket ||
        userData?.symplaTicket ||
        userData?.sympla_ticket
      );

      // Se a atividade for fechada (exclusiva) e o usuário não tiver ingresso Sympla, barra a entrada
      if (!isOpenEvent && !hasSymplaTicket) {
        return {
          status: 403 as const,
          body: {
            error: 'SYMPLA_TICKET_REQUIRED',
            message: 'Esta atividade é exclusiva para participantes com ingresso oficial do Sympla vinculado.'
          }
        };
      }

      const requireRegistration = activityData.requireRegistration === true;

      if (requireRegistration) {
        // Verificar se aluno está inscrito
        const bookingRef = db.collection('bookings').doc(`${resolvedUid}_${activityId}`);
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists || bookingSnap.data?.()?.status === 'CANCELLED') {
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

      // Participantes sem Sympla em eventos abertos têm presença computada para controle de sala, mas pontos zerados
      const points = (!hasSymplaTicket)
        ? 0
        : (typeof activityData.entrancePoints === 'number'
            ? activityData.entrancePoints
            : (typeof activityData.points === 'number' ? activityData.points : 0));

      const metadata: Record<string, any> = { staffUid };
      if (isOpenEvent) metadata.isOpenEvent = true;
      if (!hasSymplaTicket) metadata.hasSymplaTicket = false;

      tx.set(pointEventRef, {
        userId: resolvedUid,
        eventType: 'entrance',
        referenceId: activityId,
        points,
        metadata,
        createdAt: new Date()
      });

      if (points > 0) {
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
      message: 'Não foi possível registrar a entrada.'
    });
  }
});

export default router;


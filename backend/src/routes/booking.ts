import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireSymplaTicket } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';

const router = Router();

// POST /api/activities/:activityId/reserve
//
// Reserva atômica de vaga (ou entrada na lista de espera) numa atividade.
// Exige autenticação e ingresso oficial validado do Sympla (KAN-84).
// bookingId determinístico ({uid}_{activityId}, mesmo padrão de checkin.ts) permite
// checar duplicidade dentro da própria transação, sem query extra.
router.post('/:activityId/reserve', requireAuth, participantActionLimiter, requireSymplaTicket, async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const uid = req.user!.uid;

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const bookingRef = db.collection('bookings').doc(`${uid}_${activityId}`);

  try {
    // maxAttempts: 25 (default do SDK é 5). Achado no teste de carga do
    // KAN-53: com 50 requisições concorrentes disputando o MESMO doc de
    // atividade, boa parte estourava o default de tentativas e voltava 500
    // pro participante — mesmo sem overbooking nenhum (a trava de vagas
    // sempre segurou), a experiência era ruim pra quem não é dos primeiros a
    // chegar. Mais tentativas custa só round-trips extras num contexto de
    // pico curto (evento com 1 clique só por sala), não risco de segurança.
    const result = await db.runTransaction(async (tx) => {
      // Idempotência checada antes de tudo: se o booking já existe, a
      // atividade pode até ter mudado de estado depois — não importa,
      // devolvemos o status já gravado em vez de reprocessar a reserva.
      const [bookingSnap, activitySnap] = await Promise.all([
        tx.get(bookingRef),
        tx.get(activityRef)
      ]);

      if (bookingSnap.exists) {
        const bookingData = bookingSnap.data() ?? {};
        return {
          status: 200 as const,
          body: {
            status: bookingData.status,
            position: bookingData.position ?? null,
            alreadyBooked: true
          }
        };
      }

      if (!activitySnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.data() ?? {};
      // typeof em todo campo numérico do Firestore, não só `??`: um valor
      // não-numérico (dado corrompido/migração malfeita) cairia em soma de
      // string em vez de número (ex: "4" + 1 = "41") em vez de virar 0.
      const availableSeats = typeof activityData.vagas_disponiveis === 'number' ? activityData.vagas_disponiveis : 0;
      const totalInscritos = typeof activityData.total_inscritos === 'number' ? activityData.total_inscritos : 0;
      const totalEspera = typeof activityData.total_espera === 'number' ? activityData.total_espera : 0;
      const createdAt = new Date();

      if (availableSeats > 0) {
        tx.update(activityRef, {
          vagas_disponiveis: availableSeats - 1,
          total_inscritos: totalInscritos + 1
        });

        tx.set(bookingRef, {
          userId: uid,
          activityId,
          status: 'CONFIRMED',
          position: null,
          createdAt
        });

        return { status: 200 as const, body: { status: 'CONFIRMED', position: null } };
      }

      const waitingPosition = totalEspera + 1;

      tx.update(activityRef, { total_espera: waitingPosition });

      tx.set(bookingRef, {
        userId: uid,
        activityId,
        status: 'WAITING_LIST',
        position: waitingPosition,
        createdAt
      });

      return { status: 200 as const, body: { status: 'WAITING_LIST', position: waitingPosition } };
    }, { maxAttempts: 25 });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao reservar vaga:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível processar a reserva.'
    });
  }
});

export default router;

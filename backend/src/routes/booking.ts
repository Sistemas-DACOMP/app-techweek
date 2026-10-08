import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireSymplaTicket } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';

const router = Router();

export const DEFAULT_ACTIVITIES_CATALOG: Record<string, {
  title: string;
  description: string;
  speaker: string;
  type: string;
  day: string;
  date: string;
  time: string;
  location: string;
  vagas_disponiveis: number;
  vagas_totais: number;
  total_inscritos: number;
  total_espera: number;
  points: number;
  attendanceMode: string;
}> = {
  palestra_abertura: {
    title: 'Palestra de Abertura: O Futuro da Computação e IA',
    description: 'Boas-vindas oficiais e palestra magna sobre as principais tendências tecnológicas.',
    speaker: 'Comissão Organizadora & Convidados',
    type: 'palestra',
    day: '19/10',
    date: '2026-10-19',
    time: '19:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 120,
    vagas_totais: 150,
    total_inscritos: 0,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  palestra_samuel_amorim: {
    title: 'Palestra: Dev que não aparece, não cresce',
    description: 'Como construir sua marca técnica, portfólio de impacto e se destacar no mercado.',
    speaker: 'Samuel Amorim',
    type: 'palestra',
    day: '19/10',
    date: '2026-10-19',
    time: '20:00',
    location: 'Sala 5R',
    vagas_disponiveis: 50,
    vagas_totais: 60,
    total_inscritos: 0,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  workshop_firebase_node: {
    title: 'Workshop: Arquitetura Serverless com Firebase e Node',
    description: 'Construção prática de backend serverless, Cloud Functions, regras de segurança e banco em tempo real.',
    speaker: 'Equipe de Engenharia TechWeek',
    type: 'workshop',
    day: '20/10',
    date: '2026-10-20',
    time: '14:00',
    location: 'Laboratório 1 - FACOM',
    vagas_disponiveis: 25,
    vagas_totais: 30,
    total_inscritos: 0,
    total_espera: 0,
    points: 35,
    attendanceMode: 'DOUBLE_CHECK'
  },
  minicurso_agentes_ia: {
    title: 'Minicurso: Agentes Autônomos e Engenharia de Contexto',
    description: 'Aprenda a orquestrar agentes de IA, tooling, loops de feedback e automações completas de software.',
    speaker: 'Dra. Aline Souza & Time IA',
    type: 'minicurso',
    day: '21/10',
    date: '2026-10-21',
    time: '15:30',
    location: 'Laboratório 2 - FACOM',
    vagas_disponiveis: 18,
    vagas_totais: 25,
    total_inscritos: 0,
    total_espera: 0,
    points: 40,
    attendanceMode: 'DOUBLE_CHECK'
  },
  ativacao_stands_tech: {
    title: 'Ativação: Speed Pitch & Networking com Patrocinadores',
    description: 'Conecte-se diretamente com líderes de empresas, descubra oportunidades de estágio e ganhe brindes.',
    speaker: 'Empresas Patrocinadoras',
    type: 'ativacao',
    day: '22/10',
    date: '2026-10-22',
    time: '10:00',
    location: 'Hall Central de Estandes',
    vagas_disponiveis: 80,
    vagas_totais: 100,
    total_inscritos: 0,
    total_espera: 0,
    points: 15,
    attendanceMode: 'SELF_SCAN'
  }
};

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
        const defaultActivity = DEFAULT_ACTIVITIES_CATALOG[activityId];
        if (!defaultActivity) {
          return {
            status: 404 as const,
            body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
          };
        }

        const availableSeats = defaultActivity.vagas_disponiveis;
        const totalInscritos = defaultActivity.total_inscritos;
        const createdAt = new Date();

        if (availableSeats > 0) {
          tx.set(activityRef, {
            ...defaultActivity,
            vagas_disponiveis: availableSeats - 1,
            total_inscritos: totalInscritos + 1,
            createdAt
          });

          tx.set(bookingRef, {
            userId: uid,
            activityId,
            status: 'CONFIRMED',
            position: null,
            createdAt
          });

          return { status: 200 as const, body: { status: 'CONFIRMED', position: null } };
        } else {
          tx.set(activityRef, {
            ...defaultActivity,
            total_espera: 1,
            createdAt
          });

          tx.set(bookingRef, {
            userId: uid,
            activityId,
            status: 'WAITING_LIST',
            position: 1,
            createdAt
          });

          return { status: 200 as const, body: { status: 'WAITING_LIST', position: 1 } };
        }
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

// DELETE /api/activities/:activityId/reserve
// POST /api/activities/:activityId/cancel
// Permite cancelar a reserva de vaga ou remover a atividade da agenda pessoal,
// incrementando vagas_disponíveis de volta para outros participantes.
const cancelBookingHandler = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const uid = req.user!.uid;

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const bookingRef = db.collection('bookings').doc(`${uid}_${activityId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [bookingSnap, activitySnap] = await Promise.all([
        tx.get(bookingRef),
        tx.get(activityRef)
      ]);

      if (!bookingSnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'BOOKING_NOT_FOUND', message: 'Nenhuma reserva encontrada para esta atividade.' }
        };
      }

      const bookingData = bookingSnap.data() ?? {};
      const wasConfirmed = bookingData.status === 'CONFIRMED';

      tx.delete(bookingRef);

      if (activitySnap.exists && bookingData.status === 'WAITING_LIST') {
        const actData = activitySnap.data() ?? {};
        const espera = typeof actData.total_espera === 'number' ? actData.total_espera : 1;
        tx.update(activityRef, { total_espera: Math.max(0, espera - 1) });
      }

      if (activitySnap.exists && wasConfirmed) {
        const actData = activitySnap.data() ?? {};
        const available = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;
        const totalInscritos = typeof actData.total_inscritos === 'number' ? actData.total_inscritos : 1;
        tx.update(activityRef, {
          vagas_disponiveis: available + 1,
          total_inscritos: Math.max(0, totalInscritos - 1)
        });
      }

      return {
        status: 200 as const,
        body: { success: true, message: 'Reserva cancelada com sucesso.' }
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível cancelar a reserva.'
    });
  }
};

router.delete('/:activityId/reserve', requireAuth, participantActionLimiter, cancelBookingHandler);
router.post('/:activityId/cancel', requireAuth, participantActionLimiter, cancelBookingHandler);

export default router;


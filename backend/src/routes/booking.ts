import { Router, Request, Response } from 'express';
import admin, { db } from '../config/firebaseAdmin';
import { requireAuth, requireVerifiedEmail } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import { sendWebPushToSubscription } from '../services/webPushService';

const router = Router();

export type BookingStatus =
  | 'CONFIRMED'
  | 'WAITING_LIST'
  | 'WAITING_CONFIRMATION'
  | 'CANCELLED'
  | 'EXPIRED';

export interface BookingDocument {
  userId: string;
  activityId: string;
  status: BookingStatus;
  position: number | null;
  createdAt: Date;
  notifiedAt?: Date | null;
  confirmationDeadline?: Date | null;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
  expiredAt?: Date | null;
}

export const EVENT_DAY_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas durante os dias de evento
export const PRE_EVENT_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas antes do evento
const TECHWEEK_START_ISO = '2026-10-19T00:00:00-03:00';

export function toMillis(val: unknown): number | null {
  if (!val) return null;
  if (val instanceof Date) {
    const ms = val.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'string') {
    const ms = Date.parse(val);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') {
      return (obj.toMillis as () => number)();
    }
    if (typeof obj.toDate === 'function') {
      const d = (obj.toDate as () => Date)();
      return d instanceof Date ? d.getTime() : null;
    }
    const secs = typeof obj.seconds === 'number' ? obj.seconds : typeof obj._seconds === 'number' ? obj._seconds : null;
    if (secs !== null) {
      return secs * 1000;
    }
  }
  return null;
}

export function calculateConfirmationDeadline(
  activityData?: Record<string, unknown>,
  now: Date = new Date()
): Date {
  const nowMs = now.getTime();
  const rawDate = typeof activityData?.date === 'string' ? activityData.date.trim() : '';
  let referenceEventStartMs = Date.parse(TECHWEEK_START_ISO);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const parsed = Date.parse(`${rawDate}T00:00:00-03:00`);
    if (!Number.isNaN(parsed)) {
      referenceEventStartMs = Math.min(referenceEventStartMs, parsed);
    }
  }

  // Antes do início dos dias de evento (mais de 24h de antecedência): 12h de prazo;
  // Durante os dias de evento: 2h de prazo.
  const isBeforeEventDays = !Number.isNaN(referenceEventStartMs) && nowMs < referenceEventStartMs - 24 * 60 * 60 * 1000;
  const ttlMs = isBeforeEventDays ? PRE_EVENT_TTL_MS : EVENT_DAY_TTL_MS;
  return new Date(nowMs + ttlMs);
}

export function formatDeadlineHHMM(deadline: Date): string {
  try {
    return deadline.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    const hours = String(deadline.getHours()).padStart(2, '0');
    const minutes = String(deadline.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export interface PromotionNotificationPayload {
  userId: string;
  activityId: string;
  activityTitle: string;
  confirmationDeadline: Date;
  notifiedAt: Date;
}

export async function notifyWaitingListPromotion(payload: PromotionNotificationPayload): Promise<{
  title: string;
  body: string;
  fcmSent: number;
  webPushSent: number;
  recordedInFeed: boolean;
}> {
  const { userId, activityId, activityTitle, confirmationDeadline, notifiedAt } = payload;
  const deadlineStr = formatDeadlineHHMM(confirmationDeadline);
  const title = 'Vaga liberada na fila de espera!';
  const body = `Uma vaga abriu para ${activityTitle}! Você tem até às ${deadlineStr} para confirmar sua presença.`;

  let fcmSent = 0;
  let webPushSent = 0;
  let recordedInFeed = false;

  // 1. Registra o evento no histórico/feed de notificações do usuário no Firestore
  try {
    const notifCol = db.collection('notifications');
    if (notifCol && typeof notifCol.doc === 'function') {
      const notifRef = notifCol.doc(`${userId}_waiting_${activityId}`) as unknown as {
        set?: (data: Record<string, unknown>) => Promise<unknown>;
      };
      if (typeof notifRef.set === 'function') {
        await notifRef.set({
          userId,
          activityId,
          activityTitle,
          type: 'WAITING_CONFIRMATION',
          title,
          body,
          confirmationDeadline,
          createdAt: notifiedAt,
          read: false
        });
        recordedInFeed = true;
      }
    }
  } catch (err) {
    console.warn('Falha ao gravar notificação no feed do Firestore:', err);
  }

  // 2. Coleta tokens FCM e inscrições Web Push do usuário promovido
  const fcmTokens = new Set<string>();
  try {
    const usersCol = db.collection('users');
    if (usersCol && typeof usersCol.doc === 'function') {
      const userRef = usersCol.doc(userId) as unknown as {
        get?: () => Promise<{ exists?: boolean; data?: () => Record<string, unknown> }>;
      };
      if (typeof userRef.get === 'function') {
        const userSnap = await userRef.get();
        if (userSnap?.exists && typeof userSnap.data === 'function') {
          const uData = userSnap.data() ?? {};
          if (typeof uData.fcmToken === 'string' && uData.fcmToken.trim()) {
            fcmTokens.add(uData.fcmToken.trim());
          }
          if (Array.isArray(uData.fcmTokens)) {
            for (const t of uData.fcmTokens) {
              if (typeof t === 'string' && t.trim()) fcmTokens.add(t.trim());
            }
          }
        }
      }
    }
  } catch {
    // Continua silenciosamente se leitura opcional do doc do usuário falhar
  }

  try {
    const subsCol = db.collection('push_subscriptions') as unknown as {
      where?: (field: string, op: string, val: string) => {
        get?: () => Promise<{ empty?: boolean; docs?: Array<{ id?: string; data: () => Record<string, unknown> }> }>;
      };
    };
    if (subsCol && typeof subsCol.where === 'function') {
      const subDocsMap = new Map<string, { data: () => Record<string, unknown> }>();
      const uidQuery = subsCol.where('uid', '==', userId);
      if (uidQuery && typeof uidQuery.get === 'function') {
        const uidSnap = await uidQuery.get();
        for (const d of uidSnap?.docs ?? []) {
          const key = d.id || String((d.data() ?? {}).endpoint || subDocsMap.size);
          subDocsMap.set(key, d);
        }
      }
      if (subDocsMap.size === 0) {
        const userIdQuery = subsCol.where('userId', '==', userId);
        if (userIdQuery && typeof userIdQuery.get === 'function') {
          const userIdSnap = await userIdQuery.get();
          for (const d of userIdSnap?.docs ?? []) {
            const key = d.id || String((d.data() ?? {}).endpoint || subDocsMap.size);
            subDocsMap.set(key, d);
          }
        }
      }

      const webPushPromises: Array<Promise<void>> = [];
      for (const subDoc of subDocsMap.values()) {
        const subData = subDoc.data() ?? {};
        if (typeof subData.fcmToken === 'string' && subData.fcmToken.trim()) {
          fcmTokens.add(subData.fcmToken.trim());
        }
        const keys = subData.keys as { p256dh?: string; auth?: string } | undefined;
        if (typeof subData.endpoint === 'string' && keys?.p256dh && keys?.auth) {
          const endpoint = subData.endpoint;
          const p256dh = keys.p256dh;
          const authKey = keys.auth;
          webPushPromises.push(
            sendWebPushToSubscription(
              { endpoint, keys: { p256dh, auth: authKey } },
              {
                title,
                body,
                actionUrl: '/',
                actionLabel: 'Confirmar Minha Vaga',
                urgent: true,
                type: 'WAITING_CONFIRMATION',
                tag: `waiting-confirmation-${activityId}`
              }
            ).then((res) => {
              if (res?.ok) webPushSent += 1;
            })
          );
        }
      }
      if (webPushPromises.length > 0) {
        await Promise.allSettled(webPushPromises);
      }
    }
  } catch {
    // Continua silenciosamente se push_subscriptions não estiver disponível
  }

  // 3. Dispara Push Notification via FCM em paralelo para todos os tokens do usuário promovido
  try {
    const messagingFn = (admin as unknown as { messaging?: () => { send?: (msg: unknown) => Promise<unknown> } })?.messaging;
    if (typeof messagingFn === 'function' && fcmTokens.size > 0) {
      const messaging = messagingFn.call(admin);
      if (messaging && typeof messaging.send === 'function') {
        await Promise.allSettled(
          Array.from(fcmTokens).map(async (token) => {
            try {
              await messaging.send!({
                token,
                notification: { title, body },
                data: {
                  type: 'WAITING_CONFIRMATION',
                  activityId,
                  confirmationDeadline: confirmationDeadline.toISOString(),
                  url: '/'
                }
              });
              fcmSent += 1;
            } catch (fcmErr) {
              console.warn('Falha ao enviar FCM para token do participante promovido:', fcmErr);
            }
          })
        );
      }
    }
  } catch {
    // Não interrompe o fluxo caso FCM não esteja configurado no ambiente local/teste
  }

  return { title, body, fcmSent, webPushSent, recordedInFeed };
}

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
  isOpenEvent?: boolean;
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
// Exige autenticação e e-mail confirmado (KAN-116).
// Para atividades exclusivas (isOpenEvent !== true), exige ingresso oficial do Sympla vinculado (KAN-84).
// Atividades com isOpenEvent === true são abertas para qualquer participante cadastrado.
// bookingId determinístico ({uid}_{activityId}, mesmo padrão de checkin.ts) permite
// checar duplicidade dentro da própria transação, sem query extra.
router.post('/:activityId/reserve', requireAuth, requireVerifiedEmail, participantActionLimiter, async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const uid = req.user!.uid;

  if (!isValidFirestoreId(activityId)) {
    res.status(400).json({ error: 'INVALID_ACTIVITY_ID', message: 'activityId inválido.' });
    return;
  }

  const activityRef = db.collection('activities').doc(activityId);
  const bookingRef = db.collection('bookings').doc(`${uid}_${activityId}`);
  const userRef = db.collection('users').doc(uid);

  try {
    const result = await db.runTransaction(async (tx) => {
      // Idempotência checada antes de tudo: se o booking já existe, a
      // atividade pode até ter mudado de estado depois — não importa,
      // devolvemos o status já gravado em vez de reprocessar a reserva.
      const [bookingSnap, activitySnap, userSnap] = await Promise.all([
        tx.get(bookingRef),
        tx.get(activityRef),
        tx.get(userRef)
      ]);

      if (bookingSnap.exists) {
        const bookingData = bookingSnap.data() ?? {};
        if (bookingData.status !== 'CANCELLED' && bookingData.status !== 'EXPIRED') {
          return {
            status: 200 as const,
            body: {
              status: bookingData.status,
              position: bookingData.position ?? null,
              ...(bookingData.confirmationDeadline ? { confirmationDeadline: bookingData.confirmationDeadline } : {}),
              alreadyBooked: true
            }
          };
        }
      }

      const defaultActivity = DEFAULT_ACTIVITIES_CATALOG[activityId];
      if (!activitySnap.exists && !defaultActivity) {
        return {
          status: 404 as const,
          body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada.' }
        };
      }

      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : defaultActivity;
      const isOpenEvent = Boolean(activityData.isOpenEvent !== undefined ? activityData.isOpenEvent : defaultActivity?.isOpenEvent);

      // Se não for evento aberto e o usuário não for ADMIN, exige ingresso Sympla (KAN-84)
      if (!isOpenEvent && req.user?.role !== 'ADMIN') {
        const userData = userSnap.exists ? userSnap.data() : null;
        const hasTicket = Boolean(
          userData?.hasSymplaTicket ||
          userData?.symplaTicket ||
          userData?.sympla_ticket
        );

        if (!userSnap.exists || !hasTicket) {
          return {
            status: 403 as const,
            body: {
              error: 'SYMPLA_TICKET_REQUIRED',
              message: 'É necessário possuir um ingresso oficial do Sympla vinculado à conta para realizar esta ação.'
            }
          };
        }
      }

      if (!activitySnap.exists) {
        const availableSeats = defaultActivity!.vagas_disponiveis;
        const totalInscritos = defaultActivity!.total_inscritos;
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
            waiting_seq: 1,
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

      // typeof em todo campo numérico do Firestore, não só `??`: um valor
      // não-numérico (dado corrompido/migração malfeita) cairia em soma de
      // string em vez de número (ex: "4" + 1 = "41") em vez de virar 0.
      const availableSeats = typeof activityData.vagas_disponiveis === 'number' ? activityData.vagas_disponiveis : 0;
      const totalInscritos = typeof activityData.total_inscritos === 'number' ? activityData.total_inscritos : 0;
      const totalEspera = typeof activityData.total_espera === 'number' ? activityData.total_espera : 0;
      const rawWaitingSeq = (activityData as Record<string, any>).waiting_seq;
      const currentSeq = typeof rawWaitingSeq === 'number' ? rawWaitingSeq : totalEspera;
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

      const nextWaitingCount = totalEspera + 1;
      const waitingPosition = Math.max(nextWaitingCount, currentSeq + 1);

      tx.update(activityRef, {
        total_espera: nextWaitingCount,
        waiting_seq: waitingPosition
      });

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
// Cancela a reserva de vaga. Quando uma inscrição CONFIRMED é cancelada e há
// participantes na WAITING_LIST, promove o 1º colocado para WAITING_CONFIRMATION
// com prazo de validade (confirmationDeadline) e dispara notificação.
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
          body: { error: 'BOOKING_NOT_FOUND', message: 'Nenhuma reserva encontrada para esta atividade.' },
          promotion: null as PromotionNotificationPayload | null
        };
      }

      const bookingData = bookingSnap.data() ?? {};
      const wasConfirmed = bookingData.status === 'CONFIRMED';
      const wasWaitingConfirmation = bookingData.status === 'WAITING_CONFIRMATION';
      const actData = activitySnap.exists ? (activitySnap.data() ?? {}) : {};
      const totalEspera = typeof actData.total_espera === 'number' ? actData.total_espera : 0;

      // Se a vaga liberada estava CONFIRMED ou WAITING_CONFIRMATION e há fila de espera,
      // busca o 1º elegível da WAITING_LIST antes de qualquer escrita na transação.
      let promotedBookingDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      if (activitySnap.exists && (wasConfirmed || wasWaitingConfirmation) && totalEspera > 0) {
        const waitingQuery = db.collection('bookings')
          .where('activityId', '==', activityId)
          .where('status', '==', 'WAITING_LIST')
          .orderBy('position', 'asc')
          .limit(1);
        const waitingSnap = await tx.get(waitingQuery);
        if (!waitingSnap.empty) {
          promotedBookingDoc = waitingSnap.docs[0];
        }
      }

      tx.delete(bookingRef);

      if (activitySnap.exists && bookingData.status === 'WAITING_LIST') {
        const espera = typeof actData.total_espera === 'number' ? actData.total_espera : 1;
        tx.update(activityRef, { total_espera: Math.max(0, espera - 1) });
      }

      let promotion: PromotionNotificationPayload | null = null;

      if (activitySnap.exists && (wasConfirmed || wasWaitingConfirmation)) {
        const available = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;
        const totalInscritos = typeof actData.total_inscritos === 'number' ? actData.total_inscritos : 1;

        if (promotedBookingDoc) {
          const now = new Date();
          const confirmationDeadline = calculateConfirmationDeadline(actData, now);
          const promotedData = promotedBookingDoc.data() ?? {};

          tx.update(promotedBookingDoc.ref, {
            status: 'WAITING_CONFIRMATION',
            confirmationDeadline,
            notifiedAt: now
          });

          if (wasConfirmed) {
            // A vaga confirmada saiu (total_inscritos - 1), mas permanece retida
            // (vagas_disponiveis não sobe) aguardando confirmação do promovido.
            tx.update(activityRef, {
              total_inscritos: Math.max(0, totalInscritos - 1)
            });
          } else {
            // O usuário que cancelou já estava em WAITING_CONFIRMATION: decrementa total_espera.
            tx.update(activityRef, {
              total_espera: Math.max(0, totalEspera - 1)
            });
          }

          if (typeof promotedData.userId === 'string') {
            promotion = {
              userId: promotedData.userId,
              activityId,
              activityTitle: typeof actData.title === 'string' && actData.title
                ? actData.title
                : (DEFAULT_ACTIVITIES_CATALOG[activityId]?.title ?? activityId),
              confirmationDeadline,
              notifiedAt: now
            };
          }
        } else {
          if (wasConfirmed) {
            tx.update(activityRef, {
              vagas_disponiveis: available + 1,
              total_inscritos: Math.max(0, totalInscritos - 1)
            });
          } else {
            tx.update(activityRef, {
              vagas_disponiveis: available + 1,
              total_espera: Math.max(0, totalEspera - 1)
            });
          }
        }
      }

      return {
        status: 200 as const,
        body: { success: true, message: 'Reserva cancelada com sucesso.' },
        promotion
      };
    });

    if (result.promotion) {
      await notifyWaitingListPromotion(result.promotion);
    }

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível cancelar a reserva.'
    });
  }
};

// POST /api/activities/:activityId/confirm-waiting
// Confirma a vaga dentro do prazo (confirmationDeadline) para um participante
// atualmente em WAITING_CONFIRMATION.
const confirmWaitingHandler = async (req: Request, res: Response) => {
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
          body: { error: 'BOOKING_NOT_FOUND', message: 'Nenhuma inscrição encontrada para esta atividade.' }
        };
      }

      const bookingData = bookingSnap.data() ?? {};

      if (bookingData.status === 'EXPIRED') {
        return {
          status: 410 as const,
          body: {
            error: 'CONFIRMATION_EXPIRED',
            message: 'O prazo para confirmar sua vaga expirou e ela foi repassada ao próximo da fila.'
          }
        };
      }

      if (bookingData.status !== 'WAITING_CONFIRMATION') {
        return {
          status: 409 as const,
          body: {
            error: 'INVALID_BOOKING_STATUS',
            message: 'Sua inscrição não está aguardando confirmação de vaga.'
          }
        };
      }

      const now = new Date();
      const deadlineMs = toMillis(bookingData.confirmationDeadline);
      if (deadlineMs !== null && now.getTime() > deadlineMs) {
        return {
          status: 410 as const,
          body: {
            error: 'CONFIRMATION_EXPIRED',
            message: 'O prazo para confirmar sua vaga expirou.'
          }
        };
      }

      tx.update(bookingRef, {
        status: 'CONFIRMED',
        position: null,
        confirmationDeadline: null,
        confirmedAt: now
      });

      if (activitySnap.exists) {
        const actData = activitySnap.data() ?? {};
        const totalInscritos = typeof actData.total_inscritos === 'number' ? actData.total_inscritos : 0;
        const totalEspera = typeof actData.total_espera === 'number' ? actData.total_espera : 1;
        tx.update(activityRef, {
          total_inscritos: totalInscritos + 1,
          total_espera: Math.max(0, totalEspera - 1)
        });
      }

      return {
        status: 200 as const,
        body: {
          status: 'CONFIRMED',
          position: null,
          message: 'Presença confirmada com sucesso!'
        }
      };
    }, { maxAttempts: 25 });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao confirmar vaga da lista de espera:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível confirmar a vaga.'
    });
  }
};

// POST /api/activities/:activityId/decline-waiting
// Recusa voluntariamente a vaga em WAITING_CONFIRMATION, alterando o status para
// CANCELLED e promovendo imediatamente o próximo participante elegível da WAITING_LIST.
const declineWaitingHandler = async (req: Request, res: Response) => {
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
          body: { error: 'BOOKING_NOT_FOUND', message: 'Nenhuma inscrição encontrada para esta atividade.' },
          promotion: null as PromotionNotificationPayload | null
        };
      }

      const bookingData = bookingSnap.data() ?? {};
      if (bookingData.status !== 'WAITING_CONFIRMATION') {
        return {
          status: 409 as const,
          body: {
            error: 'INVALID_BOOKING_STATUS',
            message: 'Sua inscrição não está aguardando confirmação de vaga.'
          },
          promotion: null as PromotionNotificationPayload | null
        };
      }

      const actData = activitySnap.exists ? (activitySnap.data() ?? {}) : {};
      const totalEspera = typeof actData.total_espera === 'number' ? actData.total_espera : 1;
      const available = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;

      let promotedBookingDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      if (activitySnap.exists && totalEspera > 1) {
        const waitingQuery = db.collection('bookings')
          .where('activityId', '==', activityId)
          .where('status', '==', 'WAITING_LIST')
          .orderBy('position', 'asc')
          .limit(1);
        const waitingSnap = await tx.get(waitingQuery);
        if (!waitingSnap.empty) {
          promotedBookingDoc = waitingSnap.docs[0];
        }
      } else if (activitySnap.exists) {
        // Mesmo se total_espera estiver dessincronizado (=1), consulta a fila por segurança
        const waitingQuery = db.collection('bookings')
          .where('activityId', '==', activityId)
          .where('status', '==', 'WAITING_LIST')
          .orderBy('position', 'asc')
          .limit(1);
        const waitingSnap = await tx.get(waitingQuery);
        if (!waitingSnap.empty) {
          promotedBookingDoc = waitingSnap.docs[0];
        }
      }

      const now = new Date();
      tx.update(bookingRef, {
        status: 'CANCELLED',
        position: null,
        confirmationDeadline: null,
        cancelledAt: now
      });

      let promotion: PromotionNotificationPayload | null = null;

      if (activitySnap.exists) {
        if (promotedBookingDoc) {
          const confirmationDeadline = calculateConfirmationDeadline(actData, now);
          const promotedData = promotedBookingDoc.data() ?? {};

          tx.update(promotedBookingDoc.ref, {
            status: 'WAITING_CONFIRMATION',
            confirmationDeadline,
            notifiedAt: now
          });

          tx.update(activityRef, {
            total_espera: Math.max(0, totalEspera - 1)
          });

          if (typeof promotedData.userId === 'string') {
            promotion = {
              userId: promotedData.userId,
              activityId,
              activityTitle: typeof actData.title === 'string' && actData.title
                ? actData.title
                : (DEFAULT_ACTIVITIES_CATALOG[activityId]?.title ?? activityId),
              confirmationDeadline,
              notifiedAt: now
            };
          }
        } else {
          tx.update(activityRef, {
            vagas_disponiveis: available + 1,
            total_espera: Math.max(0, totalEspera - 1)
          });
        }
      }

      return {
        status: 200 as const,
        body: {
          status: 'CANCELLED',
          message: 'Vaga recusada e liberada para o próximo participante da fila.'
        },
        promotion
      };
    }, { maxAttempts: 25 });

    if (result.promotion) {
      await notifyWaitingListPromotion(result.promotion);
    }

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao recusar vaga da lista de espera:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível recusar a vaga.'
    });
  }
};

// Job de expiração automática (chamado pelo Cloud Scheduler a cada 5 minutos):
// Busca bookings com status == 'WAITING_CONFIRMATION' e confirmationDeadline < now,
// marca como EXPIRED e promove o próximo elegível da WAITING_LIST.
export async function processExpiredWaitingBookings(now: Date = new Date()): Promise<{
  expiredCount: number;
  promotedCount: number;
}> {
  const expiredQuery = db.collection('bookings')
    .where('status', '==', 'WAITING_CONFIRMATION')
    .where('confirmationDeadline', '<', now)
    .limit(100);

  const expiredSnap = await expiredQuery.get();
  if (!expiredSnap || expiredSnap.empty) {
    return { expiredCount: 0, promotedCount: 0 };
  }

  let expiredCount = 0;
  let promotedCount = 0;
  const promotionsToNotify: PromotionNotificationPayload[] = [];

  for (const expiredDoc of expiredSnap.docs) {
    const docData = expiredDoc.data() ?? {};
    const activityId = typeof docData.activityId === 'string' ? docData.activityId : '';
    if (!activityId) continue;

    const activityRef = db.collection('activities').doc(activityId);
    const expiredBookingRef = expiredDoc.ref;

    try {
      const txResult = await db.runTransaction(async (tx) => {
        const [freshBookingSnap, activitySnap] = await Promise.all([
          tx.get(expiredBookingRef),
          tx.get(activityRef)
        ]);

        if (!freshBookingSnap.exists) {
          return { expired: false, promotion: null as PromotionNotificationPayload | null };
        }

        const freshBookingData = freshBookingSnap.data() ?? {};
        if (freshBookingData.status !== 'WAITING_CONFIRMATION') {
          return { expired: false, promotion: null as PromotionNotificationPayload | null };
        }

        const deadlineMs = toMillis(freshBookingData.confirmationDeadline);
        if (deadlineMs !== null && deadlineMs >= now.getTime()) {
          return { expired: false, promotion: null as PromotionNotificationPayload | null };
        }

        let promotedBookingDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
        if (activitySnap.exists) {
          const waitingQuery = db.collection('bookings')
            .where('activityId', '==', activityId)
            .where('status', '==', 'WAITING_LIST')
            .orderBy('position', 'asc')
            .limit(1);
          const waitingSnap = await tx.get(waitingQuery);
          if (!waitingSnap.empty) {
            promotedBookingDoc = waitingSnap.docs[0];
          }
        }

        tx.update(expiredBookingRef, {
          status: 'EXPIRED',
          position: null,
          confirmationDeadline: null,
          expiredAt: now
        });

        let promotion: PromotionNotificationPayload | null = null;

        if (activitySnap.exists) {
          const actData = activitySnap.data() ?? {};
          const totalEspera = typeof actData.total_espera === 'number' ? actData.total_espera : 1;
          const available = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;

          if (promotedBookingDoc) {
            const confirmationDeadline = calculateConfirmationDeadline(actData, now);
            const promotedData = promotedBookingDoc.data() ?? {};

            tx.update(promotedBookingDoc.ref, {
              status: 'WAITING_CONFIRMATION',
              confirmationDeadline,
              notifiedAt: now
            });

            tx.update(activityRef, {
              total_espera: Math.max(0, totalEspera - 1)
            });

            if (typeof promotedData.userId === 'string') {
              promotion = {
                userId: promotedData.userId,
                activityId,
                activityTitle: typeof actData.title === 'string' && actData.title
                  ? actData.title
                  : (DEFAULT_ACTIVITIES_CATALOG[activityId]?.title ?? activityId),
                confirmationDeadline,
                notifiedAt: now
              };
            }
          } else {
            tx.update(activityRef, {
              vagas_disponiveis: available + 1,
              total_espera: Math.max(0, totalEspera - 1)
            });
          }
        }

        return { expired: true, promotion };
      });

      if (txResult.expired) {
        expiredCount += 1;
      }
      if (txResult.promotion) {
        promotedCount += 1;
        promotionsToNotify.push(txResult.promotion);
      }
    } catch (err) {
      console.error(`Erro ao expirar booking ${expiredDoc.id}:`, err);
    }
  }

  if (promotionsToNotify.length > 0) {
    await Promise.allSettled(promotionsToNotify.map((p) => notifyWaitingListPromotion(p)));
  }

  return { expiredCount, promotedCount };
}

router.delete('/:activityId/reserve', requireAuth, requireVerifiedEmail, participantActionLimiter, cancelBookingHandler);
router.post('/:activityId/cancel', requireAuth, requireVerifiedEmail, participantActionLimiter, cancelBookingHandler);
router.post('/:activityId/confirm-waiting', requireAuth, requireVerifiedEmail, participantActionLimiter, confirmWaitingHandler);
router.post('/:activityId/decline-waiting', requireAuth, requireVerifiedEmail, participantActionLimiter, declineWaitingHandler);

export default router;



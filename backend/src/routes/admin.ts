import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db, auth } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { adminBroadcastLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import { UserRole } from '../types/express';
import {
  getVapidKeys,
  subscriptionIdFromEndpoint,
  dispatchWebPushBroadcast,
  sendWebPushToSubscription,
} from '../services/webPushService';

const router = Router();

const VALID_ROLES: UserRole[] = ['PARTICIPANT', 'STAFF', 'SPONSOR', 'ADMIN'];

class UserNotFoundError extends Error {}
class LastAdminProtectedError extends Error {}

/**
 * Handler do endpoint PUT /api/admin/users/:uid/role (KAN-60, KAN-81).
 *
 * Atualiza o papel do usuário em dois sistemas que não são atômicos entre si:
 * o campo `role` do documento /users/{uid} no Firestore (fonte usada pelo
 * resto da aplicação pra exibir/filtrar por papel) e o custom claim do
 * Firebase Auth (fonte usada por requireRole via JWT). Ordem escolhida:
 * Firestore primeiro, dentro de uma transação, claim depois.
 *
 * KAN-81 (revisão de segurança pós-KAN-60): sem trava, o último ADMIN pode
 * se rebaixar (ou ser rebaixado) e ninguém mais consegue promover ninguém de
 * volta pela API — recuperação exigiria acesso ao console do Firebase
 * (firebase/gcloud CLI não estão disponíveis nesta máquina). A checagem
 * "sobra pelo menos 1 ADMIN" só entra em jogo quando a troca REMOVE o papel
 * de ADMIN de alguém que hoje é ADMIN.
 *
 * Por que a checagem + a escrita no Firestore precisam estar na MESMA
 * transação (achado do security review, não simplificação gratuita): duas
 * trocas concorrentes rebaixando dois ADMINs diferentes podiam cada uma ler
 * "sobram 2 ADMINs" antes da outra terminar, e as duas passavam — sistema
 * ficava com 0 ADMIN. Como a query de contagem e o `tx.update` do alvo leem
 * e escrevem o mesmo conjunto de documentos (todo doc com `role == 'ADMIN'`),
 * o Firestore detecta a sobreposição e força um retry da segunda transação,
 * que então reconta corretamente e bloqueia. É por isso que a ordem virou
 * Firestore-primeiro: a invariante só é atômica se a contagem e a escrita
 * acontecem juntas, e só o Firestore (não o Firebase Auth) tem transação.
 *
 * Consequência dessa inversão: se o claim do Auth falhar depois do Firestore
 * já ter sido gravado, o Firestore fica com a role nova mas a permissão real
 * (JWT) continua com a antiga até alguém reconciliar — reportado como
 * `ROLE_PARTIALLY_UPDATED`, nunca escondido atrás de um 500 genérico.
 *
 * Exportado separado do `router.put` pra permitir teste unitário isolado
 * (ver convenção em routes/leads.ts e routes/auth.ts).
 */
export async function updateUserRoleHandler(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { role } = req.body ?? {};

  if (!isValidFirestoreId(uid)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'uid inválido.' });
    return;
  }

  if (typeof role !== 'string' || !VALID_ROLES.includes(role as UserRole)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: `role é obrigatório e deve ser um dos valores: ${VALID_ROLES.join(', ')}.`
    });
    return;
  }

  const userRef = db.collection('users').doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new UserNotFoundError();
      }

      const currentRole = userSnap.data()?.role;

      if (currentRole === 'ADMIN' && role !== 'ADMIN') {
        const adminsSnap = await tx.get(db.collection('users').where('role', '==', 'ADMIN'));
        if (adminsSnap.size <= 1) {
          throw new LastAdminProtectedError();
        }
      }

      tx.update(userRef, { role });
    });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' });
      return;
    }
    if (error instanceof LastAdminProtectedError) {
      res.status(409).json({
        error: 'LAST_ADMIN_PROTECTED',
        message: 'Este é o único usuário com papel ADMIN no sistema. Promova outro usuário a ADMIN antes de rebaixar este.'
      });
      return;
    }
    console.error('Erro ao atualizar role no Firestore:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível atualizar o usuário.' });
    return;
  }

  try {
    // Merge com os claims existentes, não substitui o objeto inteiro — hoje
    // `role` é o único claim em uso, mas setCustomUserClaims sobrescreve tudo
    // que não for repassado aqui, então um claim futuro (ex: feature flag por
    // usuário) seria apagado silenciosamente numa troca de role sem isso.
    const existingUser = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...existingUser.customClaims, role });
  } catch (error: any) {
    console.error('Erro ao definir custom claim de role após Firestore já atualizado:', error?.message || error);
    const contaInexistente = error?.code === 'auth/user-not-found' ? ' (a conta não existe mais no Firebase Auth)' : '';
    res.status(500).json({
      error: 'ROLE_PARTIALLY_UPDATED',
      message: `O documento /users/${uid} já foi atualizado para "${role}" no Firestore, mas a permissão real (custom claim do Firebase Auth) não foi alterada${contaInexistente}. Os dois sistemas estão divergentes — reconciliar manualmente.`
    });
    return;
  }

  res.status(200).json({ success: true, uid, role });
}

// PUT /api/admin/users/:uid/role — apenas ADMIN pode alterar o papel de outro usuário.
router.put('/users/:uid/role', requireAuth, requireRole(['ADMIN']), updateUserRoleHandler);


/**
 * Handler do endpoint POST /api/admin/notifications/broadcast (KAN-61).
 *
 * Push (FCM) e gravacao em /announcements sao dois sistemas que nao sao
 * atomicos entre si (mesma natureza do problema do KAN-60, agora entre um
 * servico externo e o Firestore em vez de dois servicos do Firebase).
 *
 * Ordem escolhida: Firestore primeiro, push depois. /announcements e a fonte
 * de verdade que o PWA escuta em tempo real (KAN-56) - se o push falhar
 * depois do Firestore ja ter gravado, o aviso continua visivel no feed do
 * app, entao isso e reportado como sucesso parcial (502) em vez de escondido
 * atras de um 500 generico. Se a ordem fosse invertida e o Firestore
 * falhasse depois do push, o usuario teria visto uma notificacao sem
 * nenhum registro correspondente pra consultar depois - pior cenario.
 *
 * Topico fixo 'todos_participantes' (unica audiencia pedida no DoD do
 * KAN-61) - nao implementa selecao de topico custom, nao foi pedido.
 */
// Achado do security review (KAN-61): sem teto de tamanho, um ADMIN
// comprometido conseguia gravar anuncio degenerado em /announcements mesmo
// que o push do FCM depois falhasse/truncasse (FCM aceita ~4KB por
// mensagem). Limites abaixo sao generosos pra notificacao de tela de
// bloqueio, nao pensados como paragrafo longo.
const MAX_TITLE_LENGTH = 150;
const MAX_BODY_LENGTH = 1000;
const HTML_TAG_REGEX = /<[a-z/!][\s\S]*?>/i;

export async function broadcastNotificationHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.uid) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Usuario nao autenticado.' });
    return;
  }

  const { title, body } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'title e obrigatorio e deve ser uma string nao vazia.' });
    return;
  }

  if (typeof body !== 'string' || !body.trim()) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'body e obrigatorio e deve ser uma string nao vazia.' });
    return;
  }

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (HTML_TAG_REGEX.test(trimmedTitle) || HTML_TAG_REGEX.test(trimmedBody)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'title e body nao podem conter tags HTML ou scripts.'
    });
    return;
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: `title deve ter no maximo ${MAX_TITLE_LENGTH} caracteres.` });
    return;
  }

  if (trimmedBody.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: `body deve ter no maximo ${MAX_BODY_LENGTH} caracteres.` });
    return;
  }
  const announcementRef = db.collection('announcements').doc();

  try {
    await announcementRef.set({
      title: trimmedTitle,
      body: trimmedBody,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao gravar comunicado em /announcements:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Nao foi possivel gravar o comunicado.' });
    return;
  }

  try {
    await admin.messaging().send({
      topic: 'todos_participantes',
      notification: { title: trimmedTitle, body: trimmedBody }
    });
  } catch (error: any) {
    console.error('Erro ao disparar push FCM do broadcast:', error?.message || error);
    res.status(502).json({
      error: 'BROADCAST_PARTIALLY_SENT',
      message: 'O comunicado (id ' + announcementRef.id + ') ja foi salvo em /announcements e esta visivel no feed do app, mas o push via FCM falhou. Participantes nao receberam a notificacao. Reenviar manualmente se necessario.',
      announcementId: announcementRef.id
    });
    return;
  }

  // Dispara o Web Push W3C diretamente para as inscrições salvas (garante entrega no iOS PWA fechado)
  try {
    await dispatchWebPushBroadcast(db, {
      id: announcementRef.id,
      title: trimmedTitle,
      body: trimmedBody,
      message: trimmedBody,
      actionUrl: '/',
      priority: 'HIGH',
      urgent: true,
      type: 'system',
    });
  } catch (error: any) {
    console.error('Erro ao disparar Web Push nativo no broadcast:', error?.message || error);
    // Não retornamos erro HTTP aqui pois o comunicado já foi salvo e enviado via FCM com sucesso.
  }

  res.status(201).json({ success: true, announcementId: announcementRef.id });
}

// POST /api/admin/notifications/broadcast - apenas ADMIN dispara aviso global (KAN-61).
router.post('/notifications/broadcast', requireAuth, requireRole(['ADMIN']), adminBroadcastLimiter, broadcastNotificationHandler);

export async function activityBroadcastHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.uid) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Usuario nao autenticado.' });
    return;
  }
  
  const { activityId } = req.params;
  const { title, body, message, targetAudience, urgent } = req.body ?? {};
  
  if (!activityId) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'activityId é obrigatório.' });
    return;
  }

  const resolvedTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Aviso da Atividade';
  const resolvedBody = typeof body === 'string' && body.trim() ? body.trim() : (typeof message === 'string' && message.trim() ? message.trim() : '');
  
  if (!resolvedBody) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'O corpo (body/message) do comunicado é obrigatório.' });
    return;
  }

  try {
    const bookingsSnap = await db.collection('bookings').where('activityId', '==', activityId).get();
    const targetUids = new Set<string>();
    
    if (bookingsSnap && !bookingsSnap.empty) {
      bookingsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (targetAudience === 'waiting') {
          if (data.status === 'WAITING_LIST') targetUids.add(data.userId);
        } else if (targetAudience === 'checked_in') {
          if (data.status === 'CHECKED_IN' || data.status === 'COMPLETED') targetUids.add(data.userId);
        } else if (targetAudience === 'pending') {
          if (data.status === 'CONFIRMED') targetUids.add(data.userId);
        } else {
          // 'all'
          targetUids.add(data.userId);
        }
      });
    }

    if (targetUids.size === 0) {
      res.status(200).json({ success: true, message: 'Nenhum usuário correspondente ao público-alvo encontrado.', sent: 0 });
      return;
    }

    const payload = {
      title: resolvedTitle.substring(0, 150),
      body: resolvedBody.substring(0, 1000),
      message: resolvedBody.substring(0, 1000),
      actionUrl: `/agenda?act=${activityId}`,
      actionLabel: 'Ver atividade',
      priority: urgent ? 'HIGH' : 'NORMAL',
      urgent: !!urgent,
      type: 'lecture'
    };

    let sent = 0;
    
    // Web Push
    const subsSnap = await db.collection('push_subscriptions').get();
    if (subsSnap && !subsSnap.empty) {
      const targetSubs = subsSnap.docs
        .map(d => d.data())
        .filter(sub => sub.uid && targetUids.has(sub.uid) && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth);
        
      if (targetSubs.length > 0) {
        await Promise.allSettled(
          targetSubs.map(async (sub: any) => {
            const r = await sendWebPushToSubscription(sub, payload).catch(() => ({ ok: false }));
            if (r.ok) sent += 1;
          })
        );
      }
    }

    // In-app Notification (salvo no doc do usuario em notificações ou global)
    // Para simplificar, não criaremos doc no Firestore de notificações in-app aqui,
    // pois o App usa Web Push W3C ou Service Worker.
    
    res.status(200).json({ success: true, sent, targetedUsers: targetUids.size });
  } catch (error: any) {
    console.error('Erro no activityBroadcastHandler:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao disparar avisos da atividade.' });
  }
}

// POST /api/admin/activities/:activityId/broadcast
router.post('/activities/:activityId/broadcast', requireAuth, requireRole(['ADMIN']), adminBroadcastLimiter, activityBroadcastHandler);

/**
 * Handler do endpoint POST /api/admin/notifications/subscribe.
 * Registra a inscrição W3C Web Push (iOS Safari PWA APNs / Android FCM) em
 * /push_subscriptions e/ou inscreve o token FCM no tópico 'todos_participantes'.
 */
export async function subscribeNotificationTopicHandler(req: Request, res: Response): Promise<void> {
  const { token, subscription, userAgent } = req.body ?? {};
  const hasValidSub =
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.endpoint.startsWith('https://') &&
    typeof subscription.keys?.p256dh === 'string' &&
    typeof subscription.keys?.auth === 'string';
  const hasValidToken =
    typeof token === 'string' && token.trim().length > 0 && token.trim().length <= 4096;

  if (!hasValidSub && !hasValidToken) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'subscription Web Push ou token FCM é obrigatório.' });
    return;
  }

  try {
    if (hasValidSub) {
      const subId = subscriptionIdFromEndpoint(subscription.endpoint);
      await db
        .collection('push_subscriptions')
        .doc(subId)
        .set(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
            uid: req.user?.uid || null,
            userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    if (hasValidToken) {
      await admin.messaging().subscribeToTopic([token.trim()], 'todos_participantes').catch(() => {});
    }

    res.status(200).json({
      success: true,
      topic: 'todos_participantes',
      vapidPublicKey: getVapidKeys().publicKey,
    });
  } catch (error: any) {
    console.error('Erro ao registrar inscrição de push:', error?.message || error);
    res.status(502).json({ error: 'FCM_SUBSCRIBE_FAILED', message: 'Não foi possível registrar o token de push.' });
  }
}

router.post('/notifications/subscribe', requireAuth, subscribeNotificationTopicHandler);

export function getVapidPublicKeyHandler(_req: Request, res: Response): void {
  res.status(200).json({ publicKey: getVapidKeys().publicKey });
}

router.get('/notifications/vapid-public-key', getVapidPublicKeyHandler);

/**
 * Handler do endpoint POST /api/admin/notifications/webpush.
 * Dispara Web Push criptografado (RFC 8291 + VAPID RFC 8292) diretamente para os
 * endpoints Apple APNs (web.push.apple.com) e Google FCM de todos os celulares inscritos,
 * acordando o Service Worker mesmo quando o PWA e o Safari estão 100% fechados.
 */
export async function webPushBroadcastHandler(req: Request, res: Response): Promise<void> {
  const { id, title, body, message, actionUrl, actionLabel, priority, subscriptions } = req.body ?? {};
  const resolvedTitle = typeof title === 'string' && title.trim() ? title.trim() : 'FACOM TechWeek 2026';
  const resolvedBody =
    typeof body === 'string' && body.trim()
      ? body.trim()
      : typeof message === 'string' && message.trim()
        ? message.trim()
        : '';

  if (!resolvedBody) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'body ou message é obrigatório.' });
    return;
  }

  const payload = {
    id: id || `tw-push-${Date.now()}`,
    title: resolvedTitle.slice(0, MAX_TITLE_LENGTH),
    body: resolvedBody.slice(0, MAX_BODY_LENGTH),
    message: resolvedBody.slice(0, MAX_BODY_LENGTH),
    actionUrl: typeof actionUrl === 'string' && actionUrl.trim() ? actionUrl.trim() : '/',
    actionLabel: typeof actionLabel === 'string' && actionLabel.trim() ? actionLabel.trim() : 'Abrir App',
    priority: typeof priority === 'string' ? priority : 'HIGH',
    urgent: true,
  };

  const stats = await dispatchWebPushBroadcast(db, payload);

  if (Array.isArray(subscriptions) && subscriptions.length > 0) {
    await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        if (sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth) {
          const r = await sendWebPushToSubscription(sub, payload).catch(() => ({ ok: false }));
          if (r.ok) stats.sent += 1;
        }
      })
    );
  }

  res.status(200).json({ success: true, ...stats });
}

export async function releaseWalkinSeatsHandler(req: Request, res: Response): Promise<void> {
  const { activityId } = req.params;
  let { releasedSeats } = req.body ?? {};

  if (!activityId) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'activityId obrigatório' });
    return;
  }

  if (typeof releasedSeats !== 'number' || releasedSeats <= 0) {
     releasedSeats = 10;
  }

  const activityRef = db.collection('activities').doc(activityId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(activityRef);
      if (!snap.exists) {
        return { status: 404, body: { error: 'ACTIVITY_NOT_FOUND', message: 'Atividade não encontrada' } };
      }

      const actData = snap.data() ?? {};
      const currentAvailable = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;
      
      tx.update(activityRef, {
        vagas_disponiveis: currentAvailable + releasedSeats
      });

      return { status: 200, body: { success: true, releasedSeats, vagas_disponiveis: currentAvailable + releasedSeats } };
    });

    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Erro ao liberar walk-ins', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao liberar vagas ausentes' });
  }
}

router.post('/activities/:activityId/release-walkins', requireAuth, requireRole(['ADMIN']), releaseWalkinSeatsHandler);

export default router;



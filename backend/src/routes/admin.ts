import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db, auth } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { adminBroadcastLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';
import { UserRole } from '../types/express';

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

export async function broadcastNotificationHandler(req: Request, res: Response): Promise<void> {
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
      createdBy: req.user!.uid,
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

  res.status(201).json({ success: true, announcementId: announcementRef.id });
}

// POST /api/admin/notifications/broadcast - apenas ADMIN dispara aviso global (KAN-61).
router.post('/notifications/broadcast', requireAuth, requireRole(['ADMIN']), adminBroadcastLimiter, broadcastNotificationHandler);

export default router;

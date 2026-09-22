import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db, auth } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { isValidFirestoreId } from '../lib/firestoreId';
import { UserRole } from '../types/express';

const router = Router();

const VALID_ROLES: UserRole[] = ['PARTICIPANT', 'STAFF', 'SPONSOR', 'ADMIN'];

/**
 * Handler do endpoint PUT /api/admin/users/:uid/role (KAN-60).
 *
 * Atualiza o papel do usuário em dois sistemas que não são atômicos entre si:
 * custom claim do Firebase Auth (fonte usada por requireRole via JWT) e o
 * campo `role` do documento /users/{uid} no Firestore (fonte usada pelo
 * resto da aplicação pra exibir/filtrar por papel). Ordem escolhida: claim
 * primeiro, Firestore depois — se o segundo passo falhar depois do primeiro
 * ter tido sucesso, isso é reportado explicitamente como divergência em vez
 * de escondido atrás de um 500 genérico.
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
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' });
      return;
    }
  } catch (error) {
    console.error('Erro ao buscar usuário para atualização de role:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível verificar o usuário.' });
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
    console.error('Erro ao definir custom claim de role:', error?.message || error);
    if (error?.code === 'auth/user-not-found') {
      // Doc existe no Firestore mas a conta do Firebase Auth não existe mais —
      // inconsistência de dado, não um caso normal de "não encontrado".
      res.status(404).json({
        error: 'AUTH_USER_NOT_FOUND',
        message: 'Existe um perfil no Firestore para este uid, mas nenhuma conta correspondente no Firebase Auth.'
      });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível atualizar a permissão no Firebase Auth.' });
    return;
  }

  try {
    await userRef.update({ role });
  } catch (error) {
    console.error('Erro ao sincronizar role no Firestore após setCustomUserClaims:', error);
    res.status(500).json({
      error: 'ROLE_PARTIALLY_UPDATED',
      message: `A permissão no Firebase Auth já foi alterada para "${role}", mas a atualização do documento /users/${uid} falhou. Os dois sistemas estão divergentes — reconciliar manualmente.`
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
router.post('/notifications/broadcast', requireAuth, requireRole(['ADMIN']), broadcastNotificationHandler);

export default router;

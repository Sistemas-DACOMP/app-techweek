import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  },
  auth: {
    setCustomUserClaims: vi.fn(),
    getUser: vi.fn()
  }
}));

// admin.ts importa `firebase-admin` direto (não só via config/firebaseAdmin) pra
// usar FieldValue.serverTimestamp() e messaging(). FieldValue é estático, não
// precisa de app inicializado (mesmo padrão de checkinDoubleCheck.test.ts com
// FieldValue.increment sem mock). messaging() já chama admin.app() por baixo e
// quebra sem app — como config/firebaseAdmin.ts (que faz initializeApp) está
// todo mockado acima e nunca roda de verdade, só messaging precisa de mock aqui.
vi.mock('firebase-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin')>();
  // firebase-admin expõe firestore/messaging/auth como getters não-enumeráveis
  // (lazy load) — {...actual} não copia isso, precisa referenciar explícito.
  return { ...actual, firestore: actual.firestore, messaging: vi.fn() };
});

import router, { updateUserRoleHandler, broadcastNotificationHandler } from './admin';
import { db, auth } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(uid: string, body: any = {}, user: any = { uid: 'admin-1', role: 'ADMIN' }) {
  return { params: { uid }, body, user } as unknown as Request;
}

// Mesma técnica de cadeia real de screenToken.test.ts/checkinDoubleCheck.test.ts —
// requireAuth/requireRole já têm cobertura própria em authMiddleware.test.ts;
// aqui só precisamos provar que a rota de fato usa requireRole(['ADMIN']).
function getRoleChain() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/users/:uid/role'
  );
  return layer.route.stack.map((l: any) => l.handle) as Array<
    (req: Request, res: Response, next: () => void) => unknown
  >;
}

async function runChain(handlers: Array<(req: Request, res: Response, next: () => void) => unknown>, req: Request, res: Response) {
  let i = -1;
  const next = async (): Promise<void> => {
    i++;
    const fn = handlers[i];
    if (fn) await fn(req, res, next);
  };
  await next();
}

const [, requireRoleHandler] = getRoleChain();

function getBroadcastChain() {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === '/notifications/broadcast'
  );
  return layer.route.stack.map((l: any) => l.handle) as Array<
    (req: Request, res: Response, next: () => void) => unknown
  >;
}

// requireRole(['ADMIN']) é chamado de novo (closure separada) no router.post
// do broadcast — mesmo middleware compartilhado (authMiddleware.ts), mas
// instância própria por rota, então extraímos da rota certa em vez de reusar
// o requireRoleHandler do /users/:uid/role.
const [, broadcastRoleHandler] = getBroadcastChain();

function makeBroadcastReq(body: any = {}, user: any = { uid: 'admin-1', role: 'ADMIN' }) {
  return { body, user } as unknown as Request;
}

describe('PUT /api/admin/users/:uid/role (KAN-60, KAN-81)', () => {
  let userSnap: any;
  let adminsSnap: any;
  let tx: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  // Refs/queries são objetos-marcadores simples (não Firestore de verdade) —
  // tx.get() distingue pelo __kind qual snapshot devolver, do mesmo jeito que
  // o mock de tx em points.test.ts distingue pelo `.path`.
  function userRefFor(uid: string) {
    return { __kind: 'userDoc', uid };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    userSnap = { exists: true, data: () => ({}) };
    adminsSnap = { size: 5 };
    tx = {
      get: vi.fn((ref: any) => Promise.resolve(ref?.__kind === 'adminsQuery' ? adminsSnap : userSnap)),
      update: vi.fn()
    };
    (db.collection as any).mockImplementation(() => ({
      doc: (uid: string) => userRefFor(uid),
      where: () => ({ __kind: 'adminsQuery' })
    }));
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    (auth.setCustomUserClaims as any).mockResolvedValue(undefined);
    (auth.getUser as any).mockResolvedValue({ customClaims: {} });
  });

  it('preserva claims existentes ao setar a role nova (merge, não sobrescreve)', async () => {
    (auth.getUser as any).mockResolvedValue({ customClaims: { somethingElse: 'kept' } });
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('part-1', { somethingElse: 'kept', role: 'STAFF' });
  });

  it('sucesso: atualiza o Firestore numa transação, seta o custom claim depois e responde 200', async () => {
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.update).toHaveBeenCalledWith(expect.objectContaining({ uid: 'part-1' }), { role: 'STAFF' });
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('part-1', { role: 'STAFF' });
    // KAN-81: Firestore primeiro (dentro da transação), claim do Auth depois —
    // ver doc do handler pra explicação de por que a ordem inverteu.
    expect(tx.update.mock.invocationCallOrder[0]).toBeLessThan(
      auth.setCustomUserClaims.mock.invocationCallOrder[0]
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, uid: 'part-1', role: 'STAFF' });
  });

  it('400 INVALID_PAYLOAD se uid tiver path traversal (%2F decodificado), nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1/x', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role estiver ausente, nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', {});
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role for string vazia, nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', { role: '' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se role estiver fora da allowlist (ex: "HACKER"), nem toca Firestore/Auth', async () => {
    const req = makeReq('part-1', { role: 'HACKER' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('404 USER_NOT_FOUND se o doc /users/{uid} não existir, setCustomUserClaims nunca é chamado', async () => {
    userSnap = { exists: false };
    const req = makeReq('part-404', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'USER_NOT_FOUND' }));
  });

  it('500 INTERNAL_ERROR se a leitura do usuário na transação falhar', async () => {
    tx.get.mockRejectedValueOnce(new Error('firestore down'));
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
  });

  it('500 ROLE_PARTIALLY_UPDATED se o Firestore for atualizado mas auth.getUser (leitura de claims) rejeitar com auth/user-not-found', async () => {
    (auth.getUser as any).mockRejectedValue({ code: 'auth/user-not-found' });
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.update).toHaveBeenCalledWith(expect.objectContaining({ uid: 'part-1' }), { role: 'STAFF' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'ROLE_PARTIALLY_UPDATED',
        message: expect.stringContaining('não existe mais')
      })
    );
  });

  it('500 ROLE_PARTIALLY_UPDATED se o Firestore for atualizado mas setCustomUserClaims falhar com outro erro', async () => {
    (auth.setCustomUserClaims as any).mockRejectedValue(new Error('boom'));
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.update).toHaveBeenCalledWith(expect.objectContaining({ uid: 'part-1' }), { role: 'STAFF' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'ROLE_PARTIALLY_UPDATED',
        message: expect.stringContaining('part-1')
      })
    );
  });

  it('não consulta contagem de ADMINs quando o alvo já não é ADMIN (troca comum)', async () => {
    userSnap = { exists: true, data: () => ({ role: 'PARTICIPANT' }) };
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.get).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('permite rebaixar um ADMIN quando existe outro ADMIN além dele (count > 1)', async () => {
    userSnap = { exists: true, data: () => ({ role: 'ADMIN' }) };
    adminsSnap = { size: 2 };
    const req = makeReq('admin-2', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('admin-2', { role: 'STAFF' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('409 LAST_ADMIN_PROTECTED se o alvo for o único ADMIN restante, nem toca Auth/Firestore', async () => {
    userSnap = { exists: true, data: () => ({ role: 'ADMIN' }) };
    adminsSnap = { size: 1 };
    const req = makeReq('admin-1', { role: 'STAFF' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'LAST_ADMIN_PROTECTED' }));
  });

  it('promover um ADMIN pra ADMIN de novo não conta como remoção, count não é consultado', async () => {
    userSnap = { exists: true, data: () => ({ role: 'ADMIN' }) };
    const req = makeReq('admin-1', { role: 'ADMIN' });
    const res = makeRes();

    await updateUserRoleHandler(req, res);

    expect(tx.get).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('409 mantido em retry: duas trocas concorrentes rebaixando ADMINs diferentes — a segunda reconta após a primeira "commitar" e bloqueia', async () => {
    // Simula o que a transação real do Firestore garante via conflito de
    // leitura/escrita: a myTransaction callback é invocada de novo (retry) já
    // vendo o efeito da primeira transação. Aqui simulamos isso mudando o
    // snapshot de admins que a segunda chamada de runTransaction vai ler.
    userSnap = { exists: true, data: () => ({ role: 'ADMIN' }) };
    adminsSnap = { size: 2 }; // antes de qualquer rebaixamento: 2 ADMINs

    const req1 = makeReq('admin-a', { role: 'STAFF' });
    const res1 = makeRes();
    await updateUserRoleHandler(req1, res1);
    expect(res1.status).toHaveBeenCalledWith(200); // primeira passa (tinha 2)

    // Depois do "commit" da primeira, só sobra 1 ADMIN real.
    adminsSnap = { size: 1 };
    const req2 = makeReq('admin-b', { role: 'STAFF' });
    const res2 = makeRes();
    await updateUserRoleHandler(req2, res2);

    expect(res2.status).toHaveBeenCalledWith(409);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'LAST_ADMIN_PROTECTED' }));
  });

  it('cadeia real: STAFF (não-ADMIN) recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeReq('part-1', { role: 'ADMIN' }, { uid: 'staff-1', role: 'STAFF' });
    const res = makeRes();

    await runChain([requireRoleHandler, updateUserRoleHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('cadeia real: PARTICIPANT recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeReq('part-1', { role: 'ADMIN' }, { uid: 'part-1', role: 'PARTICIPANT' });
    const res = makeRes();

    await runChain([requireRoleHandler, updateUserRoleHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('cadeia real: ADMIN passa pelo requireRole (chama next, não responde 403)', () => {
    // Não encadeia até o handler final aqui: updateUserRoleHandler tem 4
    // awaits em sequência (get, getUser, setCustomUserClaims, update), e o
    // runChain genérico (next() disparado de dentro de um middleware síncrono,
    // sem `return next()`) tem corrida real de promise nesse caso — o
    // `await runChain(...)` do teste resolvia antes do handler terminar.
    // A parte que realmente pertence a este teste (requireRole libera ADMIN)
    // já fica provada só checando a chamada de next(); o handler em si já
    // tem cobertura direta no teste de sucesso acima.
    const req = makeReq('part-1', { role: 'STAFF' });
    const res = makeRes();
    const next = vi.fn();

    requireRoleHandler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/notifications/broadcast (KAN-61)', () => {
  let announcementDoc: { id: string; set: ReturnType<typeof vi.fn> };
  let sendMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    announcementDoc = { id: 'ann-1', set: vi.fn().mockResolvedValue(undefined) };
    (db.collection as any).mockImplementation(() => ({
      doc: () => announcementDoc
    }));
    sendMock = vi.fn().mockResolvedValue('projects/x/messages/1');
    (admin.messaging as any).mockReturnValue({ send: sendMock });
  });

  it('sucesso: grava /announcements (com createdBy do admin) antes do push, dispara FCM no tópico certo e responde 201', async () => {
    const req = makeBroadcastReq({ title: 'Aviso', body: 'Mensagem geral' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(announcementDoc.set).toHaveBeenCalledWith({
      title: 'Aviso',
      body: 'Mensagem geral',
      createdBy: 'admin-1',
      createdAt: expect.anything()
    });
    expect(sendMock).toHaveBeenCalledWith({
      topic: 'todos_participantes',
      notification: { title: 'Aviso', body: 'Mensagem geral' }
    });
    // Firestore grava antes do push, nessa ordem (não o contrário).
    expect(announcementDoc.set.mock.invocationCallOrder[0]).toBeLessThan(
      sendMock.mock.invocationCallOrder[0]
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, announcementId: 'ann-1' });
  });

  it('400 INVALID_PAYLOAD se title estiver ausente ou vazio (após trim), nem toca Firestore/messaging', async () => {
    const req = makeBroadcastReq({ title: '   ', body: 'Mensagem geral' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(admin.messaging).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se body estiver ausente ou vazio (após trim), nem toca Firestore/messaging', async () => {
    const req = makeBroadcastReq({ title: 'Aviso' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(admin.messaging).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se title passar de 150 caracteres, nem toca Firestore/messaging', async () => {
    const req = makeBroadcastReq({ title: 'a'.repeat(151), body: 'Mensagem geral' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(admin.messaging).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se body passar de 1000 caracteres, nem toca Firestore/messaging', async () => {
    const req = makeBroadcastReq({ title: 'Aviso', body: 'a'.repeat(1001) });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(db.collection).not.toHaveBeenCalled();
    expect(admin.messaging).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('500 INTERNAL_ERROR se a escrita em /announcements falhar, messaging().send nunca é chamado', async () => {
    announcementDoc.set.mockRejectedValue(new Error('firestore down'));
    const req = makeBroadcastReq({ title: 'Aviso', body: 'Mensagem geral' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(sendMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR' }));
  });

  it('502 BROADCAST_PARTIALLY_SENT se o Firestore gravar mas o push FCM falhar, expõe announcementId (não é um 500 genérico)', async () => {
    sendMock.mockRejectedValue(new Error('fcm down'));
    const req = makeBroadcastReq({ title: 'Aviso', body: 'Mensagem geral' });
    const res = makeRes();

    await broadcastNotificationHandler(req, res);

    expect(announcementDoc.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'BROADCAST_PARTIALLY_SENT', announcementId: 'ann-1' })
    );
  });

  it('cadeia real: STAFF (não-ADMIN) recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeBroadcastReq({ title: 'Aviso', body: 'Mensagem geral' }, { uid: 'staff-1', role: 'STAFF' });
    const res = makeRes();

    await runChain([broadcastRoleHandler, broadcastNotificationHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('cadeia real: PARTICIPANT recebe 403 do requireRole e nem chega no handler', async () => {
    const req = makeBroadcastReq({ title: 'Aviso', body: 'Mensagem geral' }, { uid: 'part-1', role: 'PARTICIPANT' });
    const res = makeRes();

    await runChain([broadcastRoleHandler, broadcastNotificationHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.collection).not.toHaveBeenCalled();
  });
});

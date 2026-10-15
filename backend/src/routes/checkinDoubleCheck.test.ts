import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));
vi.mock('../config/firebaseAdmin', async () => {
  const admin = await import('firebase-admin');
  return {
    db: {
      collection: vi.fn(),
      runTransaction: vi.fn()
    },
    FieldValue: admin.firestore.FieldValue
  };
});

import router from './checkinDoubleCheck';
import { db } from '../config/firebaseAdmin';
import { issueScreenToken } from '../lib/screenToken';
import * as admin from 'firebase-admin';
import { participantActionLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

// Mesma técnica de extração de handler de booking.test.ts/checkin.test.ts —
// router só exporta o default, sem supertest no projeto. requireAuth/requireRole
// já têm cobertura própria em authMiddleware.test.ts; aqui injetamos req.user
// direto simulando que já passaram, e testamos a regra de negócio do handler.
function getHandler(path: string) {
  const layer = (router as unknown as { stack: any[] }).stack.find((l) => l.route?.path === path);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle as (req: Request, res: Response) => Promise<void>;
}

const entranceHandler = getHandler('/entrance');
const checkoutHandler = getHandler('/checkout');

// Achado do security review (KAN-51): os testes acima injetam req.user direto
// e pulam requireRole, então nenhum provava que /entrance de fato rejeita
// quem não é STAFF/ADMIN — só a leitura do código garantia isso. Mesma técnica
// de cadeia real (runChain) que screenToken.test.ts já usa pra /screen-token.
function getEntranceChain() {
  const layer = (router as unknown as { stack: any[] }).stack.find((l) => l.route?.path === '/entrance');
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

const [, requireRoleHandler] = getEntranceChain();

function makeTx(snaps: Record<string, any>) {
  return {
    get: vi.fn((ref: { path: string }) => {
      for (const [prefix, snap] of Object.entries(snaps)) {
        if (ref.path.startsWith(prefix)) return Promise.resolve(snap);
      }
      throw new Error(`ref inesperada no mock: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /entrance (KAN-51 — Staff registra entrada)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
  });

  function makeEntranceReq(uid = 'part-1', activityId = 'activity-1', staffUid = 'staff-1') {
    return { body: { uid, activityId }, user: { uid: staffUid, role: 'STAFF' } } as unknown as Request;
  }

  it('grava CHECKED_IN com entranceAt e entranceBy do Staff', async () => {
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeEntranceReq();
    const res = makeRes();
    await entranceHandler(req, res);

    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/part-1_activity-1' },
      expect.objectContaining({
        uid: 'part-1',
        activityId: 'activity-1',
        status: 'CHECKED_IN',
        entranceAt: expect.any(Date),
        entranceBy: 'staff-1',
        checkoutAt: null,
        pointsCredited: null
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('recusa 409 CHECKIN_DUPLICATE se a presença já foi concluída (não reabre pós-COMPLETED)', async () => {
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: true, data: () => ({ status: 'COMPLETED' }) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeEntranceReq();
    const res = makeRes();
    await entranceHandler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'CHECKIN_DUPLICATE' }));
  });

  it('recusa 400 WRONG_ATTENDANCE_MODE se a atividade não usa double-check', async () => {
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({}) }, // sem attendanceMode -> SELF_SCAN
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeEntranceReq();
    const res = makeRes();
    await entranceHandler(req, res);

    expect(tx.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'WRONG_ATTENDANCE_MODE' }));
  });

  it('404 ACTIVITY_NOT_FOUND se a atividade não existir', async () => {
    const tx = makeTx({ 'activities/': { exists: false }, 'checkins/': { exists: false } });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeEntranceReq();
    const res = makeRes();
    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACTIVITY_NOT_FOUND' }));
  });

  it('400 INVALID_PAYLOAD se uid estiver ausente, antes de tocar o Firestore', async () => {
    const req = { body: { activityId: 'activity-1' }, user: { uid: 'staff-1', role: 'STAFF' } } as unknown as Request;
    const res = makeRes();
    await entranceHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('400 INVALID_PAYLOAD se activityId for inválido (ex: path traversal via %2F)', async () => {
    const req = makeEntranceReq('part-1', 'x/y');
    const res = makeRes();
    await entranceHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('cadeia real: PARTICIPANT recebe 403 do requireRole e nem chega no handler', async () => {
    const req = { body: { uid: 'part-1', activityId: 'activity-1' }, user: { uid: 'part-1', role: 'PARTICIPANT' } } as unknown as Request;
    const res = makeRes();

    await runChain([requireRoleHandler, entranceHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('cadeia real: STAFF passa pelo requireRole e chega no handler (200)', async () => {
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));
    const req = makeEntranceReq();
    const res = makeRes();

    await runChain([requireRoleHandler, entranceHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('POST /entrance — resolução de crachá e identidade (ERR-073)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupUsersMock(userDocs: Array<{ id: string; email?: string; username?: string }> = []) {
    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          doc: (id: string) => ({ path: `users/${id}` }),
          where: vi.fn((field: string, op: string, val: string) => ({
            limit: vi.fn(() => ({
              get: vi.fn(async () => {
                const matches = userDocs.filter((d) => (d as any)[field] === val);
                return {
                  empty: matches.length === 0,
                  docs: matches.map((m) => ({ id: m.id, data: () => m }))
                };
              })
            }))
          }))
        };
      }
      return {
        doc: (id: string) => ({ path: `${name}/${id}` })
      };
    });
  }

  it('resolve crachá com prefixo mailto: e e-mail via consulta Firestore', async () => {
    setupUsersMock([{ id: 'resolved-user-1', email: 'aluno@facom.ufms.br' }]);
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: 'mailto:aluno@facom.ufms.br', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/resolved-user-1_activity-1' },
      expect.objectContaining({ uid: 'resolved-user-1', activityId: 'activity-1', status: 'CHECKED_IN' })
    );
  });

  it('resolve e-mail case-sensitive via fallback de busca exata quando lowercase não encontra', async () => {
    setupUsersMock([{ id: 'resolved-user-2', email: 'Aluno_Especial@Facom.Ufms.Br' }]);
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: 'Aluno_Especial@Facom.Ufms.Br', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/resolved-user-2_activity-1' },
      expect.objectContaining({ uid: 'resolved-user-2' })
    );
  });

  it('resolve username iniciado por @ via consulta ao Firestore', async () => {
    setupUsersMock([{ id: 'resolved-dev-3', username: 'usuario_dev' }]);
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: '@usuario_dev', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/resolved-dev-3_activity-1' },
      expect.objectContaining({ uid: 'resolved-dev-3' })
    );
  });

  it('aceita participantUid como alternativa a uid no corpo da requisição', async () => {
    setupUsersMock();
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { participantUid: 'part-legacy-1', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/part-legacy-1_activity-1' },
      expect.objectContaining({ uid: 'part-legacy-1' })
    );
  });

  it('usa fallback sintético email_... quando e-mail não é encontrado no Firestore', async () => {
    setupUsersMock([]);
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: 'mailto:inexistente@facom.ufms.br', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/email_inexistente_facom_ufms_br_activity-1' },
      expect.objectContaining({ uid: 'email_inexistente_facom_ufms_br', activityId: 'activity-1', status: 'CHECKED_IN' })
    );
  });

  it('usa fallback sintético user_... quando @username não é encontrado no Firestore', async () => {
    setupUsersMock([]);
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: '@nao_existe', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/user_nao_existe_activity-1' },
      expect.objectContaining({ uid: 'user_nao_existe', activityId: 'activity-1', status: 'CHECKED_IN' })
    );
  });

  it('retorna 400 INVALID_PAYLOAD se uid contiver barra de path traversal (mesmo com @)', async () => {
    setupUsersMock([]);
    const req = {
      body: { uid: '../admin@facom.ufms.br', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('trata falha de rede/exceção na consulta de resolução de usuário com fallback sem quebrar o servidor', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          doc: (id: string) => ({ path: `users/${id}` }),
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn().mockRejectedValue(new Error('Firestore connection failure'))
            }))
          }))
        };
      }
      return { doc: (id: string) => ({ path: `${name}/${id}` }) };
    });
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK' }) },
      'checkins/': { exists: false }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = {
      body: { uid: 'aluno@facom.ufms.br', activityId: 'activity-1' },
      user: { uid: 'staff-1', role: 'STAFF' }
    } as unknown as Request;
    const res = makeRes();

    await entranceHandler(req, res);

    expect(warnSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.set).toHaveBeenCalledWith(
      { path: 'checkins/email_aluno_facom_ufms_br_activity-1' },
      expect.objectContaining({ uid: 'email_aluno_facom_ufms_br' })
    );
    warnSpy.mockRestore();
  });
});

describe('POST /checkout (KAN-51 — aluno via QR dinâmico do telão)', () => {
  beforeAll(() => {
    process.env.SCREEN_TOKEN_SECRET = 'test-secret-kan-51-com-pelo-menos-32-chars';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` })
    }));
  });

  function makeCheckoutReq(token: string, uid = 'part-1', bodyExtra: Record<string, unknown> = {}) {
    return { body: { token, ...bodyExtra }, user: { uid, role: 'PARTICIPANT' } } as unknown as Request;
  }

  it('sucesso: credita totalPoints via increment, muda pra COMPLETED, tudo na mesma transação', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK', points: 30 }) },
      'checkins/': { exists: true, data: () => ({ status: 'CHECKED_IN' }) },
      'users/': { exists: true, data: () => ({}) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(tx.update).toHaveBeenCalledWith(
      { path: 'checkins/part-1_activity-1' },
      expect.objectContaining({ status: 'COMPLETED', checkoutAt: expect.any(Date), pointsCredited: 30 })
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: 'users/part-1' },
      {
        totalPoints: admin.firestore.FieldValue.increment(30),
        pontuacaoTotal: admin.firestore.FieldValue.increment(30)
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, status: 'COMPLETED', pointsCredited: 30 }));
  });

  it('recusa 409 ENTRANCE_NOT_FOUND se não teve entrance do Staff', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK', points: 30 }) },
      'checkins/': { exists: false },
      'users/': { exists: true, data: () => ({}) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ENTRANCE_NOT_FOUND' }));
  });

  it('recusa 409 CHECKIN_DUPLICATE se já COMPLETED (checkout repetido não credita de novo)', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK', points: 30 }) },
      'checkins/': { exists: true, data: () => ({ status: 'COMPLETED' }) },
      'users/': { exists: true, data: () => ({}) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'CHECKIN_DUPLICATE' }));
  });

  it('recusa 401 TOKEN_EXPIRED com token expirado, mesmo com entrance válido', async () => {
    const past = Date.now() - 10 * 60 * 1000; // 10min atrás -> token já expirado (TTL 5min)
    const { token } = issueScreenToken('activity-1', past);

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TOKEN_EXPIRED' }));
  });

  it('recusa 401 INVALID_TOKEN com assinatura adulterada', async () => {
    const { token } = issueScreenToken('activity-1');
    const tampered = token.slice(0, -2) + (token.at(-1) === 'a' ? 'bb' : 'aa');

    const req = makeCheckoutReq(tampered);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_TOKEN' }));
  });

  it('400 INVALID_PAYLOAD se token estiver ausente, antes de validar ou tocar o Firestore', async () => {
    const req = { body: {}, user: { uid: 'part-1', role: 'PARTICIPANT' } } as unknown as Request;
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
  });

  it('uid sempre vem do JWT, nunca do body: um uid forjado no body não muda quem é creditado', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({ attendanceMode: 'DOUBLE_CHECK', points: 30 }) },
      'checkins/': { exists: true, data: () => ({ status: 'CHECKED_IN' }) },
      'users/': { exists: true, data: () => ({}) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    // req.user.uid é 'part-1' (dono do JWT), mas o corpo forja outro uid.
    const req = makeCheckoutReq(token, 'part-1', { uid: 'part-attacker' });
    const res = makeRes();
    await checkoutHandler(req, res);

    // Só o doc de part-1 (dono do token JWT) é tocado — nunca part-attacker.
    expect(tx.update).toHaveBeenCalledWith({ path: 'users/part-1' }, expect.anything());
    expect(tx.update).not.toHaveBeenCalledWith({ path: 'users/part-attacker' }, expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('404 ACTIVITY_NOT_FOUND se a atividade do token não existir mais', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({ 'activities/': { exists: false }, 'checkins/': { exists: false }, 'users/': { exists: false } });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ACTIVITY_NOT_FOUND' }));
  });

  it('400 WRONG_ATTENDANCE_MODE se a atividade do token não usa double-check', async () => {
    const { token } = issueScreenToken('activity-1');
    const tx = makeTx({
      'activities/': { exists: true, data: () => ({}) }, // sem attendanceMode -> SELF_SCAN
      'checkins/': { exists: false },
      'users/': { exists: true, data: () => ({}) }
    });
    (db.runTransaction as any).mockImplementation((cb: any) => cb(tx));

    const req = makeCheckoutReq(token);
    const res = makeRes();
    await checkoutHandler(req, res);

    expect(tx.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'WRONG_ATTENDANCE_MODE' }));
  });
});

describe('checkinDoubleCheck route middleware configuration (ERR-074)', () => {
  it('registra POST /entrance com participantActionLimiter na cadeia de middlewares', () => {
    const entranceRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/entrance' && layer.route?.methods?.post
    );
    expect(entranceRoute).toBeDefined();
    const handles = entranceRoute.route.stack.map((l: any) => l.handle);
    expect(handles).toContain(participantActionLimiter);
  });

  it('registra POST /checkout com participantActionLimiter na cadeia de middlewares', () => {
    const checkoutRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/checkout' && layer.route?.methods?.post
    );
    expect(checkoutRoute).toBeDefined();
    const handles = checkoutRoute.route.stack.map((l: any) => l.handle);
    expect(handles).toContain(participantActionLimiter);
  });
});


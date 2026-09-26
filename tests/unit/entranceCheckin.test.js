import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('express', () => {
  return {
    Router: () => {
      const stack = [];
      return {
        stack,
        post(path, ...handlers) {
          stack.push({
            route: {
              path,
              methods: { post: true },
              stack: handlers.map((h) => ({ handle: h }))
            }
          });
        },
        get(path, ...handlers) {
          stack.push({
            route: {
              path,
              methods: { get: true },
              stack: handlers.map((h) => ({ handle: h }))
            }
          });
        },
        use: vi.fn()
      };
    }
  };
});

vi.mock('../../backend/src/config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  },
  auth: {
    verifyIdToken: vi.fn()
  }
}));

import router from '../../backend/src/routes/entrance';
import { db } from '../../backend/src/config/firebaseAdmin';

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function makeReq({
  participantUid,
  activityId,
  staffUid = 'staff-operator-1',
  role = 'STAFF'
} = {}) {
  const body = {};
  if (participantUid !== undefined) body.participantUid = participantUid;
  if (activityId !== undefined) body.activityId = activityId;

  return {
    body,
    user: {
      uid: staffUid,
      email: `${staffUid}@techweek.facom.ufu.br`,
      role
    }
  };
}

function getEntranceRoute() {
  const layer = router.stack.find((l) => l.route?.path === '/entrance');
  if (!layer) {
    throw new Error('Rota /entrance nao encontrada no router de entrance.');
  }
  return layer.route;
}

function getEntranceHandler() {
  const route = getEntranceRoute();
  const routeStack = route.stack;
  return routeStack[routeStack.length - 1].handle;
}

function makeTx(snaps = {}) {
  const {
    activitySnap = { exists: true, data: () => ({ entrancePoints: 30, requireRegistration: false }) },
    pointEventSnap = { exists: false },
    bookingSnap = { exists: true }
  } = snaps;

  return {
    get: vi.fn((ref) => {
      if (ref.path.startsWith('activities/')) return Promise.resolve(activitySnap);
      if (ref.path.startsWith('pointEvents/')) return Promise.resolve(pointEventSnap);
      if (ref.path.startsWith('bookings/')) return Promise.resolve(bookingSnap);
      throw new Error(`Ref inesperada no mock tx.get: ${ref.path}`);
    }),
    set: vi.fn(),
    update: vi.fn()
  };
}

describe('POST /api/checkin/entrance (KAN-48) - Suite de Testes Unitarios', () => {
  const handler = getEntranceHandler();
  const route = getEntranceRoute();

  beforeEach(() => {
    vi.clearAllMocks();
    db.collection.mockImplementation((name) => ({
      doc: (id) => ({ path: `${name}/${id}` })
    }));
  });

  // =========================================================================
  // 1. Configuracao da rota e controle de acesso (Role-Based Access Control)
  // =========================================================================
  describe('Controle de Acesso e Seguranca de Perfil (DoD: STAFF ou ADMIN)', () => {
    it('deve ter a rota registrada com metodo POST e caminho /entrance', () => {
      expect(route.path).toBe('/entrance');
      expect(route.methods.post).toBe(true);
    });

    it('deve possuir middlewares de autenticacao e autorizacao na pilha da rota', () => {
      // 3 camadas: requireAuth, requireRole(['STAFF', 'ADMIN']) e handler final
      expect(route.stack.length).toBe(3);
    });

    it('middleware requireRole deve barrar usuario PARTICIPANT com 403 FORBIDDEN', () => {
      const requireRoleMiddleware = route.stack[1].handle;
      const req = { user: { uid: 'aluno-1', role: 'PARTICIPANT' } };
      const res = makeRes();
      const next = vi.fn();

      requireRoleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('middleware requireRole deve barrar usuario SPONSOR com 403 FORBIDDEN', () => {
      const requireRoleMiddleware = route.stack[1].handle;
      const req = { user: { uid: 'patrocinador-1', role: 'SPONSOR' } };
      const res = makeRes();
      const next = vi.fn();

      requireRoleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('middleware requireRole deve barrar solicitacao sem req.user com 401 UNAUTHORIZED', () => {
      const requireRoleMiddleware = route.stack[1].handle;
      const req = {};
      const res = makeRes();
      const next = vi.fn();

      requireRoleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('middleware requireRole deve permitir acesso para perfil STAFF', () => {
      const requireRoleMiddleware = route.stack[1].handle;
      const req = { user: { uid: 'staff-1', role: 'STAFF' } };
      const res = makeRes();
      const next = vi.fn();

      requireRoleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('middleware requireRole deve permitir acesso para perfil ADMIN', () => {
      const requireRoleMiddleware = route.stack[1].handle;
      const req = { user: { uid: 'admin-1', role: 'ADMIN' } };
      const res = makeRes();
      const next = vi.fn();

      requireRoleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Validacao do Payload (DoD: Rejeicao com 400 INVALID_PAYLOAD)
  // =========================================================================
  describe('Validacao de Payload (400)', () => {
    it('deve rejeitar com 400 se o corpo for vazio', async () => {
      const req = { body: {}, user: { uid: 'staff-1', role: 'STAFF' } };
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVALID_PAYLOAD',
        message: 'participantUid e activityId so obrigatrios.'
      });
      expect(db.runTransaction).not.toHaveBeenCalled();
    });

    it('deve rejeitar com 400 se req.body for undefined', async () => {
      const req = { body: undefined, user: { uid: 'staff-1', role: 'STAFF' } };
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
      expect(db.runTransaction).not.toHaveBeenCalled();
    });

    it('deve rejeitar com 400 se participantUid estiver ausente', async () => {
      const req = makeReq({ activityId: 'palestra-abertura' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
      expect(db.runTransaction).not.toHaveBeenCalled();
    });

    it('deve rejeitar com 400 se activityId estiver ausente', async () => {
      const req = makeReq({ participantUid: 'aluno-123' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
      expect(db.runTransaction).not.toHaveBeenCalled();
    });

    it('deve rejeitar com 400 se participantUid for string vazia', async () => {
      const req = makeReq({ participantUid: '', activityId: 'palestra-abertura' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
      expect(db.runTransaction).not.toHaveBeenCalled();
    });

    it('deve rejeitar com 400 se activityId for string vazia', async () => {
      const req = makeReq({ participantUid: 'aluno-123', activityId: '' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_PAYLOAD' }));
      expect(db.runTransaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Atividade Inexistente (DoD: 404 ACTIVITY_NOT_FOUND)
  // =========================================================================
  describe('Atividade Nao Encontrada (404)', () => {
    it('deve retornar 404 quando o documento da atividade nao existir no Firestore', async () => {
      const tx = makeTx({
        activitySnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({ participantUid: 'aluno-123', activityId: 'palestra-fantasma' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ACTIVITY_NOT_FOUND',
        message: 'Palestra no encontrada.'
      });
      expect(tx.set).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Inscricao Previa Obrigatoria (DoD: 403 NOT_REGISTERED)
  // =========================================================================
  describe('Inscricao Previa Obrigatoria (requireRegistration) (403)', () => {
    it('deve retornar 403 NOT_REGISTERED quando requireRegistration for true e o aluno nao possuir booking', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ entrancePoints: 20, requireRegistration: true })
        },
        bookingSnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({ participantUid: 'aluno-sem-reserva', activityId: 'workshop-ia' });
      const res = makeRes();

      await handler(req, res);

      expect(tx.get).toHaveBeenCalledWith({ path: 'bookings/aluno-sem-reserva_workshop-ia' });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'NOT_REGISTERED',
        message: 'Aluno no inscrito previamente.'
      });
      expect(tx.set).not.toHaveBeenCalled();
    });

    it('deve prosseguir com sucesso se requireRegistration for true e o aluno tiver booking confirmado', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ entrancePoints: 40, requireRegistration: true })
        },
        bookingSnap: { exists: true, data: () => ({ status: 'CONFIRMED' }) },
        pointEventSnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({ participantUid: 'aluno-inscrito', activityId: 'workshop-ia' });
      const res = makeRes();

      await handler(req, res);

      expect(tx.get).toHaveBeenCalledWith({ path: 'bookings/aluno-inscrito_workshop-ia' });
      expect(tx.set).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, points: 40 });
    });

    it('nao deve consultar bookings nem barrar se requireRegistration for false', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ entrancePoints: 15, requireRegistration: false })
        },
        pointEventSnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({ participantUid: 'aluno-qualquer', activityId: 'palestra-aberta' });
      const res = makeRes();

      await handler(req, res);

      // Nao deve ter consultado a colecao bookings
      expect(tx.get).not.toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining('bookings/') }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, points: 15 });
    });
  });

  // =========================================================================
  // 5. Check-in Duplicado (DoD: 409 CHECKIN_DUPLICATE)
  // =========================================================================
  describe('Deteccao de Check-in Duplicado (409)', () => {
    it('deve retornar 409 CHECKIN_DUPLICATE se o registro de pointEvents da entrada ja existir', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ entrancePoints: 25, requireRegistration: false })
        },
        pointEventSnap: { exists: true } // Ja fez check-in antes
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({ participantUid: 'aluno-repetido', activityId: 'palestra-cloud' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CHECKIN_DUPLICATE',
        message: 'Entrada duplicada (j havia feito check-in de entrada).'
      });
      expect(tx.set).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Sucesso no Check-in (DoD: 201 Created com pontos creditados)
  // =========================================================================
  describe('Sucesso no Check-in de Portaria (201)', () => {
    it('deve registrar pointEvent deterministico e retornar 201 com pontos creditados', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ entrancePoints: 50, requireRegistration: false })
        },
        pointEventSnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({
        participantUid: 'aluno-999',
        activityId: 'keynote-techweek',
        staffUid: 'staff-joao'
      });
      const res = makeRes();

      await handler(req, res);

      expect(tx.set).toHaveBeenCalledWith(
        { path: 'pointEvents/aluno-999_entrance_keynote-techweek' },
        expect.objectContaining({
          userId: 'aluno-999',
          eventType: 'entrance',
          referenceId: 'keynote-techweek',
          points: 50,
          metadata: { staffUid: 'staff-joao' },
          createdAt: expect.any(Date)
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, points: 50 });
    });

    it('deve atribuir 0 pontos como fallback se activity.entrancePoints nao for numero', async () => {
      const tx = makeTx({
        activitySnap: {
          exists: true,
          data: () => ({ requireRegistration: false }) // sem entrancePoints definido
        },
        pointEventSnap: { exists: false }
      });
      db.runTransaction.mockImplementation((cb) => cb(tx));

      const req = makeReq({
        participantUid: 'aluno-sem-pontos',
        activityId: 'painel-carreiras',
        staffUid: 'staff-maria'
      });
      const res = makeRes();

      await handler(req, res);

      expect(tx.set).toHaveBeenCalledWith(
        { path: 'pointEvents/aluno-sem-pontos_entrance_painel-carreiras' },
        expect.objectContaining({
          points: 0,
          metadata: { staffUid: 'staff-maria' }
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, points: 0 });
    });
  });

  // =========================================================================
  // 7. Resiliencia e Tratamento de Erros Internos (500)
  // =========================================================================
  describe('Tratamento de Erros Inesperados (500)', () => {
    it('deve retornar 500 INTERNAL_ERROR caso a transacao do Firestore falhe', async () => {
      db.runTransaction.mockRejectedValue(new Error('Falha de rede ou timeout no Firestore'));

      const req = makeReq({ participantUid: 'aluno-123', activityId: 'palestra-1' });
      const res = makeRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
        message: 'No foi possvel registrar a entrada.'
      });
    });
  });
});

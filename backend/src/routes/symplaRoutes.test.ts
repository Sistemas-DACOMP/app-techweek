import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Firestore fake mínimo: refs com id/path, transação com get/set/delete (índice symplaTickets, KAN-108)
const store = new Map<string, any>();
const mockSet = vi.fn((ref: any, data: any) => { store.set(ref.path, { ...(store.get(ref.path) || {}), ...data }); });
const mockDelete = vi.fn((ref: any) => { store.delete(ref.path); });
const mockDoc = vi.fn();
const mockCollection = vi.fn((name: string) => ({
  doc: (id: string) => {
    mockDoc(id);
    return { id, path: `${name}/${id}` };
  }
}));

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: (name: string) => mockCollection(name),
    runTransaction: async (fn: any) =>
      fn({
        get: async (ref: any) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
        set: (ref: any, data: any) => mockSet(ref, data),
        delete: (ref: any) => mockDelete(ref)
      })
  }
}));

vi.mock('../services/symplaService', () => ({
  symplaService: {
    findParticipantByTicket: vi.fn(),
    findParticipantByEmail: vi.fn(),
    getEventDetails: vi.fn(),
    checkInParticipant: vi.fn()
  }
}));

import router from './symplaRoutes';
import { symplaService } from '../services/symplaService';
import { symplaPublicLimiter, symplaSyncLimiter, staffActionLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function getRouteHandlers(path: string, method: string) {
  const layer = (router as unknown as { stack: any[] }).stack.find(
    (l) => l.route?.path === path && l.route?.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
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

describe('POST /verify-ticket (SEC-002: Proteção de PII e Ingressos Sympla)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  const verifyHandlers = getRouteHandlers('/verify-ticket', 'post');
  // verifyHandlers[0] is requireAuth, verifyHandlers[1] is finalHandler

  it('bloqueia requisição sem token (401 MISSING_TOKEN)', async () => {
    const req = { headers: {}, body: { email: 'aluno@ufu.br' } } as unknown as Request;
    const res = makeRes();

    await runChain(verifyHandlers, req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'UNAUTHORIZED' })
    );
  });

  it('permite que participante consulte seu próprio ingresso e persiste no Firestore', async () => {
    const req = {
      user: { uid: 'user-1', email: 'aluno@ufu.br', role: 'PARTICIPANT' },
      body: { email: 'aluno@ufu.br' }
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValueOnce({
      id: 101,
      order_id: 'ORD-1',
      ticket_number: 'TCK-101',
      ticket_name: 'Geral',
      first_name: 'Carlos',
      last_name: 'Silva',
      email: 'aluno@ufu.br',
      ticket_num_qr_code: 'QR-101'
    } as any);

    // Ignora requireAuth já que simulamos req.user
    const finalHandler = verifyHandlers[verifyHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        verified: true,
        participant: expect.objectContaining({
          ticketNumber: 'TCK-101',
          qrCodeData: 'QR-101',
          email: 'aluno@ufu.br'
        }),
        symplaTicket: expect.objectContaining({
          ticketNumber: 'TCK-101',
          ticketName: 'Geral'
        })
      })
    );

    expect(mockDoc).toHaveBeenCalledWith('user-1');
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        hasSymplaTicket: true,
        symplaTicket: expect.objectContaining({
          ticketNumber: 'TCK-101',
          ticketName: 'Geral'
        })
      })
    );
  });

  it('bloqueia participante tentando consultar ingresso de outro usuário por ticketNumber (403)', async () => {
    const req = {
      user: { uid: 'user-1', email: 'aluno@ufu.br', role: 'PARTICIPANT' },
      body: { ticketNumber: 'TCK-999' }
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByTicket).mockResolvedValueOnce({
      id: 999,
      order_id: 'ORD-999',
      ticket_number: 'TCK-999',
      ticket_name: 'VIP',
      first_name: 'Outro',
      last_name: 'Usuario',
      email: 'outro@ufu.br',
      ticket_num_qr_code: 'QR-999'
    } as any);

    const finalHandler = verifyHandlers[verifyHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('não autorizado')
      })
    );
  });

  it('permite que ADMIN consulte qualquer ingresso de qualquer e-mail', async () => {
    const req = {
      user: { uid: 'admin-1', email: 'admin@admin.com', role: 'ADMIN' },
      body: { ticketNumber: 'TCK-999' }
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByTicket).mockResolvedValueOnce({
      id: 999,
      order_id: 'ORD-999',
      ticket_number: 'TCK-999',
      ticket_name: 'VIP',
      first_name: 'Outro',
      last_name: 'Usuario',
      email: 'outro@ufu.br',
      ticket_num_qr_code: 'QR-999'
    } as any);

    const finalHandler = verifyHandlers[verifyHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        verified: true,
        participant: expect.objectContaining({
          ticketNumber: 'TCK-999',
          email: 'outro@ufu.br'
        })
      })
    );
  });

  it('retorna 404 com hasTicket: false quando nenhum ingresso é localizado', async () => {
    const req = {
      user: { uid: 'user-1', email: 'sem@ufu.br', role: 'PARTICIPANT' },
      body: { email: 'sem@ufu.br' }
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValueOnce(null);

    const finalHandler = verifyHandlers[verifyHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'not_found',
        verified: false,
        hasTicket: false
      })
    );
  });
});

describe('POST /sync-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  const syncHandlers = getRouteHandlers('/sync-user', 'post');

  it('retorna 404 com hasTicket: false quando participante não possui ingresso no Sympla', async () => {
    const req = {
      user: { uid: 'user-sem-ingresso', email: 'sem@ufu.br', role: 'PARTICIPANT' },
      body: {}
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValueOnce(null);

    const finalHandler = syncHandlers[syncHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'not_found',
        synced: false,
        hasTicket: false
      })
    );
  });

  it('sincroniza ingresso por ticketNumber diretamente com Firestore', async () => {
    const req = {
      user: { uid: 'user-2', email: 'user@ufu.br', role: 'PARTICIPANT' },
      body: { ticketNumber: 'TCK-555' }
    } as unknown as Request;
    const res = makeRes();

    vi.mocked(symplaService.findParticipantByTicket).mockResolvedValueOnce({
      id: 555,
      order_id: 'ORD-555',
      ticket_number: 'TCK-555',
      ticket_name: 'Geral',
      first_name: 'Maria',
      last_name: 'Souza',
      email: 'user@ufu.br',
      ticket_num_qr_code: 'QR-555'
    } as any);

    const finalHandler = syncHandlers[syncHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockDoc).toHaveBeenCalledWith('user-2');
    expect(mockSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        hasSymplaTicket: true,
        symplaTicket: expect.objectContaining({
          ticketNumber: 'TCK-555'
        })
      })
    );
  });
});

describe('KAN-108: ingresso Sympla único por conta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  const participant = {
    id: 7, order_id: 'ORD-7', ticket_number: 'TCK-7', ticket_name: 'Geral',
    first_name: 'A', last_name: 'B', email: 'a@ufu.br', ticket_num_qr_code: 'QR-7'
  } as any;
  const run = async (path: string, uid: string) => {
    const hs = getRouteHandlers(path, 'post');
    const res = makeRes();
    await hs[hs.length - 1](
      { user: { uid, email: 'a@ufu.br', role: 'PARTICIPANT' }, body: { email: 'a@ufu.br' } } as unknown as Request,
      res,
      () => {}
    );
    return res;
  };

  it.each(['/verify-ticket', '/sync-user'])('%s: segunda conta com o mesmo ingresso recebe 409 e nada é gravado', async (path) => {
    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValue(participant);

    const first = await run(path, 'uid-1');
    expect(first.status).toHaveBeenCalledWith(200);
    expect(store.get('symplaTickets/TCK-7')).toMatchObject({ uid: 'uid-1' });

    mockSet.mockClear();
    const second = await run(path, 'uid-2');
    expect(second.status).toHaveBeenCalledWith(409);
    expect(second.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'conflict', message: expect.stringContaining('já está vinculado') })
    );
    expect(mockSet).not.toHaveBeenCalled();
    expect(store.has('users/uid-2')).toBe(false);
  });

  it('a mesma conta pode revincular o próprio ingresso (idempotente)', async () => {
    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValue(participant);
    await run('/verify-ticket', 'uid-1');
    const again = await run('/verify-ticket', 'uid-1');
    expect(again.status).toHaveBeenCalledWith(200);
  });

  it('trocar de ingresso libera o índice do anterior', async () => {
    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValueOnce(participant);
    await run('/verify-ticket', 'uid-1');
    vi.mocked(symplaService.findParticipantByEmail).mockResolvedValueOnce({ ...participant, ticket_number: 'TCK-8' });
    await run('/verify-ticket', 'uid-1');
    expect(store.has('symplaTickets/TCK-7')).toBe(false);
    expect(store.get('symplaTickets/TCK-8')).toMatchObject({ uid: 'uid-1' });
  });
});

describe('POST /unlink-ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  const unlinkHandlers = getRouteHandlers('/unlink-ticket', 'post');

  it('bloqueia requisição sem token (401 MISSING_TOKEN)', async () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();

    await runChain(unlinkHandlers, req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'UNAUTHORIZED' })
    );
  });

  it('desvincula ingresso da própria conta e remove índice no Firestore', async () => {
    store.set('users/user-1', {
      symplaTicket: { ticketNumber: 'TCK-123' },
      hasSymplaTicket: true,
      ticketId: 'TCK-123'
    });
    store.set('symplaTickets/TCK-123', { uid: 'user-1' });

    const req = {
      user: { uid: 'user-1', email: 'user@ufu.br', role: 'PARTICIPANT' },
      body: {}
    } as unknown as Request;
    const res = makeRes();

    const finalHandler = unlinkHandlers[unlinkHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        unlinked: true
      })
    );
    expect(store.has('symplaTickets/TCK-123')).toBe(false);
    expect(store.get('users/user-1')).toMatchObject({
      symplaTicket: null,
      hasSymplaTicket: false,
      ticketId: null
    });
  });

  it('permite que ADMIN desvincule ingresso de outro usuário passando body.uid', async () => {
    store.set('users/target-user', {
      symplaTicket: { ticketNumber: 'TCK-999' },
      hasSymplaTicket: true,
      ticketId: 'TCK-999'
    });
    store.set('symplaTickets/TCK-999', { uid: 'target-user' });

    const req = {
      user: { uid: 'admin-1', email: 'admin@admin.com', role: 'ADMIN' },
      body: { uid: 'target-user' }
    } as unknown as Request;
    const res = makeRes();

    const finalHandler = unlinkHandlers[unlinkHandlers.length - 1];
    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        unlinked: true
      })
    );
    expect(store.has('symplaTickets/TCK-999')).toBe(false);
    expect(store.get('users/target-user')).toMatchObject({
      symplaTicket: null,
      hasSymplaTicket: false,
      ticketId: null
    });
  });
});

describe('POST /api/sympla/checkin (ERR-083: Check-in de portaria)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const checkinHandlers = getRouteHandlers('/checkin', 'post');
  // checkinHandlers[0] = requireAuth, checkinHandlers[1] = requireRole(['STAFF', 'ADMIN']), checkinHandlers[2] = handler
  const requireRoleHandler = checkinHandlers[1];
  const finalHandler = checkinHandlers[checkinHandlers.length - 1];

  it('exige autenticação e papel STAFF ou ADMIN na cadeia de middlewares', () => {
    expect(checkinHandlers.length).toBeGreaterThanOrEqual(3);
  });

  it('bloqueia PARTICIPANT com 403 Forbidden antes de chamar o serviço', async () => {
    const req = {
      user: { uid: 'user-p', email: 'part@ufu.br', role: 'PARTICIPANT' },
      body: { ticketNumber: 'TCK-123' }
    } as unknown as Request;
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(symplaService.checkInParticipant).not.toHaveBeenCalled();
  });

  it('rejeita requisição sem ticketNumber com 400', async () => {
    const req = {
      user: { uid: 'staff-1', role: 'STAFF' },
      body: {}
    } as unknown as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Número do ingresso é obrigatório para check-in.'
    });
    expect(symplaService.checkInParticipant).not.toHaveBeenCalled();
  });

  it('realiza check-in com sucesso por STAFF e retorna 200', async () => {
    vi.mocked(symplaService.checkInParticipant).mockResolvedValueOnce({
      success: true,
      message: 'Check-in realizado com sucesso.'
    });

    const req = {
      user: { uid: 'staff-1', role: 'STAFF' },
      body: { ticketNumber: 'TCK-100' }
    } as unknown as Request;
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(symplaService.checkInParticipant).toHaveBeenCalledWith('TCK-100');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Check-in realizado com sucesso.'
    });
  });

  it('permite que ADMIN realize check-in com sucesso', async () => {
    vi.mocked(symplaService.checkInParticipant).mockResolvedValueOnce({
      success: true,
      message: 'Check-in realizado com sucesso.'
    });

    const req = {
      user: { uid: 'admin-1', role: 'ADMIN' },
      body: { ticketNumber: 'TCK-200' }
    } as unknown as Request;
    const res = makeRes();

    await runChain([requireRoleHandler, finalHandler], req, res);

    expect(symplaService.checkInParticipant).toHaveBeenCalledWith('TCK-200');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Check-in realizado com sucesso.'
    });
  });

  it('retorna 400 se o serviço Sympla reportar falha (ingresso inválido ou já utilizado)', async () => {
    vi.mocked(symplaService.checkInParticipant).mockResolvedValueOnce({
      success: false,
      message: 'Ingresso já realizou check-in anteriormente.'
    });

    const req = {
      user: { uid: 'staff-1', role: 'STAFF' },
      body: { ticketNumber: 'TCK-ALREADY-USED' }
    } as unknown as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Ingresso já realizou check-in anteriormente.'
    });
  });

  it('retorna 500 se o serviço Sympla lançar exceção inesperada', async () => {
    vi.mocked(symplaService.checkInParticipant).mockRejectedValueOnce(
      new Error('Erro de conexão com API Sympla')
    );

    const req = {
      user: { uid: 'staff-1', role: 'STAFF' },
      body: { ticketNumber: 'TCK-FAIL' }
    } as unknown as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Erro de conexão com API Sympla'
    });
  });

  it('retorna 500 com mensagem padrão quando o erro não tem message', async () => {
    vi.mocked(symplaService.checkInParticipant).mockRejectedValueOnce({});

    const req = {
      user: { uid: 'staff-1', role: 'STAFF' },
      body: { ticketNumber: 'TCK-FAIL-UNKNOWN' }
    } as unknown as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Erro ao processar check-in.'
    });
  });
});

describe('GET /api/sympla/event (ERR-084: Consulta de evento configurado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventHandlers = getRouteHandlers('/event', 'get');
  const finalHandler = eventHandlers[eventHandlers.length - 1];

  it('retorna 200 com os dados do evento em caso de sucesso', async () => {
    const fakeEvent = {
      id: 12345,
      name: 'TechWeek 2026',
      start_date: '2026-10-20 08:00:00',
      end_date: '2026-10-24 18:00:00'
    };
    vi.mocked(symplaService.getEventDetails).mockResolvedValueOnce(fakeEvent as any);

    const req = {} as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(symplaService.getEventDetails).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: fakeEvent
    });
  });

  it('retorna 500 com mensagem de erro quando a API do Sympla falha', async () => {
    vi.mocked(symplaService.getEventDetails).mockRejectedValueOnce(new Error('Erro de conexão com o Sympla'));

    const req = {} as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Erro de conexão com o Sympla'
    });
  });

  it('retorna 500 com mensagem padrão quando o erro lançado não possui message', async () => {
    vi.mocked(symplaService.getEventDetails).mockRejectedValueOnce({});

    const req = {} as Request;
    const res = makeRes();

    await finalHandler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Erro ao consultar evento no Sympla.'
    });
  });
});

describe('Rotas Sympla - Rate Limiting (ERR-085)', () => {
  it('GET /event possui symplaPublicLimiter na cadeia de middlewares', () => {
    const handlers = getRouteHandlers('/event', 'get');
    expect(handlers).toContain(symplaPublicLimiter);
  });

  it('POST /verify-ticket possui symplaSyncLimiter na cadeia de middlewares', () => {
    const handlers = getRouteHandlers('/verify-ticket', 'post');
    expect(handlers).toContain(symplaSyncLimiter);
  });

  it('POST /sync-user possui symplaSyncLimiter na cadeia de middlewares', () => {
    const handlers = getRouteHandlers('/sync-user', 'post');
    expect(handlers).toContain(symplaSyncLimiter);
  });

  it('POST /unlink-ticket possui symplaSyncLimiter na cadeia de middlewares', () => {
    const handlers = getRouteHandlers('/unlink-ticket', 'post');
    expect(handlers).toContain(symplaSyncLimiter);
  });

  it('POST /checkin possui staffActionLimiter na cadeia de middlewares', () => {
    const handlers = getRouteHandlers('/checkin', 'post');
    expect(handlers).toContain(staffActionLimiter);
  });
});

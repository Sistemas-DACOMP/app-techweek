import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockSet = vi.fn().mockResolvedValue({});
const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: (name: string) => mockCollection(name)
  }
}));

vi.mock('../services/symplaService', () => ({
  symplaService: {
    findParticipantByTicket: vi.fn(),
    findParticipantByEmail: vi.fn(),
    getEventDetails: vi.fn()
  }
}));

import router from './symplaRoutes';
import { symplaService } from '../services/symplaService';

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
      expect.objectContaining({
        hasSymplaTicket: true,
        symplaTicket: expect.objectContaining({
          ticketNumber: 'TCK-101',
          ticketName: 'Geral'
        })
      }),
      { merge: true }
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
});

describe('POST /sync-user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const syncHandlers = getRouteHandlers('/sync-user', 'post');

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
      expect.objectContaining({
        hasSymplaTicket: true,
        symplaTicket: expect.objectContaining({
          ticketNumber: 'TCK-555'
        })
      }),
      { merge: true }
    );
  });
});

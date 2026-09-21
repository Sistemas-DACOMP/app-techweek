import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn()
  }
}));

import router, { calculateAgeGroup, buildWhatsAppPayload, leadsHandler } from './leads';
import { db } from '../config/firebaseAdmin';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(body: any = {}, user: any = { uid: 'sponsor-123', role: 'SPONSOR', email: 'sponsor@company.com' }) {
  return {
    body,
    user
  } as unknown as Request;
}

describe('calculateAgeGroup (LGPD - KAN-55)', () => {
  it('retorna "Não informada" para datas nulas, vazias ou inválidas', () => {
    expect(calculateAgeGroup(null)).toBe('Não informada');
    expect(calculateAgeGroup(undefined)).toBe('Não informada');
    expect(calculateAgeGroup('')).toBe('Não informada');
    expect(calculateAgeGroup('data-invalida')).toBe('Não informada');
  });

  it('calcula corretamente faixa menor de 18 anos', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    expect(calculateAgeGroup(birth.toISOString().split('T')[0])).toBe('Menor de 18');
  });

  it('calcula corretamente faixa 18-20', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 19, today.getMonth(), today.getDate());
    expect(calculateAgeGroup(birth)).toBe('18-20');
  });

  it('calcula corretamente faixa 21-24', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate());
    expect(calculateAgeGroup(birth)).toBe('21-24');
  });

  it('calcula corretamente faixa 25-30', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 27, today.getMonth(), today.getDate());
    expect(calculateAgeGroup(birth)).toBe('25-30');
  });

  it('calcula corretamente faixa 31+', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 35, today.getMonth(), today.getDate());
    expect(calculateAgeGroup(birth)).toBe('31+');
  });

  it('suporta objeto Firestore Timestamp com método toDate()', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 23, today.getMonth(), today.getDate());
    const mockTimestamp = {
      toDate: () => birth
    };
    expect(calculateAgeGroup(mockTimestamp)).toBe('21-24');
  });
});

describe('buildWhatsAppPayload', () => {
  it('retorna campos vazios para telefone ausente', () => {
    const res = buildWhatsAppPayload(null, 'Ana');
    expect(res.url).toBeNull();
    expect(res.formattedPhone).toBeNull();
  });

  it('formata telefone celular brasileiro com DDD e adiciona código 55', () => {
    const res = buildWhatsAppPayload('(34) 99876-5432', 'João Silva');
    expect(res.formattedPhone).toBe('5534998765432');
    expect(res.url).toContain('https://wa.me/5534998765432');
    expect(res.url).toContain(encodeURIComponent('João Silva'));
  });

  it('preserva número que já possui código 55', () => {
    const res = buildWhatsAppPayload('+5534998765432', 'Carlos');
    expect(res.formattedPhone).toBe('5534998765432');
  });
});

describe('POST /api/leads handler (KAN-55)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockImplementation((name: string) => ({
      doc: (id: string) => ({
        path: `${name}/${id}`,
        collection: (subName: string) => ({
          doc: (subId: string) => ({
            path: `${name}/${id}/${subName}/${subId}`
          })
        })
      })
    }));
  });

  it('retorna 400 INVALID_PAYLOAD se participantUid estiver ausente ou inválido', async () => {
    const req = makeReq({ participantUid: '' });
    const res = makeRes();

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'INVALID_PAYLOAD' })
    );
  });

  it('retorna 400 INVALID_PAYLOAD se rating for inválido (fora de 1..5 ou decimal)', async () => {
    const req1 = makeReq({ participantUid: 'part-1', rating: 6 });
    const res1 = makeRes();
    await leadsHandler(req1, res1);
    expect(res1.status).toHaveBeenCalledWith(400);

    const req2 = makeReq({ participantUid: 'part-1', rating: 3.5 });
    const res2 = makeRes();
    await leadsHandler(req2, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 PARTICIPANT_NOT_FOUND se o aluno não existir no Firestore', async () => {
    const req = makeReq({ participantUid: 'part-404' });
    const res = makeRes();

    (db.runTransaction as any).mockImplementation(async (cb: any) => {
      return cb({
        get: vi.fn((ref: { path: string }) => {
          if (ref.path.startsWith('users/')) return Promise.resolve({ exists: false });
          return Promise.resolve({ exists: false });
        }),
        set: vi.fn(),
        update: vi.fn()
      });
    });

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'PARTICIPANT_NOT_FOUND' })
    );
  });

  it('grava lead, calcula faixa etária e credita +50 pontos na primeira visita (HTTP 201)', async () => {
    const req = makeReq({
      participantUid: 'part-1',
      notes: 'Excelente candidato para estágio backend',
      rating: 5
    });
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Guilherme Silva',
              email: 'guilherme@ufu.br',
              phone: '34991112233',
              course: 'Sistemas de Informação',
              period: 6,
              birthDate: '2002-08-10'
            })
          });
        }
        if (ref.path.startsWith('pointEvents/')) {
          return Promise.resolve({ exists: false });
        }
        return Promise.resolve({ exists: false });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTx.update).toHaveBeenCalledTimes(1); // Incremento de pontos no aluno
    expect(mockTx.set).toHaveBeenCalledTimes(2); // pointEvents + leads/contacts

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          participantUid: 'part-1',
          name: 'Guilherme Silva',
          email: 'guilherme@ufu.br',
          faixaEtaria: expect.any(String),
          notes: 'Excelente candidato para estágio backend',
          rating: 5,
          pointsAwarded: 50
        }),
        whatsapp: expect.objectContaining({
          formattedPhone: '5534991112233',
          url: expect.stringContaining('https://wa.me/5534991112233')
        })
      })
    );
  });

  it('atualiza anotações do lead mas não duplica pontos em visita repetida (HTTP 200, pointsAwarded: 0)', async () => {
    const req = makeReq({
      participantUid: 'part-1',
      notes: 'Atualizando anotações da conversa',
      rating: 4
    });
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Guilherme Silva',
              email: 'guilherme@ufu.br',
              phone: '34991112233'
            })
          });
        }
        if (ref.path.startsWith('pointEvents/')) {
          return Promise.resolve({
            exists: true,
            data: () => ({ points: 50 })
          });
        }
        return Promise.resolve({ exists: false });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockTx.update).not.toHaveBeenCalled(); // Não incrementa pontos novamente
    expect(mockTx.set).toHaveBeenCalledTimes(1); // Apenas atualiza o lead
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          pointsAwarded: 0,
          rating: 4,
          notes: 'Atualizando anotações da conversa'
        })
      })
    );
  });

  it('retorna 500 INTERNAL_ERROR caso a transação falhe de forma inesperada', async () => {
    const req = makeReq({ participantUid: 'part-1' });
    const res = makeRes();

    (db.runTransaction as any).mockRejectedValue(new Error('Falha no Firestore'));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar o contato no momento.'
    });
  });
});

describe('leads route middleware configuration', () => {
  it('registra a rota POST / com middleware de autenticação e papel restrito', () => {
    const postRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.post
    );
    expect(postRoute).toBeDefined();
    expect(postRoute.route.stack.length).toBeGreaterThanOrEqual(3); // requireAuth, requireRole, leadsHandler
  });
});


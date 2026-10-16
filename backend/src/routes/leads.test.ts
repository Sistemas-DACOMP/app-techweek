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
import { requireVerifiedEmail } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(body: any = {}, user: any = { uid: 'sponsor-123', role: 'SPONSOR', email: 'sponsor@company.com', emailVerified: true }) {
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

  it('resolve participantUid enviado como e-mail para o ID do documento do usuário (ERR-077)', async () => {
    const req = makeReq({
      participantUid: 'aluno@ufu.br',
      notes: 'Contato via e-mail',
      rating: 5
    });
    const res = makeRes();

    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [{ id: 'part-resolved' }]
              })
            })
          }),
          doc: (id: string) => ({
            path: `users/${id}`,
            collection: (sub: string) => ({
              doc: (subId: string) => ({ path: `users/${id}/${sub}/${subId}` })
            })
          })
        };
      }
      return {
        doc: (id: string) => ({
          path: `${name}/${id}`,
          collection: (sub: string) => ({
            doc: (subId: string) => ({ path: `${name}/${id}/${sub}/${subId}` })
          })
        })
      };
    });

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-resolved') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Aluno Resolvido',
              email: 'aluno@ufu.br',
              phone: '34991112233'
            })
          });
        }
        return Promise.resolve({ exists: false });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          participantUid: 'part-resolved'
        })
      })
    );
  });

  it('gera ID sintético email_* e conclui captura quando e-mail não é encontrado no Firestore mas possui participantData (ERR-077)', async () => {
    const req = makeReq({
      participantUid: 'naoexiste@ufu.br',
      participantData: { name: 'Visitante Avulso', email: 'naoexiste@ufu.br' }
    });
    const res = makeRes();

    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
            })
          }),
          doc: (id: string) => ({
            path: `users/${id}`,
            collection: (sub: string) => ({
              doc: (subId: string) => ({ path: `users/${id}/${sub}/${subId}` })
            })
          })
        };
      }
      return {
        doc: (id: string) => ({
          path: `${name}/${id}`,
          collection: (sub: string) => ({
            doc: (subId: string) => ({ path: `${name}/${id}/${sub}/${subId}` })
          })
        })
      };
    });

    const mockTx = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn(),
      update: vi.fn()
    };
    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          participantUid: 'email_naoexiste_ufu_br'
        })
      })
    );
  });

  it('trata falha de rede ao resolver e-mail logando aviso e retornando 404 PARTICIPANT_NOT_FOUND quando não há participantData (ERR-077)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const req = makeReq({ participantUid: 'erro@ufu.br' });
    const res = makeRes();

    (db.collection as any).mockImplementation((name: string) => {
      if (name === 'users') {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockRejectedValue(new Error('Network error'))
            })
          }),
          doc: (id: string) => ({
            path: `users/${id}`,
            collection: (sub: string) => ({
              doc: (subId: string) => ({ path: `users/${id}/${sub}/${subId}` })
            })
          })
        };
      }
      return {
        doc: (id: string) => ({
          path: `${name}/${id}`,
          collection: (sub: string) => ({
            doc: (subId: string) => ({ path: `${name}/${id}/${sub}/${subId}` })
          })
        })
      };
    });

    const mockTx = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn(),
      update: vi.fn()
    };
    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao resolver UID por e-mail'),
      expect.any(Error)
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'PARTICIPANT_NOT_FOUND'
      })
    );
    warnSpy.mockRestore();
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

  it('grava e retorna metadados de currículo quando o participante possui currículo anexado', async () => {
    const req = makeReq({
      participantUid: 'part-resume-1',
      notes: 'Candidato com currículo em anexo',
      rating: 5
    });
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-resume-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Carla Dias',
              email: 'carla@ufu.br',
              phone: '34991119999',
              course: 'Ciência da Computação',
              period: 8,
              resumeUrl: 'https://firebasestorage.googleapis.com/.../curriculo_carla.pdf',
              resumeName: 'curriculo_carla.pdf',
              resumeSize: 1048576,
              resumeUpdatedAt: '2026-10-16T12:00:00.000Z'
            })
          });
        }
        return Promise.resolve({ exists: false });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resumeUrl: 'https://firebasestorage.googleapis.com/.../curriculo_carla.pdf',
        resumeName: 'curriculo_carla.pdf',
        resumeSize: 1048576,
        resumeUpdatedAt: '2026-10-16T12:00:00.000Z'
      }),
      { merge: true }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          resumeUrl: 'https://firebasestorage.googleapis.com/.../curriculo_carla.pdf',
          resumeName: 'curriculo_carla.pdf',
          resumeSize: 1048576,
          resumeUpdatedAt: '2026-10-16T12:00:00.000Z'
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
        if (ref.path.includes('sponsor_lead')) {
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

  it('identifica empresa parceira e registra no passaporte do participante', async () => {
    const req = makeReq(
      { participantUid: 'part-1', companyId: 'kanastra' },
      { uid: 'sponsor-kanastra', role: 'SPONSOR', email: 'contato@kanastra.com.br' }
    );
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({ name: 'Maria Aluna', visitedSponsors: {} })
          });
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visitedSponsors: expect.objectContaining({
          kanastra: expect.objectContaining({ sponsorUid: 'sponsor-kanastra' })
        })
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({ companyId: 'kanastra' })
      })
    );
  });

  it('quando validateOnly=true, credita pontos e atualiza passaporte mas NÃO grava contato em leads ou company_leads', async () => {
    const req = makeReq(
      { participantUid: 'part-1', companyId: 'kanastra', validateOnly: true },
      { uid: 'sponsor-kanastra', role: 'SPONSOR', email: 'contato@kanastra.com.br' }
    );
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({ name: 'Maria Aluna', visitedSponsors: {} })
          });
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        validateOnly: true
      })
    );
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        visitedSponsors: expect.objectContaining({
          kanastra: expect.objectContaining({ sponsorUid: 'sponsor-kanastra' })
        })
      })
    );
    // mockTx.set é chamado apenas 1 vez (para o pointEvent) e nunca para os leads
    expect(mockTx.set).toHaveBeenCalledTimes(1);
  });

  // KAN-124: a empresa vem do vínculo do servidor, nunca do body.
  function runLead(body: any, user: any, sponsorUserDoc: any, sponsorsDoc?: any) {
    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({ exists: true, data: () => ({ name: 'Maria', visitedSponsors: {} }) });
        }
        if (ref.path === `users/${user.uid}`) {
          return Promise.resolve({ exists: true, data: () => sponsorUserDoc });
        }
        if (ref.path === 'sponsors/sp-bayer' && sponsorsDoc) {
          return Promise.resolve({ exists: true, data: () => sponsorsDoc });
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn(),
      update: vi.fn()
    };
    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));
    const res = makeRes();
    return leadsHandler(makeReq(body, user), res).then(() => ({ res, mockTx }));
  }

  it('KAN-124: companyId do body é ignorado (SPONSOR não se passa por outra empresa)', async () => {
    const { res, mockTx } = await runLead(
      { participantUid: 'part-1', companyId: 'kanastra' },
      { uid: 'sp-x', role: 'SPONSOR', email: 'rh@semempresa.com' },
      {}
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ lead: expect.objectContaining({ companyId: null }) })
    );
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ visitedSponsors: expect.anything() })
    );
  });

  it('KAN-124: com sponsorId usa sponsors/{id}.legacyCompanyId, mesmo com body e e-mail apontando outra empresa', async () => {
    const { res } = await runLead(
      { participantUid: 'part-1', companyId: 'kanastra' },
      { uid: 'sp-b', role: 'SPONSOR', email: 'x@kanastra.com.br' },
      { sponsorId: 'sp-bayer' },
      { legacyCompanyId: 'bayer' }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ lead: expect.objectContaining({ companyId: 'bayer' }) })
    );
  });

  it('KAN-124: com sponsorId sem legacyCompanyId não cai no fallback legado', async () => {
    const { res } = await runLead(
      { participantUid: 'part-1' },
      { uid: 'sp-b', role: 'SPONSOR', email: 'x@kanastra.com.br' },
      { sponsorId: 'sp-bayer', companyId: 'kanastra' },
      { name: 'Nova Empresa' }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ lead: expect.objectContaining({ companyId: null }) })
    );
  });

  it('libera o Bilhete Dourado (+100 pts) quando todas as 5 empresas forem visitadas', async () => {
    const req = makeReq(
      { participantUid: 'part-1', companyId: 'hyperflow' },
      { uid: 'sponsor-hf', role: 'SPONSOR', email: 'lead@hyperflow.com' }
    );
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Aluno Completo',
              visitedSponsors: {
                kanastra: { visitedAt: '2026-09-28' },
                bayer: { visitedAt: '2026-09-28' },
                aimirim: { visitedAt: '2026-09-28' },
                bip: { visitedAt: '2026-09-28' }
              },
              goldenTicketAwarded: false
            })
          });
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        goldenTicketAwarded: true
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          goldenTicketAwarded: true,
          pointsAwarded: 150 // 50 lead + 100 bilhete dourado
        })
      })
    );
  });

  it('não duplica os 100 pontos do Bilhete Dourado se pointEvents/part-1_passport_golden_ticket já existe', async () => {
    const req = makeReq(
      { participantUid: 'part-1', companyId: 'hyperflow' },
      { uid: 'sponsor-hf', role: 'SPONSOR', email: 'lead@hyperflow.com' }
    );
    const res = makeRes();

    const mockTx = {
      get: vi.fn((ref: { path: string }) => {
        if (ref.path === 'users/part-1') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Aluno Completo',
              visitedSponsors: {
                kanastra: { visitedAt: '2026-09-28' },
                bayer: { visitedAt: '2026-09-28' },
                aimirim: { visitedAt: '2026-09-28' },
                bip: { visitedAt: '2026-09-28' }
              },
              goldenTicketAwarded: false // campo no doc do usuário desincronizado
            })
          });
        }
        if (ref.path === 'pointEvents/part-1_passport_golden_ticket') {
          return Promise.resolve({
            exists: true,
            data: () => ({ points: 100 })
          });
        }
        if (ref.path === 'pointEvents/part-1_sponsor_lead_sponsor-hf') {
          return Promise.resolve({ exists: false }); // lead inédito no estande
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn(),
      update: vi.fn()
    };

    (db.runTransaction as any).mockImplementation(async (cb: any) => cb(mockTx));

    await leadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // Deve conceder apenas os 50 pontos do estande, reconciliando goldenTicketAwarded: true
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          goldenTicketAwarded: true,
          pointsAwarded: 50
        })
      })
    );

    // mockTx.set NÃO deve ser chamado para o golden ticket
    const setCalls = mockTx.set.mock.calls;
    const goldenTicketSetCall = setCalls.find(
      ([ref]: any) => ref?.path === 'pointEvents/part-1_passport_golden_ticket'
    );
    expect(goldenTicketSetCall).toBeUndefined();
  });
});

describe('GET /api/leads handler', () => {
  it('retorna myLeads e companyLeads com status 200', async () => {
    const { getLeadsHandler } = await import('./leads');
    const req = makeReq({}, { uid: 'sponsor-1', role: 'SPONSOR', email: 'contato@kanastra.com.br' });
    const res = makeRes();

    (db.collection as any).mockImplementation((colName: string) => {
      if (colName === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve({
              exists: true,
              data: () => ({ companyId: 'kanastra' })
            })
          })
        };
      }
      if (colName === 'leads') {
        return {
          doc: () => ({
            collection: () => ({
              get: () => Promise.resolve({
                docs: [
                  { id: 'part-1', data: () => ({ name: 'Aluno 1', rating: 5, notes: 'Fera' }) }
                ]
              })
            })
          })
        };
      }
      if (colName === 'company_leads') {
        return {
          doc: () => ({
            collection: () => ({
              get: () => Promise.resolve({
                docs: [
                  { id: 'part-1', data: () => ({ name: 'Aluno 1', rating: 5, notes: 'Fera' }) },
                  { id: 'part-2', data: () => ({ name: 'Aluno 2', rating: 4, notes: 'Bom perfil' }) }
                ]
              })
            })
          })
        };
      }
      return { doc: () => ({ get: () => Promise.resolve({ exists: false }) }) };
    });

    await getLeadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        companyId: 'kanastra',
        myLeads: expect.arrayContaining([expect.objectContaining({ id: 'part-1' })]),
        companyLeads: expect.arrayContaining([
          expect.objectContaining({ id: 'part-1' }),
          expect.objectContaining({ id: 'part-2' })
        ])
      })
    );
  });

  it('aplica limit e orderBy createdAt desc na busca e retorna metadados de paginação (ERR-075)', async () => {
    const { getLeadsHandler } = await import('./leads');
    const req = {
      body: {},
      user: { uid: 'sponsor-1', role: 'SPONSOR', email: 'contato@kanastra.com.br' },
      query: { limit: '25' }
    } as unknown as Request;
    const res = makeRes();

    const mockOrderBy = vi.fn();
    const mockLimit = vi.fn();

    (db.collection as any).mockImplementation((colName: string) => {
      if (colName === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve({
              exists: true,
              data: () => ({ companyId: 'kanastra' })
            })
          })
        };
      }
      if (colName === 'leads' || colName === 'company_leads') {
        return {
          doc: () => ({
            collection: () => {
              const queryObj: any = {
                orderBy: mockOrderBy.mockImplementation(() => queryObj),
                limit: mockLimit.mockImplementation(() => queryObj),
                get: () => Promise.resolve({
                  docs: [
                    { id: 'part-1', data: () => ({ name: 'Aluno 1' }) },
                    { id: 'part-2', data: () => ({ name: 'Aluno 2' }) }
                  ]
                })
              };
              return queryObj;
            }
          })
        };
      }
      return { doc: () => ({ get: () => Promise.resolve({ exists: false }) }) };
    });

    await getLeadsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(mockLimit).toHaveBeenCalledWith(25);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        pagination: {
          limit: 25,
          totalReturned: 2
        }
      })
    );
  });

  it('aplica teto máximo de 100 itens e fallback de 50 para limit ausente ou inválido (ERR-075)', async () => {
    const { getLeadsHandler } = await import('./leads');
    const mockLimit = vi.fn();

    (db.collection as any).mockImplementation((colName: string) => {
      if (colName === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve({
              exists: true,
              data: () => ({ companyId: 'kanastra' })
            })
          })
        };
      }
      if (colName === 'leads') {
        return {
          doc: () => ({
            collection: () => {
              const queryObj: any = {
                orderBy: vi.fn().mockImplementation(() => queryObj),
                limit: mockLimit.mockImplementation(() => queryObj),
                get: () => Promise.resolve({ docs: [] })
              };
              return queryObj;
            }
          })
        };
      }
      return { doc: () => ({ collection: () => ({ get: () => Promise.resolve({ docs: [] }) }) }) };
    });

    // Caso 1: limit acima de 100 deve ser limitado a 100
    const reqOverLimit = {
      body: {},
      user: { uid: 'sponsor-1', role: 'SPONSOR', email: 'contato@kanastra.com.br' },
      query: { limit: '500' }
    } as unknown as Request;
    const resOver = makeRes();
    await getLeadsHandler(reqOverLimit, resOver);
    expect(mockLimit).toHaveBeenCalledWith(100);

    // Caso 2: limit ausente/inválido deve ser 50
    mockLimit.mockClear();
    const reqDefault = {
      body: {},
      user: { uid: 'sponsor-1', role: 'SPONSOR', email: 'contato@kanastra.com.br' },
      query: { limit: 'invalido' }
    } as unknown as Request;
    const resDefault = makeRes();
    await getLeadsHandler(reqDefault, resDefault);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});

describe('PATCH /api/leads/:participantUid handler', () => {
  it('rejeita participantUid inválido com 400', async () => {
    const { updateLeadHandler } = await import('./leads');
    const req = {
      params: { participantUid: '!!invalido!!' },
      body: { rating: 5 },
      user: { uid: 'sponsor-1', role: 'SPONSOR' }
    } as unknown as Request;
    const res = makeRes();

    await updateLeadHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('atualiza rating e notes com sucesso (200)', async () => {
    const { updateLeadHandler } = await import('./leads');
    const req = {
      params: { participantUid: 'part-1' },
      body: { rating: 4, notes: 'Anotações atualizadas' },
      user: { uid: 'sponsor-1', role: 'SPONSOR', email: 'contato@kanastra.com.br' }
    } as unknown as Request;
    const res = makeRes();

    const mockSet = vi.fn();
    (db.collection as any).mockImplementation((colName: string) => {
      if (colName === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve({ exists: true, data: () => ({ companyId: 'kanastra' }) })
          })
        };
      }
      return {
        doc: () => ({
          collection: () => ({
            doc: () => ({
              set: mockSet,
              get: () => Promise.resolve({
                data: () => ({ rating: 4, notes: 'Anotações atualizadas' })
              })
            })
          })
        })
      };
    });

    await updateLeadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSet).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        lead: expect.objectContaining({
          participantUid: 'part-1',
          rating: 4,
          notes: 'Anotações atualizadas'
        })
      })
    );
  });
});

describe('leads route middleware configuration (ERR-076)', () => {
  it('registra a rota POST / com middleware de autenticação, rate limiter e papel restrito', () => {
    const postRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.post
    );
    expect(postRoute).toBeDefined();
    expect(postRoute.route.stack.length).toBeGreaterThanOrEqual(5); // requireAuth, requireRole, adminSponsorLimiter, requireVerifiedEmail, leadsHandler
    const handles = postRoute.route.stack.map((l: any) => l.handle);
    expect(handles).toContain(requireVerifiedEmail);
    expect(handles).toContain(adminSponsorLimiter);
  });

  it('registra a rota GET / com middleware de autenticação, rate limiter e papel restrito', () => {
    const getRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.get
    );
    expect(getRoute).toBeDefined();
    expect(getRoute.route.stack.length).toBeGreaterThanOrEqual(4); // requireAuth, requireRole, adminSponsorLimiter, getLeadsHandler
    const handles = getRoute.route.stack.map((l: any) => l.handle);
    expect(handles).toContain(adminSponsorLimiter);
  });

  it('registra a rota PATCH /:participantUid com middleware de autenticação, rate limiter e papel restrito', () => {
    const patchRoute = (router as unknown as { stack: any[] }).stack.find(
      (layer) => layer.route?.path === '/:participantUid' && layer.route?.methods?.patch
    );
    expect(patchRoute).toBeDefined();
    expect(patchRoute.route.stack.length).toBeGreaterThanOrEqual(4); // requireAuth, requireRole, adminSponsorLimiter, updateLeadHandler
    const handles = patchRoute.route.stack.map((l: any) => l.handle);
    expect(handles).toContain(adminSponsorLimiter);
  });
});



import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveParticipantFromQr, submitLead } from './sponsorService';

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      uid: 'sponsor_123',
      getIdToken: vi.fn().mockResolvedValue('fake_token_jwt')
    }
  },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    id: 'user_fallback',
    data: () => ({})
  }),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    empty: true,
    docs: []
  }),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn()
}));

describe('sponsorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('resolveParticipantFromQr', () => {
    it('retorna null para dados vazios ou inválidos', async () => {
      expect(await resolveParticipantFromQr(null)).toBeNull();
      expect(await resolveParticipantFromQr('')).toBeNull();
    });

    it('resolve participante a partir de payload JSON embutido', async () => {
      const payload = JSON.stringify({
        uid: 'user_456',
        name: 'Carlos Oliveira',
        course: 'Sistemas de Informação',
        phone: '34991112233'
      });

      const participant = await resolveParticipantFromQr(payload);
      expect(participant).toBeDefined();
      expect(participant.name).toBe('Carlos Oliveira');
      expect(participant.course).toBe('Sistemas de Informação');
      expect(participant.participantUid).toBe('user_456');
    });

    it('resolve participante com URL codificada', async () => {
      const json = JSON.stringify({
        uid: 'user_789',
        username: 'mariasilva',
        name: 'Maria Silva'
      });
      const encoded = encodeURIComponent(json);

      const participant = await resolveParticipantFromQr(encoded);
      expect(participant).toBeDefined();
      expect(participant.name).toBe('Maria Silva');
      expect(participant.participantUid).toBe('user_789');
    });
  });

  describe('submitLead', () => {
    it('lança erro se participantUid não for fornecido', async () => {
      await expect(submitLead({})).rejects.toThrow('participantUid é obrigatório.');
    });

    it('envia dados para POST /api/leads com header Authorization e formato correto', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          lead: {
            participantUid: 'user_100',
            name: 'Ana Beatriz',
            rating: 5,
            notes: 'Excelente desenvolvedora React'
          },
          whatsapp: {
            url: 'https://wa.me/5534999998888?text=Ola'
          }
        })
      });

      const result = await submitLead({
        participantUid: 'user_100',
        notes: 'Excelente desenvolvedora React',
        rating: 5
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toContain('/leads');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer fake_token_jwt');
      expect(JSON.parse(callArgs[1].body)).toEqual({
        participantUid: 'user_100',
        notes: 'Excelente desenvolvedora React',
        rating: 5
      });
      expect(result.success).toBe(true);
      expect(result.lead.rating).toBe(5);
    });

    it('trata respostas de erro da API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'FORBIDDEN',
          message: 'Acesso negado: apenas patrocinadores podem registrar leads.'
        })
      });

      await expect(
        submitLead({
          participantUid: 'user_100',
          notes: 'Nota',
          rating: 4
        })
      ).rejects.toThrow('Acesso negado: apenas patrocinadores podem registrar leads.');
    });
  });
});

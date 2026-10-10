import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  resolveParticipantFromQr, 
  submitLead, 
  fetchLeads, 
  updateLead, 
  exportLeadsToCsv 
} from './sponsorService';

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

    it('envia validateOnly: true quando solicitado para apenas carimbar presença sem salvar notas no CRM', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          validatedOnly: true,
          message: 'Presença validada e passaporte carimbado com sucesso!'
        })
      });

      const result = await submitLead({
        participantUid: 'user_100',
        validateOnly: true
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      const parsedBody = JSON.parse(callArgs[1].body);
      expect(parsedBody.participantUid).toBe('user_100');
      expect(parsedBody.validateOnly).toBe(true);
      expect(result.success).toBe(true);
      expect(result.validatedOnly).toBe(true);
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

  describe('fetchLeads', () => {
    it('chama GET /api/leads com authorization header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          myLeads: [{ participantUid: 'u1', name: 'Dev 1' }],
          companyLeads: [{ participantUid: 'u1', name: 'Dev 1' }, { participantUid: 'u2', name: 'Dev 2' }],
          companyId: 'kanastra'
        })
      });

      const result = await fetchLeads('kanastra');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toContain('/leads?companyId=kanastra');
      expect(callArgs[1].method).toBe('GET');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer fake_token_jwt');
      expect(result.myLeads).toHaveLength(1);
      expect(result.companyLeads).toHaveLength(2);
      expect(result.companyId).toBe('kanastra');
    });

    it('lança erro se API retornar erro', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'SERVER_ERROR',
          message: 'Falha ao buscar contatos da empresa'
        })
      });

      await expect(fetchLeads()).rejects.toThrow('Falha ao buscar contatos da empresa');
    });
  });

  describe('updateLead', () => {
    it('lança erro se participantUid não for fornecido', async () => {
      await expect(updateLead({ rating: 4 })).rejects.toThrow('participantUid é obrigatório.');
    });

    it('envia PATCH /api/leads/:uid com novos dados', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          lead: { participantUid: 'u1', rating: 5, notes: 'Aprovado' }
        })
      });

      const result = await updateLead({
        participantUid: 'u1',
        rating: 5,
        notes: 'Aprovado',
        companyId: 'bayer'
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toContain('/leads/u1');
      expect(callArgs[1].method).toBe('PATCH');
      expect(JSON.parse(callArgs[1].body)).toEqual({
        rating: 5,
        notes: 'Aprovado',
        companyId: 'bayer'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('exportLeadsToCsv', () => {
    it('retorna false para listas vazias ou nulas', () => {
      expect(exportLeadsToCsv([])).toBe(false);
      expect(exportLeadsToCsv(null)).toBe(false);
    });

    it('gera e dispara download de arquivo CSV formatado com BOM', () => {
      const leads = [
        {
          name: 'Ana Clara',
          email: 'ana@ufu.br',
          phone: '(34) 99999-1111',
          course: 'Sistemas de Informação',
          period: 5,
          rating: 5,
          notes: 'Forte perfil backend',
          createdAt: new Date('2026-10-10T14:30:00Z')
        }
      ];

      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const mockAnchor = {
        click: clickMock,
        href: '',
        download: ''
      };

      const originalDocument = global.document;
      global.document = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      };

      const success = exportLeadsToCsv(leads, 'Empresa Teste');
      expect(success).toBe(true);
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('leads_empresa_teste_techweek_');
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test-uuid');

      global.document = originalDocument;
    });
  });
});


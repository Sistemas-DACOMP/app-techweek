import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from './firebase';
import {
  verifySymplaTicket,
  hasSymplaTicket,
  SYMPLA_EVENT_URL,
  getBadgeQrValue,
  verifySymplaDirectly,
  syncUserSymplaTicket
} from './sympla';

vi.mock('./firebase', () => ({
  auth: { currentUser: null }
}));

describe('Sympla Integration Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.currentUser = null;
  });

  it('retorna os dados do participante ao verificar e-mail válido', async () => {
    const mockResponse = {
      status: 'success',
      verified: true,
      participant: {
        id: 12345,
        ticketNumber: 'T999999',
        qrCodeData: 'SYMPLA:T999999'
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await verifySymplaTicket({ email: 'teste@ufu.br' });
    expect(result.verified).toBe(true);
    expect(result.participant.ticketNumber).toBe('T999999');
  });

  it('injeta Authorization Bearer quando currentUser está autenticado', async () => {
    auth.currentUser = {
      email: 'logado@ufu.br',
      getIdToken: vi.fn().mockResolvedValue('token-jwt-123')
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', verified: true })
    });

    await verifySymplaTicket({ email: 'logado@ufu.br' });
    expect(auth.currentUser.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sympla/verify-ticket'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-jwt-123'
        })
      })
    );
  });

  it('devolve conflito (sem fallback direto) quando o ingresso já está em outra conta (KAN-108)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ status: 'conflict', message: 'Este ingresso já está vinculado a outra conta.' })
    });

    const result = await verifySymplaTicket({ email: 'a@ufu.br', ticketNumber: 'T1' });
    expect(result.verified).toBe(false);
    expect(result.status).toBe('conflict');
    expect(result.message).toMatch(/outra conta/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('trata erros de conexão sem quebrar o fluxo', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await verifySymplaTicket({ email: 'erro@ufu.br' });
    expect(result.verified).toBe(false);
    expect(result.status).toBe('error');
    warnSpy.mockRestore();
  });

  it('valida corretamente hasSymplaTicket para perfis com e sem ingresso', () => {
    expect(hasSymplaTicket(null)).toBe(false);
    expect(hasSymplaTicket({})).toBe(false);
    expect(hasSymplaTicket({ symplaTicket: null })).toBe(false);
    expect(hasSymplaTicket({ symplaTicket: { ticketNumber: '123' } })).toBe(true);
    expect(hasSymplaTicket({ sympla_ticket: { ticketNumber: '123' } })).toBe(true);
    expect(SYMPLA_EVENT_URL).toContain('sympla.com.br');
  });

  it('getBadgeQrValue usa o mesmo ticketId do crachá físico quando o ingresso está vinculado (KAN-47)', () => {
    expect(getBadgeQrValue({ symplaTicket: { qrCodeData: 'SYMPLA:T999999' } })).toBe('SYMPLA:T999999');
    expect(getBadgeQrValue({ symplaTicket: { ticketNumber: 'T111' } })).toBe('T111');
  });

  it('getBadgeQrValue cai pra um identificador local sem ingresso vinculado, sem quebrar', () => {
    const value = getBadgeQrValue({ username: '@fulano', participantType: 'Aluno', course: 'SI', period: 3 });
    const parsed = JSON.parse(value);
    expect(parsed).toEqual({ username: 'fulano', participantType: 'Aluno', course: 'SI', period: 3 });
    expect(() => JSON.parse(getBadgeQrValue(null))).not.toThrow();
    expect(() => JSON.parse(getBadgeQrValue(undefined))).not.toThrow();
  });
});

describe('verifySymplaDirectly', () => {
  const sampleParticipants = [
    {
      id: 101,
      order_id: 'ORD-101',
      ticket_number: 'TK-101',
      ticket_name: 'Geral',
      first_name: 'Ana',
      last_name: 'Silva',
      email: 'ana.silva@ufu.br',
      ticket_num_qr_code: 'QR-101',
      checkin: [{ check_in: true }]
    },
    {
      id: 102,
      order_id: 'ORD-102',
      ticket_number: 'TK-102',
      ticket_name: 'Estudante',
      first_name: 'Bruno',
      last_name: 'Costa',
      email: 'bruno@ufu.br',
      ticket_num_qr_code: 'QR-102',
      checkin: []
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('localiza participante por e-mail ignorando maiúsculas e espaços', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleParticipants })
    });

    const result = await verifySymplaDirectly({ email: '  ANA.SILVA@UFU.BR  ' });
    expect(result).not.toBeNull();
    expect(result.status).toBe('success');
    expect(result.verified).toBe(true);
    expect(result.participant.id).toBe(101);
    expect(result.participant.checkInStatus).toBe(true);
    expect(result.symplaTicket.ticketNumber).toBe('TK-101');
  });

  it('localiza participante por número do ingresso', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleParticipants })
    });

    const result = await verifySymplaDirectly({ ticketNumber: 'tk-102' });
    expect(result).not.toBeNull();
    expect(result.verified).toBe(true);
    expect(result.participant.id).toBe(102);
    expect(result.participant.checkInStatus).toBe(false);
  });

  it('localiza participante pelo código do QR Code do ingresso', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleParticipants })
    });

    const result = await verifySymplaDirectly({ ticketNumber: 'QR-101' });
    expect(result).not.toBeNull();
    expect(result.verified).toBe(true);
    expect(result.participant.id).toBe(101);
  });

  it('retorna null quando nenhum participante corresponde aos critérios', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: sampleParticipants })
    });

    const result = await verifySymplaDirectly({ email: 'inexistente@ufu.br', ticketNumber: 'TK-999' });
    expect(result).toBeNull();
  });

  it('retorna null se a resposta da API Sympla não for bem-sucedida (!ok)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502
    });

    const result = await verifySymplaDirectly({ email: 'ana.silva@ufu.br' });
    expect(result).toBeNull();
  });

  it('registra warning e propaga erro caso ocorra falha de rede', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection timeout'));

    await expect(verifySymplaDirectly({ email: 'qualquer@ufu.br' })).rejects.toThrow('Connection timeout');
    expect(warnSpy).toHaveBeenCalledWith('Aviso ao consultar Sympla API diretamente:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('syncUserSymplaTicket', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.currentUser = null;
  });

  it('retorna unauthenticated se nenhum usuário estiver logado', async () => {
    const result = await syncUserSymplaTicket();
    expect(result).toEqual({ status: 'unauthenticated', synced: false });
  });

  it('sincroniza com sucesso via backend quando a API responde ok com synced: true', async () => {
    auth.currentUser = {
      email: 'participante@ufu.br',
      getIdToken: vi.fn().mockResolvedValue('token-jwt-user')
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        synced: true,
        ticket: { ticketNumber: 'TK-SYNCED' }
      })
    });

    const result = await syncUserSymplaTicket();
    expect(result.synced).toBe(true);
    expect(result.ticket.ticketNumber).toBe('TK-SYNCED');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sympla/sync-user'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-jwt-user'
        })
      })
    );
  });

  it('executa fallback direto caso backend falhe e encontra o ingresso na API Sympla', async () => {
    auth.currentUser = {
      email: 'fallback@ufu.br',
      getIdToken: vi.fn().mockResolvedValue('token-jwt-user')
    };

    // 1ª chamada: backend falha (500)
    // 2ª chamada: Sympla API oficial responde com participantes
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 999,
              order_id: 'ORD-999',
              ticket_number: 'TK-FALLBACK',
              ticket_name: 'Ingresso Geral',
              first_name: 'Teste',
              last_name: 'Fallback',
              email: 'fallback@ufu.br',
              ticket_num_qr_code: 'QR-FALLBACK'
            }
          ]
        })
      });

    const result = await syncUserSymplaTicket();
    expect(result.status).toBe('success');
    expect(result.synced).toBe(true);
    expect(result.ticket.ticketNumber).toBe('TK-FALLBACK');
    expect(result.participant.id).toBe(999);
  });

  it('retorna not_found se backend falhar e ingresso não for localizado na API Sympla', async () => {
    auth.currentUser = {
      email: 'naoencontrado@ufu.br',
      getIdToken: vi.fn().mockResolvedValue('token-jwt-user')
    };

    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Backend offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

    const result = await syncUserSymplaTicket();
    expect(result).toEqual({ status: 'not_found', synced: false });
  });
});


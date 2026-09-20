import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifySymplaTicket, hasSymplaTicket, SYMPLA_EVENT_URL } from './sympla';

describe('Sympla Integration Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('trata erros de conexão sem quebrar o fluxo', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await verifySymplaTicket({ email: 'erro@ufu.br' });
    expect(result.verified).toBe(false);
    expect(result.status).toBe('error');
  });

  it('valida corretamente hasSymplaTicket para perfis com e sem ingresso', () => {
    expect(hasSymplaTicket(null)).toBe(false);
    expect(hasSymplaTicket({})).toBe(false);
    expect(hasSymplaTicket({ symplaTicket: null })).toBe(false);
    expect(hasSymplaTicket({ symplaTicket: { ticketNumber: '123' } })).toBe(true);
    expect(hasSymplaTicket({ sympla_ticket: { ticketNumber: '123' } })).toBe(true);
    expect(SYMPLA_EVENT_URL).toContain('sympla.com.br');
  });
});


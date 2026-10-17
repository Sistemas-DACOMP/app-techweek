import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from './firebase';
import {
  verifySymplaTicket,
  hasSymplaTicket,
  SYMPLA_EVENT_URL,
  getBadgeQrValue,
  syncUserSymplaTicket,
  clearCachedSymplaTicket,
  unlinkUserSymplaTicket,
  setCachedSymplaTicket,
  getCachedSymplaTicket
} from './sympla';

vi.mock('./firebase', () => ({
  auth: { currentUser: null }
}));

describe('Sympla Integration Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    auth.currentUser = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('verifySymplaTicket', () => {
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sympla/verify-ticket'),
        expect.anything()
      );
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

    it('devolve conflito quando o ingresso já está em outra conta (KAN-108)', async () => {
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

    it('retorna not_found com hasTicket: false quando o participante não tem ingresso (404)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: 'not_found', hasTicket: false, message: 'Ingresso não encontrado' })
      });

      const result = await verifySymplaTicket({ email: 'sem@ufu.br' });
      expect(result.verified).toBe(false);
      expect(result.hasTicket).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('trata erros de conexão sem quebrar o fluxo', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await verifySymplaTicket({ email: 'erro@ufu.br' });
      expect(result.verified).toBe(false);
      expect(result.hasTicket).toBe(false);
      expect(result.status).toBe('error');
      warnSpy.mockRestore();
    });

    it('NUNCA chama api.sympla.com.br diretamente mesmo em caso de erro no backend', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      });

      await verifySymplaTicket({ email: 'teste@ufu.br', ticketNumber: 'TK-123' });

      for (const call of global.fetch.mock.calls) {
        const url = typeof call[0] === 'string' ? call[0] : call[0]?.url || '';
        expect(url).not.toContain('api.sympla.com.br');
      }
    });
  });

  describe('hasSymplaTicket & constantes', () => {
    it('valida corretamente hasSymplaTicket para perfis com e sem ingresso', () => {
      expect(hasSymplaTicket(null)).toBe(false);
      expect(hasSymplaTicket({})).toBe(false);
      expect(hasSymplaTicket({ symplaTicket: null })).toBe(false);
      expect(hasSymplaTicket({ symplaTicket: { ticketNumber: '123' } })).toBe(true);
      expect(hasSymplaTicket({ sympla_ticket: { ticketNumber: '123' } })).toBe(true);
      expect(SYMPLA_EVENT_URL).toContain('sympla.com.br');
    });
  });

  describe('getBadgeQrValue (Separação Oficial vs Geral)', () => {
    it('usa o QR oficial ou ticketId quando o ingresso está vinculado', () => {
      expect(getBadgeQrValue({ symplaTicket: { qrCodeData: 'SYMPLA:T999999' } })).toBe('SYMPLA:T999999');
      expect(getBadgeQrValue({ symplaTicket: { ticketNumber: 'T111' } })).toBe('T111');
      expect(getBadgeQrValue({ ticketId: 'T222' })).toBe('T222');
    });

    it('recupera o QR do Sympla imediatamente do cache persistente', () => {
      setCachedSymplaTicket('cache@ufu.br', 'uid-cache', {
        ticketNumber: 'T777888',
        qrCodeData: 'SYMPLA:T777888'
      });

      expect(getBadgeQrValue({ email: 'cache@ufu.br', uid: 'uid-cache' })).toBe('SYMPLA:T777888');
    });

    it('retorna JSON padronizado de GENERAL_ACCESS para participantes sem Sympla', () => {
      const qrValue = getBadgeQrValue({
        uid: 'user-livre-123',
        email: 'participante.livre@ufu.br',
        name: 'Participante Livre'
      });

      expect(qrValue).not.toContain('SYMPLA:');
      const parsed = JSON.parse(qrValue);
      expect(parsed).toEqual({
        type: 'GENERAL_ACCESS',
        uid: 'user-livre-123',
        email: 'participante.livre@ufu.br'
      });
    });

    it('retorna GENERAL_ACCESS mesmo com perfil nulo ou indefinido sem quebrar', () => {
      const parsedNull = JSON.parse(getBadgeQrValue(null));
      expect(parsedNull).toEqual({
        type: 'GENERAL_ACCESS',
        uid: '',
        email: ''
      });

      const parsedUndef = JSON.parse(getBadgeQrValue(undefined));
      expect(parsedUndef).toEqual({
        type: 'GENERAL_ACCESS',
        uid: '',
        email: ''
      });
    });
  });

  describe('syncUserSymplaTicket', () => {
    it('retorna unauthenticated se nenhum usuário estiver logado', async () => {
      const result = await syncUserSymplaTicket();
      expect(result).toEqual({ status: 'unauthenticated', synced: false, hasTicket: false });
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
      expect(result.hasTicket).toBe(true);
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

    it('retorna not_found com hasTicket: false quando o backend retorna 404', async () => {
      auth.currentUser = {
        email: 'semingresso@ufu.br',
        getIdToken: vi.fn().mockResolvedValue('token-jwt-user')
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: 'not_found', hasTicket: false })
      });

      const result = await syncUserSymplaTicket();
      expect(result).toEqual({ status: 'not_found', synced: false, hasTicket: false });
    });

    it('NUNCA faz fallback direto para api.sympla.com.br quando o backend falha', async () => {
      auth.currentUser = {
        email: 'falha@ufu.br',
        getIdToken: vi.fn().mockResolvedValue('token-jwt-user')
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await syncUserSymplaTicket();
      expect(result.synced).toBe(false);

      for (const call of global.fetch.mock.calls) {
        const url = typeof call[0] === 'string' ? call[0] : call[0]?.url || '';
        expect(url).not.toContain('api.sympla.com.br');
      }
    });
  });

  describe('unlinkUserSymplaTicket & clearCachedSymplaTicket', () => {
    it('retorna unauthenticated se usuário não estiver logado', async () => {
      const result = await unlinkUserSymplaTicket();
      expect(result).toEqual({ status: 'unauthenticated', unlinked: false });
    });

    it('chama POST /sympla/unlink-ticket e limpa o cache ao desvincular com sucesso', async () => {
      auth.currentUser = {
        uid: 'user-unlink-1',
        email: 'desvincular@ufu.br',
        getIdToken: vi.fn().mockResolvedValue('token-jwt-unlink')
      };

      setCachedSymplaTicket('desvincular@ufu.br', 'user-unlink-1', {
        ticketNumber: 'TK-1234'
      });
      expect(getCachedSymplaTicket('desvincular@ufu.br', 'user-unlink-1')).not.toBeNull();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', unlinked: true })
      });

      const result = await unlinkUserSymplaTicket();
      expect(result.unlinked).toBe(true);
      expect(result.status).toBe('success');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sympla/unlink-ticket'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-jwt-unlink'
          }),
          body: JSON.stringify({ uid: 'user-unlink-1' })
        })
      );

      // Cache em memória e localStorage limpos
      expect(getCachedSymplaTicket('desvincular@ufu.br', 'user-unlink-1')).toBeNull();
    });

    it('retorna status de erro caso o backend retorne falha ao desvincular', async () => {
      auth.currentUser = {
        uid: 'user-unlink-err',
        email: 'erro@ufu.br',
        getIdToken: vi.fn().mockResolvedValue('token-jwt-unlink')
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Erro no banco de dados' })
      });

      const result = await unlinkUserSymplaTicket();
      expect(result.unlinked).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toBe('Erro no banco de dados');
    });
  });
});

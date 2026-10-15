// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { doc, onSnapshot } from 'firebase/firestore';

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: { uid: 'user_test_1' } },
  db: { _type: 'mock_firestore_db' }
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, col, id) => ({ col, id })),
  onSnapshot: vi.fn(() => vi.fn())
}));

import PassportTab, {
  SPONSORS_CONFIG,
  checkPrizeEligibility,
  checkGoldenTicketEligibility,
  getPassportProgress,
  formatVisitDate
} from '../../src/components/PassportTab';

describe('Configuração e Regras do Passaporte TechWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSnapshot.mockImplementation(() => vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it('contém exatamente as 5 empresas cadastradas com hierarquia correta', () => {
    const keys = Object.keys(SPONSORS_CONFIG);
    expect(keys).toEqual(['kanastra', 'bayer', 'aimirim', 'bip', 'hyperflow']);

    // Kanastra: Diamante e Obrigatório
    expect(SPONSORS_CONFIG.kanastra.tier).toBe('DIAMOND');
    expect(SPONSORS_CONFIG.kanastra.required).toBe(true);

    // Bayer: Ouro e Obrigatório
    expect(SPONSORS_CONFIG.bayer.tier).toBe('GOLD');
    expect(SPONSORS_CONFIG.bayer.required).toBe(true);

    // Aimirim, Bip, HyperFlow: Prata
    expect(SPONSORS_CONFIG.aimirim.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.aimirim.required).toBe(false);

    expect(SPONSORS_CONFIG.bip.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.bip.required).toBe(false);

    expect(SPONSORS_CONFIG.hyperflow.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.hyperflow.required).toBe(false);
  });

  it('valida regra real de elegibilidade (checkPrizeEligibility): Kanastra + Bayer + pelo menos 1 parceira', () => {
    // Apenas Kanastra e Bayer: ainda não elegível
    expect(checkPrizeEligibility({ kanastra: true, bayer: true })).toBe(false);

    // Kanastra + Bayer + 1 parceira: elegível!
    expect(checkPrizeEligibility({ kanastra: true, bayer: true, aimirim: true })).toBe(true);

    // Todas as 5: elegível
    expect(checkPrizeEligibility({ kanastra: true, bayer: true, aimirim: true, bip: true, hyperflow: true })).toBe(true);

    // Faltando Kanastra: não elegível
    expect(checkPrizeEligibility({ bayer: true, aimirim: true, bip: true })).toBe(false);

    // Faltando Bayer: não elegível
    expect(checkPrizeEligibility({ kanastra: true, aimirim: true, bip: true })).toBe(false);
  });

  it('valida critério real do Bilhete Dourado (checkGoldenTicketEligibility e getPassportProgress)', () => {
    expect(checkGoldenTicketEligibility({ kanastra: true, bayer: true, aimirim: true, bip: true })).toBe(false);
    expect(checkGoldenTicketEligibility({ kanastra: true, bayer: true, aimirim: true, bip: true, hyperflow: true })).toBe(true);
    expect(checkGoldenTicketEligibility({ kanastra: true }, true)).toBe(true);

    const progress = getPassportProgress({ kanastra: true });
    expect(progress).toEqual({
      kanastraVisited: true,
      bayerVisited: false,
      partnerCount: 0,
      totalVisited: 1,
      isEligibleForPrizes: false,
      isFullPassport: false,
      missingForDraw: ['Bayer', '1 prata']
    });
  });

  it('formata data de visita corretamente via formatVisitDate (Timestamp Firestore, ISO string e fallback)', () => {
    expect(formatVisitDate(null)).toBe('Visitado');
    expect(formatVisitDate('invalid-date')).toBe('Visitado');
    expect(formatVisitDate('2026-10-14T15:00:00Z')).toBe('Visitado · 14 out');
    expect(formatVisitDate({ toDate: () => new Date(2026, 9, 15, 12, 0, 0) })).toBe('Visitado · 15 out');
  });

  describe('Renderização e Ciclo de Vida do Componente PassportTab (ERR-037)', () => {
    it('renderiza estado inicial (0/5 estandes visitados) com pendências para sorteio e Bilhete Dourado', () => {
      const { container } = render(
        React.createElement(PassportTab, {
          userProfile: { uid: 'u-0', visitedSponsors: {} }
        })
      );

      expect(container.textContent).toContain('0/5');
      expect(container.textContent).toContain('estandes visitados');
      expect(container.textContent).toContain('Para os sorteios, falta: Kanastra · Bayer · 1 prata');
      expect(container.textContent).toContain('Bilhete Dourado: faltam 5 · +100');
      expect(container.textContent).toContain('Kanastra');
      expect(container.textContent).toContain('Bayer');
      expect(container.textContent).toContain('Aimirim');
      expect(container.textContent).toContain('Bip Consulting');
      expect(container.textContent).toContain('HyperFlow');
      expect(container.textContent).toContain('Ainda não visitado · +50 pts');
    });

    it('renderiza estado parcial elegível aos sorteios (Kanastra + Bayer + 1 prata visitadas)', () => {
      const { container } = render(
        React.createElement(PassportTab, {
          userProfile: {
            uid: 'u-partial',
            visitedSponsors: {
              kanastra: { visitedAt: '2026-10-14T14:00:00Z' },
              bayer: { visitedAt: '2026-10-14T15:00:00Z' },
              aimirim: { visitedAt: '2026-10-14T16:00:00Z' }
            }
          }
        })
      );

      expect(container.textContent).toContain('3/5');
      expect(container.textContent).toContain('Concorrendo aos sorteios');
      expect(container.textContent).toContain('Bilhete Dourado: faltam 2 · +100');
      expect(container.textContent).toContain('Visitado · 14 out');
    });

    it('renderiza passaporte completo (5/5) com Bilhete Dourado garantido', () => {
      const { container } = render(
        React.createElement(PassportTab, {
          userProfile: {
            uid: 'u-full',
            visitedSponsors: {
              kanastra: { visitedAt: '2026-10-14T12:00:00Z' },
              bayer: { visitedAt: '2026-10-14T12:30:00Z' },
              aimirim: { visitedAt: '2026-10-14T13:00:00Z' },
              bip: { visitedAt: '2026-10-14T13:30:00Z' },
              hyperflow: { visitedAt: '2026-10-14T14:00:00Z' }
            }
          }
        })
      );

      expect(container.textContent).toContain('5/5');
      expect(container.textContent).toContain('Concorrendo aos sorteios');
      expect(container.textContent).toContain('Bilhete Dourado: garantido · +100');
    });

    it('atualiza carimbos em tempo real via onSnapshot do Firestore e aplica fallbackLogo em erro de imagem', () => {
      let snapshotHandler;
      const unsubSpy = vi.fn();
      onSnapshot.mockImplementation((_docRef, cb) => {
        snapshotHandler = cb;
        return unsubSpy;
      });

      const { container, unmount } = render(
        React.createElement(PassportTab, {
          userProfile: { uid: 'u-live', visitedSponsors: {} }
        })
      );

      expect(doc).toHaveBeenCalledWith({ _type: 'mock_firestore_db' }, 'users', 'user_test_1');
      expect(container.textContent).toContain('0/5');

      act(() => {
        snapshotHandler({
          id: 'user_test_1',
          exists: () => true,
          data: () => ({
            visitedSponsors: {
              kanastra: { visitedAt: '2026-10-14T18:00:00Z' },
              bayer: { visitedAt: '2026-10-14T18:05:00Z' },
              bip: { visitedAt: '2026-10-14T18:10:00Z' }
            },
            goldenTicketAwarded: true
          })
        });
      });

      expect(container.textContent).toContain('3/5');
      expect(container.textContent).toContain('Concorrendo aos sorteios');
      expect(container.textContent).toContain('Bilhete Dourado: garantido · +100');

      // Verifica troca para fallbackLogo no onError do logo da Aimirim
      const aimirimImg = Array.from(container.querySelectorAll('img')).find((img) =>
        img.getAttribute('src')?.includes('aimirim-logo.png')
      );
      expect(aimirimImg).toBeTruthy();
      fireEvent.error(aimirimImg);
      expect(aimirimImg.getAttribute('src')).toBe(SPONSORS_CONFIG.aimirim.fallbackLogo);

      unmount();
      expect(unsubSpy).toHaveBeenCalledTimes(1);
    });
  });
});

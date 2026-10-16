// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ActivityRow, TYPE_FILTERS } from '../../src/pages/Agenda';
import SymplaStickyBanner from '../../src/components/SymplaStickyBanner';

const mockUseUser = vi.fn();
vi.mock('../../src/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

describe('Open Event & Agenda Conversion (PLG)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('TYPE_FILTERS', () => {
    it('inclui filtro rapido de Entrada Livre', () => {
      const openFilter = TYPE_FILTERS.find((f) => f.id === 'open_event');
      expect(openFilter).toBeDefined();
      expect(openFilter.label).toContain('Entrada Livre');
    });
  });

  describe('SymplaStickyBanner', () => {
    it('renderiza proposta de valor do Modo Entrada Livre quando usuario nao tem Sympla', () => {
      mockUseUser.mockReturnValue({
        hasSymplaTicket: false,
        profile: { uid: 'u1', name: 'Participante' },
      });

      render(React.createElement(SymplaStickyBanner));

      expect(screen.getByText(/Modo Entrada Livre/i)).toBeDefined();
      expect(screen.getByText(/Desbloquear/i)).toBeDefined();
    });

    it('nao renderiza banner quando usuario ja possui ingresso Sympla', () => {
      mockUseUser.mockReturnValue({
        hasSymplaTicket: true,
        profile: { uid: 'u1', name: 'Participante VIP' },
      });

      const { container } = render(React.createElement(SymplaStickyBanner));
      expect(container.innerHTML).toBe('');
    });
  });

  describe('ActivityRow', () => {
    const baseActivity = {
      id: 'act-1',
      title: 'Workshop de Arquitetura de Software',
      type: 'workshop',
      day: '21/10',
      time: '14:00',
      speaker: 'Especialista Convidado',
      location: 'Auditório 1',
      vagas_disponiveis: 12,
      vagas_totais: 50,
      isOpenEvent: false,
    };

    it('renderiza card bloqueado com Passaporte Completo, vagas a esquerda e botao Desbloquear a direita', () => {
      render(
        React.createElement(ActivityRow, {
          act: baseActivity,
          status: 'NONE',
          timing: 'UPCOMING',
          compact: false,
          hasTicket: false,
          onOpen: vi.fn(),
          onPresence: null,
        })
      );

      // Badge no topo
      expect(screen.getByText(/Passaporte Completo/i)).toBeDefined();

      // Semáforo de vagas à esquerda (12 de 50 vagas = últimas 12)
      expect(screen.getByText(/Últimas 12/i)).toBeDefined();

      // Botão pill compacto de desbloqueio à direita
      expect(screen.getByText(/Desbloquear/i)).toBeDefined();
    });

    it('renderiza card liberado para atividade aberta mesmo sem ingresso Sympla', () => {
      const openActivity = {
        ...baseActivity,
        id: 'act-open',
        isOpenEvent: true,
      };

      render(
        React.createElement(ActivityRow, {
          act: openActivity,
          status: 'NONE',
          timing: 'UPCOMING',
          compact: false,
          hasTicket: false,
          onOpen: vi.fn(),
          onPresence: null,
        })
      );

      // Badge Entrada Livre
      expect(screen.getByText(/Entrada Livre/i)).toBeDefined();

      // Ação de reservar disponível
      expect(screen.getByText(/Reservar vaga/i)).toBeDefined();
      expect(screen.queryByText(/Desbloquear/i)).toBeNull();
    });

    it('renderiza acao normal de reservar para usuario com Passaporte completo', () => {
      render(
        React.createElement(ActivityRow, {
          act: baseActivity,
          status: 'NONE',
          timing: 'UPCOMING',
          compact: false,
          hasTicket: true,
          onOpen: vi.fn(),
          onPresence: null,
        })
      );

      expect(screen.getByText(/Reservar vaga/i)).toBeDefined();
      expect(screen.queryByText(/Desbloquear/i)).toBeNull();
    });
  });
});

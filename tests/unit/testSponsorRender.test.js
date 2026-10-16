// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseUser = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

vi.mock('../../src/lib/auth', () => ({
  logoutUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/activityService', () => ({
  subscribeToActivities: vi.fn(() => () => {}),
  DEFAULT_ACTIVITIES: [],
}));

vi.mock('../../src/lib/feedService', () => ({
  subscribeToFeedPosts: vi.fn(() => () => {}),
  createFeedPost: vi.fn(),
  toggleLikeFeedPost: vi.fn(),
  uploadFeedMedia: vi.fn(),
  DEFAULT_FEED_POSTS: [],
}));

vi.mock('../../src/lib/ticketService', () => ({
  getTickets: vi.fn(() => []),
  createTicket: vi.fn().mockResolvedValue({ id: 'ticket-1' }),
  addTicketNote: vi.fn(),
  updateTicketStatus: vi.fn(),
  TICKETS_UPDATED_EVENT: 'facom_tickets_updated',
  subscribeToTickets: vi.fn((_opts, cb) => {
    if (typeof cb === 'function') cb([]);
    return () => {};
  }),
  createSupportTicket: vi.fn().mockResolvedValue({ id: 'ticket-1' }),
}));

vi.mock('../../src/lib/sponsorService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchLeads: vi.fn().mockResolvedValue({
      myLeads: [actual.SEED_BIPADO_LEAD],
      companyLeads: [actual.SEED_BIPADO_LEAD],
    }),
    resolveParticipantFromQr: vi.fn(),
    submitLead: vi.fn(),
    updateLead: vi.fn(),
  };
});

vi.mock('../../src/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import Sponsor from '../../src/pages/Sponsor';

describe('Render Sponsor page with SPONSOR role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseUser.mockReturnValue({
      profile: {
        role: 'SPONSOR',
        companyId: 'kanastra',
        companyName: 'Kanastra',
        tier: 'DIAMOND',
        name: 'Recrutador Kanastra',
      },
      role: 'SPONSOR',
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'test-sponsor-uid',
        email: 'recrutador@kanastra.com.br',
        role: 'SPONSOR',
      },
      loading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sponsor shell on home tab without throwing', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor'] },
        React.createElement(Sponsor)
      )
    );
    expect(html).toContain('sponsor-shell');
    expect(html).toContain('Kanastra');
    expect(html).toContain('Escanear crachá');
  });

  it('renders settings tab cleanly without throwing', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor?tab=settings'] },
        React.createElement(Sponsor)
      )
    );
    expect(html).toContain('sponsor-shell');
  });

  it('navega interativamente entre as abas de Leads (CRM), Relatório Executivo (ROI) e Configurações (ERR-049)', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor'] },
        React.createElement(Sponsor)
      )
    );

    expect(screen.getByText('Visão geral do estande')).toBeDefined();

    // Navega para Leads do estande (CRM)
    fireEvent.click(screen.getByRole('button', { name: /leads do estande/i }));
    expect(screen.getByText('CRM de talentos do estande')).toBeDefined();
    expect(screen.getAllByText('Mariana Souza').length).toBeGreaterThanOrEqual(1);

    // Navega para Relatório executivo (ROI)
    fireEvent.click(screen.getByRole('button', { name: /relatório executivo/i }));
    expect(screen.getByText('Relatório executivo de ROI')).toBeDefined();
    expect(screen.getAllByText(/Performance • Kanastra/i).length).toBeGreaterThanOrEqual(1);

    // Navega para Configurações
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(screen.getByText('Configurações do estande')).toBeDefined();
    expect(screen.getByText('Personalização do Estande')).toBeDefined();
  });

  it('abre o modal de Chamados e Suporte Técnico ao clicar em "Chamados e suporte" (ERR-049)', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor'] },
        React.createElement(Sponsor)
      )
    );

    const sosBtn = screen.getByRole('button', { name: /chamados e suporte/i });
    fireEvent.click(sosBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('bloqueia acesso e renderiza tela de Acesso Restrito quando o usuário não possui perfil SPONSOR ou ADMIN (ERR-049)', () => {
    mockUseUser.mockReturnValue({
      profile: {
        role: 'PARTICIPANT',
        name: 'Aluno Participante',
      },
      role: 'PARTICIPANT',
      loading: false,
    });
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'participant-uid',
        email: 'aluno@ufu.br',
        role: 'PARTICIPANT',
      },
      loading: false,
    });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor'] },
        React.createElement(Sponsor)
      )
    );

    expect(screen.getByText('Acesso Restrito: Portal Patrocinador')).toBeDefined();
    expect(screen.getByRole('button', { name: /voltar para o início/i })).toBeDefined();
  });
});


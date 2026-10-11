import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/hooks/useUser', () => ({
  useUser: () => ({
    profile: {
      role: 'SPONSOR',
      companyId: 'kanastra',
      companyName: 'Kanastra',
      tier: 'DIAMOND',
      name: 'Recrutador Kanastra'
    },
    role: 'SPONSOR',
    loading: false
  })
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-sponsor-uid',
      email: 'recrutador@kanastra.com.br',
      role: 'SPONSOR'
    },
    loading: false
  })
}));

describe('Render Sponsor page with SPONSOR role', () => {
  it('renders sponsor shell on home tab without throwing', async () => {
    const Sponsor = (await import('../../src/pages/Sponsor')).default;
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor'] },
        React.createElement(Sponsor)
      )
    );
    expect(html).toContain('sponsor-shell');
    expect(html).toContain('Kanastra');
    expect(html).toContain('Escanear Crachá');
  });

  it('renders settings tab cleanly without throwing', async () => {
    const Sponsor = (await import('../../src/pages/Sponsor')).default;
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sponsor?tab=settings'] },
        React.createElement(Sponsor)
      )
    );
    expect(html).toContain('sponsor-shell');
  });
});

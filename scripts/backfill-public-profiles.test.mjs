import { describe, it, expect } from 'vitest';
import { buildPublicProfileDoc } from './backfill-public-profiles.mjs';

describe('backfill-public-profiles (KAN-137)', () => {
  it('extrai dados públicos e omite estritamente campos sensíveis (email, phone, termsAcceptedAt)', () => {
    const rawUser = {
      uid: 'u-123',
      email: 'segredo@ufu.br',
      phone: '34999998888',
      termsAcceptedAt: '2026-09-20T00:00:00Z',
      symplaTicket: { ticketNumber: 'TK-123' },
      companyId: 'empresa-x',
      ticketId: 'TK-123',
      firstName: 'Mariana',
      lastName: 'Silva',
      username: '@mariana_s',
      course: 'Sistemas de Informação',
      period: 5,
      totalPoints: 150,
      pontuacaoTotal: 150,
      avatarUrl: 'https://example.com/foto.png',
      role: 'PARTICIPANT'
    };

    const result = buildPublicProfileDoc(rawUser, 'u-123');

    expect(result).toEqual({
      uid: 'u-123',
      role: 'PARTICIPANT',
      firstName: 'Mariana',
      lastName: 'Silva',
      displayName: 'Mariana Silva',
      username: 'mariana_s',
      course: 'Sistemas de Informação',
      period: 5,
      totalPoints: 150,
      pontuacaoTotal: 150,
      avatarUrl: 'https://example.com/foto.png'
    });

    // Invariantes estritas de privacidade LGPD
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.termsAcceptedAt).toBeUndefined();
    expect(result.symplaTicket).toBeUndefined();
    expect(result.companyId).toBeUndefined();
    expect(result.ticketId).toBeUndefined();
  });
});

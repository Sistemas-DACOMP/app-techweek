import { describe, it, expect } from 'vitest';
import { inviteErrorCode, inviteErrorMessage, isRetryableAccept, splitEmails } from './sponsorInviteService';

describe('sponsorInviteService', () => {
  it('mapeia codigo do corpo e status HTTP', () => {
    expect(inviteErrorCode({ status: 409, data: { error: 'TEAM_FULL' } })).toBe('TEAM_FULL');
    expect(inviteErrorCode({ status: 410, data: {} })).toBe('INVITE_EXPIRED');
    expect(inviteErrorCode({ status: 404, data: {} })).toBe('INVITE_INVALID');
    expect(inviteErrorCode({ status: 400, data: { error: 'X' } })).toBeNull();
  });

  it('mensagem de rede quando nao ha status', () => {
    expect(inviteErrorMessage(new Error('x'))).toMatch(/conexão/);
  });

  it('retry so para rede, 5xx e ROLE_PARTIALLY_UPDATED', () => {
    expect(isRetryableAccept({ status: 500, data: { error: 'ROLE_PARTIALLY_UPDATED' } })).toBe(true);
    expect(isRetryableAccept(new Error('offline'))).toBe(true);
    expect(isRetryableAccept({ status: 409, data: { error: 'TEAM_FULL' } })).toBe(false);
  });

  it('splitEmails normaliza e remove duplicados', () => {
    expect(splitEmails('A@x.com, b@x.com;a@x.com  c@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });
});

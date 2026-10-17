import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({
  apiRequest: vi.fn()
}));

import {
  inviteErrorCode,
  inviteErrorMessage,
  isRetryableAccept,
  splitEmails,
  getInvite,
  acceptInvite,
  listSponsors,
  createSponsor,
  updateSponsor,
  addSponsorInvites,
  resendSponsorInvite,
  revokeSponsorInvite,
  getSponsorTeam,
  createSponsorTeamInvites,
  removeSponsorTeamMember,
  revokeSponsorTeamInvite,
  resendSponsorTeamInvite,
} from './sponsorInviteService';
import { apiRequest } from './api';

describe('sponsorInviteService', () => {
  it('mapeia codigo do corpo e status HTTP', () => {
    expect(inviteErrorCode({ status: 409, data: { error: 'TEAM_FULL' } })).toBe('TEAM_FULL');
    expect(inviteErrorCode({ status: 400, data: { error: 'CANNOT_REMOVE_SELF' } })).toBe('CANNOT_REMOVE_SELF');
    expect(inviteErrorCode({ status: 404, data: { error: 'MEMBER_NOT_FOUND' } })).toBe('MEMBER_NOT_FOUND');
    expect(inviteErrorCode({ status: 404, data: { error: 'SPONSOR_NOT_FOUND' } })).toBe('SPONSOR_NOT_FOUND');
    expect(inviteErrorCode({ status: 400, data: { error: 'SPONSOR_DOMAIN_REQUIRED_FOR_LINK' } })).toBe('SPONSOR_DOMAIN_REQUIRED_FOR_LINK');
    expect(inviteErrorCode({ status: 409, data: { error: 'INVITE_ALREADY_ACCEPTED' } })).toBe('INVITE_ALREADY_ACCEPTED');
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

describe('sponsorInviteService - Operações de API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getInvite deve chamar apiRequest com rota codificada', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'inv-1', company: 'Tech Corp' });
    const result = await getInvite('token 123');

    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor-invites/token%20123');
    expect(result).toEqual({ id: 'inv-1', company: 'Tech Corp' });
  });

  it('acceptInvite deve chamar apiRequest com POST e body serializado', async () => {
    apiRequest.mockResolvedValueOnce({ success: true });
    const payload = { name: 'Erick', termsAccepted: true };
    const result = await acceptInvite('token123', payload);

    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor-invites/token123/accept', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    expect(result).toEqual({ success: true });
  });

  it('listSponsors deve chamar rota GET de admin', async () => {
    apiRequest.mockResolvedValueOnce([{ id: 'sp-1', name: 'Empresa A' }]);
    const result = await listSponsors();

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsors');
    expect(result).toEqual([{ id: 'sp-1', name: 'Empresa A' }]);
  });

  it('createSponsor deve chamar rota POST com body serializado', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'sp-2', name: 'Nova Empresa' });
    const body = { name: 'Nova Empresa', tier: 'gold' };
    const result = await createSponsor(body);

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsors', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    expect(result).toEqual({ id: 'sp-2', name: 'Nova Empresa' });
  });

  it('updateSponsor deve chamar rota PATCH com id codificado e body serializado', async () => {
    apiRequest.mockResolvedValueOnce({ id: 'sp-1', name: 'Empresa Atualizada' });
    const body = { name: 'Empresa Atualizada' };
    const result = await updateSponsor('sp 1', body);

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsors/sp%201', {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    expect(result).toEqual({ id: 'sp-1', name: 'Empresa Atualizada' });
  });

  it('addSponsorInvites deve chamar rota POST com emails envolvidos', async () => {
    apiRequest.mockResolvedValueOnce({ created: 2 });
    const emails = ['a@x.com', 'b@x.com'];
    const result = await addSponsorInvites('sp-1', emails);

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsors/sp-1/invites', {
      method: 'POST',
      body: JSON.stringify({ emails })
    });
    expect(result).toEqual({ created: 2 });
  });

  it('resendSponsorInvite deve chamar rota POST de reenvio com inviteId codificado', async () => {
    apiRequest.mockResolvedValueOnce({ resent: true });
    const result = await resendSponsorInvite('inv 123');

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsor-invites/inv%20123/resend', {
      method: 'POST'
    });
    expect(result).toEqual({ resent: true });
  });

  it('revokeSponsorInvite deve chamar rota DELETE com inviteId codificado', async () => {
    apiRequest.mockResolvedValueOnce({ revoked: true });
    const result = await revokeSponsorInvite('inv 123');

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/sponsor-invites/inv%20123', {
      method: 'DELETE'
    });
    expect(result).toEqual({ revoked: true });
  });

  it('getSponsorTeam deve chamar rota GET de equipe com ou sem sponsorId', async () => {
    apiRequest.mockResolvedValueOnce({ members: [] });
    const res1 = await getSponsorTeam();
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team');
    expect(res1).toEqual({ members: [] });

    apiRequest.mockResolvedValueOnce({ members: [{ uid: 'u1' }] });
    const res2 = await getSponsorTeam('sp-kanastra');
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team?sponsorId=sp-kanastra');
    expect(res2).toEqual({ members: [{ uid: 'u1' }] });
  });

  it('createSponsorTeamInvites deve enviar payload de emails ou link genérico', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, invites: [{ inviteId: 'i-1' }] });
    const res1 = await createSponsorTeamInvites({ emails: 'dev@empresa.com, lead@empresa.com', sponsorId: 'sp-1' });
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team/invites?sponsorId=sp-1', {
      method: 'POST',
      body: JSON.stringify({ emails: ['dev@empresa.com', 'lead@empresa.com'] })
    });
    expect(res1.success).toBe(true);

    apiRequest.mockResolvedValueOnce({ success: true, invites: [{ inviteId: 'i-link' }] });
    const res2 = await createSponsorTeamInvites();
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team/invites', {
      method: 'POST',
      body: JSON.stringify({})
    });
    expect(res2.success).toBe(true);
  });

  it('removeSponsorTeamMember deve chamar rota DELETE com memberUid', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, removedUid: 'user-99' });
    const result = await removeSponsorTeamMember('user-99', 'sp-1');
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team/members/user-99?sponsorId=sp-1', {
      method: 'DELETE'
    });
    expect(result).toEqual({ success: true, removedUid: 'user-99' });
  });

  it('revokeSponsorTeamInvite deve chamar rota DELETE com inviteId', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, inviteId: 'inv-42' });
    const result = await revokeSponsorTeamInvite('inv-42');
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team/invites/inv-42', {
      method: 'DELETE'
    });
    expect(result).toEqual({ success: true, inviteId: 'inv-42' });
  });

  it('resendSponsorTeamInvite deve chamar rota POST de reenvio', async () => {
    apiRequest.mockResolvedValueOnce({ inviteId: 'new-inv', token: 'tok' });
    const result = await resendSponsorTeamInvite('inv-42', 'sp-1');
    expect(apiRequest).toHaveBeenCalledWith('/api/sponsor/team/invites/inv-42/resend?sponsorId=sp-1', {
      method: 'POST'
    });
    expect(result).toEqual({ inviteId: 'new-inv', token: 'tok' });
  });

  it('deve propagar rejeição de apiRequest em falha na requisição', async () => {
    const error = new Error('Falha de rede');
    apiRequest.mockRejectedValueOnce(error);

    await expect(getInvite('token123')).rejects.toThrow('Falha de rede');
  });
});


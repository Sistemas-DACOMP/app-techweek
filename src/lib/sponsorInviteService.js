import { apiRequest } from './api';

/* Único ponto de contato da UI com o backend de convites de patrocinador (KAN-124).
   Se o contrato mudar, só este arquivo muda. Erros do backend: { error: CODIGO, message }. */

export const INVITE_ERROR_MESSAGES = {
  TERMS_NOT_ACCEPTED: 'Aceite o termo de uso dos dados para criar a conta.',
  INVALID_PAYLOAD: 'Algum dado não foi aceito. Confira os campos e tente de novo.',
  EMAIL_DOMAIN_NOT_ALLOWED: 'Esse convite só vale para e-mails do domínio da empresa.',
  EMAIL_MISMATCH: 'Esse convite foi enviado para outro e-mail. Use o e-mail que recebeu o convite.',
  INVITE_INVALID: 'Esse convite não existe ou já foi usado. Confira o link ou peça um novo à organização.',
  INVITE_EXPIRED: 'Esse convite expirou.',
  TEAM_FULL: 'A equipe dessa empresa já está completa. Fale com a organização para ampliar o limite.',
  ALREADY_REGISTERED: 'Esse e-mail já tem uma conta de patrocinador. Entre com ele.',
  ROLE_PARTIALLY_UPDATED: 'Sua conta foi criada, mas a permissão de patrocinador não terminou de ser aplicada.',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de aceitar o convite. Enviamos uma mensagem de confirmação; abra o link e toque em tentar de novo.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um momento e tente de novo.',
  TEAM_LIMIT_BELOW_MEMBERS: 'O limite não pode ser menor que o número de pessoas que já estão na equipe.',
  CANNOT_REMOVE_SELF: 'Você não pode remover a si mesmo da equipe para evitar perda acidental de acesso.',
  MEMBER_NOT_FOUND: 'Membro não encontrado nesta equipe.',
  SPONSOR_NOT_FOUND: 'Patrocinador não encontrado.',
  SPONSOR_DOMAIN_REQUIRED_FOR_LINK: 'Para gerar um link de convite rápido, informe e-mails nominais ou configure o domínio permitido da empresa.',
  INVITE_ALREADY_ACCEPTED: 'Este convite já foi aceito e não pode ser alterado.',
};

// Erros em que a conta recém-criada fica válida e vale tentar o accept de novo (sem recriar a conta).
export const RETRYABLE_CODES = ['ROLE_PARTIALLY_UPDATED', 'EMAIL_NOT_VERIFIED', 'RATE_LIMITED'];

export function inviteErrorCode(err) {
  const fromBody = err?.data?.error;
  if (typeof fromBody === 'string' && INVITE_ERROR_MESSAGES[fromBody]) return fromBody;
  if (err?.status === 404) return 'INVITE_INVALID';
  if (err?.status === 410) return 'INVITE_EXPIRED';
  return null;
}

export function inviteErrorMessage(err) {
  const code = inviteErrorCode(err);
  if (code) return INVITE_ERROR_MESSAGES[code];
  if (err?.status >= 500 || !err?.status) return 'Não conseguimos falar com o servidor. Verifique a conexão e tente de novo.';
  return err?.data?.message || 'Não foi possível concluir. Tente novamente.';
}

// Aceita retry sem recriar conta: falha de rede/5xx ou código marcado como retryable.
export function isRetryableAccept(err) {
  const code = inviteErrorCode(err);
  if (code) return RETRYABLE_CODES.includes(code);
  return !err?.status || err.status >= 500;
}

/* Separa texto colado ("a@x.com, b@x.com;c@x.com") em e-mails únicos, minúsculos. */
export function splitEmails(text) {
  return [...new Set(String(text || '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

const withQuery = (path, params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
};

/* ---------- Público ---------- */
export const getInvite = (token) => apiRequest(`/api/sponsor-invites/${encodeURIComponent(token)}`);

export const acceptInvite = (token, body) =>
  apiRequest(`/api/sponsor-invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body: JSON.stringify(body) });

/* ---------- Admin ---------- */
export const listSponsors = () => apiRequest('/api/admin/sponsors');
export const createSponsor = (body) => apiRequest('/api/admin/sponsors', { method: 'POST', body: JSON.stringify(body) });
export const updateSponsor = (id, body) => apiRequest(`/api/admin/sponsors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
export const addSponsorInvites = (id, emails) =>
  apiRequest(`/api/admin/sponsors/${encodeURIComponent(id)}/invites`, { method: 'POST', body: JSON.stringify({ emails }) });
export const resendSponsorInvite = (inviteId) =>
  apiRequest(`/api/admin/sponsor-invites/${encodeURIComponent(inviteId)}/resend`, { method: 'POST' });
export const revokeSponsorInvite = (inviteId) =>
  apiRequest(`/api/admin/sponsor-invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });

/* ---------- Equipe do Patrocinador (KAN-124 / SPONSOR & ADMIN) ---------- */
export const getSponsorTeam = (sponsorId) =>
  apiRequest(withQuery('/api/sponsor/team', { sponsorId }));

export const createSponsorTeamInvites = ({ emails, sponsorId } = {}) => {
  let list = [];
  if (Array.isArray(emails)) {
    list = emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  } else if (typeof emails === 'string') {
    list = splitEmails(emails);
  }
  const body = emails !== undefined && emails !== null ? { emails: list } : {};
  return apiRequest(withQuery('/api/sponsor/team/invites', { sponsorId }), {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const removeSponsorTeamMember = (memberUid, sponsorId) =>
  apiRequest(withQuery(`/api/sponsor/team/members/${encodeURIComponent(memberUid)}`, { sponsorId }), {
    method: 'DELETE'
  });

export const revokeSponsorTeamInvite = (inviteId, sponsorId) =>
  apiRequest(withQuery(`/api/sponsor/team/invites/${encodeURIComponent(inviteId)}`, { sponsorId }), {
    method: 'DELETE'
  });

export const resendSponsorTeamInvite = (inviteId, sponsorId) =>
  apiRequest(withQuery(`/api/sponsor/team/invites/${encodeURIComponent(inviteId)}/resend`, { sponsorId }), {
    method: 'POST'
  });

import { describe, it, expect, vi, beforeEach } from 'vitest';

// supabase.auth.signUp e mockado - estes sao testes unitarios da funcao
// de normalizacao de resultado, nao testes de integracao com o Supabase
// de verdade (isso fica em tests/integration).
vi.mock('./supabaseClient', () => ({
  supabase: { auth: { signUp: vi.fn() } },
}));

import { supabase } from './supabaseClient';
import { signUpWithEmail, AUTH_MESSAGES } from './auth';

const CREDENTIALS = { email: 'pessoa@example.com', password: 'senha123', metadata: { first_name: 'Pessoa' } };

beforeEach(() => {
  vi.clearAllMocks();
});

// REG-C4 (KAN-15 / SPEC.md D2): cadastro novo com sessao real criada.
describe('signUpWithEmail - status signed_in', () => {
  it('retorna signed_in quando o Supabase cria sessao (confirmacao de e-mail desativada)', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('signed_in');
    expect(result.message).toBeNull();
  });
});

// REG-C4 (KAN-15 / SPEC.md D2): anti-enumeracao de conta. O Supabase
// devolve a MESMA resposta (sem erro, sem sessao) tanto pra conta nova
// aguardando confirmacao quanto pra e-mail ja cadastrado nao confirmado
// - a funcao NAO pode diferenciar os dois casos, sob risco de vazar se
// um e-mail ja tem conta.
describe('signUpWithEmail - status needs_email_confirmation (anti-enumeracao)', () => {
  it('conta nova aguardando confirmacao de e-mail', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('needs_email_confirmation');
    expect(result.message).toBe(AUTH_MESSAGES.needs_email_confirmation);
  });

  it('e-mail ja cadastrado e nao confirmado - mesma resposta da conta nova, mesma mensagem', async () => {
    // O Supabase reenvia confirmacao e devolve o usuario antigo, sem erro.
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u-existente' }, session: null },
      error: null,
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('needs_email_confirmation');
    expect(result.message).toBe(AUTH_MESSAGES.needs_email_confirmation);
  });
});

// REG-C5 (KAN-15 / SPEC.md D2): rate limit de envio de e-mail.
describe('signUpWithEmail - status rate_limited', () => {
  it('mapeia error.status 429 para rate_limited', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 429, code: 'some_other_code', message: 'too many requests' },
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('rate_limited');
    expect(result.message).toBe(AUTH_MESSAGES.rate_limited);
  });

  it('mapeia error.code over_email_send_rate_limit para rate_limited mesmo sem status 429', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('rate_limited');
    expect(result.message).toBe(AUTH_MESSAGES.rate_limited);
  });
});

// Regressao do bug reportado em KAN-27: um erro de senha fraca (que nao e
// rate limit) precisa continuar caindo em "error" com mensagem generica -
// nunca deve ser confundido com rate_limited so por acontecer depois de
// tentativas repetidas.
describe('signUpWithEmail - status error (nao deve virar rate_limited)', () => {
  it('mapeia weak_password para error, com mensagem generica, nao rate_limited', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 422,
        code: 'weak_password',
        message: 'Password should be at least 6 characters.',
      },
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('error');
    expect(result.message).toBe(AUTH_MESSAGES.error);
  });

  it('mapeia qualquer outro erro desconhecido para error generico', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { status: 500, code: 'unexpected', message: 'boom' },
    });

    const result = await signUpWithEmail(CREDENTIALS);

    expect(result.status).toBe('error');
    expect(result.message).toBe(AUTH_MESSAGES.error);
  });
});

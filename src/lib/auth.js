import { supabase } from './supabaseClient';

export const AUTH_MESSAGES = {
  rate_limited:
    'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.',
  needs_email_confirmation:
    'Cadastro quase pronto! Confirme seu e-mail antes de fazer login.',
  error:
    'Não foi possível concluir o cadastro. Tente novamente em instantes.',
};

// Chama supabase.auth.signUp e devolve um resultado normalizado:
// { status: 'signed_in' | 'needs_email_confirmation' | 'rate_limited' | 'error',
//   message: string | null,  // já traduzido/amigável; null quando status === 'signed_in'
//   data, error }            // resposta crua do Supabase, para quem precisar
//
// Sem sessão + sem erro cobre tanto "conta nova aguardando confirmação" quanto
// "e-mail já cadastrado, reenviando confirmação" — o Supabase devolve a mesma
// resposta pros dois casos de propósito, pra não vazar se um e-mail já existe.
// Mostramos a mesma mensagem pros dois por esse motivo (ver SPEC D2).
export async function signUpWithEmail({ email, password, metadata }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });

  if (error) {
    const isRateLimited =
      error.status === 429 || error.code === 'over_email_send_rate_limit';
    return {
      status: isRateLimited ? 'rate_limited' : 'error',
      message: isRateLimited ? AUTH_MESSAGES.rate_limited : AUTH_MESSAGES.error,
      data,
      error,
    };
  }

  if (data.session) {
    return { status: 'signed_in', message: null, data, error: null };
  }

  return {
    status: 'needs_email_confirmation',
    message: AUTH_MESSAGES.needs_email_confirmation,
    data,
    error: null,
  };
}

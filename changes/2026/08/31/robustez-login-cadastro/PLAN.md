---
change: robustez-login-cadastro
type: fix
status: approved-for-implementation
created: 2026-08-31
---

# Plano — Robustez de login e cadastro

Referência: `SPEC.md` nesta mesma pasta. Decisões D1-D5 lá explicam o "porquê";
aqui só o "onde/como", com nomes de arquivo, função e texto exatos.

## Arquivo novo: `src/lib/auth.js`

Módulo de normalização de outcomes de `supabase.auth.signUp`. Não depende de
`gameplay.js` nem é importado por ele (domínios separados, ver SPEC D2).

```js
import { supabase } from './supabaseClient';

const UNCONFIRMED_ACCOUNT_AGE_MS = 10_000; // margem de latência p/ heurística

export const AUTH_MESSAGES = {
  existing_unconfirmed:
    'Esse e-mail já está cadastrado. Verifique sua caixa de entrada para confirmar a conta, ou faça login se já confirmou.',
  rate_limited:
    'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.',
  needs_email_confirmation:
    'Cadastro quase pronto! Confirme seu e-mail antes de fazer login.',
  error:
    'Não foi possível concluir o cadastro. Tente novamente em instantes.',
};

// Chama supabase.auth.signUp e devolve um resultado normalizado:
// { status: 'signed_in' | 'existing_unconfirmed' | 'needs_email_confirmation' | 'rate_limited' | 'error',
//   message: string | null,  // já traduzido/amigável; null quando status === 'signed_in'
//   data, error }            // resposta crua do Supabase, para quem precisar
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

  // Sem sessão: ou é conta nova aguardando confirmação, ou é reenvio de
  // confirmação pra conta já existente (Supabase não gera erro nesse caso).
  const createdAtMs = data.user?.created_at
    ? new Date(data.user.created_at).getTime()
    : Date.now();
  const isFreshSignup = Date.now() - createdAtMs <= UNCONFIRMED_ACCOUNT_AGE_MS;

  if (isFreshSignup) {
    return {
      status: 'needs_email_confirmation',
      message: AUTH_MESSAGES.needs_email_confirmation,
      data,
      error: null,
    };
  }

  return {
    status: 'existing_unconfirmed',
    message: AUTH_MESSAGES.existing_unconfirmed,
    data,
    error: null,
  };
}
```

Notas de implementação:
- `error.status` é o campo padrão do `AuthError` do supabase-js v2 para o HTTP
  status; `error.code` é o slug retornado pelo GoTrue (`over_email_send_rate_limit`).
  Checar os dois cobre variação de versão do SDK.
- `metadata` é exatamente o objeto hoje montado inline em `Register.jsx`
  (`first_name`, `last_name`, `username`, `phone`, `participant_type`, `course`,
  `period`) — só passa a ser montado no `Register.jsx` e entregue como
  parâmetro, a função em si não conhece esses campos.

## `src/pages/Register.jsx`

1. Importar `signUpWithEmail` de `../lib/auth`.
2. Substituir o bloco atual (linhas 43-69) que chama `supabase.auth.signUp`
   diretamente por uma chamada a `signUpWithEmail`:

```js
const result = await signUpWithEmail({
  email: formData.email,
  password: formData.password,
  metadata: {
    first_name: formData.firstName,
    last_name: formData.lastName,
    username: formData.username,
    phone: formData.phone,
    participant_type: formData.participantType,
    course: formData.course,
    period: formData.period ? parseInt(formData.period) : null,
  },
});

setLoading(false);

if (result.status !== 'signed_in') {
  setError(result.message);
  return;
}

// Sessão real criada (confirmação de e-mail desativada no projeto).
localStorage.setItem('facom_logged_in', 'true');
navigate('/onboarding');
```

3. Remover o `if (error) { setError(error.message); return; }` antigo (agora
   coberto pelo `if (result.status !== 'signed_in')` acima).
4. Nenhuma mudança de layout/JSX — só o corpo de `handleRegister`.
5. O comentário existente nas linhas 66-67 ("perfil é criado automaticamente
   por trigger...") é preservado, movido para antes do bloco de sucesso.

## `src/pages/Login.jsx`

1. Linha 93: trocar o texto do `<label>` de `E-mail ou Usuário` para `E-mail`.
2. Nenhuma outra mudança nesse arquivo. O atalho `admin` → `admin@admin.com`
   (linha 24) é preservado como está — é uma conveniência de teste interna, não
   parte da promessa de UI que estava incorreta.
3. Placeholder do input (`seu@email.com`, linha 97) já está coerente com
   "E-mail" — não precisa mudar.

## `src/pages/Profile.jsx`

Alterar `handleLogout` (linhas 70-73):

```js
const handleLogout = () => {
  const confirmed = window.confirm('Tem certeza que deseja sair da conta?');
  if (!confirmed) return;
  localStorage.removeItem('facom_logged_in');
  navigate('/login');
};
```

Nenhuma outra mudança no arquivo.

## Arquivos explicitamente NÃO tocados nesta mudança

- `src/App.jsx` — guard de rota permanece baseado só na flag (gap 3/D4,
  documentado como trabalho futuro no SPEC).
- `src/lib/gameplay.js` — nenhuma função de gameplay muda.
- `src/lib/supabaseClient.js` — sem mudanças.
- `src/hooks/useUser.js` — sem mudanças.
- Qualquer arquivo de missões/ranking/scanner.

## Tarefas atômicas

1. **[Código] Criar `src/lib/auth.js`** com `signUpWithEmail` e `AUTH_MESSAGES`
   conforme especificado acima.
2. **[Código] Atualizar `src/pages/Register.jsx`** para usar `signUpWithEmail`
   e só autenticar localmente quando `status === 'signed_in'`.
3. **[Código] Atualizar `src/pages/Login.jsx`**: rótulo do campo vira "E-mail".
4. **[Código] Atualizar `src/pages/Profile.jsx`**: `handleLogout` ganha
   `window.confirm`.
5. **[Verificação] `npm run lint` e `npm run build`** — checagem estática.
6. **[Verificação] Escrever `VERIFY.md`** cobrindo cada critério de aceite do
   SPEC, sinalizando quais dependem de um projeto Supabase real (os cenários de
   `existing_unconfirmed` e `rate_limited` só são reproduzíveis contra um
   Supabase configurado com confirmação de e-mail ativada e/ou cota de e-mail
   esgotada — não dá pra automatizar sem mocks, então ficam marcados como teste
   manual em `TESTE-MANUAL.md`).
7. **[Verificação] Escrever `TESTE-MANUAL.md`** com os passos pra reproduzir
   manualmente cada um dos 3 status de `signUpWithEmail` que não são o caminho
   feliz (`needs_email_confirmation`, `existing_unconfirmed`, `rate_limited`),
   já que esses foram os cenários mais frágeis de validar sem depender de novo
   diagnóstico ao vivo.

## Fora do plano (fica pro humano decidir depois)

- Implementar a RPC de login por usuário (D1 / trabalho futuro #1 do SPEC).
- `AuthProvider` com `onAuthStateChange` substituindo a flag em `App.jsx` (D4 /
  trabalho futuro #2 do SPEC).
- Fluxo de "Esqueceu a Senha?".
- Push da branch / abertura de PR.

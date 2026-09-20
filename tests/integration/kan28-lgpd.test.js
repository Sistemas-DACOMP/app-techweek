import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Testes de integracao: chamam o Supabase de homolog de verdade, sem
// passar pela UI (bypass do front) - precisam de VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY validos em .env.local. Se nao estiverem
// configurados, os testes sao pulados em vez de falhar.
//
// NOTA (KAN-72, 2026-09-20): este arquivo documenta o gap no stack ANTIGO
// (Supabase), ja descontinuado pelo pivot pra Firebase/GCP. O equivalente
// desse gap no stack novo foi corrigido em KAN-72 via POST /api/auth/register
// (backend/src/routes/auth.ts) + a regra `create` de /users/{userId} em
// firestore.rules - ver docs/business-rules/REG-LGPD-001-aceite-lgpd-backend.md
// pro relato completo. Este teste nao foi migrado pra Firebase porque isso e
// uma tarefa maior (reescrever toda a suite de integracao), fora do escopo
// do KAN-72 - mantido aqui so como registro historico do gap original.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasRealCredentials = Boolean(
  url && anonKey && !url.includes('placeholder')
);

describe.skipIf(!hasRealCredentials)('KAN-28 - aceite de LGPD nao e exigido pelo backend', () => {
  // Fonte da regra: validado com o time nesta sessao que o aceite dos
  // termos precisa virar regra oficial de backend, nao so de front.
  // Hoje NAO existe coluna/trigger/policy que exija isso - o Supabase
  // aceita o cadastro normalmente mesmo sem nenhum campo de aceite no
  // metadata. Por isso o teste usa `it.fails`: ele documenta o
  // comportamento atual (errado) de proposito. Quando a regra for
  // implementada (KAN-28), este teste passa a ser reportado como
  // "esperava falhar mas passou" - e a hora de trocar `it.fails` por
  // `it` normal.
  it('cria a conta mesmo sem nenhum campo de aceite de termos no payload', async (ctx) => {
    const supabase = createClient(url, anonKey);
    const email = `qa-kan28-${Date.now()}@example.com`;

    // username e first_name sao NOT NULL em profiles (ver trigger
    // handle_new_user, migration 0001) - preenchidos aqui pra isolar
    // a unica variavel do teste: a ausencia de aceite de termos/LGPD.
    const { error } = await supabase.auth.signUp({
      email,
      password: 'senha123456',
      options: {
        data: {
          username: `qa_kan28_${Date.now()}`,
          first_name: 'QA Bot KAN-28',
        },
      },
    });

    if (error?.code === 'over_email_send_rate_limit') {
      // Projeto Supabase free tier limita envio de confirmacao de e-mail
      // (mesma causa do bug do KAN-27). Nao da pra provar nem desprovar
      // a regra do LGPD nesta execucao - pula em vez de fingir resultado.
      ctx.skip();
      return;
    }

    // Regra esperada (KAN-28, ainda nao implementada): o backend deveria
    // recusar a criacao da conta sem o aceite explicito dos termos. Hoje
    // nao existe coluna/trigger pra isso, entao error vem null (conta
    // criada normalmente) - este assert falha de proposito ate KAN-28
    // ser implementado.
    expect(error).not.toBeNull();
  }, 15000);
});

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { MAX_AVATAR_BYTES } from '../../src/lib/validators.js';

// Testes de integracao: chamam o Supabase de homolog de verdade, sem
// passar pela UI (bypass do front) - precisam de VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY validos em .env.local. Se nao estiverem
// configurados, os testes sao pulados em vez de falhar.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasRealCredentials = Boolean(
  url && anonKey && !url.includes('placeholder')
);

describe.skipIf(!hasRealCredentials)('KAN-29 - limite de tamanho/tipo do avatar nao e exigido pelo Storage', () => {
  // Fonte da regra: REG-AVATAR-001 (docs/business-rules), validado com o
  // Fabio nesta sessao (2026-09-12) como regra oficial a implementar - nao
  // e mais so inferencia. Hoje o bucket "avatars" (migration
  // 0002_profile_avatar.sql) nao tem file_size_limit nem
  // allowed_mime_types configurados - so a policy de dono (path precisa
  // comecar com o user id). Isso significa que qualquer cliente que fale
  // direto com o Supabase Storage (sem passar pelo front, sem passar por
  // validateAvatarFile em src/lib/validators.js) consegue subir um
  // arquivo maior que MAX_AVATAR_BYTES (2MB) como avatar de um usuario de
  // verdade. Este teste usa `it.fails`: ele documenta o comportamento
  // atual (errado) de proposito. `it.fails` inverte o resultado do
  // assert - se o assert falhar (como falha hoje, porque o upload passa
  // quando nao deveria), o teste e reportado como passou; quando a
  // migration 0003_avatar_storage_limits.sql for aplicada em homolog e o
  // upload passar a ser recusado, o assert vai passar de verdade e
  // `it.fails` vai reportar "esperava falhar mas passou" - e a hora de
  // trocar para `it` normal, igual o comentario do teste do KAN-28 ja
  // explica (lá o codigo ficou com `it` simples por engano; aqui o
  // codigo usa `it.fails` de fato, consistente com o que o comentario
  // descreve).
  it.fails('recusa (ou deveria recusar) upload de avatar acima de 2MB direto no bucket Storage', async (ctx) => {
    const supabase = createClient(url, anonKey);
    const email = `qa-kan29-${Date.now()}@example.com`;

    // username e first_name sao NOT NULL em profiles (trigger
    // handle_new_user, migration 0001) - preenchidos aqui so pra permitir
    // o cadastro, nao sao o que este teste verifica.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: 'senha123456',
      options: {
        data: {
          username: `qa_kan29_${Date.now()}`,
          first_name: 'QA Bot KAN-29',
        },
      },
    });

    if (signUpError?.code === 'over_email_send_rate_limit') {
      // Mesmo limite de envio de e-mail de confirmacao que afeta os
      // outros testes de integracao (KAN-27/KAN-28). Nao da pra provar
      // nem desprovar a regra nesta execucao - pula em vez de fingir
      // resultado.
      ctx.skip();
      return;
    }
    expect(signUpError).toBeNull();

    if (!signUpData.session) {
      // Projeto homolog exige confirmacao de e-mail (REG-AUTH-003) - sem
      // sessao nao da pra autenticar o cliente Storage como o dono do
      // path (auth.uid() precisa bater com o primeiro segmento do path,
      // policy avatars_owner_insert da migration 0002). Sem confirmar o
      // e-mail manualmente nao ha como este teste automatizado provar o
      // gap com um usuario de verdade - pula em vez de fingir resultado.
      ctx.skip();
      return;
    }

    const user = signUpData.session.user;
    const oversizedFile = Buffer.alloc(MAX_AVATAR_BYTES + 1024 * 1024, 1); // ~3MB, acima do limite de 2MB (MAX_AVATAR_BYTES)
    const path = `${user.id}/fake-avatar-oversized.png`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, oversizedFile, { contentType: 'image/png' });

    // Regra esperada (KAN-29 / REG-AVATAR-001): o Storage deveria recusar
    // arquivo acima de MAX_AVATAR_BYTES mesmo indo direto no bucket, sem
    // passar por validateAvatarFile/Profile.jsx. Hoje o bucket nao tem
    // file_size_limit configurado, entao o upload passa (error vem null)
    // - este assert falha de proposito ate a migration
    // 0003_avatar_storage_limits.sql ser aplicada em homolog.
    expect(error).not.toBeNull();
  }, 15000);
});

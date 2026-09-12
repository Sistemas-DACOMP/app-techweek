---
id: REG-AVATAR-001
nome: Limite de tamanho/tipo de avatar só validado no front
fonte: KAN-29 (Backlog)
tipo: CONFIRMADA
criterio: Upload de avatar maior que 2MB ou de tipo que não seja imagem deve ser recusado também no backend/Storage — não só na validação de front.
prioridade: media
status: correção em PR (migration `supabase/migrations/0003_avatar_storage_limits.sql`, ainda não aplicada em nenhum projeto Supabase — precisa ser rodada manualmente em homolog e depois produção)
testes_relacionados: tests/integration/kan29-avatar-limit.test.js (integração — sobe arquivo >2MB direto no bucket `avatars`, bypass do front; usa `it.fails` porque o gap ainda está aberto até a migration ser aplicada) e src/lib/validators.test.js (validateAvatarFile — unitário, valida só a função do front; comentário no teste usa o id curto REG-A3, mesma regra que REG-AVATAR-001 aqui)
implementacao_relacionada: src/pages/Profile.jsx, uploadAvatar, supabase/migrations/0003_avatar_storage_limits.sql
ultima_validacao: 2026-09-12
---

Limite de 2MB e de tipo de arquivo do avatar é checado só no frontend. Upload direto pro Supabase Storage (bypass da UI) pode enviar arquivo maior ou de tipo diferente. Inferência de que o Storage bucket deveria ter policy própria de tamanho/tipo — não documentado como critério de aceite oficial. Card KAN-29 já existe no Backlog.

**2026-09-12**: validado diretamente com o Fabio nesta sessão como regra oficial a implementar agora (deixou de ser inferência) — promovida de `INFERIDA` para `CONFIRMADA`. Migration `0003_avatar_storage_limits.sql` criada (define `file_size_limit` = 2MB, mesmo valor de `MAX_AVATAR_BYTES` em `src/lib/validators.js`, e `allowed_mime_types` só imagens), mas ainda não foi aplicada em nenhum projeto Supabase (sem CLI/MCP com acesso de escrita disponível na sessão) — Fabio precisa rodar manualmente no SQL Editor de homolog primeiro, depois produção. Teste de integração `tests/integration/kan29-avatar-limit.test.js` documenta o gap com `it.fails` (falha de propósito hoje); depois da migration aplicada, rodar `npm run test:integration` de novo — o teste deve reportar "esperava falhar mas passou", sinal de trocar `it.fails` por `it` normal.

**Status do teste (2026-09-11, PR #17)**: cobertura unitária confirma que a validação do front está correta, mas o gap real (bucket sem policy de tamanho/tipo) seguia sem teste de integração e sem correção. Fechado nesta sessão (2026-09-12) com a migration e o teste de integração acima — falta só a aplicação manual da migration.

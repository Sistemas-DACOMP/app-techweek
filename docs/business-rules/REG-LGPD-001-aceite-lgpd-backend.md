---
id: REG-LGPD-001
nome: Aceite de LGPD só validado no front
fonte: KAN-28 (Backlog)
tipo: CONFIRMADA
criterio: Cadastro sem aceite explícito dos termos LGPD no payload deve ser recusado pelo backend/DB (RLS ou trigger) — não só bloqueado pela UI.
prioridade: alta
status: correção implementada (migration 0003_lgpd_terms_required.sql), pendente de aplicação manual no SQL Editor do Supabase (homolog primeiro, depois produção)
testes_relacionados: tests/integration/kan28-lgpd.test.js (integração real contra Supabase de homolog)
implementacao_relacionada: src/pages/Register.jsx, supabase/migrations/0003_lgpd_terms_required.sql
ultima_validacao: 2026-09-12
---

O aceite dos termos LGPD é checado só no frontend — chamando o Supabase diretamente (bypass da UI) é possível cadastrar sem aceite. Validado com o Fabio nesta sessão (2026-09-12) como regra oficial de backend, não só inferência. Card KAN-28 no Backlog.

**Status do teste (2026-09-11, PR #17)**: teste de integração roda contra o Supabase de homolog de verdade e confirma que a conta é criada sem nenhum campo de aceite — gap real, ainda aberto.

**Nota (2026-09-12, KAN-28)**: Fabio confirmou diretamente que a regra deve virar aplicação de backend agora — tipo passa de INFERIDA para CONFIRMADA. Criada a migration `supabase/migrations/0003_lgpd_terms_required.sql`: adiciona `terms_accepted_at` em `public.profiles` e altera `handle_new_user()` pra recusar (via `raise exception`) qualquer cadastro cujo `raw_user_meta_data ->> 'terms_accepted'` não seja `'true'`, abortando a transação inteira (inclusive o insert em `auth.users`). O front (`src/pages/Register.jsx`) ainda não manda `terms_accepted` no metadata do signUp — isso fica pra uma tarefa separada de wiring do front, fora do escopo do KAN-28 backend. `tests/integration/kan28-lgpd.test.js` só vai ficar verde depois que a migration 0003 for aplicada manualmente no SQL Editor do Supabase de homolog (mesma convenção das migrations 0001/0002, nunca aplicadas automaticamente por este repo).

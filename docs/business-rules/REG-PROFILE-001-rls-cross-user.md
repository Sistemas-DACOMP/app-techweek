---
id: REG-PROFILE-001
nome: RLS de profiles e lookup cross-user do Scanner
fonte: observado na policy SQL (não testado ao vivo)
tipo: NÃO DEFINIDA
criterio: Um usuário só deveria conseguir ler a própria linha de profiles via RLS — se o lookup por username do Scanner retorna dado de outro usuário sem policy explícita pra isso, é bug; se retorna vazio, o fluxo do Scanner está quebrado. Nenhum dos dois foi confirmado ainda.
prioridade: alta
status: falta teste em homolog antes de confiar
testes_relacionados: nenhum ainda
implementacao_relacionada: supabase/migrations (RLS policy de profiles), src/pages/Scanner.jsx
ultima_validacao: 2026-09-10
---

A RLS de `profiles` só permite `auth.uid() = id` (leitura da própria linha). `Scanner.jsx` faz lookup de outro participante pelo `username` pra validar o crachá — sob essa policy, isso provavelmente retorna vazio. Não foi testado ao vivo contra um usuário não-dono; é inferência lida da SQL, não confirmação. Antes de recomendar merge do PR #9 (`develop`→`homolog`), rodar uma query como não-dono (via `execute_sql` do MCP ou conta de teste) pra confirmar o comportamento real. Se confirmado como bug, precisa de policy nova (ex: leitura pública de `username`/`course`/`participant_type` só) — decisão de produto, validar com o Fabio.

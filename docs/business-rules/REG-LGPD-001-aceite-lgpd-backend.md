---
id: REG-LGPD-001
nome: Aceite de LGPD só validado no front
fonte: KAN-28 (Backlog)
tipo: INFERIDA
criterio: Cadastro sem aceite explícito dos termos LGPD no payload deve ser recusado pelo backend/DB (RLS ou trigger) — não só bloqueado pela UI.
prioridade: alta
status: gap de segurança conhecido, sem correção agendada
testes_relacionados: tests/integration/kan28-lgpd.test.js (integração real contra Supabase de homolog, usa `it.fails` de propósito pra documentar o gap atual)
implementacao_relacionada: src/pages/Register.jsx
ultima_validacao: 2026-09-11
---

O aceite dos termos LGPD é checado só no frontend — chamando o Supabase diretamente (bypass da UI) é possível cadastrar sem aceite. Inferência de que isso deveria ser bloqueado no backend/DB também (RLS ou trigger) — não documentado como critério de aceite oficial, mas é gap de segurança real. Card KAN-28 já existe no Backlog. Não promover a regra "aceite obrigatório no backend" a CONFIRMADA sem validar com o Fabio.

**Status do teste (2026-09-11, PR #17)**: teste de integração roda contra o Supabase de homolog de verdade e confirma que a conta é criada sem nenhum campo de aceite — gap real, ainda aberto. Quando KAN-28 for implementado, trocar `it.fails` por `it` normal (o teste passará a ser reportado como "esperava falhar mas passou" até essa troca).

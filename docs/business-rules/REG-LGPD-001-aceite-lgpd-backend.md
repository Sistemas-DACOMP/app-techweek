---
id: REG-LGPD-001
nome: Aceite de LGPD só validado no front
fonte: KAN-28 (Backlog)
tipo: INFERIDA
prioridade: alta
status: gap de segurança conhecido, sem correção agendada
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Register.jsx
ultima_validacao: 2026-09-10
---

O aceite dos termos LGPD é checado só no frontend — chamando o Supabase diretamente (bypass da UI) é possível cadastrar sem aceite. Inferência de que isso deveria ser bloqueado no backend/DB também (RLS ou trigger) — não documentado como critério de aceite oficial, mas é gap de segurança real. Card KAN-28 já existe no Backlog. Não promover a regra "aceite obrigatório no backend" a CONFIRMADA sem validar com o Fabio.

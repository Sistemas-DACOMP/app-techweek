---
id: REG-RANK-001
nome: Critério de tie-break do ranking
fonte: observado no código / decisão de migração Supabase (2026-09)
tipo: OBSERVADA
prioridade: media
status: implementado
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Ranking.jsx
ultima_validacao: 2026-09-10
---

Quando dois usuários empatam em pontos totais, existe um critério de desempate (ver decisão registrada na migração de gameplay pro Supabase). Não é critério de aceite oficial no Jira — comportamento observado/decidido durante a migração. Precisa de teste unitário cobrindo o caso de empate exato.

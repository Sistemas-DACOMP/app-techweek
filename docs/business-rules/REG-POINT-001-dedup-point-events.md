---
id: REG-POINT-001
nome: Dedup de point_events
fonte: observado no código (supabase/migrations/0001_gameplay_persistence.sql + addPointEvent)
tipo: OBSERVADA
criterio: Mesmo user_id + mesmo reference_id (palestra/evento) não pode gerar mais de um point_event — segunda tentativa não soma pontos de novo.
prioridade: alta
status: implementado
testes_relacionados: nenhum ainda
implementacao_relacionada: supabase/migrations/0001_gameplay_persistence.sql, src/hooks/useUser.js (addPointEvent)
ultima_validacao: 2026-09-10
---

Usuário não pode receber o mesmo ponto duas vezes pro mesmo evento/palestra (ex: escanear o mesmo QR duas vezes não deve dobrar a pontuação). Falta cobertura de teste — unit (chamada duplicada), API (payload duplicado direto no Supabase, bypass da UI) e E2E (repetir ação na tela e conferir que o score não sobe de novo). Ver skill `qa-agent` pro formato de matriz de cobertura.

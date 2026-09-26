---
id: REG-POINT-001
nome: Dedup de point_events
fonte: backend/src/routes/points.ts (KAN-79, reforçado no KAN-80)
tipo: CONFIRMADA
criterio: Mesmo uid + mesmo eventType/referenceId não pode gerar mais de um crédito de pontos — segunda tentativa retorna `alreadyClaimed`, não soma pontos de novo.
prioridade: alta
status: implementado
testes_relacionados: backend/src/routes/points.test.ts
implementacao_relacionada: backend/src/routes/points.ts (doc id determinístico `users/{uid}/point_events/{eventDocId}`, checado dentro de `db.runTransaction`)
ultima_validacao: 2026-09-22
---

Usuário não pode receber o mesmo ponto duas vezes pro mesmo evento/palestra/missão (ex: escanear o mesmo QR duas vezes não deve dobrar a pontuação). Dedup é feito pelo backend via doc id determinístico (`eventType_referenceId`, sanitizado) na subcollection `users/{uid}/point_events` — a checagem de existência e a escrita acontecem na mesma transação Firestore, então não há corrida entre checar e gravar.

**Histórico**: até o KAN-79, o client tentava gravar esse dedup direto no Supabase/Firestore a partir de `useUser.js` (`addPointEvent`); a regra do Firestore bloqueava a escrita (fix do SEC-003/KAN-69) e o crédito falhava em silêncio — dedup nunca chegava a ser testado de verdade nesse caminho. Migrado pro backend (`POST /api/points/claim`) e coberto por teste desde então.

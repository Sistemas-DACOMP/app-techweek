---
id: REG-CHECKIN-001
nome: Double-check de presença (entrance Staff + checkout aluno) e crédito único de pontos
fonte: KAN-51 (DoD Jira), spec completa em changes/2026/09/21/kan-51-checkin-double-check/SPEC.md
tipo: CONFIRMADA
criterio: |
  Para atividades com `attendanceMode: 'DOUBLE_CHECK'`: (1) só STAFF/ADMIN registra `entrance`
  (POST /api/checkin/entrance); (2) `checkout` (POST /api/checkin/checkout) só é aceito se
  existir `entrance` prévio pro mesmo par uid+activityId; (3) checkout exige QR dinâmico
  (HMAC-SHA256, emitido por GET /api/activities/:id/screen-token, expiração de 5 min) válido
  e não expirado; (4) checkout repetido (já `COMPLETED`) retorna 409, sem creditar ponto de novo;
  (5) sucesso credita `activities/{id}.points` em `users/{uid}.totalPoints` via
  `FieldValue.increment()`, atomicamente com a mudança de status pra `COMPLETED`.
prioridade: alta
status: a implementar
testes_relacionados: nenhum ainda — pendente do qa-agent após implementação
implementacao_relacionada: backend/src/routes/checkin.ts (entrance/checkout/screen-token), firestore.rules (/checkins)
ultima_validacao: 2026-09-21
---

Ver `changes/2026/09/21/kan-51-checkin-double-check/SPEC.md` para contexto completo, decisões (D1-D3) e critérios de aceite Given/When/Then. Este registro existe pra o catálogo de regras de negócio citar um ID único; a spec é a fonte detalhada.

Regra irmã: `REG-CHECKIN-002` (recusa do `attendanceMode` errado no endpoint antigo do KAN-71, mesma spec, seção D2) garante que uma atividade nunca credita ponto pelos dois fluxos (self-scan do KAN-71 e double-check do KAN-51) ao mesmo tempo.

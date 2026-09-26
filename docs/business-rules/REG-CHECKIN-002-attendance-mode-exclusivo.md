---
id: REG-CHECKIN-002
nome: attendanceMode decide qual fluxo de presença vale por atividade (nunca os dois)
fonte: KAN-51 (decisão D2), spec completa em changes/2026/09/21/kan-51-checkin-double-check/SPEC.md
tipo: CONFIRMADA
criterio: |
  `activities/{id}.attendanceMode` (`'SELF_SCAN' | 'DOUBLE_CHECK'`, ausente = `SELF_SCAN`) decide
  qual endpoint de presença aceita a atividade. `POST /api/activities/:activityId/checkin`
  (KAN-71) recusa com 400 `WRONG_ATTENDANCE_MODE` se `attendanceMode === 'DOUBLE_CHECK'`.
  `POST /api/checkin/entrance`/`checkout` (KAN-51) recusam se `attendanceMode !== 'DOUBLE_CHECK'`.
  Isso impede a mesma atividade creditar ponto pro mesmo aluno duas vezes por dois caminhos
  diferentes (pointEvents do KAN-71 e totalPoints do KAN-51).
prioridade: alta
status: a implementar
testes_relacionados: nenhum ainda — pendente do qa-agent após implementação
implementacao_relacionada: backend/src/routes/checkin.ts, backend/src/routes/booking.ts (não afetado, só referência de padrão)
ultima_validacao: 2026-09-21
---

Ver `REG-CHECKIN-001` e `changes/2026/09/21/kan-51-checkin-double-check/SPEC.md` (decisão D2) para o porquê dessa abordagem ter sido escolhida em vez de dedup cruzado entre collections.

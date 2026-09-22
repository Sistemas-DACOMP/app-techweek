---
id: REG-MISSION-001
nome: Persistência de respostas de missões manuais
fonte: KAN-11 (Jira) + src/pages/Challenges.jsx + backend/src/routes/points.ts (KAN-79/80)
tipo: CONFIRMADA
criterio: Toda missão manual concluída com sucesso deve persistir suas respostas (respostas de texto, opções selecionadas e URLs de imagens anexadas) no campo `metadata` do documento em `users/{uid}/point_events/{eventDocId}`.
prioridade: alta
status: implementado
testes_relacionados: src/pages/Challenges.jsx, src/lib/validators.test.js, backend/src/routes/points.test.ts
implementacao_relacionada: src/pages/Challenges.jsx, src/lib/gameplay.js, src/hooks/useUser.js, backend/src/routes/points.ts
ultima_validacao: 2026-09-22
---

Missões com preenchimento manual (ex: "De Olho na Vaga", "Descubra a Tecnologia", "Colecione Patrocinadores", missões de networking) não devem perder as respostas do usuário ou salvar apenas em armazenamento efêmero local. Os dados preenchidos são consolidados em um payload JSON e gravados no campo `metadata` do documento Firestore em `users/{uid}/point_events/{eventDocId}`, com `eventType: 'manual_challenge'` — gravado pelo backend (`POST /api/points/claim`), não mais direto pelo client.

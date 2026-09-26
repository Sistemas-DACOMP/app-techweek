---
id: REG-SCANNER-001
nome: Scanner só pode creditar pontos para o QR da palestra selecionada
fonte: KAN-71
tipo: CONFIRMADA
criterio: QR code escaneado só deve gerar ponto se o `lectureId` decodificado do QR corresponder exatamente à palestra que o usuário selecionou — QR de outra palestra deve ser rejeitado, não pontuado. Payload malformado/inesperado também deve ser rejeitado, nunca lançar exceção.
prioridade: alta
status: implementado (client + servidor)
testes_relacionados: src/lib/qrValidation.test.js
implementacao_relacionada: src/lib/qrValidation.js, src/components/LectureScanner.jsx, backend/src/routes/checkin.ts, firestore.rules
ultima_validacao: 2026-09-20
---

O scanner de presença de palestra antes aceitava QR code de qualquer palestra (gap registrado como inferência em KAN-30/Backlog). KAN-71 promoveu a regra a critério de aceite oficial e implementou a validação em duas camadas: `isQrForLecture` (função pura em `src/lib/qrValidation.js`) barra no client antes de creditar o ponto, e `POST /:activityId/checkin` (`backend/src/routes/checkin.ts`) revalida `lectureId === activityId` no servidor dentro de uma transação — o client sozinho não é confiável nessa arquitetura. `firestore.rules` também referencia a regra. Cobertura de teste unitário da função pura em `src/lib/qrValidation.test.js`; o endpoint de backend e a firestore rule ainda não têm teste automatizado dedicado (fora do escopo desta campanha de KAN-71).

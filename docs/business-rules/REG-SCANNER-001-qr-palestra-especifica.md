---
id: REG-SCANNER-001
nome: Scanner de presença deveria aceitar só o QR da palestra selecionada
fonte: KAN-30 (Backlog)
tipo: INFERIDA
prioridade: alta
status: gap de segurança conhecido, sem correção agendada
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Scanner.jsx, src/components/LectureScanner.jsx
ultima_validacao: 2026-09-10
---

O scanner de presença de palestra aceita QR code de qualquer palestra, não só da que o usuário selecionou/está inscrito. Inferência de que deveria validar `reference_id` do QR contra a palestra ativa antes de dar o ponto — não documentado como critério de aceite oficial. Card KAN-30 já existe no Backlog. Não promover a regra "validação de palestra específica" a CONFIRMADA sem validar com o Fabio.

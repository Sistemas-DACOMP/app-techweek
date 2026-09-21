---
id: REG-MISSION-001
nome: Persistência de respostas de missões manuais
fonte: KAN-11 (Jira) + src/pages/Challenges.jsx + supabase/migrations/0001_gameplay_persistence.sql
tipo: CONFIRMADA
criterio: Toda missão manual concluída com sucesso deve persistir suas respostas (respostas de texto, opções selecionadas e URLs de imagens anexadas) no campo `metadata` da tabela `point_events`.
prioridade: alta
status: implementado
testes_relacionados: src/pages/Challenges.jsx, src/lib/validators.test.js
implementacao_relacionada: src/pages/Challenges.jsx, src/lib/gameplay.js, src/hooks/useUser.js
ultima_validacao: 2026-09-21
---

Missões com preenchimento manual (ex: "De Olho na Vaga", "Descubra a Tecnologia", "Colecione Patrocinadores", missões de networking) não devem perder as respostas do usuário ou salvar apenas em armazenamento efêmero local. Os dados preenchidos são consolidados em um payload JSON e gravados na coluna `metadata` do registro em `point_events` com `event_type = 'manual_challenge'`.

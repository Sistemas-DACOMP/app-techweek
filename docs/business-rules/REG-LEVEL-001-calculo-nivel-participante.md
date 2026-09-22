---
id: REG-LEVEL-001
nome: Cálculo dinâmico do nível do participante por pontuação
fonte: KAN-70 (Jira) + src/pages/Profile.jsx + src/lib/level.js
tipo: CONFIRMADA
criterio: O nível do participante não pode ser estático. Deve ser computado dinamicamente com base na pontuação total acumulada em `pointEvents`. Um participante com 0 pontos deve estar no Nível 1 (Novato).
prioridade: alta
status: implementado
testes_relacionados: src/lib/level.test.js
implementacao_relacionada: src/lib/level.js, src/hooks/useUser.js, src/pages/Profile.jsx
ultima_validacao: 2026-09-21
---

## Faixas de Pontuação e Títulos

O nível do participante progride de acordo com as faixas de pontos conquistados em palestras e missões do evento:

- **Nível 1 - Novato**: 0 a 29 pontos
- **Nível 2 - Explorador**: 30 a 69 pontos
- **Nível 3 - Conectado**: 70 a 119 pontos
- **Nível 4 - Avançado**: 120 a 199 pontos
- **Nível 5 - Expert**: 200+ pontos

A interface exibe o título correspondente e uma barra com a porcentagem e pontos restantes para avançar para o próximo nível.


---
id: REG-AUTH-002
nome: Senha e confirmação de senha devem ser idênticas no cadastro
fonte: observado no código (sem card Jira dedicado)
tipo: OBSERVADA
criterio: O formulário de cadastro só segue adiante se o campo de senha e o campo de confirmação de senha forem exatamente iguais.
prioridade: baixa
status: implementado
testes_relacionados: src/lib/validators.test.js (passwordsMatch — comentário no teste usa o id curto REG-C1, mesma regra)
implementacao_relacionada: src/pages/Register.jsx, src/lib/validators.js (passwordsMatch)
ultima_validacao: 2026-09-11
---

Cadastro exige que o campo de senha e o campo de confirmação de senha tenham o mesmo valor antes de enviar o formulário. Comportamento simples e já implementado, sem ambiguidade — catalogado aqui só pra manter rastreabilidade regra↔teste completa.

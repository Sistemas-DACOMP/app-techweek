---
id: REG-AUTH-001
nome: Validação de senha fraca no cadastro
fonte: KAN-27 (Backlog)
tipo: INFERIDA
prioridade: media
status: gap conhecido, sem correção agendada
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Register.jsx
ultima_validacao: 2026-09-10
---

Senha fraca só é rejeitada tarde no fluxo de cadastro (depois de outras validações), gerando uma mensagem de rate-limit confusa em vez de dizer que a senha é fraca. Inferência de produto (razoável que a validação devesse ser cedo e clara) — não é critério de aceite documentado. Validar com o Fabio antes de virar teste permanente de regra oficial; card KAN-27 já existe no Backlog registrando o gap.

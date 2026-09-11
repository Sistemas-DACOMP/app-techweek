---
id: REG-AUTH-001
nome: Validação de senha fraca no cadastro
fonte: KAN-27 (Backlog)
tipo: INFERIDA
criterio: Senha abaixo do mínimo (6 caracteres) deve ser rejeitada cedo no formulário de cadastro, com mensagem específica de senha fraca — nunca reportada como rate-limit.
prioridade: media
status: gap conhecido, sem correção agendada
testes_relacionados: src/lib/validators.test.js (isPasswordLongEnough — unitário, função ainda não ligada ao Register.jsx; o comentário no teste usa o id curto REG-C2, mesma regra que REG-AUTH-001 aqui); src/lib/auth.test.js (mapeamento de erro weak_password, não confundir com rate_limited)
implementacao_relacionada: src/pages/Register.jsx
ultima_validacao: 2026-09-11
---

Senha fraca só é rejeitada tarde no fluxo de cadastro (depois de outras validações), gerando uma mensagem de rate-limit confusa em vez de dizer que a senha é fraca. Inferência de produto (razoável que a validação devesse ser cedo e clara) — não é critério de aceite documentado. Validar com o Fabio antes de virar teste permanente de regra oficial; card KAN-27 já existe no Backlog registrando o gap.

**Status do teste (2026-09-11, PR #17)**: `isPasswordLongEnough` existe e tem cobertura unitária, mas ainda não está integrada ao fluxo real de `Register.jsx` — o teste documenta a regra que falta ser aplicada, não prova que o gap foi fechado. Gap continua aberto.

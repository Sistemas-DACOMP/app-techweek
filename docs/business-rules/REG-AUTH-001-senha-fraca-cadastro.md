---
id: REG-AUTH-001
nome: Validação de senha fraca no cadastro
fonte: KAN-27, confirmado implementado em 2026-09-22 (migração Firebase, PR #70/KAN-69)
tipo: CONFIRMADA
criterio: Senha abaixo do mínimo (6 caracteres) deve ser rejeitada antes de submeter o cadastro, com mensagem específica de senha fraca.
prioridade: media
status: implementado
testes_relacionados: src/lib/validators.test.js (isPasswordLongEnough, unitário)
implementacao_relacionada: src/pages/Register.jsx (linhas ~85-88), src/lib/validators.js (MIN_PASSWORD_LENGTH)
ultima_validacao: 2026-09-22
---

Fechado. `Register.jsx` valida `formData.password.length < MIN_PASSWORD_LENGTH` antes de chamar `signUpWithEmail`, com mensagem clara (`"A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres."`) — sem passar pelo Firebase Auth pra descobrir isso tarde (o valor 6 já bate com o mínimo real exigido pelo Firebase Auth, não é coincidência).

**Histórico**: na era Supabase (PR #17, 2026-09-11), `isPasswordLongEnough` existia mas não estava ligada ao `Register.jsx` — regra classificada como INFERIDA/gap na época. A integração real veio junto com a migração pra Firebase (KAN-69), achada e confirmada nesta sessão ao limpar comentário residual do Supabase no código-fonte.

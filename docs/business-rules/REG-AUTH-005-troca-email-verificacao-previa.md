---
id: REG-AUTH-005
nome: Troca segura de e-mail com verificação prévia no novo endereço e ciclo de vida de pendingEmailChange
fonte: KAN-116
tipo: CONFIRMADA
criterio: A alteração de e-mail nunca deve sobrescrever a credencial do Firebase Auth imediatamente. O fluxo exige verifyBeforeUpdateEmail(user, newEmail), gravando pendingEmailChange no Firestore ({ newEmail, requestedAt, expiresAt }). A sincronização com o documento do usuário é idempotente no reload/login e permite cancelamento explícito pelo usuário.
prioridade: alta
status: implementado
testes_relacionados: src/lib/userService.test.js, tests/rules/users.test.js
implementacao_relacionada: src/lib/userService.js (requestEmailChange, syncPendingEmailChange, cancelPendingEmailChange), firestore.rules
ultima_validacao: 2026-10-12
---

A chamada legada `updateEmail(user, newEmail)` alterava a credencial imediatamente, expondo o usuário ao risco de perda de conta por erro de digitação ou tomada de conta maliciosa.

Sob a REG-AUTH-005:
1. `requestEmailChange(uid, newEmail)` dispara `verifyBeforeUpdateEmail(auth.currentUser, newEmail)` do Firebase Auth e persiste `pendingEmailChange` no Firestore com prazo de expiração de 24 horas.
2. O Firebase Auth permanece sendo a única fonte de verdade da identidade do usuário.
3. Quando o participante confirma o link recebido no novo e-mail e acessa o sistema, `syncPendingEmailChange(uid)` detecta a divergência entre o Firestore e o Firebase Auth atualizado (`auth.currentUser.email === pendingEmailChange.newEmail`), sincronizando o campo `email` no Firestore e removendo o registro transitório.
4. O usuário pode abortar a solicitação a qualquer momento via `cancelPendingEmailChange(uid)`.

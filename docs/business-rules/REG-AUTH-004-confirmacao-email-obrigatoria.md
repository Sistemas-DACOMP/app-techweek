---
id: REG-AUTH-004
nome: Confirmação de e-mail obrigatória para escrita de perfil, reserva de palestras, resgate de pontos e curtidas
fonte: KAN-116
tipo: CONFIRMADA
criterio: Usuários autenticados com email_verified == false são barrados de atualizar seu perfil no Firestore (exceto solicitação de troca de e-mail), de curtir posts no Feed, e de executar ações críticas no backend Express (reserva de atividades, cancelamento de reserva, claim de pontos de missões e credenciamento de leads). O frontend apresenta o EmailVerificationGate com auto-detecção em segundo plano (visibilitychange/focus).
prioridade: alta
status: implementado
testes_relacionados: tests/rules/users.test.js, tests/rules/feed_posts.test.js, backend/src/middlewares/authMiddleware.test.ts, tests/unit/emailVerificationGate.test.js
implementacao_relacionada: firestore.rules, backend/src/middlewares/authMiddleware.ts, src/components/EmailVerificationGate.jsx
ultima_validacao: 2026-10-12
---

A confirmação de e-mail é a âncora de identidade do participante na FACOM TechWeek. Para evitar que atacantes registrem contas com e-mails forjados ou façam bypass nas regras de segurança do Firestore através de chamadas ao backend Express (que utiliza o Firebase Admin SDK), a validação de `emailVerified === true` é imposta em camadas:

1. **Firestore Rules**:
   - `/users/{userId}`: `allow update: if isVerifiedOwner(userId) ...`
   - `/feed_posts/{postId}`: `allow update: if isStaffOrAdmin() || (isVerified() && onlyOwnLikeChanged());`
2. **Backend Express Middleware**:
   - `requireVerifiedEmail` bloqueia requisições em `POST /api/activities/book`, `POST /api/activities/cancel-booking`, `POST /api/points/claim` e `POST /api/leads` com HTTP 403 `EMAIL_NOT_VERIFIED`.
3. **Frontend PWA**:
   - `EmailVerificationGate` intercepta rotas privadas e detecta reativação da aba com `visibilitychange` e `window.focus`, recarregando a credencial automaticamente com `reloadUser()`.

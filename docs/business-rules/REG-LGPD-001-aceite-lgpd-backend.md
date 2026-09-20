---
id: REG-LGPD-001
nome: Aceite de LGPD exigido pelo backend (Firebase)
fonte: KAN-72 (critério de aceite no Jira — implementado), histórico em KAN-28 (Backlog, era Supabase)
tipo: CONFIRMADA
criterio: Cadastro sem aceite explícito dos termos LGPD no payload deve ser recusado pelo backend — não só bloqueado pela UI. No stack Firebase, isso vale tanto pra chamada em `POST /api/auth/register` (400 `TERMS_NOT_ACCEPTED` se `termsAccepted !== true`) quanto pra escrita direta em `/users/{uid}` via Firestore SDK (bloqueada pela regra declarativa se o documento não tiver `termsAcceptedAt` como timestamp).
prioridade: alta
status: implementado (KAN-72)
testes_relacionados: backend/src/services/registerUser.test.ts, backend/src/routes/auth.test.ts, backend/src/middlewares/authMiddleware.test.ts (unitários, backend Firebase); tests/integration/kan28-lgpd.test.js (integração real contra o Supabase de homolog — documenta o gap antigo do stack descontinuado, ver nota abaixo)
implementacao_relacionada: backend/src/routes/auth.ts, backend/src/services/registerUser.ts, backend/src/middlewares/authMiddleware.ts, firestore.rules (`match /users/{userId}`)
ultima_validacao: 2026-09-20
---

O aceite dos termos LGPD era checado só no frontend no stack antigo (Supabase) — chamando a API diretamente (bypass da UI) era possível cadastrar sem aceite. KAN-28 registrou isso como gap inferido no Backlog; o projeto migrou pra Firebase/GCP antes de esse card ser corrigido (2026-09-20, ver `app-techweek-firebase-pivot`), então KAN-28 ficou órfão do stack antigo.

**KAN-72 implementa o equivalente no Firebase, virando critério de aceite oficial (CONFIRMADA):**

1. **Endpoint `POST /api/auth/register`** (`backend/src/routes/auth.ts`) — roda atrás de `requireAuth` (token JWT do Firebase Auth válido obrigatório). Exige `termsAccepted === true` no corpo da requisição (400 `TERMS_NOT_ACCEPTED` caso contrário) e só então grava `/users/{uid}` numa transação Firestore, sempre com `termsAcceptedAt: serverTimestamp()`. Se o documento já existir, retorna 409 `ALREADY_REGISTERED` sem sobrescrever.
   - **Decisão de arquitetura (validada com o Fabio, não reabrir sem motivo novo):** essa abordagem foi escolhida no lugar de uma Cloud Function `beforeCreate` (blocking function) porque blocking functions exigem upgrade pago pro Identity Platform/GCIP — o endpoint + transação Firestore entrega a mesma garantia (documento de perfil só existe com aceite) sem esse custo.
2. **`firestore.rules`** (`match /users/{userId}`, regra `allow create`) — fechado o bypass de escrita direta: antes, `allow create: if isOwner(userId)` deixava qualquer client autenticado criar `/users/{uid}` pelo SDK sem passar pelo endpoint, sem `termsAcceptedAt` nenhum (o mesmo tipo de bypass "bate direto na API/SDK" que KAN-28 descrevia pro Supabase). A regra agora exige, tudo no mesmo `create`:
   - `request.resource.data.termsAcceptedAt is timestamp` (o próprio critério do REG-LGPD-001);
   - `request.resource.data.role == 'PARTICIPANT'` — achado adicional durante a implementação: o `create` original não travava `role` nenhum (só o `update` travava), então um client podia se auto-atribuir `ADMIN` na criação;
   - `request.resource.data.uid == request.auth.uid` e `email` igual ao do token (ou `null`, pra contas sem claim de email) — achado do `security-reviewer` (KAN-72): sem isso, o client podia gravar `uid`/`email` arbitrários no próprio doc;
   - `request.resource.data.keys().hasOnly([...])` — mesmo achado do `security-reviewer`, fecha injeção de campos extras não previstos no doc.

   O backend usa o Admin SDK, que ignora Security Rules, então nenhuma dessas travas afeta o fluxo do endpoint.

**Pendência registrada pelo `security-reviewer` (KAN-72), não resolvida nesta rodada — validar com o Fabio antes de virar card:**
- Não existe teste automatizado (emulador de rules / `@firebase/rules-unit-testing`) cobrindo a regra `create` de `/users/{userId}` — hoje a garantia depende só de leitura manual do arquivo. `firebase` CLI está instalado mas não autenticado nesta máquina; o emulador local roda sem login (validado com `firebase emulators:exec --only firestore`, confirma que a regra pelo menos compila), mas escrever a suíte de teste de regras em si ficou fora do escopo desta sessão.
- `allow read: if isAuthenticated()` em `/users/{userId}` (pré-existente, não alterado neste ticket) deixa qualquer participante autenticado ler o perfil de qualquer outro, incluindo `email` — campo que agora está sempre preenchido, já que o cadastro passa a ser obrigatório. Fora do blast radius do KAN-72, mas vale avaliação separada.
- `POST /api/auth/register` não tem rate limiting a nível de aplicação — prioridade baixa (rota exige token válido e é idempotente), mas registrado.

**Nota sobre o teste antigo**: `tests/integration/kan28-lgpd.test.js` continua documentando de propósito o gap do Supabase (stack descontinuado) — não foi reescrito pra Firebase porque migrar aquele teste de integração é trabalho maior, fora do escopo do KAN-72. O arquivo agora tem um comentário apontando que o equivalente Firebase foi resolvido em `/api/auth/register`.

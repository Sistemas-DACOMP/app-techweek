---
id: REG-LGPD-001
nome: Aceite de LGPD exigido pelo backend (Firebase)
fonte: KAN-72 (critério de aceite no Jira — implementado), histórico em KAN-28 (Backlog, era Supabase)
tipo: CONFIRMADA
criterio: Cadastro sem aceite explícito dos termos LGPD no payload deve ser recusado pelo backend — não só bloqueado pela UI. No stack Firebase, `POST /api/auth/register` recusa com 400 `TERMS_NOT_ACCEPTED` se `termsAccepted !== true`; escrita direta em `/users/{uid}` via Firestore SDK é bloqueada por completo (`allow create: if false`), já que uma regra declarativa não consegue provar que o usuário de fato aceitou os termos — só o endpoint consegue checar isso.
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
2. **`firestore.rules`** (`match /users/{userId}`, regra `allow create`) — a primeira versão desta PR tentou fechar o bypass de escrita direta replicando em regras declarativas o que o endpoint grava (`termsAcceptedAt is timestamp`, `role == 'PARTICIPANT'`, `uid`/`email` batendo com o token, `hasOnly` nos campos). Revisão de code-review encontrou que isso não prova aceite de LGPD nenhum: nada nas Security Rules sabe se o usuário realmente marcou o checkbox, então um client podia gravar um `termsAcceptedAt` qualquer (`serverTimestamp()`, por exemplo) direto pelo SDK e a regra aceitava — reabrindo o mesmo bypass que o KAN-72 devia fechar, só que camuflado atrás de uma regra que parecia robusta. Corrigido pra `allow create: if false` — criação de `/users/{uid}` passa a ser exclusiva do backend via Admin SDK (que ignora Security Rules), mesmo padrão já usado em `bookings`/`leads` no mesmo arquivo. A garantia de aceite volta a depender só do endpoint, que é o único lugar que consegue checar isso de verdade.

**Pendência registrada pelo `security-reviewer` (KAN-72), não resolvida nesta rodada — validar com o Fabio antes de virar card:**
- Não existe teste automatizado (emulador de rules / `@firebase/rules-unit-testing`) cobrindo a regra `create` de `/users/{userId}` — hoje a garantia depende só de leitura manual do arquivo. `firebase` CLI está instalado mas não autenticado nesta máquina; o emulador local roda sem login (validado com `firebase emulators:exec --only firestore`, confirma que a regra pelo menos compila), mas escrever a suíte de teste de regras em si ficou fora do escopo desta sessão.
- `allow read: if isAuthenticated()` em `/users/{userId}` (pré-existente, não alterado neste ticket) deixa qualquer participante autenticado ler o perfil de qualquer outro, incluindo `email` — campo que agora está sempre preenchido, já que o cadastro passa a ser obrigatório. Fora do blast radius do KAN-72, mas vale avaliação separada.
- `POST /api/auth/register` não tem rate limiting a nível de aplicação — prioridade baixa (rota exige token válido e é idempotente), mas registrado.

**Nota sobre o teste antigo**: `tests/integration/kan28-lgpd.test.js` continua documentando de propósito o gap do Supabase (stack descontinuado) — não foi reescrito pra Firebase porque migrar aquele teste de integração é trabalho maior, fora do escopo do KAN-72. O arquivo agora tem um comentário apontando que o equivalente Firebase foi resolvido em `/api/auth/register`.

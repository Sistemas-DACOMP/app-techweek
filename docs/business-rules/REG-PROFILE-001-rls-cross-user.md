---
id: REG-PROFILE-001
nome: Leitura cross-user de users/{uid} pro lookup por username do Scanner
fonte: firestore.rules (match /users/{userId}) + src/lib/userService.js (findUserByUsername)
tipo: CONFIRMADA
criterio: Qualquer usuário autenticado pode ler qualquer documento em /users/{uid} (não só o próprio) — necessário pro Scanner.jsx encontrar outro participante pelo username via query com where('username','==',...).
prioridade: alta
status: implementado, sem gap
testes_relacionados: nenhum automatizado ainda (comportamento decorre direto de `allow read: if isAuthenticated()` em firestore.rules)
implementacao_relacionada: firestore.rules (`match /users/{userId} { allow read: if isAuthenticated(); ... }`), src/lib/userService.js (findUserByUsername), src/pages/Scanner.jsx
ultima_validacao: 2026-09-22
---

**Superado pela migração Firebase — o problema original nem existe mais.** Este registro nasceu da era Supabase: a RLS de `profiles` só permitia `auth.uid() = id`, e o lookup do Scanner por `username` provavelmente retornava vazio pra outro participante — nunca chegou a ser testado ao vivo antes da migração.

No Firestore, a regra de `/users/{userId}` é deliberadamente aberta pra leitura (`allow read: if isAuthenticated()`, qualquer uid) — não restrita ao dono como era a RLS antiga. `findUserByUsername` (`src/lib/userService.js`) faz `query(usersRef, where('username','==', cleanUsername), limit(1))`, e como a regra permite leitura cross-user, isso funciona por desenho, não por acidente. Confirmado lendo `firestore.rules` e o código do Scanner — sem gap.

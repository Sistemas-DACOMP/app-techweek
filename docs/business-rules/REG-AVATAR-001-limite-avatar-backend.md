---
id: REG-AVATAR-001
nome: Limite de tamanho/tipo de avatar só validado no front
fonte: KAN-29 (Backlog), KAN-73 (storage.rules Firebase, 2026-09-20)
tipo: CONFIRMADA
criterio: Upload de avatar maior que 2MB ou de tipo que não seja imagem deve ser recusado também no backend/Storage — não só na validação de front. Lista fechada de content-type aceito (`image/png`, `image/jpeg`, `image/webp`, `image/gif`), igual ao `validateAvatarFile` do front — não usar wildcard `image/*`, que deixaria passar `image/svg+xml` (vetor de XSS via SVG com script embutido).
prioridade: media
status: infra-pronta (storage.rules do Firebase), mas gap não fechado ponta a ponta — ver nota de escopo abaixo
testes_relacionados: src/lib/validators.test.js (validateAvatarFile — unitário, valida a função do front; não cobre o bucket do Storage). Regra do storage.rules verificada manualmente contra o emulator do Firebase (auth+storage) em 2026-09-20 — sem teste automatizado permanente ainda (ver nota de escopo).
implementacao_relacionada: src/pages/Profile.jsx, uploadAvatar (src/lib/gameplay.js), storage.rules (raiz do repo, match /avatars/{userId}/{fileName})
ultima_validacao: 2026-09-20
---

Limite de 2MB e de tipo de arquivo do avatar é checado só no frontend. Upload direto pro Storage (bypass da UI) pode enviar arquivo maior ou de tipo diferente. Card KAN-29 (Supabase) segue no Backlog; KAN-73 fechou a parte Firebase da mesma regra.

**Decisão confirmada com o Fabio (KAN-73)**: lista fechada de content-type, não `image/.*`. Motivo: `image/*` aceitaria `image/svg+xml`, que pode carregar `<script>` embutido — risco de XSS se o avatar for renderizado sem sanitização. A lista fechada bate exatamente com `validateAvatarFile` do front.

**Status do teste (2026-09-20, KAN-73)**: `storage.rules` foi verificado manualmente contra o Firebase Emulator Suite (auth + storage, projeto isolado, portas alternativas pra não colidir com outro processo já rodando) com 7 cenários: (1) dono escreve na própria pasta → permitido; (2) usuário escreve na pasta de outro `uid` → negado; (3) arquivo de 3MB (acima do limite) → negado; (4) `image/svg+xml` → negado; (5) escrita sem autenticação → negado; (6) leitura sem autenticação → negado; (7) leitura autenticada de avatar de outro usuário → permitido. Todos os 7 bateram o resultado esperado. Isso não é teste automatizado permanente no CI — `firebase-tools`/`@firebase/rules-unit-testing` não estão como devDependency do projeto; decisão foi não adicionar essa infra nesta ticket (escopo) e documentar aqui em vez de reivindicar cobertura de CI que não existe.

**Gap NÃO fechado ponta a ponta**: `src/lib/gameplay.js` (`uploadAvatar`) ainda sobe pro **Supabase Storage** (`supabase.storage.from('avatars').upload(...)`), não pro Firebase Storage — o projeto está em migração Supabase→Firebase e o front ainda não trocou o caminho de upload de avatar. `storage.rules` do Firebase está pronto e correto, mas é infra à frente do código do app: enquanto `uploadAvatar` não migrar pra `firebase/storage` (já importado em `src/lib/firebase.js`, mas não usado pra avatar ainda), o caminho antigo do Supabase continua sem limite de tamanho/tipo no backend — mesmo gap do KAN-29, ainda aberto por esse lado.

**Ressalva do security-reviewer (2026-09-20)**: a checagem de `contentType` em `storage.rules` valida o metadado que o próprio cliente declara no upload, não os bytes reais do arquivo — não há verificação de magic bytes. A lista fechada bloqueia o vetor mais óbvio (declarar `image/svg+xml` corretamente), mas um cliente malicioso ainda pode declarar `image/png` e mandar bytes de outra coisa. Hoje isso não é explorável de verdade porque nenhum caminho de upload do app usa esse bucket ainda (ver gap acima); vale reavaliar se/quando o app passar a servir esse arquivo de um jeito que ignore o Content-Type armazenado no GCS. Não vira card agora — é observação de defesa em profundidade, não bug confirmado.

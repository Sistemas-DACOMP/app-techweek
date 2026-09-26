---
id: REG-AVATAR-001
nome: Limite de tamanho/tipo de avatar validado no front e no Storage
fonte: KAN-29 (Supabase, superado pela migração), KAN-73 (storage.rules Firebase, 2026-09-20), KAN-78 (migração de uploadAvatar pro Firebase Storage)
tipo: CONFIRMADA
criterio: Upload de avatar maior que 2MB ou de tipo que não seja imagem deve ser recusado também no Storage — não só na validação de front. Lista fechada de content-type aceito (`image/png`, `image/jpeg`, `image/webp`, `image/gif`), igual ao `validateAvatarFile` do front — não usar wildcard `image/*`, que deixaria passar `image/svg+xml` (vetor de XSS via SVG com script embutido).
prioridade: media
status: implementado ponta a ponta
testes_relacionados: src/lib/validators.test.js (validateAvatarFile — unitário, valida a função do front). Regra do storage.rules verificada manualmente contra o emulator do Firebase (auth+storage) em 2026-09-20 — sem teste automatizado permanente ainda (ver nota de escopo).
implementacao_relacionada: src/pages/Profile.jsx, uploadAvatar (src/lib/gameplay.js) → uploadUserAvatar (src/lib/userService.js, usa firebase/storage), storage.rules (raiz do repo, match /avatars/{userId}/{fileName})
ultima_validacao: 2026-09-22
---

Limite de 2MB e de tipo de arquivo do avatar é checado no frontend (`validateAvatarFile`) e reforçado no Firebase Storage (`storage.rules`) — fechado nos dois lados.

**Decisão confirmada com o Fabio (KAN-73)**: lista fechada de content-type, não `image/.*`. Motivo: `image/*` aceitaria `image/svg+xml`, que pode carregar `<script>` embutido — risco de XSS se o avatar for renderizado sem sanitização. A lista fechada bate exatamente com `validateAvatarFile` do front.

**Status do teste (2026-09-20, KAN-73)**: `storage.rules` foi verificado manualmente contra o Firebase Emulator Suite (auth + storage, projeto isolado, portas alternativas pra não colidir com outro processo já rodando) com 7 cenários: (1) dono escreve na própria pasta → permitido; (2) usuário escreve na pasta de outro `uid` → negado; (3) arquivo de 3MB (acima do limite) → negado; (4) `image/svg+xml` → negado; (5) escrita sem autenticação → negado; (6) leitura sem autenticação → negado; (7) leitura autenticada de avatar de outro usuário → permitido. Todos os 7 bateram o resultado esperado. Isso não é teste automatizado permanente no CI — `firebase-tools`/`@firebase/rules-unit-testing` não estão como devDependency do projeto; decisão foi não adicionar essa infra nesta ticket (escopo) e documentar aqui em vez de reivindicar cobertura de CI que não existe.

**Histórico**: até a migração completa pro Firebase (KAN-78, 2026-09-21), `uploadAvatar` ainda subia pro Supabase Storage, deixando o `storage.rules` do Firebase pronto mas sem uso real (infra à frente do código). Confirmado em 2026-09-22 que `uploadAvatar` (`src/lib/gameplay.js`) agora delega pra `uploadUserAvatar` (`src/lib/userService.js`), que usa `ref(storage, ...)` do `firebase/storage` de verdade — gap fechado.

**Ressalva do security-reviewer (2026-09-20), ainda válida**: a checagem de `contentType` em `storage.rules` valida o metadado que o próprio cliente declara no upload, não os bytes reais do arquivo — não há verificação de magic bytes. A lista fechada bloqueia o vetor mais óbvio (declarar `image/svg+xml` corretamente), mas um cliente malicioso ainda pode declarar `image/png` e mandar bytes de outra coisa. Agora que o caminho real do app usa esse bucket, essa ressalva passou a ser um risco ativo, não mais teórico — vale reavaliar se/quando o avatar for servido de um jeito que confie no Content-Type armazenado no GCS sem revalidar. Não virou card ainda — observação de defesa em profundidade, não bug confirmado.

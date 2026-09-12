-- Limite de tamanho/tipo do avatar no Storage (KAN-29 / REG-AVATAR-001)
-- Ver docs/business-rules/REG-AVATAR-001-limite-avatar-backend.md
--
-- IMPORTANTE: assim como a 0001 e a 0002, este arquivo ainda NAO foi
-- aplicado em nenhum projeto Supabase (homolog ou producao). Rodar
-- manualmente no SQL Editor de cada projeto (homolog primeiro), depois
-- de revisado. Depois de aplicar em homolog, rodar `npm run
-- test:integration` de novo pra confirmar que
-- tests/integration/kan29-avatar-limit.test.js passa a falhar (no
-- sentido de "it.fails" reportar "esperava falhar mas passou" - sinal
-- de trocar pra `it` normal).
--
-- Gap que esta migration fecha: o bucket "avatars" (migration 0002) so
-- tinha a policy de dono (path precisa comecar com o user id) - nao
-- tinha nenhum limite de tamanho nem de tipo de arquivo. Isso permitia
-- que qualquer cliente autenticado, indo direto no Supabase Storage
-- (bypass do front, sem passar por validateAvatarFile em
-- src/lib/validators.js), subisse um arquivo arbitrariamente grande ou
-- de qualquer tipo como avatar de um usuario de verdade.

-- ============================================================
-- storage.buckets.avatars — file_size_limit e allowed_mime_types
-- ============================================================

-- file_size_limit em bytes: 2 * 1024 * 1024 (2MB), o mesmo valor de
-- MAX_AVATAR_BYTES em src/lib/validators.js — os dois precisam ficar em
-- sincronia; se um mudar, o outro tambem precisa mudar.
-- allowed_mime_types: so tipos de imagem, mesma checagem que
-- validateAvatarFile ja faz no front (file.type.startsWith('image/')).
update storage.buckets
set
  file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'avatars';

---
id: REG-AVATAR-001
nome: Limite de tamanho/tipo de avatar só validado no front
fonte: KAN-29 (Backlog)
tipo: INFERIDA
criterio: Upload de avatar maior que 2MB ou de tipo que não seja imagem deve ser recusado também no backend/Storage — não só na validação de front.
prioridade: media
status: gap de segurança conhecido, sem correção agendada
testes_relacionados: src/lib/validators.test.js (validateAvatarFile — unitário, valida a função do front; não cobre o bucket do Storage; comentário no teste usa o id curto REG-A3, mesma regra que REG-AVATAR-001 aqui)
implementacao_relacionada: src/pages/Profile.jsx, uploadAvatar
ultima_validacao: 2026-09-11
---

Limite de 2MB e de tipo de arquivo do avatar é checado só no frontend. Upload direto pro Supabase Storage (bypass da UI) pode enviar arquivo maior ou de tipo diferente. Inferência de que o Storage bucket deveria ter policy própria de tamanho/tipo — não documentado como critério de aceite oficial. Card KAN-29 já existe no Backlog. Não promover a regra "limite obrigatório no backend" a CONFIRMADA sem validar com o Fabio.

**Status do teste (2026-09-11, PR #17)**: cobertura unitária confirma que a validação do front está correta, mas o gap real (bucket sem policy de tamanho/tipo) segue sem teste de integração e sem correção. Gap continua aberto.

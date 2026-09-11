---
id: REG-AVATAR-001
nome: Limite de tamanho/tipo de avatar só validado no front
fonte: KAN-29 (Backlog)
tipo: INFERIDA
prioridade: media
status: gap de segurança conhecido, sem correção agendada
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Profile.jsx, uploadAvatar
ultima_validacao: 2026-09-10
---

Limite de 2MB e de tipo de arquivo do avatar é checado só no frontend. Upload direto pro Supabase Storage (bypass da UI) pode enviar arquivo maior ou de tipo diferente. Inferência de que o Storage bucket deveria ter policy própria de tamanho/tipo — não documentado como critério de aceite oficial. Card KAN-29 já existe no Backlog. Não promover a regra "limite obrigatório no backend" a CONFIRMADA sem validar com o Fabio.

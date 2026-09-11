---
change: foto-perfil
type: feature
status: roteiro-de-qa
created: 2026-08-24
jira: KAN-7
---

# Roteiro de teste manual — foto de perfil (homolog)

Pré-requisitos: migration `0002_profile_avatar.sql` já aplicada no Supabase de homolog (cria a coluna `avatar_url`, o bucket `avatars` e as policies de Storage), `.env.local` configurado com as credenciais de homolog, `npm run dev` rodando.

## 1. Estado padrão (sem foto)

1. Cadastre um participante novo (ou use um que já existe sem foto).
2. Abra **Perfil** — confirme que aparece um círculo colorido com a **inicial do primeiro nome**, não um espaço vazio nem erro de imagem quebrada.
3. Confira o **Dashboard** — o avatar pequeno no topo também deve mostrar a inicial.
4. Confira o **Ranking** — a linha desse participante também deve mostrar a inicial (não mais um ícone genérico igual pra todo mundo).

## 2. Upload de foto

5. Em **Perfil**, clique no círculo grande do avatar (tem um ícone de câmera sobreposto).
6. Escolha uma imagem (jpg/png) do computador.
7. Confirme que aparece "Enviando foto..." brevemente, e depois a imagem escolhida substitui o círculo colorido.
8. No painel do Supabase, confira **Storage → avatars** — deve existir um arquivo dentro de uma pasta com o `id` do usuário.
9. Confira **Table Editor → profiles** — a coluna `avatar_url` desse usuário deve estar preenchida com uma URL pública.

## 3. Foto aparece em todo o app

10. Volte pro **Dashboard** — o avatar pequeno no topo deve mostrar a mesma foto.
11. Abra o **Ranking** — a linha desse participante deve mostrar a mesma foto.

## 4. Trocar a foto

12. Repita o upload (passo 5-6) com uma imagem diferente.
13. Confirme que a foto nova substitui a antiga em Perfil, Dashboard e Ranking (pode levar um recarregamento de página pra atualizar em telas que já estavam abertas).

## 5. Validações do formulário

14. Tente selecionar um arquivo que não seja imagem (ex: um `.pdf`) — deve aparecer a mensagem "Escolha um arquivo de imagem." e nada deve ser enviado.
15. Tente selecionar uma imagem maior que 2MB — deve aparecer "A imagem precisa ter até 2MB." e nada deve ser enviado.

## 6. Isolamento (RLS do Storage)

16. Com dois usuários de teste diferentes, confirme que o usuário B **não consegue** sobrescrever/apagar a foto do usuário A (isso é garantido pelas policies do bucket, que restringem insert/update/delete à própria pasta — não dá pra testar isso pela UI do app, só confirmar em **Database → Policies → storage.objects** que as 4 policies (`avatars_public_read`, `avatars_owner_insert`, `avatars_owner_update`, `avatars_owner_delete`) estão ativas).

## Critério de aprovação

Todos os itens acima passando = pronto pra virar PR `develop` → `homolog`. Qualquer item falhando, reportar aqui antes de prosseguir.

---
change: robustez-login-cadastro
type: fix
status: roteiro-de-qa
created: 2026-08-31
---

# Roteiro de teste manual — robustez de login e cadastro (homolog)

Pré-requisitos: `.env.local` configurado com as credenciais de homolog, `npm run dev`
rodando. Alguns cenários abaixo dependem de configuração do projeto Supabase
(confirmação de e-mail ativada/desativada, cota de envio de e-mail) — cada um indica
o que checar/ajustar antes de reproduzir.

## 1. Rótulo do campo de login (gap 1)

1. Abra **Login**. Confirme que o rótulo do primeiro campo é **"E-mail"** (não mais
   "E-mail ou Usuário").
2. Confirme que o atalho de teste `admin` → `admin@admin.com` continua funcionando
   (login com usuário `admin` e a senha da conta admin).

## 2. Cadastro novo com confirmação de e-mail exigida (`needs_email_confirmation`)

Pré-requisito: no projeto Supabase de homolog, **Authentication → Providers → Email**
com "Confirm email" **ativado** (comportamento padrão).

3. Cadastre um participante com um e-mail nunca usado antes.
4. Confirme que a tela mostra **"Cadastro quase pronto! Confirme seu e-mail antes de
   fazer login."** e que a navegação **não** avança para `/onboarding`.
5. Confira no `localStorage` (DevTools → Application → Local Storage) que
   `facom_logged_in` **não** foi setado.
6. Confira na caixa de entrada do e-mail usado que chegou o e-mail de confirmação do
   Supabase.

## 3. Cadastro repetido de e-mail já existente não confirmado

7. Sem confirmar o e-mail do passo 3, repita o cadastro com o **mesmo e-mail**
   (pode variar outros campos, como usuário).
8. Confirme que a tela mostra **a mesma mensagem do cenário 2**
   ("Cadastro quase pronto! Confirme seu e-mail antes de fazer login.") —
   de propósito não existe mensagem diferenciada aqui, pra não revelar que o
   e-mail já estava cadastrado. Confirme que a navegação não avança.
9. Confira que **nenhum novo e-mail de confirmação idêntico gerou duplicidade** em
   **Table Editor → auth.users** (deve continuar existindo só um usuário com aquele
   e-mail).

## 4. Rate limit de envio de e-mail (`rate_limited`)

Pré-requisito: mais fácil de reproduzir no free tier do Supabase, que tem cota baixa
de envio de e-mail por hora. Repita o cadastro (passo 3) várias vezes seguidas com
e-mails novos até o Supabase começar a recusar por `429 over_email_send_rate_limit`.

10. Confirme que a tela mostra **"Muitas tentativas. Aguarde alguns minutos antes de
    tentar de novo."** — não o texto cru em inglês do Supabase (ex:
    `email rate limit exceeded`).

## 5. Cadastro com confirmação de e-mail desativada (`signed_in`, caminho feliz preservado)

Pré-requisito: temporariamente **desativar** "Confirm email" em **Authentication →
Providers → Email** no projeto de homolog (lembre de reativar depois do teste, senão
o cenário 2 acima para de ser reproduzível).

11. Cadastre um participante com e-mail novo.
12. Confirme que o comportamento atual é preservado: navega direto para
    `/onboarding` e `facom_logged_in` fica `true` no `localStorage`.
13. Reative "Confirm email" ao terminar este teste.

## 6. Confirmação de logout (gap 5)

14. Faça login e vá em **Perfil**.
15. Clique em **"Sair da Conta"** e, no diálogo nativo do navegador, clique em
    **Cancelar**.
16. Confirme que nada mudou: continua na tela de Perfil, ainda logado,
    `facom_logged_in` continua `true` no `localStorage`.
17. Clique em **"Sair da Conta"** de novo e, desta vez, confirme.
18. Confirme o comportamento atual preservado: `facom_logged_in` é removido e a
    navegação vai para `/login`.

## 7. Mensagem genérica de erro de login (gap 4 — não deve ter mudado)

19. Tente logar com um e-mail que não existe, e depois com um e-mail existente e
    senha errada.
20. Confirme que os dois casos mostram exatamente a mesma mensagem: "Credenciais
    inválidas. Tente novamente." — sem indicar qual dos dois motivos ocorreu.

## Critério de aprovação

Todos os itens acima passando = pronto pra virar PR `develop` → `homolog`. Os
cenários 2, 3, 4 e 5 dependem de configuração específica do projeto Supabase de
homolog (confirmação de e-mail ligada/desligada, cota de e-mail) — se não for
possível reproduzir algum deles no momento do teste, reportar aqui como "não
verificado" em vez de marcar como aprovado.

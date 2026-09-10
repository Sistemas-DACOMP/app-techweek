---
change: robustez-login-cadastro
type: fix
status: implemented
created: 2026-08-31
---

# Robustez de login e cadastro

## Contexto

Diagnóstico feito hoje (reproduzido ao vivo com Playwright + teste manual) contra
`src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/App.jsx`, `src/lib/gameplay.js`
e `src/lib/supabaseClient.js`. Cinco problemas reais, sem relação entre si além de
todos ficarem no fluxo de autenticação:

1. **Rótulo mentiroso no login.** O campo diz "E-mail ou Usuário", mas o código só
   trata a string literal `admin` como atalho (`admin@admin.com`). Qualquer outro
   nome de usuário (ex: `Fabio`) é mandado direto pro `signInWithPassword` como
   e-mail e falha com `invalid_credentials`, porque não é um e-mail de verdade.
2. **`signUp` bem-sucedido nem sempre significa conta nova/logada.** Hoje
   `Register.jsx` trata "sem erro" como sinônimo de "cadastro novo e logado":
   - (a) Se o e-mail já existe e está com confirmação pendente, o Supabase reenvia
     o e-mail de confirmação e devolve o usuário **antigo** (não confirmado, senha
     antiga), sem erro. `Register.jsx` trata isso como cadastro novo.
   - (b) Rate limit de envio de e-mail (`429 over_email_send_rate_limit`, comum no
     free tier do Supabase sob teste repetido) já é capturado via `error.message`,
     mas mostra o texto cru em inglês do Supabase pro usuário final.
   - (c) Quando confirmação de e-mail é exigida (comportamento padrão do Supabase),
     um cadastro novo de verdade retorna `data.user` preenchido mas `data.session`
     **nulo**. `Register.jsx` não olha pra isso — só checa se `error` existe — e
     seta `facom_logged_in=true` mesmo sem sessão real.
3. **Guard de autenticação não confere sessão real.** `App.jsx` (linhas ~25-30) só
   olha a flag `localStorage.facom_logged_in`. Nunca chama
   `supabase.auth.getSession()`/`onAuthStateChange`. Isso já causou um bug real:
   usuário aparecia logado pela flag mas sem sessão Supabase, e uma ação que exige
   auth (upload de avatar, que chama `supabase.auth.getUser()`) falhou com
   "Usuário não autenticado" mesmo com a UI mostrando ele logado.
4. **Mensagem de erro de login genérica — comportamento correto, mantido.**
   `Login.jsx` sempre mostra "Credenciais inválidas. Tente novamente." para
   qualquer erro de `signInWithPassword`. Isso é proposital: o Supabase não
   distingue "senha errada" de "usuário não existe" por design, justamente pra
   evitar enumeração de usuários. **Esta mudança não altera esse comportamento.**
   Não será adicionada mensagem distinta de "usuário não encontrado", nem
   pré-checagem de existência de e-mail/usuário antes do login — isso reabriria o
   buraco de enumeração que a própria API do Supabase evita hoje.
5. **Logout sem confirmação.** `Profile.jsx::handleLogout` limpa a sessão local e
   navega pro login com um único clique, sem "tem certeza?".

## Objetivo

Fechar os gaps 1, 2 e 5 com mudanças pontuais e de baixo risco; mitigar o gap 3
apenas no ponto em que ele hoje *mente ativamente* (Register.jsx fingindo sessão
que não existe); documentar como trabalho futuro o que não será resolvido hoje.
Gap 4 é documentado como decisão já tomada, não é reaberto.

## Fora de escopo desta mudança

- Reescrever o guard de rotas do `App.jsx` pra checar sessão real do Supabase em
  toda navegação (arquitetura maior, ver "Trabalho futuro").
- Implementar lookup seguro de usuário → e-mail pro login (ver decisão abaixo).
- Qualquer mudança em `src/lib/gameplay.js` além de, opcionalmente, adicionar o
  novo módulo de normalização de erros de auth (não mexe nas funções existentes:
  `getMyProfile`, `uploadAvatar`, `updateMascot`, `getMyPointEvents`,
  `addPointEvent`, `getRanking`).
- Fluxo de recuperação de senha ("Esqueceu a Senha?" já existe como link morto,
  não é tratado aqui).

## Decisões explícitas (com justificativa)

### D1 — Login por usuário: remover a promessa, não implementar o lookup

O rótulo "E-mail ou Usuário" vira **"E-mail"**. Não será implementado hoje um
lookup de usuário → e-mail. Motivo: a única forma seria uma query client-side na
tabela `profiles`, mas a RLS de hoje (`auth.uid() = id`) só permite ler a própria
linha — abrir leitura pública de `username → email` pra resolver o login criaria
um vetor de enumeração de e-mails cadastrados, exatamente o que a decisão D3
(abaixo, gap 4) evita no lado do erro. Resolver isso direito exigiria uma RPC
`security definer` no Postgres que devolve só um "existe/não existe" ofuscado, o
que é trabalho de schema, não cabe no tempo de hoje.
**Trabalho futuro documentado**: criar RPC Supabase (`security definer`,
rate-limited) que aceita usuário OU e-mail e resolve pro e-mail real sem vazar
existência de conta a quem não acerta a senha.

### D2 — Distinguir outcomes de `signUp` num módulo compartilhado

Criar `src/lib/auth.js` com uma função `signUpWithEmail(...)` que devolve uma
forma previsível `{ status, message }` em vez de erro cru do Supabase. `status`
é um destes:
- `"signed_in"` — cadastro novo, sessão real criada (`data.session` presente).
- `"needs_email_confirmation"` — sem erro, `data.session` é `null`. Cobre tanto
  "conta nova aguardando confirmação" quanto "e-mail já cadastrado, reenviando
  confirmação" — **de propósito, com a mesma mensagem pros dois casos**: o
  Supabase devolve exatamente essa mesma resposta (sem erro, sem sessão) pros
  dois cenários, justamente pra não revelar se um e-mail já tem conta. Um
  status/mensagem diferente pra "já existe" reabriria esse vazamento
  (enumeração de contas), o mesmo risco que a decisão D3 evita do lado do
  login — por isso a distinção via idade de `created_at`, cogitada
  inicialmente, foi descartada.
- `"rate_limited"` — `error` presente com `status === 429` ou
  `error.code === 'over_email_send_rate_limit'`.
- `"error"` — qualquer outro erro, com `message` = texto amigável genérico.

Motivo de ser um módulo novo e não uma função a mais dentro de `gameplay.js`:
`gameplay.js` hoje é só acesso a dados de gameplay pós-login (perfil, pontos,
avatar). Autenticação é uma responsabilidade diferente, e o pedido explícito é
que isso seja um "contract layer" reusável por `Register.jsx` e por trabalho
futuro (inclusive de outro contribuidor) — arquivo próprio deixa isso óbvio e
evita acoplar os dois domínios.

Mensagens finais em português mostradas ao usuário (ver PLAN.md pra onde cada
uma é usada):
- `needs_email_confirmation` → "Cadastro quase pronto! Confirme seu e-mail antes
  de fazer login." (mesma mensagem tanto pra conta nova quanto pra e-mail já
  cadastrado não confirmado — ver justificativa acima)
- `rate_limited` → "Muitas tentativas. Aguarde alguns minutos antes de tentar de
  novo."
- `error` genérico → "Não foi possível concluir o cadastro. Tente novamente em
  instantes."

### D3 — Gap 4 (mensagem genérica de login) — mantido como está

Documentado aqui pra registro, não é código novo: nenhuma mudança em
`Login.jsx` além do rótulo do campo (D1). A mensagem
"Credenciais inválidas. Tente novamente." continua cobrindo todo erro de
`signInWithPassword`, sem diferenciar "não existe" de "senha errada".

### D4 — `Register.jsx` só finge login quando há sessão real

`Register.jsx` passa a checar `data.session` antes de setar
`facom_logged_in`. Se `status` (de D2) for `signed_in`, comportamento atual
(seta flag, navega pra `/onboarding`) é mantido. Para os demais status de
sucesso-sem-sessão (`needs_email_confirmation`, `existing_unconfirmed`), a
flag **não é setada** e a tela mostra a mensagem correspondente em vez de
navegar. Isso resolve o gap 2 (a,c) e mostra a mensagem amigável do gap 2(b)
pro caso de rate limit.
**Trabalho futuro documentado, não feito hoje**: `App.jsx` continua sem checar
sessão real do Supabase em nenhuma rota — o guard inteiro do app ainda pode
achar "logado" alguém sem sessão válida se a flag `facom_logged_in` for setada
por qualquer outro caminho, ou sobreviver no localStorage após a sessão expirar
no servidor. Consertar isso de vez exige um `AuthProvider`/contexto que ouve
`supabase.auth.onAuthStateChange` e substitui a flag em todo o app — escopo
maior, fica pra depois.

### D5 — Confirmação de logout via `window.confirm()`

Verificado: o app não tem nenhum componente de modal/diálogo próprio hoje (zero
ocorrências de "Modal"/"modal"/`window.confirm` no código atual). Criar um
componente de modal só pra esta confirmação seria desproporcional ao problema.
Decisão: usar `window.confirm()` nativo do navegador em
`Profile.jsx::handleLogout`, texto: `"Tem certeza que deseja sair da conta?"`.
Se o usuário cancelar, nada acontece (sem limpar localStorage, sem navegar).
**Trabalho futuro**: se o time criar um componente de modal customizado para
outra necessidade, revisitar este ponto para usar o mesmo padrão visual.

## Critérios de aceite (Given/When/Then)

- **Given** a tela de login, **When** o usuário olha o rótulo do campo de
  identificação, **Then** ele lê apenas "E-mail" (não promete suporte a
  usuário).
- **Given** um cadastro com e-mail nunca usado, **When** o Supabase exige
  confirmação de e-mail (sessão não criada), **Then** a tela de cadastro mostra
  "Cadastro quase pronto! Confirme seu e-mail antes de fazer login." e **não**
  seta `facom_logged_in` nem navega pra `/onboarding`.
- **Given** um cadastro com e-mail já existente e não confirmado, **When** o
  Supabase reenvia a confirmação e devolve o usuário antigo sem erro, **Then**
  a tela mostra a **mesma** mensagem do cenário de conta nova ("Cadastro quase
  pronto! Confirme seu e-mail antes de fazer login.") e não navega — sem
  revelar que o e-mail já existia.
- **Given** o Supabase recusa o cadastro por rate limit de e-mail (429), **When**
  o erro chega em `Register.jsx`, **Then** a mensagem mostrada é "Muitas
  tentativas. Aguarde alguns minutos antes de tentar de novo." (não o texto cru
  em inglês).
- **Given** um cadastro que retorna `data.session` preenchido (confirmação de
  e-mail desativada no projeto Supabase), **When** o `signUp` responde sem
  erro, **Then** o comportamento atual é preservado: seta `facom_logged_in` e
  navega pra `/onboarding`.
- **Given** a tela de perfil, **When** o usuário clica em "Sair da Conta",
  **Then** aparece uma confirmação nativa do navegador antes de qualquer efeito;
  se ele cancelar, a sessão local e a navegação não mudam; se confirmar,
  comportamento atual (remove a flag, navega pro login) é preservado.
- **Given** a tela de login, **When** o `signInWithPassword` falha por qualquer
  motivo, **Then** a mensagem continua sendo genérica ("Credenciais inválidas.
  Tente novamente."), sem distinguir causa.

## Trabalho futuro (fora desta mudança, documentado por pedido explícito)

1. RPC segura no Supabase para permitir login por nome de usuário sem reabrir
   enumeração de contas (D1).
2. `AuthProvider`/contexto com `supabase.auth.onAuthStateChange` substituindo a
   flag `facom_logged_in` como fonte de verdade em `App.jsx` (D4) — o guard
   atual (linhas ~25-30 de `App.jsx`) continua desacoplado da sessão real do
   Supabase em todas as outras rotas/fluxos.
3. Fluxo de "Esqueceu a Senha?" (link hoje é `href="#"`, não implementado).

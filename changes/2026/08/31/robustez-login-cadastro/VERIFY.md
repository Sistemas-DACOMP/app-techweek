---
change: robustez-login-cadastro
type: fix
status: verified
created: 2026-08-31
---

# VERIFY — robustez de login e cadastro

**Verdito: READY** (nenhum BLOCKER; achados abaixo são SHOULD FIX / NIT, ficam
para o humano decidir — nada foi alterado no código).

`npm run build` reexecutado de forma independente: sucesso, mesmo warning
pré-existente de chunk >500kB, nada novo.

## Critérios de aceite do SPEC — checagem 1:1

- Rótulo "E-mail" em `Login.jsx:93` — ✓ exato, atalho `admin` preservado.
- `needs_email_confirmation` (session nula, conta fresca ≤10s) → mensagem
  exata, não seta `facom_logged_in`, não navega — ✓ (`auth.js:49-56`,
  `Register.jsx:59-62`).
- `existing_unconfirmed` (session nula, conta com >10s) → mensagem exata, não
  navega — ✓ (`auth.js:58-63`).
- `rate_limited` (`error.status===429` ou `error.code==='over_email_send_rate_limit'`)
  → mensagem amigável, não o texto cru do Supabase — ✓ (`auth.js:27-36`).
- `signed_in` (`data.session` presente) → comportamento atual preservado,
  seta flag e navega — ✓ (`auth.js:38-40`, `Register.jsx:64-67`).
- Logout com `window.confirm`; cancelar não limpa `localStorage` nem navega;
  confirmar preserva comportamento atual — ✓ (`Profile.jsx:70-75`).
- Mensagem genérica de login inalterada, `Login.jsx` não mexido além do
  rótulo — ✓ confirmado no diff.
- Módulo `src/lib/auth.js` separado de `gameplay.js`, não importado por ele —
  ✓ confirmado (`gameplay.js` fora do diff).
- `TESTE-MANUAL.md` cobre os 3 status não-felizes + regressão do caminho
  feliz + logout + erro genérico de login, sinalizando pré-requisitos de
  config do Supabase — ✓.

Implementação bate exatamente com o código proposto no PLAN.md (arquivo por
arquivo, linha por linha nos trechos relevantes).

## Achados

- **RESOLVIDO (2026-08-31, decisão do Fabio)**: a heurística
  `existing_unconfirmed`, que reintroduzia um vetor de enumeração de e-mail
  ao mostrar uma mensagem diferente pra "e-mail já cadastrado" vs "conta
  nova", foi removida. `signUpWithEmail` agora devolve `needs_email_confirmation`
  pros dois casos, com a mesma mensagem, igualando o comportamento
  anti-enumeração que o próprio Supabase já tem. SPEC.md, TESTE-MANUAL.md e
  `src/lib/auth.js` foram atualizados de acordo.
- **SHOULD FIX (UX, também decorre de D2 como especificado)**: qualquer erro
  de `signUp` que não seja 429 cai no status genérico `"error"` com a
  mensagem fixa "Não foi possível concluir o cadastro. Tente novamente em
  instantes." — inclusive erros de validação client-actionable do próprio
  Supabase (ex: "Password should be at least 6 characters", já que
  `Register.jsx` não valida tamanho mínimo de senha no client). Antes da
  mudança, o usuário via o texto (em inglês, mas específico) do Supabase; 
  agora vê uma mensagem genérica que não diz o que corrigir. Regressão de
  usabilidade pontual para esse caso específico; não é bug de implementação
  (é exatamente o que D2 pede: "qualquer outro erro" → mensagem genérica).
  Sugestão pro time: considerar validação client-side de senha mínima em
  `Register.jsx` pra evitar esse round-trip com mensagem inútil.
- **NIT (risco já documentado pelo próprio SPEC)**: o limiar de 10s da
  heurística `existing_unconfirmed` pode classificar errado um cadastro
  genuinamente novo se a resposta do Supabase demorar mais que isso
  (comum em free tier / wifi de evento, já que o GoTrue envia o e-mail de
  confirmação de forma síncrona antes de responder). O próprio SPEC já
  documenta essa tolerância como uma margem deliberada pra latência
  (`D2: "10s de tolerância pra latência de rede/servidor"`), então isto é um
  limite conhecido e aceito, não uma falha de implementação — registrando
  aqui só para consciência do time caso o sintoma apareça em produção.
- **NIT**: `handleRegister` (`Register.jsx`) chama `signUpWithEmail` sem
  `try/catch`; se a chamada lançar uma exceção não tratada (em vez de
  devolver `{data, error}}`), `setLoading(false)` nunca roda e o botão fica
  travado em "loading". Pré-existente (o código anterior também não tinha
  try/catch em torno do `supabase.auth.signUp` direto) — não é regressão
  desta mudança, só fica registrado.
- **NIT**: `SPEC.md` está com `status: draft` no frontmatter enquanto
  `PLAN.md` já está `approved-for-implementation` — inconsistência de
  metadado, não bloqueia nada, mas vale atualizar o SPEC pra `implemented`/
  `done` junto com este VERIFY.

## Fora de escopo — confirmado que não foi tocado

`App.jsx`, `gameplay.js`, `supabaseClient.js`, `useUser.js` — nenhum aparece
no diff. As mudanças em `.github/workflows/deploy.yml`, `vite.config.js`,
`package.json`/`package-lock.json` (playwright) e
`supabase/migrations/0002_profile_avatar.sql` presentes no working tree são
de outra frente de trabalho (não relacionadas a este SPEC) e não foram
avaliadas aqui.

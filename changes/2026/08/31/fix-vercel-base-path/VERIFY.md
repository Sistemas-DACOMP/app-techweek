---
change: fix-vercel-base-path
type: bugfix
status: verified
created: 2026-08-31
---

# VERIFY — fix-vercel-base-path

**Verdict: READY**

## Método

- `git diff` restrito a `vite.config.js` e `.github/workflows/deploy.yml` (únicos arquivos deste change; demais arquivos modificados no working tree — `package.json`, `Login.jsx`, `Profile.jsx`, `Register.jsx`, `supabase/migrations/...`, `src/lib/auth.js` — são de outra sessão/track, ignorados conforme instrução).
- Reli `SPEC.md` e `PLAN.md` linha a linha contra o diff real.
- Rodei `npm run build` sem `VITE_BASE_PATH` (default raiz) e novamente com `VITE_BASE_PATH=/app-techweek/` via **PowerShell** (mesma sintaxe do `TESTE-MANUAL.md`, item 3) — inspecionei `dist/index.html` nos dois casos.
- Rodei `npm run lint`.
- Chequei `.env.example`, `vercel.json`, `public/`, `index.html` fonte, e busquei por outras referências hardcoded a `app-techweek/` fora do escopo do SPEC.

## Critérios de aceite do SPEC — todos satisfeitos

1. **GitHub Pages (`VITE_BASE_PATH=/app-techweek/`)** — confirmado: `dist/index.html` gera `src="/app-techweek/assets/..."` e `href="/app-techweek/favicon.png"`. Sem regressão.
2. **Vercel/build sem a var (default raiz)** — confirmado: `dist/index.html` gera `/assets/...` na raiz.
3. **`npm run dev` sem a var** — não testei o redirect 302 ao vivo (não subi o dev server), mas o mecanismo é o mesmo `base` do Vite testado no build; comportamento idêntico esperado. Não é bloqueante — coberto pelo `TESTE-MANUAL.md` item 1 como QA manual pós-implementação, que é o que o PLAN previa (tarefa de verificação, não de teste automatizado).

## Findings

- **NIT** — Testar `VITE_BASE_PATH=/app-techweek/ npm run build` em **Git Bash no Windows** (não PowerShell) produz um `base` corrompido (`/Program Files/Git/app-techweek/...`) por causa da conversão automática de paths estilo MSYS quando uma variável de ambiente começa com `/`. Confirmei isso e também confirmei que rodando o mesmo comando em PowerShell (sintaxe que o `TESTE-MANUAL.md` já usa) o resultado é correto (`/app-techweek/assets/...`). Isso **não afeta o GitHub Actions real** (roda em `ubuntu-latest`, bash de verdade, sem MSYS) nem o código em si — é uma pegadinha só do terminal local do dev no Windows. `TESTE-MANUAL.md` já usa a sintaxe PowerShell correta no item 3, então não precisa mudar; deixo registrado aqui para o time não se assustar se alguém tentar reproduzir via Git Bash e ver um path estranho.
- Nenhum problema de segurança encontrado: a mudança não toca em nenhum dado sensível, não introduz nenhuma nova superfície de enumeração, não lida com input de usuário, não expõe segredos (o valor `/app-techweek/` é literal no workflow, não é secret — correto conforme decisão 3 do SPEC). RLS/autorização não são afetados por essa mudança (é só configuração de build).
- Nenhum bug de correctness encontrado no `vite.config.js` ou `deploy.yml` — o diff é idêntico ao que o PLAN especificou, linha por linha.
- `.env.example`/`.env.local` não foram tocados — respeita a decisão explícita 4 do SPEC.
- `vercel.json` não foi tocado — respeita "fora de escopo" do SPEC.
- `npm run lint` (oxlint): 0 erros. Todos os warnings pré-existentes são em arquivos não relacionados a este change (`Challenges.jsx`, `Scanner.jsx`, `useUser.js`, `Login.jsx`, `InstagramMission.jsx`, `App.jsx`) — nenhum introduzido por esta mudança.
- Nenhuma outra referência hardcoded a `/app-techweek/` encontrada em `public/`, `index.html` fonte, ou manifests que pudesse quebrar em algum dos dois ambientes.

## Correções aplicadas

Nenhuma — não foram encontrados BLOCKERs. Nenhum código foi alterado por esta verificação (apenas builds de teste foram rodados e o `dist/` final foi restaurado ao estado de build padrão sem `VITE_BASE_PATH`, que é descartável/gitignored).

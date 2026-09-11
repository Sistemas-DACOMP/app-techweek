# Memória persistente do projeto — Fase 1 (versionamento de contexto + CI)

Data: 2026-09-10 · Status: aprovado, em implementação

## Problema

O conhecimento operacional do projeto (regras de git flow, padrões de commit, processo de PR review, gaps de QA conhecidos) vivia em três lugares que não se sobrepõem: `CLAUDE.md` numa pasta que **não é repositório git** (`C:\Users\fabio\App_TechWeek`), a skill `qa-agent` só instalada a nível de usuário (`~/.claude/skills`), e a memória de sessão do Claude Code. Nada disso viaja com `git clone` — um novo integrante do time, ou uma nova sessão, não recupera esse contexto sozinho. Um exemplo concreto do problema: o `CLAUDE.md` da pasta pai referenciava `app-techweek-devops-handoff.md` "nesta mesma pasta raiz", mas o arquivo real está em `app-techweek/claude-context/`.

## Objetivo desta fase

Mover o conteúdo canônico pra dentro do repositório `app-techweek` (git-versionado), e adicionar um gate de CI real (lint+build+test) que hoje não existe em nenhum PR. Sem orquestrador, sem agentes novos, sem quality-gate com score — isso fica para as próximas fases (ver Roadmap).

## Decisões

1. **CLAUDE.md canônico vai para `app-techweek/CLAUDE.md`** (raiz do repo). A pasta pai `App_TechWeek` (não-git, uso pessoal do Fabio) mantém um `CLAUDE.md` de uma linha usando `@app-techweek/CLAUDE.md` (mesmo padrão de import já usado no `CLAUDE.md` global do usuário com `@RTK.md`). Corrige o path do handoff no mesmo passo.
2. **Catálogo de regras de negócio em `app-techweek/docs/business-rules/`**, um arquivo por regra, seguindo o template abaixo. Classificação obrigatória: `CONFIRMADA` / `INFERIDA` / `OBSERVADA` / `NÃO DEFINIDA` (mesma taxonomia já usada pela skill `qa-agent`) — nenhuma inferência é promovida a confirmada sem validação humana.
3. **`qa-agent` copiada para `app-techweek/.claude/skills/qa-agent/`**, git-versionada, pra viajar com o repo. A cópia em `~/.claude/skills/qa-agent` (nível usuário) continua existindo — necessário porque skills de projeto não suportam `@import` cross-diretório como o `CLAUDE.md`, e o Fabio abre sessão na pasta pai (não-git), então a cópia do repo pode não aparecer listada na sessão dele. Ponto a verificar na prática, não confirmado ainda.
4. **`.github/workflows/ci.yml` novo**: roda em todo `pull_request` (qualquer branch alvo), passos `npm ci` → `npx oxlint --quiet` → `npm run build` → `npm run test --if-present`. Usa `--quiet` no lint porque o `develop` atual já tem ~15 warnings (unused vars, hook deps) que fariam `oxlint` sair com código 1 mesmo sem nenhum erro real — corrigir esses warnings é fora de escopo desta fase (não é código de infra, é código de produto; deveria ser uma tarefa própria, sugerida no relatório final, não decidida aqui).
5. **Branch protection não é alterada por esta fase.** Ligar "Require status check: CI" em `main`/`homolog`/`develop` é ação em infraestrutura compartilhada do GitHub — fica como passo manual do Fabio, ou executada via `gh api` só com confirmação explícita dele no momento.

## Template de regra (`docs/business-rules/`)

```
---
id: REG-XXX
nome:
fonte: (Jira KAN-N / SPEC.md / observado no código / não definida)
tipo: CONFIRMADA | INFERIDA | OBSERVADA | NÃO DEFINIDA
prioridade:
status:
testes_relacionados:
implementacao_relacionada:
ultima_validacao: AAAA-MM-DD
---

Descrição da regra e critério de aceite.
```

## Regras semeadas nesta fase

Baseadas no que já foi levantado em review de PR e QA anteriores (não são regras novas, só ficam persistidas):

- `REG-POINT-001` — dedup de `point_events` (não duplicar pontos pra mesma palestra) — OBSERVADA
- `REG-RANK-001` — critério de tie-break do ranking — OBSERVADA
- `REG-AUTH-001` — validação de senha fraca cedo no cadastro (KAN-27) — INFERIDA, gap conhecido
- `REG-LGPD-001` — aceite de LGPD só no front (KAN-28) — INFERIDA, gap de segurança
- `REG-AVATAR-001` — limite de tamanho/tipo de avatar só no front (KAN-29) — INFERIDA, gap de segurança
- `REG-SCANNER-001` — scanner de presença aceita QR de qualquer palestra (KAN-30) — INFERIDA, gap de segurança
- `REG-PROFILE-001` — RLS de `profiles` só permite leitura da própria linha; lookup cross-user do `Scanner.jsx` não testado ao vivo — NÃO DEFINIDA (falta teste em homolog)
- `REG-REGISTER-001` — `linkedin`/`instagram` enviados no cadastro são descartados silenciosamente (sem coluna/trigger) — OBSERVADA

## Testes / validação desta fase

- `npm run lint` e `npm run build` confirmados verdes na `develop` HEAD antes de ligar o CI (build: verde; lint: warnings apenas, por isso `--quiet`).
- Validação real do workflow de CI só acontece no primeiro PR aberto depois de mergeada esta mudança.
- Gotcha da skill (item 3) verificado abrindo uma sessão nova a partir da pasta pai e conferindo se `qa-agent` aparece listada.

## Roadmap (fases seguintes, fora do escopo desta entrega — registrado aqui por pedido do usuário)

```
FASE 1 — memória persistente (esta entrega)
FASE 2 — orquestrador
FASE 3 — QA Agent + PR Review Agent
FASE 4 — Security Reviewer
FASE 5 — integrações (Jira/GitHub mais profundas)
FASE 6 — expansão / agentes adicionais
```

Cada fase segue o mesmo processo: validar a fase anterior funcionando antes de aumentar a complexidade (seção 12 do pedido original do usuário). Quality gate com score (threshold 0.80) e revisão multiagente (Implementação → QA Reviewer → Security Reviewer → Architecture Reviewer) descritos no pedido original ficam para a Fase 3/4 — checar critérios objetivos (lint/build/test/regras) antes de qualquer score.

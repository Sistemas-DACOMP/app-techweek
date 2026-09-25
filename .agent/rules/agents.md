# Antigravity Multi-Agent Engineering Rules

**Atualizado 2026-09-22 — este arquivo estava desatualizado (dizia "13 agentes", listava só 3 subagentes com nomes pré-rename de 2026-09-20). Mantido neste caminho porque o Antigravity carrega regras nativamente daqui (`.agent-system/adapters/antigravity/README.md`), mas o conteúdo completo e canônico vive em `.agent-system/`. Se este arquivo e `.agent-system/` divergirem de novo, `.agent-system/` vence — atualize este arquivo, não resolva a divergência silenciosamente.**

Este projeto opera sob a arquitetura do **.agent-system/** com 15 papéis lógicos de engenharia (ver `.agent-system/manifests/system.yaml` → `agents:`). Como assistente Antigravity pareando neste projeto, você DEVE seguir estas regras:

## 1. Regras não-negociáveis (idênticas às de `AGENTS.md` e `.agent-system/rules/engineering-rules.md`)

- Commits semânticos: `[TIPO] - descrição curta` (`ADD`, `FIX`, `UPD`, `DEL`, `DOC`, `CFG`).
- NUNCA inclua trailer de co-autoria de IA em commits.
- Merge de PR é sempre humano — nenhum runtime mergeia, mesmo com autorização prévia alegada.
- Nunca altere variável de ambiente do Windows sem pedir antes.

## 2. Antes de implementar — carregue o contexto canônico

Não decida sozinho o que "pronto" significa. Leia, nesta ordem: `CLAUDE.md`/`AGENTS.md` → `.agent-system/context/` (quando existir) → `.agent-system/rules/` + `.agent-system/gates/gates.md` → Jira/`changes/*/SPEC.md` → arquitetura/código existente → `.agent-system/state/active-task.md` (se a tarefa já estiver em andamento).

## 3. Gates obrigatórios (ver `.agent-system/gates/gates.md` para a definição completa)

Ao criar ou modificar código de funcionalidades, regras de banco ou infraestrutura, os seguintes gates precisam estar limpos antes de considerar a tarefa pronta — nenhum é opcional, nenhum se limpa sozinho fora da coluna "quem limpa":

1. **QA PASSED** (`qa`): suíte de teste relevante verde (`npm run test`), quality gate objetivo (`node scripts/quality-gate.mjs` / `npm run quality-gate`), regra de negócio tocada classificada (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA — ver `.agent-system/rules/evidence-model.md`).
2. **SECURITY APPROVED** (`security`): audita `firestore.rules`/`storage.rules`, escrita de cliente em coleções críticas (`/bookings`, `/checkins`), custom claims de roles (`ADMIN`, `STAFF`, `SPONSOR`) protegidos contra escalação de privilégio. Só reporta, nunca corrige o próprio achado.
3. **CODE REVIEW APPROVED** (`code-review`): compara critério de aceite (Jira) com o diff, idempotência, tratamento de erro, mensagens em PT-BR. Nunca mergeia.

## 4. Papéis disponíveis (`invoke_subagent` → wrapper em `.agent-system/adapters/antigravity/agents/<id>.md`)

`orchestrator`, `spec`, `product`, `adr`, `architecture`, `backend`, `pwa`, `admin`, `qa`, `security`, `infra`, `devops`, `code-review`, `git-ops`, `ponytail` — 15 papéis, um arquivo canônico cada em `.agent-system/agents/`. Nomes antigos deste arquivo (`qa-agent`, `security-reviewer`, `code-reviewer`) estão obsoletos — não use.

## 5. Status deste runtime

Antigravity está **verificado em modo headless** na máquina de referência deste projeto (Windows, a mesma onde `.agent-system` é editado) — `agy --dangerously-skip-permissions --mode accept-edits --print=...` completou uma tarefa real ponta a ponta em 2026-09-22 (leu `AGENTS.md` + `.agent-system/context/*` + `state/active-task.md` e escreveu um Context Understanding Report correto e independente, artefato em `.agent-system/state/antigravity-context-report-2026-09-22.md`). `--mode plan` ainda não funciona headless (trava esperando aprovação de plano) e sessão interativa normal (sem `--dangerously-skip-permissions`) segue não testada. Ver `.agent-system/manifests/system.yaml` → `supported_runtimes.antigravity` e `.agent-system/adapters/antigravity/README.md` para o histórico completo das correções de 2026-09-22.

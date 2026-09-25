# Active Task

Jira: nenhum ainda (ver `blockers.md` — mudança meta/infra, não produto; abrir card é uma decisão
do Fabio, não assumida aqui).

## Objective

Auditar e implementar o Agent System multi-runtime (Claude Code + Antigravity, com Maestri como
camada de conexão) descrito na especificação de duas partes do Fabio (2026-09-22): contexto
canônico, regras/gates, papéis lógicos, task state, handoffs, feedback loop, adapters,
CLAUDE.md/AGENTS.md como bootstrap, Maestri, worktree isolation, QA/Security/SDD workflows,
Agent Doctor, observabilidade, automode com human gates.

## Scope

- `.agent-system/` inteiro (context/, rules/, gates/, manifests/, adapters/, state/, handoffs/,
  adr/) — corrigir staleness, preencher lacunas estruturais.
- `.agent/rules/agents.md`, `AGENTS.md`, `docs/ai-infra/README.md` — reconciliar com a realidade
  atual do repo (pós-migração Firebase).
- `.gitignore` (higiene de worktree).

## Fora de escopo

- Código de aplicação (`src/`, `backend/`) — exceto achados a reportar, nunca corrigidos aqui sem
  card Jira próprio (ex.: `scripts/seed-admin.js` quebrado).
- Instalação real do Maestri (bloqueado — GUI, ação humana).
- Verificação real do Antigravity nesta máquina (bloqueado — precisa Fabio instalar/rodar).
- Deleção de branches órfãs (`worktree-agent-*`) — destrutivo, precisa confirmação explícita antes.

## Decisions (2026-09-22)

- Maestri = `themaestri.app`, app desktop nativo (canvas de orquestração multi-agente), sem
  CLI/API. Fabio pediu "instale e configure" — só é possível preparar tudo até o ponto do install
  GUI, que é ação humana. Ver `.agent-system/adapters/maestri/README.md`.
- Status Antigravity: claim anterior de "verified" (2026-09-21) veio da máquina de um amigo, não
  da máquina de referência (a do Fabio). Fabio decidiu: só a própria máquina conta como
  referência. Corrigido em `manifests/system.yaml` + `adapters/antigravity/README.md`.
- Ritmo de execução: fase por fase, cada uma validada com evidência antes de avançar (decisão do
  Fabio via AskUserQuestion, reforçada pelo goal "resolva e builde 100%... não pule nada").
- Descoberta em campo (não assumida, testada): o CLI `agy` (Antigravity) está de fato instalado
  nesta máquina (v1.2.7) — a suposição inicial "não instalado" (herdada do manifest antigo) estava
  errada. Testado ao vivo: `agy --version`, `agy agents` funcionam; um teste read-only via
  `--mode plan --print=...` foi bloqueado pelo próprio modelo de permissão headless do Antigravity
  (nega `read_file` sem allow-rule explícita). `--dangerously-skip-permissions` existe como
  contorno mas **não foi usado** — decisão de não auto-aprovar tudo numa ferramenta pouco
  conhecida sem perguntar ao Fabio antes. Ver `state/blockers.md`.

## Files changed so far (evidência)

`rules/engineering-rules.md`, `gates/gates.md`, `manifests/system.yaml`,
`adapters/antigravity/README.md`, `agents/orchestrator.md`, `adapters/claude/README.md`,
`.agent/rules/agents.md`, `docs/ai-infra/README.md`, `.gitignore`,
`context/{project,architecture,current-state,conventions,integrations,glossary,environment}.md`
(novos), este arquivo e `handoffs/`/`blockers.md`/`current-workflow.md` (novos).

## Tests

N/A — mudança é documentação/config de processo, não código de produto. Nenhum `npm run
quality-gate` aplicável a esta tarefa especificamente; qualquer edição futura em `scripts/` ou
código de app dentro deste esforço passaria pelo gate normal.

## Known risks

- `.agent-system/` muda propaga por padrão pra develop+homolog+main (não é lógica de negócio, mas
  ainda assim toca as três branches) — ver `feedback-agent-config-syncs-all-branches` (memória do
  projeto).
- Reescrever `docs/ai-infra/README.md` e arquivos `.agent-system/` é mudança "global" do próprio
  Agent System — por regra do próprio sistema (`gates.md`/spec do Fabio), exige aprovação humana
  antes de qualquer coisa crítica; o Fabio já autorizou fase-por-fase, mas cada fase ainda deve ser
  validada, não assumida como aprovada indefinidamente.

## Open questions

- Épico/card Jira próprio pra este esforço? Nenhum existe hoje (zero cards mencionam Antigravity/
  Maestri/multi-agent) — perguntar ao Fabio.
- Tarefa piloto (Fase 24 da spec) — qual item real do backlog usar? Ainda não escolhido.
- Split 3-repo (`apps/pwa`/`apps/admin-web`/`backend/`) ainda é alvo futuro ou foi abandonado?
  UNDEFINED, ver `context/architecture.md`.

## Status

IN_PROGRESS. Concluído com evidência: Fases 0-2, 3 (rules/gates cleanup), 8-9 (state/handoffs
reais), 10 (Maestri — documentado, instalação real ainda bloqueada), matriz final de cobertura
(`docs/coverage-matrix-2026-09-22.md`). Resolvido nesta sessão, com autorização do Fabio: deleção
das 2 branches órfãs; teste real do Antigravity (tarefa ponta a ponta completada com sucesso,
`--dangerously-skip-permissions` autorizado permanentemente pro Fabio). Único item pendente do
checklist: escolher o card do Backlog pro piloto (Fase 24) — próximo passo imediato.

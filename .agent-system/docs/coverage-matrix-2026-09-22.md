# Coverage matrix — Fabio's two-part Agent System spec vs. what's built

Data: 2026-09-22. Cruza os dois prompts do Fabio (arquitetura multi-runtime de 60 pontos + AI
Manager) contra o estado real de `.agent-system/` depois desta sessão. Status permitido:
**DONE** (implementado, integrado, com evidência real) / **PARTIAL** (existe mas incompleto ou não
testado ponta a ponta) / **BLOCKED** (depende de ação humana específica) / **NOT APPLICABLE**
(fora do que este repo pode ter hoje). Nenhum item aqui foi marcado DONE sem evidência (comando
rodado, arquivo lido, output real).

## Checklist "RESULTADO FINAL ESPERADO" (spec 1, seção 59), item a item

| # | Item | Status | Evidência / arquivo |
|---|---|---|---|
| 1 | Agent System funcional | PARTIAL | `.agent-system/` existe, corrigido e expandido hoje; nunca rodou uma tarefa de produto real ponta a ponta ainda (ver item 29) |
| 2 | AI Manager funcional | PARTIAL | Ver seção "AI Manager" abaixo — mapeado pra Claude Code + `CLAUDE.md` + `dev-workflows` skill, decisão registrada, não uma interface nova separada |
| 3 | Orchestrator funcional | DONE | `agents/orchestrator.md` (18.8K, processo completo) ↔ `.claude/skills/dev-workflows/SKILL.md`; mapeamento documentado em `adapters/claude/README.md` |
| 4 | 15 agentes lógicos definidos | DONE | Todos os 15 têm arquivo canônico em `agents/` + adapter Claude (arquivo ou skill/plugin) + wrapper Antigravity — confirmado via `ls` |
| 5 | Contexto canônico | DONE | `.agent-system/context/` — 7 arquivos, criados hoje, sourced de arquivos/comandos reais |
| 6 | Regras canônicas | PARTIAL | `rules/engineering-rules.md` + `rules/evidence-model.md` existem e foram corrigidos hoje; não têm o schema completo por-regra (ID/status/scope/supersedes) que a spec pede — conteúdo real, formato mais simples |
| 7 | Specs | PARTIAL | Não existe `.agent-system/specs/`; specs reais vivem em `changes/*/SPEC.md` (ad hoc, por tarefa) — funcional, mas não centralizado como a spec original descreve |
| 8 | ADRs | DONE | `adr/` — 4 ADRs reais (001 sistema portável, 002 redução de runtime, 003 e 004 escritos hoje) |
| 9 | Contracts | NOT APPLICABLE hoje | Não existe pasta `contracts/` dedicada nem contrato de API formalizado fora do código — nenhuma mudança de contrato ocorreu nesta sessão que exigisse um; marcar como lacuna estrutural, não urgente |
| 10 | Task state | DONE | `state/active-task.md`, `blockers.md`, `current-workflow.md` — populados de verdade hoje pela primeira vez (antes era scaffolding vazio) |
| 11 | Handoffs | DONE (1 exemplo real) | `handoffs/2026-09-22-agent-system-buildout.md` — primeiro handoff real já escrito, segue `templates/handoff.md` |
| 12 | Maestri integrado | BLOCKED | GUI-only, sem CLI/API — `adapters/maestri/README.md` + ADR-004 documentam tudo, exceto o clique real. Ver `state/blockers.md` |
| 13 | Git/Jira integrado | DONE | `gh` CLI + Atlassian MCP confirmados funcionais; `rules/engineering-rules.md`/`gates.md` amarram commit/branch/PR a Jira |
| 14 | Worktree isolation | DONE | Um worktree real em uso (`.claude/worktrees/kan45`), `.gitignore` corrigido hoje; as duas branches órfãs foram deletadas (`git branch -D`, confirmado pelo Fabio, verificado sem worktree ativo/cópia remota antes) |
| 15 | QA workflow | DONE | `agents/qa.md` + `.claude/skills/qa-agent/SKILL.md`, gate `QA PASSED` em `gates.md` |
| 16 | Security workflow | DONE | `agents/security.md` + `.claude/agents/security.md`, gate `SECURITY APPROVED` em `gates.md` |
| 17 | SDD workflow | DONE | `workflows/task-workflow.md`, `pr-workflow.md`, `deploy-workflow.md` + gates encadeados em `gates.md` |
| 18 | Superpowers integrado | DONE | Plugin real instalado (v6.3.0), referenciado nos adapters | 
| 19 | Ponytail integrado | DONE | Plugin real instalado (v4.10.0), gate corrigido hoje (estava marcado "não instalado" por engano) |
| 20 | Agent Doctor | DONE | `scripts/agent-system-doctor.mjs` — já existia, corrigido hoje (agentes/context/Antigravity checks), rodado com evidência real (11 PASS, 2 WARN, 0 FAIL) |
| 21 | Observabilidade | PARTIAL/NOT STARTED | Nenhum log estruturado (agente/runtime/tarefa/ação/resultado) existe — não confundir com `state/`/`handoffs/`, que são estado de tarefa, não log de eventos |
| 22 | Automode controlado | DONE | `gates.md` + `rules/engineering-rules.md` + `orchestrator.md` seção 6 (loop de 3 tentativas, escalonamento) |
| 23 | Human gates | DONE | `gates.md` → `MERGE APPROVED` explicitamente humano; regra "merge sempre humano" repetida em `AGENTS.md`, `CLAUDE.md`, `rules/engineering-rules.md`, `policies/merge-policy.md` |
| 24 | Piloto executado | PARTIAL | Fabio pediu pra escolher um card de Backlog — próximo passo desta sessão, não escolhido ainda |
| 25 | Validação Claude ↔ Antigravity | DONE | Antigravity completou 2 tarefas reais: (a) Context Understanding Report independente (`state/antigravity-context-report-2026-09-22.md`, ADR-003); (b) code review independente da implementação de KAN-47 feita pelo Claude Code — sem ser avisado que estava "correta" (`state/kan47-antigravity-independent-review.md`). Verdict: PASS, achou os 4 critérios do DoD atendidos, e levantou sozinho um ponto real de null-safety pra verificar (confirmado depois como seguro, mas foi um achado de verdade, não ruído) |
| 26 | Testes | PARTIAL | Testes de produto (`npm run test`) não tocados nesta sessão (fora de escopo — sessão é meta/infra); `agent-system-doctor.mjs` foi rodado e serve como "teste" deste próprio sistema |
| 27 | Automode com limite | DONE | Mesmo que item 22 — 3 tentativas, escalonamento pro Fabio |
| 28 | Human gates presentes | DONE | Mesmo que item 23 |
| 29 | Piloto | PARTIAL | Mesmo que item 24 |
| 30 | Validação Claude↔Antigravity | DONE | Mesmo que item 25 |
| 31 | Testes | PARTIAL | Mesmo que item 26 |
| 32 | Matriz final | DONE | Este próprio documento |

## AI Manager (spec 2)

**Decisão registrada aqui, não em ADR separado — é uma decisão de mapeamento, não uma escolha
arquitetural nova**: o "AI Manager / Central Prompt" que a spec 2 descreve (interface única,
recebe pergunta/tarefa, entende, delega, acompanha, consolida, registra feedback, propõe regra,
consulta ADR/spec/arquitetura/estado, nunca inventa quando falta informação) **já existe** como a
combinação de: sessão do Claude Code + `CLAUDE.md`/`AGENTS.md` (bootstrap automático) +
`.claude/skills/dev-workflows/SKILL.md` (classificação/delegação/quality gate) +
`.agent-system/context/` (consulta) + `state/`/`handoffs/` (acompanhamento) +
`feedback/feedback-loop.md` (classificação de feedback). Não foi construída uma interface nova
separada — nenhuma UI, nenhum novo entrypoint — porque a sessão de Claude Code, com esses arquivos
carregados, já cumpre a função descrita: o Fabio já fala em linguagem natural ("implemente
KAN-42", "por que isso dá 403") e a sessão já classifica/delega/consolida.

**Status**: PARTIAL. O comportamento existe e é o que rodou nesta própria sessão (você fez um
pedido em linguagem natural, o sistema auditou, perguntou o que precisava, delegou trabalho a si
mesmo em fases). O que falta pra ser DONE: nunca foi testado explicitamente contra os exemplos
literais da spec ("Transforme esse feedback em uma regra permanente", "Qual foi a decisão tomada
sobre X?") como comandos isolados — comportamento plausível dado o que existe, mas não uma FACT
verificada linha por linha.

**Se o Fabio quiser uma interface literalmente separada** (não apenas "a sessão do Claude Code
seguindo estes arquivos") — isso é uma mudança de escopo real, não uma lacuna de implementação, e
precisa ser pedida explicitamente antes de ser construída.

## O que ficou pra trás (nada foi descartado silenciosamente)

- `specs/`/`contracts/` como pastas dedicadas — item 7/9, lacuna estrutural real, não crítica hoje.
- Observabilidade estruturada (item 21) — não existe, não foi inventada aqui sem necessidade
  concreta (nenhum log real seria consumido por nada ainda).
- Schema completo de regra por-ID (item 6) — o conteúdo das regras é real e canônico, só não tem a
  ficha estruturada (ID/status/supersedes) que a spec original descreve; risco baixo, mudança
  mecânica se o Fabio quiser depois.
- Piloto real (itens 24/25/29/30) — o maior item ainda em aberto, bloqueado só em uma decisão do
  Fabio (qual card), não em trabalho técnico faltando.

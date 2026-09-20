# Runtime parity (spec seção 55)

Cruzamento capacidade x runtime. "NATIVE" = funciona direto no runtime, sem camada de tradução. "ADAPTER" = funciona através de um adapter documentado em `adapters/<runtime>/README.md`, mas depende de tradução. "UNAVAILABLE" = não existe caminho hoje. "UNVERIFIED" qualifica qualquer célula cujo runtime não está instalado nesta máquina — não fabricar confiança que não foi testada.

| Item | Claude Code | Codex | Antigravity | Adapter |
|---|---|---|---|---|
| Agents (`.agent-system/agents/*.md`) | NATIVE | ADAPTER (UNVERIFIED) | ADAPTER (UNVERIFIED) | `adapters/codex/README.md`, `adapters/antigravity/README.md` |
| Skills (`.claude/skills/*/SKILL.md`) | NATIVE | ADAPTER (UNVERIFIED) — via root `AGENTS.md` + padrão do plugin Codex do Superpowers | ADAPTER (UNVERIFIED) | idem |
| Plugins (superpowers, caveman) | NATIVE | ADAPTER parcial — ver `manifests/plugin-parity.md` | ADAPTER parcial | idem |
| Shell | NATIVE | NATIVE se Codex CLI for instalado (capacidade padrão de CLI), mas UNVERIFIED nesta máquina (Codex não instalado) | idem, UNVERIFIED | n/a — capacidade de SO, não precisa de tradução |
| Git | NATIVE | NATIVE (esperado), UNVERIFIED | NATIVE (esperado), UNVERIFIED | n/a |
| Tests (Vitest / test-runner do repo) | NATIVE | NATIVE (esperado, é só `npm run test` via shell), UNVERIFIED | NATIVE (esperado), UNVERIFIED | n/a |
| Browser | AVAILABLE via MCP `claude-in-chrome` | UNAVAILABLE — sem MCP-equivalente configurado para Codex neste ambiente | UNAVAILABLE — mesma razão | nenhum adapter resolve isso hoje; precisaria de MCP próprio configurado no runtime alvo |
| Jira | AVAILABLE via MCP Atlassian | UNAVAILABLE — sem MCP-equivalente configurado para Codex neste ambiente | UNAVAILABLE — mesma razão | idem |
| GitHub (gh CLI) | NATIVE | NATIVE (esperado, é CLI padrão), UNVERIFIED | NATIVE (esperado), UNVERIFIED | n/a |
| Firebase | NATIVE — CLI instalada nesta máquina (15.30.2, 2026-09-20), capacidade de SO/CLI, não depende de runtime de IA | NATIVE (esperado, é CLI padrão), UNVERIFIED — Codex não instalado nesta máquina | NATIVE (esperado), UNVERIFIED — Antigravity não instalado nesta máquina | n/a — capacidade de SO, disponibilidade não é específica de runtime; ver `manifests/capability-matrix.md` (gcloud ainda NOT FOUND, continua bloqueando operações GCP diretas) |
| Handoffs (`handoffs/*.md`) | NATIVE — escrito em arquivo, lido por qualquer agente/humano | NATIVE — é só arquivo em disco, não depende de tool específica do runtime | NATIVE, com uma ressalva (ver linha abaixo) | n/a |
| Rules (`.agent-system/rules/*.md`) | NATIVE | NATIVE — texto plano, qualquer runtime lê | NATIVE | n/a |
| Gates (`.agent-system/gates/gates.md`) | NATIVE | NATIVE — texto plano | NATIVE | n/a |

## Notas por runtime

**Claude Code** — tudo que está construído hoje neste sistema roda nativamente aqui: os 13 arquivos de agente, os adapters em `.claude/agents/*.md` e `.claude/skills/*/SKILL.md`, os hooks (rtk, caveman, superpowers), e as duas MCPs (Atlassian, claude-in-chrome) usadas por este projeto.

**Codex** — CLI não instalada nesta máquina (verificado 2026-09-20). O padrão de adapter usado em `adapters/codex/README.md` reaproveita a convenção já comprovada do plugin Superpowers (`.codex-plugin/plugin.json` + `skills/using-superpowers/references/codex-tools.md`, que documenta `spawn_agent`/`followup_task`/`wait_agent` sob `multi_agent = true` em `~/.codex/config.toml`). Isso é evidência de que o padrão *funciona para o Superpowers*, não prova de que o adapter deste sistema específico funciona — nunca rodou ponta a ponta aqui. Jira e Browser ficam UNAVAILABLE até alguém configurar um MCP equivalente do lado do Codex.

**Antigravity** — mesmo padrão de "documentado mas não instalado/verificado" do Codex. Referência usada: `references/antigravity-tools.md` do Superpowers (`invoke_subagent`). Uma diferença estrutural importante: **Antigravity não tem ferramenta de todo-list/checklist** (não existe um equivalente ao todo tracker do Claude Code). Isso afeta diretamente como `state/` e `handoffs/` são usados neste sistema — em vez de manter progresso de tarefa numa lista efêmera em memória, o agente Antigravity precisa gravar o estado em arquivo via `write_to_file` (por exemplo, atualizando o `task-context.md` da tarefa em `handoffs/` ou `state/` a cada passo relevante), porque é o único jeito de persistir progresso entre passos nesse runtime. Qualquer agente/skill deste sistema que assuma "o runtime está trackeando isso numa todo list" quebra silenciosamente em Antigravity se não for adaptado para escrever em arquivo.

## Resumo

Hoje só existe uma coluna com evidência real: Claude Code. As colunas Codex/Antigravity são projeto de adapter, não confirmação — tratá-las como tal até um smoke test real (ver `docs/bootstrap.md` e a recomendação equivalente em `docs/audit-report.md`).

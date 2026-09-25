# Antigravity adapter

**Status: CLI presente, ainda não exercitado ponta a ponta (corrigido 2 vezes em 2026-09-22).**

Duas correções no mesmo dia, registradas as duas pra quem ler depois não repetir nenhuma:

1. Claim anterior deste arquivo dizia "VERIFIED & OPERATIONAL on macOS Antigravity Runtime (2026-09-21)". Origem real: essa verificação rodou na máquina de um amigo do Fabio (macOS), não na máquina de referência deste projeto (Windows). Decisão do Fabio: só a própria máquina dele conta como referência — corrigido pra "não verificado".
2. Ainda 2026-09-22: descoberto que o CLI `agy` **está instalado de verdade** nesta máquina (v1.2.7, `agy --version` e `agy agents` confirmados rodando). `agy agents` lista só um agente nativo (`flutter_a11y_agent`) — nenhuma descoberta estática dos wrappers deste projeto em `.agent-system/adapters/antigravity/agents/` (diferente do Claude Code, que lê `.claude/agents/*.md` direto). Um teste real read-only (`agy --mode plan --print=...`) foi tentado e bloqueado pelo próprio modelo de permissão do modo headless: nega `read_file` automaticamente por não poder perguntar interativamente, e sugere `--dangerously-skip-permissions` — flag deliberadamente **não usada** (auto-aprovar tudo numa ferramenta pouco conhecida contra este repo não é decisão pra tomar sem perguntar ao Fabio antes).

**Atualização, mesmo dia**: com autorização do Fabio pra `--dangerously-skip-permissions`, uma
tarefa real foi completada — `agy` leu 9 arquivos reais e escreveu um Context Understanding Report
correto e independente. Status real agora: **verificado em modo headless (`--print` +
`--mode accept-edits` + `--dangerously-skip-permissions`)**. `--mode plan` não funciona headless
(trava esperando aprovação de plano que o modo print não consegue surfacear). Sessão interativa
normal (sem o flag de skip) segue não testada. Ver `manifests/system.yaml` pro detalhe completo e
`state/antigravity-context-report-2026-09-22.md` pro artefato real produzido.

O Antigravity carrega nativamente as regras através de `AGENTS.md` na raiz do projeto e de `.agent/rules/agents.md` (ambos existem e foram atualizados 2026-09-22 — ver nota de staleness abaixo).
Os subagentes canônicos são os 15 papéis de `manifests/system.yaml` → `agents:` (`orchestrator`, `spec`, `product`, `adr`, `architecture`, `backend`, `pwa`, `admin`, `qa`, `security`, `infra`, `devops`, `code-review`, `git-ops`, `ponytail`) — quando o Antigravity for testado de verdade, devem ser registrados via `define_subagent` e acionados via `invoke_subagent`. **Correção 2026-09-22**: os nomes `qa-agent`/`security-reviewer`/`code-reviewer` citados numa versão anterior deste arquivo eram os nomes pré-rename de 2026-09-20 — os nomes atuais são `qa`, `security`, `code-review`.

## Proven reference this adapter reuses

Superpowers ships a working Antigravity tool-mapping reference:

- `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.3.0/skills/using-superpowers/references/antigravity-tools.md`

The facts below are taken directly from that file.

## Tool mapping

| Action a skill/agent requests | Antigravity CLI (`agy`) equivalent |
|---|---|
| Dispatch a subagent (`Subagent (general-purpose):` template) | `invoke_subagent` with a built-in `TypeName` — `self` for full-capability work, `research` for read-only work |
| Task tracking ("create a todo", "mark complete") | a **task artifact** (see below) — never `manage_task` |

## Critical: no todo/checklist tool

Antigravity has **no todo tool**. `manage_task` exists but manages background *processes* (`list`/`kill`/`status`/`send_input`) — it is not a checklist and must not be used as one.

When a skill or agent process says "create a todo list" or "track tasks", the Antigravity substitute is a **task artifact**: a markdown checklist file created with `write_to_file` (`IsArtifact: true`, `ArtifactMetadata.ArtifactType: "task"`), then updated in place with `replace_file_content` / `multi_replace_file_content` as steps complete (`- [ ]` → `- [x]`). At the start of any multi-step task, write the artifact listing every planned step; keep it current as the source of truth for what remains, and re-read it before each step once the conversation gets long.

**This matters directly for this system's templates.** `.agent-system/templates/task-context.md` (and the same reasoning applies to `handoffs/`-style handoff docs) is designed as something an agent fills in and tracks progress against. On Claude Code that can live as an in-context todo list managed by whatever native tracking Claude Code offers in a given session; on Antigravity there is no equivalent in-context mechanism, so `task-context.md` must be materialized as a real file via `write_to_file` (as a task artifact) and edited in place — never kept only "in the model's head" or as a chat-only checklist, because Antigravity has nothing that persists or surfaces that the way a task artifact does.

## How this project's agents map onto Antigravity

- Antigravity natively loads project documentation based on the system prompt context or via `AGENTS.md` being linked via the local prompt.
- **Built**: Per-agent Antigravity-format wrapper files exist in `.agent-system/adapters/antigravity/agents/`. Each canonical `.agent-system/agents/<id>.md` is wrapped with a thin Antigravity-specific translation layer that forces the use of task artifacts via `write_to_file` and subagent delegation via `invoke_subagent`.

## Known gaps

- Whether Antigravity honors MCP servers configured elsewhere (Jira/Atlassian, browser automation, Supabase) is unconfirmed — MCP server availability is session/runtime-side config, not a property of this project, and Antigravity's own MCP support has not been audited here.
- No confirmation of how Antigravity discovers its bootstrap file (analogous to Claude Code's `CLAUDE.md` auto-load) — do not assume it reads `AGENTS.md` the same way until verified.

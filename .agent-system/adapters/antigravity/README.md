# Antigravity adapter

**Status: unverified end-to-end.** Antigravity is **not installed** on the audited machine (2026-09-20). Everything below is written to be ready-to-use once Antigravity is installed and configured — it has not been run against a real Antigravity session from this project.

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

## How this project's agents would map onto Antigravity

Same situation as the Codex adapter — only the bootstrap concept exists so far:

- Antigravity would need to be pointed at root **`AGENTS.md`** (or an equivalent bootstrap file Antigravity actually reads — not confirmed which file Antigravity looks for by default, since it isn't installed here to check) which in turn points at `.agent-system/manifests/system.yaml` and `.agent-system/agents/*.md`.
- **TODO — not built yet**: no per-agent Antigravity-format wrapper files exist. Each canonical `.agent-system/agents/<id>.md` would need a thin Antigravity-specific translation layer — mainly: replace any "create a todo" instruction in the canonical process with "write/update a task artifact via `write_to_file`" per the rule above, and translate any "dispatch a subagent" instruction into `invoke_subagent` with the right `TypeName`. None of that translation exists yet; this is future work, to be done once there's an actual Antigravity install to verify against.

## Known gaps

- Whether Antigravity honors MCP servers configured elsewhere (Jira/Atlassian, browser automation, Supabase) is unconfirmed — MCP server availability is session/runtime-side config, not a property of this project, and Antigravity's own MCP support has not been audited here.
- No confirmation of how Antigravity discovers its bootstrap file (analogous to Claude Code's `CLAUDE.md` auto-load or Codex's `AGENTS.md` convention) — do not assume it reads `AGENTS.md` the same way until verified.

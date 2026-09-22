# Claude Code adapter

Status: **native** (see `.agent-system/manifests/system.yaml` → `supported_runtimes`). This is the only runtime in this system that is actually installed, configured, and verified end-to-end on the audited machine (2026-09-20).

## How Claude Code loads agents

Claude Code has no native concept of `.agent-system/agents/*.md`. It reads behavior from two mechanisms only:

- **`.claude/agents/*.md`** — subagent definitions. Each file is a self-contained persona Claude Code can dispatch via the `Agent`/`Task` tool (`subagent_type: <filename-without-.md>`). Frontmatter controls model/tools/effort; body is the agent's instructions.
- **`.claude/skills/*/SKILL.md`** — instructions invoked on demand via the `Skill` tool. Unlike a subagent, a skill runs inline in the current context (or, per this session's tool description, some skills dispatch to a subagent and return a result) rather than always spawning an isolated subagent.

There is no `@import`-style mechanism confirmed to work inside an agent or skill body file that would let `.claude/agents/pr-review.md` simply point at `.agent-system/agents/code-review.md` and inherit its content live. Claude Code reads whatever text is physically in the `.claude/` file at invocation time. That means the `.claude/` copies are **real, duplicated-but-synced content** — not symlinks, not thin pointers — and they must stay operationally complete on their own, because that is literally what Claude Code executes.

## Mapping: canonical agent → Claude Code adapter

| Canonical (`.agent-system/agents/`) | Claude Code adapter (`.claude/`) |
|---|---|
| `orchestrator.md` | `.claude/skills/dev-workflows/SKILL.md` |
| `qa.md` | `.claude/skills/qa-agent/SKILL.md` |
| `security.md` | `.claude/agents/security.md` |
| `code-review.md` | `.claude/agents/code-review.md` |
| `git-ops.md` | `.claude/agents/git-ops.md` — added 2026-09-21, mechanical git/Jira-ops layer under `code-review`; see that agent file's "Out of scope" for the exact boundary. |
| `spec.md`, `product.md`, `architecture.md`, `backend.md`, `pwa.md`, `admin.md`, `infra.md`, `adr.md` | `.claude/agents/spec.md`, `product.md`, `architecture.md`, `backend.md`, `pwa.md`, `admin.md`, `infra.md`, `adr.md` — gap closed 2026-09-20, per Fabio's explicit requirement that agents dispatch automatically instead of needing to be called by name. |
| `ponytail.md` | no wrapper file — Ponytail is a real installed Claude Code plugin (`ponytail@ponytail`, v4.10.0), its own 6 skills load automatically once the plugin is enabled. A `.claude/agents/ponytail.md` would only duplicate/drift from the plugin's own skills. |

**Correction (2026-09-21):** the `security.md`/`code-review.md` rows above previously pointed at the pre-rename filenames (`security-reviewer.md`, `pr-review.md` + `dedup-refactor.md`) — those files were renamed 2026-09-20 to match the canonical names 1:1, but this README wasn't updated at the time. Fixed now; if you find another stale filename reference elsewhere in this repo, it's the same drift, not a new bug.

All 14 canonical agents now have either a real `.claude/` dispatch file or (Ponytail) a real installed plugin — every one auto-dispatches in Claude Code without the user asking for it by name. The files in the right-hand column are kept in sync by whoever edits the canonical file; this adapter README only documents the mapping and the sync convention, it does not itself edit those files.

## Sync convention

- The canonical file (`.agent-system/agents/<id>.md`) is the source of truth for **meaning**: purpose, scope, process, evidence rules. It is runtime-agnostic and never mentions a Claude-specific tool name.
- The `.claude/` copy is the source of truth for **what actually runs**, because it's what Claude Code reads directly. It must restate the canonical file's process in full (not by reference) plus whatever Claude-specific detail is needed to execute it: tool names (`AskUserQuestion`, `Bash`, `Agent`), exact commands (`npm run quality-gate`), and Claude Code conventions (subagent frontmatter, `Skill` tool invocation).
- When the canonical file's meaning changes, the `.claude/` copy must be updated in the same change — they are not allowed to drift. When only a Claude-specific mechanical detail changes (a tool renamed, a command renamed), only the `.claude/` copy changes.
- Project-specific content that has no equivalent in a generic canonical file (e.g. the Supabase/RLS specifics in `security-reviewer.md`, or the `qa-agent/SKILL.md` closing "Project Note" section) lives in the `.claude/` copy and is treated as project context layered on top of the canonical process, not as a fork of it.

## Capabilities Claude Code provides natively (this session, confirmed real)

- **Filesystem** — `Read`, `Write`, `Edit`, `Glob`, `Grep`, `NotebookEdit`.
- **Shell** — `Bash` (Git Bash / POSIX sh) and `PowerShell` (Windows PowerShell 5.1), both available in the same session; each has its own syntax rules.
- **Git** — via `Bash`/`PowerShell` (git 2.49.0 confirmed installed on this machine).
- **GitHub** — `gh` CLI via `Bash`/`PowerShell` (2.98.0, authenticated on this machine), plus the `GitKraken` MCP tool group (`git_*`, `pull_request_*`, `issues_*`, `gitlens_*`) for repo/PR/issue operations through GitKraken instead of raw `gh`.
- **Browser** — `claude-in-chrome` MCP tools (`navigate`, `computer`, `read_page`, `get_page_text`, `find`, `form_input`, `tabs_*`, `read_console_messages`, `read_network_requests`, etc.), gated behind the `claude-in-chrome` skill and per-site permissions in the Chrome extension.
- **Jira / Confluence** — Atlassian Teamwork MCP (`mcp__claude_ai_Atlassian__*`: `getJiraIssue`, `createJiraIssue`, `searchJiraIssuesUsingJql`, `addCommentToJiraIssue`, Confluence page tools, Teamwork Graph context tools, etc.).
- **Subagent dispatch** — `Agent` tool (also referred to as the Task tool in Claude Code's general documentation): `subagent_type: "fork"` forks the current agent with full context; any other type starts a fresh agent from a `.claude/agents/*.md` definition or a built-in type (`general-purpose`, `Explore`, `Plan`, etc.). Push-based: the caller gets a completion notification, it does not poll.
- **Human interaction** — `AskUserQuestion`-style interactive prompts (this project's CLAUDE.md explicitly routes "needs the team to understand, not just execute" moments here) plus plain conversational back-and-forth.
- **Automation hooks** — `settings.json`-configured hooks (`PreToolUse`, `SessionStart`, `UserPromptSubmit`, etc.); this project already uses one for `rtk`'s transparent bash-command rewriting.
- **MCP integrations beyond the above** — Supabase homolog project tools (`mcp__supabase-homolog__*`), plus a large set of `claude.ai`-hosted connectors (Notion, Slack, Figma, Asana, Box, Canva, HubSpot, Intercom, Linear, Microsoft 365, monday.com, GitBook, Claude Docs) that are account-level, not project-specific, and not currently wired into this project's workflows.

No other runtime in this system (Codex, Antigravity) is confirmed to have MCP servers configured — MCP server availability is Claude-Code-session-side config per `.agent-system/docs/CONVENTIONS.md`, not a property of the project itself.

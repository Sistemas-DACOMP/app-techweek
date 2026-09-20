# .agent-system conventions

Read this before writing any file under `.agent-system/`. Every agent/adapter/template file must follow these so the system stays one coherent thing, not a pile of independently-styled docs.

## Directory meaning

- `manifests/` — `system.yaml` (source of truth for what exists) + `capability-matrix.md`, `portability-matrix.md`, `plugin-parity.md`, `runtime-parity.md`.
- `agents/` — one `<agent-id>.md` per agent. Canonical, runtime-agnostic. This is what a human OR any AI runtime reads to know how to behave as that agent.
- `rules/` — canonical engineering rules (git flow, commit format, review process, security invariants). Copied here from CLAUDE.md, not duplicated ad hoc.
- `policies/` — narrower operational policy (quality gate thresholds, merge-block rule, Jira/PR comment tone).
- `workflows/` — the graphs: task lifecycle, PR workflow, deploy workflow, post-deploy validation.
- `gates/` — one file listing every gate (SPEC READY, ARCHITECTURE APPROVED, ...), what satisfies it, who can approve it, what BLOCKED means.
- `templates/` — copy-paste skeletons: task context, agent output schema, handoff, security finding, ADR.
- `adr/` — actual decision records, numbered `ADR-001-*.md` etc, using `templates/adr.md`.
- `feedback/` — the feedback-loop process doc + category list.
- `adapters/<runtime>/` — thin, runtime-specific translation only. NEVER put business/process logic here that isn't already in `agents/` or `rules/`. An adapter file's job is: "here is how THIS runtime invokes the canonical thing."
- `handoffs/`, `state/` — runtime-populated during real work; ship each with just a short `README.md` explaining what goes there and a `.gitkeep`.
- `docs/` — the audit report, bootstrap guide, health-check doc/script, this file.

## Agent file format (`agents/<id>.md`)

Every agent file has, in this order:
1. YAML frontmatter portability contract (see `templates/agent-contract.yaml` for the shape: `agent.id`, `runtime_requirements`, `optional`, `inputs`, `outputs`, `portable`).
2. `## Purpose` — one paragraph.
3. `## Scope` — explicit paths/areas it owns.
4. `## Out of scope` — explicit hand-off targets (never silently do another agent's job).
5. `## Process` — the actual step-by-step method.
6. `## Output format` — must match `templates/agent-output.yaml` (agent/task/status/scope/findings/decisions/risks/blockers/evidence/recommendations/handoff/required_agents).
7. `## Evidence rules` — restate: FACT / INFERENCE / ASSUMPTION / UNKNOWN, never promote inference to fact silently.
8. `## Known gaps` — if the agent's subject doesn't exist yet (e.g. no Firebase project, no apps/pwa repo), say so plainly. Do not invent capability that isn't confirmed.

Never write "should", write imperative. Never pad with a summary restating the title.

## Never fabricate

If a runtime, tool, or plugin isn't actually installed/confirmed on the audited machine (Codex CLI, Antigravity, Ponytail, firebase CLI, gcloud CLI — none of these are installed as of 2026-09-20), say so explicitly in whatever file references it. Write the adapter/contract as ready-to-use once installed, but never imply it currently works end-to-end.

## Source material already gathered (do not re-research, reuse these facts)

- Superpowers plugin (`~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.3.0`) is PORTABLE — ships real adapters: `.codex-plugin/plugin.json` + `skills/using-superpowers/references/codex-tools.md` (Codex, requires `multi_agent = true` in `~/.codex/config.toml`, `spawn_agent`/`followup_task`/`wait_agent`), `references/antigravity-tools.md` (Antigravity: `invoke_subagent`, no todo tool — use `write_to_file` task artifacts), `references/gemini-tools.md`, `.hermes-plugin/plugin.yaml` + `references/hermes-tools.md`, `.pi/extensions/superpowers.ts` + `references/pi-tools.md`, `.cursor-plugin/`, `.kimi-plugin/`, `.devin-plugin/`, `.opencode/plugins/superpowers.js`. Root `AGENTS.md` in that plugin is a probably-broken one-line pointer (just the text `CLAUDE.md`, not `@CLAUDE.md`) — noted as an upstream issue, not ours to fix.
- Caveman plugin (`~/.claude/plugins/cache/caveman/caveman/15581d14007f`) is PARTIALLY PORTABLE — output-compression logic is Node.js/markdown (portable), activation is Claude-Code-hook-specific (`${CLAUDE_PLUGIN_ROOT}`, SessionStart/UserPromptSubmit hooks). Ships a real but minimal `.codex/config.toml` + `.codex/hooks.json` (~20% feature parity: static echo, no level switching, no persistence, no wenyan modes). `gemini-extension.json`/`GEMINI.md` present but config-only, no verified hook wiring. cavecrew-builder/investigator/reviewer subagents have NO portable equivalent (depend on Claude's Task/subagent tool). Standalone Go reverse-proxy gateway (`proxy/`, `~/.caveman/caveman.db`) is fully portable/provider-agnostic but BSL-1.1 licensed — self-hosted single-operator only, "Caveman Cloud" managed multi-user needs a commercial license.
- Existing project agents/skills (`app-techweek/.claude/`): `pr-review.md`, `security-reviewer.md`, `dedup-refactor.md`, `skills/dev-workflows/SKILL.md`, `skills/qa-agent/SKILL.md`. All are mostly generic markdown process text. Exceptions needing REAL content rewrite (not just adapter translation) because they are Supabase-specific: `security-reviewer.md` (entire scope section: RLS, `@supabase/supabase-js`, `profiles`/`point_events` tables) and `qa-agent/SKILL.md`'s closing "Project Note" section only. `pr-review.md` and `dev-workflows/SKILL.md` hardcode the Claude-only `AskUserQuestion` tool name and `npm run quality-gate`/`gh` commands — needs tool-name abstraction (say "ask the human via whatever interactive-question mechanism the runtime provides" instead of the literal tool name).
- Ponytail: NOT FOUND anywhere on this machine (no plugin, no skill, no folder). Document its intended role per the spec (anti-overengineering gate) in `agents/ponytail.md` but mark `portable: false` reason `NOT_INSTALLED` and do not wire it into any workflow as if active.
- Runtime/capability facts (2026-09-20, this machine): git 2.49.0, gh CLI 2.98.0 (authenticated), node v22.16.0/npm 11.10.0, rtk 0.45.0 (standalone binary at `/c/Users/fabio/bin/rtk`, but its "transparent" auto-rewrite only works via Claude Code's `PreToolUse` Bash hook). NOT installed: Codex CLI, Antigravity, docker, firebase CLI, gcloud CLI. Jira via Atlassian MCP and browser via claude-in-chrome MCP are available in Claude Code specifically (MCP servers are Claude-Code-side config, not guaranteed present in another runtime's session unless that runtime is also configured with the same MCP servers).

## Style

Plain, direct engineering writing. No marketing language, no "seamless"/"robust"/"powerful". Portuguese for anything a human teammate reads in PR/Jira per the parent CLAUDE.md rule; these `.agent-system` files are internal engineering docs consulted by AI agents across runtimes — write them in the same mixed style already used in the project's CLAUDE.md (Portuguese prose, English technical terms), for consistency with the rest of the repo's documentation.

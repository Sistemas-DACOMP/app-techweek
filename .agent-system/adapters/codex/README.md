# Codex CLI adapter

**Status: unverified end-to-end.** Codex CLI is **not installed** on the audited machine (2026-09-20). Everything below is written to be ready-to-use once Codex CLI is installed and configured, following the already-proven pattern the Superpowers plugin ships for Codex — it has not been run against a real Codex session from this project.

## Proven reference this adapter reuses

Superpowers already ships a working Codex integration:

- `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.3.0/.codex-plugin/plugin.json` — plugin manifest (name, skills path, MIT license, no hooks declared).
- `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.3.0/skills/using-superpowers/references/codex-tools.md` — the actual tool-mapping reference. The facts below are taken directly from that file.

## Prerequisite: multi-agent support

Codex's subagent tools only exist if multi-agent mode is on. Add to `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

Without this, none of the subagent dispatch described below is available.

## Subagent primitives (poll-based, not push-based)

Unlike Claude Code's `Agent`/`Task` tool (which pushes a completion notification to the caller), Codex's model is explicit spawn + poll:

- **`spawn_agent`** — creates a child. Default `fork_turns: "all"` copies the entire calling transcript into the child; pass `fork_turns: "none"` for a clean-context child (recommended for context hygiene, this is the SDD/subagent-driven-development default, not a workaround for a limitation).
- **`followup_task`** — resumes/messages an already-spawned child (e.g. to deliver review feedback for a fix round). Transparently reloads a child the harness evicted — never assume a spawned agent is unreachable after its first task and spawn a fresh one instead.
- **`wait_agent`** — event subscription, not a short poll loop. A long wait wakes as soon as the child produces mailbox activity, at the same latency as a short one; short-timeout polling wastes a tool call and a context rebill per poll for no benefit. Practical rule from the reference: while there is local work to do, don't wait at all — a completed child's answer arrives in the mailbox on the next turn anyway. When genuinely idle with children outstanding, wait in 5-10 minute (`300000`-`600000` ms) stretches, then post one status line and run `list_agents`, chasing any child that finished without reporting.

## V1 vs V2 lifecycle

Which tools are actually available depends on which multi-agent version the active model preset selects (current presets run V2; older ones run V1) — **trust the real tool list in the session over any table, including this one.**

- **V2**: no `close_agent`. Finished children are evicted automatically when slots are needed; leaving them unclosed costs nothing.
- **V1**: `close_agent` exists and matters — close reviewers when their review returns, and close each implementer once its task's review passes.

## Model-routing footguns

- Every `spawn_agent` call must set **both** `model` and `reasoning_effort` explicitly. Setting `model` alone silently resets the child's effort to that model's default rather than inheriting the caller's — a trap the reference calls out explicitly.
- Never copy a model name from a skill, table, or old session into `spawn_agent` without checking it against the current spawn allowlist — V2 accepts only V2-capable presets and hard-errors on anything else.
- Recommended machine-level backstop in `~/.codex/config.toml` so an unrouted spawn doesn't silently inherit the session's most expensive model:

```toml
[agents]
default_subagent_model = "<a mid-tier model from your spawn allowlist>"
default_subagent_reasoning_effort = "medium"
```

## Git worktree / detached-HEAD handling (sandboxed runs)

Skills that create worktrees or finish branches should detect environment first, with read-only git commands:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → already inside a linked worktree, skip creating another one.
- `BRANCH` empty → detached HEAD, meaning branch/push/PR cannot happen from this sandbox.

For the **Codex App** specifically, when the sandbox blocks branch/push (detached HEAD in an externally-managed worktree), the agent commits all work locally and hands off to the human via the App's native controls — either "Create branch" (names branch, human does commit/push/PR via the App UI) or "Hand off to local" (transfers work to the user's local checkout). The agent can still run tests, stage files, and produce suggested branch names/commit messages/PR descriptions for the human to copy — it just cannot push or open the PR itself in that state.

## How this project's agents would map onto Codex

This project has not built per-agent Codex wrappers yet — only the root-level bootstrap exists:

- Codex reads root **`AGENTS.md`** (created alongside this adapter, see `AGENTS.md` at the repo root) as its entrypoint.
- `AGENTS.md` points at `.agent-system/manifests/system.yaml` (what exists) and `.agent-system/agents/*.md` (canonical per-agent behavior) as the actual instruction source.
- **TODO — not built yet**: individual per-agent Codex-format files (the Codex equivalent of `.claude/agents/*.md`) do not exist. Right now Codex would have to read the canonical `.agent-system/agents/<id>.md` files directly and interpret them itself (they're written runtime-agnostic on purpose, per `.agent-system/docs/CONVENTIONS.md`), rather than getting a Codex-specific wrapper that translates canonical process into `spawn_agent`/`followup_task`/`wait_agent` calls the way `.claude/agents/code-review.md` translates the canonical `agents/code-review.md` into Claude Code's `Agent` tool. Only the orchestrator *concept* currently reaches Codex, via `AGENTS.md` — nothing per-agent yet.

This gap should be closed the same way the Claude adapter was: one thin Codex-format file per canonical agent, translating `## Process` into concrete `spawn_agent`/`followup_task` calls and citing the model-routing rules above, once there is an actual Codex CLI install available to verify against.

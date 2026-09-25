# Glossary

Terms specific to this project/agent-system. Generic engineering terms (PWA, E2E, CI/CD) are not
defined here unless this project uses them in a non-obvious way.

- **KAN-N** — a Jira issue in project `KAN` (`app-teckweek.atlassian.net`), the tracking system
  for this project.
- **CONFIRMADA / INFERIDA / OBSERVADA / NÃO DEFINIDA** — this project's business-rule evidence
  classification. See `rules/evidence-model.md` and `context/conventions.md`.
- **FACT / INFERENCE / ASSUMPTION / UNKNOWN** — the generic (agent-output-level, not
  business-rule-specific) version of the same evidence model.
- **Gate** — a binary checkpoint (passed / BLOCKED) a task must clear before advancing phase. Full
  list in `.agent-system/gates/gates.md`.
- **ADR** — Architecture Decision Record, `.agent-system/adr/ADR-NNN-*.md`. Only written for a
  decision that was actually made, never a proposal still in discussion.
- **SDD** — Spec-Driven Development: requirement → spec → impact → architecture → implementation →
  test → review → revalidation → ready-for-human → merge. Merge is always human.
- **Task context** — the per-task record (`.agent-system/templates/task-context.md` shape) the
  orchestrator fills before delegating any work on a task.
- **Handoff** — a structured record (`.agent-system/templates/handoff.md` shape) letting one
  agent/runtime pick up a task from another without reconstructing context from conversation
  history.
- **Canonical vs. adapter file** — `.agent-system/agents/<id>.md` is the runtime-agnostic
  definition of an agent's purpose/scope/process. `.claude/agents/<id>.md` (or the Antigravity
  equivalent under `.agent-system/adapters/antigravity/agents/`) is the runtime-specific executable
  copy — restates the canonical process in full plus the runtime's own tool names/commands. They
  must not drift; when they do, it's a bug to fix, not a design feature.
- **Ponytail** — the anti-overengineering guardrail (plugin on Claude Code, a manual question to
  ask yourself on runtimes without the plugin). Never authorized to remove security, tests,
  validation, or requirements — see `.agent-system/agents/ponytail.md` for the full hierarchy.
- **Maestri** — external desktop app (`themaestri.app`) for visually orchestrating multiple AI
  agent terminals. Not part of this project's own code; a connection/coordination layer, never a
  source of canonical knowledge (that stays in `.agent-system/`).
- **Andares** — Maestri's term for isolated workspace branches (its equivalent of a worktree).
- **Reference machine** — Fabio's own machine (Windows, where `.agent-system` is edited). The only
  machine whose test/verification results count as confirming a runtime's status for this project
  (established 2026-09-22, after a friend's separate macOS Antigravity test was ruled out as
  authoritative).

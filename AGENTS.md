# AGENTS.md

This project's engineering-team behavior (orchestration, agent roles, rules, gates, workflows) does not live in this file. It lives in `.agent-system/`.

- `.agent-system/manifests/system.yaml` — the map of what exists: supported runtimes, agents, plugins, required capabilities, current project status.
- `.agent-system/agents/` — one file per agent (orchestrator, spec, product, architecture, backend, pwa, admin, qa, security, infra, code-review, adr, ponytail), each describing that agent's purpose, scope, and process, runtime-agnostic.
- `.agent-system/rules/engineering-rules.md` — the full engineering rules this project runs on (git flow, commit format, review process, security invariants). Read that file for the complete rule bodies; this file only states the ones that must never be dropped.

## Non-negotiable rules (any runtime, no exceptions)

These apply regardless of which AI runtime is reading this file (Claude Code, Codex, Antigravity, or otherwise). Follow whatever attribution convention this session's host normally uses, then apply this project's override on top of it:

1. **Nunca inclua trailer de co-autoria de IA em commits deste projeto.**
2. Never alter Windows environment variables — not even for debugging — without asking first.
3. Commit message format: `[TIPO] - descrição curta`, where `TIPO` is one of `ADD` `FIX` `UPD` `DEL` `DOC` `CFG`.
4. Merging a pull request is always human-only. No AI runtime merges a PR, regardless of prior authorization from the user.

For everything else — full rule text, gates, workflows, per-agent behavior — see `.agent-system/`.

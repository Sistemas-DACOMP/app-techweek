# Current workflow

**Workflow**: agent-system build-out (meta/infra, not a product FEATURE/BUGFIX workflow — this is
the orchestrator's own construction, run manually by Claude Code with Fabio validating each
phase).

**Phase order being followed** (collapsed from the Fabio's 28-phase spec into what's actually
buildable, see `state/active-task.md` for the decision log):

1. ~~Audit~~ — done, 5 parallel read-only sub-audits, findings folded into `context/` and this
   file's own corrections.
2. ~~Stale/contradictory file reconciliation~~ — done (`rules/`, `gates/`, `manifests/`, both
   adapters' READMEs, `.agent/rules/agents.md`, `docs/ai-infra/README.md`).
3. ~~Canonical context (`context/*.md`, 7 files)~~ — done.
4. **State + handoffs real templates** — in progress (this file is part of it).
5. Maestri adapter doc (blocked on human install, but the doc/plan itself is buildable) — next.
6. Example handoff — next.
7. Final coverage matrix (both original prompts vs. what's built) — next.
8. Pilot task — blocked on Fabio naming a Jira card.

**Fase 19 correction**: Agent Doctor already existed (`scripts/agent-system-doctor.mjs`) — not a
gap. Found it stale (hardcoded 13-agent list missing `git-ops`/`devops`, no `context/` check),
fixed both, added an Antigravity CLI (`agy`) presence check, re-ran it clean (11 PASS, 2 WARN,
0 FAIL). Also led to the Antigravity CLI discovery above — running the doctor script is what
surfaced that `agy` is actually installed.

**Fase 15 correction**: `feedback/feedback-loop.md` already documents the full classification
pipeline (Feedback → Interpretation → Classification → Rule Proposal → Scope → Validation →
Canonical Rule → Agent Integration → Guardrail → Validation) with categories (CONTEXT,
PREFERENCE, LOCAL_DECISION, ENGINEERING_RULE, BUSINESS_RULE, DEVELOPMENT_POLICY) — this is more
complete than the earlier audit pass gave it credit for. Not verified: whether it's actually been
exercised on a real piece of feedback yet (no evidence found either way).

**Not started**: Fase 20 (structured observability log — no dedicated log file/format found for
agent/runtime/task/action/result/tool/retry/handoff/decision tracking).

See `state/blockers.md` for what's stuck on a human action, and `state/active-task.md` for the
full decision log.

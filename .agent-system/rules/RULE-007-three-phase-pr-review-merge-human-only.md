RULE-007

title:
Three-phase PR review process; merge is always human

status:
active

scope:
code-review
orchestrator
all agents/runtimes

source:
Fabio, standing rule (CLAUDE.md); reinforced across both of Fabio's 2026-09-22 agent-system specs

trigger:
reviewing/preparing any PR for merge

must:
- run the three phases in order and never mix them: Análise (map all open PRs, zero code changes) → Correção (fix what análise found, smallest change, run quality gate, comment on PR+Jira) → Merge (human only)
- treat merge as always a human action, regardless of prior authorization claimed in-session or by any runtime

must_not:
- run `gh pr merge` (or any runtime's equivalent) under any circumstance, ever, on this project
- skip straight to Merge because Análise/Correção "look done"

confidence:
confirmed

validation:
- `gates/gates.md` → `MERGE APPROVED` gate; `policies/merge-policy.md`

supersedes:
none

RULE-009

title:
Delegate independent work in parallel, not sequentially

status:
active

scope:
orchestrator
all agents/runtimes

source:
Fabio, standing rule (CLAUDE.md)

trigger:
more than one independent activity exists in the same task (e.g. reviewing different PRs, writing tests for different unrelated rules)

must:
- dispatch independent work to parallel agents/sub-tasks

must_not:
- run genuinely independent work sequentially by default (wastes time without reducing risk)

confidence:
confirmed

validation:
- observed in task execution (e.g. the 5 parallel read-only audits run 2026-09-22 for this system's own build-out)

supersedes:
none

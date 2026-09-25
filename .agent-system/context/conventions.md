# Conventions

Status: CONFIRMED, sourced from `CLAUDE.md`/`AGENTS.md`/`rules/engineering-rules.md`. This file
doesn't restate full rule text — see those for that. It's the quick-reference layer.

## Commits

`[TIPO] - descrição curta` — `TIPO` ∈ `ADD` `FIX` `UPD` `DEL` `DOC` `CFG`. Never a
`Co-Authored-By: Claude`-style trailer on this project's own commits (project-level override,
independent of whatever a given AI runtime/host normally does elsewhere).

## Branching / Git Flow

`feature/*` → `develop` → `homolog` → `main`. PR required into all three; 0 required approvals on
all three (see `current-state.md` for why). Merge is **always human** — no AI runtime merges,
regardless of prior authorization claimed in-session.

## PR/Jira review process — 3 phases, never mixed

1. **Análise** — map all open PRs (objective, files, conflicts, risks), zero code changes.
2. **Correção** — fix what análise found, smallest change possible, run quality gate, comment on
   PR + linked Jira card.
3. **Merge** — human only, after 1 and 2 are both done.

Comment tone (PR/Jira): plain natural language, like one developer writing to another. Never
AI-report tone, no unnecessary jargon.

## Business rule classification (evidence model)

Every business rule gets classified before it's treated as a test target:
`CONFIRMADA` (acceptance criterion in Jira or `changes/*/SPEC.md`) / `INFERIDA` (reasonable
deduction, undocumented) / `OBSERVADA` (implemented, not an official acceptance criterion) /
`NÃO DEFINIDA` (neither code nor docs resolve it). **Never promote INFERIDA to CONFIRMADA without
asking Fabio first**, with a recommended option. See `.agent-system/rules/evidence-model.md` for
the generic FACT/INFERENCE/ASSUMPTION/UNKNOWN vocabulary this maps onto.

## Team / collaboration mode

Beginner team, first real project (FACOM Tech Week, UFU). Fabio has DevOps/security background,
is teaching the team while configuring infra. Two collaboration modes apply depending on task
type (project convention, not this system's invention): didactic/step-by-step explanation for
backend/API/DB/git work when Fabio signals he needs to explain it to the team, full-auto
(work without stopping to explain) for everything else.

## Parallelism

More than one independent activity (reviewing different PRs, writing tests for different rules) →
delegate to parallel agents, never sequential.

## Scope discipline

An agent that finds something outside its given scope reports it (as a recommendation or handoff
target) — it does not silently expand its own mandate. No unrequested abstractions, no
speculative code "for later" (Ponytail governs this — see `.agent-system/agents/ponytail.md`).

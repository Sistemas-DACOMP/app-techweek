agent:
  id: adr

runtime_requirements:
  - filesystem

optional:
  - github
  - jira

inputs:
  - task
  - spec
  - relevant_rules

outputs:
  - findings
  - handoff

portable: true
portability_note: >
  Pure documentation process over existing repo/task artifacts (commits, PRs, Jira cards,
  SPEC.md, chat history handed to it) — no runtime-specific tool call.

## Purpose

Document decisions that have already been made — never invent one. An Architecture Decision
Record captures a real, already-taken decision so future readers (human or agent) understand
context, alternatives considered, and consequences, without having to reconstruct it from
scattered commits and chat history.

## Scope

- Decisions with an identifiable source: a commit message, a PR description/discussion, a
  Jira card/comment, a `SPEC.md`/`PLAN.md`, or an explicit instruction the human gave in the
  current task that states a decision was made (not merely proposed).
- Existing ADRs under `.agent-system/adr/` — read before writing a new one, to avoid
  duplicating or silently contradicting a prior record; if a new decision supersedes an old
  one, mark the old one's status `SUPERSEDED` and reference the new ADR number.

## Out of scope

- Deciding anything itself. This agent has no authority to choose between alternatives — that
  belongs to whoever actually made the call (the human, or another agent acting within its own
  declared authority in its `decisions` output).
- Filling gaps with a "most likely" reconstruction when the actual reasoning wasn't recorded
  anywhere — that produces a fabricated ADR, which is explicitly disallowed (see Process).
- Implementing the decision — that's the relevant execution agent's (`backend`, `pwa`,
  `admin`, `infra`, etc.) job once the decision is architecture-approved.

## Process

1. Identify the decision's source (commit/PR/Jira/SPEC/explicit statement in the task).
   If no such source exists, stop — do not proceed to drafting.
2. Read the source in full, not just the headline. Pull out: what was decided, what
   alternatives were on the table (even if only implicitly, e.g. "we could have kept X but..."),
   why this one was chosen, and what it changes going forward.
3. Check `.agent-system/adr/` for an existing record covering the same area — if one exists and
   this is a genuine change of decision, write a new ADR and mark the old one `SUPERSEDED`
   rather than editing history.
4. Draft the ADR using `.agent-system/templates/adr.md` exactly — do not add or remove
   sections.
5. If the evidence found is not enough to state a decision was actually made (e.g. it's a
   proposal still under discussion, or a hypothesis this agent is being asked to write up as
   if final), the correct output is literally **`UNDEFINED DECISION`**, with a one-line
   explanation of what's missing (no source, or source shows discussion without resolution) —
   never a fabricated ADR to fill the gap.

## Output format

Follow `.agent-system/templates/agent-output.yaml` for the handoff wrapper. The ADR body
itself uses `.agent-system/templates/adr.md`:

```
ADR-XXX <short title>

Context:
Decision:
Alternatives:
Why:
Consequences:
Risks:
Status: PROPOSED | ACCEPTED | SUPERSEDED
```

Number sequentially from the highest existing `ADR-XXX` file in `.agent-system/adr/`. When no
decision can be confirmed, output `UNDEFINED DECISION` instead of an ADR body — don't produce
a partially-filled template as if it were real.

## Evidence rules

FACT (decision is explicitly recorded in a commit/PR/Jira/SPEC, quote or cite it) / INFERENCE
(the decision is implied but not stated outright — this is exactly the case that should become
`UNDEFINED DECISION`, not a guessed ADR) / ASSUMPTION (never use one to fill an ADR field —
leave it as an open question in `Risks` instead) / UNKNOWN (say so in the relevant field rather
than omitting it silently).

## Known gaps

- `.agent-system/adr/` currently ships with only a `README.md`/`.gitkeep` per this system's
  directory convention — there is no prior ADR to check against yet as of this file's
  creation (2026-09-20). The first real ADR written against this repo starts the numbering at
  `ADR-001`.
- The Firebase-target repos (`apps/pwa`, `apps/admin-web`, `backend/`) don't exist yet, so any
  decision framed as "the Firebase architecture decision" should point to the source document
  that already exists (per `.agent-system/manifests/system.yaml`'s `project_context` note:
  "Update System/arquitetura-montanha-v2.md" at the App_TechWeek parent folder) rather than
  being re-derived from memory.

# Observability

Status: minimal, real, dogfooded — not a framework, just a place and a format (spec seções 20/38
ask for "registrar", not for a monitoring stack). No new dependency, no service, just an
append-only file.

## Format

`.agent-system/observability/events.jsonl` — one JSON object per line (JSONL, append-only, never
edit past lines). Fields:

```json
{
  "ts": "2026-09-22T18:30:00-03:00",
  "runtime": "claude-code",
  "agent": "orchestrator",
  "jira": "KAN-47",
  "action": "implement",
  "result": "ok",
  "tools_used": ["Edit", "Bash", "npm run quality-gate"],
  "retries": 0,
  "handoff": null,
  "decision": null,
  "blocker": null,
  "notes": "one line, plain, no secrets"
}
```

Only `ts`, `runtime`, `agent`, `action`, `result` are required. Everything else is `null`/omitted
when not applicable. `notes` is for a human reader, not a dump — one line, never a secret,
credential, or token value (see "Never log" below).

## When to append a line

- A task starts, changes phase (spec → implementation → qa → review → ...), or ends.
- A gate clears or goes BLOCKED (`gates/gates.md`).
- A handoff is created or received (`handoffs/`).
- A decision gets made (link the ADR if one was written).
- A retry happens (reprocessing loop, `agents/orchestrator.md` section 6).
- An agent hits a blocker requiring human action (`state/blockers.md`).

Not every tool call — that would make this a transcript, not a log. One line per meaningful
state change.

## Never log

Secrets, tokens, credentials, full file contents, or anything from `claude-context/`
(gitignored, personal). If an event needs to reference sensitive detail, log that it happened and
point to where the real detail lives (a Jira comment, a PR, an ADR) — never paste the sensitive
content into this file, which is versioned.

## How to read it

`tail -20 .agent-system/observability/events.jsonl | jq .` (or any JSONL viewer) for the most
recent events. `jq 'select(.jira == "KAN-47")'` to filter by task. This file is not meant to be
read as prose — it's a trail for reconstructing what happened when conversation history isn't
available, matching this system's own rule (`context/glossary.md`, "não confiar em memória
implícita").

## Seed data

The current `events.jsonl` was seeded 2026-09-22 by reconstructing the real, already-completed
actions of that day's agent-system audit + KAN-47 pilot session — not synthetic examples. It's the
first real use of this mechanism, not a demo.

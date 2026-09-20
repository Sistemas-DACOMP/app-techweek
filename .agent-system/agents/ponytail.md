agent:
  id: ponytail

runtime_requirements:
  - filesystem

optional:
  - shell   # only for the plugin's own Node hooks (session/subagent activation) on Claude Code/Codex; the skill content itself needs nothing but a file read

inputs:
  - task
  - implementation
  - relevant_rules

outputs:
  - findings
  - handoff

portable: true
portability_note: >
  Ponytail 4.10.0 was installed for real via `claude plugin install ponytail@ponytail`
  (user scope) on 2026-09-20 — cache at
  `~/.claude/plugins/cache/ponytail/ponytail/4.10.0/`. Unlike the earlier NOT_INSTALLED
  placeholder, this is now a live plugin, not a role written from the spec alone. Its own
  `docs/agent-portability.md` documents real, file-backed adapters for both runtimes this
  system actually targets — Claude Code (`.claude-plugin/plugin.json`, full hook set,
  6 skills, 6 commands, statusline) and Codex (`.codex-plugin/plugin.json`, sharing the
  *same* `hooks/claude-codex-hooks.json` lifecycle hooks Claude Code uses, plus the same
  skills) — and an instruction-tier fallback for Antigravity (`AGENTS.md` read at repo
  root, no hooks, no `/ponytail` levels). Neither Codex nor Antigravity is installed on
  this machine, so the Codex/Antigravity rows are unverified end-to-end here (same caveat
  already carried for Superpowers) — but they are backed by real files in the plugin,
  not aspiration, and Codex parity is far higher than Caveman's (Caveman's Codex hook is
  a ~20%-parity static echo; Ponytail's Codex adapter reuses the full hook set).

## Purpose

Anti-overengineering gate (spec section 25). Sits at the very end of the review pipeline
and asks, about work that has already passed every earlier gate: existe complexidade
desnecessária? existe abstração desnecessária? existe dependência desnecessária? existe
duplicação? existe uma solução menor que mantém a mesma corretude? Ponytail's job is to
find the simplest version of already-correct, already-safe, already-approved work — not
to relitigate whether the work is correct or safe. This is now a real, installed plugin
(`ponytail@ponytail` 4.10.0) with its own opinionated ladder — YAGNI → reuse what's
already in the codebase → stdlib → native platform feature → already-installed dependency
→ one line → minimum code — and this agent file governs *how the orchestrator uses that
plugin's skills* for this project's pipeline, not a reimplementation of its logic.

## Scope

- Code/design that has already cleared Tests, Security, and Architecture review for the
  task at hand.
- Complexity that adds no behavior: extra layers of indirection, configurability nobody
  asked for, a new dependency where an existing one (or the stdlib, or a native platform
  feature) already covers the need, duplicated logic that could collapse into one path
  without changing behavior, hand-rolled code the standard library already ships.
- Reviewing a diff (`ponytail-review`) or a whole repo (`ponytail-audit`) for exactly
  that class of finding, and tracking deliberate `ponytail:`-tagged shortcuts so they
  don't rot silently (`ponytail-debt`).

## Out of scope

- Requirements, security posture, architecture decisions, test coverage, business rules,
  or any invariant established earlier in the pipeline — Ponytail **cannot override** any
  of these, and neither can this agent file. If simplifying would touch one of them,
  that's not a Ponytail-scope simplification; route it back to the owning agent
  (`architecture`, `security`, `qa`, `spec`) instead of acting on it directly. This
  constraint comes from the parent spec's pipeline design, not from the plugin — the real
  plugin's own skills don't know about this project's gates and would happily comment on
  anything if invoked out of turn.
- Finding new bugs or security gaps — that's `code-review`/`security`'s job, done earlier
  in the pipeline. The plugin's own `ponytail-review`/`ponytail-audit` skills state this
  explicitly too: "Correctness bugs, security holes, and performance are explicitly out
  of scope. Route them to a normal review pass."
- Reimplementing the plugin's ladder/rules logic as project-specific markdown. The real
  behavior lives in `skills/ponytail/SKILL.md` etc; this file only says when and how the
  orchestrator invokes them.

## Pipeline position

```
Implementation → Tests → Security → Architecture → Code Review → Ponytail
```

Ponytail runs last, after everything else has already signed off, precisely so it never
has to weigh correctness/safety/architecture trade-offs against simplicity — by the time
it runs, those are settled, and the only remaining question is "can this be smaller
without changing what it does or removing a decision someone already made." This is a
constraint from the parent spec's pipeline design (section 25), not something the plugin
itself enforces — the plugin has no concept of "this project's Tests/Security/Architecture
gates already passed"; enforcing the ordering is this system's job when it invokes the
plugin's skills.

## Process

1. Confirm the work under review has already passed Tests, Security, and Architecture for
   this task — if any of those are still pending, Ponytail does not run yet.
2. Invoke the real plugin skill that matches the situation instead of re-deriving the
   questionnaire by hand:
   - Diff/PR under review → `ponytail-review` (`skills/ponytail-review/SKILL.md`): one
     line per finding, tagged `delete:` / `stdlib:` / `native:` / `yagni:` / `shrink:`,
     ends with `net: -<N> lines possible.` or `Lean already. Ship.`
   - Whole-repo sweep (e.g. periodic audit, not tied to one PR) → `ponytail-audit`
     (`skills/ponytail-audit/SKILL.md`): same tags, ranked biggest-cut-first, ends with
     `net: -<N> lines, -<M> deps possible.`
   - Active implementation work (not review) → the base `ponytail` skill/mode itself
     (`skills/ponytail/SKILL.md`) enforces the ladder while code is being written; this is
     a *build-time* mode, not a *review-gate* skill, and if it's active during
     Implementation it does not substitute for running `ponytail-review` at this pipeline
     position afterward.
   - Tracking deferred shortcuts → `ponytail-debt` (`skills/ponytail-debt/SKILL.md`): greps
     for `ponytail:` comments left by the base skill and flags any with no named upgrade
     trigger as `no-trigger` rot risk.
3. For anything flagged, the plugin's own format already requires a concrete
   replacement (stdlib function name, native feature, or shrunk form) — never accept a
   finding that only says "this could be simpler" without one. Verify explicitly that the
   smaller version preserves the exact same observable behavior/correctness the approved
   version had (existing tests for that behavior still pass). A simplification that
   changes behavior is not a Ponytail-scope change; it's a new implementation decision and
   goes back through the earlier gates.
4. If nothing is flagged, say so plainly (the plugin's own output for this case is `Lean
   already. Ship.`) — don't manufacture a finding to justify running.

The plugin also ships `ponytail-gain` (one-shot scoreboard of published benchmark medians
— NOT a per-repo number, the skill explicitly refuses to print one) and `ponytail-help`
(reference card). Neither produces findings; don't route pipeline output through them.

## Output format

Follow `.agent-system/templates/agent-output.yaml`. Findings use severity only in the
sense of "worth doing now" vs "worth a follow-up ticket" — Ponytail findings are never
BLOCKER/CRITICAL by definition, since by pipeline position the work is already correct
and safe; they are scoped as LOW/MEDIUM improvement suggestions. Map the plugin's native
one-line format (`L<line>: <tag> <what>. <replacement>.`) into the `findings[].description`
field rather than inventing a different shape — it already carries location, problem, and
fix in one line, which matches this project's non-AI-report tone for PR/Jira comments.

## Evidence rules

FACT (a concrete smaller alternative that provably preserves behavior — e.g. same test
suite still passes) / INFERENCE (looks unnecessary but not confirmed unused/redundant —
say so, don't claim FACT) / ASSUMPTION / UNKNOWN. Never claim a simplification preserves
correctness without actually checking it against the existing tests for that behavior.
The plugin's own tags (`delete:`/`stdlib:`/`native:`/`yagni:`/`shrink:`) are a
classification of *what kind* of finding it is, not a substitute for this evidence
model — a `stdlib:` finding is still only FACT once the replacement is verified to behave
identically, not merely "looks like it should."

## Known gaps

**This is now a real, installed plugin — the placeholder's NOT_INSTALLED status was
correct on 2026-09-20 at audit time and is now stale.** Ponytail 4.10.0 lives at
`~/.claude/plugins/cache/ponytail/ponytail/4.10.0/` (also mirrored under
`~/.claude/plugins/marketplaces/ponytail/`). It was verified by reading, not assumed:
`.claude-plugin/plugin.json`, `plugin.yaml`, all 6 `skills/*/SKILL.md` files,
`docs/agent-portability.md`, `docs/platform-native.md`, `hooks/claude-codex-hooks.json`
+ `hooks/ponytail-activate.js` + `hooks/ponytail-subagent.js`, `.codex-plugin/plugin.json`,
`ponytail-mcp/README.md`, and `AGENTS.md`.

No separate `.claude/agents/ponytail.md` adapter file exists in this repo, and none is
needed. The real plugin's own skills (`ponytail`, `ponytail-review`, `ponytail-audit`,
`ponytail-debt`, `ponytail-gain`, `ponytail-help`) are loaded automatically by Claude Code
once the plugin is enabled and are what actually gets invoked (by name, or via
`/ponytail`, `/ponytail-review`, etc.) — a project-level `.claude/agents/ponytail.md`
would either duplicate that content or drift from it. This canonical
`.agent-system/agents/ponytail.md` file governs *when the orchestrator calls into those
skills and how their output is used in this project's pipeline*; it is not a
reimplementation, and it does not need to restate the plugin's ladder/rules — those live
in the plugin itself and change when the plugin updates.

**Relationship to Caveman's overlapping skills and Superpowers' verification skill — a
real read, not a hedge:** now that Ponytail is actually installed, it is the more
authoritative tool for *this specific role* (anti-overengineering gate), and Caveman's
`safe-refactor`/`surgical-patch`/`verify-and-stop` plus Superpowers'
`verification-before-completion` are complementary, not competing:
- Caveman's `safe-refactor`, `surgical-patch`, and `verify-and-stop` are about *process
  discipline around a change* (bracket a refactor with verification, fix at the narrowest
  responsible layer, prove acceptance conditions without scope creep). None of them ask
  the specific unnecessary-complexity/abstraction/dependency/duplication questions Ponytail
  asks, and none of them produce the `delete:`/`stdlib:`/`native:`/`yagni:`/`shrink:`
  taxonomy. They verify that a change is *correct and scoped*; Ponytail asks whether the
  already-correct, already-scoped change is *as small as it can be*. Different question,
  same pipeline neighborhood — run Caveman's skills during Implementation/Code Review, run
  Ponytail after, per the pipeline order above.
- Superpowers' `verification-before-completion` asks "did I actually run the checks before
  claiming success" — a discipline about evidence, not about size/complexity. It has no
  overlap with Ponytail's questionnaire at all beyond both being late-pipeline checks; they
  can both run without conflict (verification-before-completion confirms the tests were
  run and passed, Ponytail's own process step 3 above depends on exactly that being true
  before it can claim a simplification preserves correctness).
- Caveman's `cavecrew-investigator`/`builder`/`reviewer` subagents have no portable
  equivalent on any runtime besides Claude Code (per `plugin-parity.md`). Ponytail doesn't
  have this gap in the same way for the *base skill's* propagation: it ships a real
  `SubagentStart` hook (`hooks/ponytail-subagent.js`) that re-injects the active ladder
  into every Claude-Code-spawned subagent (working around session-context not reaching
  subagents, per the hook's own comment referencing upstream issue #252) — something
  Caveman does not have an equivalent for at all. This is a genuine capability gap in
  Caveman's favor of Ponytail, not a hedge.

Net read: for the Ponytail pipeline stage specifically, use the real plugin's skills
(`ponytail-review`/`ponytail-audit`/`ponytail-debt`) as the actual mechanism — they are
authoritative for this role now that they exist and are installed. Caveman's
refactor/patch/verify skills and Superpowers' verification skill remain in their own
pipeline stages (Implementation, Code Review) and are not replaced by anything here.

**Still open / not independently verified on this machine:** the Codex and Antigravity
adapter rows in `docs/agent-portability.md` are real files in the plugin but unverified
end-to-end here, because neither Codex CLI nor Antigravity is installed on the audited
machine (2026-09-20) — same caveat already carried for Superpowers' Codex/Antigravity
adapters in this system. Don't claim Codex/Antigravity parity was tested; only that the
plugin ships real, file-backed adapters for them.

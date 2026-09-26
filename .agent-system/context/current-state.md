# Current state

Snapshot date: 2026-09-22. This file rots fast — re-verify against `git log`, `gh pr list`, and
Jira before trusting it for anything older than a couple of days back.

## Git / PR state (CONFIRMED, 2026-09-22)

- Branch: `develop`. Zero open PRs (`gh pr list --state open` → empty, all bases).
- Branch protection: `main`/`homolog`/`develop` all require PR, all require 0 approvals
  (see `rules/engineering-rules.md` for why — GitHub blocks self-approval, team too small for a
  guaranteed second reviewer). `enforce_admins` true on main/homolog, false on develop.
- One active git worktree: `.claude/worktrees/kan45` on `feature/KAN-45-login-firebase-v2`, last
  touched 2026-09-21. Now gitignored (fixed 2026-09-22 — was untracked/unignored before).
- Hygiene gaps found 2026-09-22, not yet cleaned: two orphaned `worktree-agent-*` branches, and
  several `fix/resolve-conflito-*`/`feature/agent-*` branches of unconfirmed merge status. Needs
  Fabio's confirmation before deleting anything (destructive).

## Firebase migration (CONFIRMED)

Done in `src/` and `backend/` of this same repo (in-place, not a repo split — see
`architecture.md`). `@supabase/supabase-js` removed from `package.json` 2026-09-21.
`scripts/seed-admin.js` still imports it (dead/broken script, old-app leftover, low priority,
not yet fixed).

`main` (production, GitHub Pages) has **not** received the Firebase migration yet — still the old
Supabase-era app. `develop`/`homolog` have it. A known security fix (hardcoded credential removal
in `seed-admin.js`, commit `a97375a`) is on `develop` but never promoted to `main` — low priority
since the old app is being replaced, not patched.

## Open Jira gaps (OBSERVED from board + PR history, re-verify before acting)

- KAN-60 (custom claims role management) and KAN-61 (push FCM) — still open per CLAUDE.md's last
  full state read; `/api/admin/users/:uid/role` route exists in code (per `architecture.md`) so
  KAN-60 may be further along than the card suggests — **verify against the actual card before
  assuming either status**, this board has a documented history of drifting from real PR state
  (KAN-45, KAN-73 and others cited in project memory).
- KAN-71/72/73 (Firebase versions of the old Supabase-era LGPD/avatar/scanner gaps) — merged per
  prior session record (PR #58/#51/#59), superseding the closed KAN-28/29/30.

## Agent-system state (CONFIRMED, this is what `.agent-system/` itself looked like before the
2026-09-22 audit+fix pass that produced this `context/` directory)

- `.agent-system/state/` and `.agent-system/handoffs/` were empty scaffolding (README + .gitkeep
  only) — no live task has ever run through them. Still true as of this writing; populating them
  with a real task is the next phase, not yet done.
- Several canonical files were stale/contradictory and were corrected 2026-09-22: `engineering-rules.md`
  (develop approval count), `gates.md` (ponytail install status), `manifests/system.yaml`
  (project_context describing an unexecuted 3-repo split as current, Antigravity verification
  claim), `adapters/antigravity/README.md` (false "verified" claim — see below), `.agent/rules/agents.md`
  (pre-rename agent names, no pointer to canonical source), `docs/ai-infra/README.md` (Supabase
  setup instructions, 5-agent roster instead of 15, pre-rename agent names).
- Antigravity status: corrected three times in one day (2026-09-22), each correction real and
  evidence-based, not guessed. (1) A prior "verified & operational on macOS" claim came from a
  friend's separate machine, not Fabio's — per his decision, doesn't count here. (2) The `agy` CLI
  turned out to actually be installed on Fabio's own machine — so "not installed" was also wrong.
  (3) With Fabio's explicit standing authorization to use `--dangerously-skip-permissions` for
  Antigravity testing, a real end-to-end task was completed: `agy` read `AGENTS.md` +
  `.agent-system/context/*` + `state/active-task.md` and wrote a correct, independent Context
  Understanding Report (`state/antigravity-context-report-2026-09-22.md`) — it even surfaced the
  same two open questions already tracked here. Real status now: **verified, headless print mode,
  with the skip-permissions flag**. Untested: `--mode plan` (hangs headless — its plan-approval UI
  has no headless equivalent) and normal interactive session behavior. See `state/blockers.md` and
  `manifests/system.yaml`.
- Maestri (external multi-agent canvas app, themaestri.app): not integrated. No CLI/API exists —
  it's a GUI-only desktop app, so integration requires a human install/configure step. See
  `.agent-system/adapters/maestri/README.md`.

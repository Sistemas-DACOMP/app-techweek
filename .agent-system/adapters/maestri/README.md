# Maestri adapter

Status: **NOT INSTALLED — blocked on human GUI action.** Maestri is a connection/coordination
layer, never a source of canonical knowledge — that stays in `.agent-system/` regardless of
whether Maestri is wired up (see `context/integrations.md` and the project's own principle:
"O Maestri NÃO deve ser tratado como fonte de verdade do projeto").

## What it is (confirmed 2026-09-22, from themaestri.app)

Native desktop app ("infinite canvas") for visually orchestrating multiple AI coding agents:

- Connects agent terminals so they can pass work between themselves directly, without a single
  coordinator becoming a bottleneck.
- Visual canvas: drag-and-drop, shows agent relationships and project state, hand-drawn
  architecture diagrams.
- Role assignment per agent (lead, programmer, reviewer, tester, etc.).
- Device portals: connect agents to browsers, iOS simulators, Android emulators, physical devices.
- "Ombro" — on-device AI assistant summarizing agent progress.
- "Partituras" — saved/reusable orchestration configurations.
- "Andares" (floors) — isolated workspace branches for parallel work without interference (this
  project's rough equivalent: a git worktree per agent, see `agents/orchestrator.md` and
  `context/current-state.md`'s worktree section).
- Supports Claude Code, Codex, OpenCode, and standard shells (per its own page — Antigravity not
  explicitly listed; untested whether a generic shell connection covers it).
- **No CLI, no API.** Free tier: 1 workspace. Pro: R$95 one-time, unlimited workspaces + multi-Mac.
  Fully local, zero telemetry, no account required.
- Windows build exists (this project's reference machine is Windows) — also macOS 15.4+/Apple
  Silicon and Linux.

## Why this stays a human action

Every other piece of this Agent System (`context/`, `rules/`, `gates/`, agent files, adapters) is
a file this system can read, write, and validate with evidence (a command ran, an output was
captured). Maestri has no such surface — no CLI to script, no config file this system can write to
pre-configure a workspace, no API to confirm a connection programmatically. Installing and
configuring it are literally mouse clicks on a canvas. That's a hard boundary, not a shortcut this
system failed to find.

## Exact human steps (Fabio)

1. Download the Windows build from `https://www.themaestri.app/pt-br`.
2. Install (free tier is enough to start — 1 workspace, all core features).
3. Open Maestri, create a workspace pointed at this repo
   (`C:\Users\fabio\App_TechWeek\app-techweek`).
4. On the canvas, add one terminal node per runtime you want connected — at minimum, a Claude Code
   node (this session's own kind). Add an Antigravity node once its own verification (see
   `state/blockers.md` → "Verificação real do Antigravity") is unblocked — connecting an unverified
   runtime to a shared canvas before it's been exercised once on its own adds risk without adding
   information.
5. Assign roles per node matching this system's logical agents (see `manifests/system.yaml` →
   `agents:`) — Maestri's roles are free-text/visual, not a fixed enum, so use this project's own
   agent ids (`orchestrator`, `backend`, `qa`, `security`, etc.) as the role labels for consistency
   with everything else in `.agent-system/`.
6. If you want isolated parallel work per agent (this system's `agents/orchestrator.md` →
   "worktree isolation" concern, Fase 11 of the original spec), use Maestri's "Andares" — but
   still point each floor at a real git worktree (`git worktree add`), don't rely on Maestri's own
   isolation as a substitute for git's; two agents editing the same working tree is a Git-level
   risk Maestri's canvas doesn't remove.

## How to validate once done

- Confirm the app opens and shows a workspace pointed at this repo.
- Confirm at least one terminal node is connected and can run a command in the repo.
- Report back so `manifests/system.yaml` can be updated with a real status (installed, version,
  what's connected) instead of "not installed."

## What this system will do once Maestri is confirmed installed

Nothing automatically — Maestri coordinates terminals a human already opened; it doesn't run tasks
on its own. Once connected, work still flows through the same `.agent-system/` process (task
context, gates, handoffs) — Maestri just gives Fabio a visual way to watch and route between the
terminals doing that work, per the project's own principle that Maestri is a connection layer, not
a decision-maker.

# Integrations

Status: CONFIRMED unless marked otherwise, 2026-09-22 audit.

## Firebase / GCP

- Single project: `facom-techweek-layerx`, used for both `default` and `prod` aliases in
  `.firebaserc`. Whether a separate homolog Firebase project exists is **unconfirmed** — treat as
  one project until proven otherwise.
- Firebase CLI installed (15.30.2+). `gcloud` CLI **not installed** on the reference machine —
  direct GCP API/IAM/Cloud Build work is blocked until someone installs it.
- Cloud Function: 2nd gen, `us-east1`, 256MiB, maxInstances 10. Target architecture doc (parent
  folder, unversioned) says `southamerica-east1` — documented, unresolved divergence.

## Hosting

- Production (old Supabase-era app): GitHub Pages, `main` branch, via `deploy.yml` — stale
  (still Supabase env vars), needs a rewrite before/when `develop`'s Firebase code promotes to
  `main`.
- Homologação: Vercel, team `facomtechweek`, project `app-techweek-homolog`, Production Branch =
  `homolog`.

## Jira

Project `KAN`, `app-teckweek.atlassian.net`. 70 issues total as of 2026-09-22. Source of truth for
tracking — but this board has a documented history of showing status ("develop", "in progress")
without a real PR behind it (KAN-45, KAN-73 and others, per project memory) — **always verify
against `gh pr list`/actual code before trusting a card's status alone.**

Access: Atlassian MCP connector (`claude.ai Atlassian` / `mcp__claude_ai_Atlassian__*`), OAuth,
per-person, account-level not repo-versioned. `git-ops` agent has a hardcoded subset of these
tools in its `.claude/agents/git-ops.md` frontmatter.

## GitHub

`gh` CLI (2.98.0+, authenticated). GitKraken MCP tool group also available
(`git_*`/`pull_request_*`/`issues_*`/`gitlens_*`) as an alternative to raw `gh`.

## Maestri (external, not yet integrated)

`themaestri.app` — native desktop "infinite canvas" for multi-agent orchestration (connects agent
terminals, visual role assignment, isolated workspace branches called "Andares"). No CLI/API —
GUI-only, so wiring it up is a human action, not something this system can script. Supports Claude
Code, Codex, OpenCode and standard shells per its own marketing page; Antigravity support unclear
(not explicitly listed). Windows build exists (this project's reference machine is Windows). See
`.agent-system/adapters/maestri/README.md` for the concrete human steps.

## Not integrated / explicitly removed

- Supabase — fully removed 2026-09-21 (was auth+DB before the Firebase migration). No MCP, no
  client library, no env vars for it anywhere in the current flow.
- Codex, GitHub Copilot — dropped as supported runtimes 2026-09-22 (ADR-002). Codex never had a
  real adapter (README only); Copilot's `.github/copilot-instructions.md` deleted.

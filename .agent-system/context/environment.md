# Environment

Status: CONFIRMED, reference machine = Fabio's, Windows 11.

## Reference machine

- OS: Windows 11 Pro.
- Shells: Git Bash (POSIX sh) and PowerShell 5.1, both available.
- Git 2.49.0, `gh` CLI 2.98.0 (authenticated), Firebase CLI 15.30.2+.
- `gcloud` CLI: **not installed** — blocks direct GCP API/IAM/Cloud Build work.
- `docker`: **not available**.
- Antigravity: CLI (`agy`) **is installed and verified working**, v1.2.7/1.2.8
  (`C:\Users\fabio\AppData\Local\agy\bin\agy`). A real end-to-end task (read 9 files, write a
  structured report) completed successfully 2026-09-22 using
  `--dangerously-skip-permissions --mode accept-edits` (Fabio's standing authorization for
  Antigravity testing). `--mode plan` does not work headless (hangs waiting for plan approval its
  print mode can't surface). See `context/current-state.md` and `state/blockers.md`.
- Maestri: not installed as of 2026-09-22 — see `context/integrations.md` and
  `.agent-system/adapters/maestri/README.md`.

## Repo layout gotcha (Claude Code specific, but real and costly if missed)

Claude Code's custom subagent discovery (`.claude/agents/*.md`) walks **up** from the session's
starting working directory to find the git root — it never walks down into subdirectories. If a
session opens in `C:\Users\fabio\App_TechWeek\` (the parent folder, not a git repo) instead of
`C:\Users\fabio\App_TechWeek\app-techweek\` (the actual repo), none of this project's 13 custom
agents register as dispatchable `subagent_type`s — only generic built-ins
(`general-purpose`, `Explore`, etc.) are available, even though `cd`-ing into the repo mid-session
does not fix it (discovery is fixed at session start). Skills don't have this problem (discovered
dynamically). **Always start Claude Code sessions with cwd inside `app-techweek/`.**

## Environments

| Environment | Where | Branch | Notes |
|---|---|---|---|
| Local dev | developer machine | any `feature/*` | `npm run dev` (Vite), Firebase emulators available (`firebase.json` has emulator config for auth/storage/functions/firestore+UI) |
| Homologação | Vercel, team `facomtechweek`, project `app-techweek-homolog` | `homolog` | Production Branch = `homolog` |
| Produção (old app) | GitHub Pages | `main` | Still Supabase-era app — Firebase migration not yet promoted here |

No separate homolog Firebase project confirmed — `.firebaserc`'s `default`/`prod` aliases point at
the same project id (`facom-techweek-layerx`). Treat as one shared Firebase project across
local/homolog/dev work unless Fabio confirms otherwise — this means care is needed not to pollute
shared data when testing.

## Secrets / env vars

`.env.local` (gitignored) holds Firebase web config for local dev — see `.env.example` for the
shape. Never ask for or expect Supabase credentials (removed project-wide 2026-09-21). Never alter
a Windows environment variable, even for debugging, without asking Fabio first (standing rule).

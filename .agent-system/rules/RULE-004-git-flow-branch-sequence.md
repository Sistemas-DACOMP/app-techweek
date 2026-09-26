RULE-004

title:
Git Flow branch sequence

status:
active

scope:
git
all agents/runtimes

source:
project convention (CLAUDE.md)

trigger:
starting any feature/fix branch, or proposing a merge target

must:
- branch from `develop` as `feature/<...>` (or `fix/*`/`hotfix/*` for the documented exceptions in `enforce-git-flow.yml`)
- promote `develop` → `homolog` → `main` in that order, never skipping a stage

must_not:
- open a PR directly into `main`/`homolog` from a `feature/*` branch (blocked mechanically by `.github/workflows/enforce-git-flow.yml`, but agents should not attempt it either)

confidence:
confirmed

validation:
- `.github/workflows/enforce-git-flow.yml` enforces this mechanically on every PR

supersedes:
none

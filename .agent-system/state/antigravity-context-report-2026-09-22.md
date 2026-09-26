# Context Understanding Report

## Project
FACOM Tech Week App for participants, staff, and sponsors. Built by a student team with Fabio providing DevOps/security guidance.

## Architecture
Single repo (React 19 + Vite in `src/`, Express + TypeScript in `backend/`). Deployed on Firebase (Auth, Firestore, Cloud Functions in `us-east1`). Previous Supabase setup is fully removed.

## Current Task
Audit and implement a multi-runtime Agent System (Claude Code + Antigravity, connected via Maestri). Current phase involves updating `.agent-system/` canonical context, adapters, and state.

## Requirements
Update `.agent-system/` directory structure, ensure agent files reflect the Firebase migration, and establish boundaries for Antigravity, Claude Code, and Maestri.

## Business Rules
Follow the `CONFIRMADA / INFERIDA / OBSERVADA / NÃO DEFINIDA` evidence model. Commits use `[TIPO] - descrição`. Pull requests require human merges (AI never merges).

## Relevant Files
- `AGENTS.md`
- `.agent-system/context/*.md`
- `.agent-system/state/active-task.md`

## Risks
Modifying the `.agent-system/` affects the developer workflow across all branches (`develop`, `homolog`, `main`). Destructive actions like deleting orphaned worktrees require explicit human confirmation.

## Decisions
Maestri is a GUI-only desktop app; setup must be manual. The reference machine for testing is strictly Fabio's Windows 11 setup.

## Unknowns
Whether the previously planned 3-repo split (`apps/pwa`, `apps/admin-web`, `backend`) is abandoned or still a future target. Existence of a separate Firebase homolog project is unconfirmed.

## Questions
- What real backlog item should be used for the Phase 24 pilot task?
- Should a Jira card be created for this agent-system effort?

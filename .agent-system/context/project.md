# Project

Status: OBSERVED/CONFIRMED mix, sourced from `CLAUDE.md`, `docs/business-rules/`, and the
2026-09-22 audit. Where something is inferred rather than confirmed, it's marked.

## What this is

FACOM Tech Week App — the companion app for a university tech event (FACOM/UFU). Participants,
staff and sponsors use it during the event; the team building it is a group of engineering
students on their first real software project, with Fabio (the user this system serves) providing
DevOps/security expertise and teaching the rest of the team as he goes.

## Problem it solves

- Participants: digital badge (QR), activity/workshop catalog + booking, attendance check-in via
  QR scan, gamified points/ranking, missions (e.g. Instagram engagement).
- Staff: scan participant QR at activity entrance/exit (double check-in), monitor capacity.
- Sponsors: scan participant QR to capture leads.

## Who's building it

Small student team, first real project. Fabio has DevOps/security background and is
simultaneously configuring the infra and teaching the team — see
`.agent-system/context/conventions.md` for how this shapes review/process expectations (didactic
mode for backend/API/DB/git work per project convention, full-auto for the rest).

## Current stack (CONFIRMED — see `architecture.md` for detail)

- Frontend (participant/staff/sponsor app): React 19 + Vite, in `src/` at repo root.
- Backend: Express + TypeScript, deployed as a single Firebase Cloud Function (2nd gen).
- Data/auth: Firebase (Auth, Firestore, Storage, Cloud Functions), single GCP project
  `facom-techweek-layerx`.
- No admin console exists yet in any form (`apps/admin-web/` referenced in some older docs as a
  future target — does not exist as of 2026-09-22).

## History that matters for context (don't re-litigate)

- Originally built on Supabase. Migration to Firebase decided 2026-09-20, executed **in place**
  in this same repo (not as a new split-repo architecture) — `@supabase/supabase-js` fully removed
  2026-09-21. See `current-state.md` for what that migration actually touched.
- This repo also hosts the multi-runtime agent-system meta-project (`.agent-system/`, this file's
  own directory) — that's process/tooling infrastructure for how the team+AI work together, not
  part of the product itself. Don't conflate the two when reasoning about "the project."

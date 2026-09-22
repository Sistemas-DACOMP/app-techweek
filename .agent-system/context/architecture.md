# Architecture

Status: CONFIRMED via direct code/config read, 2026-09-22 audit. Where the target architecture
diverges from current reality, both are stated — never silently pick one.

## Current reality (CONFIRMED)

```
src/            React 19 + Vite PWA — participant/staff/sponsor frontend
  pages/        Login, Register, Dashboard, Scanner, Ranking, Challenges, Profile,
                Onboarding, InstagramMission
  components/   LectureScanner.jsx, etc.
  contexts/     AuthContext.jsx — global session via Firebase onAuthStateChanged
  lib/          firebase.js, auth.js, gameplay.js, userService.js — zero Supabase imports
                (grepped, confirmed clean 2026-09-22)

backend/        Express + TypeScript, single Cloud Function (2nd gen, us-east1, 256MiB,
                maxInstances 10), entry backend/src/index.ts
  routes:       /api/auth (register, LGPD), /api/activities (:id/checkin, :id/reserve,
                :id/screen-token), /api/checkin (entrance/checkout double-check),
                /api/leads, /api/sympla/*, /api/points (KAN-79), /api/admin (KAN-60, role mgmt)
  middleware:   authMiddleware.ts, rateLimiter.ts (KAN-75)
  every route file has a paired .test.ts

firebase.json / .firebaserc / firestore.rules / firestore.indexes.json / storage.rules
                Single Firebase project `facom-techweek-layerx` for both `default` and `prod`
                aliases — no confirmed separate homolog Firebase project.
```

No `apps/pwa/` or `apps/admin-web/` split exists — everything participant-facing is `src/` at
repo root, no admin console exists in any form.

## Data model (OBSERVED, from Firestore rules/code — not a formal schema doc)

Collections covered by `firestore.rules`: `users`, `activities`, `announcements`, `bookings`,
`leads`, `pointEvents`, `checkins`. Points/gameplay logic lives server-side
(`backend/src/routes/points.ts`, KAN-80 mission catalog).

## Auth & authorization (OBSERVED)

Firebase Auth for identity. Roles (`ADMIN`, `STAFF`, `SPONSOR` per `.agent/rules/agents.md`'s
security-gate description) via custom claims — `PUT /api/admin/users/:uid/role` (KAN-60) is the
role-management endpoint. `authMiddleware.ts` gates backend routes; `firestore.rules` gates direct
client Firestore access.

## Target architecture (UNDEFINED whether still live — flag before assuming either way)

An earlier planning doc (`Update System/arquitetura-montanha-v2.md`, parent folder, not versioned
in this repo) describes a 3-repo split (`apps/pwa`, `apps/admin-web`, `backend/`) and a
`southamerica-east1` Cloud Function region. Neither materialized: the migration landed in-place in
this repo, and the real region is `us-east1` (free tier). Whether the 3-repo split is still a
future target or was quietly superseded by the in-place layout has never been confirmed by Fabio —
**ask before planning work that assumes either answer.**

## CI/CD (CONFIRMED)

Three workflows in `.github/workflows/`:
- `ci.yml` — every PR: `npm ci` → `npx oxlint --quiet` → `npm run build` → `npm run test --if-present`.
- `deploy.yml` — `main` only, deploys to GitHub Pages. **Stale**: still injects
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` build secrets, consistent with `main` not yet having
  received the Firebase migration (see `current-state.md`) — but nobody has scheduled the rewrite
  for when that promotion happens.
- `enforce-git-flow.yml` — blocks PRs into `main`/`homolog` unless source is `homolog`/`develop`
  respectively (exception: `fix/*`, `hotfix/*`).

## Testing (CONFIRMED)

Unit only (`npx vitest run src scripts tests/unit`), colocated `*.test.js`/`*.test.ts` beside
source plus `tests/unit/`. No integration suite (removed with Supabase), no E2E (no
Playwright/Cypress installed).

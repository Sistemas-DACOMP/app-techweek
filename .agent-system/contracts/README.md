# Contracts

Empty as of 2026-09-22 — not a gap being papered over, a real absence. This project's backend
(`backend/src/routes/`) has real endpoints (`/api/auth`, `/api/activities`, `/api/checkin`,
`/api/leads`, `/api/sympla`, `/api/points`, `/api/admin`), but no formal, standalone API contract
document exists for any of them yet — the contract today is whatever the route handler + its
`.test.ts` file actually implement, read directly from `backend/src/routes/`.

This folder exists so a future contract (an OpenAPI spec, a typed request/response shape shared
between `backend/` and `src/`, or a Firestore document-shape contract for a collection multiple
apps read/write) has a documented home from day one, consistent with the target architecture
(spec section 4).

When to actually write one here: the first time two independently-owned pieces of code (e.g. a
future `apps/admin-web` and `backend/`, or two Cloud Functions) need to agree on a shape that
isn't already enforced by shared TypeScript types in the same codebase. Until that happens,
writing a contract doc here would describe an agreement that doesn't need to exist yet — see
`agents/ponytail.md`.

See `context/architecture.md` for the current (informal) data model and API surface.

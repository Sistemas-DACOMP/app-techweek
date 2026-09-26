# Specs

This folder is intentionally structural, not the live location. Real specs for this project live
in `changes/*/SPEC.md` at the repo root (per-task, ad hoc) — that convention predates this
`.agent-system/` migration and already works, so it wasn't duplicated here.

This folder exists so `.agent-system/` has a documented, discoverable answer to "where do specs
live" (spec section 4's structure), without moving or copying real content that already has a
home. If a future need arises for a spec that's cross-cutting (spans more than one `changes/*`
task, or documents a standing convention rather than a single task), it goes here instead —
until then, there's nothing to put in this folder besides this README.

See `agents/spec.md` for the process that produces a spec, and `context/glossary.md` for the
CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA classification every spec's rules go through.

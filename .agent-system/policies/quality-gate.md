# Quality gate (objective)

Fonte: `CLAUDE.md` → "Orquestração automática (workflows)" e "CI"; script real em `scripts/quality-gate.mjs` (ver `docs/superpowers/specs/2026-09-11-agent-infra-fase2-6-design.md`, decisão 4).

## Comandos concretos deste repo (Supabase, atual)

- `npm run quality-gate` — gate objetivo mecânico: lint + build + test. Implementado como função pura testável (`evaluateGate()` em `scripts/quality-gate.mjs`, com `scripts/quality-gate.test.mjs`), não é um LLM se autoavaliando.
- `npm run check-ai-infra` — checagem de ambiente de IA (o que existe, o que falta configurar), função pura `isEnvironmentReady()` em `scripts/check-ai-infra.mjs`. Nunca deve imprimir "tudo certo" sem checar de verdade.
- CI (`.github/workflows/ci.yml`, roda em todo PR): `npm ci` → `npx oxlint --quiet` → `npm run build` → `npm run test --if-present`. `--quiet` no lint é intencional — o projeto tem warnings pré-existentes (unused vars, hook deps) que não bloqueiam merge, só erros reais quebram o CI. Corrigir esses warnings é tarefa separada, não agendada.

## O que o gate objetivo cobre e o que não cobre

- Cobre: lint, build, test automatizado — tudo mecânico, sem julgamento.
- Não cobre: `confidence_score` e `security_score` — esses sempre vêm de quem revisou de fato (`qa` / `security`), nunca inventados pelo script. Um gate verde não substitui revisão humana ou de agente especializado nas dimensões que o script não mede.

## Firebase (repos futuros: apps/pwa, apps/admin-web, backend/)

**TBD / UNKNOWN — não inventar specifics.** Os três repos-alvo não existem ainda (ver `manifests/system.yaml` → `project_context.status: TRANSITIONAL`). Cada um vai precisar de um script equivalente a `quality-gate.mjs`, mas:

- O test runner, o lint config e o processo de build de cada um ainda não foram decididos.
- Não assumir Firebase Emulator Suite, não assumir um test runner específico, não assumir que o mesmo `oxlint`/Vitest será reaproveitado, até que a decisão real seja tomada nesses repos.
- Quando o repo existir e a tooling for escolhida, escrever o `quality-gate` equivalente seguindo o mesmo princípio: script mecânico e puro, testável, sem o LLM se autoavaliando na parte objetiva.

## Ver também

- `rules/engineering-rules.md` — onde o quality gate entra no fluxo de PR (fase de Correção).
- `gates/gates.md` — gate "QA PASSED" e "CODE REVIEW APPROVED" consomem o resultado deste script como parte (não como totalidade) da evidência.

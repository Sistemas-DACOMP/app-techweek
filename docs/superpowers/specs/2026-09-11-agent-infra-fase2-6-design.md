# Infra de agentes — Fases 2-6 (orquestrador, PR review, security reviewer, quality gate, empacotamento)

Data: 2026-09-11 · Status: implementado, PR #18 aberto (`feature/agent-infra-orchestrator-fase2-6` → `develop`)

## Problema

A Fase 1 (`2026-09-10-persistent-project-memory-design.md`) resolveu persistência de contexto/regras/CI, mas ainda não existia: nada que reconhecesse automaticamente o tipo de tarefa (feature/bugfix/PR review/testing) e delegasse pro processo certo, nenhum agente de PR review ou de segurança versionado, nenhum critério objetivo de aprovação (quality gate) e nenhuma documentação pensada pra alguém de fora clonar o repo e entender a arquitetura sozinho.

## Objetivo desta fase

Implementar as Fases 2-6 do roadmap (`CLAUDE.md`), a partir de três prompts do Fabio (`App_TechWeek/Update Prompts/`, fora deste repo): orquestrador, PR Review Agent, Security Reviewer, quality gate objetivo, e empacotamento pra equipe.

## Decisões

1. **Orquestrador não é um agente separado, é uma skill** (`.claude/skills/dev-workflows/SKILL.md`). O prompt original imaginava um "Orchestrator" como camada distinta; no Claude Code real, skills já são carregadas automaticamente quando a descrição casa com o pedido — criar um "agente orquestrador" chamável seria redundante com o mecanismo que já existe. A skill documenta a tabela de roteamento (pedido → workflow → agente) e concentra quality gate + loop de reprocessamento.
2. **Estrutura `.claude/{agents,skills,workflows,rules,context,config}` sugerida no prompt foi adaptada**, não copiada literalmente: `workflows` viraram seções dentro de `dev-workflows/SKILL.md` (cada workflow é curto, todos compartilham quality gate/loop — arquivo separado não ganharia clareza); `rules` continuou em `docs/business-rules/` (já existia, é isso que os agentes leem); `context` é o próprio `CLAUDE.md`; `config` é `.claude/settings.local.json` (já existia). Só `agents` e `skills` são pastas literais, porque é isso que o Claude Code carrega de verdade. Rationale completo em `docs/ai-infra/README.md`.
3. **Só 2 agentes novos** (`pr-review`, `security-reviewer`), não os ~7 sugeridos como exemplo no prompt (Backend/Frontend/Architecture/Product/Release...). Seguindo a própria instrução do prompt de não criar complexidade artificial — agentes adicionais ficam pra Fase 6, só quando houver necessidade observável, não antecipada.
4. **Quality gate objetivo é um script** (`scripts/quality-gate.mjs`), não um LLM avaliando a si mesmo. Ele cobre só a parte mecânica (lint/build/test) — `confidence_score` e `security_score` continuam vindo de quem revisou (qa-agent/security-reviewer), nunca inventados pelo script. Refatorado nesta mesma fase pra expor `evaluateGate()` como função pura testável, sem depender de rodar lint/build/test de verdade num teste unitário (ver `scripts/quality-gate.test.mjs`).
5. **Bootstrap check** (`scripts/check-ai-infra.mjs`) — pedido explícito do prompt de empacotamento (não imprimir "tudo certo" sem checar). Mesma refatoração de função pura (`isEnvironmentReady()`) pra ter teste automatizado.
6. **PR Review Agent nunca mergeia** — regra já existente no projeto (`gh pr merge` bloqueado pro Claude Code) só foi herdada, não redecidida aqui.
7. **Etapa "revisar" adicionada aos workflows FEATURE/BUGFIX** reaproveitando os critérios de análise do `pr-review` (consistência arquitetural, regressão, cobertura de teste) em vez de criar um "Code Review Agent" à parte — o prompt original listava isso como agente distinto, mas a responsabilidade é a mesma aplicada mais cedo (antes de existir PR), então vira um passo do workflow, não um agente novo.
8. **Campo `criterio` adicionado ao template de `docs/business-rules/`** (backfill nas 8 regras existentes) — o template original da Fase 1 tinha fundido "critério de aceite" dentro da descrição livre; os 3 prompts pediam um campo próprio. Corrigido nesta fase.
9. **Checagem de impacto em deploy (Vercel/GitHub Pages)** documentada como item extra do workflow (não um agente/skill novo) quando o diff mexe em `vite.config.js`/`vercel.json`/env vars — pedido explícito do prompt de empacotamento, seção 18.

## Auditoria feita antes de implementar

Confirmado antes de escrever qualquer arquivo: `.claude/agents/dedup-refactor.md` e `.claude/skills/qa-agent/SKILL.md` já existiam (Fase 1, nunca commitados); CI já existia; não havia PR Review Agent, Security Reviewer, quality gate ou docs de empacotamento. Achados durante a auditoria, corrigidos nesta fase:

- `CLAUDE.md` afirmava "Vitest configurado" quando a suíte só existia na branch do PR #17 (mergeado durante esta mesma sessão, depois corrigido de novo pra refletir o merge real).
- `CLAUDE.md` mandava toda sessão ler `claude-context/app-techweek-devops-handoff.md`, mas essa pasta é gitignored (contém detalhe sensível de uma sessão antiga) — não viaja com `git clone`. Virou nota local, não pré-requisito.
- PR #15 (KAN-5) já estava mergeado mas `CLAUDE.md` ainda listava como aberto.

## Testes / validação desta fase

- `npm run lint`, `npm run build`, `npm run test` (29 testes, incluindo os novos `scripts/*.test.mjs`), `npm run quality-gate`, `npm run check-ai-infra` — todos verdes após o merge de `develop` (PR #17/Vitest) na branch.
- Conflito de merge único (`package.json`, scripts duplicados) resolvido combinando os dois blocos.
- Auditoria adversarial rodada (subagente, leitura independente dos 3 prompts vs. implementação) encontrou 4 gaps reais, todos corrigidos nesta mesma sessão: etapa de revisão ausente no FEATURE/BUGFIX, campo `criterio` faltando no catálogo de regras, esta spec de decisão ausente, testes automatizados dos próprios scripts de infra ausentes.

## Não incluído nesta fase (Fase 6, propositalmente)

- Backend/Frontend/Architecture/Final Reviewer — sem necessidade observada ainda.
- Integração mais profunda de Jira/GitHub além do que já existe (MCP Atlassian + `gh` CLI).
- Novos MCPs.

## Roadmap (ver também `CLAUDE.md`)

```
FASE 1 — memória persistente (feita)
FASE 2 — orquestrador (feita)
FASE 3 — QA Agent (já existia) + PR Review Agent (feita)
FASE 4 — Security Reviewer (feita)
FASE 5 — integrações Jira/GitHub (feita com o que já existe)
FASE 6 — expansão / agentes adicionais (não iniciada, sem necessidade observada)
```

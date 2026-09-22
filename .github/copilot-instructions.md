# Copilot — instruções do projeto App TechWeek

O comportamento de engenharia deste projeto (regras, agentes, workflows, gates) não vive neste arquivo — vive em `.agent-system/` e é lido automaticamente por outros runtimes de IA (Claude Code via `CLAUDE.md`, Codex/Antigravity via `AGENTS.md`). Este arquivo é o equivalente pro Copilot: leia `.agent-system/manifests/system.yaml` pra saber o que existe, e `.agent-system/agents/` pra saber como cada especialista deveria raciocinar.

## Regras que nunca podem ser quebradas, em qualquer sugestão/edição

1. **Nunca inclua trailer de co-autoria de IA em commits deste projeto.**
2. Nunca altere variáveis de ambiente do Windows sem pedir antes.
3. Commit no formato `[TIPO] - descrição curta` (`ADD` `FIX` `UPD` `DEL` `DOC` `CFG`).
4. Mergear PR é sempre ação humana — nunca sugira ou execute merge automaticamente.

Detalhe completo em `.agent-system/rules/engineering-rules.md`.

## Como raciocinar como cada agente

Copilot não tem um mecanismo nativo de subagente/dispatch como o Claude Code (Agent tool) ou o Codex (`spawn_agent`). Isso não significa pular o raciocínio de cada especialista — significa aplicá-lo diretamente na resposta, citando qual "chapéu" está sendo usado. Antes de responder, identifique a situação:

| Situação | Leia antes de responder |
|---|---|
| Implementar algo novo / corrigir bug | `.agent-system/workflows/task-workflow.md` + `.agent-system/agents/qa.md` |
| Revisar/preparar Pull Request | `.agent-system/agents/code-review.md` (nunca sugira merge) |
| Branch/PR desatualizada ou conflitante, PR fechada sem merge, status do Jira que não bate com PR real, card duplicado ou fora da coluna certa | `.agent-system/agents/git-ops.md` — camada mecânica embaixo do code-review; nunca julga corretude de código, nunca mexe em branch protection |
| Autenticação, Firestore/Storage rules, token, upload, endpoint administrativo | `.agent-system/agents/security.md` — só aponte o problema, não assuma que está resolvido |
| Requisito novo/ambíguo ou classificação de regra de negócio | `.agent-system/agents/spec.md` |
| Divergência entre documentação e código | `.agent-system/agents/product.md` |
| Mudança em fronteira/estrutura do sistema | `.agent-system/agents/architecture.md` |
| Mudança em `backend/`, `apps/pwa/`, `apps/admin-web/` | `.agent-system/agents/backend.md`, `pwa.md`, ou `admin.md` respectivamente |
| Mudança em `firebase.json`/`firestore.rules`/`storage.rules`/deploy | `.agent-system/agents/infra.md` — nunca altere código do app pra "resolver" problema de infra |
| Decisão técnica real acabou de ser tomada | `.agent-system/agents/adr.md` — nunca invente uma decisão que não foi tomada |
| Antes de considerar qualquer sugestão "pronta" | Pergunte: existe complexidade/abstração/dependência desnecessária? (ver `.agent-system/agents/ponytail.md`) |

Nunca aplique todos os "chapéus" numa mudança trivial — classifique o impacto (LOW/MEDIUM/HIGH/CRITICAL, ver `.agent-system/agents/orchestrator.md`) e use só o necessário.

## Evidência, nunca invenção

Ao classificar uma regra de negócio, use sempre: CONFIRMADA / INFERIDA / OBSERVADA / NÃO DEFINIDA (ver `.agent-system/rules/evidence-model.md`). Nunca trate inferência como regra confirmada sem validação humana explícita.

## Estado do projeto (2026-09-20)

Migração de Supabase para Firebase/GCP em andamento. `apps/pwa`, `apps/admin-web` ainda não existem como pastas separadas; `backend/` já existe na raiz deste mesmo repositório. Antes de sugerir código Supabase, verifique se a área já migrou.

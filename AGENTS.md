# AGENTS.md

This project's engineering-team behavior (orchestration, agent roles, rules, gates, workflows) does not live in this file. It lives in `.agent-system/`.

- `.agent-system/manifests/system.yaml` — the map of what exists: supported runtimes, agents, plugins, required capabilities, current project status.
- `.agent-system/agents/` — one file per agent (orchestrator, spec, product, architecture, backend, pwa, admin, qa, security, infra, code-review, git-ops, devops, adr, ponytail), each describing that agent's purpose, scope, and process, runtime-agnostic. `git-ops` (2026-09-21) is the mechanical git/Jira-ops layer underneath `code-review` — rebuilds an orphaned/stale branch or PR and corrects Jira board drift, never judges code correctness and never touches branch protection. `devops` (2026-09-22) owns CI/CD pipelines, build scripts and the develop/homolog/main release flow — never touches Firebase/Firestore config (that's `infra`) or does branch/PR/Jira surgery (that's `git-ops`).
- `.agent-system/rules/engineering-rules.md` — the full engineering rules this project runs on (git flow, commit format, review process, security invariants). Read that file for the complete rule bodies; this file only states the ones that must never be dropped.

## Non-negotiable rules (any runtime, no exceptions)

These apply regardless of which AI runtime is reading this file (Claude Code or Antigravity, the only two supported since 2026-09-22). Follow whatever attribution convention this session's host normally uses, then apply this project's override on top of it:

1. **Nunca inclua trailer de co-autoria de IA em commits deste projeto.**
2. Never alter Windows environment variables — not even for debugging — without asking first.
3. Commit message format: `[TIPO] - descrição curta`, where `TIPO` is one of `ADD` `FIX` `UPD` `DEL` `DOC` `CFG`.
4. Merging a pull request is always human-only. No AI runtime merges a PR, regardless of prior authorization from the user.

For everything else — full rule text, gates, workflows, per-agent behavior — see `.agent-system/`.

## Roteamento automático — leia isto antes de perguntar "qual agente eu uso?"

Você (o runtime lendo este arquivo, Claude Code ou Antigravity) deve classificar a tarefa sozinho e despachar o agente certo, sem que o humano precise pedir por nome. Esta tabela é a mesma lógica que `.claude/skills/dev-workflows/SKILL.md` usa no Claude Code — portada aqui pra funcionar também no Antigravity:

| Situação | Agente (`.agent-system/agents/<id>.md`) |
|---|---|
| "implemente/adicione/crie X" | workflow FEATURE — ver `.agent-system/workflows/task-workflow.md` |
| "corrija/conserta bug X" | workflow BUGFIX |
| Revisar/preparar um Pull Request | `code-review` (nunca mergeia — regra não-negociável #4 acima) |
| Branch/PR desatualizada ou conflitante, PR fechada sem merge, status do Jira que não bate com PR real | `git-ops` — camada mecânica embaixo do `code-review`; nunca julga corretude de código, nunca mexe em branch protection |
| Falha de CI (`.github/workflows/*.yml`), quality gate quebrando no pipeline, config de deploy/hospedagem | `devops` — nunca mexe em Firebase/Firestore, nunca em branch/PR/Jira |
| Rodar/validar testes, cobertura de regra de negócio | `qa` |
| Toca autenticação, Firestore/Storage rules, token, upload, endpoint administrativo, ou vai pra `main` | `security` (aciona sozinho, mesmo sem pedido explícito) |
| Requisito novo/ambíguo, ou precisa classificar uma regra (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA) | `spec` |
| Divergência entre documentação e implementação, comportamento funcional ambíguo | `product` |
| Mudança que toca fronteira/estrutura do sistema (nova collection Firestore, contrato de API, novo serviço) | `architecture` |
| Mudança em `backend/` (Cloud Functions/Express) | `backend` |
| Mudança em `apps/pwa/` | `pwa` |
| Mudança em `apps/admin-web/` | `admin` |
| Mudança em `firebase.json`, `firestore.rules`, `storage.rules`, config/deploy do Firebase | `infra` (nunca altera código do app pra "resolver" problema de infra) |
| Decisão técnica real acabou de ser tomada e precisa virar registro permanente | `adr` (nunca inventa uma decisão que não foi tomada) |
| Antes de aceitar qualquer solução como pronta | `ponytail` — existe complexidade/abstração/dependência desnecessária? Ver `.agent-system/agents/ponytail.md` (plugin real só disponível nativamente no Claude Code hoje; em outros runtimes, aplique a pergunta você mesmo antes de finalizar) |

Nunca rode todos os agentes numa tarefa trivial — classifique o impacto (LOW/MEDIUM/HIGH/CRITICAL, ver `.agent-system/agents/orchestrator.md`) e escolha só o necessário.

## Como despachar um subagente, por runtime

- **Claude Code**: cada agente acima já existe como arquivo real em `.claude/agents/<id>.md` — o Agent tool despacha direto.
- **Antigravity**: use `invoke_subagent` apontando para o wrapper correspondente em `.agent-system/adapters/antigravity/agents/<id>.md`. Antigravity não tem ferramenta de todo-list — os wrappers já instruem a materializar `.agent-system/templates/task-context.md` como um "task artifact" real via `write_to_file`. Ver `.agent-system/adapters/antigravity/README.md` para os detalhes completos de implementação.

**Isto é padrão do projeto**: toda funcionalidade nova de agente/skill adicionada daqui pra frente precisa ter equivalente (ou gap documentado explicitamente, nunca silencioso) pra Claude Code e Antigravity — os únicos dois runtimes suportados desde 2026-09-22 (Codex e GitHub Copilot foram descontinuados por decisão do Fabio; Codex nunca teve arquivo real, só um README dizendo o que faltava construir — nada foi perdido).

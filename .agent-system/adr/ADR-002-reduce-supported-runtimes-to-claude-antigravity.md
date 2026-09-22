ADR-002 Reduzir runtimes de IA suportados de 4 pra 2 (Claude Code + Antigravity)

Context:
ADR-001 estabeleceu `.agent-system/` como sistema portável com objetivo de suportar 4 runtimes de IA (Claude Code, Codex, Antigravity, GitHub Copilot), declarado requisito obrigatório pelo Fabio em 2026-09-20 (`manifests/system.yaml`, `portability.required: true`). Na prática, dois desses quatro nunca tiveram adapter funcional: Codex tinha só `.agent-system/adapters/codex/README.md` documentando o que faltava construir, nenhum arquivo de agente real; GitHub Copilot tinha `.github/copilot-instructions.md`, mas o próprio conteúdo desse arquivo já registrava que Copilot não tem mecanismo de subagente/dispatch nativo equivalente aos outros runtimes — só orientava aplicar o raciocínio de cada agente inline na resposta, sem despacho real. Em 2026-09-22 o Fabio confirmou explicitamente, via 2 perguntas diretas (`AskUserQuestion`), a decisão de descontinuar os dois como runtimes suportados.

Decision:
Reduzir o escopo de portabilidade de `.agent-system/` de 4 runtimes pra 2: Claude Code e Antigravity. Codex e GitHub Copilot deixam de ser runtimes suportados. Trabalho feito na branch `chore/reduce-to-claude-antigravity` (baseada no PR #78), proposto no PR #87 (aberto, não mergeado no momento deste registro):
- Removidos `.agent-system/adapters/codex/` e `.github/copilot-instructions.md`.
- Atualizados `AGENTS.md`, `CLAUDE.md`, `.claude/skills/dev-workflows/SKILL.md` (regra de paridade agora exige só Claude Code + Antigravity), `.agent-system/manifests/system.yaml`, `.agent-system/manifests/runtime-parity.md` (reescrito sem coluna Codex), `.agent-system/manifests/capability-matrix.md`, `.agent-system/policies/merge-policy.md`, `.agent-system/docs/bootstrap.md`, `.agent-system/docs/audit-report.md` (nota de atualização adicionada no topo, sem reescrever a narrativa histórica original), READMEs dos adapters Claude e Antigravity, e o `portability_note` de 5 agentes (`admin`, `backend`, `infra`, `orchestrator`, `pwa`).
- Criado adapter Antigravity real pro agente `git-ops` (antes só tinha adapter Claude).
- Deliberadamente não tocados: `.agent-system/agents/ponytail.md` e `.agent-system/manifests/plugin-parity.md` (documentam capacidade real de plugins de terceiros — Superpowers, Caveman, Ponytail têm adapter Codex de verdade, independente da nossa política de runtime suportado, apagar isso falsificaria um fato real sobre esses plugins); `.agent-system/docs/CONVENTIONS.md` (cita Codex só como exemplo genérico de "runtime não instalado", segue válido); `ADR-001` (registro histórico, não reescrito — convenção deste projeto é nunca falsificar histórico de ADR).

Alternatives:
1. Manter os 4 runtimes no papel e continuar sem adapter real pra Codex/Copilot — rejeitada porque isso mantém uma promessa de paridade que nunca foi cumprida, gerando expectativa falsa em quem ler `manifests/system.yaml` ou `runtime-parity.md`.
2. Construir os adapters reais que faltavam pra Codex e Copilot em vez de descontinuá-los — não escolhida; motivo registrado é que nenhum dos dois tinha uso real acumulado (Codex) ou mecanismo nativo compatível (Copilot não tem dispatch de subagente), então o custo de manter paridade não se justificava.

Why:
Sem trabalho perdido: Codex nunca teve adapter além de um README de intenção. Copilot nunca pôde ter paridade real porque falta o mecanismo nativo equivalente (subagente/dispatch) que os outros três runtimes têm — o próprio `copilot-instructions.md` já descrevia essa limitação antes de ser removido. Reduzir o escopo declarado pra bater com o que de fato existe e é mantido evita que `manifests/system.yaml`/`runtime-parity.md` afirmem uma portabilidade que não é real.

Consequences:
O requisito de portabilidade de ADR-001 (`portability.required: true`) passa a valer só entre 2 runtimes, não 4 — daqui pra frente, todo agente/skill novo precisa de paridade (ou gap documentado) só entre Claude Code e Antigravity. FASE 7 do roadmap em `CLAUDE.md` é atualizada para refletir o escopo reduzido, sem reabrir ADR-001. Se Codex ou Copilot ganharem mecanismo de subagente real e uso no projeto no futuro, isso exige um novo ADR pra reintroduzir suporte, não uma reversão silenciosa deste.

Risks:
Antigravity, o único runtime não-Claude que permanece suportado, continua não testado end-to-end nesta máquina (CLI não instalado) — o mesmo risco já registrado em ADR-001 não foi resolvido por esta mudança, só ficou mais visível por ter menos runtimes ao redor dele. PR #87 ainda está aberto (não mergeado) no momento deste registro — este ADR documenta uma decisão já tomada pelo Fabio, não o merge em si; se o PR for alterado significativamente antes de mergear, revisar este ADR contra o estado final.

Status: ACCEPTED

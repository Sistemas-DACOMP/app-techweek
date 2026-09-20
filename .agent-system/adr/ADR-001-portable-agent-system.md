ADR-001 Adotar sistema de agentes portável multi-runtime (`.agent-system/`)

Context:
A infra de agentes/skills existente (`.claude/agents/`, `.claude/skills/`) funcionava, mas era inteiramente acoplada ao Claude Code — nomes de tool hardcoded (`AskUserQuestion`), hooks de ativação específicos do runtime, nenhuma noção de "isso também precisa rodar em outro AI runtime". Em 2026-09-20 o Fabio definiu como requisito explícito que qualquer membro do time possa usar Claude Code, Codex, Antigravity ou outro agente compatível para trabalhar neste projeto, não só Claude Code.

Decision:
Adotar uma estrutura canônica `.agent-system/` como fonte de verdade runtime-agnóstica: `agents/` (comportamento de cada papel, sem referência a tool específica), `rules/` e `policies/` (regras/gates canonicalizados, antes espalhados só em CLAUDE.md), `workflows/` (grafos de processo), `adapters/<runtime>/` (tradução fina por runtime, nunca lógica de negócio), `manifests/` (inventário e matrizes de portabilidade), `templates/`, `adr/`, `feedback/`, `handoffs/`, `state/`, `docs/`. Os agentes/skills existentes em `.claude/` não foram descartados — viram os adapters reais que o Claude Code executa, mantidos sincronizados com a fonte canônica.

Alternatives:
1. Manter Claude-Code-only e copiar prompt manualmente pra cada runtime quando precisasse — rejeitada, porque isso causa drift entre cópias (é exatamente o problema que a própria spec deste sistema aponta como motivo de existir uma fonte canônica).
2. Esperar os 3 repos Firebase existirem antes de construir qualquer coisa disso — rejeitada porque o Fabio pediu para isso ser feito agora, não depois; documentar como forward-looking spec é aceitável, esperar não era o pedido.

Why:
Portabilidade entre runtimes é requisito explícito e obrigatório declarado pelo Fabio em 2026-09-20, não uma preferência estética nem um nice-to-have — ver `manifests/system.yaml` (`portability.required: true`).

Consequences:
Passam a existir duas cópias de parte do conteúdo — o canônico em `.agent-system/agents/*.md` e os adapters reais em `.claude/agents/*.md`/`.claude/skills/*/SKILL.md` — que precisam ser mantidas em sincronia manualmente até que exista (e seja confirmado) um mecanismo real de `@import`/inclusão entre os dois. Os caminhos Codex e Antigravity ficam documentados mas não verificados end-to-end nesta máquina, porque nenhum dos dois CLIs está instalado aqui.

Risks:
Drift entre a cópia canônica e as cópias adapter ao longo do tempo, se nada além de disciplina manual garantir a sincronia. Gap do Ponytail (referenciado pela spec como gate anti-overengineering, não instalado em lugar nenhum desta máquina — documentado, não integrado). Conteúdo de escopo "Target" (Firebase) nos agentes security/qa/infra foi escrito a partir de documento de arquitetura, não de código real, porque os repos Firebase ainda não existem — precisa revalidação assim que existirem.

Status: ACCEPTED

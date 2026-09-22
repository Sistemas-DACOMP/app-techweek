# Runtime parity (spec seção 55)

Cruzamento capacidade x runtime. "NATIVE" = funciona direto no runtime, sem camada de tradução. "ADAPTER" = funciona através de um adapter documentado em `adapters/<runtime>/README.md`, mas depende de tradução. "UNAVAILABLE" = não existe caminho hoje. "UNVERIFIED" qualifica qualquer célula cujo runtime não está instalado nesta máquina — não fabricar confiança que não foi testada.

**Atualizado 2026-09-22**: Codex e GitHub Copilot descontinuados por decisão do Fabio — ver `manifests/system.yaml`. Codex nunca teve linha com evidência real (era só projeto de adapter, nunca verificado); a coluna foi removida sem perda. Copilot nunca teve linha nesta tabela pra começo de conversa (sem mecanismo de subagente/adapter equivalente). Tabela abaixo cobre só os dois runtimes suportados agora.

| Item | Claude Code | Antigravity | Adapter |
|---|---|---|---|
| Agents (`.agent-system/agents/*.md`) | NATIVE | ADAPTER (UNVERIFIED) | `adapters/antigravity/README.md` |
| Skills (`.claude/skills/*/SKILL.md`) | NATIVE | ADAPTER (UNVERIFIED) | idem |
| Plugins (superpowers, caveman) | NATIVE | ADAPTER parcial | idem |
| Shell | NATIVE | UNVERIFIED (Antigravity não instalado nesta máquina) | n/a — capacidade de SO, não precisa de tradução |
| Git | NATIVE | NATIVE (esperado), UNVERIFIED | n/a |
| Tests (Vitest / test-runner do repo) | NATIVE | NATIVE (esperado), UNVERIFIED | n/a |
| Browser | AVAILABLE via MCP `claude-in-chrome` | UNAVAILABLE — sem MCP-equivalente configurado | nenhum adapter resolve isso hoje; precisaria de MCP próprio configurado no runtime alvo |
| Jira | AVAILABLE via MCP Atlassian | UNAVAILABLE — sem MCP-equivalente configurado | idem |
| GitHub (gh CLI) | NATIVE | NATIVE (esperado), UNVERIFIED | n/a |
| Firebase | NATIVE — CLI instalada nesta máquina (15.30.2, 2026-09-20), capacidade de SO/CLI, não depende de runtime de IA | NATIVE (esperado), UNVERIFIED — Antigravity não instalado nesta máquina | n/a — capacidade de SO, disponibilidade não é específica de runtime; ver `manifests/capability-matrix.md` (gcloud ainda NOT FOUND, continua bloqueando operações GCP diretas) |
| Handoffs (`handoffs/*.md`) | NATIVE — escrito em arquivo, lido por qualquer agente/humano | NATIVE, com uma ressalva (ver linha abaixo) | n/a |
| Rules (`.agent-system/rules/*.md`) | NATIVE | NATIVE | n/a |
| Gates (`.agent-system/gates/gates.md`) | NATIVE | NATIVE | n/a |

## Notas por runtime

**Claude Code** — tudo que está construído hoje neste sistema roda nativamente aqui: os 15 arquivos de agente, os adapters em `.claude/agents/*.md` e `.claude/skills/*/SKILL.md`, os hooks (rtk, caveman, superpowers), e as duas MCPs (Atlassian, claude-in-chrome) usadas por este projeto.

**Antigravity** — documentado mas não instalado/verificado nesta máquina. Referência usada: `references/antigravity-tools.md` do Superpowers (`invoke_subagent`). Uma diferença estrutural importante: **Antigravity não tem ferramenta de todo-list/checklist** (não existe um equivalente ao todo tracker do Claude Code). Isso afeta diretamente como `state/` e `handoffs/` são usados neste sistema — em vez de manter progresso de tarefa numa lista efêmera em memória, o agente Antigravity precisa gravar o estado em arquivo via `write_to_file` (por exemplo, atualizando o `task-context.md` da tarefa em `handoffs/` ou `state/` a cada passo relevante), porque é o único jeito de persistir progresso entre passos nesse runtime. Qualquer agente/skill deste sistema que assuma "o runtime está trackeando isso numa todo list" quebra silenciosamente em Antigravity se não for adaptado para escrever em arquivo.

## Resumo

Hoje só existe uma coluna com evidência real: Claude Code. A coluna Antigravity é projeto de adapter, não confirmação — tratá-la como tal até um smoke test real (ver `docs/bootstrap.md` e a recomendação equivalente em `docs/audit-report.md`).

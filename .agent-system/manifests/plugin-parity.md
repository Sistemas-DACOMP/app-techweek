# Plugin parity (spec seção 56)

Um bloco por plugin. Onde não há evidência real de funcionamento num runtime, isso é marcado explicitamente como PORTABILITY GAP em vez de implicado como compatível.

---

## superpowers

- **Purpose**: conjunto de skills de engenharia (brainstorming, TDD, systematic-debugging, code review, git worktrees, planos de execução, subagent-driven development) que qualquer AI runtime pode invocar como metodologia de trabalho.
- **Canonical implementation**: `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.3.0` (Claude Code plugin cache).
- **Claude adapter**: nativo — carregado via plugin marketplace do Claude Code, skills invocadas por nome (`superpowers:brainstorming`, `superpowers:test-driven-development`, etc).
- **Codex adapter**: real, existe e é citado como referência por este sistema — `.codex-plugin/plugin.json` + `skills/using-superpowers/references/codex-tools.md`. Requer `multi_agent = true` em `~/.codex/config.toml` e expõe `spawn_agent` / `followup_task` / `wait_agent` como equivalentes do Task tool. Não testado nesta máquina (Codex CLI não instalado).
- **Antigravity adapter**: real — `references/antigravity-tools.md`, usa `invoke_subagent`. Nota estrutural: Antigravity não tem todo-list tool, então tracking de progresso precisa ser feito via `write_to_file` em vez de checklist efêmero.
- **Outros adapters existentes** (fora do escopo runtime deste sistema, mas citados porque provam o padrão de portabilidade do plugin): Gemini (`references/gemini-tools.md`), Hermes (`.hermes-plugin/plugin.yaml` + `references/hermes-tools.md`), Pi (`.pi/extensions/superpowers.ts` + `references/pi-tools.md`), Cursor (`.cursor-plugin/`), Kimi (`.kimi-plugin/`), Devin (`.devin-plugin/`), opencode (`.opencode/plugins/superpowers.js`).
- **Required capabilities**: filesystem, shell, ferramenta de subagent/task do runtime (nome varia por runtime).
- **Optional capabilities**: nenhuma — as skills são metodologia, não dependem de Jira/browser/firebase.
- **Known limitations**: o `AGENTS.md` na raiz do plugin é um ponteiro de uma linha só (`CLAUDE.md`, texto puro, não `@CLAUDE.md`) — parece quebrado/incompleto, mas é um problema upstream do próprio plugin, não algo para este sistema corrigir.
- **Fallback**: se o runtime não tiver adapter dedicado, as skills ainda são legíveis como markdown puro — um agente pode ler o arquivo da skill e seguir o processo manualmente, perdendo só a integração de tooling (ex: sem `spawn_agent` real, o "subagent-driven development" vira "abrir uma sessão separada manualmente").
- **PORTABILITY GAP**: nenhum verificado localmente além de Claude Code — os adapters Codex/Antigravity/Gemini/etc são reais no plugin mas não confirmados end-to-end nesta máquina.

---

## caveman

- **Purpose**: modo de comunicação ultra-comprimida (reduz tokens de output) + subagentes especializados (`cavecrew-investigator`/`builder`/`reviewer`) + gateway de observabilidade de custo de LLM.
- **Canonical implementation**: `~/.claude/plugins/cache/caveman/caveman/15581d14007f`.
- **Claude adapter**: nativo, mas a ativação em si é hook-based e específica do Claude Code — `${CLAUDE_PLUGIN_ROOT}`, hooks `SessionStart`/`UserPromptSubmit`. A lógica de compressão de output é Node.js/markdown, portável em princípio; o *gatilho* automático não é.
- **Codex adapter**: existe um hook mínimo real — `.codex/config.toml` + `.codex/hooks.json` — mas com paridade de feature baixa (~20%): apenas eco estático, sem troca de nível (lite/full/ultra), sem persistência, sem os modos wenyan.
- **Antigravity adapter**: **nenhum encontrado**. Há `gemini-extension.json`/`GEMINI.md` no plugin, mas são apenas configuração — sem wiring de hook verificado. Não existe equivalente Antigravity.
- **cavecrew subagents**: `cavecrew-investigator`/`builder`/`reviewer` dependem do Task/subagent tool específico do Claude Code — **não têm equivalente portável** em nenhum outro runtime auditado.
- **Standalone Go gateway** (`proxy/`, banco local `~/.caveman/caveman.db`): esse componente É totalmente portável e agnóstico de provider — é um reverse proxy, funciona na frente de qualquer runtime que faça chamadas de LLM via HTTP. Ressalva de licença: BSL-1.1, uso self-hosted single-operator liberado; "Caveman Cloud" multi-usuário gerenciado exige licença comercial.
- **Required capabilities**: filesystem, shell; hooks do runtime (Claude Code) para a parte de ativação automática.
- **Optional capabilities**: subagent/Task tool (só para cavecrew); nenhuma dependência de Jira/browser/firebase.
- **Known limitations**: feature parity real hoje é: Claude Code 100%, Codex ~20%, Antigravity 0% (sem adapter), proxy Go 100% mas fora do modelo de plugin (é infraestrutura separada, não um plugin do runtime).
- **Fallback**: sem hook automático, o modo caveman pode ser invocado manualmente como skill (`/caveman`, `/caveman-help` etc já são skills markdown, funcionam em qualquer runtime que suporte skills/slash commands) — perde-se só a ativação automática por sessão, não o modo em si.
- **PORTABILITY GAP**: Antigravity sem adapter nenhum; cavecrew subagents sem equivalente portável em qualquer runtime que não seja Claude Code; Codex com feature parity baixa mesmo onde existe.

---

## ponytail

- **Purpose**: modo "lazy senior dev" anti-overengineering — força YAGNI, stdlib/native
  primeiro, menor diff que mantém a mesma corretude. Skill base (`ponytail`) atua durante
  a implementação; `ponytail-review`/`ponytail-audit` são gates de revisão (diff / repo
  inteiro) que só apontam o que cortar (`delete:`/`stdlib:`/`native:`/`yagni:`/`shrink:`);
  `ponytail-debt` rastreia atalhos deliberados marcados com comentário `ponytail:`;
  `ponytail-gain` é um placar de benchmark publicado (não é número por-repo);
  `ponytail-help` é a referência rápida. Este é o plugin que preenche o papel do agente
  `ponytail` na spec (seção 25), instalado de verdade em 2026-09-20.
- **Canonical implementation**: `~/.claude/plugins/cache/ponytail/ponytail/4.10.0`
  (também espelhado em `~/.claude/plugins/marketplaces/ponytail/`). `plugin.yaml` descreve
  o plugin primariamente como nativo do "Hermes Agent" (`provides_hooks: pre_llm_call,
  pre_gateway_dispatch`), mas o pacote inclui adapters completos para muito mais runtimes.
- **Claude adapter**: nativo e completo — `.claude-plugin/plugin.json`, hooks reais
  (`hooks/claude-codex-hooks.json`): `SessionStart` (`ponytail-activate.js`, escreve flag
  file e injeta o ruleset), `SubagentStart` (`ponytail-subagent.js`, reinjeta o ruleset em
  cada subagent — contorna o fato de que contexto de `SessionStart` não alcança
  subagents, issue #252 do próprio plugin), `UserPromptSubmit`
  (`ponytail-mode-tracker.js`, rastreia troca de nível via `/ponytail lite|full|ultra`).
  6 skills (`ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`,
  `ponytail-gain`, `ponytail-help`), 6 commands (`commands/*.toml`), statusline opcional
  (`ponytail-statusline.sh`/`.ps1`).
- **Codex adapter**: real e com paridade alta — `.codex-plugin/plugin.json` aponta para
  o **mesmo** `hooks/claude-codex-hooks.json` que o Claude Code usa (não um hook Codex
  separado e reduzido), mais as mesmas skills. Por isso a paridade de feature esperada é
  muito maior que a do Caveman no Codex (~20%, eco estático sem troca de nível). Não
  testado nesta máquina (Codex CLI não instalado) — real no pacote, não confirmado
  end-to-end aqui.
- **Antigravity adapter**: apenas tier de instrução — `AGENTS.md` na raiz do repo, lido
  como regra always-on (mesmo padrão de `.cursorrules`/`CLAUDE.md`); sem hooks, sem
  `/ponytail lite|full|ultra`, sem persistência de nível. Confirmado pela própria
  `docs/agent-portability.md` do plugin, não é inferência nossa. Não testado nesta
  máquina (Antigravity não instalado).
- **Outros adapters existentes** (fora do escopo runtime deste sistema, citados porque
  provam a extensão real da portabilidade do plugin — mais ampla que Superpowers e muito
  mais que Caveman): Grok Build (`.grok-plugin/`), OpenCode
  (`.opencode/plugins/ponytail.mjs`), pi (`pi-extension/`), Hermes Agent (`plugin.yaml` +
  `__init__.py`, nativo), Gemini CLI (`gemini-extension.json`), Cursor (hooks nativos
  reais — `scripts/cursor-hooks.js` + `.cursor/rules/ponytail.mdc`, documentado e
  verificado em `docs/cursor-hooks.md`), Windsurf (`.windsurf/rules/`), Cline
  (`.clinerules/`), GitHub Copilot e Copilot CLI (`.github/copilot-instructions.md`,
  `.github/plugin/`), CodeWhale/Swival/VS Code+Codex ext/JetBrains Junie/Amp/Jules/Zed
  (todos via `AGENTS.md`, tier de instrução), Kiro (`.kiro/steering/`), Qoder (tier de
  plugin completo — `.qoder-plugin/plugin.json` + `hooks/qoder-hooks.json` com
  `UserPromptSubmit` e `PreToolUse` para injeção em subagent).
- **MCP server real** (`ponytail-mcp/`): expõe o mesmo ruleset via prompt MCP (`ponytail`,
  argumento opcional `mode`) e via tool (`ponytail_instructions`, retorna texto +
  `structuredContent`). Roda com `node ponytail-mcp/index.js` sobre stdio. É
  runtime-agnóstico por natureza (qualquer host MCP pode apontar para ele), mas o próprio
  README do plugin é honesto sobre a limitação: não existe primitivo MCP portável para
  "injetar isso em todo turno" — o MCP server serve hosts cujo único ponto de injeção é o
  menu de prompts ou chamada de tool, não substitui os adapters always-on.
- **Required capabilities**: filesystem; shell/Node só para os hooks de ativação
  automática (SessionStart/SubagentStart/UserPromptSubmit) em Claude Code/Codex — o
  conteúdo das skills em si só precisa de leitura de arquivo.
- **Optional capabilities**: nenhuma dependência de Jira/browser/firebase; statusline é
  puramente cosmético e opcional.
- **Known limitations**: `plugin.yaml` classifica o Hermes Agent como alvo nativo
  primário, não o Claude Code — isso não reduz a completude real do adapter Claude Code
  (que é o mais completo documentado, ao lado do Codex), é só uma nota sobre origem do
  projeto. `ponytail-gain` explicitamente se recusa a produzir um número de economia
  por-repo (é só o placar de benchmark publicado) — não usar essa skill como evidência de
  ganho real neste projeto. Achados de `ponytail-review`/`ponytail-audit` cobrem apenas
  complexidade/duplicação/dependência — bugs de corretude, segurança e performance estão
  explicitamente fora do escopo dessas skills (a skill mesma diz isso), então nunca
  substituem `code-review`/`security-reviewer`.
- **Fallback**: cada skill é markdown puro em `skills/<nome>/SKILL.md` mais `AGENTS.md`
  (versão compacta always-on) — qualquer runtime que só saiba ler arquivo consegue aplicar
  o ladder manualmente, perdendo apenas a ativação automática por hook e o rastreamento de
  nível.
- **PORTABILITY GAP**: adapters Codex/Antigravity são reais no pacote mas não confirmados
  end-to-end nesta máquina (nenhum dos dois CLIs instalado) — mesma ressalva já registrada
  para os adapters Codex/Antigravity do Superpowers.

---

## gitkraken-hooks

- **Purpose**: não auditado a fundo — está fora da lista de plugins nomeados pela spec original deste sistema; presente no ambiente (ferramentas MCP `mcp__GitKraken__*` disponíveis) mas não investigado como plugin de portabilidade.
- **Canonical implementation**: UNKNOWN — não mapeado neste levantamento.
- **Claude adapter / Codex adapter / Antigravity adapter**: UNKNOWN.
- **Required / Optional capabilities**: UNKNOWN.
- **Known limitations**: nenhuma conclusão confiável pode ser tirada sem auditoria dedicada.
- **Fallback**: n/a.
- **PORTABILITY GAP**: plugin inteiro é UNKNOWN — não é load-bearing para este sistema (nenhum agente/workflow aqui depende dele), então não bloqueia a migração, mas não deve ser citado como portável nem como não-portável até alguém investigar de fato.

---

## user-story / pm-skills

- **Purpose**: geração de user stories em formato Mike Cohn + critérios de aceite em Gherkin.
- **Canonical implementation**: `~/.claude/plugins/cache/.../user-story` (skill `user-story:user-story`).
- **Claude adapter**: nativo, skill markdown padrão.
- **Codex adapter**: não auditado a fundo — LIKELY_PORTABLE por ser markdown puro sem dependência de tooling específico de runtime (é texto/template, não script), mas isso é inferência, não verificação.
- **Antigravity adapter**: mesma observação — LIKELY_PORTABLE, não auditado.
- **Required capabilities**: nenhuma além de leitura de arquivo/skill pelo runtime.
- **Optional capabilities**: nenhuma.
- **Known limitations**: não foi feito um audit linha a linha do conteúdo da skill; a classificação LIKELY_PORTABLE é uma inferência razoável baseada no formato (markdown/template), não uma confirmação.
- **Fallback**: como é conteúdo textual puro, qualquer runtime que consiga ler um arquivo de skill consegue aplicá-lo manualmente.
- **PORTABILITY GAP**: classificação é inferência (LIKELY_PORTABLE), não fato verificado — marcar como tal em qualquer decisão que dependa disso.

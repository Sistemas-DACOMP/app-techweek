# Audit report — migração para sistema de agentes portável

Data da auditoria: 2026-09-20. Escopo: repo atual (`app-techweek`, era Supabase) + inventário global de plugins/skills instalados nesta máquina. Segue a estrutura da spec seção 60.

> **Atualizações desde a auditoria inicial (mesmo dia, 2026-09-20):** este documento é um retrato do momento em que foi escrito — algumas afirmações abaixo já ficaram desatualizadas horas depois, no mesmo dia. Não reescrevi a narrativa original (preserva o histórico da auditoria), só registro aqui o que mudou:
> - `firebase` CLI foi instalado (15.30.2) — a recomendação #1 abaixo já foi feita.
> - **Projeto Firebase real confirmado pelo Fabio: `facom-techweek-layerx`** — não é mais placeholder de spec. `.firebaserc`/`firebase.json`/`firestore.rules` existem de verdade no repo (`develop`/`homolog`/`main`), assim como `backend/` (dentro deste mesmo repo, não em pasta separada — PRs #26/#27). `apps/pwa` e `apps/admin-web` continuam não existindo como pastas separadas.
> - **2026-09-22, decisão do Fabio: Codex e GitHub Copilot descontinuados como runtimes suportados.** `.agent-system/adapters/codex/` e `.github/copilot-instructions.md` foram removidos. Codex nunca teve adapter real além de um README dizendo o que faltava construir — nada foi perdido. Antigravity segue como o único runtime além de Claude Code (ver `manifests/system.yaml`, `manifests/runtime-parity.md` atualizado). Os riscos/recomendações Codex abaixo (auditoria original) ficam como histórico do que já foi considerado, não como pendência ativa.
> - `gcloud` CLI continua não instalado — esse bloqueador segue de pé.
> - Os 8 agentes que este relatório lista como "documentação, sem despacho automático" (spec/product/architecture/backend/pwa/admin/infra/adr) ganharam arquivo real em `.claude/agents/` no mesmo dia (PR #36) — hoje todos os 13 despacham sozinhos no Claude Code.
> - Detalhe completo e atual: `.agent-system/manifests/capability-matrix.md` e `.agent-system/agents/infra.md`.

---

## CURRENT AGENT SYSTEM

Antes desta migração, o sistema vivia inteiramente em `.claude/` (Claude-Code-only):

- **Agentes**: `.claude/agents/pr-review.md` (análise/correção/revalidação/preparação de PR, nunca mergeia), `.claude/agents/security-reviewer.md` (revisão de segurança independente — auth, RLS, uploads, tokens; só reporta), `.claude/agents/dedup-refactor.md` (análise de duplicação sob pedido explícito).
- **Skills**: `.claude/skills/dev-workflows/SKILL.md` (orquestrador: classifica feature/bugfix/PR-review/testing, delega, aplica quality gate e loop de reprocessamento com limite de 3 tentativas antes de escalar pro Fabio), `.claude/skills/qa-agent/SKILL.md` (regras de negócio, planejamento e execução de testes).
- **Plugins**: superpowers 6.3.0, caveman (hash `15581d14007f`), gitkraken-hooks 3.1.72, user-story/pm-skills (hash `a03af68414bb`) — ver `manifests/plugin-parity.md` para portabilidade de cada um.
- **Workflows**: dev-workflows segue `classify → route → quality-gate → 3-retry-escalate`.
- **Rules**: hierarquia de `CLAUDE.md` (raiz do repo pai `App_TechWeek` → `app-techweek/CLAUDE.md`) + catálogo de regras de negócio em `docs/business-rules/`.
- **Policies**: quality gate objetivo (`npm run quality-gate`), regra de merge-block (Claude Code nunca mergeia PR sozinho), tom de comentário em PR/Jira (linguagem natural, sem tom de relatório gerado por IA).
- **Hooks**: `rtk` PreToolUse em Bash (wiring específico do Claude Code, binário standalone portável mas reescrita automática não), `herdr-agent-state.ps1` SessionStart (ferramenta pessoal do Fabio, dormant a menos que `HERDR_ENV=1`), hooks SessionStart/UserPromptSubmit do caveman, hook SessionStart do superpowers.

## CURRENT RUNTIMES

- **Claude Code**: confirmado ativo e usado nesta máquina — é o runtime desta própria sessão.
- **Codex**: CLI não instalada. Superpowers já ships um adapter real e pronto (`.codex-plugin/plugin.json` + `references/codex-tools.md`) — mas não testado aqui.
- **Antigravity**: não instalado. Mesma situação — Superpowers ships adapter de referência (`references/antigravity-tools.md`), não testado aqui.
- **Outros**: Gemini, Hermes, Pi, Cursor, Kimi, Devin, opencode — todos têm adapters shipped pelo Superpowers (ver `manifests/plugin-parity.md`), nenhum instalado/verificado nesta máquina.

## CAPABILITY MATRIX

Ver `.agent-system/manifests/capability-matrix.md` para a tabela completa. Resumo: filesystem/shell/git/github/node NATIVE/AVAILABLE; jira e browser AVAILABLE mas específicos da sessão Claude Code (MCP); docker/firebase/gcloud NOT FOUND.

## PLUGIN PORTABILITY MATRIX

Ver `.agent-system/manifests/plugin-parity.md`. Resumo: superpowers PORTABLE (adapters reais em 9 runtimes, nenhum verificado localmente); caveman PARTIALLY PORTABLE (Codex ~20% parity, sem adapter Antigravity, cavecrew sem equivalente portável, proxy Go portável mas BSL-1.1); gitkraken-hooks UNKNOWN (não load-bearing); user-story/pm-skills LIKELY_PORTABLE (inferência, não auditado a fundo).

## AGENT PORTABILITY MATRIX

Avaliação de portabilidade dos agentes/skills que já existiam antes desta migração (ver `.claude/agents/*.md` e `.claude/skills/*/SKILL.md`):

- **pr-review.md** — PARTIALLY PORTABLE. Hardcoda comandos `gh` e `npm` específicos, `quality-gate.mjs` por nome, e o nome literal da tool `AskUserQuestion` do Claude Code. Processo em si (análise → correção → revalidação → preparação) é runtime-agnóstico.
- **security-reviewer.md** — PARTIALLY PORTABLE no processo, mas o escopo é 100% Supabase-específico (RLS, `@supabase/supabase-js`, tabelas `profiles`/`point_events`). Isso não é um problema de adapter — precisa de reescrita real de conteúdo quando o alvo virar Firebase/Firestore, não só tradução de nome de tool.
- **dedup-refactor.md** — PORTABLE como está. Não referencia nome de tool nem stack específica.
- **dev-workflows/SKILL.md (orquestrador)** — PARTIALLY PORTABLE. Hardcoda `AskUserQuestion` e carrega uma suposição desatualizada de deploy (Vercel/GitHub Pages) que não existe mais no alvo Firebase.
- **qa-agent/SKILL.md** — PORTABLE, exceto a "Project Note" de fechamento, que é Supabase-específica.

## CURRENT PROBLEMS

- **Duplicações**: os workflows do Caveman (`investigate-first`, `safe-refactor`, `surgical-patch`, `verify-and-stop`, `lean-build`, `migration`) se sobrepõem conceitualmente aos do Superpowers (`systematic-debugging`, `test-driven-development`, `finishing-a-development-branch`). Os dois plugins estão ativos ao mesmo tempo, sem regra de precedência definida sobre qual dispara primeiro para um mesmo tipo de tarefa.
- **Conflitos**: nenhum conflito duro identificado, mas existe ambiguidade de orquestração — não está definido qual dos dois sistemas de skill "vence" quando ambos poderiam responder à mesma tarefa.
- **Gaps**: antes desta migração não existiam agentes de Infra, Architecture, Product, Spec, ADR, Backend, PWA ou Admin — a spec exige esses papéis, e esta migração os cria como especificações forward-looking, já que 3 dos 4 repos-alvo (`apps/pwa`, `apps/admin-web`, `backend/`) ainda não existem. Ponytail é referenciado pela spec inteira como gate anti-overengineering, mas **NÃO ESTÁ INSTALADO** em lugar nenhum desta máquina — não pode ser integrado de fato, só documentado como gap (ver `agents/ponytail.md`). firebase CLI e gcloud CLI não instalados bloqueiam qualquer execução real do agente Infra assim que o alvo Firebase existir.
- **Dependências específicas**: o nome literal da tool `AskUserQuestion` está hardcoded em pelo menos 2 arquivos (`pr-review.md`, `dev-workflows/SKILL.md`) — precisa virar referência abstrata tipo "pergunte ao humano via o mecanismo interativo do runtime". O wiring de hook do rtk e do caveman é mecanismo específico do Claude Code (`PreToolUse`, `SessionStart`), mesmo que a lógica de baixo nível seja portável.
- **Mudança de escopo Supabase → Firebase (2026-09-20)**: por instrução explícita do Fabio, o escopo Legacy (Supabase) foi removido do `security-reviewer`/`qa-agent` e dos agentes correlatos de revisão (`pr-review`, `dedup-refactor`, `code-review`), substituído por uma nota de migração curta; o escopo Target (Firebase) passou a ser o único escopo real desses agentes. Isso reduz a cobertura de revisão automatizada disponível pros PRs #21/#22/#23, que continuam abertos — ver RISKS abaixo pro trade-off.

## TARGET AGENT SYSTEM

13 agentes canônicos em `.agent-system/agents/`, cada um runtime-agnóstico e regido pelos gates em `.agent-system/gates/gates.md`:

1. **orchestrator** — recebe a tarefa, classifica, monta o TASK CONTEXT (`templates/task-context.md`), aciona os demais agentes na ordem certa, aplica quality gate e loop de retry/escalonamento.
2. **spec** — transforma pedido em especificação clara antes de qualquer código, decide quando o gate SPEC READY está satisfeito.
3. **product** — dono de prioridade/critério de aceite do ponto de vista de produto, alimenta spec/architecture.
4. **architecture** — decide desenho técnico entre repos (pwa/admin/backend), aciona o gate ARCHITECTURE APPROVED.
5. **backend** — implementação do lado `backend/` (Firebase/GCP).
6. **pwa** — implementação do app do participante.
7. **admin** — implementação do painel administrativo.
8. **qa** — regras de negócio, plano e execução de teste (unitário/API/integração/E2E), decide o que vira teste permanente.
9. **security** — revisão de segurança independente, só reporta, não corrige.
10. **infra** — CI/CD, deploy, ambientes; bloqueado hoje por falta de firebase/gcloud CLI.
11. **code-review** — revisão de diff/PR consolidando o que antes era pr-review + dedup-refactor.
12. **adr** — registra decisões já tomadas por architecture/orchestrator, nunca inventa decisão.
13. **ponytail** — gate anti-overengineering; documentado por completude da spec, mas `portable: false` / `NOT_INSTALLED` — não está ativo em nenhum workflow.

## COMMUNICATION GRAPH

O **orchestrator** é o hub — toda tarefa entra por ele. `spec` e `product` alimentam `architecture` com requisito e critério de aceite. `architecture` alimenta `backend`, `pwa` e `admin` com desenho técnico aprovado. `backend`/`pwa`/`admin` entregam trabalho para `qa`, `security` e `code-review` em paralelo (nenhum dos três corrige o código do outro — cada um só reporta ou revisa dentro do seu escopo). `infra` valida de forma independente e pode bloquear qualquer um dos agentes de implementação (ex: se o ambiente de deploy não está pronto, nada vai para produção mesmo que qa/security tenham aprovado). `adr` registra as decisões que saíram de `architecture` ou do próprio `orchestrator` — nunca decide sozinho. `ponytail` entraria no fim do fluxo, depois de tudo aprovado, como último gate anti-overengineering — mas está inativo/gap, então esse ponto do grafo hoje não tem executor real.

## WORKFLOW GRAPH

Ver `.agent-system/workflows/task-workflow.md` (ciclo de vida de uma tarefa do pedido inicial até o merge), `.agent-system/workflows/pr-workflow.md` (as 3 fases obrigatórias: análise, correção, merge — merge sempre humano) e `.agent-system/workflows/deploy-workflow.md` (fluxo de deploy, hoje ainda referenciando o par Vercel/GitHub Pages do repo Supabase-era, a ser reescrito quando o deploy Firebase for definido).

## RUNTIME ADAPTER ARCHITECTURE

Cada runtime tem seu próprio README de adapter em `.agent-system/adapters/<runtime>/README.md` (`claude`, `codex`, `antigravity`) — a regra de `CONVENTIONS.md` é que um arquivo de adapter só traduz "como este runtime específico invoca a coisa canônica", nunca duplica lógica de processo que já vive em `agents/` ou `rules/`. Detalhamento completo de o que é NATIVE/ADAPTER/UNAVAILABLE por capacidade está em `manifests/runtime-parity.md`.

## MIGRATION PLAN

- **Mantido**: lógica do dedup-refactor, o framework de ciclo de teste do qa-agent, a política de quality gate, as regras de git-flow/formato de commit, o processo de PR em 3 fases.
- **Alterado**: `security-reviewer` e `qa-agent` inicialmente ganharam separação explícita de escopo Legacy (Supabase, o que existia até então) vs Target (Firebase, o que vem depois). Em 2026-09-20, por instrução explícita do Fabio, o escopo Legacy foi removido por completo desses dois agentes e dos agentes correlatos de revisão (`pr-review`, `dedup-refactor`, `code-review`) — substituído por uma nota de migração curta, com o escopo Target (Firebase) promovido a único escopo real, não mais uma subseção. Ver RISKS pro trade-off dessa decisão. O `orchestrator` generalizou as referências a nome de tool específica de runtime.
- **Dividido**: a lógica de revisão-apenas do `pr-review.md` e a lógica do `dedup-refactor.md` foram conceitualmente unificadas no canônico `agents/code-review.md` — mas os dois arquivos adapter do Claude (`.claude/agents/pr-review.md`, `.claude/agents/dedup-refactor.md`) continuam existindo separadamente como adapters específicos daquele runtime.
- **Consolidado**: todas as regras foram canonicalizadas sob `.agent-system/rules/` + `.agent-system/policies/`.
- **Criado**: agentes spec/product/architecture/backend/pwa/admin/infra/adr/ponytail, documentação de adapter Codex/Antigravity, `AGENTS.md` na raiz, script doctor (`scripts/agent-system-doctor.mjs`), este relatório de auditoria.
- **Removido**: nada foi deletado.
- **Adaptado**: `CLAUDE.md` ganhou uma seção curta apontando para `.agent-system/`, sem remoção de conteúdo existente.

## RISKS

- **Riscos técnicos**: adapters Codex/Antigravity nunca rodaram ponta a ponta — não há instalação local para testar contra.
- **Riscos de portabilidade**: acesso a Jira/browser é específico da sessão Claude Code (MCP); outros runtimes precisam da própria configuração de MCP-equivalente ou perdem essa capacidade por completo.
- **Riscos de segurança**: o escopo "Target" do `security-reviewer` (Firebase) foi escrito só a partir do documento de arquitetura, nunca validado contra `firestore.rules` reais, porque os repos ainda não existem — precisa revalidação assim que os repos reais existirem.
- **Riscos de manutenção**: agora existem duas cópias de `qa-agent/SKILL.md` (a do projeto, atualizada, e a global em `~/.claude/skills/qa-agent/SKILL.md`, que ficou desatualizada) — o Fabio precisa decidir se sincroniza manualmente ou se aceita a divergência.
- **Risco de cobertura (trade-off aceito em 2026-09-20)**: PRs #21/#22/#23 (Supabase-specific fixes) remain open on this repo but are no longer covered by the security/qa agents' active scope — any further automated review of those PRs requires manual reactivation of Supabase-specific checks or human review.

## RECOMMENDATIONS

1. Instalar firebase CLI e gcloud CLI antes de qualquer trabalho real do agente Infra.
2. Decidir se Ponytail vai ser instalado/construído de fato ou formalmente removido de escopo — hoje ele existe só como documentação de gap.
3. Quando os 3 novos repos Firebase forem criados, copiar esta pasta `.agent-system/` inteira para cada um, seguindo `docs/bootstrap.md`.
4. Resolver a divergência entre a cópia global e a de projeto de `qa-agent/SKILL.md`.
5. Assim que uma sessão Codex ou Antigravity real estiver disponível, rodar a smoke task descrita em `docs/bootstrap.md` para verificar os adapters de verdade antes de confiar neles.

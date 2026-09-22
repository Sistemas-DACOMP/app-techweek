# Blockers

Um blocker aqui significa: não dá pra avançar sem uma ação humana específica. Nenhum agente
resolve isto sozinho escalando pra outro agente.

## PARTIALLY RESOLVED — Maestri install/configuração real

**O quê**: Fabio instalou `themaestri.app` (confirmado: skills `maestri`/`maestri-manager`/etc.
apareceram disponíveis nesta conta, e uma pasta `.maestri/roles/` real apareceu neste repo
2026-09-22 — agora gitignorada). App é GUI-only, sem CLI/API programável de fora dele, como já
documentado em `adapters/maestri/README.md` e ADR-004.

**O que falta**: esta sessão específica do Claude Code não está conectada ao canvas — `maestri`
não existe no PATH deste terminal, `$MAESTRI_CLI` vazio (testado 2 vezes, mesmo resultado). Canvas
cria o terminal conectado de dentro do próprio app — uma sessão externa como esta não entra
retroativamente.

**Ação humana exata**: se Fabio quiser esta conversa dentro do Maestri, precisa recomeçar de um
terminal criado pelo próprio app; senão, o sistema de agentes funciona igual fora do Maestri (como
rodou a sessão inteira).

**Como validar quando resolvido**: `maestri list` funcionando dentro do terminal em questão.

## RESOLVED — Verificação real do Antigravity

CLI `agy` confirmado instalado (v1.2.7/1.2.8) e, com autorização explícita do Fabio pra usar
`--dangerously-skip-permissions` (2026-09-22, permanente pra testes de Antigravity), completou uma
tarefa real ponta a ponta: leu `AGENTS.md` + `.agent-system/context/*` + `state/active-task.md` e
escreveu um Context Understanding Report correto e independente em
`.agent-system/state/antigravity-context-report-2026-09-22.md` — inclusive levantou sozinho as
mesmas duas perguntas abertas já rastreadas aqui (piloto, épico Jira). Ver `manifests/system.yaml`
→ `supported_runtimes.antigravity` pro detalhe completo, incluindo a ressalva de que `--mode plan`
trava em modo headless (usar `--mode accept-edits`) e que sessão interativa normal (sem o flag de
skip) segue não testada.

## RESOLVED — Deleção de branches órfãs

Fabio confirmou via `AskUserQuestion` (2026-09-22). Verificado antes de deletar: nenhum worktree
ativo usava essas branches (`git worktree list` só mostrava `kan45`), sem cópia remota
(`git branch -a` só listava local). Deletadas: `worktree-agent-a7921c9391c8cf17b`,
`worktree-agent-ab6012e30bdb10492` (`git branch -D`).

## RESOLVED — Tarefa piloto (Fase 24)

KAN-47 rodou o ciclo completo (ver `state/task-history/2026-09-22-kan47-cracha.md`) — spec achou
gap real, human gate resolveu ambiguidade, implementação + testes + quality-gate, review
independente do Antigravity (PASS), PR #96 mergeada pelo Fabio. PR #97 (o próprio agent-system)
também mergeada, e uma revisão retroativa real achou e corrigiu staleness residual (PR #98).

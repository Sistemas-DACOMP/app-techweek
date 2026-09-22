# Blockers

Um blocker aqui significa: não dá pra avançar sem uma ação humana específica. Nenhum agente
resolve isto sozinho escalando pra outro agente.

## BLOCKED — Maestri install/configuração real

**O quê**: Fabio pediu para instalar e configurar `themaestri.app`. É um app desktop nativo
(canvas de orquestração), sem CLI nem API — confirmado via leitura da página oficial 2026-09-22.
Instalação e configuração (conectar terminais de agente, desenhar o canvas, atribuir papéis) são
ações de interface gráfica.

**O que foi feito**: pesquisa do produto, documentação do que ele é/faz, preparo de
`.agent-system/adapters/maestri/README.md` com o passo a passo exato.

**O que falta**: baixar o instalador Windows, instalar, abrir o app, conectar os terminais deste
projeto ao canvas, atribuir papéis por agente.

**Ação humana exata**: Fabio baixa e instala `themaestri.app` (build Windows), abre o canvas,
segue `.agent-system/adapters/maestri/README.md` pra conectar os terminais Claude Code/Antigravity
deste repo.

**Como validar quando resolvido**: Fabio confirma o app instalado e um workspace criado
apontando pra este repo; então atualizar `manifests/system.yaml` com o status real.

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

## BLOCKED — Tarefa piloto (Fase 24)

**O quê**: a spec pede rodar um ciclo real (Jira → orchestrator → ... → human gate) usando este
sistema, pelo menos uma etapa em cada runtime disponível.

**O que falta**: escolher um item real de baixa/média criticidade do backlog KAN. Sem isso, Fase
24-27 (piloto, validação independente, teste de integração final) não têm o que processar.

**Ação humana exata**: Fabio aponta um card KAN específico (ou autoriza escolher um automaticamente
a partir do Backlog).

**Como validar quando resolvido**: task context real preenchido em `state/active-task.md` para
esse card, handoff real gerado em `handoffs/`.

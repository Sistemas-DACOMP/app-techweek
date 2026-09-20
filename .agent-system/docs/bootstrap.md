# Bootstrap — como entrar neste sistema num checkout novo

Fluxo para um membro novo do time (ou uma sessão de agente nova, em qualquer runtime) começar a trabalhar neste projeto usando `.agent-system/`. Segue a spec seção 58, concretizado para o App TechWeek.

## Passo a passo

1. **Clonar o repo.** Numa sessão nova, `claude-context/` não existe (é local do Fabio, gitignored) — trate como histórico pessoal complementar, nunca pré-requisito. O que precisa sobreviver a um `git clone` já está versionado: `CLAUDE.md`, `docs/business-rules/`, `.claude/`, e agora `.agent-system/`.

2. **Escolher um runtime de IA.**
   - **Claude Code** tem suporte nativo completo hoje — todos os agentes, skills, hooks e MCPs (Jira/Atlassian, browser) já funcionam.
   - **Codex** e **Antigravity** têm adapters documentados mas **não verificados** nesta máquina (CLIs não instaladas na auditoria de 2026-09-20). Ver `.agent-system/adapters/codex/README.md` e `.agent-system/adapters/antigravity/README.md` antes de assumir paridade total — em especial, Jira e Browser via MCP não têm equivalente configurado para esses runtimes neste ambiente.

3. **Deixar o runtime ler o arquivo de bootstrap dele.**
   - Claude Code lê `CLAUDE.md` automaticamente.
   - Outros runtimes leem `AGENTS.md` na raiz do repo.
   - Ambos apontam para `.agent-system/manifests/system.yaml`, que é a fonte de verdade sobre o que existe (agentes, plugins, capacidades, status de portabilidade).

4. **Ler o agente específico da tarefa.** Antes de agir, ler `.agent-system/agents/<agente>.md` correspondente ao trabalho — por exemplo, `agents/qa.md` para escrever teste, `agents/security.md` para revisão de segurança, `agents/orchestrator.md` se não estiver claro qual agente é o certo (ele classifica a tarefa e roteia).

5. **Rodar o script doctor** para validar capacidades da máquina antes de começar:
   ```
   node scripts/agent-system-doctor.mjs
   ```
   Ele confere se os manifestos existem, se os 13 arquivos de agente estão presentes, se git/gh/node estão no PATH, e avisa (sem falhar) sobre docker/firebase/gcloud ausentes. Ver `.agent-system/docs/health-check.md` para detalhe completo e um exemplo de execução real.

6. **Verificar acesso a git/gh** (e Jira MCP, se estiver usando Claude Code):
   ```
   git --version
   gh auth status
   ```
   Se estiver no Claude Code e for usar Jira, confirmar que a MCP Atlassian está respondendo (ex: pedir para listar um board) antes de contar com ela numa tarefa real.

7. **Executar uma smoke task** antes de começar trabalho de verdade: pedir ao agente `orchestrator` para classificar uma tarefa trivial (ex: "corrigir um typo em um comentário") e produzir um TASK CONTEXT seguindo `.agent-system/templates/task-context.md`. Se isso sair limpo — classificação correta, TASK CONTEXT preenchido, nenhum agente inventado que não exista em `manifests/system.yaml` — o wiring está confirmado para aquela sessão/runtime.

## Quando os repos Firebase existirem

Este `.agent-system/` vive hoje dentro do repo antigo (`app-techweek`, era Supabase) porque é o único repo git que existe no momento da criação deste sistema (2026-09-20). Quando os 3 repos-alvo forem criados (`apps/pwa`, `apps/admin-web`, `backend/`), copiar esta pasta inteira para cada um deles e resolver os `Known gaps` de cada agente que hoje diz "não existe ainda" (ver seção "Known gaps" de cada arquivo em `agents/`). Antes de qualquer trabalho de Infra real contra o novo stack, instalar firebase CLI e gcloud CLI — ver `manifests/capability-matrix.md`.

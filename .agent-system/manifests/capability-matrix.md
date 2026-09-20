# Capability matrix

Auditoria feita em 2026-09-20, nesta máquina (Windows 11, Fabio). Cada linha é uma capacidade que um agente pode precisar; a coluna de status é o que foi verificado de fato, não uma suposição. Ver `.agent-system/docs/CONVENTIONS.md` para a regra de "nunca fabricar" — nada aqui é otimista.

| Capacidade | Status | Detalhe |
|---|---|---|
| filesystem | AVAILABLE | leitura/escrita local, sem restrição observada |
| shell | AVAILABLE | Bash (Git Bash/POSIX sh) e PowerShell 5.1, ambos funcionais nesta sessão |
| git | AVAILABLE | 2.49.0.windows.1 |
| github (gh CLI) | AVAILABLE | 2.98.0, autenticado como `Oliveira-Jr` |
| node / npm | AVAILABLE | node v22.16.0, npm 11.10.0 |
| test-runner | AVAILABLE | Vitest via `npm run test` / `npm run test:integration` (ver `package.json` do repo atual) — específico do repo Supabase-era, não confirmado para os 3 repos Firebase futuros até eles existirem |
| jira | AVAILABLE (Claude Code apenas) | via Atlassian MCP (`mcp__claude_ai_Atlassian__*`). É config do lado do cliente MCP da sessão Claude Code — **não garantido** numa sessão Codex/Antigravity a menos que essa MCP seja configurada lá também |
| browser | AVAILABLE (Claude Code apenas) | via `claude-in-chrome` MCP. Mesma ressalva: config específica da sessão Claude Code, não portável automaticamente |
| rtk (Rust Token Killer) | AVAILABLE, mas parcial | binário standalone 0.45.0 em `/c/Users/fabio/bin/rtk`, funciona via `rtk proxy <cmd>` manual em qualquer shell. A reescrita transparente automática (`git status` → `rtk git status` sem esforço) só funciona através do hook `PreToolUse` de Bash do Claude Code — não existe equivalente confirmado em Codex/Antigravity |
| docker | NOT FOUND | não instalado nesta máquina |
| firebase CLI | AVAILABLE | 15.30.2, instalado em 2026-09-20 nesta máquina |
| gcloud CLI | NOT FOUND | não instalado nesta máquina |

## Bloqueio real a marcar

`firebase` CLI instalado (15.30.2, 2026-09-20) **desbloqueia validação de config estática** pro agente `infra` — `firebase.json` schema check, revisão de `firestore.rules`, `firebase projects:list` pra confirmar acesso a projeto — assim que esses arquivos/projeto existirem no repo. Isso remove o bloqueador de ferramenta, não o de artefato: hoje ainda não existe `firebase.json`, `firestore.rules` nem os repos `apps/pwa`, `apps/admin-web`, `backend/` (ver `project_context.status: TRANSITIONAL` em `manifests/system.yaml`), então não há nada pra apontar o CLI ainda.

`gcloud` ausente **continua sendo bloqueador real e concreto** pra qualquer operação que precise de API do GCP diretamente — mudança de política IAM, configuração de runtime de Cloud Functions além do que `firebase deploy` cobre, Cloud Build. A instalação dessa CLI ainda precisa acontecer antes de qualquer execução real de infra que dependa dela.

## Runtime-specific note

Este quadro descreve a máquina, não o runtime. `git`, `github`, `node`, `docker`, `firebase`, `gcloud` são capacidades de SO/CLI e, uma vez instaladas, funcionam do mesmo jeito não importa qual AI runtime está rodando em cima. `jira` e `browser` são diferentes: dependem de MCP servers configurados por sessão/cliente, então "AVAILABLE" aqui significa "disponível nesta sessão Claude Code", não "disponível no sistema". Ver `manifests/runtime-parity.md` para o cruzamento completo por runtime.

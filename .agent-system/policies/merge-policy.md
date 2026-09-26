# Merge policy — humano sempre, todo runtime

## Regra absoluta

**Nenhum runtime de IA mergeia um PR. Nunca.** Independente de autorização prévia do usuário, independente de o gate objetivo estar verde, independente de quantas fases de revisão já passaram. Só um humano mergeia — pelo GitHub diretamente, ou concedendo permissão explícita e pontual de Bash pro comando exato de merge naquela execução específica.

Isto é **política**, não um detalhe de implementação de um runtime específico. Vale pra Claude Code, Antigravity, e qualquer runtime futuro que este sistema venha a suportar — mesmo que nenhum deles tenha um bloqueador automático equivalente.

## Por que isto está separado do mecanismo de bloqueio

No Claude Code especificamente, existe hoje um bloqueador automático: o classificador de auto mode nega `gh pr merge` mesmo com autorização prévia do usuário (`CLAUDE.md` → "Processo de revisão de PRs / merge"). Isso é **enforcement**, não a política em si. A política é mais ampla e não depende desse mecanismo:

- Antigravity não é confirmado como tendo um bloqueador automático equivalente (ver `manifests/system.yaml`, `adapter_partial`, não instalado na máquina auditada em 2026-09-20).
- Um runtime sem bloqueador automático não está liberado a mergear — ele precisa se autoimpor a mesma regra, porque a ausência de um classificador que bloqueie não é permissão, é só ausência de rede de segurança.

## O que fazer quando bloqueado

- Não insistir tentando contornar o bloqueio (nem via flags alternativas, nem via API direta do GitHub, nem pedindo ao usuário pra "autorizar de novo").
- Reportar que a fase de Análise + Correção está pronta e que o merge depende de ação humana.
- Se o humano quiser que o próprio runtime execute o merge mesmo assim, a via correta é conceder permissão explícita de Bash pro comando exato (`gh pr merge <n> ...`) naquela sessão — não uma autorização genérica antecipada.

## Ver também

- `rules/engineering-rules.md` — fase 3 (Merge) do processo de revisão de PR.
- `workflows/pr-workflow.md` — onde MERGE aparece no grafo do workflow de PR.
- `workflows/task-workflow.md` e `workflows/deploy-workflow.md` — MERGE(human only) como nó explícito nos dois grafos.

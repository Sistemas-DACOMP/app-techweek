# Engineering rules (canonical) — index

Fonte canônica; CLAUDE.md em cada repo é o bootstrap que aponta para cá — se este arquivo e um CLAUDE.md divergirem, este arquivo vence, mas avise o Fabio, não resolva sozinho.

**Reestruturado 2026-09-22**: as regras abaixo viviam como texto corrido neste arquivo. Cada uma
agora tem seu próprio registro por ID (`RULE-NNN-*.md`, schema: title/status/scope/source/
trigger/must/must_not/confidence/validation/supersedes), pra bater com o formato que a spec do
Fabio pede e pra permitir marcar status (ACTIVE/SUPERSEDED/REJECTED/DEPRECATED) por regra
individualmente em vez de um bloco só. Este arquivo virou índice — não duplica o conteúdo.

## Regras ativas

- [RULE-001](RULE-001-no-ai-coauthor-trailer.md) — nunca incluir trailer de co-autoria de IA em commits
- [RULE-002](RULE-002-no-windows-env-changes-without-asking.md) — nunca alterar variável de ambiente do Windows sem pedir antes
- [RULE-003](RULE-003-commit-message-format.md) — formato de mensagem de commit
- [RULE-004](RULE-004-git-flow-branch-sequence.md) — sequência de branch do Git Flow
- [RULE-005](RULE-005-branch-protection-approvals.md) — branch protection e exigência de aprovação
- [RULE-006](RULE-006-pr-jira-comment-tone.md) — tom de comentário em PR/Jira
- [RULE-007](RULE-007-three-phase-pr-review-merge-human-only.md) — processo de PR em 3 fases, merge sempre humano
- [RULE-008](RULE-008-merge-order-overlapping-prs.md) — ordem de merge entre PRs que tocam os mesmos arquivos
- [RULE-009](RULE-009-parallelize-independent-work.md) — paralelizar trabalho independente
- [RULE-010](RULE-010-business-rule-catalog-gate.md) — toda mudança de regra de negócio passa pelo catálogo antes

## Ver também

- `rules/evidence-model.md` — classificação de regras de negócio (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA) e o modelo genérico FACT/INFERENCE/ASSUMPTION/UNKNOWN.
- `policies/quality-gate.md` — comandos objetivos de lint/build/test.
- `policies/merge-policy.md` — regra de merge humano-only, runtime-agnostic.
- `policies/pr-jira-tone.md` — tom de comentário e regras de escopo em Jira.

# Infraestrutura de IA do App TechWeek

Este documento explica a arquitetura de agentes/skills/workflows/tools/quality gates deste
repositório, para que qualquer pessoa do time consiga entender e estender sem depender de
explicação verbal de quem configurou.

## Por que isso existe

O conhecimento operacional do projeto (regras de negócio, processo de PR, padrões de teste,
critérios de qualidade) precisa sobreviver a um `git clone` e a uma sessão nova do Claude Code.
Nada disso deve depender de o Fabio lembrar o agente do que fazer ou reexplicar regras já
definidas. Ver a missão completa em `Update Prompts/` (fora deste repo, notas pessoais do Fabio).

## Arquitetura

```
Orchestrator (.claude/skills/dev-workflows/SKILL.md)
├── Agents
│   ├── qa-agent            (.claude/skills/qa-agent/SKILL.md)
│   ├── pr-review           (.claude/agents/pr-review.md)
│   ├── security-reviewer   (.claude/agents/security-reviewer.md)
│   └── dedup-refactor      (.claude/agents/dedup-refactor.md)
├── Workflows                (dentro de dev-workflows/SKILL.md: FEATURE, BUGFIX, PR REVIEW, TESTING)
├── Tools                    (built-in: Read/Edit/Grep/Glob/Bash; externas: gh CLI, MCP Atlassian/Jira,
│                              MCP Supabase homolog; script: scripts/quality-gate.mjs)
├── Persistent Rules         (docs/business-rules/*.md)
├── Quality Gates            (scripts/quality-gate.mjs + threshold documentado em dev-workflows)
└── Repository                (este repo — tudo acima é versionado)
```

`TOOLS = capacidades técnicas` · `SKILLS/AGENTS = conhecimento e especialização` ·
`WORKFLOWS = processo` · `ORCHESTRATOR = coordenação` · `QUALITY GATES = controle objetivo` ·
`HUMANO (Fabio) = autoridade final em decisão ambígua de produto/segurança/merge`.

Não existe "um agente por tool" nem um agente por área hipotética — só foram criados agentes
com responsabilidade claramente distinta e valor imediato (ver Fase 6 abaixo pra critério de
quando adicionar mais um).

## Estrutura de arquivos

| Caminho | O que é |
|---|---|
| `CLAUDE.md` | Contexto do projeto, carregado automaticamente em toda sessão. Ponto de entrada. |
| `docs/business-rules/` | Catálogo de regras de negócio (uma por arquivo), classificadas CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA. |
| `docs/superpowers/specs/` | Specs de decisões de infra/arquitetura (design docs). |
| `.claude/skills/qa-agent/` | Skill de QA — ciclo completo de teste multicamada. |
| `.claude/skills/dev-workflows/` | Orquestrador — classifica a tarefa, delega, aplica quality gate. |
| `.claude/agents/pr-review.md` | Agente de revisão de PR (análise → correção → revalidação → preparação). |
| `.claude/agents/security-reviewer.md` | Agente de revisão de segurança independente. |
| `.claude/agents/dedup-refactor.md` | Agente de análise de duplicação (sob pedido). |
| `scripts/quality-gate.mjs` | Roda lint+build+test e imprime o resultado estruturado do quality gate. |
| `scripts/check-ai-infra.mjs` | Bootstrap — confirma o que existe/falta configurar num checkout. |
| `.github/workflows/ci.yml` | CI: `npm ci` → lint → build → test (`--if-present`). |

## Matriz de responsabilidades

| Agente/Skill | Responsabilidade | Tools principais | Entrada | Saída |
|---|---|---|---|---|
| dev-workflows (orquestrador) | classificar tarefa, delegar, aplicar quality gate e loop de reprocessamento | — (roteamento) | pedido do usuário | workflow + agentes acionados |
| qa-agent | regras de negócio → testes multicamada | Read/Grep/Glob/Edit/Bash | regra ou feature/bug | matriz de cobertura, bugs reportados |
| pr-review | analisar/corrigir/revalidar/preparar PR | Read/Grep/Glob/Bash/Edit + `gh` | número do PR | achados, correções, comentário no PR/Jira |
| security-reviewer | achar problema de segurança, não corrigir | Read/Grep/Glob/Bash | diff ou área do código | lista de achados por severidade + security_score |
| dedup-refactor | achar duplicação, propor abstração | Read/Grep/Glob | pedido explícito | lista de duplicações + refatoração sugerida |

## Fluxo de execução (exemplos)

**Feature**: entender requisito → Jira/backlog → `docs/business-rules/` → implementar →
qa-agent → security-reviewer (se área sensível) → `npm run quality-gate` → PR.

**Bugfix**: reproduzir → causa raiz → corrigir → teste de regressão (qa-agent) →
`npm run quality-gate` → PR.

**PR review**: delegado ao agente `pr-review`, que já implementa as 4 fases obrigatórias.

**Testing**: delegado à skill `qa-agent`.

Detalhe completo de cada workflow, quality gate, loop de reprocessamento e classificação de
falha: `.claude/skills/dev-workflows/SKILL.md`.

## Como uma sessão nova recupera o contexto

1. Claude Code carrega `CLAUDE.md` automaticamente ao abrir o repo.
2. Skills (`qa-agent`, `dev-workflows`) são carregadas sob demanda quando o pedido do usuário
   casa com a descrição delas — não é preciso invocar manualmente.
3. Agentes (`pr-review`, `security-reviewer`, `dedup-refactor`) são chamados via delegação
   (workflow ou pedido direto).
4. Regras de negócio ficam em `docs/business-rules/` — sempre consultadas antes de reclassificar
   uma regra do zero.

Nada disso depende do histórico de conversa. `claude-context/` (notas locais do Fabio,
gitignored) não é pré-requisito — ver aviso em `CLAUDE.md`.

## Setup para um novo integrante do time

```
git clone <repo>
cp .env.example .env.local   # preencher com as credenciais do Supabase de HOMOLOGAÇÃO (nunca produção)
npm install
npm run check-ai-infra       # confirma o que já está pronto e o que falta configurar
gh auth login                # necessário só para quem for usar `gh` (PR/issue) diretamente
```

O que **cada pessoa configura localmente** (nunca vai pro Git):
- `.env.local` (credenciais Supabase de homolog)
- Autenticação pessoal do `gh` CLI
- Autenticação pessoal dos MCPs (Jira/Atlassian, Supabase) quando usar Claude Code com esses
  conectores — cada integrante autentica com a própria conta.

## Quality Gate

Threshold: `>= 0.80`, mas a nota nunca substitui critério obrigatório (lint sem erro real, build
passando, teste passando quando existir suíte). Rodar com `npm run quality-gate`. Ver
`.claude/skills/dev-workflows/SKILL.md` seção "QUALITY GATE" pro JSON completo e como
`confidence_score`/`security_score` são preenchidos pelos agentes revisores.

## Limitações conhecidas

- `gh pr merge` é bloqueado para o Claude Code neste projeto — merge é sempre ação humana pelo
  GitHub, mesmo com autorização prévia.
- Regra INFERIDA nunca vira regra oficial/teste permanente sem validação humana (AskUserQuestion
  com opção recomendada).
- `npm run test` ainda não existe na `develop` — a suíte Vitest está no PR #17 (KAN-31), sem
  aprovação ainda. Até lá, `quality-gate`/CI pulam esse passo.
- Gaps de segurança conhecidos sem correção agendada: KAN-27 (senha fraca), KAN-28 (LGPD só no
  front), KAN-29 (limite de avatar só no front), KAN-30 (scanner aceita QR de qualquer palestra)
  — ver `docs/business-rules/`.

## Como estender

- **Nova regra de negócio**: criar arquivo em `docs/business-rules/` seguindo o template do
  `README.md` de lá; classificar corretamente; nunca promover INFERÊNCIA sem validação.
- **Nova skill**: só quando um processo recorrente novo justificar (ex.: release). Seguir o
  formato de `dev-workflows/SKILL.md` — quando aciona, pré-condições, agente responsável, tools,
  validações, saída, critério de sucesso, quando exige aprovação humana.
- **Novo agente**: só quando houver responsabilidade claramente distinta e sem sobreposição com
  um agente existente (ver seção 19/29 do prompt original — não criar complexidade artificial).
  Registrar em `.claude/agents/` com frontmatter `name`/`description`/`tools`.
- **Novo workflow**: adicionar seção em `dev-workflows/SKILL.md` em vez de criar arquivo novo,
  a menos que o workflow seja grande o suficiente para merecer skill própria.

## Fase 6 (expansão) — ainda não iniciada

Candidatos a agente futuro (Backend Reviewer, Frontend Reviewer, Architecture Reviewer) só
devem ser criados quando o time observar necessidade real — não antecipar.

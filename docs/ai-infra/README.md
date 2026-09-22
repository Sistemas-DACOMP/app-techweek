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
│   ├── code-review         (.claude/agents/code-review.md — inclui a análise de duplicação, sob pedido)
│   └── security            (.claude/agents/security.md)
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

**Nota sobre a estrutura de pastas**: o desenho original previa uma pasta por camada
(`.claude/agents/`, `.claude/skills/`, `.claude/workflows/`, `.claude/rules/`, `.claude/context/`,
`.claude/config/`). Adaptamos pro mecanismo real do Claude Code em vez de criar pastas que ele não
lê: `agents` e `skills` são literais (é isso que o Claude Code carrega); `workflows` viraram
seções dentro da skill `dev-workflows` em vez de arquivos soltos, porque cada workflow é curto
e todos compartilham o mesmo quality gate/loop — separar traria mais arquivo sem mais clareza;
`rules` é `docs/business-rules/` (já existia, um arquivo por regra, é o que os agentes/skills
leem); `context` é o próprio `CLAUDE.md` (carregado automaticamente, sem precisar de pasta extra);
`config` é `.claude/settings.local.json` (já existia). Nenhuma capacidade do prompt original foi
descartada — só remapeada pro que o Claude Code de fato executa.

## Estrutura de arquivos

| Caminho | O que é |
|---|---|
| `CLAUDE.md` | Contexto do projeto, carregado automaticamente em toda sessão. Ponto de entrada. |
| `docs/business-rules/` | Catálogo de regras de negócio (uma por arquivo), classificadas CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA. |
| `docs/superpowers/specs/` | Specs de decisões de infra/arquitetura (design docs). |
| `.claude/skills/qa-agent/` | Skill de QA — ciclo completo de teste multicamada. |
| `.claude/skills/dev-workflows/` | Orquestrador — classifica a tarefa, delega, aplica quality gate. |
| `.claude/agents/code-review.md` | Agente de revisão de PR (análise → correção → revalidação → preparação); também roda análise de duplicação sob pedido. |
| `.claude/agents/security.md` | Agente de revisão de segurança independente. |
| `.claude/agents/git-ops.md` | Camada mecânica de cirurgia de branch/PR e higiene de Jira, embaixo do `code-review`. |
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
3. Agentes (`pr-review`, `security-reviewer`, `dedup-refactor`, e os demais em `.claude/agents/`)
   são chamados via delegação (workflow ou pedido direto) — **mas só ficam disponíveis como
   `subagent_type` de verdade se a sessão do Claude Code for aberta com o diretório de trabalho
   DENTRO deste repo (`app-techweek/` ou mais fundo), nunca numa pasta pai** (ex.:
   `C:\Users\fabio\App_TechWeek\`, um nível acima). Descoberta de subagente customizado sobe do
   cwd até achar a raiz do repo git — nunca desce pra dentro de subpastas. Se a sessão abrir na
   pasta pai (que não é repo git), a subida nunca encontra `.claude/agents/` daqui e nenhum dos
   agentes do projeto aparece como tipo disparável — só os genéricos (`general-purpose`, `Explore`
   etc). Skills (`.claude/skills/`) não têm esse problema porque são descobertas
   dinamicamente conforme arquivos são tocados; agentes só são descobertos uma vez, no início da
   sessão. Verificado em 2026-09-20 (research via `claude-code-guide`, docs oficiais
   `code.claude.com/docs/en/sub-agents.md`). Sem fix de config — é comportamento fixo do Claude
   Code. **Sempre abrir o Claude Code com cwd em `app-techweek/`** (não na pasta pai) pra ter os
   13 agentes/skills funcionando como time de verdade.
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

- **`.env.local`** — credenciais Supabase de homolog (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`),
  a partir de `.env.example`. Pedir os valores pro Fabio, nunca reusar os de produção.
- **`gh` CLI** — `gh auth login --web` (OAuth, evita colar token em texto). Necessário só pra quem
  for interagir com PR/issue direto pelo terminal.
- **MCP Atlassian/Jira** — conector do Claude Code (`claude.ai Atlassian` neste projeto). Cada
  pessoa autentica com a própria conta Atlassian/Jira na primeira vez que uma tool desse MCP for
  chamada (fluxo OAuth guiado pelo próprio Claude Code); não precisa de token manual.
- **MCP Supabase** — conector apontando pro projeto de homologação (`supabase-homolog` neste
  projeto). Configurado a nível de usuário/máquina, não no repo; sem acesso a ele os agentes ainda
  funcionam, só perdem a leitura direta de logs/advisors/tabelas do Supabase (o `@supabase/supabase-js`
  via `.env.local` continua funcionando pros testes de integração independente do MCP).
- Sem essas autenticações, `npm run check-ai-infra` ainda passa (ele confere arquivos do repo, não
  sessão de MCP) — a ausência só aparece na hora de usar a tool específica.

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
- `npm run test:integration` cria contas reais no Supabase de HOMOLOGAÇÃO a cada execução — não
  rodar sem necessidade, nunca contra produção.
- **Não existe suíte de E2E ainda** (nenhum Playwright/Cypress instalado) — a skill `qa-agent`
  lista E2E como camada esperada de cobertura, mas hoje só unit (`npm run test`) e integração
  (`npm run test:integration`) existem de fato. Fica como lacuna conhecida, não decisão definitiva
  de não fazer.
- Gaps de segurança conhecidos sem correção agendada: KAN-27 (senha fraca), KAN-28 (LGPD só no
  front), KAN-29 (limite de avatar só no front), KAN-30 (scanner aceita QR de qualquer palestra)
  — ver `docs/business-rules/`.
- **Abrir sessão fora do repo quebra descoberta de agente customizado** — ver detalhe na seção
  "Como uma sessão nova recupera o contexto" acima. Sem symlink, sem flag de settings.json que
  resolva; único fix real é abrir a sessão com cwd dentro de `app-techweek/`.

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

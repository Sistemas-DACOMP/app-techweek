# Contexto do projeto App TechWeek

`claude-context/` é local do Fabio e **não é versionado** (`.gitignore` — exclusão proposital, tem conteúdo sensível de setup, não remova). Numa sessão que abre a partir de um clone novo esses arquivos não existem — trate como histórico pessoal complementar, nunca como pré-requisito. O conhecimento operacional que precisa sobreviver a um `git clone` está versionado em: este arquivo, `docs/business-rules/`, `docs/superpowers/specs/`, `.claude/skills/`, `.claude/agents/` — ver `docs/ai-infra/README.md` pra arquitetura completa. Se `claude-context/` existir na sua sessão, `como-usar-fluxo-versionamento.md` continua sendo o texto certo pra explicar git flow pro time em linguagem de iniciante.

## Quem é o time

Time de **iniciantes, primeiro projeto de software real** (evento FACOM Tech Week, UFU). O usuário (Fabio) tem conhecimento de DevOps/segurança e está ensinando o resto do time enquanto configura a infra. Quando ele disser que precisa entender algo pra explicar pro time, pare e explique passo a passo em vez de só executar a ação.

## Regras que não mudam

- **Nunca inclua o trailer `Co-Authored-By: Claude` em commits.**
- **Nunca altere variáveis de ambiente do Windows** (nem pra debug) sem pedir antes.
- Padrão de commit: `[TIPO] - descrição curta`, tipos `ADD` `FIX` `UPD` `DEL` `DOC` `CFG`.
- Git Flow: `feature/*` → `develop` → `homolog` → `main`. Branch protection ativa em `main`/`homolog` (PR obrigatório, 0 aprovações) **e também em `develop`** (PR obrigatório, **1 aprovação** — confirmado via API em 2026-09-10, corrigindo a nota antiga que só citava main/homolog).
- Comentário em PR e em card do Jira sempre em linguagem natural, como um dev escrevendo pra outro — nunca com tom de relatório gerado por IA, nem jargão desnecessário. Direto, sem enrolação, mas humano.

## Processo de revisão de PRs / merge

Fluxo obrigatório em 3 fases separadas, não misturar:

1. **Análise** — mapear todos os PRs abertos (objetivo, arquivos, conflitos, riscos) sem alterar código.
2. **Correção** — corrigir problemas encontrados na branch de cada PR (menor mudança possível), rodar lint/build (e teste, ver seção de testes), comentar no PR e no Jira o que foi achado e corrigido.
3. **Merge** — só depois que análise e correção estiverem prontas. **Mergear PR é ação que o Claude Code bloqueia sozinho** (classificador de auto mode nega `gh pr merge` mesmo com autorização prévia do usuário) — só um humano aprova/mergeia pelo GitHub, ou dá permissão explícita de Bash pra esse comando específico. Não insista tentando contornar.

Ordem de merge entre PRs que tocam os mesmos arquivos (ex: `Dashboard.jsx`) importa — resolver o de menor risco/dependência primeiro, atualizar os seguintes com a `develop` mais nova antes de assumir que estão sem conflito.

Quando houver mais de uma atividade independente pra fazer (revisar PRs diferentes, escrever testes de regras diferentes), delegar em agentes paralelos em vez de fazer tudo sequencial.

Toda mudança de comportamento de negócio (nova regra, correção de gap) passa antes pelo catálogo em `docs/business-rules/` — ver seção abaixo.

## Orquestração automática (workflows)

Este projeto reconhece o tipo de tarefa sozinho — não é preciso dizer "use o fluxo de QA" ou "faça revisão de segurança". A skill `.claude/skills/dev-workflows/SKILL.md` é o orquestrador: classifica o pedido (feature/bugfix/PR review/testing), delega pro agente ou skill certo, e aplica o quality gate e o loop de reprocessamento (limite de 3 tentativas antes de escalar pro Fabio).

Agentes e skills disponíveis:

- `.claude/skills/qa-agent/SKILL.md` — regras de negócio, planejamento e execução de testes.
- `.claude/agents/pr-review.md` — análise/correção/revalidação/preparação de PR (nunca mergeia).
- `.claude/agents/security-reviewer.md` — revisão de segurança independente (auth, RLS, uploads, tokens); só reporta, não corrige.
- `.claude/agents/dedup-refactor.md` — análise de duplicação sob pedido explícito.

Quality gate objetivo (lint/build/test) roda com `npm run quality-gate`. Checagem do ambiente de IA (o que existe, o que falta configurar) roda com `npm run check-ai-infra`. Detalhes de threshold, critérios obrigatórios e classificação de falha estão na skill `dev-workflows`.

## CI

`.github/workflows/ci.yml` roda em todo PR: `npm ci` → `npx oxlint --quiet` → `npm run build` → `npm run test --if-present`. `--quiet` no lint porque o projeto tem warnings pré-existentes (unused vars, hook deps) que não bloqueiam merge — só erros reais quebram o CI. Corrigir esses warnings é tarefa separada, ainda não agendada.

## Regras de negócio

Catálogo persistente em `docs/business-rules/` (ver `docs/business-rules/README.md` pro template e legenda). Classificação obrigatória antes de qualquer regra virar teste permanente: `CONFIRMADA` (critério de aceite no Jira ou `changes/*/SPEC.md`) / `INFERIDA` (dedução razoável, não documentada) / `OBSERVADA` (já implementado, não é critério de aceite oficial) / `NÃO DEFINIDA` (nem código nem doc resolvem). **Nunca tratar inferência como regra confirmada sem perguntar ao Fabio antes** (pergunta com opção recomendada). Se a inferência virar bug/gap real, abrir card no Jira antes de escrever o teste permanente.

## Testes automatizados

Vitest mergeado na `develop` (PR #17/KAN-31, 2026-09-11). `npm run test` = unitário (`src/**/*.test.js`, mocka o Supabase), `npm run test:integration` = bate direto no `@supabase/supabase-js` do projeto de HOMOLOGAÇÃO, sem passar pela UI — precisa de `.env.local` com credenciais reais de homolog; se não tiver, os testes usam `describe.skipIf` e pulam em vez de falhar. **`test:integration` cria contas reais no Supabase de homolog a cada execução** (e-mail com timestamp) — normal, mas não rodar sem necessidade nem contra produção. Toda regra de negócio nova ou corrigida deveria ganhar teste.

Existe uma skill do Claude Code (`qa-agent`) que encapsula esse processo inteiro — versionada em `.claude/skills/qa-agent/SKILL.md` neste repo (também existe uma cópia em `~/.claude/skills/qa-agent/SKILL.md` a nível de usuário, pra quando a sessão abre fora do repo). Invocar em vez de reexplicar o framework de teste do zero numa sessão nova.

## Estado da infra (resumo — ver handoff pra detalhes)

- Produção: GitHub Pages, branch `main`, deploy via `.github/workflows/deploy.yml`
- Homologação: Vercel (time `facomtechweek`, projeto `app-techweek-homolog`), Production Branch = `homolog`, Ignored Build Step configurado e testado
- Banco: dois projetos Supabase separados (produção e homolog), centralizados numa conta só
- Kanban: GitHub Project v2 em github.com/users/Oliveira-Jr/projects/1

## Próximo trabalho em andamento

Persistência de gameplay (pontos, missões, ranking) já migrou pro Supabase (`profiles`, `point_events` — ver migrations em `supabase/migrations/`). Pendências atuais (2026-09-11):

- PR #17 (KAN-31, suíte de testes) e #15 (KAN-5) já mergeados na `develop`.
- KAN-27/28/29/30: gaps de validação encontrados via QA (senha fraca só valida tarde no cadastro; aceite de LGPD e limite de avatar só existem no front, não no backend; scanner de presença aceita QR de qualquer palestra) — todos no Backlog, sem correção agendada ainda. Registrados também em `docs/business-rules/`.
- Cobertura de teste ainda falta pra: login (mensagem genérica anti-enumeração), critérios de aceite do avatar (KAN-7), dedup de presença em palestra (KAN-5/`addPointEvent`).
- Fix de segurança já pronto em `develop` (remoção de credencial hardcoded em `seed-admin.js`, commit `a97375a`) nunca foi promovido pra `main` — produção ainda tem o arquivo antigo. Precisa de PR dedicado `develop → homolog → main`.

## Roadmap de infra de agentes/skills

```
FASE 1 — memória persistente (feita: CLAUDE.md, docs/business-rules/, CI, qa-agent versionada)
FASE 2 — orquestrador (feita: .claude/skills/dev-workflows/SKILL.md)
FASE 3 — QA Agent (feita, já existia) + PR Review Agent (feita: .claude/agents/pr-review.md)
FASE 4 — Security Reviewer (feita: .claude/agents/security-reviewer.md)
FASE 5 — integrações Jira/GitHub (feita com o que já existe: gh CLI + MCP Atlassian; sem
          integração mais profunda além disso por enquanto — expandir só se necessidade real aparecer)
FASE 6 — expansão / agentes adicionais (não iniciada — só quando houver responsabilidade
          claramente distinta que justifique um agente novo; ver `docs/ai-infra/README.md`)
```

Ver `docs/superpowers/specs/2026-09-10-persistent-project-memory-design.md` pro design da Fase 1 e `docs/superpowers/specs/2026-09-11-agent-infra-fase2-6-design.md` pras decisões das Fases 2-6 (por que a estrutura de pastas foi adaptada, por que só 2 agentes novos, etc). `docs/ai-infra/README.md` é a arquitetura completa, como configurar num checkout novo e como estender (novo agente/skill/regra). Não pular fase sem validar a anterior funcionando.

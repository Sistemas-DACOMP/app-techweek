# Contexto do projeto App TechWeek

`claude-context/` é local do Fabio e **não é versionado** (`.gitignore` — exclusão proposital, tem conteúdo sensível de setup, não remova). Numa sessão que abre a partir de um clone novo esses arquivos não existem — trate como histórico pessoal complementar, nunca como pré-requisito. O conhecimento operacional que precisa sobreviver a um `git clone` está versionado em: este arquivo, `docs/business-rules/`, `docs/superpowers/specs/`, `.claude/skills/`, `.claude/agents/` — ver `docs/ai-infra/README.md` pra arquitetura completa. Se `claude-context/` existir na sua sessão, `como-usar-fluxo-versionamento.md` continua sendo o texto certo pra explicar git flow pro time em linguagem de iniciante.

## Sistema de engenharia portável (`.agent-system/`)

A partir de 2026-09-20 o comportamento operacional dos agentes (orquestração, regras, gates, workflows) tem fonte canônica em `.agent-system/` — ver `.agent-system/manifests/system.yaml`. Este CLAUDE.md continua sendo o bootstrap que o Claude Code lê automaticamente, mas para trabalho de engenharia não trivial, consulte também `.agent-system/agents/` (comportamento de cada agente) e `.agent-system/docs/audit-report.md` (auditoria completa: o que existe, o que é portável entre Claude Code/Antigravity, o que falta). Os arquivos em `.claude/agents/` e `.claude/skills/` continuam sendo os adapters reais que o Claude Code executa — mantidos sincronizados com a fonte canônica, não substituídos por ela.

**Runtimes suportados: Claude Code + Antigravity apenas (decisão do Fabio, 2026-09-22)** — Codex e GitHub Copilot foram descontinuados. `.agent-system/adapters/codex/` e `.github/copilot-instructions.md` foram removidos. Codex nunca teve adapter real (só um README documentando o que faltava construir), então nada foi perdido; Antigravity mantém os wrappers reais em `.agent-system/adapters/antigravity/agents/`. Todo agente/skill novo daqui pra frente precisa de paridade (ou gap documentado) só entre esses dois runtimes.

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

Agentes e skills disponíveis (lista corrigida em 2026-09-21 — os 3 nomes de arquivo abaixo estavam desatualizados desde o rename de 2026-09-20, ver `.agent-system/adapters/claude/README.md`):

- `.claude/skills/qa-agent/SKILL.md` — regras de negócio, planejamento e execução de testes.
- `.claude/agents/code-review.md` — análise/correção/revalidação/preparação de PR (nunca mergeia); também roda análise de duplicação (DRY) sob pedido explícito.
- `.claude/agents/security.md` — revisão de segurança independente (auth, RLS, uploads, tokens); só reporta, não corrige.
- `.claude/agents/git-ops.md` (novo, 2026-09-21) — cirurgia de branch/PR (recria branch órfã/desatualizada/conflitante, resolve conflito mecânico, abre PR de substituição) e higiene do board Jira (status que não bate com PR real, duplicata, link de bloqueio, issue Bug fora da coluna certa). Camada mecânica embaixo do `code-review`, nunca no lugar dele — nunca julga corretude de código, nunca mexe em branch protection/config de repositório, nunca mergeia. Despacha sozinho, ver `.claude/skills/dev-workflows/SKILL.md`.

Quality gate objetivo (lint/build/test) roda com `npm run quality-gate`. Checagem do ambiente de IA (o que existe, o que falta configurar) roda com `npm run check-ai-infra`. Detalhes de threshold, critérios obrigatórios e classificação de falha estão na skill `dev-workflows`.

## CI

`.github/workflows/ci.yml` roda em todo PR: `npm ci` → `npx oxlint --quiet` → `npm run build` → `npm run test --if-present`. `--quiet` no lint porque o projeto tem warnings pré-existentes (unused vars, hook deps) que não bloqueiam merge — só erros reais quebram o CI. Corrigir esses warnings é tarefa separada, ainda não agendada.

## Regras de negócio

Catálogo persistente em `docs/business-rules/` (ver `docs/business-rules/README.md` pro template e legenda). Classificação obrigatória antes de qualquer regra virar teste permanente: `CONFIRMADA` (critério de aceite no Jira ou `changes/*/SPEC.md`) / `INFERIDA` (dedução razoável, não documentada) / `OBSERVADA` (já implementado, não é critério de aceite oficial) / `NÃO DEFINIDA` (nem código nem doc resolvem). **Nunca tratar inferência como regra confirmada sem perguntar ao Fabio antes** (pergunta com opção recomendada). Se a inferência virar bug/gap real, abrir card no Jira antes de escrever o teste permanente.

## Testes automatizados

**Legado Supabase, ainda em uso enquanto o PWA não migra pra Firebase** (ver "Estado da infra" acima): Vitest mergeado na `develop` (PR #17/KAN-31, 2026-09-11). `npm run test` = unitário (`src/**/*.test.js`, mocka o Supabase), `npm run test:integration` = bate direto no `@supabase/supabase-js` do projeto de HOMOLOGAÇÃO, sem passar pela UI — precisa de `.env.local` com credenciais reais de homolog; se não tiver, os testes usam `describe.skipIf` e pulam em vez de falhar. **`test:integration` cria contas reais no Supabase de homolog a cada execução** (e-mail com timestamp) — normal, mas não rodar sem necessidade nem contra produção. Toda regra de negócio nova ou corrigida deveria ganhar teste. Quando o PWA migrar pra Firebase, essa suíte precisa ser reescrita contra Firestore/Auth emulators — não apagar antes de ter o equivalente novo funcionando, senão perde cobertura de regressão do app que ainda tá no ar.

Existe uma skill do Claude Code (`qa-agent`) que encapsula esse processo inteiro — versionada em `.claude/skills/qa-agent/SKILL.md` neste repo (também existe uma cópia em `~/.claude/skills/qa-agent/SKILL.md` a nível de usuário, pra quando a sessão abre fora do repo). Invocar em vez de reexplicar o framework de teste do zero numa sessão nova.

## Estado da infra (resumo — ver handoff pra detalhes)

**Migração Supabase → Firebase em andamento (verificado em 2026-09-20, dual-stack ativo neste momento):**

- Frontend PWA (`src/`) ainda 100% Supabase — `src/lib/supabaseClient.js`, `Login.jsx`, `Register.jsx`, `Ranking.jsx`, `Scanner.jsx`, `Challenges.jsx`, `useUser.js`, `gameplay.js` continuam usando `@supabase/supabase-js` (ainda dependency ativa no `package.json` raiz). Nenhuma tela do PWA foi migrada pra Firebase ainda.
- Backend novo (`backend/`) já é Firebase de verdade: Express + TypeScript, Cloud Function 2ª geração (`onRequest`, região `us-east1`, 256MiB, maxInstances 10) — mas só tem rotas de esqueleto (`/api/health`, `/api/me`, `/api/staff/test`, `/api/admin/test`); nenhuma rota de negócio real (booking, checkin, leads, admin/activities) foi implementada ainda, apesar de já estar toda especificada em `Update System/arquitetura-montanha-v2.md`.
- `firebase.json` + `.firebaserc` existem na raiz — projeto único `facom-techweek-layerx` pra `default` e `prod` (**não há projeto Firebase separado de homolog**, diferente do padrão que existia no Supabase de dois projetos). `firestore.rules` existe e já cobre `users`/`activities`/`announcements`/`bookings`/`leads`. `firestore.indexes.json` e `storage.rules` **não existem ainda**, embora a spec de arquitetura já os preveja.
- Divergência a confirmar com Fabio: a spec de arquitetura (`Update System/arquitetura-montanha-v2.md`) descreve região `southamerica-east1`, mas o código (`backend/src/index.ts`) está deployado em `us-east1` (free tier).
- Produção (app antigo): GitHub Pages, branch `main`, deploy via `.github/workflows/deploy.yml` — ainda a versão Supabase, migração não chegou lá.
- Homologação (app antigo): Vercel (time `facomtechweek`, projeto `app-techweek-homolog`), Production Branch = `homolog`.
- Kanban: GitHub Project v2 em github.com/users/Oliveira-Jr/projects/1; Jira projeto `KAN` (`app-teckweek.atlassian.net`) é a fonte de verdade pra tracking — 62 issues em 2026-09-20 (22 Backlog, 21 Prod/Concluído, 11 develop, 4 Desenvolvimento, 3 homolog, 1 Bugs).

**Correção de achado anterior:** `.claude/agents/` foi renomeado em 2026-09-20 pra bater 1:1 com `.agent-system/agents/` (`security-reviewer.md`→`security.md`, `pr-review.md`+`dedup-refactor.md`→`code-review.md`, `qa.md` novo — antes só existia como skill). A divergência de nome que existia antes era convenção documentada em `.agent-system/adapters/claude/README.md`, não bug — mas o time decidiu igualar mesmo assim; atualizar esse README se ainda descrever o mapeamento antigo.

**Bug real, encontrado e corrigido, correção confirmada (2026-09-20):** os agentes `architecture` e `adr` não apareciam na lista de agentes disponíveis do Claude Code e falhavam com "Agent type not found" ao serem chamados via Agent tool — reproduzido em 2 sessões separadas. Causa: dos 11 arquivos em `.claude/agents/`, `architecture.md` e `adr.md` eram os **únicos 2** com `: ` (dois-pontos+espaço) dentro do valor não-citado do campo `description:` do frontmatter YAML — o parser provavelmente lê isso como início de um mapeamento aninhado e descarta o arquivo inteiro, silenciosamente. Corrigido removendo o `: ` dos dois arquivos (trocado por travessão). **Confirmado funcionando**: os dois agentes registraram (aparecem na lista de disponíveis) e, testados via Agent tool, carregaram a persona correta (cada um citou uma frase literal da própria description). O registro de agentes do Claude Code parece ser cachê com refresh assíncrono (não por escrita de arquivo) — não confiar em teste imediato após editar `.claude/agents/`, pode levar um tempo pra refletir. **Os 13 agentes canônicos agora disparam de verdade.** Feedback do bug de parsing já registrado no Claude Code.

## Próximo trabalho em andamento

Persistência de gameplay (pontos, missões, ranking) migrou pro Supabase (`profiles`, `point_events` — ver migrations em `supabase/migrations/`) — isso é histórico, pré-decisão de ir pra Firebase. Pendências atuais (2026-09-20):

- PR #17 (KAN-31, suíte de testes) e #15 (KAN-5) já mergeados na `develop` (histórico Supabase).
- KAN-27/28/29/30 (gaps de validação em Supabase: senha fraca, LGPD, limite de avatar, scanner de presença) seguem em `develop`/Backlog — decisão a confirmar com Fabio se ainda valem a pena corrigir no código antigo ou só migram direto pra Firebase via KAN-71/72/73 (ver abaixo).
- KAN-66/67 (setup Firebase, middleware JWT) já em Prod/Concluído e homolog respectivamente — é a base do `backend/` atual.
- KAN-71/72/73: versões Firebase das regras de negócio de KAN-30/28/29 (scanner de presença, LGPD, limite de avatar) — abertas depois que os PRs antigos #21/#22/#23 (feitos em cima do Supabase) foram fechados por causa da migração. Ainda em Backlog/Desenvolvimento, sem implementação.
- Fix de segurança do app antigo (remoção de credencial hardcoded em `seed-admin.js`, commit `a97375a`, em `develop`) nunca foi promovido pra `main` — produção ainda tem o arquivo antigo. Baixa prioridade dado que o app antigo está sendo substituído.

## Roadmap de infra de agentes/skills

```
FASE 1 — memória persistente (feita: CLAUDE.md, docs/business-rules/, CI, qa-agent versionada)
FASE 2 — orquestrador (feita: .claude/skills/dev-workflows/SKILL.md)
FASE 3 — QA Agent (feita, já existia) + PR Review Agent (feita: .claude/agents/code-review.md)
FASE 4 — Security Reviewer (feita: .claude/agents/security.md)
FASE 5 — integrações Jira/GitHub (feita com o que já existe: gh CLI + MCP Atlassian; sem
          integração mais profunda além disso por enquanto — expandir só se necessidade real aparecer)
FASE 6 — expansão / agentes adicionais (git-ops adicionado 2026-09-21; devops proposto,
          decisão pendente — ver `docs/ai-infra/README.md`)
FASE 7 — portabilidade multi-runtime (2026-09-22: reduzida pra Claude Code + Antigravity
          apenas, por decisão do Fabio — Codex e Copilot descontinuados. Antigravity segue
          não testado localmente nesta máquina, CLI não instalado)
```

Ver `docs/superpowers/specs/2026-09-10-persistent-project-memory-design.md` pro design da Fase 1 e `docs/superpowers/specs/2026-09-11-agent-infra-fase2-6-design.md` pras decisões das Fases 2-6 (por que a estrutura de pastas foi adaptada, por que só 2 agentes novos, etc). `docs/ai-infra/README.md` é a arquitetura completa, como configurar num checkout novo e como estender (novo agente/skill/regra). Não pular fase sem validar a anterior funcionando.

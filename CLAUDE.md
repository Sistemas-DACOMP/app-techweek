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
- Git Flow: `feature/*` → `develop` → `homolog` → `main`. Branch protection ativa em `main`/`homolog`/`develop` (PR obrigatório nas três). Exigência de aprovação: `main`/`homolog` **0 aprovações**; `develop` também **0 aprovações** desde 2026-09-21 (era 1, desativado a pedido do Fabio via API — motivo: GitHub bloqueia autor de aprovar a própria PR mesmo via API/CLI, e o time é pequeno demais pra sempre ter um segundo revisor disponível). PR continua obrigatório em `develop` — só a contagem de aprovação foi zerada, merge direto sem PR continua bloqueado.
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

**Supabase 100% removido do projeto (2026-09-21)** — `@supabase/supabase-js` saiu do `package.json`, `src/lib/supabaseClient.js` e `tests/integration/kan28-lgpd.test.js` (só existiam pra ele) foram apagados. `npm run test` = `npx vitest run src scripts tests/unit` (mocka Firebase Auth/Firestore, nunca bate em rede real). Não existe mais `test:integration`/suíte contra ambiente real — se um teste de integração fizer sentido de novo no futuro (ex: contra Firebase Emulator Suite), é infra nova, não a reativação da antiga.

Existe uma skill do Claude Code (`qa-agent`) que encapsula esse processo inteiro — versionada em `.claude/skills/qa-agent/SKILL.md` neste repo (também existe uma cópia em `~/.claude/skills/qa-agent/SKILL.md` a nível de usuário, pra quando a sessão abre fora do repo). Invocar em vez de reexplicar o framework de teste do zero numa sessão nova.

## Estado da infra (resumo — verificado em 2026-09-21, ler código antes de confiar em qualquer status do Jira — esse board historicamente mostra card em "develop" sem PR real por trás, já aconteceu com KAN-45, KAN-73 e outros)

**Migração Supabase → Firebase concluída no `src/` e no `backend/`:**

- Frontend PWA (`src/`) 100% Firebase — `Login.jsx`/`Register.jsx` usam Firebase Auth de verdade via `src/lib/auth.js`, sessão global vem de `src/contexts/AuthContext.jsx` (`onAuthChange`/`onAuthStateChanged`, não mais `localStorage.facom_logged_in`). `gameplay.js`/`userService.js`/`Scanner.jsx`/`Ranking.jsx`/`Challenges.jsx` leem/gravam Firestore/Storage. `@supabase/supabase-js` removido do `package.json` (2026-09-21) — nenhum código de app depende mais dele.
- Backend (`backend/`) Express + TypeScript, Cloud Function 2ª geração (`onRequest`, região `us-east1`, 256MiB, maxInstances 10) — rotas de negócio reais implementadas: `/api/auth/register` (LGPD), `/api/activities/:id/checkin` + `/api/checkin/entrance`+`/checkout` (double-check) + `/api/activities/:id/screen-token`, `/api/activities/:id/reserve`, `/api/leads`, `/api/sympla/*`. Ainda faltam: custom claims (`PUT /api/admin/users/:uid/role`, KAN-60), push FCM (KAN-61).
- `firebase.json` + `.firebaserc` — projeto único `facom-techweek-layerx` pra `default` e `prod` (não há projeto Firebase separado de homolog). `firestore.rules`, `firestore.indexes.json` e `storage.rules` existem e cobrem `users`/`activities`/`announcements`/`bookings`/`leads`/`pointEvents`/`checkins`.
- Divergência ainda não resolvida: a spec de arquitetura (`Update System/arquitetura-montanha-v2.md`) descreve região `southamerica-east1`, mas o código real está em `us-east1` (free tier).
- Produção (app antigo Supabase): GitHub Pages, branch `main` — ainda não recebeu a migração Firebase, que só chegou até `develop`/`homolog`.
- Homologação: Vercel (time `facomtechweek`, projeto `app-techweek-homolog`), Production Branch = `homolog`.
- Kanban: GitHub Project v2 em github.com/users/Oliveira-Jr/projects/1; Jira projeto `KAN` (`app-teckweek.atlassian.net`) é a fonte de verdade pra tracking, 79+ issues em 2026-09-21.

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

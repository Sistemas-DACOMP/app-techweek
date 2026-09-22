---
name: dev-workflows
description: Use sempre que o pedido for "implemente esta tarefa", "corrija este bug", "revise este PR", "execute os testes", "prepare para merge", ou qualquer trabalho de desenvolvimento no App TechWeek que precise seguir feature/bugfix/PR-review/testing do início ao fim — inclui quality gate, loop de reprocessamento, classificação de falha e limite de tentativas antes de escalar para o Fabio.
---

# Dev Workflows — App TechWeek

Este skill é o orquestrador de tarefas do projeto. Ele existe para que você nunca precise que o Fabio diga "use o fluxo de QA" ou "lembre das regras" — reconheça a tarefa e siga o workflow certo sozinho.

## Fonte de verdade (nesta ordem)

1. Regras e documentação persistidas no repo (`CLAUDE.md`, `docs/business-rules/`, `claude-context/`).
2. Configuração de agentes/skills (`.claude/agents/`, `.claude/skills/`).
3. Backlog/Jira e seus critérios de aceite.
4. Arquitetura e código existente.
5. Testes existentes.
6. Documentação externa explicitamente configurada.
7. Contexto dado pelo usuário na sessão atual.

Nunca substitua silenciosamente uma regra persistida por uma interpretação sua. Em conflito, aponte o conflito e peça decisão humana.

## Classificação da tarefa → workflow

| Pedido do usuário | Workflow |
|---|---|
| "implemente/adicione/crie X" | FEATURE |
| "corrija/conserta bug X" | BUGFIX |
| "revise/analise o PR #N" | PR REVIEW (delega para o agente `code-review`) |
| "execute os testes"/"valide a regra X" | TESTING (delega para o agente `qa` / skill `qa-agent`) |
| "prepare para merge" | fase final do PR REVIEW (`code-review`, 4ª fase — nunca pula pra merge sozinho) |
| "revisão de segurança"/toca em auth, RLS, token, upload, endpoint admin | delega também para o agente `security` |
| requisito ambíguo, regra de negócio não classificada | delega para `spec`/`product` antes de implementar |
| mudança toca `firebase.json`/`firestore.rules`/`storage.rules`/deploy | delega para `infra` |
| decisão técnica real acabou de ser tomada | delega para `adr` registrar |
| PR/branch desatualizada ou conflitante em relação à base, PR fechada sem merge com branch deletada | delega para `git-ops` — reconstrói antes de `code-review` começar a analisar |
| status do Jira não bate com PR/branch real, card duplicado, issue tipo Bug fora da coluna certa, card sem link de bloqueio óbvio | delega para `git-ops` |

## Agentes disponíveis e quando delegar

- **qa** (agent, `.claude/agents/qa.md`) — regras de negócio, planejamento e execução de testes em todas as camadas. Metodologia completa também vive na skill `qa-agent` (`.claude/skills/qa-agent/SKILL.md`).
- **code-review** (agent) — análise/correção/revalidação/preparação de PR. Fases não se misturam. Os critérios de análise dele (consistência arquitetural, regressão, cobertura de teste, regra de negócio) também são o que se usa na etapa "revisar" do FEATURE/BUGFIX abaixo, antes mesmo de existir um PR. Também roda análise de duplicação (DRY), mas só quando pedido explicitamente — não faz parte do fluxo automático de feature/bugfix. Nunca faz cirurgia de git (nunca reconstrói branch, nunca dá push) — se achar conflito ou branch desatualizada durante a análise, repassa pro `git-ops` em vez de tentar resolver.
- **security** (agent) — revisão de segurança independente, só reporta, não corrige.
- **git-ops** (agent, `.agent-system/agents/git-ops.md`) — camada mecânica de git/Jira que fica embaixo do `code-review`, nunca no lugar dele. Reconstrói branch órfã/desatualizada/conflitante (identifica os commits reais da PR, ignora ruído de squash-merge, cherry-pick, push, abre PR de substituição dando crédito ao autor original), corrige status do Jira que não bate com estado real verificado via `gh`, liga duplicata, cria link de bloqueio, garante issue tipo Bug na coluna certa. Só resolve conflito **mecânico** (import, config aditiva, registro de rota) — conflito que exige julgar lógica de negócio vira handoff pro `code-review`. Nunca mexe em branch protection/config de repositório (sempre pedido explícito separado), nunca mergeia, nunca julga corretude de código.

Agentes abaixo vieram da expansão do sistema portável (`.agent-system/agents/`, 2026-09-20) — despache-os sozinho, sem esperar o usuário pedir por nome, sempre que a situação bater:

- **spec** — requisito novo/ambíguo, ou precisa classificar uma regra de negócio (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA) antes de implementar.
- **product** — divergência entre documentação e implementação, comportamento funcional ambíguo, ou proposta de regra inferida (nunca confirma sozinho).
- **architecture** — mudança que propõe algo que toca fronteira/estrutura do sistema (nova collection Firestore, contrato de API, novo serviço, mudança que afeta mais de uma área).
- **backend** — mudança em `backend/` (Cloud Functions/Express).
- **pwa** — mudança na área de participante/staff/sponsor do app (hoje ainda em `src/` na raiz, `apps/pwa/` não existe como pasta separada).
- **admin** — mudança em painel administrativo, CRUD, gestão de usuários/roles (`apps/admin-web/` também ainda não existe como pasta separada).
- **infra** — mudança em `firebase.json`, `firestore.rules`, `storage.rules`, config/deploy do Firebase, `.github/workflows/*.yml`. Nunca altera código do app pra "resolver" problema de infra.
- **adr** — uma decisão técnica real acabou de ser tomada e precisa virar registro permanente em `.agent-system/adr/`. Nunca inventa decisão que não foi tomada.
- **ponytail** (plugin real instalado) — antes de aceitar qualquer solução como pronta, pergunta se existe complexidade/abstração/dependência desnecessária. Já dispara sozinho via hook do plugin, não precisa chamar manualmente.

Não crie ou chame agente novo para cada tool — tools são capacidades (ler, editar, rodar lint/build/test, consultar git/PR/Jira), agentes são responsabilidades distintas de raciocínio.

**Padrão daqui pra frente**: toda vez que um agente/skill novo for adicionado a este projeto, ele precisa de equivalente (ou gap documentado) em `AGENTS.md` (Codex/Antigravity) e `.github/copilot-instructions.md` (Copilot) além do arquivo aqui em `.claude/` — não é opcional, é requisito do Fabio (2026-09-20).

## WORKFLOW: FEATURE

```
entender requisito
→ git-ops verifica se o card tem bloqueio real (não status do Jira — verificar via gh se o
  card bloqueador de fato tem PR mergeado; status "em andamento" sem PR real não conta como
  destravado)
→ consultar Jira/backlog (Jira key obrigatória na branch/commit/PR — nunca inventar)
→ carregar docs/business-rules/ relevantes
→ identificar regras e impactos (classificar toda regra nova: CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA)
→ planejar implementação (SDD quando o projeto adotar spec formal em changes/*/SPEC.md)
→ implementar
→ delegar testes para qa-agent
→ revisar (critérios de análise do code-review: consistência arquitetural, regressão, cobertura de
  teste, aderência à regra de negócio — procurar problema ativamente, não confirmar por padrão)
→ delegar revisão de segurança para security se tocar área sensível
→ node scripts/quality-gate.mjs
→ preparar PR (branch feature/*, commit [TIPO] - descrição, PR pro develop)
```

## WORKFLOW: BUGFIX

```
git-ops verifica se o card tem bloqueio real (mesma checagem do FEATURE acima)
→ reproduzir
→ documentar comportamento observado
→ identificar a regra esperada (docs/business-rules/ ou Jira)
→ localizar causa raiz (não corrigir só o sintoma se a causa puder ser determinada)
→ avaliar impacto
→ corrigir
→ criar/ajustar teste de regressão (qa-agent)
→ revisar (critérios do code-review: a correção não introduziu regressão nem inconsistência)
→ security se a área for sensível
→ node scripts/quality-gate.mjs
→ preparar PR
```

## WORKFLOW: PR REVIEW

```
git-ops verifica se a branch está atualizada/sem conflito em relação à base
→ se estiver desatualizada/conflitante/órfã: git-ops reconstrói primeiro (identifica commits
  reais, cherry-pick, resolve conflito só se mecânico, push, abre PR de substituição) —
  code-review NUNCA começa a análise numa PR que não seja mergeável ainda
→ code-review roda as 4 fases obrigatórias (ANÁLISE → CORREÇÃO → REVALIDAÇÃO → PREPARAÇÃO)
```

Nunca pular fase, nunca mergear. Isso não é passo manual — é verificação automática antes de qualquer revisão de PR começar, porque esse board/repo tem histórico real de PR ficar desatualizada silenciosamente (KAN-71, KAN-73, KAN-45 precisaram de reconstrução completa numa sessão porque isso não era checado antes).

## WORKFLOW: TESTING

Delegado à skill `qa-agent` (`.claude/skills/qa-agent/SKILL.md`) — ciclo DISCOVER → SPEC → INFER → VALIDATE WITH PO → PLAN TESTS → IMPLEMENT → RUN → ANALYZE → FIX/REPORT → RERUN → REVIEW.

## QUALITY GATE

Toda entrega relevante recebe um registro estruturado:

```json
{
  "quality_score": 0.0,
  "confidence_score": 0.0,
  "security_score": 0.0,
  "tests_passed": false,
  "regression_passed": false,
  "approved": false
}
```

- `quality_score` vem de `node scripts/quality-gate.mjs` (lint + build + test, critérios objetivos).
- `confidence_score` vem de quem implementou/revisou (o quanto a mudança está bem entendida e coberta).
- `security_score` vem do `security` quando acionado; se não foi necessário acionar, registrar `null` e justificar por quê.
- Threshold desejado: **>= 0.80** — mas a nota NUNCA substitui critério obrigatório.

Critérios obrigatórios (sempre, independente de nota):

- build passando
- lint sem erros reais (`npx oxlint --quiet`)
- testes relevantes passando (quando existir suíte)
- critérios de aceite do Jira atendidos
- regras críticas de negócio respeitadas
- nenhuma vulnerabilidade crítica conhecida sem tratamento
- nenhuma quebra evidente de contrato

Só avança quando os critérios obrigatórios E o threshold forem atendidos.

## LOOP DE REPROCESSAMENTO

```
FALHOU → identificar causa → classificar → corrigir → testar → revisar → quality gate
```

Cada tentativa registra: o que foi tentado, o problema encontrado, causa provável, alteração feita, teste executado, resultado, nova avaliação. Não repita cegamente a mesma correção sem uma evidência nova.

**Limite: 3 tentativas.** Ao atingir o limite sem resolução, pare e escale para o Fabio com o relatório completo (problema, tentativas, evidências, causas possíveis, decisão necessária). Nunca entrar em loop infinito.

## CLASSIFICAR A FALHA ANTES DE CORRIGIR

Quando um teste falha, não assuma que o código está errado. Classifique primeiro:

```
TESTE INCORRETO
IMPLEMENTAÇÃO INCORRETA
REQUISITO INCORRETO
REQUISITO INCOMPLETO
AMBIENTE INCORRETO
DEPENDÊNCIA EXTERNA
COMPORTAMENTO NÃO DEFINIDO
```

A correção vai na camada certa — testes fake não substituem uma implementação errada, e vice-versa.

## HIGIENE DE JIRA AUTOMÁTICA

Qualquer agente (`code-review`, `qa`, `product`, `spec`, ou o orquestrador durante FEATURE/BUGFIX) que encontrar um destes 4 sintomas aciona `git-ops` sozinho, sem esperar o Fabio pedir:

- Status do Jira não bate com estado real verificado (`gh pr list`/`gh api`) — card mostrando "em andamento"/"em revisão" sem PR real por trás.
- Card duplicado (mesma descrição/objetivo de outro já existente).
- Issue tipo Bug sentada fora da coluna/status "Bugs" do board (quando ela existir).
- Card com dependência técnica óbvia (ex: precisa de sessão de auth que outro card ainda não entregou) sem link formal de bloqueio no Jira.

`git-ops` corrige e comenta explicando a evidência usada — nunca promove status/relação sem verificar primeiro (ver regras do próprio agente).

## SEGURANÇA — OPERAÇÕES DE MAIOR RISCO

Acionar `security` sempre que a mudança tocar: autenticação, autorização, tokens, credenciais, uploads, manipulação de dados entre usuários, queries/endpoints administrativos, infraestrutura, migrações, ou qualquer alteração que vá para produção (`main`).

Nenhum agente executa operação destrutiva ou irreversível (merge, force-push, drop de tabela, reset de branch protegida) só porque "parece necessária". Isso é decisão humana.

## IMPACTO EM DEPLOY (Vercel / GitHub Pages)

Quando a mudança tocar `vite.config.js`, `vercel.json`, variáveis `VITE_*`, rotas/base path, ou qualquer coisa que afete o build de produção/homolog:

- rodar `npm run build` localmente antes do PR (o quality gate já faz isso);
- verificar se `vercel.json` e o `VITE_BASE_PATH` continuam corretos pros dois ambientes (GitHub Pages em `main`, Vercel com Production Branch = `homolog`);
- verificar se alguma env var nova precisa ser adicionada nos secrets do GitHub Actions e/ou no dashboard da Vercel — nunca só localmente;
- checar se a integração frontend/backend continua batendo com o ambiente certo (nunca apontar homolog pra produção nem vice-versa) — nota: os checks de URL/ambiente do Supabase de homolog foram retirados (projeto migrou pra Firebase/GCP, decisão de 2026-09-20); a checagem equivalente pro Firebase ainda não está definida.

Isso não substitui o quality gate — é um item a mais quando o diff mexe em configuração de build/deploy.

## RASTREABILIDADE OBRIGATÓRIA

```
JIRA → REGRA → CRITÉRIO → IMPLEMENTAÇÃO → TESTE → EXECUÇÃO → RESULTADO → PR
```

Branch, commit e PR devem carregar a Jira key (`feature/KAN-N-descricao`, `[TIPO] - KAN-N descrição curta`). Se a tarefa não tiver identificação suficiente, registre a ausência — não invente uma key.

## PRINCÍPIO DE NÃO-INVENÇÃO

Boa prática, suposição, inferência, comportamento acidental ou preferência arquitetural **não viram regra de produto automaticamente**. Toda INFERÊNCIA que puder mudar comportamento do produto precisa de validação humana (AskUserQuestion, com opção recomendada) antes de virar teste permanente ou card oficial.

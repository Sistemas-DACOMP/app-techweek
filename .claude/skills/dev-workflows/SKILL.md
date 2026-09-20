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
| "revise/analise o PR #N" | PR REVIEW (delega para o agente `pr-review`) |
| "execute os testes"/"valide a regra X" | TESTING (delega para a skill `qa-agent`) |
| "prepare para merge" | fase final do PR REVIEW (`pr-review`, 4ª fase — nunca pula pra merge sozinho) |
| "revisão de segurança"/toca em auth, RLS, token, upload, endpoint admin | delega também para o agente `security-reviewer` |

## Agentes disponíveis e quando delegar

- **qa-agent** (skill) — regras de negócio, planejamento e execução de testes em todas as camadas.
- **pr-review** (agent) — análise/correção/revalidação/preparação de PR. Fases não se misturam. Os critérios de análise dele (consistência arquitetural, regressão, cobertura de teste, regra de negócio) também são o que se usa na etapa "revisar" do FEATURE/BUGFIX abaixo, antes mesmo de existir um PR — não precisa criar um Code Review Agent separado pra isso, é a mesma responsabilidade aplicada mais cedo.
- **security-reviewer** (agent) — revisão de segurança independente, só reporta, não corrige.
- **dedup-refactor** (agent) — só quando pedido explicitamente para achar duplicação/sugerir extração; não faz parte do fluxo automático de feature/bugfix.

Não crie ou chame agente novo para cada tool — tools são capacidades (ler, editar, rodar lint/build/test, consultar git/PR/Jira), agentes são responsabilidades distintas de raciocínio.

## WORKFLOW: FEATURE

```
entender requisito
→ consultar Jira/backlog (Jira key obrigatória na branch/commit/PR — nunca inventar)
→ carregar docs/business-rules/ relevantes
→ identificar regras e impactos (classificar toda regra nova: CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA)
→ planejar implementação (SDD quando o projeto adotar spec formal em changes/*/SPEC.md)
→ implementar
→ delegar testes para qa-agent
→ revisar (critérios de análise do pr-review: consistência arquitetural, regressão, cobertura de
  teste, aderência à regra de negócio — procurar problema ativamente, não confirmar por padrão)
→ delegar revisão de segurança para security-reviewer se tocar área sensível
→ node scripts/quality-gate.mjs
→ preparar PR (branch feature/*, commit [TIPO] - descrição, PR pro develop)
```

## WORKFLOW: BUGFIX

```
reproduzir
→ documentar comportamento observado
→ identificar a regra esperada (docs/business-rules/ ou Jira)
→ localizar causa raiz (não corrigir só o sintoma se a causa puder ser determinada)
→ avaliar impacto
→ corrigir
→ criar/ajustar teste de regressão (qa-agent)
→ revisar (critérios do pr-review: a correção não introduziu regressão nem inconsistência)
→ security-reviewer se a área for sensível
→ node scripts/quality-gate.mjs
→ preparar PR
```

## WORKFLOW: PR REVIEW

Delegado inteiramente ao agente `pr-review` (`.claude/agents/pr-review.md`), que já implementa as 4 fases obrigatórias (ANÁLISE → CORREÇÃO → REVALIDAÇÃO → PREPARAÇÃO). Nunca pular fase, nunca mergear.

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
- `security_score` vem do `security-reviewer` quando acionado; se não foi necessário acionar, registrar `null` e justificar por quê.
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

## SEGURANÇA — OPERAÇÕES DE MAIOR RISCO

Acionar `security-reviewer` sempre que a mudança tocar: autenticação, autorização, tokens, credenciais, uploads, manipulação de dados entre usuários, queries/endpoints administrativos, infraestrutura, migrações, ou qualquer alteração que vá para produção (`main`).

Nenhum agente executa operação destrutiva ou irreversível (merge, force-push, drop de tabela, reset de branch protegida) só porque "parece necessária". Isso é decisão humana.

## IMPACTO EM DEPLOY (Vercel / GitHub Pages)

Quando a mudança tocar `vite.config.js`, `vercel.json`, variáveis `VITE_*`, rotas/base path, ou qualquer coisa que afete o build de produção/homolog:

- rodar `npm run build` localmente antes do PR (o quality gate já faz isso);
- verificar se `vercel.json` e o `VITE_BASE_PATH` continuam corretos pros dois ambientes (GitHub Pages em `main`, Vercel com Production Branch = `homolog`);
- verificar se alguma env var nova precisa ser adicionada nos secrets do GitHub Actions e/ou no dashboard da Vercel — nunca só localmente;
- checar integração frontend/backend (URLs do Supabase) continuam batendo com o ambiente certo (nunca apontar homolog pra produção nem vice-versa).

Isso não substitui o quality gate — é um item a mais quando o diff mexe em configuração de build/deploy.

## RASTREABILIDADE OBRIGATÓRIA

```
JIRA → REGRA → CRITÉRIO → IMPLEMENTAÇÃO → TESTE → EXECUÇÃO → RESULTADO → PR
```

Branch, commit e PR devem carregar a Jira key (`feature/KAN-N-descricao`, `[TIPO] - KAN-N descrição curta`). Se a tarefa não tiver identificação suficiente, registre a ausência — não invente uma key.

## PRINCÍPIO DE NÃO-INVENÇÃO

Boa prática, suposição, inferência, comportamento acidental ou preferência arquitetural **não viram regra de produto automaticamente**. Toda INFERÊNCIA que puder mudar comportamento do produto precisa de validação humana (AskUserQuestion, com opção recomendada) antes de virar teste permanente ou card oficial.

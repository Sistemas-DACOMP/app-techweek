# Engineering rules (canonical)

Fonte canônica; CLAUDE.md em cada repo é o bootstrap que aponta para cá — se este arquivo e um CLAUDE.md divergirem, este arquivo vence, mas avise o Fabio, não resolva sozinho.

Origem: `app-techweek/CLAUDE.md` seções "Regras que não mudam" e "Processo de revisão de PRs / merge" (lidas integralmente em 2026-09-20). Cópia canônica, não paráfrase — qualquer agente/runtime lê isto em vez de reconstruir a regra de memória.

## Regras que não mudam

- **Nunca inclua o trailer `Co-Authored-By: Claude` em commits.**
- **Nunca altere variáveis de ambiente do Windows** (nem para debug) sem pedir antes.
- Padrão de commit: `[TIPO] - descrição curta`, tipos `ADD` `FIX` `UPD` `DEL` `DOC` `CFG`.
- Git Flow: `feature/*` → `develop` → `homolog` → `main`.
- Branch protection ativa em `main`/`homolog` (PR obrigatório, 0 aprovações) **e também em `develop`** (PR obrigatório, **1 aprovação** — confirmado via API em 2026-09-10; corrige nota antiga que só citava main/homolog).
- Comentário em PR e em card do Jira sempre em linguagem natural, como um dev escrevendo pra outro — nunca com tom de relatório gerado por IA, nem jargão desnecessário. Direto, sem enrolação, mas humano (detalhado em `policies/pr-jira-tone.md`).

## Processo de revisão de PRs / merge

Fluxo obrigatório em 3 fases separadas, não misturar:

1. **Análise** — mapear todos os PRs abertos (objetivo, arquivos, conflitos, riscos) sem alterar código.
2. **Correção** — corrigir problemas encontrados na branch de cada PR (menor mudança possível), rodar lint/build (e teste, ver `policies/quality-gate.md`), comentar no PR e no Jira o que foi achado e corrigido (tom: `policies/pr-jira-tone.md`).
3. **Merge** — só depois que Análise e Correção estiverem prontas. Merge é **sempre humano** — ver `policies/merge-policy.md` pra regra completa (nenhum runtime de IA mergeia, nunca, mesmo com autorização prévia).

Regras adicionais do fluxo:

- Ordem de merge entre PRs que tocam os mesmos arquivos (ex.: `Dashboard.jsx`) importa — resolver primeiro o de menor risco/dependência, depois atualizar os PRs seguintes com a `develop` mais nova antes de assumir que estão sem conflito.
- Mais de uma atividade independente (revisar PRs diferentes, escrever testes de regras diferentes) → delegar em agentes paralelos em vez de sequencial.
- Toda mudança de comportamento de negócio (nova regra, correção de gap) passa antes pelo catálogo de regras de negócio (`docs/business-rules/` no repo Supabase atual; ver `rules/evidence-model.md` pra classificação obrigatória antes de virar teste permanente).

## Ver também

- `rules/evidence-model.md` — classificação de regras de negócio (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA) e o modelo genérico FACT/INFERENCE/ASSUMPTION/UNKNOWN.
- `policies/quality-gate.md` — comandos objetivos de lint/build/test.
- `policies/merge-policy.md` — regra de merge humano-only, runtime-agnostic.
- `policies/pr-jira-tone.md` — tom de comentário e regras de escopo em Jira.

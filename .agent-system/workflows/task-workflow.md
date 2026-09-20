# Task workflow (ciclo de vida completo)

Grafo completo (spec seção 34):

```
TASK
  → ORCHESTRATOR
    → CLASSIFY SCOPE (impacto: LOW / MEDIUM / HIGH / CRITICAL — spec seção 35)
      → SPEC/SDD
        → PRODUCT/BUSINESS RULES
          → ARCHITECTURE
            → PLAN
              → DEVELOPMENT
                → UNIT/INTEGRATION
                  → SECURITY
                    → INFRA
                      → QA/E2E
                        → CODE REVIEW
                          → PONYTAIL (se disponível; senão pular com nota — ver `agents/ponytail.md`, NÃO instalado nesta máquina em 2026-09-20)
                            → FINAL ORCHESTRATOR
                              → MERGE (humano only — `policies/merge-policy.md`)
                                → DEPLOY
                                  → POST-DEPLOY VALIDATION
```

## Regra central: o orquestrador seleciona só o subconjunto necessário

Este grafo é o caminho completo, não um checklist obrigatório fixo pra toda tarefa. O orquestrador classifica o impacto da tarefa (LOW/MEDIUM/HIGH/CRITICAL, spec seção 35) e escolhe quais nós realmente precisam rodar:

- **LOW** (ex.: correção de texto, ajuste de estilo sem lógica) — pula Spec/Architecture/Security/Infra formais; ainda passa por alguma forma de Development → Review básico.
- **MEDIUM** (ex.: bugfix com lógica, feature pequena isolada) — passa por Spec leve, Development, Unit/Integration, Code Review; Security/Infra só se a área tocada exigir (ex.: mexeu em auth ou config de deploy).
- **HIGH** (ex.: nova feature de superfície, mudança de contrato de API) — passa pela cadeia quase inteira: Spec, Architecture, Development, Security, QA, Code Review.
- **CRITICAL** (ex.: autenticação, dados sensíveis, mudança que afeta produção diretamente) — grafo completo, nenhum gate pulado, Security e QA sempre rodam, Ponytail (quando existir) sempre roda.

Pular um nó é uma decisão explícita do orquestrador baseada na classificação de impacto — nunca um pulo silencioso por preguiça ou pressa. Se a classificação de impacto está ambígua, tratar como o nível mais alto plausível até confirmar.

## Mapeamento pro processo real já existente neste projeto (Supabase)

O processo de 3 fases já em produção (`rules/engineering-rules.md` → "Processo de revisão de PRs / merge": Análise → Correção → Merge) é uma instância válida e simplificada deste grafo maior, adequada ao tamanho atual da equipe — ver `workflows/pr-workflow.md` pro alinhamento explícito nó a nó.

## Ver também

- `gates/gates.md` — o que cada gate deste grafo exige pra ser considerado limpo.
- `workflows/pr-workflow.md` — a fatia deste grafo que corresponde à revisão de um PR já aberto.
- `workflows/deploy-workflow.md` — o que acontece depois de MERGE.

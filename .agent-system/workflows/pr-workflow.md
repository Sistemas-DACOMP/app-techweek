# PR workflow

Grafo do spec (seção 39):

```
PR OPENED
  → ORCHESTRATOR
    → SPEC/CONTEXT
      → CODE REVIEW
        → SECURITY
          → INFRA
            → QA
              → PONYTAIL (se disponível — não instalado nesta máquina, ver `agents/ponytail.md`)
                → FINAL REVIEW
                  → MERGE (humano only — `policies/merge-policy.md`)
```

## Alinhamento com o processo real deste projeto

Este projeto já roda uma versão validada e simplificada exatamente deste grafo, em produção, desde a Fase 2-6 do roadmap de infra (ver `docs/superpowers/specs/2026-09-11-agent-infra-fase2-6-design.md`). Não são dois processos diferentes — é o mesmo formato, com nós do spec agrupados em 3 fases porque essa é a granularidade que faz sentido pro tamanho da equipe hoje:

| Nó do spec | Fase real do projeto | Onde vive |
|---|---|---|
| PR OPENED → ORCHESTRATOR | (implícito — abrir o processo de revisão) | `rules/engineering-rules.md` |
| SPEC/CONTEXT | dentro de **Análise** — mapear objetivo, arquivos, conflitos, riscos do PR | Fase 1: Análise |
| CODE REVIEW | dentro de **Análise** (achar problemas) + **Correção** (aplicar, achado sem correção não é aceitável — mesma regra de menor-mudança-possível) | Fases 1-2 |
| SECURITY | achados de segurança encontrados durante Análise/Correção são tratados com a mesma seriedade que qualquer outro achado — revisão de segurança dedicada roda via `security` quando a área tocada justifica (auth, RLS/rules, upload, tokens) | Fases 1-2 |
| INFRA | checagem de impacto em deploy (ex.: `vite.config.js`/`vercel.json`/env vars) quando o diff mexe nisso — item explícito do workflow, não um agente à parte ainda | Fases 1-2 |
| QA | quality gate objetivo (`policies/quality-gate.md`) + suíte de teste relevante rodada como parte da Correção | Fase 2: Correção |
| PONYTAIL | não instalado — nó pulado com nota explícita, nunca fingido como rodado | N/A (gap documentado) |
| FINAL REVIEW | comentário no PR e no card do Jira relatando o que foi achado e corrigido (`policies/pr-jira-tone.md`) | fim da Fase 2 |
| MERGE | sempre humano | Fase 3: Merge |

A simplificação em 3 fases é uma decisão de escala, não um desvio da política — o grafo maior existe pra quando a equipe ou a complexidade crescerem a ponto de precisar separar os nós de novo (ex.: um Security Reviewer dedicado por PR, não só reativo).

## Regra que não muda entre os dois formatos

Ordem de merge entre PRs que tocam os mesmos arquivos importa — resolver primeiro o de menor risco/dependência, atualizar os demais com a branch-base mais nova antes de assumir ausência de conflito (`rules/engineering-rules.md`).

## Ver também

- `gates/gates.md` — CODE REVIEW APPROVED, SECURITY APPROVED, QA PASSED, MERGE APPROVED.
- `policies/merge-policy.md` — por que MERGE nunca é feito por um runtime de IA.

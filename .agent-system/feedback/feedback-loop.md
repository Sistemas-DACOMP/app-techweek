# Feedback loop

Fluxo (spec seção 28):

```
Feedback
  → Interpretation
    → Classification
      → Rule Proposal
        → Scope
          → Validation
            → Canonical Rule
              → Agent Integration
                → Guardrail
                  → Validation
```

Um feedback bruto (o que o Fabio ou o time disse) não vira regra permanente direto — passa por interpretação (o que ele realmente quis dizer), classificação (que tipo de regra é), proposta formal, definição de escopo (vale pra este repo só, ou pro sistema todo?), validação humana, só então vira regra canônica, entra no(s) agente(s) certo(s), ganha guardrail (o que impede a regra de ser violada de novo) e é validada de novo depois de aplicada.

## Categorias

- **CONTEXT** — informação de fundo, não é regra em si (ex.: "o time é de iniciantes").
- **PREFERENCE** — como o Fabio prefere que algo seja feito, sem ser uma regra rígida.
- **LOCAL_DECISION** — decisão válida pra esta tarefa/sessão, não necessariamente generalizável.
- **ENGINEERING_RULE** — regra de engenharia (git flow, formato de commit, processo de review) — vai pra `rules/`.
- **BUSINESS_RULE** — regra de comportamento do produto — vai pro catálogo de regras de negócio (`docs/business-rules/`), classificada primeiro (`rules/evidence-model.md`).
- **DEVELOPMENT_POLICY** — política operacional mais estreita que regra de engenharia (ex.: quality gate, tom de comentário) — vai pra `policies/`.
- **SECURITY_POLICY** — regra de segurança (nunca commitar credencial, nunca expor detalhe sensível em doc compartilhado).
- **ARCHITECTURE_RULE** — decisão estrutural que afeta múltiplas áreas — normalmente vira ADR.
- **TESTING_RULE** — regra sobre como testar (ex.: nunca confiar só em validação de frontend).
- **GUARDRAIL** — o mecanismo que impede a violação de uma regra já canônica (lint rule, gate automático, checklist obrigatório).
- **PROCESS_RULE** — regra sobre como o trabalho flui entre pessoas/agentes (ex.: tom de comentário em Jira, escopo do que vai em chat vs. card).

## Auto-modificação (spec seção 47) — cross-reference obrigatório

Um agente pode **propor** mudança ao próprio sistema de agentes (sugerir uma regra nova, sugerir que um gate deveria existir). Um agente **não pode**, sozinho:

- Alterar regra global unilateralmente.
- Remover um gate.
- Reduzir uma exigência de segurança.
- Generalizar uma regra a partir de um caso único (um bug achado uma vez não vira regra permanente automaticamente).

Qualquer uma dessas quatro coisas sempre precisa de aprovação humana explícita (Fabio) — nunca é uma decisão que o próprio fluxo de feedback fecha sozinho, mesmo que a proposta pareça óbvia.

## Isto já é o mesmo princípio que a regra de negócio inferida

Esta restrição de auto-modificação não é um conceito novo introduzido aqui — é a mesma lógica que já rege regra de negócio inferida neste projeto (`rules/evidence-model.md`, `CLAUDE.md` → "Regras de negócio"): uma INFERIDA nunca vira CONFIRMADA sem o Fabio validar explicitamente, com opção recomendada. "Generalizar a partir de um caso único sem aprovação humana" e "promover INFERIDA a CONFIRMADA sozinho" são a mesma falha, em dois vocabulários diferentes — um é sobre regra de produto, o outro é sobre regra do próprio sistema de agentes. Trate os dois como a mesma classe de erro.

## Ver também

- `rules/evidence-model.md` — o mecanismo de validação humana que a auto-modificação reusa.
- `gates/gates.md` — regra "nunca deixar um gate BLOCKED silenciosamente" é um guardrail concreto contra um agente relaxar um gate sozinho.

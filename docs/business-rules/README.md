# Catálogo de regras de negócio — App TechWeek

Uma regra por arquivo nesta pasta. Antes de escrever um teste permanente pra qualquer regra, classifique-a — ver a skill `qa-agent` (`.claude/skills/qa-agent/SKILL.md`) pro processo completo.

## Template

```
---
id: REG-XXX
nome:
fonte: (Jira KAN-N / SPEC.md / observado no código / não definida)
tipo: CONFIRMADA | INFERIDA | OBSERVADA | NÃO DEFINIDA
criterio: (frase objetiva e testável — o que precisa ser verdade pra regra estar OK)
prioridade:
status:
testes_relacionados:
implementacao_relacionada:
ultima_validacao: AAAA-MM-DD
---

Descrição da regra (contexto, por que existe, o que já se sabe).
```

## Legenda de tipo

- **CONFIRMADA** — critério de aceite no Jira, ou decisão documentada em `changes/*/SPEC.md`.
- **INFERIDA** — dedução razoável, mas não documentada em nenhum lugar. Nunca vira teste permanente sem validar com o Fabio antes (pergunta com opção recomendada).
- **OBSERVADA** — já implementado no código, mas não é critério de aceite oficial em lugar nenhum.
- **NÃO DEFINIDA** — nem código nem documentação resolvem (ex: janela exata de rate limit, que é config do próprio Supabase).

## Índice

| ID | Nome | Tipo | Status |
|---|---|---|---|
| [REG-POINT-001](REG-POINT-001-dedup-point-events.md) | Dedup de `point_events` | OBSERVADA | implementado |
| [REG-RANK-001](REG-RANK-001-ranking-tiebreak.md) | Critério de tie-break do ranking | OBSERVADA | implementado |
| [REG-AUTH-001](REG-AUTH-001-senha-fraca-cadastro.md) | Validação de senha fraca no cadastro | INFERIDA | gap — KAN-27 |
| [REG-LGPD-001](REG-LGPD-001-aceite-lgpd-backend.md) | Aceite de LGPD só no front | INFERIDA | gap — KAN-28 |
| [REG-AVATAR-001](REG-AVATAR-001-limite-avatar-backend.md) | Limite de avatar só no front | INFERIDA | gap — KAN-29 |
| [REG-SCANNER-001](REG-SCANNER-001-qr-palestra-especifica.md) | Scanner aceita QR de qualquer palestra | INFERIDA | gap — KAN-30 |
| [REG-PROFILE-001](REG-PROFILE-001-rls-cross-user.md) | RLS `profiles` cross-user lookup | NÃO DEFINIDA | falta teste em homolog |
| [REG-REGISTER-001](REG-REGISTER-001-linkedin-instagram-descartados.md) | `linkedin`/`instagram` descartados no cadastro | OBSERVADA | gap — sem card ainda |

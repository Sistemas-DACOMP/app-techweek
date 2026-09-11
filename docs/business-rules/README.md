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

## IDs do catálogo vs. IDs curtos nos comentários de teste

Alguns arquivos de teste (`src/lib/auth.test.js`, `src/lib/validators.test.js`) usam um id curto interno no comentário acima do caso de teste (`REG-C1`, `REG-C2`, `REG-C4`, `REG-C5`, `REG-A3`) — isso não é um catálogo paralelo, é só a numeração que quem escreveu o teste usou ali. O catálogo abaixo é a fonte de verdade. Correspondência atual:

| Id curto no comentário do teste | Entrada no catálogo |
|---|---|
| REG-C1 | [REG-AUTH-002](REG-AUTH-002-senha-confirmacao-identica.md) |
| REG-C2 | [REG-AUTH-001](REG-AUTH-001-senha-fraca-cadastro.md) |
| REG-C4, REG-C5 | [REG-AUTH-003](REG-AUTH-003-status-pos-cadastro.md) |
| REG-A3 | [REG-AVATAR-001](REG-AVATAR-001-limite-avatar-backend.md) |

Regra pra evitar isso se repetir: todo teste novo que documentar uma regra de negócio deve citar o ID do catálogo (`REG-XXX-NNN`) no comentário, não inventar uma numeração própria. Se a regra ainda não está no catálogo, criar a entrada antes (ou junto) de escrever o teste.

## Índice

| ID | Nome | Tipo | Status |
|---|---|---|---|
| [REG-POINT-001](REG-POINT-001-dedup-point-events.md) | Dedup de `point_events` | OBSERVADA | implementado |
| [REG-RANK-001](REG-RANK-001-ranking-tiebreak.md) | Critério de tie-break do ranking | OBSERVADA | implementado |
| [REG-AUTH-001](REG-AUTH-001-senha-fraca-cadastro.md) | Validação de senha fraca no cadastro | INFERIDA | gap — KAN-27 |
| [REG-AUTH-002](REG-AUTH-002-senha-confirmacao-identica.md) | Senha e confirmação idênticas no cadastro | OBSERVADA | implementado |
| [REG-AUTH-003](REG-AUTH-003-status-pos-cadastro.md) | Status pós-cadastro (anti-enumeração / rate limit) | CONFIRMADA | implementado |
| [REG-LGPD-001](REG-LGPD-001-aceite-lgpd-backend.md) | Aceite de LGPD só no front | INFERIDA | gap — KAN-28 |
| [REG-AVATAR-001](REG-AVATAR-001-limite-avatar-backend.md) | Limite de avatar só no front | INFERIDA | gap — KAN-29 |
| [REG-SCANNER-001](REG-SCANNER-001-qr-palestra-especifica.md) | Scanner aceita QR de qualquer palestra | INFERIDA | gap — KAN-30 |
| [REG-PROFILE-001](REG-PROFILE-001-rls-cross-user.md) | RLS `profiles` cross-user lookup | NÃO DEFINIDA | falta teste em homolog |
| [REG-REGISTER-001](REG-REGISTER-001-linkedin-instagram-descartados.md) | `linkedin`/`instagram` descartados no cadastro | OBSERVADA | gap — sem card ainda |

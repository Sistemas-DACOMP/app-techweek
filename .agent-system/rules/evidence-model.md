# Evidence model

Modelo genérico de evidência (spec seção 51) mapeado sobre a classificação de regras de negócio já existente no projeto (`CLAUDE.md`, seção "Regras de negócio"; ver também `docs/business-rules/README.md` e `.agent-system/agents/qa.md`). Não são dois sistemas paralelos — são o mesmo conceito em dois vocabulários, um genérico (todo agente/toda saída) e um específico de regra de negócio (catálogo `docs/business-rules/`).

## Modelo genérico (todo agente usa isto em `findings`/`evidence`)

- **FACT** — verificado diretamente: teste rodou e a saída foi capturada, arquivo lido, comando executado com output observado, API consultada e resposta registrada.
- **INFERENCE** — dedução razoável a partir de evidência parcial, não confirmada na fonte primária (código, doc oficial, critério de aceite).
- **ASSUMPTION** — não verificado, declarado explicitamente como tal (nunca silencioso).
- **UNKNOWN** — genuinely não dá pra saber a partir do código + docs disponíveis.

Regra fixa: nunca promover INFERENCE ou ASSUMPTION a FACT silenciosamente. Toda promoção precisa de uma ação explícita (rodar o teste, ler a fonte, perguntar ao humano) — nunca "ficou parecendo certo o suficiente".

## Mapa: genérico → classificação de regra de negócio

| Genérico | Classificação do projeto | Equivalência |
|---|---|---|
| FACT (com critério de aceite citável) | **CONFIRMADA** | Tem critério de aceite no Jira ou em `changes/*/SPEC.md` — é um FACT sobre o *requisito*, não só sobre o código. |
| INFERENCE | **INFERIDA** | Dedução razoável, não documentada em lugar nenhum. |
| FACT (sobre o código atual, não é requisito) | **OBSERVADA** | Já implementado, comportamento verificável lendo o código — é FACT sobre o que o sistema *faz*, mas não é FACT sobre o que o sistema *deveria* fazer (não é critério de aceite oficial). |
| UNKNOWN | **NÃO DEFINIDA** | Nem código nem documentação resolvem (ex.: janela exata de rate limit que é config do próprio provedor). |

Note a distinção FACT-sobre-requisito vs. FACT-sobre-código: um comportamento pode ser 100% verificável no código (FACT) e ainda assim ser OBSERVADA, não CONFIRMADA, porque ninguém decidiu que é assim que *deveria* ser — só aconteceu de ser implementado assim.

## Regra de ouro (já existente no projeto, restatada aqui — não é regra nova)

**Nunca tratar uma INFERIDA/INFERENCE como CONFIRMADA/FACT sem perguntar ao Fabio antes**, sempre com uma opção recomendada na pergunta. Se a inferência virar bug/gap real, abrir card no Jira **antes** de escrever o teste permanente que trata a regra como oficial. Isto já é a regra do projeto (`CLAUDE.md` → "Regras de negócio"; `agents/qa.md` → "Golden Rule") — este arquivo não introduz um critério novo, só formaliza o mapeamento pro vocabulário genérico usado em `templates/agent-output.yaml`.

## Onde isso é usado

- `templates/agent-output.yaml` — todo `findings[].evidence` usa o vocabulário genérico (FACT/INFERENCE/ASSUMPTION/UNKNOWN).
- `docs/business-rules/*.md` — todo `tipo:` usa o vocabulário específico (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA).
- `agents/qa.md` — já documenta os dois lados desta tabela; este arquivo é a versão canônica e independente de agente.

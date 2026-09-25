ADR-004 Maestri como camada de conexão, nunca fonte de verdade

Context:
Fabio pediu, na especificação de duas partes de 2026-09-22, integração com "Maestri" como camada
de conexão/comunicação entre runtimes (Claude Code, Antigravity), explicitamente proibindo que
Maestri vire fonte canônica de conhecimento do projeto. Antes deste ADR, "Maestri" não existia em
nenhum lugar deste repositório — zero referências em código, docs, ou config (grep case-insensitive
confirmou). Perguntado diretamente, o Fabio identificou a ferramenta: `themaestri.app`, um app
desktop nativo (canvas de orquestração visual multi-agente), sem CLI nem API, com pedido explícito
de "instale e configure".

Decision:
Tratar Maestri como um conector externo documentado (`manifests/system.yaml` → `connectors:`),
com adapter próprio (`.agent-system/adapters/maestri/README.md`) descrevendo o que é, como se
conecta, e os passos humanos exatos pra instalar/configurar — mas **não** buildar nenhuma
automação em torno dele além dessa documentação, porque não há superfície programável (sem
CLI/API) pra automatizar. A instalação/configuração real fica registrada como blocker humano
(`state/blockers.md`), não como trabalho pendente deste sistema.

Alternatives:
1. Tentar automatizar a instalação via download+execução silenciosa do instalador Windows —
   rejeitada: instalar software desktop de terceiro sem confirmação explícita do usuário é ação
   que este sistema trata com cautela (mesma categoria de "ações com cuidado" do projeto: mudança
   difícil de reverter, afeta o ambiente do usuário além do repo) — mesmo que tecnicamente
   possível via PowerShell, configurar o canvas depois exigiria interação gráfica de qualquer
   forma, então automatizar só o download não elimina a dependência humana, só adiciona risco.
2. Não documentar Maestri até ele estar instalado — rejeitada: o pedido do Fabio já é o requisito;
   documentar o que é, por que está bloqueado, e o passo exato de desbloqueio é trabalho real e
   útil mesmo sem o app instalado (reduz a lacuna de "o que fazer quando eu abrir o Maestri" pra
   zero perguntas).

Why:
Segue a mesma régua que orienta qualquer blocker deste sistema (ver `agents/orchestrator.md` e a
seção "IMPORTANTE SOBRE BLOQUEIOS" da spec original do Fabio): fazer tudo que é automatizável,
reportar exatamente o que falta e a ação humana exata, nunca inventar uma solução que contorna a
necessidade real de uma pessoa clicar em algo.

Consequences:
`manifests/system.yaml` lista Maestri com `status: not_installed` até o Fabio confirmar instalação
real — nenhuma claim de integração funcional será feita antes disso. Quando instalado, a validação
esperada (ver `adapters/maestri/README.md`) é: workspace aberto apontando pro repo, pelo menos um
terminal conectado e executando comando real — não apenas "o app abriu".

Risks:
Suporte a Antigravity especificamente dentro do Maestri não está confirmado (a página do produto
lista Claude Code/Codex/OpenCode/shells genéricos, não Antigravity por nome) — se isso for um
requisito rígido do Fabio, pode ser um blocker adicional não descoberto até a tentativa real de
conectar um terminal Antigravity ao canvas.

Status: ACCEPTED

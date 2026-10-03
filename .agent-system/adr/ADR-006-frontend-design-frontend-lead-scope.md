ADR-006 Ampliar o agente frontend de "Frontend Design Engineer" para "Design & Frontend Lead"

Context:
O ADR-005 criou o agente `frontend` em 2026-10-02 com escopo estreito: consistência visual, tokens
de `src/index.css`, acessibilidade mínima e validação visual quando havia browser. No mesmo dia o
Fabio mandou reescrever o agente seguindo um prompt dele ("AGENT: DESIGN & FRONTEND LEAD"). A
reescrita está em `.agent-system/agents/frontend.md` (canônico) e `.claude/agents/frontend.md`
(adapter), ainda sem commit/PR no momento deste registro (o agente devops está propagando pras
branches). Fonte: instrução explícita do Fabio na tarefa + o conteúdo dos dois arquivos
reescritos (FACT). O ADR-005 não é contradito, é estendido: continua valendo a decisão de existir
um agente de disciplina `frontend`, e a stack (Tailwind v4 + shadcn, addendum do ADR-005).

Decision:
O agente `frontend` passa a ser o **Design & Frontend Lead**: Product Designer + UX Designer + UI
Designer + Design System Engineer + Frontend Engineer + Visual QA + revisor de acessibilidade +
revisor anti-AI-slop. Pontos da decisão:
1. Dois artefatos persistentes na raiz do repo, com funções separadas: `DESIGN.md` (Design System
   aprovado, "como o produto deve ser") e `DESIGN-AUDIT.md` (auditoria e evolução, "como chegamos
   até aqui"). Nenhum dos dois existe ainda; criá-los é a primeira missão (auditoria + redesign
   global).
2. Hierarquia de verdade: Figma não é fonte única. `DESIGN.md` é fonte da dimensão visual já
   aprovada, sem autoridade sobre requisito, regra de negócio, segurança ou arquitetura. Se Figma e
   `DESIGN.md` divergirem, o agente não escolhe em silêncio.
3. Novos processos no agente: visual validation loop, impact analysis antes de mudança global,
   quality gate de interface (build passando é só o piso), anti-AI-slop com teste final,
   classificação de feedback (TASK-LOCAL / AGENT-RULE / PROJECT-RULE / GLOBAL-AGENT-SYSTEM-RULE) e
   human gate definido (pede ao Fabio só em identidade indefinida, duas direções plausíveis,
   mudança estrutural/global, remoção de componente crítico, decisão irreversível, conflito de
   requisitos).
4. A stack não muda: Tailwind v4 + shadcn (ADR-005, 2026-10-02). O redesign deve evoluir o tema
   escuro/azul existente (`--bg-color: #030712`, `--primary: #3b82f6`), salvo decisão do Fabio.
5. Ferramentas não confirmadas (Impeccable, Taste Skill, 21st/Magic MCP) não podem ser afirmadas
   como usadas; ficam em "Known gaps".

Alternatives:
1. Manter o escopo estreito do ADR-005 (só consistência/tokens/a11y) — não escolhida. O Fabio
   pediu ampliar.
2. Ampliar o escopo (escolhida pelo Fabio): o agente cobre UX, Design System persistente e
   redesign, não só polimento visual.
(Outras alternativas além dessas duas: UNKNOWN, não registradas na fonte.)

Why:
Motivo registrado só a nível de instrução do Fabio: ele definiu o prompt "Design & Frontend Lead"
como o escopo desejado. A motivação de fundo (evitar o produto voltar ao estado de "cada tela
parece feita por uma IA diferente", presente na própria missão do agente reescrito) está no texto
do agente; qualquer justificativa além disso é UNKNOWN. Separar `DESIGN.md` de `DESIGN-AUDIT.md`
vem do próprio agente: um é contrato visual aprovado, o outro é histórico, e misturar os dois
perde essa distinção.

Consequences:
- `DESIGN.md` e `DESIGN-AUDIT.md` viram dependência de leitura do agente (`inputs` do canônico):
  antes de criar ou alterar UI ele lê o primeiro; antes de redesign consulta o segundo.
- Enquanto os dois não existirem, o agente trabalha só com tokens soltos em `src/index.css` e
  `components.json`; criá-los é a primeira missão.
- Redesign global exige validar a direção com o Fabio antes de implementar.
- Mudança global (token, componente base) passa por impact analysis e, se alto, pelo
  `orchestrator`.
- Os 3 arquivos do agente (canônico, adapter Claude, wrapper Antigravity) precisam ficar em
  paridade. Nesta tarefa só foram confirmados o canônico e o adapter Claude; o wrapper Antigravity
  (`.agent-system/adapters/antigravity/agents/frontend.md`) não foi verificado (UNKNOWN).

Risks:
- Escopo largo (produto + UX + UI + DS + QA) pode sobrepor com `product`, `spec`, `pwa`, `admin`
  e `qa`; o agente declara handoffs, mas a fronteira na prática ainda não foi testada.
- Redesign global tem risco de virar "skinning" ou de quebrar fluxos de `pwa`/`admin`; mitigado
  por impact analysis e validação com o Fabio, ainda não exercitado.
- Ferramentas de validação (Chrome DevTools MCP, Playwright MCP) precisam de sessão reiniciada;
  sem elas o agente declara que não houve validação visual real.
- Em aberto: existe arquivo Figma de produção? (UNKNOWN; só há `FIGMA_PROMPT_TECHWEEK.md`).
- Esta ADR foi escrita antes do commit/PR da reescrita; se o texto final do agente mudar na
  revisão, conferir se este registro ainda bate.

Status: ACCEPTED

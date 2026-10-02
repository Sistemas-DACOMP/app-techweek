ADR-005 Adicionar o 16º agente: frontend (Design/UX/consistência visual)

Context:
Fabio pediu, em 2026-10-02, a criação de um agente "Frontend Design Engineer" a partir de uma
especificação de referência de 33 seções (Design Director + UI Engineer + Design Systems
Engineer + Accessibility Reviewer, com ferramentas como shadcn MCP, 21st/Magic MCP, Impeccable,
Taste Skill, Chrome DevTools MCP e Playwright MCP). Pediu explicitamente que o agente "converse
com os outros agentes e com todo o projeto", não funcione isolado.

Auditoria antes de implementar (mesma data): o projeto é 100% CSS puro + inline style (`package.json`
confirma zero Tailwind/shadcn/lib de componentes), com tokens reais já em `src/index.css` (tema
escuro/azul: `--primary: #3b82f6`, `--bg-color: #030712`, etc.) mas nenhum `DESIGN.md` formal.
Nenhuma das ferramentas de design citadas na spec de referência (shadcn MCP, 21st/Magic MCP,
Impeccable, Taste Skill, Chrome DevTools MCP, Playwright MCP) existe nesta sessão/projeto — só
`claude-in-chrome` (MCP de browser real deste projeto), de forma intermitente.

Decision:
Criar o 16º agente lógico, `frontend`, como especialista em identidade visual/Design System/
acessibilidade/consistência que corta através de `pwa` e `admin` por dimensão de disciplina — a
mesma forma que `security`/`qa`/`code-review` já cortam através de `backend`/`pwa`/`admin` por
suas próprias dimensões. Arquivos criados, seguindo exatamente o padrão dos outros 15:
- `.agent-system/agents/frontend.md` (canônico, runtime-agnóstico)
- `.claude/agents/frontend.md` (adapter Claude Code, tools: Read/Grep/Glob/Bash/Edit/Write)
- `.agent-system/adapters/antigravity/agents/frontend.md` (wrapper Antigravity)
- Registrado em `manifests/system.yaml` → `agents:`, `AGENTS.md` (tabela de roteamento, com
  correção de bônus: `apps/pwa/`/`apps/admin-web/` eram paths que não existem, trocados pelos
  reais `src/pages/...`), `adapters/claude/README.md` (tabela de mapeamento), e
  `scripts/agent-system-doctor.mjs` (`EXPECTED_AGENTS`, 15→16, confirmado rodando limpo).

O conteúdo do agente foi **adaptado à realidade do projeto, não copiado da spec de 33 seções**:
removidas todas as referências a ferramentas que não existem aqui (shadcn/21st/Impeccable/Taste/
Chrome DevTools MCP/Playwright MCP, marcadas como "Known gaps", não fingidas como disponíveis),
mantido o princípio central (anti-AI-slop, auditar antes de alterar, tokens antes de valor
hardcoded, acessibilidade mínima, loop de validação visual quando `claude-in-chrome` disponível).
Seção "Cooperação com outros agentes" explícita (gatilhos de handoff nas duas direções,
despacho automático sem precisar ser chamado por nome) — resposta direta ao pedido do Fabio de que
o agente "converse com os outros agentes e com todo o projeto".

Alternatives:
1. Expandir o escopo de `pwa`/`admin` pra incluir design — rejeitada: misturaria responsabilidade
   de dono-de-área (lógica, rota) com responsabilidade de disciplina (visual, consistência entre
   áreas), quebrando o padrão já estabelecido onde `security`/`qa` são agentes de disciplina
   separados dos agentes de área.
2. Copiar a spec de 33 seções quase literalmente, citando as ferramentas dela como disponíveis —
   rejeitada: violaria `docs/CONVENTIONS.md` → "Never fabricate" (nunca implicar que uma
   ferramenta não confirmada funciona ponta a ponta).

Why:
Mantém a mesma arquitetura lógica (papel por disciplina vs. papel por área) que já rege o resto do
sistema, em vez de criar uma exceção. Documentar as ferramentas ausentes como gap real, não
fingir capacidade, segue a mesma regra de evidência (`rules/evidence-model.md`) usada em todo o
resto do `.agent-system/`.

Consequences:
O agente `frontend` existe e despacha automaticamente (Claude Code confirmado via
`agent-system-doctor.mjs`, 16 agentes, 0 FAIL). Primeira tarefa real de design deveria
provavelmente formalizar `DESIGN.md` a partir dos tokens já existentes em `src/index.css` — ainda
não feito, fica como próximo passo natural, não parte desta decisão.

Risks:
Se Fabio instalar de fato uma das ferramentas citadas na spec de referência (shadcn, Chrome
DevTools MCP, etc.) no futuro, os três arquivos deste agente (`agents/frontend.md`,
`.claude/agents/frontend.md`, wrapper Antigravity) precisam ser atualizados pra deixar de marcar
essas ferramentas como "Known gaps" — não é automático, alguém precisa lembrar de editar.

Status: ACCEPTED

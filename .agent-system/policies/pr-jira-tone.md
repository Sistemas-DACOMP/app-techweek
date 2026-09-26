# Tom de comentário em PR / Jira

Fonte: `CLAUDE.md` → "Regras que não mudam" (tom) e memória do usuário (`feedback-jira-comment-scope`, `feedback-no-unauthorized-jira-edits`) — regras já em vigor, não novas.

## Tom

Comentário em PR e em card do Jira sempre em linguagem natural, como um dev escrevendo pra outro dev — nunca com tom de relatório gerado por IA, nem jargão desnecessário. Direto, sem enrolação, mas humano. Isto vale pra todo comentário escrito por qualquer agente deste sistema, em qualquer runtime.

## Escopo do que vai em comentário de Jira vs. chat

- Passos de ação manual (o que o Fabio ou o time precisa fazer com as próprias mãos) vão no **chat**, não em comentário de Jira.
- Um gap encontrado durante o trabalho, que não é o card atual, ganha **card novo linkado** — não vira um comentário solto anexado ao card errado.

## Jira é read-only por padrão

- Nunca editar epics/cards sem pedir explicitamente **naquele turno** — autorização de um turno anterior não cobre uma edição nova.
- Respeitar documentação já existente de um colega de time (não sobrescrever o trabalho de outra pessoa sem perguntar antes, mesmo que pareça desatualizado ou incompleto).
- Antes de criar um card, checar duplicados no board — o board deste projeto é conhecido por já ter cards duplicados; buscar primeiro, criar depois.

### Exceção documentada: `git-ops`

O agente `git-ops` (`.agent-system/agents/git-ops.md`) é a única exceção a "read-only por padrão" neste projeto, e só dentro de um escopo estreito — decisão do Fabio em 2026-09-21, depois de uma revisão de segurança apontar que a autonomia do agente contradizia esta regra sem reconciliação escrita em lugar nenhum. Reconciliado assim:

- `git-ops` **pode** escrever no Jira sem pedir por turno, mas só pra: (1) corrigir status que não bate com estado real verificado via `gh pr list`/`gh api` (nunca por inferência), (2) criar/verificar link de duplicata ou bloqueio, (3) comentar explicando uma correção, (4) abrir card novo (nunca editar um já existente) pra um gap encontrado durante cirurgia de branch/PR que não é escopo dele corrigir.
- `git-ops` **não pode** editar descrição/campo de um card já existente — essa ferramenta (`editJiraIssue`) foi deliberadamente removida do toolset dele; mudar conteúdo que outra pessoa escreveu continua exigindo pedido explícito, igual todo outro agente.
- Todo outro agente deste sistema (`code-review`, `qa`, `product`, `spec`, orquestrador) continua 100% read-only por padrão — a exceção é só do `git-ops`, não se espalha por generalização. Se outro agente achar um dos 4 sintomas que autorizam correção (ver `SKILL.md` → "HIGIENE DE JIRA AUTOMÁTICA"), ele aciona o `git-ops` pra escrever, não escreve ele mesmo.

## Escopo de segurança em comentários compartilhados

Nunca colocar detalhe sensível de segurança (token, credencial, caminho de exploit específico) em comentário de PR, comentário de Jira, ou qualquer doc versionado. Detalhe sensível fica só em chat direto com o Fabio. Já houve um incidente real disso vazando pra um PR e um README neste projeto — não repetir.

## Ver também

- `rules/engineering-rules.md` — regra original, ponto de origem.
- `feedback/feedback-loop.md` — categoria `PROCESS_RULE` cobre este tipo de regra de comunicação.

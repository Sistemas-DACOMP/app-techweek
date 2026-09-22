# AGENTS.md — Bootstrap Multi-Runtime para o App TechWeek

O comportamento de engenharia, orquestração, regras e papéis dos 14 agentes especializados deste projeto está definido em [`.agent-system/`](file:///Users/samuelamorim/Documents/Projetos/app-techweek/.agent-system):

- [`.agent-system/manifests/system.yaml`](file:///Users/samuelamorim/Documents/Projetos/app-techweek/.agent-system/manifests/system.yaml) — Mapa de capacidades, agentes suportados e status do projeto.
- [`.agent-system/agents/`](file:///Users/samuelamorim/Documents/Projetos/app-techweek/.agent-system/agents/) — Especificação canônica dos 14 agentes: `orchestrator`, `spec`, `product`, `architecture`, `backend`, `pwa`, `admin`, `qa`, `security`, `infra`, `code-review`, `git-ops`, `adr`, `ponytail`. `git-ops` (2026-09-21) é a camada mecânica de git/Jira embaixo do `code-review` — reconstrói branch/PR órfã ou desatualizada e corrige drift do board Jira, nunca julga corretude de código nem mexe em branch protection.
- [`.agent-system/rules/engineering-rules.md`](file:///Users/samuelamorim/Documents/Projetos/app-techweek/.agent-system/rules/engineering-rules.md) — Regras de engenharia (git flow, commits, reviews, invariantes de segurança).
- [`.agent-system/adapters/antigravity/`](file:///Users/samuelamorim/Documents/Projetos/app-techweek/.agent-system/adapters/antigravity/) — Adaptador operacional para Google Antigravity.

---

## Regras Inegociáveis (Qualquer Runtime: Antigravity, Claude Code, Codex)

1. **Sem trailers de co-autoria:** NUNCA incluir trailer de co-autoria de IA em mensagens de commit (`Co-authored-by`).
2. **Formato de Commits Semânticos:** Sempre usar `[TIPO] - descrição curta`, onde `TIPO` é um de: `ADD`, `FIX`, `UPD`, `DEL`, `DOC`, `CFG`.
3. **Merge Humano Obrigatório:** Agentes de IA preparam branches, validam testes e abrem PRs, mas NUNCA fazem o merge de Pull Requests em `develop` ou `main`.
4. **Quality Gate Mandatório:** Nenhuma branch pode ser enviada sem aprovação prévia do script `npm run quality-gate` (`scripts/quality-gate.mjs`) com score 1.0.
5. **Auditoria de QA e Segurança:** Qualquer alteração de código ou regras deve ser validada pelos agentes `qa` e `security`.

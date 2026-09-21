# Antigravity Multi-Agent Engineering Rules

Este projeto opera sob a arquitetura do **.agent-system/** com 13 agentes de engenharia especializados.
Como assistente Antigravity pareando neste projeto, você DEVE seguir estas regras de orquestração:

## 1. Regras Operacionais de Código
- Sempre use commits semânticos no padrão: `[TIPO] - descrição` (`ADD`, `FIX`, `UPD`, `DEL`, `DOC`, `CFG`).
- NUNCA inclua trailers de co-autoria de IA (`Co-authored-by`).
- O merge de PRs é estritamente humano (Fabio/Samuel).

## 2. Orquestração e Validação Automática com Subagentes
Sempre que você criar ou modificar código de funcionalidades, regras de banco ou infraestrutura:
1. **QA Gate (`qa-agent`)**:
   - Execute a suíte de testes unitários (`npm run test`).
   - Execute o Quality Gate oficial: `node scripts/quality-gate.mjs`.
   - Exija aprovação com score 1.0 (zero erros de lint, build limpo e todos os testes passando).
2. **Security Gate (`security-reviewer`)**:
   - Audite `firestore.rules` e `storage.rules`.
   - Verifique se nenhuma escrita de cliente foi permitida em coleções críticas (`/bookings`, `/checkins`).
   - Garanta que custom claims de roles (`ADMIN`, `STAFF`, `SPONSOR`) estão protegidos contra escalação de privilégios.
3. **Review Gate (`code-review`)**:
   - Compare os critérios de aceite (DoD) da tarefa no Jira com o diff gerado.
   - Verifique idempotência, tratamento de erros e tradução de mensagens para PT-BR.

## 3. Subagentes Disponíveis no Runtime
Os seguintes subagentes estão definidos e podem ser despachados via `invoke_subagent`:
- `qa-agent`: Validador de testes e qualidade.
- `security-reviewer`: Auditor de segurança perimetral e auth.
- `code-reviewer`: Revisor de aderência a DoD e padrões de código.


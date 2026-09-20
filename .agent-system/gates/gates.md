# Gates

Lista completa de gates (spec seção 36). Um gate é um checkpoint binário: passou ou está BLOCKED. Nenhum workflow (`workflows/*.md`) pula um gate silenciosamente — se um gate está BLOCKED, o trabalho não avança de fase e o orquestrador precisa expor isso explicitamente (pro humano ou pro próximo agente), nunca engolir o bloqueio e seguir em frente.

## Lista de gates

### SPEC READY
- **Satisfeito por**: existe um `SPEC.md`/critério de aceite (Jira ou `changes/*/SPEC.md`) descrevendo o que precisa ser verdade quando a tarefa terminar.
- **Quem limpa**: `spec` (ou `product`, quando a tarefa é regra de negócio pura).
- **BLOCKED significa**: ninguém sabe ainda o que "pronto" quer dizer — não é seguro ir pra Architecture/Plan. Orquestrador para aqui e força a etapa de spec antes de qualquer código.

### ARCHITECTURE APPROVED
- **Satisfeito por**: decisão de arquitetura registrada (ADR ou nota equivalente) quando a tarefa muda estrutura, contrato de API, modelo de dados, ou introduz um padrão novo.
- **Quem limpa**: `architecture`.
- **BLOCKED significa**: existe ambiguidade estrutural real (não apenas de implementação) — desenvolvimento não deve começar adivinhando a decisão.

### IMPLEMENTATION COMPLETE
- **Satisfeito por**: código escrito cobrindo o que o SPEC pediu, sem TODOs de escopo (débito técnico documentado é aceitável, escopo faltando não é).
- **Quem limpa**: `backend` / `pwa` / `admin` (o agente dono da área tocada).
- **BLOCKED significa**: falta parte do escopo combinado — não segue pra Security/QA fingindo que está pronto.

### SECURITY APPROVED
- **Satisfeito por**: revisão independente de segurança (auth, regras de acesso/RLS/Firestore rules, upload, tokens) sem achado HIGH/CRITICAL aberto.
- **Quem limpa**: `security` — só reporta, nunca corrige o próprio achado (evita revisar o próprio trabalho).
- **BLOCKED significa**: achado de severidade alta sem mitigação — não segue pra merge nem deploy até resolver ou o Fabio aceitar o risco explicitamente.

### INFRA APPROVED
- **Satisfeito por**: configuração de ambiente/infra (build step, variáveis, pipeline de deploy) validada pra suportar a mudança.
- **Quem limpa**: `infra`.
- **BLOCKED significa**: a mudança depende de algo que a infra atual não suporta (ex.: variável de ambiente nova sem lugar configurado) — não assumir que "vai funcionar em produção" sem essa validação.

### QA PASSED
- **Satisfeito por**: suíte de teste relevante (unit/API/integration/E2E/segurança-negativo/concorrência, conforme aplicável) verde, regras de negócio tocadas classificadas (ver `rules/evidence-model.md`).
- **Quem limpa**: `qa`.
- **BLOCKED significa**: teste vermelho, ou regra de negócio tocada ainda sem classificação — não segue pra Code Review.

### CODE REVIEW APPROVED
- **Satisfeito por**: revisão de consistência arquitetural, regressão e cobertura de teste (não é o mesmo escopo de Security nem de QA).
- **Quem limpa**: `code-review`.
- **BLOCKED significa**: achado de revisão sem correção — mesma regra de menor-mudança-possível do processo de PR (`rules/engineering-rules.md`).

### MERGE APPROVED
- **Satisfeito por**: todos os gates anteriores relevantes à tarefa limpos, mais decisão humana explícita de mergear.
- **Quem limpa**: **sempre humano** — nenhum agente/runtime pode clarear este gate sozinho (ver `policies/merge-policy.md`).
- **BLOCKED significa**: falta aprovação humana — não é um estado que um agente resolve escalando pra outro agente.

### DEPLOY VALIDATED
- **Satisfeito por**: deploy feito **e** validado (app acessível, recursos-chave funcionando, logs limpos, smoke tests passando — ver `workflows/deploy-workflow.md`). `firebase deploy`/`vercel deploy` retornar sucesso não é, por si só, evidência suficiente.
- **Quem limpa**: `infra` executa, `qa` valida o smoke test.
- **BLOCKED significa**: deploy rodou mas alguma validação pós-deploy falhou (app não responde, função quebrada, log com erro novo) — rollback ou fix imediato, não "vamos ver depois".

## Matriz de responsabilidade (spec seção 33)

Nomes de agente adaptados pros ids reais deste sistema (`manifests/system.yaml` → `agents:`).

| Área | Responsável | Revisor | Gate |
|---|---|---|---|
| Backend | `backend` | `code-review` | IMPLEMENTATION COMPLETE |
| PWA | `pwa` | `code-review` | IMPLEMENTATION COMPLETE |
| Admin | `admin` | `code-review` | IMPLEMENTATION COMPLETE |
| Firebase (infra geral) | `infra` | `security` | INFRA APPROVED |
| Firestore Rules | `security` | `infra` | SECURITY APPROVED |
| API | `backend` | `code-review` + `security` | IMPLEMENTATION COMPLETE + SECURITY APPROVED |
| Arquitetura | `architecture` | `spec` | ARCHITECTURE APPROVED |
| Regras de negócio | `spec` / `product` | `qa` | SPEC READY |
| Deploy | `infra` | `qa` | DEPLOY VALIDATED |
| Complexidade (anti-overengineering) | `ponytail` (não instalado — ver `agents/ponytail.md`; enquanto ausente, `architecture` cobre manualmente) | `code-review` | CODE REVIEW APPROVED |
| Regressão | `qa` | `code-review` | QA PASSED |

## Nunca

- Nunca marcar um gate como limpo sem a evidência que o satisfaz existir de fato (ver `rules/evidence-model.md` — isso é FACT, não pode ser INFERENCE/ASSUMPTION).
- Nunca deixar um gate BLOCKED silenciosamente — o orquestrador sempre surfaça o bloqueio explicitamente, mesmo que isso pare o fluxo.
- Nunca deixar um agente clarear um gate fora da sua coluna "Quem limpa" (ex.: `backend` não clareia SECURITY APPROVED sozinho).

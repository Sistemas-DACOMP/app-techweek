# Health check — `agent-system-doctor.mjs`

Script de diagnóstico (spec seção 13) para confirmar que a máquina que vai rodar este sistema tem o que ele precisa. É diagnóstico, não gate — sempre sai com exit code 0, mesmo com FAILs, porque a intenção é informar, não travar CI nem bloquear uma sessão.

## Como rodar

```
node scripts/agent-system-doctor.mjs
```

Não precisa de nenhuma dependência nova — usa só módulos nativos do Node (`fs`, `path`, `child_process`).

## O que ele checa

| Check | Critério | Severidade se ausente |
|---|---|---|
| `.agent-system/manifests/system.yaml` | existe e não está vazio | FAIL |
| `.agent-system/agents/` | contém os 13 arquivos esperados (orchestrator, spec, product, architecture, backend, pwa, admin, qa, security, infra, code-review, adr, ponytail) | FAIL, lista quais faltam |
| `.claude/agents/` | diretório existe | FAIL |
| `.claude/skills/` | diretório existe | FAIL |
| `git` no PATH | `git --version` roda sem erro | FAIL |
| `gh` CLI no PATH | `gh --version` roda sem erro | FAIL |
| `node` no PATH | trivialmente verdadeiro — o script está rodando nele | PASS sempre |
| `npm` no PATH | `npm --version` roda sem erro | FAIL |
| `docker` no PATH | `docker --version` roda sem erro | WARN (opcional, não bloqueia hoje) |
| `firebase` CLI no PATH | `firebase --version` roda sem erro | WARN (necessário só para o alvo Firebase futuro, não para trabalhar neste sistema hoje) |
| `gcloud` CLI no PATH | `gcloud --version` roda sem erro | WARN (mesma razão do firebase) |

No final imprime um resumo `N PASS, N WARN, N FAIL`.

## Exemplo de execução real (2026-09-20, re-rodado após instalação do Firebase CLI)

Rodado nesta máquina (Windows), a partir da raiz do repo, depois que o Fabio instalou o firebase CLI:

```
$ node scripts/agent-system-doctor.mjs
agent-system-doctor — health check .agent-system/

[PASS] manifests/system.yaml existe e não está vazio — .agent-system\manifests\system.yaml (3402 bytes)
[PASS] .agent-system/agents/ (13 agentes esperados) — todos presentes: orchestrator.md, spec.md, product.md, architecture.md, backend.md, pwa.md, admin.md, qa.md, security.md, infra.md, code-review.md, adr.md, ponytail.md
[PASS] .claude/agents/ existe — .claude\agents existe
[PASS] .claude/skills/ existe — .claude\skills existe
[PASS] git no PATH — git version 2.49.0.windows.1
[PASS] gh CLI no PATH — gh version 2.98.0 (2026-08-20)
[PASS] node no PATH — v22.16.0
[PASS] npm no PATH — 11.10.0
[WARN] docker no PATH — opcional para este sistema — não bloqueia trabalho hoje
[PASS] firebase CLI no PATH — 15.30.2
[WARN] gcloud CLI no PATH — necessário para o alvo Firebase (agente infra), não para trabalhar neste sistema em si

Resumo: 9 PASS, 2 WARN, 0 FAIL
```

`firebase` virou PASS (15.30.2) assim que o CLI foi instalado — nenhuma mudança de código do script foi necessária, ele já checava a presença do binário. `docker` e `gcloud` continuam WARN nesta máquina nesta data — ver `.agent-system/manifests/capability-matrix.md`. `gcloud` vira bloqueador real (não mais WARN cosmético) assim que o agente `infra` precisar de operação direta de API do GCP (IAM, Cloud Build, runtime config de Cloud Functions além do que `firebase deploy` cobre) contra o stack Firebase de verdade.

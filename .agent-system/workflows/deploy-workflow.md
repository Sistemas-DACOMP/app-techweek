# Deploy workflow

Grafo do spec (seções 40-41):

```
MERGED
  → INFRA
    → BUILD
      → CONFIG VALIDATION
        → SECURITY
          → DEPLOY
            → SMOKE TEST
              → QA
```

## Regra explícita: deploy rodar sem erro não é sucesso

**"`firebase deploy` não é evidência suficiente de sucesso."** O mesmo vale pra qualquer comando de deploy (`vercel`, `gh-pages`, etc.). Sucesso real = todos os itens abaixo, não só o comando retornar exit 0:

- Deploy concluído (o comando terminou sem erro).
- App alcançável (a URL responde, não é uma tela em branco ou erro 5xx).
- Recursos-chave funcionando (rota principal, autenticação, o fluxo que a mudança tocou).
- Logs limpos (sem erro novo aparecendo depois do deploy).
- Smoke tests passando.

## Checklist de validação pós-deploy

- App carrega.
- Autenticação funciona (login/signup, conforme aplicável).
- API responde (endpoints principais, não só health-check).
- Firestore acessível e com as regras esperadas em vigor (ou, no stack atual, Supabase/RLS — ver "Estado atual" abaixo).
- Function/Cloud Function relevante executa sem erro (quando existir).
- Rules (Firestore rules / RLS policies) validadas contra o comportamento esperado, não só "aplicadas".
- Fluxo específico que a mudança tocou, testado manualmente ou via smoke test automatizado.
- Logs verificados — sem erro novo.
- Nenhum erro novo em produção comparado ao baseline anterior ao deploy.
- Smoke tests (automatizados ou roteiro manual mínimo) passando.

## Estado atual: isto é teórico para o alvo Firebase

Este workflow completo (INFRA → BUILD → CONFIG VALIDATION → SECURITY → DEPLOY → SMOKE TEST → QA) ainda não tem pipeline real pro alvo Firebase/GCP — os repos `apps/pwa`, `apps/admin-web` e `backend/` não existem ainda (`manifests/system.yaml` → `project_context.status: TRANSITIONAL`), e `firebase`/`gcloud` CLI não estão instalados na máquina auditada (2026-09-20). Nenhum agente deve fingir que este pipeline roda de verdade contra Firebase hoje.

O deploy real e funcionando hoje é do repo antigo (Supabase), documentado separadamente em `CLAUDE.md` → "Estado da infra":

- Produção: GitHub Pages, branch `main`, via `.github/workflows/deploy.yml`.
- Homologação: Vercel (time `facomtechweek`, projeto `app-techweek-homolog`), Production Branch = `homolog`.

Quando o pipeline Firebase existir de fato, este arquivo deve ser atualizado com os comandos reais (equivalente a `firebase deploy`, config de ambiente, etc.) em vez de permanecer só o grafo teórico.

## Ver também

- `gates/gates.md` — gate DEPLOY VALIDATED usa exatamente este checklist como critério.
- `policies/quality-gate.md` — BUILD/CONFIG VALIDATION reaproveitam o mesmo princípio de gate mecânico, não autoavaliação de LLM.

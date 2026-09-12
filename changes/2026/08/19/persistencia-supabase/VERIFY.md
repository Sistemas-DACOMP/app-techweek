---
change: persistencia-supabase
type: feature
status: verified-static
created: 2026-08-19
---

# Verificação — Persistência de gameplay no Supabase

Conferência dos critérios de aceite do `SPEC.md` contra o que foi implementado.
**Aviso importante**: a migration SQL (`supabase/migrations/0001_gameplay_persistence.sql`)
não foi aplicada em nenhum projeto Supabase real (homolog ou produção) — tudo abaixo
foi verificado estaticamente (leitura de código, build e lint), não rodando o app
contra um banco de verdade. Isso é uma tarefa de QA manual pendente, listada no final.

## Critérios de aceite

| # | Critério | Status | Nota |
|---|---|---|---|
| 1 | Novo participante começa com 0 pontos | ✅ implementado | `points` no `useUser.js` é a soma dos `point_events`; sem eventos, soma é 0. |
| 2 | Scan de QR soma pontos e persiste entre dispositivos | ✅ implementado | `registerCodeScan` grava em `point_events` via Supabase (não mais `localStorage`); qualquer dispositivo autenticado como o mesmo usuário lê os mesmos eventos. |
| 3 | Código já escaneado não gera pontos de novo | ✅ implementado (dupla camada) | Checado no cliente (`hasScannedCode`) **e** garantido no banco pela constraint `UNIQUE(user_id, event_type, reference_id)` — mesmo se o cliente falhar, o insert é rejeitado. |
| 4 | Missões de networking (network_first/course/type/period) uma vez cada | ✅ implementado | Mesma lógica condicional do código original, agora gravando via `recordEvent`; dedup também reforçado pela constraint. |
| 5 | Missões manuais completam uma vez, com resposta guardada | ✅ implementado | `completeChallenge` agora aceita `metadata`; `Challenges.jsx` passa o formulário preenchido como metadata do evento (`manual_challenge`), em vez de `localStorage.facom_manual_missions`. |
| 6 | Ranking mostra classificação real de todos os participantes | ✅ implementado | `Ranking.jsx` usa a view `ranking` (agregação real de `point_events` por usuário) em vez dos 4 usuários mockados. |
| 7 | Pontos/missões de um participante isolados dos de outro (RLS) | ⚠️ implementado, não testado ao vivo | Policies de RLS escritas na migration (`select`/`insert` restritos a `auth.uid()`); **não há como confirmar que o Postgres realmente aplica isso sem rodar a migration num projeto Supabase real e testar com duas contas.** |

## Verificação estática

- `npm run build` — ✅ sem erros de compilação.
- `npm run lint` (oxlint) — ✅ sem erros; só warnings pré-existentes (não introduzidos por esta mudança) em `Login.jsx`, `App.jsx`, `Scanner.jsx`, `InstagramMission.jsx`. As duas novas warnings em `useUser.js` (parâmetros `e`/`e2` de catch não usados) reproduzem exatamente o padrão do código original.
- Busca por referências residuais às chaves antigas do `localStorage` (`facom_points`, `facom_scanned_codes`, `facom_completed_challenges`, `facom_mascot`, `facom_user_profile`, `facom_manual_missions`) — nenhuma leitura/escrita restante, só um comentário explicativo.

## Lacunas / trabalho pendente (fora do que este ciclo cobre)

1. **Aplicar a migration nos dois projetos Supabase reais** (homolog primeiro, depois produção) — arquivo pronto em `supabase/migrations/0001_gameplay_persistence.sql`, não executado.
2. **QA manual end-to-end** contra o Supabase de homolog: cadastrar 2 usuários de teste, confirmar que os pontos/missões de um não vazam pro outro, testar o dedup de scan/missão de verdade, conferir se o Ranking bate.
3. **Push da branch `feature/persistencia-supabase` e abertura de PR pra `develop`** — não feito nesta tarefa (fica pra revisão humana).
4. ~~As 3 suposições registradas no `PLAN.md` foram assumidas, não confirmadas~~ — **confirmadas com Fabio em 2026-08-19**: metadata de missão manual ok; desempate corrigido pra ordem de conclusão (não cadastro); progresso de teste no `localStorage` descartado de propósito.
5. **Gap conhecido, aceito de propósito**: `username` não tem constraint de unicidade — dois participantes podem escolher o mesmo nome de usuário, o que pode confundir o scanner de QR (que identifica o perfil escaneado por `user_${username}`). Considerado e descartado por Fabio em 2026-08-19 — validação de e-mail (já garantida pelo Supabase Auth) é suficiente por ora.

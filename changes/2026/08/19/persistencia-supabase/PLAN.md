---
change: persistencia-supabase
type: feature
status: approved-for-implementation
created: 2026-08-19
---

# Plano — Persistência de gameplay no Supabase

Referência: `SPEC.md` nesta mesma pasta.

## Suposições assumidas (perguntas em aberto do SPEC, decididas pra destravar o plano — revisar se discordar)

1. Respostas de missões manuais são persistidas como `metadata` (jsonb) no evento de pontos, não descartadas.
2. Desempate no Ranking: pontos desc, depois o timestamp do evento de pontos mais recente de cada participante (asc) — quem **atingiu aquele total primeiro** fica na frente em caso de empate (não é ordem de cadastro). *(Corrigido em revisão — versão anterior usava `created_at` do perfil por engano.)*
3. Progresso de teste que já existe no `localStorage` de quem testou o app antes desta mudança **não é migrado** — perda aceita (dado de pré-lançamento, não de evento real).

## Modelo de dados

- **`profiles`**: espelha o perfil do participante (hoje só existe em `auth.users.user_metadata` + `localStorage`). Preenchida automaticamente por trigger no `auth.users` (sem exigir mudança no fluxo de cadastro).
- **`point_events`**: log de cada ação que rendeu pontos. Uma constraint `UNIQUE(user_id, event_type, reference_id)` no banco garante o "não pode repetir" do SPEC (regras 3-6) mesmo se o cliente tentar duas vezes.
- **view `ranking`**: agregação `SUM(points)` por usuário, exposta só com total + nome (não os eventos individuais), pra cumprir a regra 10 do SPEC (outros participantes só veem total, nunca eventos).

## Tarefas atômicas

1. **[SQL] Criar `supabase/migrations/0001_gameplay_persistence.sql`** com: tabela `profiles`, tabela `point_events` (+ unique constraint), RLS habilitado nas duas (select/insert restritos a `auth.uid()`), trigger `handle_new_user` populando `profiles` a partir de `auth.users`, view `ranking`. **Arquivo apenas — não aplicar no Supabase homolog/produção reais nesta tarefa.**
2. **[Código] Criar `src/lib/gameplay.js`**: funções puras de acesso a dados (`getMyProfile`, `updateMascot`, `getMyPointEvents`, `addPointEvent`, `getRanking`), centralizando as queries Supabase num só lugar (evita duplicar a mesma chamada em cada componente).
3. **[Código] Reescrever `src/hooks/useUser.js`**: mesma API externa (`points`, `scannedCodes`, `completedChallenges`, `mascot`, `setMascot`, `registerCodeScan`, `completeChallenge`, `hasScannedCode`, `hasCompletedChallenge`), agora lendo/escrevendo via `gameplay.js` em vez de `localStorage`. Funções que escrevem passam a ser assíncronas.
4. **[Código] Atualizar `src/pages/Scanner.jsx`**: `handleScan` vira async, aguarda `registerCodeScan`, trata violação de unicidade como "já escaneado".
5. **[Código] Atualizar `src/pages/Challenges.jsx`**: `handleSimulateChallenge`/`handleManualSubmit` aguardam `completeChallenge`; resposta do formulário manual vira `metadata` do evento em vez de ir pro `facom_manual_missions` do `localStorage`.
6. **[Código] Atualizar `src/pages/InstagramMission.jsx`**: `shareOrDownload` aguarda `completeChallenge('instagram_story', 50)`.
7. **[Código] Atualizar `src/pages/Ranking.jsx`**: substitui os 4 usuários mockados por `getRanking()` (view real), mantendo destaque visual pro participante autenticado.
8. **[Código] Atualizar `src/pages/Register.jsx`**: remove a escrita em `localStorage.facom_user_profile` (perfil agora vem do banco via trigger). Fluxo de `auth.signUp` não muda.
9. **[Código] Atualizar `src/pages/Dashboard.jsx` e `src/pages/Profile.jsx`**: liam `localStorage.facom_user_profile` pro nome/curso exibido — passam a buscar via `getMyProfile()`. *(Não estavam na lista original do handoff, mas dependem do mesmo dado migrado — sem essa mudança, nome/curso ficariam em branco após a migração.)*
10. **[Verificação] `npm run build` e `npm run lint`** — checagem estática, não substitui teste manual contra um Supabase real (sem suíte de testes automatizados no projeto hoje).
11. **[Verificação] Escrever `VERIFY.md`** conferindo cada critério de aceite do `SPEC.md`, sinalizando o que só dá pra confirmar com teste manual (RLS, dedup real) já que as tabelas não foram aplicadas em nenhum Supabase real nesta tarefa.

## Fora do plano (fica pro humano decidir depois)

- Rodar a migration SQL de fato nos projetos Supabase (homolog e produção).
- Push da branch / abertura de PR pra `develop`.
- QA manual end-to-end contra o Supabase de homolog.

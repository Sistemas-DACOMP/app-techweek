---
change: persistencia-supabase
type: feature
status: roteiro-de-qa
created: 2026-08-19
---

# Roteiro de teste manual — persistência Supabase (homolog)

Pré-requisitos: migration `0001_gameplay_persistence.sql` já aplicada no Supabase de homolog, `.env.local` configurado com as credenciais de homolog, `npm run dev` rodando.

## 1. Isolamento entre participantes

1. Cadastre o **Participante A** (ex: curso "Sistemas de Informação", tipo "Aluno da UFU").
2. Confira no Supabase (**Table Editor → profiles**) que apareceu uma linha sozinha, criada pelo trigger.
3. Faça logout, cadastre o **Participante B** (curso diferente, ex: "Engenharia").
4. No app, como B, vá em **Perfil** e confirme que os pontos mostram **0** — não deve herdar nada de A.

## 2. Scan de QR e dedup

5. Como B, vá em **Scanner** → **Simular Leitura** algumas vezes até cair num scan de perfil (payload de usuário simulado) — confirme **+5 pontos**.
6. Repita o clique tentando escanear o **mesmo** código simulado de novo (ou o perfil real de A, duas vezes seguidas) — na segunda vez deve aparecer "já escaneado" e os pontos **não** devem subir de novo.
7. Confira em **Table Editor → point_events** que só existe **uma** linha pra aquele `reference_id` do usuário B (a constraint UNIQUE deve ter recusado a segunda tentativa se o app tentasse mandar de novo).

## 3. Missões automáticas de networking

8. Escaneie o **perfil real do Participante A** com o Participante B logado.
9. Confirme que `network_first` (+10) é concedida.
10. Se os cursos forem diferentes (passo 1 vs 4), confirme que `network_course` (+15) também é concedida.
11. Escaneie o perfil de A **de novo** — nenhuma dessas missões deve dar pontos uma segunda vez.

## 4. Missão manual

12. Em **Missões**, complete uma missão manual (ex: "De Olho na Vaga"), preenchendo o formulário.
13. Confirme os pontos correspondentes.
14. No Supabase, confira **point_events** — a linha dessa missão deve ter a resposta do formulário dentro de `metadata` (jsonb).
15. Tente completar a mesma missão de novo — não deve ser possível (botão já não aparece mais / sem pontos extras).

## 5. Ranking real

16. Abra a tela de **Ranking**, logado como A e depois como B.
17. Confirme que aparecem os dois participantes reais (não mais os 4 nomes fictícios), ordenados por pontos.
18. Se A e B ficarem empatados em algum momento, confirme que quem atingiu aquele total **primeiro** aparece na frente (critério de desempate).

## 6. Isolamento de leitura (RLS)

19. No Supabase, com a chave `anon` (não a `service_role`), tente rodar no SQL Editor:
    ```sql
    select * from point_events;
    ```
    Isso deve **falhar ou retornar vazio** quando executado como um usuário autenticado tentando ler eventos de outro `user_id` — a forma mais simples de confirmar é checar em **Database → Policies** que as duas policies (`select`/`insert` "own") aparecem ativas nas tabelas `profiles` e `point_events`.

## Critério de aprovação

Todos os itens acima passando = migration pronta pra virar PR `develop` → `homolog`. Qualquer item falhando, reportar aqui antes de prosseguir.

---
change: kan-51-checkin-double-check
type: feature
status: planned
created: 2026-09-21
jira: KAN-51
---

# Double-check de presença (entrance + checkout) e crédito de pontos

## Contexto

DoD oficial do KAN-51 (fonte de maior precedência, Jira):

- `POST /api/checkin/entrance` (Staff/ADMIN): grava status `CHECKED_IN` com timestamp de entrada.
- `POST /api/checkin/checkout` (Aluno): valida QR do telão com token dinâmico da atividade e timestamp de expiração.
- Double check: checkout recusado se não teve `entrance` prévio do Staff.
- Sucesso: status `COMPLETED`, credita pontos no `totalPoints` do participante via `FieldValue.increment()`, marca presença 100% validada pro certificado.
- Duplicidade: 409 se aluno tentar checkout repetido.

Já existe `backend/src/routes/checkin.ts` (KAN-71, em produção/homolog): fluxo de 1 etapa, aluno escaneia o QR **estático** da própria palestra, credita `pointEvents/{uid}_lecture_attendance_{activityId}` (não um campo agregado). Fabio confirmou que quer o double-check do KAN-51 implementado do zero, sem descartar o KAN-71 — os dois convivem, decisão de convivência abaixo (D2).

Achado à parte: `docs/PLANEJAMENTO_JIRA_V2.md` (rascunho de planejamento original, numeração antiga onde este mesmo item era "KAN-49") e `Update System/arquitetura-montanha-v2.md` (pasta irmã do repo, fora do Git) descrevem versões mais antigas e mais simples deste mesmo endpoint (sem double-check, campo `pontuacaoTotal`, +100 pontos fixo). Tratadas como histórico superado pelo DoD real do KAN-51, não como spec concorrente — citadas aqui só porque explicam o prefixo "[KAN-XX]" estranho que aparece em vários summaries do Jira (resíduo do rascunho, não um link real).

## Objetivo

Implementar os dois endpoints do DoD, com um endpoint auxiliar de emissão do QR dinâmico, mantendo o KAN-71 funcionando para atividades que não usam double-check.

## Fora de escopo desta mudança

- Qualquer tela de PWA/admin-web (scanner de Staff, tela de projeção do telão, seleção de `attendanceMode` no cadastro de atividade) — sessão atual está restrita a backend (`backend/`, `firestore.rules`, `storage.rules`).
- Migrar `src/pages/Ranking.jsx` para ler `totalPoints` do Firestore — hoje esse componente lê de uma view Supabase (`getRanking()` em `src/lib/gameplay.js`, campo `total_points`), stack completamente diferente (o PWA ainda não migrou pra Firebase). `totalPoints` no Firestore é escrito por este card, mas nada no PWA lê ele ainda — gap conhecido, registrado, não é regressão desta mudança.
- Rate limiting nos endpoints novos (mesma decisão do KAN-75, card já aberto separado).

## Decisões explícitas (validadas com Fabio via AskUserQuestion em 2026-09-21)

### D1 — QR dinâmico via endpoint de emissão + HMAC-SHA256

Token assinado com HMAC-SHA256 (`node:crypto`, sem dependência nova), payload `activityId + expiresAtEpoch`, segredo em variável de ambiente do backend (`SCREEN_TOKEN_SECRET`). Endpoint novo `GET /api/activities/:id/screen-token`, protegido por `requireRole(['STAFF', 'ADMIN'])`, devolve `{ token, expiresAt }` com expiração curta (5 minutos — reduz janela de replay se alguém fotografar o QR e tentar reusar depois que a sala já esvaziou). A tela de projeção (fora de escopo aqui) chamaria esse endpoint periodicamente pra desenhar um QR novo. `checkout` só valida a assinatura e a expiração, sem tocar Firestore nessa etapa.

Alternativa descartada: cálculo determinístico sem endpoint (token = HMAC de `activityId` + janela de tempo arredondada). Mais simples, mas exigiria o segredo (ou algo que devolva o token pronto) também do lado do client de Staff — na prática ainda precisaria de um endpoint, só que mais difícil de auditar/trocar segredo depois. Fabio escolheu o endpoint explícito.

### D2 — Convivência com KAN-71 via `attendanceMode` por atividade

Campo novo `attendanceMode: 'SELF_SCAN' | 'DOUBLE_CHECK'` em `/activities/{id}`. `POST /api/activities/:activityId/checkin` (KAN-71) só aceita se `attendanceMode !== 'DOUBLE_CHECK'` (default `SELF_SCAN` se o campo não existir, pra não quebrar atividades já cadastradas sem o campo). `POST /api/checkin/entrance` e `/checkout` (KAN-51) só aceitam se `attendanceMode === 'DOUBLE_CHECK'`. Isso evita dupla contagem sem precisar de dedup cruzado entre `pointEvents` e a collection nova — cada atividade usa exatamente um dos dois fluxos.

Alternativa descartada: dedup cruzando as duas collections antes de creditar. Mais robusto a erro humano de cadastro, mas mais código pra um cenário (evento de poucos dias, poucas atividades) onde é razoável confiar que quem cadastra a atividade marca o campo certo. Fabio escolheu o campo simples.

**Consequência pro KAN-71**: `checkin.ts` precisa ler `attendanceMode` da atividade e recusar (400, `WRONG_ATTENDANCE_MODE`) se for `DOUBLE_CHECK` — pequena mudança no arquivo existente, dentro do escopo desta feature (é o que garante a invariante de não dupla contagem).

### D3 — Campo de pontos: `totalPoints`, `FieldValue.increment()` no valor de `activities/{id}.points`

Usa o nome do DoD mais recente (`totalPoints`), não `pontuacaoTotal` (nomenclatura do rascunho/arquitetura, superada). Campo novo em `/users/{uid}`, não existe hoje. Valor creditado por checkout: reusa `activities/{id}.points` (mesmo campo que `checkin.ts`/KAN-71 já lê), em vez de inventar um valor fixo novo — consistente entre os dois fluxos, e o DoD do KAN-51 não especifica um valor diferente.

**Gap aceito, documentado, não corrigido nesta mudança**: `src/pages/Ranking.jsx` não lê `totalPoints` (lê de uma view Supabase). Ranking fica sem refletir pontos creditados por qualquer um dos dois fluxos de checkin (KAN-71 ou KAN-51) até o PWA migrar pra Firestore — isso já era verdade antes desta mudança (KAN-71 também não alimenta nenhum ranking hoje), não é regressão nova.

## Modelo de dados novo

`/checkins/{uid}_{activityId}` (id determinístico, mesmo padrão de `bookings`/`pointEvents`):

```
uid: string
activityId: string
status: 'CHECKED_IN' | 'COMPLETED'
entranceAt: Timestamp
entranceBy: string        // uid do Staff/ADMIN que registrou a entrada
checkoutAt: Timestamp | null
pointsCredited: number | null
```

`/activities/{id}` ganha campo opcional `attendanceMode?: 'SELF_SCAN' | 'DOUBLE_CHECK'` (ausente = `SELF_SCAN`).

`/users/{uid}` ganha campo opcional `totalPoints?: number` (ausente até o primeiro checkout via double-check).

## Critérios de aceite (Given/When/Then)

- **Given** uma atividade com `attendanceMode: 'DOUBLE_CHECK'`, **When** um Staff chama `POST /api/checkin/entrance` com o `uid` do participante, **Then** cria/atualiza `/checkins/{uid}_{activityId}` com `status: 'CHECKED_IN'`, `entranceAt` e `entranceBy`.
- **Given** nenhum `entrance` registrado, **When** o aluno chama `POST /api/checkin/checkout` com um token de QR válido, **Then** retorna 409/403 (`ENTRANCE_NOT_FOUND`) e não credita ponto.
- **Given** um `entrance` `CHECKED_IN` válido, **When** o aluno chama `checkout` com token de QR válido e não expirado, **Then** atualiza status pra `COMPLETED`, credita `activities/{id}.points` em `users/{uid}.totalPoints` via `FieldValue.increment()`, grava `checkoutAt` e `pointsCredited`, tudo na mesma transação.
- **Given** um `checkout` já `COMPLETED`, **When** o aluno chama `checkout` de novo, **Then** retorna 409 e não credita ponto de novo.
- **Given** um token de QR expirado, **When** o aluno chama `checkout`, **Then** retorna 400/401 (`TOKEN_EXPIRED`) mesmo com `entrance` válido.
- **Given** uma atividade com `attendanceMode: 'DOUBLE_CHECK'` (ou sem o campo, default `SELF_SCAN`), **When** alguém chama o endpoint antigo `POST /api/activities/:activityId/checkin` (KAN-71), **Then** aceita normalmente se `SELF_SCAN`/ausente, recusa com 400 (`WRONG_ATTENDANCE_MODE`) se `DOUBLE_CHECK`.
- **Given** um Staff autenticado, **When** chama `GET /api/activities/:id/screen-token`, **Then** recebe um token HMAC válido por 5 minutos; um PARTICIPANT chamando a mesma rota recebe 403.

## Trabalho futuro (fora desta mudança, documentado por pedido explícito)

1. Telas de PWA/admin-web: scanner de Staff (`entrance`), tela de projeção (consome `screen-token` e desenha o QR), seleção de `attendanceMode` no cadastro de atividade no admin-web.
2. Migração de `Ranking.jsx` pra ler `totalPoints` do Firestore (depende da migração geral do PWA Supabase→Firebase, fora do escopo de qualquer card atual).
3. Rate limiting nos endpoints de checkin/checkout/screen-token (KAN-75).

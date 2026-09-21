---
id: REG-LEAD-001
nome: Captura de leads de estande, privacidade LGPD e gamificação
fonte: KAN-55 (critério de aceite no Jira — DoD)
tipo: CONFIRMADA
criterio: Endpoint POST /api/leads grava contatos em /leads/{sponsorUid}/contacts/{participantUid}, restrito aos papéis SPONSOR e ADMIN. Preserva a privacidade do participante não armazenando a data de nascimento exata no lead, calculando apenas a faixa etária dinâmica. Credita atômica e exclusivamente na primeira visita ao estande +50 pontos no saldo do participante, com retorno formatado para abertura de conversa no WhatsApp.
prioridade: alta
status: implementado (KAN-55)
testes_relacionados: backend/src/routes/leads.test.ts
implementacao_relacionada: backend/src/routes/leads.ts, backend/src/index.ts, firestore.rules (match /leads/{sponsorId}/contacts/{contactId})
ultima_validacao: 2026-09-21
---

## 1. Contexto e Motivação
Durante o evento FACOM TechWeek, empresas patrocinadoras possuem estandes para networking e recrutamento de estudantes. Para incentivar os participantes a visitarem os estandes e simplificar a coleta de informações pelos recrutadores:
1. O patrocinador escaneia o crachá do participante (físico ou no app) informando notas e avaliação (1 a 5 estrelas).
2. O participante ganha +50 pontos na gamificação por visitar o estande.
3. O patrocinador recebe um link direto de WhatsApp com mensagem contextualizada para contato imediato com o estudante.

## 2. Regras de Negócio e Segurança

### 2.1 Controle de Acesso (RBAC)
- O acesso a `POST /api/leads` é protegido obrigatoriamente por `requireAuth` e `requireRole(['SPONSOR', 'ADMIN'])`.
- Usuários com papel `PARTICIPANT` ou `STAFF` recebem `403 FORBIDDEN`.

### 2.2 Privacidade e Conformidade com a LGPD
- O perfil completo do aluno em `/users/{participantUid}` pode conter dados sensíveis ou pessoais como a data de nascimento exata (`birthDate`).
- **Invariante**: Ao salvar o lead em `/leads/{sponsorUid}/contacts/{participantUid}`, **a data de nascimento exata NUNCA é copiada ou persistida**.
- Em seu lugar, o backend calcula a **faixa etária dinâmica** em buckets:
  - `'Menor de 18'`
  - `'18-20'`
  - `'21-24'`
  - `'25-30'`
  - `'31+'`
  - `'Não informada'` (caso não preenchida ou inválida)

### 2.3 Gamificação Atômica e Deduplicação
- Toda visita concede **+50 pontos** no campo `pontuacaoTotal` do usuário via `admin.firestore.FieldValue.increment(50)`.
- É criado um registro com id determinístico em `/pointEvents/{participantUid}_sponsor_lead_{sponsorUid}` com tipo `sponsor_lead`.
- **Idempotência**: Se o mesmo patrocinador escanear o mesmo participante novamente (por exemplo, para atualizar anotações ou alterar a nota de estrelas), os dados do contato são atualizados com `{ merge: true }`, mas **nenhum ponto adicional é concedido** (`pointsAwarded: 0`).

### 2.4 Integração com WhatsApp
- O telefone do estudante é sanitizado (extração de dígitos e prefixação do DDI `55`).
- É retornado o deep-link `https://wa.me/{55DDDNUMERO}?text={mensagem_codificada}` pronto para consumo pelo frontend.


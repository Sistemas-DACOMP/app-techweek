---
id: REG-SPONSOR-003
nome: Cota de equipe do patrocinador (teamLimit) checada atomicamente
fonte: KAN-124 (defaults recomendados, ainda não validados pelo Fabio)
tipo: INFERIDA
criterio: Cota padrão por tier (DIAMANTE 5, OURO 4, PRATA 3), editável pelo ADMIN. Convites pendentes não consomem vaga; só o aceite consome, com contagem de members na mesma transação do aceite (N aceites paralelos com 1 vaga = 1 sucesso, os demais TEAM_FULL). PATCH não pode baixar teamLimit abaixo do número de membros (409 TEAM_LIMIT_BELOW_MEMBERS).
prioridade: alta
status: backend implementado, aguardando validação do Fabio
testes_relacionados: backend/src/services/sponsorInvites.test.ts, backend/src/routes/sponsorsAdmin.test.ts
implementacao_relacionada: backend/src/services/sponsorInvites.ts, backend/src/routes/sponsorsAdmin.ts
ultima_validacao: 2026-10-12
---

Contagem derivada de `sponsors/{id}/members`, sem contador desnormalizado.

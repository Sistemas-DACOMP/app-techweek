---
id: REG-SPONSOR-005
nome: Patrocinador sem Sympla não reserva nem pontua; leads por pessoa
fonte: KAN-124 (decisões do Fabio, 2026-10-12)
tipo: CONFIRMADA (sem Sympla = sem reserva/pontos; leads por pessoa) + INFERIDA (empresa do lead resolvida pelo vínculo do servidor)
criterio: Patrocinador sem ingresso Sympla é barrado por requireSymplaTicket em reserva e points/claim, e passa em leads/scanner/chamados/feed. Leads são por pessoa (sponsorUid), sem compartilhar entre a equipe. A empresa do lead vem de users.sponsorId -> sponsors/{id}.legacyCompanyId, nunca do body/query.
prioridade: alta
status: backend implementado
testes_relacionados: backend/src/routes/leads.test.ts, backend/src/routes/sponsorsAdmin.test.ts
implementacao_relacionada: backend/src/routes/leads.ts, backend/src/middlewares/authMiddleware.ts
ultima_validacao: 2026-10-12
---

Parte INFERIDA: ignorar `companyId` vindo do cliente (um SPONSOR não pode se passar por outra empresa). Contas SPONSOR legadas, sem sponsorId, mantêm o fallback antigo (campos do próprio users/{uid} e e-mail) e o compartilhamento legado por `company_leads`; contas vinculadas a sponsors/ não enxergam leads dos colegas.

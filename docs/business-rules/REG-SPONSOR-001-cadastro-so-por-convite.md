---
id: REG-SPONSOR-001
nome: Cadastro de patrocinador só por convite, com e-mail automático
fonte: KAN-124 (decisão do Fabio, 2026-10-12)
tipo: CONFIRMADA
criterio: Não existe cadastro aberto de SPONSOR. A conta só vira SPONSOR aceitando um convite emitido por ADMIN. O convite nominal é enviado automaticamente por e-mail; sem provedor configurado o backend devolve emailSent:false e o admin copia o link.
prioridade: alta
status: backend implementado, UI pendente
testes_relacionados: backend/src/services/sponsorInvites.test.ts, backend/src/routes/sponsorsAdmin.test.ts
implementacao_relacionada: backend/src/services/sponsorInvites.ts, backend/src/services/emailService.ts, backend/src/routes/sponsorsAdmin.ts, backend/src/routes/sponsorInvites.ts, firestore.rules
ultima_validacao: 2026-10-12
---

`POST /api/auth/register` continua criando só PARTICIPANT. A role SPONSOR só é gravada por `POST /api/sponsor-invites/:token/accept`, cujo corpo nunca carrega role, sponsorId nem teamLimit. Envio por Resend (`emailService.ts`); falta de `RESEND_API_KEY` não derruba a criação do convite.

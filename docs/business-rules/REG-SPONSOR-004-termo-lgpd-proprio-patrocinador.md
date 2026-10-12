---
id: REG-SPONSOR-004
nome: Termo de LGPD próprio do patrocinador
fonte: KAN-124 (default recomendado, texto jurídico inexistente)
tipo: INFERIDA
criterio: O aceite do convite exige termsAccepted:true (senão 400 TERMS_NOT_ACCEPTED) e grava termsAcceptedAt e sponsorTermsVersion no usuário. O texto jurídico ainda não existe; versão provisória SPONSOR_TERMS_VERSION='2026-10-draft'.
prioridade: alta
status: backend implementado, TEXTO JURÍDICO PENDENTE
testes_relacionados: backend/src/services/sponsorInvites.test.ts
implementacao_relacionada: backend/src/services/sponsorInvites.ts, backend/src/routes/sponsorInvites.ts
ultima_validacao: 2026-10-12
---

Complementa REG-LGPD-001 (participante). Antes de produção: definir o texto, exibi-lo no front e trocar a constante (TODO em `services/sponsorInvites.ts`).

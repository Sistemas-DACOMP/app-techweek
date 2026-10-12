---
id: REG-SPONSOR-002
nome: Ciclo de vida do convite de patrocinador
fonte: KAN-124 (defaults recomendados, ainda não validados pelo Fabio)
tipo: INFERIDA
criterio: Convite vale 7 dias fixos. Nominal - uso único, só aceita o e-mail do convite. Genérico (sem e-mail) - multiuso até a equipe encher ou expirar. Token em claro nunca persiste (só SHA-256). Inexistente/usado/revogado respondem igual (404 INVITE_INVALID); expirado de token existente responde 410 INVITE_EXPIRED. Reenvio gera token novo e revoga o antigo atomicamente.
prioridade: alta
status: backend implementado, aguardando validação do Fabio
testes_relacionados: backend/src/services/sponsorInvites.test.ts, backend/src/routes/sponsorsAdmin.test.ts
implementacao_relacionada: backend/src/services/sponsorInvites.ts, backend/src/routes/sponsorsAdmin.ts
ultima_validacao: 2026-10-12
---

Anti-enumeração: mensagem idêntica para inexistente/usado/revogado, rate limit por IP e teto de tentativas inválidas por token (em memória, por instância). `allowedEmailDomain` compara igualdade exata do domínio e exige e-mail verificado. Conta já existente (users com cadastro concluído) é recusada com 409 ALREADY_REGISTERED e mensagem genérica.

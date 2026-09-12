---
id: REG-AUTH-003
nome: Mapeamento de status pós-cadastro (signed_in / needs_email_confirmation / rate_limited / error)
fonte: KAN-15, changes/2026/08/31/robustez-login-cadastro/SPEC.md (decisão D2, critérios de aceite)
tipo: CONFIRMADA
criterio: signUpWithEmail deve devolver signed_in só quando existe sessão real; needs_email_confirmation com a MESMA mensagem tanto pra conta nova aguardando confirmação quanto pra e-mail já cadastrado não confirmado (anti-enumeração, de propósito); rate_limited quando o Supabase recusa por 429/over_email_send_rate_limit; error genérico pra qualquer outro caso — nunca confundindo weak_password com rate limit.
prioridade: alta
status: implementado
testes_relacionados: src/lib/auth.test.js (todos os describe blocks — comentários no teste usam os ids curtos REG-C4/REG-C5, mesma regra, mesmo SPEC.md D2)
implementacao_relacionada: src/lib/auth.js (signUpWithEmail), src/pages/Register.jsx
ultima_validacao: 2026-09-11
---

Antes desta regra, `Register.jsx` tratava "sem erro" como sinônimo de "cadastro novo e logado", o que causava dois bugs reais: e-mail já cadastrado (reenvio de confirmação) sendo tratado como conta nova, e cadastro exigindo confirmação de e-mail sendo tratado como logado sem sessão de verdade. `signUpWithEmail` normaliza isso em 4 status previsíveis. O ponto de segurança central é que `needs_email_confirmation` usa a mesma mensagem pros dois cenários possíveis (conta nova vs. e-mail já existente) — uma mensagem diferente reabriria enumeração de contas, o mesmo risco que a mensagem genérica de login (D3 do mesmo SPEC.md) evita do outro lado.

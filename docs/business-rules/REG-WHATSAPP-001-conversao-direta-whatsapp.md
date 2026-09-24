---
id: REG-WHATSAPP-001
nome: Sanitização de telefone e geração de deep-link inteligente para WhatsApp
fonte: KAN-54 (DoD Jira), docs/PLANEJAMENTO_JIRA_V2.md
tipo: CONFIRMADA
criterio: |
  1. A função utilitária `buildWhatsAppLink(phone, participantName, companyName, customMessage)` higieniza o número brasileiro:
     - Remove caracteres não numéricos.
     - Valida números com DDD (10 ou 11 dígitos) e garante prefixo DDI '55' (ex: 5534999998888).
     - Se o número já contiver o DDI '55' e 12 ou 13 dígitos, preserva o DDI.
     - Caso o número seja inválido ou vazio, retorna `null`.
  2. Gera mensagem contextualizada contendo o nome do participante e o nome da empresa patrocinadora:
     - Exemplo: "Olá, {participantName}! Foi um prazer conversar com você no estande da {companyName} na FACOM TechWeek."
     - Codifica o texto via `encodeURIComponent` para segurança em URLs.
  3. Retorna a URL pronta em formato deep-link: `https://wa.me/{55DDDNUMERO}?text={mensagem_codificada}`.
  4. O componente React `WhatsAppButton` renderiza botão interativo com ícone oficial do WhatsApp,
     estilo verde (#25D366), tipografia Montserrat e abertura segura via deep-link (target="_blank", rel="noopener noreferrer").
prioridade: alta
status: implementado
testes_relacionados: src/lib/whatsapp.test.js
implementacao_relacionada: src/lib/whatsapp.js, src/components/WhatsAppButton.jsx
ultima_validacao: 2026-09-24
---

Regra de negócio confirmada para conversão direta de leads capturados no estande para contato no WhatsApp.

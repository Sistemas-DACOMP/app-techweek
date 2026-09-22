# Active Task

Jira: KAN-47 — "Crachá Virtual do Participante com QR Code Exclusivo" (Backlog, prioridade High,
absorve parte da visão de crachá digital do produto)

## Objective

Participante visualiza um crachá digital (nome, curso, mascotes, pontuação) com QR Code idêntico
ao usado no crachá físico impresso (via Sympla), funcionando mesmo offline (PWA cache).

## Scope

`src/` (PWA) apenas — sem mudança de backend/rotas, sem mudança de Firestore rules. Piloto do
Agent System (Fase 24) — primeira tarefa de produto real rodada através deste processo.

## Confirmed requirements (DoD literal do card)

- QR Code renderizado na tela com a biblioteca `qrcode.react` (client-side).
- Conteúdo do QR = `ticketId` do Sympla, idêntico ao crachá físico impresso.
- Exibição integrada dos mascotes (`MascotDuo.jsx`) e pontuação acumulada.
- Suporte a cache offline no PWA (funciona sem internet).

## O que já existe (OBSERVADO, não é o que o DoD pede — gap real, não ambiguidade)

`src/pages/Profile.jsx` (linhas ~385-395, ~559) já renderiza um QR Code, mas:
- Usa serviço externo `api.qrserver.com` (imagem via URL de rede) — **quebra offline**, direto
  contra o requisito de cache offline do DoD.
- Dado do QR cai pra um JSON sintetizado (username/tipo/curso/período) quando não há
  `symplaTicket.qrCodeData` real — não é garantidamente o mesmo `ticketId` do crachá físico.
- Nenhum `MascotDuo`/pontuação ao lado do QR nessa seção.
- `qrcode.react` **não está instalado** (`package.json` só tem `html5-qrcode`, que é scanner, não
  gerador).

## Regra de negócio / decisão de produto em aberto (real ambiguidade, não decido sozinho)

O DoD descreve "visualizar meu crachá digital" como se fosse uma visualização própria — mas hoje
o QR já vive dentro da aba/seção de Perfil, não numa tela dedicada. Duas leituras válidas:

- (A) Upgrade in-place: manter o QR dentro de `Profile.jsx`, só trocar pra `qrcode.react` +
  offline + adicionar mascotes/pontuação ali.
- (B) Tela dedicada: criar uma view "Meu Crachá" separada (ex.: acessível do Dashboard), com o QR
  como peça central, mascotes e pontuação em destaque — mais alinhado a "crachá digital" como
  identidade visual própria, não uma seção a mais dentro do Perfil.

Classificação: **NÃO DEFINIDA** — nem o card nem o código resolvem isso sozinhos. Perguntado ao
Fabio antes de implementar (ver handoff/pergunta desta sessão).

## Relevant files

`src/pages/Profile.jsx`, `src/pages/Dashboard.jsx`, `src/components/MascotDuo.jsx`,
`src/lib/sympla.js`, `src/lib/userService.js` (campo `ticketId`), `package.json`.

## Status

READY_FOR_HUMAN_REVIEW. Fabio decidiu (A) — upgrade in-place dentro do Perfil. Implementado,
testado, PR aberta: https://github.com/Sistemas-DACOMP/app-techweek/pull/96 (branch
`feature/KAN-47-cracha-digital-qr`). `npm run quality-gate` → `quality_score: 1`, `approved: true`
(lint/build/test front+backend, 108 testes incluindo os 2 novos pra `getBadgeQrValue`). Jira
KAN-47 comentado e movido pra status `develop` (Em análise). Merge continua humano — nenhum passo
aqui tentou mergear.

Trabalho de agent-system (contexto/regras/ADRs/Maestri/Antigravity, ver
`task-history/2026-09-22-agent-system-buildout.md`) foi pra uma PR separada:
https://github.com/Sistemas-DACOMP/app-techweek/pull/97 (branch
`feature/agent-system-buildout-2026-09-22`) — sem Jira, por decisão do Fabio.

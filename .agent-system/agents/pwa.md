agent:
  id: pwa

runtime_requirements:
  - filesystem
  - shell
  - git

optional:
  - firebase        # SDK cliente + emulador de Auth/Firestore pra testar de verdade; ausente hoje (ver Known gaps)
  - test-runner
  - browser          # pra validar UI/scanner em navegador real
  - github

inputs:
  - task
  - spec            # Update System/arquitetura-montanha-v2.md, seções 2, 4.1, 4.2, 4.3, 7, 8.2, 8.3
  - relevant_rules   # CLAUDE.md (raiz do repo) + .agent-system/rules quando populado

outputs:
  - findings
  - implementation
  - tests
  - handoff

portable: true
portability_note: >
  Conhecimento de processo e convenções React/Vite/Tailwind/Firebase client SDK,
  sem chamada a ferramenta específica de um runtime de IA — funciona igual sob
  Claude Code, Codex ou Antigravity assim que o adapter de cada um apontar pra
  este arquivo.

## Purpose

Construir e manter o PWA mobile do FACOM Tech Week App (`apps/pwa/`) — o "super app" que atende os três papéis que operam pelo celular: Participante, Staff e Patrocinador. Cobre crachá virtual com QR Code, catálogo e reserva de oficinas, scanner de presença do Staff, scanner de leads do Patrocinador e o botão de contato via WhatsApp.

## Scope

- `apps/pwa/src/components/` — crachá QR (`qrcode.react`), scanner de câmera (`html5-qrcode`), cards de oficina.
- `apps/pwa/src/pages/` — Home, Agenda, Crachá, ScannerStaff, LeadsSponsor, Ranking.
- `apps/pwa/src/lib/firebase.ts` — inicialização do SDK cliente do Firebase (Auth + Firestore).
- `apps/pwa/App.tsx`, `apps/pwa/vite.config.ts`, `apps/pwa/package.json`.
- Leituras diretas no Firestore via SDK Web (`onSnapshot`, `getDoc`) para dado público/próprio: `/activities`, `/announcements`, o próprio `/users/{uid}`, a própria pontuação — sempre dentro do que `firestore.rules` permite (spec seção 8.2). Isso inclui escrita do próprio perfil (`/users/{uid}` via `update` quando `request.auth.uid == userId`), que a regra permite direto do cliente.
- Estados de UI de presença/check-in: refletir em tempo real o resultado de `POST /api/checkin` feito pelo Staff, escutando o documento/coleção que o backend atualiza (spec seção 4.2 — "Listener do Firestore avisa o aluno").
- `buildWhatsAppLink()` e o botão de contato do Patrocinador (spec seção 8.3) — a função roda no cliente, o backend só grava o lead e credita pontos.
- Chamadas `POST` pro backend que o app precisa disparar: `/api/activities/:id/reserve`, `/api/checkin`, `/api/leads` — sempre com `Bearer JWT`, tratando os códigos de resposta (200/404/409/500) que o backend define.

## Out of scope

- Qualquer rota, middleware, transação Firestore ou lógica de negócio do lado do servidor — handoff pro `backend`. O PWA nunca decide sozinho se uma vaga está disponível ou se um check-in é válido; ele só chama a API e reage à resposta.
- Telas e fluxos exclusivos do console admin (`apps/admin-web/`) — handoff pro `admin`.
- Redesenhar `firestore.rules` — o PWA consome a regra que existe; se uma tela precisa de um padrão de leitura que a regra atual não cobre, reportar e deixar o ajuste de regra pro `backend`/`infra`, não escrever leitura que dependa de regra ainda inexistente.
- "Consertar" um bug de dado errado escondendo no cliente (ex.: filtrar/recalcular no frontend um valor que devia vir certo da API ou do Firestore) — corrigir na origem ou abrir handoff pro agente dono da origem.
- Achado de segurança (ex.: regra do Firestore permitindo leitura de dado de outro usuário) — reportar, não silenciar nem contornar; handoff pro `security`.

## Process

1. Confirmar se `apps/pwa/` existe no repo de destino. Hoje (2026-09-20) não existe em lugar nenhum sob `C:\Users\fabio\App_TechWeek\` — ver Known gaps.
2. Ler a jornada de usuário correspondente (seção 4.1 Participante, 4.2 Staff, 4.3 Patrocinador) antes de montar tela ou fluxo novo — a sequência de chamadas (Auth → Firestore → API) já está definida ali, não inventar uma ordem diferente.
3. Decidir leitura direta no Firestore vs. chamada à API pela mesma régua da spec: dado público/próprio e sem necessidade de validação atômica → leitura direta (SDK); qualquer escrita que mude contagem de vaga, registre presença ou credite ponto → sempre via API, nunca escrita direta do cliente (a regra em `firestore.rules` já bloqueia isso com `allow write: if false` em `bookings` e `leads`, então nem tentar).
4. UI de estado assíncrono (reserva, check-in, lead) trata os três casos que a API pode devolver: sucesso imediato, fila de espera / já existente, erro — nunca assumir sucesso otimista sem confirmação do backend pra ações que definem "vaga garantida".
5. Scanner de QR (Staff e Patrocinador) só dispara a chamada à API depois de decodificar um QR válido; erro de leitura de câmera é estado de UI local, não vira chamada à API com payload vazio/inválido.
6. Rodar lint/build/test conforme o `quality-gate` do projeto definir, uma vez que `apps/pwa/package.json` exista.
7. Se a tarefa esbarra em território de outro agente (rota nova, regra de segurança, tela de admin), parar e produzir handoff em vez de invadir o escopo.

## Output format

Seguir exatamente `templates/agent-output.yaml`: `agent`, `task`, `status` (OK/BLOCKED/PARTIAL), `scope`, `findings` (com `id`, `severity`, `description`, `evidence`), `decisions`, `risks`, `blockers`, `evidence`, `recommendations`, `handoff` (`to`, `what_they_need_to_know`), `required_agents`. O parágrafo de `what_they_need_to_know` responde as seis perguntas de `templates/handoff.md` (o que descobri / validei / não consegui validar / precisa ser feito / quem precisa analisar / o que bloqueia).

## Evidence rules

- **FACT** — confirmado lendo código/config existente, rodando o app ou vendo o resultado de uma chamada real.
- **INFERENCE** — dedução razoável a partir da spec (diagrama de sequência, modelo de dados) ou do padrão de tela vizinha, não confirmada em execução.
- **ASSUMPTION** — premissa assumida por falta de informação (ex.: comportamento de UX não detalhado na spec), marcada como tal.
- **UNKNOWN** — não dá pra saber com o que está disponível agora (ex.: comportamento real do listener sob latência de rede, sem emulador/projeto Firebase real conectado).

Nunca promover INFERENCE ou ASSUMPTION a FACT silenciosamente.

## Known gaps

- **`apps/pwa/` não existe em disco.** Não há repo/pasta `apps/pwa` em `C:\Users\fabio\App_TechWeek\` (confirmado 2026-09-20). O trabalho real deste agente hoje é seguir a spec e planejar telas/componentes (estrutura de pastas, lista de componentes, contratos de chamada à API) — não manter código vivo.
- Sem `apps/pwa/package.json`, não há `quality-gate` pra rodar — o passo 6 do Process fica bloqueado até o repo ser criado.
- Firebase CLI não está instalado na máquina de desenvolvimento auditada (2026-09-20) — mesmo depois do `apps/pwa/` existir, testar Auth/Firestore contra emulador local está bloqueado até a instalação acontecer (achado do `infra`, mas afeta diretamente a capacidade deste agente de validar leitura/escuta em tempo real antes de apontar pra um projeto Firebase real).
- Nenhum backend real existe ainda pra este frontend chamar — qualquer contrato de rota usado aqui vem da spec (seção 6.1), não de uma API rodando; tratar como INFERENCE até o `backend` confirmar a implementação exata (nome de campo, código de erro).

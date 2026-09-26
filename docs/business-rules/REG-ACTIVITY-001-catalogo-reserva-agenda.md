---
id: REG-ACTIVITY-001
nome: Catálogo de atividades em tempo real, reserva síncrona e Minha Agenda
fonte: KAN-50 (DoD Jira), Update System/arquitetura-montanha-v2.md
tipo: CONFIRMADA
criterio: |
  1. Catálogo "Todas as Atividades": listagem de palestras, minicursos, workshops e ativações
     com atualização em tempo real de vagas e dados via `onSnapshot` em `/activities`.
  2. Filtros interativos por tipo (Todas, Palestras, Minicursos, Workshops, Ativações) e por data/dia.
  3. Badges de disponibilidade de vagas em tempo real (ex: "X vagas restantes", "Esgotado", "Lista de Espera").
  4. Botão de reserva/inscrição com feedback reativo imediato (< 300ms) integrado ao backend
     `POST /api/activities/:activityId/reserve`.
  5. Aba "Minha Agenda": listagem cronológica dedicada exclusivamente às atividades nas quais o
     participante garantiu vaga (`bookings.status == 'CONFIRMED'`) ou está inscrito.
  6. Indicação de status na "Minha Agenda":
     - "Inscrito": reserva confirmada (`bookings.status == 'CONFIRMED'`), aguardando início/portaria.
     - "Entrada Confirmada": entrada registrada pelo Staff (`checkins.status == 'CHECKED_IN'`).
     - "Presença Concluída": validação final de saída concluída (`checkins.status == 'COMPLETED'` ou presença registrada), pontos creditados.
  7. Botão/Leitor de QR Code integrado no card da atividade na "Minha Agenda" para ler o QR Code
     dinâmico do telão no encerramento (Double Check via `POST /api/checkin/checkout`).
prioridade: alta
status: implementado
testes_relacionados: src/lib/activityService.test.js
implementacao_relacionada: src/lib/activityService.js, src/pages/Dashboard.jsx, src/components/ActivityCard.jsx, src/components/ActivityModal.jsx, src/components/ActivityCheckoutScannerModal.jsx
ultima_validacao: 2026-09-24
---

Regra de negócio confirmada para a grade de atividades do PWA no evento FACOM Tech Week.
Garante que o aluno tenha visão completa do catálogo e acompanhe sua agenda com sincronização síncrona e em tempo real.

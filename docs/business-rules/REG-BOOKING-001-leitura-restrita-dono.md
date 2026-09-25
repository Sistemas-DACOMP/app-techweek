---
id: REG-BOOKING-001
nome: Leitura de reserva de vaga restrita ao dono ou ADMIN
fonte: Update System/arquitetura-montanha-v2.md (seção 8.2), KAN-48
tipo: CONFIRMADA
criterio: Um documento em `/bookings/{bookingId}` (id determinístico `{uid}_{activityId}`, ver KAN-49) só pode ser lido pelo participante dono da reserva (`resource.data.userId == request.auth.uid`) ou por um usuário com role ADMIN. Qualquer outro usuário autenticado, mesmo válido, não pode ler a reserva de outra pessoa.
prioridade: alta
status: implementado
testes_relacionados: nenhum ainda — não existe infra de teste automatizado para firestore.rules no projeto (ver observação abaixo)
implementacao_relacionada: firestore.rules
ultima_validacao: 2026-09-21
---

`firestore.rules` tinha `allow read: if isAuthenticated()` em `/bookings/{bookingId}` — qualquer participante logado conseguia ler a reserva de qualquer outro (quem se inscreveu em qual oficina, posição na lista de espera). A arquitetura documentada (`arquitetura-montanha-v2.md`, seção 8.2) já previa a regra correta (dono ou ADMIN); a implementação tinha divergido. Corrigido no KAN-48 pra bater com o spec.

**Gap conhecido**: o projeto não tem infra de teste automatizado pra `firestore.rules` (sem `@firebase/rules-unit-testing` configurado). A regra foi verificada por leitura (é uma condição declarativa simples, sem lógica de transação). Adicionar cobertura de emulador fica pro KAN-63 (expansão da suíte de testes do backend) em vez de criar essa infra isolada só pra essa regra.

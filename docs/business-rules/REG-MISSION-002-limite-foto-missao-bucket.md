---
id: REG-MISSION-002
nome: Validação e limite de foto em missões com upload
fonte: KAN-11 (Jira) + storage.rules + src/lib/validators.js
tipo: CONFIRMADA
criterio: Fotos anexadas como comprovante de missões (ex: "Colecione Patrocinadores") devem ser obrigatoriamente do tipo imagem segura ('image/png', 'image/jpeg', 'image/webp', 'image/gif') e possuir tamanho máximo de 5MB.
prioridade: alta
status: implementado
testes_relacionados: src/lib/validators.test.js
implementacao_relacionada: src/lib/validators.js, src/lib/gameplay.js, storage.rules
ultima_validacao: 2026-09-21
---

No fluxo de missões que exigem captura ou upload de foto, a validação ocorre em duas camadas:
1. No Frontend: `validateMissionPhoto` em `src/lib/validators.js` rejeita antes de iniciar o upload arquivos que não sejam imagens válidas ou que excedam 5MB (`5 * 1024 * 1024 bytes`).
2. No Storage: Regra declarativa em `storage.rules` no path `/mission_photos/{userId}/{fileName}` garantindo que apenas usuários autenticados gravem fotos até 5MB nos formatos autorizados.

---
id: REG-SCANNER-001
nome: Scanner de presença deveria aceitar só o QR da palestra selecionada
fonte: KAN-30 (Backlog)
tipo: CONFIRMADA
criterio: QR code escaneado só deve gerar ponto se o payload decodificado corresponder à palestra que o usuário selecionou — QR de outra palestra (ou dado ilegível) deve ser rejeitado, não pontuado.
prioridade: alta
status: corrigido em feature/KAN-30-scanner-lecture-match, aguardando revisão/merge em develop
testes_relacionados: src/lib/validators.test.js (describe "isQrForLecture (REG-SCANNER-001 / KAN-30)")
implementacao_relacionada: src/lib/validators.js (isQrForLecture), src/components/LectureScanner.jsx
ultima_validacao: 2026-09-12
---

O scanner de presença de palestra aceitava QR code de qualquer palestra, não só da que o usuário selecionou. Confirmado com o Fabio em 2026-09-12 como regra oficial a implementar agora (deixou de ser inferência).

## Convenção de payload do QR (definida nesta correção)

Como ainda não existem QR codes reais impressos/exibidos para o evento, foi definida a convenção do zero, sem risco de quebrar nada em produção: o QR de uma palestra deve conter um JSON no formato

```json
{"lectureId": "<lecture.id>"}
```

`isQrForLecture(rawScanData, expectedLectureId)` (em `src/lib/validators.js`) faz o parse desse JSON e compara `lectureId` (comparação estrita, sem coerção de tipo) contra o id da palestra selecionada na tela. Retorna `false` para JSON malformado, campo ausente, tipos não-string ou qualquer mismatch — nunca lança exceção.

`LectureScanner.jsx` chama essa função no callback de sucesso do `Html5Qrcode` antes de aceitar o scan: se não bater, a tela de avaliação/confirmação de presença não abre, o scanner continua rodando e uma mensagem de erro inline aparece (mesmo padrão visual do `saveError` já usado no fluxo de confirmação). Só quando o QR bate com a palestra selecionada o fluxo segue para a tela de nota e `handleConfirmPresence` (que já usava `lecture?.id` corretamente como `referenceId`).

## ⚠️ Gap operacional que esta correção NÃO resolve

**Não existe nenhuma funcionalidade de geração de QR code para palestras neste projeto.** Esta correção só valida o que é escaneado contra a convenção `{"lectureId": "<id>"}` — ela não cria, exibe nem imprime QR codes. Antes do evento real, alguém (Fabio ou quem for organizar a logística de palestras) precisa:

- Gerar/imprimir/exibir um QR code por palestra codificando exatamente `{"lectureId": "<id da palestra no Supabase>"}`;
- Garantir que o id usado no QR é o mesmo `id` da tabela de palestras usado pelo front.

Se os QR codes reais forem gerados em qualquer outro formato (texto puro, URL, id cru sem JSON, etc.), o scanner vai rejeitar 100% dos scans reais. Isso é um gap de ferramenta/processo, não de código — não há onde no código atual implementar a geração, então não foi feito como parte desta correção. Precisa virar tarefa própria (novo card) antes do evento.

## Histórico

- 2026-09-10: regra registrada como INFERIDA a partir de gap encontrado via QA (KAN-30 criado no Backlog).
- 2026-09-12: validada com o Fabio como regra oficial (CONFIRMADA). Corrigida em `feature/KAN-30-scanner-lecture-match`: convenção de payload definida, `isQrForLecture` implementada e testada, `LectureScanner.jsx` validando o scan antes de liberar a tela de confirmação de presença. Gap de geração de QR code para o evento real registrado acima, ainda sem solução.

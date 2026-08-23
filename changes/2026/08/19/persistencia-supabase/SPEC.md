---
change: persistencia-supabase
type: feature
status: draft
created: 2026-08-19
---

# Persistência de dados de gameplay no Supabase

## Contexto

Hoje o app só usa Supabase pra autenticação (`auth.signUp` / `auth.signInWithPassword`). Pontos, missões completadas, códigos escaneados, ranking e preferência de mascote vivem inteiramente no `localStorage` do navegador — ou seja, existem só naquele dispositivo/navegador específico.

Isso causa três problemas:
1. Participante perde o progresso ao trocar de aparelho, limpar o navegador, ou usar modo anônimo.
2. Não existe ranking real entre participantes — hoje a tela de Ranking usa 4 usuários fixos (mockados) e só injeta os pontos reais do próprio usuário.
3. Não há como gerar relatórios pós-evento com os dados de todos os participantes, porque cada um está isolado no próprio navegador.

## Objetivo

Migrar o estado de gameplay (pontos, missões concluídas, códigos escaneados, preferência de mascote) para o Supabase, associado ao participante autenticado — substituindo o uso de `localStorage` para esses dados, **sem alterar as regras de pontuação/missões já existentes**.

## Fora de escopo desta mudança

- Novas regras de pontuação, novas missões, ou mudanças na UI de missões/ranking além do necessário pra ler/escrever do Supabase em vez do `localStorage`.
- Login/cadastro (`auth.signUp`/`auth.signInWithPassword`) não mudam — continuam como estão.
- Detalhes técnicos de schema, nomes de tabela e políticas RLS — isso é decidido no `PLAN.md`, não aqui.

## Regras de negócio (comportamento atual a preservar)

1. Todo participante começa com 0 pontos ao se cadastrar.
2. Pontos só são ganhos através de ações discretas e específicas:
   - Escanear um QR code de outro participante: **+5 pontos**, uma única vez por código.
   - Missões automáticas de networking, disparadas ao escanear o perfil de outro participante (ver regra 4).
   - Missões automáticas por QR fixo (ver regra 5).
   - Missões manuais, preenchidas via formulário (ver regra 6).
   - Missão do Instagram Stories: **+50 pontos**, uma vez.
3. Um código já escaneado pelo participante não pode gerar pontos de novo — a segunda tentativa retorna "já escaneado", sem alterar o total.
4. Ao escanear o perfil (QR) de outro participante pela primeira vez, missões de networking são concedidas automaticamente, cada uma **no máximo uma vez por participante**, independente de quantas vezes a condição se repetir:
   - `network_first` (+10): primeiro perfil escaneado.
   - `network_course` (+15): curso do perfil escaneado é diferente do próprio curso (comparação sem diferenciar maiúsculas/minúsculas).
   - `network_type` (+15): tipo de participante do perfil escaneado não é "Aluno da UFU".
   - `network_period` (+15): perfil escaneado está no período 1.
5. Códigos QR fixos disparam missões fixas, cada uma no máximo uma vez por participante:
   - `kanastra_code` ou `sponsor_visit` → missão `sponsor_visit` (+15).
   - `secret_qr_code` → missão `secret_qr` (+40).
6. Missões manuais são concluídas via formulário e valem pontos uma única vez cada: `sponsor_vaga` (+20), `sponsor_tecnologia` (+20), `sponsor_colecao` (+50), `secret_password` (+30, exige a palavra-chave correta), `network_career` (+20), `network_connect_two` (+20), `network_past_edition` (+15), `network_first_edition` (+15).
7. O total de pontos de um participante é a soma de todas as ações distintas já concluídas por ele.
8. O Ranking deve mostrar a posição real de todos os participantes por pontos totais — não mais dados fictícios — ordenado do maior para o menor.
9. A preferência de mascote (azul "Teko" / roxo "Weeka") é salva por participante, com padrão azul. Hoje não existe UI que altere isso, mas o dado precisa continuar existindo por participante.
10. Cada participante só pode ler/alterar os próprios pontos, códigos escaneados e missões — exceto o Ranking, onde os pontos totais (não os eventos individuais) de outros participantes ficam visíveis.
11. Nada muda no fluxo de login/cadastro — só o estado de gameplay muda de lugar.

## Critérios de aceite (Given/When/Then)

- **Given** um novo participante se cadastra, **When** ele acessa o perfil pela primeira vez, **Then** seus pontos totais são 0.
- **Given** um participante autenticado escaneia um QR code de missão pela primeira vez, **When** o scan é registrado, **Then** os pontos correspondentes são somados ao seu total e continuam lá mesmo depois de acessar o app em outro dispositivo ou navegador.
- **Given** um participante já escaneou um código específico, **When** ele escaneia o mesmo código de novo, **Then** nenhum ponto adicional é concedido e a UI mostra "já escaneado".
- **Given** um participante escaneia o perfil de outro participante pela primeira vez, **When** as condições de rede (curso diferente, fora da UFU, período 1) se aplicam, **Then** cada missão de networking correspondente é concedida uma única vez.
- **Given** um participante completa uma missão manual preenchendo o formulário, **When** ele envia a resposta, **Then** a missão é marcada como concluída e os pontos são somados, sem permitir repetição.
- **Given** qualquer participante autenticado, **When** ele abre a tela de Ranking, **Then** vê a classificação real de todos os participantes por pontos totais.
- **Given** dois participantes diferentes usando o app ao mesmo tempo, **When** cada um realiza suas próprias ações, **Then** os pontos e missões de um nunca aparecem nem são alteráveis pelo outro.

## Perguntas em aberto pro PLAN.md

1. As missões manuais guardam respostas de texto/foto hoje (`facom_manual_missions` no localStorage) — precisamos persistir essas respostas, ou só o fato de a missão estar concluída já basta pro relatório pós-evento?
2. Critério de desempate no Ranking quando dois participantes têm o mesmo total de pontos (ordem de conclusão? alfabética?).
3. Participantes que já testaram o app antes dessa migração têm dado só no `localStorage` deles — aceitamos perder esse progresso de teste, ou precisamos de alguma importação?

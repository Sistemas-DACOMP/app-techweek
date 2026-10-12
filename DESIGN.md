# DESIGN.md - App TechWeek

Design System e direção visual **aprovados** do App TechWeek (FACOM Tech Week 2026, UFU).
Aprovação: Fabio, 2026-10-04, depois de várias rodadas de revisão com o time (feedback da Sam e da Shay incluído).

- **Fonte visual:** canvas de design no claude.ai, com páginas Visão geral, App do participante, Admin, Staff e Estados e falhas. Cada tela tem número (`1.07`, `2.06`...); este documento usa os mesmos números.
- **Este arquivo responde "como o produto deve ser".** O histórico ("como chegamos aqui", dívidas, pendências) fica em `DESIGN-AUDIT.md`.
- **Não é fonte de regra de negócio, segurança ou arquitetura.** Onde o design depende de uma regra, a seção 12 diz o status dela.
- **Implementação ainda não feita.** Hoje o código (`src/`) segue o design antigo. O plano de migração está em `DESIGN-AUDIT.md` (roadmap).

---

## 1. Direção

Um app **vivo, interativo na medida certa e autêntico**: escuro, com as cores da marca, os mascotes Alan e Ada presentes com função, e nada com cara de template genérico.

Princípios:

1. **Agora primeiro.** O Início responde "onde eu deveria estar agora?".
2. **Azul é o evento, violeta é você.** Gradiente e azul marcam o evento e as ações. Violeta marca o que é da pessoa (pontos, nível, sua posição, Ada).
3. **Se parece botão, é botão.** Toque mínimo de 44 px. Nada clicável em `div`.
4. **O botão é o feedback.** A ação responde no lugar onde aconteceu, com um toast curto. Sem modal de sucesso.
5. **O essencial nunca some.** O crachá funciona offline e todo erro diz o próximo passo.
6. **Menos interface, melhor experiência.** Antes de adicionar, tentar tirar. "Muita info" foi a crítica mais repetida do time.

Reprovado nas rodadas (não repetir):

- Visual "tech/futurista" genérico (fonte Chakra Petch, grades, bordas neon).
- Remover cores, mascotes, ranking ou feed.
- Títulos alinhados à esquerda e colados no conteúdo.
- Cara de "vibecoding" no admin: ícones em círculo sobre cada título, botões fantasma em tudo.
- Metáfora de cordão/crachá físico no login.
- Saudação com data ("Bom dia, quinta 22").
- Bloco branco gigante atrás do QR.
- Excesso de chips e selos por cartão.

---

## 2. Cor

### 2.1 Base

| Token proposto | Hex | Uso |
|---|---|---|
| `--bg` | `#0A0F24` | fundo de todas as telas |
| `--surface` | `#121A36` | cartão |
| `--surface-raised` | `#1A2347` | elevado, trilho de barra de progresso, tile de ícone |
| `--surface-selected` | `#1F2A55` | aba ativa, botão secundário, toast |
| `--nav-bg` | `#0D1330` | barra de navegação inferior |
| `--border` | `#1C2548` / `#232D52` | divisórias e bordas de cartão |
| `--field-bg` | `#131B3A` | fundo de campo de formulário (borda `#26305A`, 1.5 px) |
| `--text` | `#EEF1FA` | texto principal |
| `--text-2` | `#A9B1CC` | texto de apoio |
| `--text-3` | `#8790AE` | rótulos, metadados |
| `--text-4` | `#6E779A` | hint, chevron (só texto pequeno não essencial) |

### 2.2 Marca

| Token | Valor | Uso |
|---|---|---|
| `--brand-gradient` | `linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)` | no máximo 1 destaque por tela (hero "Acontecendo agora", crachá, sua posição) e no botão principal |
| `--action` | `#3D50E6` | botão sólido de ação (secundário forte, CTA em cartão) |
| `--you` | `#7C3AED` | pontos, nível, sua linha no ranking, Ada |
| `--alan` | `#2563EB` → `#1E3A8A` | mascote Alan |
| `--ada` | `#9333EA` → `#4C1D95` | mascote Ada |
| `--link` | `#8FA0FF` | links e realce azul claro |
| traço de título | `linear-gradient(90deg, #2563EB, #9B7BFF)` | sublinhado 28×4 px dos títulos centralizados |

Pontos sempre aparecem num selo violeta (`rgba(124,58,237,0.22)` com texto `#D6CBFF`). Assim a pessoa aprende que violeta é dela.

### 2.3 Tipos de atividade

Só como ponto (7 a 9 px) ou faixa lateral de 3 a 4 px, **nunca como fundo inteiro**.

| Tipo | Cor |
|---|---|
| Palestra | `#8FA0FF` |
| Workshop | `#B9A6F5` |
| Minicurso | `#67D4E8` |
| Ativação | `#F2C46A` |
| Hackathon | `#F59AC0` |

### 2.4 Status

| Status | Cor | Exemplos |
|---|---|---|
| sucesso / agora | `#6FD8A6` | Agora, Presença confirmada, Visitado, Vincular feito |
| aviso / prazo | `#F2C46A` | Lista de espera, banner "Ingresso não vinculado", conexão lenta |
| erro | `#F59A9A` | erro de campo, Sair da conta, Lotado no semáforo |
| neutro | `#8790AE` | Encerrada |
| reservado | `#8FA0FF` | Reservado, Inscrito |

### 2.5 Semáforo de vagas

| Luz | Cor | Rótulo |
|---|---|---|
| verde | `#6FD8A6` | "Vagas livres" |
| amarelo | `#FBBF24` | "Últimas N" |
| vermelho | `#F59A9A` | "Lotado" |

Ponto de 8 px com halo + uma palavra, sem números grandes. Só aparece para quem **ainda não tem vaga**. Some quando a pessoa já está inscrita, já reservou ou a atividade já passou. O limite do amarelo está pendente (seção 12).

### 2.6 Cotas de patrocínio (Diamante, Ouro, Prata)

| Cota | Faixa / gradiente | Borda | Texto |
|---|---|---|---|
| Diamante | `#22D3EE → #A78BFA → #F0ABFC` | `rgba(34,211,238,0.6)` | `#67E8F9` |
| Ouro | `#FDE68A → #FBBF24 → #D97706` | `rgba(251,191,36,0.6)` | `#FBBF24` |
| Prata | `#E2E8F0 → #94A3B8` | `rgba(203,213,225,0.2)` | `#CBD5E1` |

- **Passaporte:** a cota se percebe pela estrutura, e a cor só reforça:
  - Diamante é um cartão grande com o logo em destaque;
  - Ouro é um cartão médio em linha;
  - Prata é uma lista compacta num cartão só.
- **Diamante e Ouro no passaporte:** brilho em volta e um reflexo que passa pelo card a cada 6 s.
- **Feed:** post de patrocinador Diamante ou Ouro ganha um card levemente tingido na cor da cota (gradiente a 10–12% + borda), com o selo da cota. Prata fica no card normal.

### 2.7 Pódio e medalhas (cores da develop)

| Posição | Cor | Ícone |
|---|---|---|
| 1º | `#FBBF24` | coroa |
| 2º | `#94A3B8` | `Medal` do lucide, com o "2" no lugar do "1" original |
| 3º | `#B45309` (texto e ícone `#D97706` para ter contraste) | `Award` do lucide, com um "3" dentro |
| 4º e 5º | — | selo redondo `#2A3570→#1A2347` com borda `#8FA0FF80` e texto "4º"/"5º" |
| 6º em diante | — | "6º" em texto cinza |

### 2.8 Papéis (Trocar de conta)

| Papel | Cor |
|---|---|
| Participante | `#A78BFA` |
| Staff | `#67D4E8` |
| Patrocinador | `#FBBF24` |
| Admin | `#F59AC0` |

### 2.9 Missões

- **Dourado da develop:** `#F59E0B` no relâmpago e na Caça ao QR.
- **Missão Secreta:** fundo `#1D1347 → #0E0B26`, borda `rgba(167,139,250,0.45)`, botão `#7C3AED → #A855F7`.

---

## 3. Tipografia

- **Fonte única: Montserrat.** Não usar Inter, Space Grotesk, JetBrains Mono nem Chakra Petch.
- **Escala:**

  | Uso | Tamanho / peso |
  |---|---|
  | Saudação | 21–32 / 800 |
  | Título de tela | 20–22 / 800 |
  | Título de cartão | 15–19 / 700–800 |
  | Texto | 14–15 / 400–600 |
  | Apoio | 13 |
  | Piso | 12, só em rótulo curto |

- Números com largura fixa (`font-variant-numeric: tabular-nums`). Sem caixa alta espaçada.
- **Título de tela:** centralizado, com o traço de gradiente 28×4 px logo abaixo e respiro antes do conteúdo (mínimo 22 px). Vale também no admin no celular.
- **Exceção:** o Início usa o header "Olá, Fabio" (ícone, saudação, sino com contador e avatar). Ele aparece tanto no Início ativado quanto no de primeiros passos.

---

## 4. Espaço, forma e elevação

- **Margem lateral:** 20 px no celular. Desktop do admin com 32 px de padding no conteúdo.
- **Espaçamento:** entre blocos 12–24 px; entre cartões de lista 10–12 px.
- **Cantos:**
  - 10–12 nos controles (campos, chips, botões pequenos);
  - 14–16 nos botões grandes;
  - 16–20 nos cartões;
  - 24–28 nos painéis e bottom sheets;
  - avatares e pills totalmente redondos.
- **Elevação:** só em sobreposição (toast, sheet, cartão Diamante e Ouro, hero). Cartão comum não tem sombra.
- **Profundidade:** vem da superfície (`--surface` → `--surface-raised` → `--surface-selected`), não de borda grossa.

---

## 5. Layout e navegação (participante)

- **Barra inferior com 5 abas:** Início · Agenda · **Crachá** (botão central redondo com gradiente, 52 px) · Feed · Conquistas.
- **Perfil** abre pelo avatar no header do Início.
- **Conquistas** tem as abas Missões · Ranking · Passaporte, nessa ordem.
- **Agenda** tem as abas Programação · Minha agenda, com a contagem ("Minha agenda · 5").
- **Crachá** tem as abas **Escanear · Meu QR**, nessa ordem. O botão central abre em Meu QR.
- **Telas longas rolam por dentro do aparelho:** a barra fica fixa embaixo e o conteúdo rola atrás dela.
- **Sem ingresso Sympla vinculado:**
  - Início: vira o checklist de "Primeiros passos" (3 passos);
  - demais telas: bloco dourado fixo no topo, "Ingresso não vinculado · Sem ele você não reserva vagas nem pontua · Vincular";
  - Crachá: QR borrado com cadeado e o botão "Vincular ingresso".
- **Faltando só o passo 3 (instalar o app):** o Início já aparece completo, como autenticado, com um card único "Primeiros passos · falta 1 · Instale o app" logo abaixo do "Acontecendo agora".

---

## 6. Componentes e padrões

### Botões

| Variante | Visual |
|---|---|
| Principal | gradiente `#2563EB → #5B3BE0 → #7C3AED`, altura 52–54, raio 14–16, Montserrat 15–16/800 |
| Ação sólida | `#3D50E6` (CTAs dentro de cartão, admin) |
| Secundário | `#1F2A55` |
| Sobre gradiente | branco com texto `#3730A3` |
| Destrutivo | texto `#F59A9A` sobre fundo neutro ou leve |

- Ao tocar, o botão afunda (`scale(.97)` em 100 ms).
- Estados: padrão, "Reservando" (spinner, mesma largura) e sucesso ("Vaga garantida" em verde claro).

### Campos

- Rótulo em cima (13/700 `#A9B1CC`), sempre ligado ao campo com `for`/`id`.
- Campo com altura 48–56, raio 12–16, fundo `#131B3A` e borda `#26305A` de 1.5 px.
- Foco: borda na cor de destaque com halo de 4 px.
- Erro: borda `#F59A9A`, mensagem embaixo dizendo como corrigir, mais `aria-invalid`.
- **Redes sociais:** tile com o logo real da rede + prefixo fixo (`linkedin.com/in/`, `@`, `github.com/`) + check verde quando é válido.
- **Usuário:** "@" + validação na hora ("✓ disponível").
- **Seletor:** `select` nativo estilizado com chevron (curso, período, "Você vem como").
- **Toggle:** 44–48 × 26–28, ligado em `#3D50E6`/`#5B3BE0`.

### Cartão de atividade (Agenda e Minha agenda)

- Linha do tempo: hora à esquerda (52 px) e trilho vertical.
- O cartão tem faixa lateral de 4 px na cor do tipo, rótulo do tipo, título, palestrante e local com ícones.
- Rodapé: **seu status** à esquerda e o **semáforo** à direita (ou só o chevron).
- A atividade "agora" ganha fundo `#161F45` e borda `#3D4BB0`. A que já passou fica com opacidade 0.6.
- **Sem barra de progresso de vagas.** Foi pedido explícito do time.

### Busca e filtros (Programação e Minha agenda)

- Busca em pílula.
- Chips de dia: o selecionado tem gradiente. Na Minha agenda o primeiro chip é "Todos os dias".
- Chips de tipo: o selecionado é branco; os outros têm o ponto da cor do tipo.

### "A seguir" (Início): tira enxuta

- Cartões de 236 px com arrasto lateral e pontinhos de paginação.
- Cada cartão traz hora grande (22/800), "dia · tipo" na cor do tipo e título em até 2 linhas.
- Fundo com um leve gradiente da cor do tipo.
- O status vira ícone no canto: ✓ para reservado, relógio dourado para lista de espera.

### Pontos, progresso e nível

- Selo violeta "+N pts".
- Barra de 8 px com trilho `#1A2347` e preenchimento `#2563EB → #7C3AED/#9B7BFF`.
- Nível em pílula violeta ("Nível 3 · Conectado").

### Toast

- Fundo `#1F2A55` com ícone redondo (verde no sucesso, violeta com "+N" nos pontos) e uma ação ("Desfazer", "Ver").
- Sobe 12 px com fade em 220 ms acima da barra e some em 4 s.
- Erro usa `role="alert"` e fica até ser fechado.

### Bottom sheet

- Raio de 24–26 no topo, alça de 36×4.
- O fundo escurece (`rgba(5,8,20,0.6)`).
- Usado em Instalar o app, Presença confirmada e Atividade.

### Primeiros passos

- Cartão com borda de gradiente e o Alan espiando.
- Mostra "Primeiros passos · N de 3" e uma barra.
- Cada passo tem círculo numerado ou check, título e uma frase. Só o passo atual tem botão.

### Missões (Conquistas)

- **Topo:** resumo com anel de progresso ("1 de 7 missões feitas · +10 pts até agora · 215 pts em jogo").
- **Relâmpago:** dourado contido, só em pontos de destaque.
  - cartão normal (`#121A36`) com borda dourada fraca (`rgba(245,158,11,0.28)`);
  - ícone do raio num círculo dourado translúcido, pulsando, com uma onda em volta;
  - barra de tempo dourada de 4 px esvaziando;
  - botão "Participar" no azul de ação padrão (`#3D50E6`);
  - sem reflexo nem brilho.
- **Cartão de missão:** ícone (44) + título + descrição em cima. Embaixo, uma linha com pontos e metadados à esquerda e o botão à direita.
- **Seções:** "Disponíveis" e "Feitas". A feita fica com opacidade 0.75 e o selo "✓ Feita".
- **Estilos de cartão**, escolhidos pelo admin:

  | Estilo | Visual |
  |---|---|
  | **Padrão** | cartão simples |
  | **Secreta** | fundo roxo escuro com pontilhado, "?" grande flutuando, 3 brilhinhos piscando e dica borrada (`filter: blur`) |
  | **Caça ao QR** | radar dourado girando no ícone e prazo ("termina às 18h") |
  | **Relâmpago** | tempo correndo (como acima) |
  | **Patrocinador** | logo real e cor da cota |
  | **Quiz** | "N perguntas · N min" |
  | **Stories** | anel do Instagram no ícone |

### Ranking

- Pódio desenhado com 3 colunas (2º, 1º, 3º) nas cores da seção 2.7, coroa e medalhas da develop.
- Lista em cartões com avatar de iniciais.
- A sua linha fica destacada em violeta.
- Rodapé fixo com a sua posição e o que falta ("7 pts para passar @marina.s").

### Passaporte

- Cartão de topo:
  - "3/5 estandes visitados";
  - barra com um segmento por estande, na cor da cota;
  - "Concorrendo aos sorteios" e "Bilhete Dourado: faltam N · +100";
  - a Ada num espaço só dela.
- Depois, blocos Diamante, Ouro e Prata (seção 2.6). Cada estande mostra "Visitado · data" ou "Ainda não visitado · +50 pts".

### Perfil

- **Fundo atrás da foto:** arte fixa e não editável, para não parecer foto de capa. Leva:
  - o gradiente da marca;
  - quadradinhos no estilo dos mascotes;
  - o símbolo da Tech Week em marca d'água;
  - Alan e Ada nos cantos.
- Avatar 96, nome, "@usuário · curso, período" e nível.
- Números: pontos, posição no ranking e estandes.
- Linhas separadas, cada uma com ícone e cor próprios:
  - Ingresso Sympla (selo Ativo ou Vincular);
  - Redes sociais;
  - Privacidade e dados.
- **Trocar de conta:** lista com uma cor por papel (seção 2.8), faixa lateral e "em uso" no atual. Só aparecem os papéis que a conta tem.
- "Sair da conta" fica no fim.

### Editar perfil

Formulário próprio (tela `1.34`):

- foto, com Trocar e Remover;
- Sobre você: nome, sobrenome, usuário, curso, período e "Você vem como";
- Redes no crachá;
- Privacidade: um toggle e o e-mail só para leitura;
- "Salvar alterações" fixo no rodapé.

### Crachá

- **Meu QR:** cartão escuro com o logo, chip do vínculo, avatar, nome, @ e curso. O QR fica sobre uma placa clara pequena, não um bloco branco gigante. Embaixo, "Ingresso Sympla vinculado", ID e pontos.
- **Escanear:** área da câmera com moldura de gradiente e lanterna, mais a lista "O que dá para escanear" com os pontos de cada tipo.
- **Conexão feita:** cartão com a pessoa, as redes como botões coloridos e a missão concluída pela Ada.

### Feed

- Filtros: Todos, Organização e Patrocinadores.
- **"Publicação em destaque"** (ícone estrela) no topo: post da organização com selo de verificado.
- Destaque por cota para patrocinadores (seção 2.6).
- Curtir com coração rosa e contagem otimista.

### Conta Staff e Admin

- Tela "Sua conta" (`3.07` e `2.15`):
  - cartão da pessoa com "Você está como Staff/Admin" na cor do papel;
  - Editar perfil;
  - Trocar de conta;
  - Sair.
- **Staff no celular:** avatar no topo da Portaria. **Staff no desktop:** chip "Nome · Staff · trocar conta".
- **Admin no celular:** avatar no topo e o botão "Mais" da barra levam para a conta. **Admin no desktop:** o bloco do usuário na lateral ganha "Perfil" e "Trocar conta".

### Admin · Nova missão

Telas `2.06` e `2.14`:

- seletor visual "Estilo do card" com os 7 estilos;
- informações: título, descrição, como completa e pontos;
- opções do estilo escolhido (na Secreta: palavra-chave, dica borrada e brilhos animados);
- período de disponibilidade;
- **prévia ao vivo** do card igual à do participante.

### Estados vazios e erros

- Mascote explicando o que fazer, uma frase e um botão.
- Esqueleto com brilho, nunca spinner em tela cheia (exceto a abertura).
- Linha do tempo de uma requisição:

  | Tempo | O que aparece |
  |---|---|
  | 0–300 ms | nada |
  | 300 ms | esqueleto |
  | 8 s | "Conexão lenta" + dados salvos |
  | 15 s | erro com "Tentar de novo" |
  | depois | tentativas automáticas em 3, 6, 12 e 30 s |

- Nunca culpar a pessoa. O código técnico fica pequeno, no rodapé.

### Telão (admin)

- 1920×1080: atividade atual, 3 passos e o QR grande.
- **O QR é fixo da atividade.** Não troca a cada 30 s (decisão do Fabio, 2026-10-04).
- Embaixo do QR: "Leia antes de sair da sala" e a contagem de presenças.

---

## 7. Inventário de telas (canvas)

| Faixa | Página | Conteúdo |
|---|---|---|
| `0.01–0.03` | Visão geral | Capa, Design System, Interações e notificações |
| `1.01–1.09` | Participante · entrada | Login, Esqueci a senha, Link enviado, Cadastro 1 e 2, Onboarding 1–4 |
| `1.10–1.18` | Participante · sem ingresso | Primeiros passos, Vincular ingresso, Instalar o app, Início faltando instalar, Crachá/Agenda/Feed/Conquistas/Perfil sem ingresso |
| `1.19–1.28` | Participante · uso | Início, Avisos, Agenda (Programação), Minha agenda, Minha agenda vazia, Atividade, Presença confirmada, Escanear, Conexão feita, Meu QR |
| `1.29–1.34` | Participante · conquistas e perfil | Feed, Missões, Ranking, Passaporte, Perfil, Editar perfil |
| `2.01–2.07` | Admin desktop | Visão geral, Programação, Nova atividade, Participantes e papéis, Missões, Nova missão, Telão |
| `2.08–2.15` | Admin celular | Início, Programação, Nova atividade 1/2 e 2/2, Pessoas, Missões, Nova missão, Sua conta |
| `3.01–3.08` | Staff | Escolher atividade, Leitor, Entrada liberada, Não inscrito, Já entrou, Câmera bloqueada, Sua conta, Desktop/tablet |
| `4.01–4.11` | Estados e falhas | Regras, Abertura, Carregando, Conexão lenta, Offline (crachá, leitura guardada), Servidor, Ação falhou, Sessão expirada, Página não encontrada, Manutenção |

Ainda não existe no design: telas do **Patrocinador** (vão ser refeitas do zero) e **Bilhete Dourado** (momento de recompensa).

---

## 8. Mascotes (Alan e Ada)

- **SVG original do código**, nunca redesenhar nem trocar por emoji ou ilustração genérica.
  - Alan: azul `#2563EB → #1E3A8A`.
  - Ada: roxa `#9333EA → #4C1D95`.
- **Nomes:** no código são Alan e Ada. Em algumas falas do time aparecem "Teko e Weeka"; a definição está pendente (seção 12).
- **Tamanhos:**

  | Tamanho | Uso |
  |---|---|
  | 28 | selo |
  | 44 | dica (balão "Ada: ...") |
  | 64–76 | momento |
  | 112–150 | entrada, onboarding e estados vazios |

- **Poses:** acenando, parado, cobrindo os olhos (falha do sistema). Ada perdida quando a página não existe.
- **Um momento de mascote por tela, sempre com função** (orientar, comemorar, explicar). No máximo um mascote animado por vez.
- **Animação:** piscar a cada ~4 s e flutuar 6 px em loop de 3 s. Loops só no onboarding, no login, na abertura e em estados vazios.

---

## 9. Movimento

Regra: **quanto mais rara e emocional a situação, mais pesada a animação. Quanto mais frequente, mais discreta.**

### Tokens

| Token | Valor | Uso |
|---|---|---|
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | tudo que entra |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | tudo que sai |
| `--spring` | `cubic-bezier(.34,1.56,.64,1)` | só mascotes e recompensas |
| `--dur-fast` | 150 ms | troca de aba, press, filtros |
| `--dur-base` | 220–380 ms | bottom sheet, toast, entrada de bloco |
| `--dur-slow` | 500–800 ms | entrada de tela com mascote, onboarding |
| `--dur-reward` | 900–1500 ms | presença, Bilhete Dourado, nível novo |

Entradas em sequência usam atraso de 80–150 ms entre elementos, no máximo 5 por tela.

### Pesadas (recompensa, raras)

- **Presença confirmada:**
  - a folha sobe e o mascote estoura com mola;
  - o check se desenha;
  - confete com 12 peças nas cores da marca e dos tipos;
  - "+pts" estoura e o cartão de nível pulsa.
- **Mesma família:** Bilhete Dourado, elegível aos sorteios, subiu de nível e missão relâmpago concluída.
- Nunca bloqueiam: o botão de seguir aparece em até 900 ms. Disparam uma vez só.

### Médias (feedback, ocasionais)

- **Onboarding:**
  - mascotes sobem e flutuam;
  - cartões entram pelos lados;
  - o pódio cresce na ordem 3º, 2º, 1º;
  - o carimbo bate;
  - uma linha de leitura passa no QR;
  - o indicador de etapa estica.
- **Outros:** carimbo no passaporte, leitura de QR, reservar vaga, mudança no ranking e vincular ingresso.
- **Missões:**
  - raio pulsando e barra de tempo no relâmpago;
  - brilhinhos e "?" flutuando na Secreta;
  - radar na Caça ao QR;
  - anel de progresso do resumo.
- **Passaporte:** reflexo nos cartões Diamante e Ouro.

### Suaves (navegação, frequentes)

- Aba da barra: só a cor e o ícone, em 150 ms.
- Abas internas: o sublinhado desliza e o conteúdo faz crossfade em 200 ms.
- Sheet 250 ms, toast 220/150 ms, press `scale(.97)` em 100 ms, curtir com pop de 200 ms, esqueleto com brilho de 1,5 s.

### Não animar

- Entrada de cada item de lista ao rolar.
- Fundos em movimento contínuo.
- Contadores que animam sem o valor ter mudado.
- Formulários além de foco, erro e envio.
- O banner de ingresso não vinculado.

### Regras técnicas

- Animar só `transform`, `opacity` e `stroke-dashoffset`.
- `@media (prefers-reduced-motion: reduce)` desliga tudo: o confete some e o resto fica no estado final.
- Elemento com rotação fixa usa a variável CSS `--r`, para a animação não sobrescrever a rotação.

---

## 10. Acessibilidade

- `lang="pt-BR"`. Zoom liberado: sem `user-scalable=no` nem `maximum-scale`.
- **Semântica:** clicável é `button` ou `a`. Abas com `role="tablist"`/`tab` e `aria-selected`. Diálogos com `role="dialog"`, `aria-modal` e `aria-labelledby`. Toggle com `role="switch"` e `aria-checked`.
- Todo campo tem `label` ligado. Erro com `aria-invalid` e `aria-describedby`.
- **Contraste:**
  - texto essencial no mínimo `#A9B1CC` sobre `#0A0F24`/`#121A36`;
  - `#6E779A` só em hint não essencial;
  - bronze do pódio em texto usa `#D97706`.
- **Toque:** mínimo de 44 px.
- **Foco:** visível em tudo (`:focus-visible` com halo).
- **Ícones:** decorativos com `aria-hidden`. Ícone que carrega informação ganha `aria-label` (medalha "2º lugar", semáforo, selo de cota).
- **Movimento:** `prefers-reduced-motion` respeitado em toda animação (seção 9).

---

## 11. Regra de estilo no código

Proposta do audit, a confirmar em ADR na implementação:

- tokens únicos no `:root` de `src/index.css`, espelhados no `@theme` do Tailwind;
- Tailwind para tudo que é novo e para toda tela tocada;
- shadcn/ui só para primitivos;
- CSS global só para shell, reset e keyframes;
- `style={{}}` só para valor dinâmico (cor vinda de dado, largura de barra).

Os hex deste documento viram tokens **antes** de qualquer tela ser migrada.

---

## 12. Regras de negócio que o design assume

Classificação conforme `docs/business-rules/README.md`. Nada aqui vira teste permanente nem regra no backend sem a confirmação indicada.

| Item | Status | Observação |
|---|---|---|
| Passaporte: Kanastra (Diamante) e Bayer (Ouro) obrigatórios, +50 por estande, Bilhete Dourado +100 com os 5, sorteio exige Kanastra + Bayer + 1 parceiro | OBSERVADA | vem do `PassportTab` atual |
| QR do telão fixo por atividade (sem troca a cada 30 s) | CONFIRMADA (Fabio, 2026-10-04, em conversa) | registrar no catálogo e checar se o backend gera token por atividade |
| Semáforo: amarelo com 30% ou menos de vagas livres, vermelho com 0 | INFERIDA | limite proposto, aguardando o Fabio |
| Semáforo some para quem já tem vaga | decisão de design | não é regra de negócio |
| Lista de espera mostrando a posição ("você é o 4º") | INFERIDA | depende de o backend expor a posição |
| Toggle "Mostrar minhas redes para quem escanear meu crachá" | NÃO DEFINIDA | não existe no código nem na doc; ligado ao LGPD (KAN-72) |
| Trocar de conta por papel (Participante, Staff, Patrocinador, Admin) | OBSERVADA (custom claims existem) + INFERIDA (a troca na interface) | a interface lista os papéis da conta; o papel efetivo continua vindo do servidor. **Interface não é autorização** (`security`) |
| Destaque no Feed por cota de patrocínio | decisão de design | precisa do campo de cota no post ou no autor (`backend`) |
| Estilos de missão escolhidos no admin (Secreta com palavra-chave e dica, prazo da Caça ao QR...) | decisão de design | precisa de campos novos no modelo de missão (`backend` e `architecture`) |
| Staff pode liberar quem não está inscrito? | NÃO DEFINIDA | pergunta aberta |
| Fila de leitura offline com horário original | PROPOSTA | depende de o backend aceitar leituras atrasadas |
| Nomes dos mascotes: Alan e Ada × Teko e Weeka | NÃO DEFINIDA | o código usa Alan e Ada |

---

## 13. Fazer / Não fazer

**Fazer:**

- reutilizar token e componente antes de criar;
- um destaque de gradiente por tela;
- cor de tipo só como ponto ou faixa;
- status curto e humano ("Vaga reservada", "Entrar na lista de espera");
- mascote com função;
- testar em 390 px e com reduced motion.

**Não fazer:**

- card dentro de card sem motivo;
- ícone em quadrado sobre cada título;
- chips empilhados em todo cartão;
- barra de progresso para tudo;
- texto em gradiente fora de título de destaque;
- fonte nova;
- emoji no lugar de ícone ou mascote;
- animação de entrada em lista;
- trocar o asset real (logos, mascotes) por placeholder.

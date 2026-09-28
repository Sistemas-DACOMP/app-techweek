# 🎨 FACOM TechWeek 2026 — Master Prompt & Especificação Completa para IA do Figma

> **Como utilizar este arquivo:**  
> Copie e cole os blocos abaixo diretamente no **Figma AI**, **Figma Make Designs**, **Galileo AI**, **v0.dev** ou **Claude 3.7 / GPT-4o** para gerar mockups em alta fidelidade (Hi-Fi), protótipos interativos e telas refinadas para o aplicativo oficial do evento.

---

## 📌 1. Visão Geral do Produto e Persona

* **Nome do Produto:** FACOM TechWeek 2026 Mobile PWA
* **Organização:** Faculdade de Computação (FACOM) - Universidade Federal de Uberlândia (UFU) & DACOMP
* **Tipo de Aplicação:** Progressive Web App (PWA) Mobile-First otimizado para iOS e Android
* **Público-Alvo:** 
  1. Estudantes de Ciência da Computação, Sistemas de Informação, Engenharia e áreas de tecnologia.
  2. Professores, pesquisadores, palestrantes convidados e profissionais da indústria.
  3. Recrutadores e representantes de empresas patrocinadoras de tecnologia (ex: Sankhya, LayerX, Neospace).
  4. Equipe de organização e Staff de credenciamento.
* **Propósito Principal:**  
  Centralizar a experiência presencial do maior evento de computação da região: consulta de agenda em tempo real, reserva e check-in de palestras/workshops, gamificação competitiva com pontuação e ranking ao vivo, crachá digital interativo e conexão de carreira com empresas patrocinadoras.

---

## 📐 2. Diretrizes de Layout e Grid (Canvas Mobile)

* **Viewport Padrão:** `390px x 844px` (iPhone 14/15/16) ou `430px x 932px` (iPhone Pro Max / Android Moderno).
* **Grid do Sistema:** 4 colunas com margens laterais de `16px` e espaçamento entre colunas (*gutter*) de `12px`.
* **Safe Area Superior:** Margem mínima de `48px` para abrigar a Dynamic Island / Notch de câmera.
* **Safe Area Inferior:** Margem de `34px` (barra de gestos do iOS e barra de navegação do Android).
* **Alvos de Toque (Touch Targets):** Mínimo estrito de `48px x 48px` para todos os botões e abas navegáveis.
* **Header Superior Fixo:** Altura de `64px`, fundo `#07090E` com opacidade 90% e blur sutil de 8px, borda inferior `1px solid #1E293B`.
* **Bottom Navigation Ancorada:** Altura de `68px` + Safe Area inferior, fundo sólido `#0B0F17`, borda superior `1px solid #1E293B`.

---

## 🎨 3. Design System & Tokens Visuais ("Utility-First Dark Theme")

Adeus estética de "vibecoding" amador (sem excesso de blur, sem luzes neon saturadas que cansam a vista, sem emojis como ícones). O app adota um **Utility-First Dark Theme** técnico, refinado, sóbrio e com contraste estrito **WCAG AA (> 5:1)**.

### 3.1. Superfícies & Cores de Fundo
* **Canvas de Fundo (`--background`):** `#07090E` (preto frio e profundo, sem reflexos).
* **Superfície dos Cards (`--card`):** `#0F141F` com borda sutil nítida `1px solid #1E293B`.
* **Superfície Elevada / Modais / Popovers (`--popover`):** `#151C2C` com borda `1px solid #28354D`.
* **Barra de Navegação Inferior (`--nav-bg`):** `#0B0F17`.
* **Sombras Dimensionais:** `box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5)` (elevação limpa sem contornos radioativos).
* **Anel de Foco / Seleção Ativa:** `ring-1 ring-blue-500/30` ou `box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.3)`.

### 3.2. Cores Funcionais & Ação
* **Ação Primária:** `#2563EB` (Azul Tech Corporativo), com hover `#1D4ED8`.
* **Texto Primário:** `#F8FAFC` (Slate 50 — contraste > 12:1 sobre o fundo).
* **Texto Secundário / Labels:** `#94A3B8` (Slate 400 — contraste > 4.5:1).
* **Texto Muted / Metadados:** `#64748B` (Slate 500).

### 3.3. Categorias de Atividades (Identificação Lateral de 3.5px e Tags)
* 🎤 **Palestras:** Accent `#38BDF8` | Fundo da Tag `#0C2B40` | Texto `#7DD3FC` | Borda `#0369A1`
* 💻 **Minicursos:** Accent `#A855F7` | Fundo da Tag `#2E1065` | Texto `#D8B4FE` | Borda `#6B21A8`
* 🛠️ **Workshops:** Accent `#F59E0B` | Fundo da Tag `#451A03` | Texto `#FCD34D` | Borda `#B45309`
* 🏢 **Ativações / Feira de Estandes:** Accent `#10B981` | Fundo da Tag `#064E3B` | Texto `#6EE7B7` | Borda `#047857`

### 3.4. Estados de Presença do Participante
* **Não Inscrito (`NONE`):** Botão azul primário `#2563EB` com texto "Reservar".
* **Inscrito / Reservado (`BOOKED`):** Tag sólida cinza azulada `#1E293B`, texto azul claro `#60A5FA` com ícone de bookmark.
* **Entrada Validada (`CHECKED_IN`):** Tag âmbar sólida `#451A03`, texto amarelo dourado `#FCD34D`, ícone de relógio e botão de ação secundário "Validar Telão".
* **Presença Concluída (`COMPLETED`):** Tag esmeralda `#064E3B`, texto verde menta `#6EE7B7`, ícone de check circular.
* **Fila de Espera (`WAITING_LIST`):** Tag violeta `#2E1065`, texto `#D8B4FE`.

### 3.5. Tipografia
* **Títulos Display, Números e Cabeçalhos:** **Montserrat** (pesos 700 e 800) com `letter-spacing: -0.02em`.
* **Corpo de Texto, Descrições e Metadados:** **Inter** ou **Plus Jakarta Sans** (pesos 400, 500 e 600).
* **Horários e Pontuações:** OBRIGATÓRIO `tabular-nums` (`font-variant-numeric: tabular-nums`) para evitar tremor e deslocamento em renderizações.

### 3.6. Ícones
* **Biblioteca:** **Lucide Icons** com espessura de traço consistente (`stroke-width: 1.75`), dimensões de 14px a 20px. Sem uso de emojis como marcadores estruturais.

### 3.7. Identidade dos Mascotes Oficiais: Alan & Ada
* **Alan (Mascote Azul):** Robô amigável inspirado em Alan Turing, formato arredondado, fones de ouvido tech, interações atentas.
* **Ada (Mascote Roxa):** Robô companheira inspirada em Ada Lovelace, display digital expressivo, acolhedora.
* **Papel no App:** Devem ser usados com propósito funcional — ilustração em tela de boas-vindas/onboarding, feedback de sucesso ao escanear presença ou como Empty State carismático em listas vazias.

---

## 📱 4. Arquitetura das Telas Principais

```
[Fluxo de Acesso]
Splash Screen ➔ Onboarding Interativo ➔ Login / Cadastro ➔ [App Principal]

[App Principal - 5 Abas Fixas]
├── 1. Agenda / Início (Dashboard de Palestras & Minha Programação)
├── 2. Ranking (Gamificação ao Vivo & Pódio dos Top 3)
├── 3. Escanear (Scanner de Presença & QR Code do Telão)
├── 4. Missões (Desafios, Estandes & Stories do Instagram)
└── 5. Perfil (Crachá Digital do Participante & QR Code Pessoal)
```

---

## 🖥️ 5. Especificação Detalhada por Tela (Pronta para Prompt do Figma)

---

### TELA 1: Início & Agenda de Atividades (`Dashboard.jsx`)
* **Objetivo:** Permitir ao participante navegar pela programação do evento, filtrar por dias e trilhas, reservar vagas e acompanhar atividades inscritas.
* **Componentes Chave:**
  1. **Top Bar:** Logo vetorial da FACOM TechWeek à esquerda; sino de notificações com indicador numérico de alertas não lidos à direita; miniatura do avatar do usuário com borda fina.
  2. **Banner de Aviso Urgente:** Card com fundo `#151C2C`, borda âmbar sutil, ícone de megofone/alerta e mensagem da organização (ex: "Palestra Magna transferida para o Anfiteatro 5R").
  3. **Hero de Saudação:** Texto "Olá, Samuel!" (Montserrat 700, 20px) acompanhado de status de presença rápida no evento.
  4. **Segmented Control Principal (Abas):** 
     - [Aba 1: "Todas as Atividades"]
     - [Aba 2: "Minha Agenda" (com contador numérico)]
  5. **Filtro de Dias (Carrossel Horizontal de Pílulas):**
     - Botões compactos: "Todos", "Seg 19/10", "Ter 20/10", "Qua 21/10", "Qui 22/10", "Sex 23/10". Estado ativo com fundo azul `#2563EB` e texto branco.
  6. **Filtro de Categorias (Chips):**
     - Palestras, Minicursos, Workshops, Ativações.
  7. **Card de Atividade da Agenda (`EventCard.jsx`):**
     - Dimensão: Largura total (358px no iPhone), padding `12px 14px`, fundo sólido `#0F141F`, borda `#1E293B`, borda arredondada `14px`.
     - Barra de cor lateral de `3.5px` à esquerda conforme a categoria.
     - **Coluna Esquerda (Horário):** Bloco escuro `#0B0F17`, horário de início `19:00` em destaque tabular, dia `19/10` em cinza, badge numérico de pontos `+25 pts` com ícone Sparkles.
     - **Coluna Direita (Conteúdo):** Tag da categoria + Tag do status do usuário, título da palestra em Montserrat 700 (14px), palestrante com ícone `User`, local (ex: "Anfiteatro 5R") com ícone `MapPin`.
     - **Rodapé do Card:** Contador de vagas restantes ("42 vagas") e botão de ação ergonômico ("Reservar", "Validar Telão" ou indicador "Inscrito").
  8. **Empty State de Minha Agenda:** Quando o usuário não tem atividades salvas, exibe os mascotes Alan & Ada com a mensagem: "Nenhuma atividade na sua agenda ainda. Explore a grade e garanta sua vaga!" com botão "Ver Grade Completa".

---

### TELA 2: Modal de Detalhes da Atividade (`ActivityModal.jsx`)
* **Objetivo:** Exibir a descrição completa de uma palestra/workshop com bio do palestrante e ações de inscrição.
* **Componentes Chave:**
  1. **Sheet Modal Bottom:** Ancorado no rodapé com topo arredondado (raio 24px), fundo `#151C2C`, indicador de arraste no topo (*drag handle* cinza).
  2. **Header do Modal:** Barra lateral de cor da categoria, título grande em Montserrat (18px), badges de categoria e horário.
  3. **Card do Palestrante:** Avatar redondo de 48px, nome em negrito, cargo/empresa (ex: "Senior Cloud Architect - Google") e link do LinkedIn/GitHub.
  4. **Corpo do Texto:** Sinopse da atividade em Inter (14px, lineHeight 1.5, cor `#94A3B8`).
  5. **Metadados em Grid:** Local da sala com mapa esquemático simplificado, carga horária, pontos concedidos na gamificação e total de vagas.
  6. **Botão Fixo de Ação Inferior:** Botão largo de altura 50px ("Garantir Minha Vaga" ou "Cancelar Reserva" com confirmação de segurança).

---

### TELA 3: Gamificação & Ranking ao Vivo (`Ranking.jsx`)
* **Objetivo:** Estimular a participação e engajamento dos alunos nas atividades através de um leaderboard em tempo real.
* **Componentes Chave:**
  1. **Header da Gamificação:** Título "Ranking da TechWeek", descrição das regras e pontuação acumulada.
  2. **Pódio dos Top 3 (Destaque Visual):**
     - Estrutura de pódio de conferência com 3 colunas:
       - 1º Lugar (Centro, mais alto): Avatar de 64px com coroa dourada, anel dourado `#F59E0B`, nome do aluno, 1.250 pts.
       - 2º Lugar (Esquerda): Avatar de 52px, medalha prateada `#94A3B8`, nome, 980 pts.
       - 3º Lugar (Direita): Avatar de 52px, medalha bronze `#D97706`, nome, 840 pts.
  3. **Card Fixo "Minha Posição":** Barra destacada no topo ou rodapé com fundo `#1E293B`, anel fino azul, mostrando a posição atual do participante logado (ex: "#14 Você - 620 pts") e a pontuação necessária para alcançar o próximo nível.
  4. **Lista do Ranking (4º ao 50º lugar):**
     - Linhas compactas (altura 56px), fundo `#0F141F`, número da posição tabular em destaque, avatar circular de 36px, nome completo do aluno, nível do perfil ("Explorer", "Hacker", "Master") e total de pontos em Montserrat 700.

---

### TELA 4: Escanear Presença & Validação (`Scanner.jsx` & `LectureScanner.jsx`)
* **Objetivo:** Permitir a leitura rápida de QR Codes de presença em palestras, telões de checkout duplo e estandes de parceiros.
* **Componentes Chave:**
  1. **Visor da Câmera:** Retângulo central com cantos arredondados iluminados e mira vetorial nos 4 cantos (`#38BDF8`), efeito de linha de escaneamento suave (*scanline* sutil animada).
  2. **Seletor de Modo / Câmera:** Botão flutuante para alternar câmera traseira/frontal e botão de ligar lanterna (*flashlight*).
  3. **Instrução de Contexto:** Caixa de texto inferior explicando: "Aponte sua câmera para o QR Code exibido no telão do anfiteatro para confirmar sua presença".
  4. **Modal de Sucesso de Check-in:**
     - Pop-up com fundo `#151C2C`, animação de confetes sóbria, mascotes Alan & Ada comemorando com um sinal de positivo.
     - Texto de celebração: "Presença Confirmada!" (Montserrat 18px), atividade: "Inteligência Artificial Generativa no Mundo Real", pontuação recebida: `+30 Pontos Adicionados`.
     - Botão de fechar e voltar para a agenda.

---

### TELA 5: Missões & Conexão com Patrocinadores (`Challenges.jsx` & `Sponsor.jsx`)
* **Objetivo:** Desafiar os participantes a interagir com os estandes dos patrocinadores, participar de quizzes e publicar nas redes sociais.
* **Componentes Chave:**
  1. **Progresso de Missões:** Barra de progresso circular ou linear ("5 de 8 missões concluídas - 62%").
  2. **Lista de Cards de Missões:**
     - **Missão Estandes:** "Visite o estande da Sankhya e converse com um recrutador" (Recompensa: +40 pts, Botão: "Escanear QR no Estande").
     - **Missão Stories Instagram:** "Compartilhe seu crachá com a hashtag #FACOMTechWeek2026" (Botão: "Gerar Story do Mascote").
     - **Missão Palestra Magna:** "Participe de 3 palestras no primeiro dia".
  3. **Estandes Patrocinadores (`Sponsor.jsx`):**
     - Grid com logos das empresas em superfície `#0F141F`, descrição resumida da empresa, benefícios para estudantes, vagas de estágio e botão dedicado **WhatsApp direto com o recrutador da empresa** com mensagem pré-formatada.

---

### TELA 6: Perfil & Crachá Digital do Participante (`Profile.jsx`)
* **Objetivo:** Servir como a identidade oficial do estudante durante a TechWeek, permitindo troca de contatos e controle pessoal.
* **Componentes Chave:**
  1. **Crachá Digital Interativo (Conference Badge):**
     - Formato retangular inspirado em crachá de conferência internacional (lanyard hole estilizado no topo).
     - Fundo escuro texturizado com malha isométrica sutil e logotipo FACOM TechWeek em relevo.
     - Foto de perfil do aluno em alta resolução (com botão de recortar/trocar avatar).
     - Nome completo do participante em Montserrat 700 e curso/universidade ("Ciência da Computação - UFU").
     - Tipo de Ingresso: Tag "Participante", "Palestrante" ou "Staff".
     - **QR Code Pessoal Único:** Centralizado com fundo branco contrastante e cantos protegidos para leitura ultrarrápida pelos staffs e recrutadores.
  2. **Seletor de Mascote Favorito:**
     - Toggle interativo entre Alan (Azul) e Ada (Roxa), personalizando o crachá do usuário.
  3. **Estatísticas Pessoais:**
     - Grid 2x2 com cards de métricas: Pontos Totais (`640 pts`), Ranking Atual (`#12`), Atividades Concluídas (`7`), Missões (`4/6`).
  4. **Extrato de Pontuação:**
     - Histórico em formato timeline listando os pontos ganhos com horário e motivo.
  5. **Configurações e Logout:**
     - Botão para sincronização com ingresso do Sympla e botão de saída.

---

### TELA 7: Navegação Inferior Ancorada (`BottomNavigation.jsx`)
* **Objetivo:** Navegação primária por polegar com resposta instantânea e suporte nativo à Safe Area.
* **5 Abas de Navegação:**
  1. 🗓️ **Agenda:** Ícone `CalendarDays` (Lucide 20px) — Rota `/`
  2. 🏆 **Ranking:** Ícone `Trophy` (Lucide 20px) — Rota `/ranking`
  3. 📷 **Escanear (Ação de Destaque):** Ícone `ScanLine` (Lucide 22px, tamanho proeminente) — Rota `/scanner`
  4. 🎯 **Missões:** Ícone `Target` (Lucide 20px) — Rota `/challenges`
  5. 👤 **Perfil:** Ícone `User` (Lucide 20px) — Rota `/profile`
* **Especificação do Estado Ativo:**
  - Linha superior de destaque fina de 2px em `#38BDF8`.
  - Ícone em `#F8FAFC`, rótulo em Inter 10px negrito em `#F8FAFC`.
  - Fundo sutil da aba `rgba(30, 41, 59, 0.5)`. Sem luzes neon desfocadas no fundo.

---

## 🚀 6. Prompt Direto Pronto para Copiar e Colar na IA do Figma

> **Instrução para a IA do Figma:** Copie o texto dentro da caixa de código abaixo e cole no campo de prompt do Figma AI / Make Designs:

```text
Design a professional, high-fidelity mobile PWA for a premier University Tech Conference called "FACOM TechWeek 2026". 

Design Guidelines:
- Mobile Canvas: 390x844px (iPhone 14/15/16) with 16px lateral padding and proper Safe Area insets (48px top, 34px bottom).
- Aesthetic: Utility-First Dark Theme (clean, high-contrast engineering UI, WCAG AA compliant). Strictly avoid amateur cyberpunk aesthetics, excessive blurry glassmorphism, and neon glows.
- Color Palette:
  * Canvas Background: #07090E (deep cold matte black)
  * Card Surfaces: #0F141F with crisp 1px solid #1E293B border
  * Popover / Modals: #151C2C
  * Primary Action: #2563EB with hover #1D4ED8
  * Primary Text: #F8FAFC (Slate 50)
  * Secondary Text: #94A3B8 (Slate 400)
  * Category Accents (used as 3.5px vertical left tabs): Lectures #38BDF8, Mini-courses #A855F7, Workshops #F59E0B, Sponsor Fair #10B981
- Typography:
  * Headings & Scores: Montserrat (Bold 700 / ExtraBold 800, letter-spacing: -0.02em)
  * Body & Details: Inter (Regular 400, Medium 500, SemiBold 600)
  * Tabular numbers on all times (e.g. 19:00 - 20:30) and point counts (+25 pts)
- Iconography: Lucide React vector icons with 1.75 stroke-width (no emojis as UI buttons).

Screens to Generate:
1. Home & Schedule Dashboard:
   - Fixed header with "FACOM TechWeek" logo, notification bell with unread badge, and circular user avatar.
   - Pinned urgent announcement banner in #151C2C with amber accent.
   - Two top tabs: "Todas as Atividades" and "Minha Agenda (3)".
   - Horizontal day selector pills ("Seg 19/10", "Ter 20/10", "Qua 21/10").
   - Schedule event cards: 3.5px category color bar on the left, left column with #0B0F17 background showing bold tabular time and "+25 pts" badge; right column with category tag, lecture title, speaker name, room location, seats counter, and an ergonomic "Reservar" action button.
   - Fixed anchored bottom navigation bar at #0B0F17 with 5 tabs: Agenda (active), Ranking, Escanear (highlighted QR scan icon), Missões, Perfil.

2. Live Gamification & Ranking:
   - Olympic-style top 3 podium: #1 Gold champion in the center with 64px avatar, crown, and 1,250 pts; #2 Silver on the left (980 pts); #3 Bronze on the right (840 pts).
   - Sticky "Your Position" card highlighting the current user's rank (#14 - 620 pts) with progress bar to the next tier.
   - Clean leaderboard list (4th to 20th place) with tabular rank numbers, avatars, student names, badge level, and score.

3. Digital Attendee Badge (Profile):
   - Modern conference lanyard badge mockup: matte black textured card with FACOM TechWeek branding.
   - High-res circular attendee photo, full name, major ("Ciência da Computação - UFU"), and "PARTICIPANTE" tag.
   - High-contrast square QR Code ready for check-in scanning by booth recruiters and conference staff.
   - 2x2 statistics grid (Total Points, Rank, Completed Talks, Missions Done).
   - Friendly robot mascots Alan (Blue) and Ada (Purple) featured in a mascot-picker selector.
```

---

## 🛠️ 7. Componentes de UI Recomendados para a Biblioteca do Figma

Para montar o Design System completo no Figma com Auto Layout e Variantes, crie os seguintes componentes mestres:

| Componente | Variantes / Propriedades | Descrição |
|---|---|---|
| `EventCard` | `Category` (Palestra, Minicurso, Workshop, Feira) × `Status` (None, Booked, CheckedIn, Completed, SoldOut) | Card compacto de evento com color tab lateral de 3.5px, horários tabulares e botão de ação |
| `Badge` | `Variant` (Category, Status, Level) × `Size` (sm, md) | Tag semântica sólida com ícone Lucide integrado e alto contraste WCAG AA |
| `BottomNav` | `ActiveTab` (Agenda, Ranking, Escanear, Missões, Perfil) | Barra de navegação móvel de 5 itens com Safe Area inferior e touch targets de 48px |
| `PodiumItem` | `Place` (1st_Gold, 2nd_Silver, 3rd_Bronze) | Elemento visual de destaque do Top 3 com medalha, coroa e avatar |
| `DigitalBadge` | `Role` (Participante, Palestrante, Staff, Patrocinador) × `Mascot` (Alan, Ada) | Crachá de conferência com QR Code e estatísticas do usuário |
| `Button` | `Variant` (Primary, Secondary, Amber, Danger, Ghost) × `State` (Default, Hover, Disabled, Loading) | Botões ergonômicos com altura de 44px a 48px e bordas arredondadas |
| `EmptyState` | `Context` (MinhaAgenda, Notificações, Missões) | Ilustração dos mascotes Alan & Ada com título e CTA principal |

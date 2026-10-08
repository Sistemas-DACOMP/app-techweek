# DESIGN-AUDIT.md - App TechWeek

Auditoria do Design System, 2026-10-03. Branch `develop`. Só leitura: nenhum código foi alterado.
Todas as contagens vêm de `grep`/script sobre `src/` (case-insensitive, `.jsx/.js/.css`), não de estimativa.

**Limites da auditoria (FATO):** não houve validação visual em browser nesta rodada. Tudo abaixo é leitura de código +
cálculo de contraste. Itens que dependem de render estão marcados como INFERÊNCIA/A VERIFICAR.

**Atualização 2026-10-04: redesign aprovado.** A direção visual foi desenhada, revisada pelo time e aprovada pelo Fabio no canvas de design.
O Design System resultante está em [`DESIGN.md`](DESIGN.md). Este arquivo segue como registro histórico da auditoria de 2026-10-03; o que mudou depois está na seção 0.
A implementação no código **ainda não começou**: as contagens abaixo continuam valendo para `src/`.

---

## 0. Evolução do redesign (2026-10-03 → 2026-10-04)

**Decisões da Fase 0 resolvidas:**

- **Fonte oficial:** só Montserrat. A Chakra Petch foi testada e reprovada ("tech/futurista demais").
- **Roxo:** é cor de marca com função, "violeta é você" (pontos, nível, sua posição, Ada).
- **Desktop:** o app de participante é mobile-first, com layout fixo de 390–430 px. Admin e Staff têm telas próprias de desktop **e** de celular.
- **Navegação:** Início · Agenda · Crachá (central) · Feed · Conquistas (Missões, Ranking, Passaporte), com o Perfil pelo avatar.

**Como foi o processo:**

- capturas reais da develop (`docs/redesign/screens/`, Playwright no emulador);
- proposta no canvas;
- comparação lado a lado com a develop;
- feedback da Sam e da Shay (preferiram os modelos atuais de Agenda, Crachá, Missões, Ranking e Passaporte, e pediram menos informação por tela);
- rodadas de ajuste do Fabio.

As páginas de comparação e de teste foram removidas do canvas depois da aprovação.

**Principais mudanças em relação ao app atual:**

- **Início:**
  - header "Olá, Nome" com sino e avatar;
  - hero "Acontecendo agora";
  - dica da Ada;
  - "A seguir" em tira enxuta;
  - "Sua jornada";
  - sem ingresso, vira o checklist de primeiros passos;
  - faltando só instalar o app, aparece um card único abaixo do hero.
- **Sem ingresso Sympla:** bloco dourado fixo no topo das outras telas e crachá bloqueado.
- **Agenda:**
  - linha do tempo sem barra de vagas;
  - semáforo de vagas só para quem não tem vaga;
  - Minha agenda com os mesmos filtros e estado vazio com o Alan.
- **Crachá:** abas Escanear · Meu QR, sem bloco branco gigante, e "Conexão feita" com as redes.
- **Conquistas:**
  - Missões com estilos por tipo (Secreta, Caça ao QR, Relâmpago, Patrocinador, Quiz, Stories) e resumo de progresso;
  - Ranking com o pódio nas cores da develop (coroa, `Medal` e `Award`) e selos no 4º e 5º;
  - Passaporte com a cota mostrada pela estrutura (Diamante grande, Ouro médio, Prata em lista) e efeitos leves.
- **Feed:** "Publicação em destaque" e destaque por cota de patrocínio.
- **Perfil:**
  - arte fixa atrás da foto, com Alan, Ada e o símbolo;
  - linhas separadas para ingresso, redes e privacidade;
  - Trocar de conta com uma cor por papel;
  - formulário de Editar perfil.
- **Admin e Staff:**
  - telas de desktop e celular;
  - tela "Sua conta" com editar perfil e trocar de conta;
  - Admin com "Nova missão", estilo de card e prévia ao vivo;
  - telão com QR fixo da atividade.
- **Estados e falhas:** abertura com mascotes, esqueleto, conexão lenta, offline, erros e manutenção, com uma linha do tempo de requisição definida.
- **Movimento:** hierarquia pesada, média e suave com tokens e `prefers-reduced-motion` (DESIGN.md §9).

**Pendências que continuam abertas:**

- Telas do Patrocinador (refazer do zero) e momento do Bilhete Dourado.
- Regras INFERIDA e NÃO DEFINIDA listadas em DESIGN.md §12: limite do semáforo, posição na lista de espera, toggle de redes no crachá, Staff liberando não inscrito, fila offline, nomes dos mascotes.
- Campos novos no backend: estilo e opções de missão, cota do autor no feed e posição na lista de espera.
- Implementação: seguir o roadmap da seção 5, adaptado. Primeiro os tokens do DESIGN.md §2–4 em `src/index.css`, depois os primitivos e só então as telas. Cada tela é validada com Playwright contra o canvas.
- Testes de fluxo com Playwright (`e2e/`): por enquanto só existem os scripts de captura.

---

## 1. Sumário executivo

O app tem uma identidade reconhecível (escuro, azul `#3b82f6`, Montserrat, mascotes), mas **ela não está no código como sistema**.
Está espalhada em ~2.170 hex soltos e ~1.880 `style={{` inline. Os tokens de `src/index.css` quase não são consumidos.

Números que resumem:

| Medida | Valor |
|---|---|
| Ocorrências de hex de 6 dígitos em `src/` | **2.168** (113 cores distintas) |
| Usos de `var(--...)` em `.jsx` | **96** (13 arquivos) |
| Ocorrências de `style={{` | **1.880**, em **35 arquivos `.jsx`** (não ~13) |
| Classes Tailwind de layout/cor/espaço em `.jsx` | **0 reais**. Só 53 matches, todos `animate-*` e `font-lastica` |
| Imports de `components/ui/button` ou `input` (shadcn) | **0** |
| `@media` em CSS | 11 (5 breakpoints distintos) |
| `prefers-reduced-motion` | **0** (33 `animation:` + 111 `transition:` + 19 `@keyframes`) |
| Famílias de fonte em uso | **4** (Montserrat, Inter, Space Grotesk, JetBrains Mono) |

Top problemas, em ordem de impacto:

1. **Paleta paralela fora dos tokens.** Os hex mais usados (`#1E293B`, `#94A3B8`, `#38BDF8`, `#F8FAFC`, `#F9FAFB`, `#374151`, `#0F141F`, `#64748B`, `#0B0F17`) não existem como token. `Admin.jsx` sozinho tem 745 hex.
2. **Tipografia fragmentada.** O `body` declara Montserrat, mas o código inline usa Inter (101x), Space Grotesk (95x) e JetBrains Mono (16x). Nenhuma está no `@theme`. 64 tamanhos de fonte distintos em 880 usos.
3. **Tailwind + shadcn instalados e não usados.** A segunda linguagem de estilo é só infraestrutura: nenhuma tela usa utilitário Tailwind, nenhum componente importa `ui/button` ou `ui/input`.
4. **A11y.** `user-scalable=no`/`maximum-scale=1` no viewport, `<html lang="en">` num app em português, 85 `<input>` com só 3 `htmlFor`, 13 `role="button"` em `div`, zero `prefers-reduced-motion`, texto de 0.65-0.74rem em volume (406 usos abaixo de 0.8rem), `#64748B` sobre `#1E293B` com contraste 3.07:1.
5. **Duplicação/dívida de config.** Tokens repetidos em `@theme` e `:root`; `App.css` é sobra do template Vite (não importado); `var(--primary-color)`, `var(--text-h)`, `var(--social-bg)` referenciam variáveis que **não existem**; `animate-scale-up` é usada 3x e não está definida em `src/`.

Veredito: não dá pra "pintar por cima". Antes de qualquer redesign visual, precisa de (a) tokens reais e (b) uma regra única de estilo.

---

## 2. Estado atual (CURRENT TRUTH)

### 2.1 Tokens declarados (`src/index.css:9-72`)

- `@theme` (Tailwind): `--color-primary #3b82f6`, `--color-primary-glow`, `--color-bg #030712`, `--color-text-primary #fff`, `--color-text-secondary #9ca3af`, `--color-card #111827`, `--color-card-border`, `--font-sans` (Montserrat). Linhas 9-18.
- `:root` originais: `--primary`, `--primary-glow`, `--primary-gradient`, `--secondary-gradient`, `--bg-color`, `--text-primary`, `--text-secondary`, `--card-bg`, `--card-border`. Linhas 22-31.
- `:root` shadcn: `--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--radius`, `--sidebar-*`. Linhas 37-71.
- Não existe token de: espaçamento, tipografia (tamanho/peso), raio além de `--radius`, sombra, z-index, breakpoints, estados semânticos (success/warning/info), motion.

### 2.2 Tokens consumidos de fato

`var(--...)` em `src/` (contagem de usos): `--text-secondary` 77, `--primary` 12, `--primary-color` 11 (**não definido**), `--radius` 7, `--border` 7, `--chart-*` 5, `--radius-md` 4, `--card-bg` 3, `--accent` 3, `--text-primary` 2, `--primary-gradient` 2, `--secondary` 2, `--foreground` 2, `--text-h` 1 (**não definido**), `--social-bg` 1 (**não definido**).

Só `--text-secondary` é usado de forma consistente. `--card-bg`/`--card-border`/`--bg-color` quase não aparecem fora do próprio CSS.

### 2.3 Duas linguagens de estilo (achado 2 do pedido)

| Linguagem | Onde | Peso |
|---|---|---|
| CSS puro global (`index.css`, 130 seletores de classe) | `login-*`, `page-container`, `app-wrapper`, `portal-wrapper`, `nav-tab`, `animate-fade-in` etc. | classes de layout/shell e login |
| CSS por componente | `Mascot.css` (78 linhas), `MascotDuo.css` (57), `NotificationModal.css` (363) | só 3 arquivos |
| **Inline `style={{}}`** | 35 arquivos `.jsx`: `Admin` 564 linhas com `style={{`, `Dashboard` 136, `Profile` 174, `Register` 82, `Challenges` 72, `PassportTab` 65, `Scanner` 62... | **linguagem dominante de fato** (1.880 ocorrências) |
| Tailwind v4 | `@import "tailwindcss"` em `index.css:2`; `tailwind.config.js` vazio (0 bytes, ok em v4); utilitários em JSX: só `animate-spin` etc. | infra pronta, uso ~0 |
| shadcn/ui | `src/components/ui/button.jsx`, `input.jsx` | **0 importadores** |

Ou seja, a "dualidade" CSS-vs-Tailwind é na verdade uma **tripla**: CSS global + inline + Tailwind/shadcn ocioso. O inline ganha de longe, e é ele que impede tema, hover, focus e media query.

`App.css` (184 linhas, achado 3): é o template do Vite (`.counter`, `.hero`, `#center`, `.base/.framework/.vite`). Nenhum import de `App.css` em `src/` e nenhuma dessas classes aparece no JSX. **Código morto**, pode ser removido (decisão do Fabio, por ser deleção).

### 2.4 Layout e breakpoints

- Shell mobile: `.app-wrapper { max-width: 430px; height: 100dvh }` (`index.css:~101`), usado por todas as telas de participante (`App.jsx:105`).
- Shell portal (Admin/Staff/Sponsor): `.portal-wrapper`, 100% de largura (`App.jsx:105`).
- `@media` em CSS: `max-width: 1024px` (6x), `max-width: 480px` (2x), `min-width: 431px` (1x), `max-width: 768px` (1x), `min-width: 768px` (1x). Cinco valores, sem token. O `431px` é só uma duplicata da altura (`@media (min-width:431px){.app-wrapper{height:100dvh}}` repete o mesmo valor da regra base).
- JS para responsividade: só 1 `matchMedia` (detecção de PWA instalado em `InstallPwaCard.jsx:44`). Não há `isMobile` por `innerWidth`.
- `style={{}}` não suporta media query: então telas inline só se adaptam por `flex-wrap`/`%`. **INFERÊNCIA**: Admin em desktop provavelmente é mobile esticado; precisa validar no browser.

---

## 3. Achados verificados

Severidade: **A** alta (bloqueia consistência/a11y), **M** média, **B** baixa.

### 3.1 Cor

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| C1 | A | Paleta paralela slate/gray/sky fora dos tokens | Ocorrências (todas as extensões): `#1E293B` 199, `#94A3B8` 183, `#38BDF8` 119, `#FFFFFF` 116, `#F8FAFC` 111, `#9CA3AF` 109, `#F9FAFB` 101, `#374151` 81, `#3B82F6` 77, `#0F141F` 75, `#2563EB` 71, `#64748B` 65, `#EF4444` 60, `#10B981` 54, `#0B0F17` 53, `#111827` 50 | Criar tokens semânticos (surface, surface-raised, border, text-muted, accent-sky). Migrar por busca/troca mecânica |
| C2 | A | 113 hex distintos; 692 `rgba()` soltos | `grep -o '#[0-9a-f]{6}'` = 2.168 ocorrências, 113 únicos; `rgba(` = 692 | Colapsar para ~12-15 tokens + alpha via `color-mix`/token de overlay |
| C3 | A | Concentração: `Admin.jsx` 745 hex, `Profile.jsx` 224, `Dashboard.jsx` 141, `index.css` 94, `Agenda.jsx` 83 | contagem por arquivo | Admin e Profile primeiro (maior retorno por arquivo) |
| C4 | M | Tokens do app (`--bg-color #030712`, `--card-bg #111827`) quase não são usados; as telas usam `#0F141F`, `#0B0F17`, `#07090E`, `#1E293B` como fundos | `#0F141F` 75x, `#0B0F17` 53x, `#07090E` 18x vs `var(--card-bg)` 3x, `--bg-color` só no CSS | Decidir 1 escala de superfície (bg / surface / raised) e documentar no DESIGN.md |
| C5 | M | Ciano/sky convive com azul de marca sem regra: `#38BDF8` 119x, `#00D2FF` 16x (fallback de `--primary-color`), `#0EA5E9` | contagem acima + `Login.jsx:226` | Definir 1 acento secundário ou remover o ciano |
| C6 | M | Variáveis inexistentes referenciadas com fallback hardcoded (render funciona por acidente) | `var(--primary-color, #00d2ff)` em `AvatarCropperModal.jsx:176,223`, `Login.jsx:226` (11 usos); `--text-h` 1; `--social-bg` 1 | Trocar por `var(--primary)`; fallback `#00d2ff` é cor fora da marca |
| C7 | B | `theme-color` `#07090E` no `index.html:7` não bate com `--bg-color #030712` | `index.html:7` | Alinhar ao token de fundo |

### 3.2 Duplicação de tokens `@theme` vs `:root` (achado 4)

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| T1 | M | 7 valores definidos 2x: `primary`, `primary-glow`, `bg`, `text-primary`, `text-secondary`, `card`, `card-border` (em `@theme` com prefixo `--color-*` e no `:root` com nome antigo). O próprio comentário diz "muda nos dois lugares" | `index.css:9-18` vs `index.css:22-31` | Fonte única: definir no `:root` e fazer `@theme inline { --color-primary: var(--primary) }` |
| T2 | M | Três vocabulários para a mesma cor: `--primary` / `--color-primary` / `--ring` / `--sidebar-primary` / `--chart-1` todos `#3b82f6` | `index.css:22,10,45,67,...` | Manter só o que shadcn/Tailwind exigem, derivando via `var()` |
| T3 | B | Bloco `--sidebar-*` (8 variáveis) e `--chart-*` (5): sem sidebar nem gráfico shadcn no app | `index.css:~54-71`; `--chart-*` 5 usos (veio do init) | Remover no cleanup, ou deixar documentado como "não usado" |
| T4 | B | `--secondary` shadcn = `#1E293B`: é o único token que cobre o hex mais usado, mas só tem 2 usos | `index.css:~41` | Promover a "surface-raised" |

### 3.3 Tipografia

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| Y1 | A | 4 famílias. `body` = Montserrat (`index.css:~79`), mas inline usa `'Inter'` 101x (21 arquivos, `Profile` 44), `'Space Grotesk'` 95x (19 arquivos, `Dashboard` 26), `'JetBrains Mono'` 16x. `index.html:15` carrega Inter+JetBrains+Space Grotesk, e `index.css:1` carrega Montserrat 400-900: **duas cargas de Google Fonts** em paralelo | greps de `fontFamily` | Escolher 1 sans (+ 1 mono só para números/códigos se justificar). Dropar uma carga. Peso de rede importa em PWA de evento com Wi-Fi ruim |
| Y2 | A | Sem escala. 64 valores distintos de `font-size` em 880 usos. Mais frequentes: `0.72rem` 88, `0.82rem` 87, `0.78rem` 85, `0.74rem` 52, `0.80rem` 47, `0.76rem` 42, `0.84rem` 38, `0.75rem` 38, `0.68rem` 35. Mistura `rem`, `px` (`11px` 15, `13px` 13, `12px` 12) e até `8.8px` (`BottomNavigation.jsx:119`) | contagem | Escala de ~6 passos (ex: 11/12/14/16/20/28) em tokens |
| Y3 | A | Texto minúsculo em volume: 406 usos de `font-size` entre 0.60-0.79rem (≈ 10-12.6px) e 18 inline abaixo de 12px. Rótulo de nav em 8.8px | contagem | Piso de 12px para texto de leitura; 11px só para rótulo uppercase curto |
| Y4 | M | Pesos: 700 (213), 600 (213), 800 (91), 500 (21), `bold` 14, 900 (4). Quatro pesos fortes lado a lado, pouca diferença visual entre 600/700/800 | contagem | Limitar a 400/500/600/700 |
| Y5 | M | Hierarquia semântica fraca: 19 `<h1>`, 15 `<h2>`, 43 `<h3>` espalhados em ~35 arquivos (várias páginas inteiras e modais com `h1`) | greps | Uma página = um `h1`; resto por escala |
| Y6 | B | `.font-lastica` mapeia para Montserrat (nome é herança de fonte antiga) | `index.css:~113` | Remover/renomear |

### 3.4 Espaçamento, raio, sombra, z-index

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| S1 | M | Espaçamento sem escala: `gap` 8px (116), 6px (80), 10px (64), 12px (58), 4px (41), 5px (22), 14px (21), 16px (19), 3px, 7px. `padding` `12px 16px` 38, `8px 10px` 20, `14px` 20 | greps de `gap`/`padding` inline | Escala 4-8-12-16-24-32; 5/6/7/10/14px saem |
| R1 | M | 20 raios distintos. Mais usados: 6px (107), 8px (84), 12px (73), 10px (73), `50%` (51), 4px (43), 16px (35), 14px (30), 20px (19), 999px (14), 24px (14), 18px (9), 9999px (5) + 17px, 9px, 5px, 3px, 28px, 32px, 40px. `--radius` (0.625rem = 10px) existe e tem 7 usos | greps | 4 raios: sm 6 / md 10 / lg 16 / full |
| Sh1 | M | 116 `box-shadow` com valores sob medida; mais repetidos: `0 1px 3px rgba(0,0,0,.3)` 4x, `0 4px 14px rgba(37,99,235,.35)` 3x. Glow azul alterna entre .3 e .35 e entre 14px e 16px | greps | 3 elevações (sm/md/overlay) + 1 glow primário |
| G1 | M | Glass/blur: 45 `linear-gradient` + 2 `radial-gradient`; `backdrop-filter: blur()` com 11 valores distintos (12px 10x, 8px 6x, 16px 6x, 14px 6x, 4px, 20px, 10px, 5px, 30px, 6px, 3px) | greps | 1-2 níveis de blur, e gradiente só no CTA primário (`--primary-gradient`) |
| Z1 | A | z-index sem camada: 17 valores (0, 1, 2, 5, 6, 8, 10, 50, 100, 110, 120, 900, 1000, 2000, 9999 x11, 10000, 99999 x4). Corrida de "mais alto vence" garante colisão entre modal/toast/scanner | greps de `zIndex` | Escala nomeada: base 0 / sticky 10 / nav 20 / overlay 40 / modal 50 / toast 60 |

### 3.5 Estados

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| E1 | A | Hover/focus quase inexistentes onde mais se interage. `:hover` em CSS: 13 (`index.css`), 7 (`NotificationModal.css`), 3 (`Mascot.css`), 2 (`App.css`, morto). No JSX, hover é feito por `onMouseEnter/onMouseOver` apenas 2x | greps | Estados via classes/CSS (não inline). `button` shadcn já traz hover/focus-visible: usar |
| E2 | A | `:focus-visible`: 4 ocorrências no repo, 3 deles fora de código vivo (`App.css`, shadcn `ui/`). `outline: none` em `index.css:396,568` (`.login-input`) e inline em `BottomNavigation.jsx:~76` (`outline: 'none'`). Substitutos de foco: `.login-input:focus` (`index.css:399`) só estiliza campos de login | greps | Anel de foco global `:focus-visible { outline: 2px solid var(--ring) }`; proibir `outline:none` sem substituto |
| E3 | M | Loading: `Loader2` 37 usos + `animate-spin` 22 (Tailwind, único uso real). Só 2 textos "Carregando". Sem skeleton | greps | 1 componente `Spinner` + skeleton nas listas (Ranking/Agenda/Feed) |
| E4 | M | `disabled` tratado 34x, mas sem estilo comum (cada botão cria o seu `opacity`/cursor) | grep | Variante `disabled` única no `Button` |
| E5 | M | `animate-scale-up` usado 3x (`AvatarCropperModal.jsx:128`, `Login.jsx:278`, `Profile.jsx:1588`) e **não há definição em `src/`**; `animate-fade-in` está definida em `index.css:530` e usada em ~25 locais. **A VERIFICAR** se `tw-animate-css` define `scale-up` | `grep scale-up src/index.css` = 0 | Definir ou trocar |
| E6 | M | Erro de formulário: 10 `aria-invalid` no repo; padrão visual de erro varia por tela. Sem `role="alert"`/`aria-live` (0 ocorrências de `role="alert"`) | greps | Componente `FieldError` com `aria-describedby` |
| E7 | M | Motion: 33 `animation:`, 111 `transition:`, 19 `@keyframes` (`float` 3x, `waveRight/Left` 2x, `blink` 2x, `laserSweep` 2x, etc). **0 `prefers-reduced-motion`** | greps | Bloco global `@media (prefers-reduced-motion: reduce)` em `index.css` (1 mudança, cobre tudo) |

### 3.6 Acessibilidade

Contraste calculado (WCAG, razão): AA texto normal exige 4.5, texto grande/UI 3.0.

| Par (texto/fundo) | Razão | Onde aparece | Veredito |
|---|---|---|---|
| `#9CA3AF` / `#030712` (`--text-secondary` sobre bg) | 7.93 | texto secundário | ok |
| `#9CA3AF` / `#111827` (sobre card) | 6.99 | idem | ok |
| `#94A3B8` / `#1E293B` | 5.71 | os 2 hex mais usados juntos | ok |
| `#94A3B8` / `#0F141F` | 7.18 | | ok |
| `#38BDF8` / `#1E293B` | 6.83 | ícones/links ativos | ok |
| `#3B82F6` / `#030712` | 5.47 | link/texto de marca | ok |
| `#3B82F6` / `#111827` | 4.82 | link sobre card | ok, no limite |
| **`#64748B` / `#1E293B`** | **3.07** | nav inativo, legendas, 65 usos do hex | **falha AA** para texto normal |
| **`#64748B` / `#0F141F`** | **3.87** | idem | **falha AA** |
| **`#64748B` / `#030712`** | **4.23** | idem | **falha AA** (por pouco) |
| **`#374151` / `#030712`** | **1.95** | `#374151` 81 usos, quando for texto/ícone | **falha** (verificar se é só borda, ver abaixo) |
| **`#374151` / `#111827`** | **1.72** | idem | **falha** se for texto |
| **`#FFFFFF` / `#3B82F6`** (botão primário) | **3.68** | CTA principal | **falha AA para texto <18px** |
| `#FFFFFF` / `#2563EB` (início de `--primary-gradient`) | 5.17 | CTA com gradiente | ok |
| **`#FFFFFF` / `#0EA5E9`** (fim do gradiente) | **2.77** | CTA com gradiente | falha na metade clara |
| **`#FFFFFF` / `#10B981`** | **2.54** | botões/badges de sucesso | **falha** |
| **`#FFFFFF` / `#EF4444`** | **3.76** | botões/badges de erro | **falha AA para texto pequeno** |
| `#EF4444` / `#111827` | 4.71 | texto de erro | ok |
| `#10B981` / `#111827` | 6.99 | texto de sucesso | ok |
| `#F59E0B` / `#111827` | 8.26 | aviso | ok |

(`#374151` pode ser majoritariamente borda/divisor; não classifiquei uso por uso. **A VERIFICAR**.)

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| A1 | A | Viewport bloqueia zoom: `maximum-scale=1.0, user-scalable=no` | `index.html:6` | Remover; é falha WCAG 1.4.4 e o público inclui quem precisa ampliar texto de 11px |
| A2 | A | `<html lang="en">` em app 100% pt-BR. Leitor de tela lê em inglês | `index.html:2` | `lang="pt-BR"` |
| A3 | A | Labels: 85 `<input>`, 85 `<label>` mas só 3 `htmlFor`. Em `Login.jsx:156/159` o label e o input são irmãos sem associação | greps | Associar (`htmlFor`/`id` ou envolver). O `ui/input` do shadcn não resolve sozinho |
| A4 | A | 13 `role="button"` em `div`/similares (10 em `Dashboard.jsx`, 1 em `EventCard`, `Agenda`, `Profile`). Há `onKeyDown` com Enter nesses, mas só Enter (Space não) e sem `tabIndex` garantido em todos (13 `tabIndex` no repo todo) | greps | Trocar por `<button>` (o repo já tem 229). Mais 3 `div/span/li/img/p` com `onClick` puro (`Admin.jsx` 2, `NotificationModal.jsx` 1) |
| A5 | A | Sem `prefers-reduced-motion` (ver E7) | 0 ocorrências | Bloco global |
| A6 | M | Imagens: 34 `<img`, 13 com `alt=` na mesma linha. **A VERIFICAR** manualmente (o `alt` pode estar em linha seguinte em JSX multilinha); lista de candidatos sem `alt` na mesma linha: `ActivityModal:364`, `AvatarCropperModal:183`, `ParticipantCard:217,275`, `PassportTab:412,551,668`, `SponsorLeadModal:194`, `Admin:1244,1991`, `Challenges:358,841`, `Dashboard:380,1408`, `Feed:556,778`, `Profile:749,828`, `Register:328,625`, `Terms:111` | greps | Revisar cada um; avatar/logo de patrocinador precisa de alt descritivo, decorativo `alt=""` |
| A7 | M | Alvos de toque: 112 declarações inline de `width/height` entre 20-39px; só 11 `min-height` entre 44-49px. Nav inferior: `minWidth 38px / minHeight 46px` (`BottomNavigation.jsx`), rótulo 8.8px. **INFERÊNCIA**: parte dos 112 é ícone decorativo, não alvo | greps | Piso 44x44 em todo clicável (WCAG 2.5.5 / Apple HIG) |
| A8 | M | 30 `aria-label`, 7 `aria-hidden`, 6 `aria-expanded`, 4 `aria-modal` + 4 `role="dialog"`, apenas 1 `aria-labelledby`. Modais (9+ componentes `*Modal*`) sem trap/retorno de foco verificados | greps | Primitivo `Modal` único (ver roadmap, fase 4) |
| A9 | B | `-webkit-tap-highlight-color` desligado em nav + `outline:none`: sem feedback de foco para teclado/switch | `BottomNavigation.jsx` | Ver E2 |

### 3.7 Responsividade

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| Rs1 | A | App de participante é 430px fixo (`.app-wrapper`). Em desktop vira coluna estreita centralizada sobre `BG (7).png` (fundo cobrindo + overlay 92%). Provavelmente intencional (PWA de evento) | `index.css:~101`, `body` em `index.css:~79` | Confirmar com Product se desktop é suporte real. Se não, documentar "mobile-first, 430px, desktop = moldura" no DESIGN.md |
| Rs2 | A | Portal (`Admin` 3.992 linhas / `Staff` / `Sponsor`) usa `.portal-wrapper` fluido, mas estilo inline impede breakpoints reais. 564 linhas `style={{` só no Admin. **A VERIFICAR** em browser em 768/1024/1440 | `App.jsx:105`; contagem | Tabelas/painéis do Admin precisam de layout próprio desktop; ver roadmap |
| Rs3 | M | 5 breakpoints sem nome (480/768/1024/431), nenhum em token | greps `@media` | 3 breakpoints: 430 (shell), 768, 1024 |
| Rs4 | M | `100vh`+`100dvh` duplicados; só 10 usos de `dvh`/`safe-area` no JSX | `index.css`; grep | `viewport-fit=cover` já está no meta; garantir `env(safe-area-inset-*)` no nav e modais |
| Rs5 | B | `overflow-x:hidden` em `html`, `body`, `#root`, `.app-wrapper`: 4 camadas escondendo overflow em vez de corrigi-lo; e `touch-action: pan-y` no `html` bloqueia gestos horizontais nativos | `index.css:~62-75` | Achar a origem do overflow (provável: largura fixa inline); só então remover |

### 3.8 Consistência entre telas

Observações por **leitura de código**, não por screenshot.

| Tela/arquivo | Linhas | `style={{` | Hex | Fontes extra | Nota |
|---|---|---|---|---|---|
| `Admin.jsx` | 3.992 | 564 | 745 | Inter 3x | maior dívida; arquivo único de ~208 KB |
| `Profile.jsx` | 2.627 | 174 | 224 | Inter **44x**, Space Grotesk 14x | mistura mais pesada de fontes |
| `Dashboard.jsx` | 1.586 | 136 | 141 | Space Grotesk **26x**, JetBrains 8x | principal usuário de Space Grotesk |
| `Register.jsx` | 923 | 82 | n/d | n/a | usa `login-*` (CSS) + inline |
| `Challenges.jsx` | 1.086 | 72 | 60 | | |
| `Scanner.jsx` | 1.093 | 62 | 69 | | |
| `Feed.jsx` | 892 | 55 | 68 | Inter 8x | |
| `Agenda.jsx` | 957 | 53 | 83 | Inter 7x, SG 8x | |
| `Sponsor.jsx` | 588 | 47 | n/d | | `fontFamily` no wrapper da página (`:271`) |
| `Ranking.jsx` | 577 | 45 | n/d | | `paddingBottom: '170px'` (outras telas 80-120) |
| `Staff.jsx` | 516 | 39 | n/d | | |
| `Login.jsx` | 398 | 36 | n/d | | referência de CSS global (`login-*`) |

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| X1 | A | Cada tela escolhe a própria família de fonte; mesmo componente (card, título, botão) muda entre telas | tabela acima | Resolvido por Y1 + componentes base |
| X2 | M | `paddingBottom` de página inconsistente para compensar o nav: 80 (Staff), 90 (Sponsor), 100, 120 (Agenda/Challenges/Feed/Profile), 170 (Ranking) | `style=` em cada `page-container` | Mover para `.page-container` com `env(safe-area-inset-bottom)` + altura do nav em token |
| X3 | M | Login/Register/Onboarding usam `.login-*` (glass card), o resto usa inline: duas famílias de card/input no mesmo fluxo de entrada | `index.css` + JSX | Um `Card` e um `Input` |
| X4 | M | Modais/sheets (pelo menos 9 componentes `*Modal*`) com implementações de overlay (`ConfirmModal`, `FeedbackModal`, `ActivityModal`, `LectureModal`, `SponsorLeadModal`, `SymplaRequirementModal`, `AvatarCropperModal`, `NotificationModal`, `ActivityCheckoutScannerModal`, ...) cada um com z-index, blur, animação próprios | greps de z-index/blur/keyframes (`panelSlideUp`, `twSheetSlideUp`, `notificationPanelSlideUp`, `lectureModalIn` são 4 variações da mesma animação) | Primitivo `Dialog`/`Sheet` (shadcn já tem) |
| X5 | B | Badge, EventCard, ActivityCard, LectureCard, ParticipantCard: ActivityCard (12 linhas) e LectureCard (28) são wrappers finos; EventCard (361) e ParticipantCard (612) reimplementam card | tamanhos de arquivo | Revisar duplicação (pedir ao code-review) |

### 3.9 Ícones, mascotes, assets

| # | Sev | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| I1 | M | Lucide em 34 arquivos (`lucide-react` importado, `components.json` aponta `iconLibrary: lucide`). Coerente com o `Do`. Tamanhos soltos (nav usa 18, `strokeWidth` 1.75/2). Cor do ícone passada por prop com hex (`'#38BDF8'`, `'#64748B'`) | `BottomNavigation.jsx` | Padronizar 16/20/24 + `currentColor` |
| I2 | M | Marcas sociais: `Instagram` 13, `Github` 2, `Linkedin` 2 referências a ícones de marca do Lucide (Lucide marca esses ícones como descontinuados nas versões recentes). **A VERIFICAR** versão | `grep` | Checar `package.json` e versão; se ícone sumir no upgrade, quebra |
| I3 | M | Emoji em UI: 63 emojis em 12 arquivos `.jsx` (`Admin` 30, `PassportTab` 11, `Profile` 6, `Challenges` 4). Mistura de emoji com Lucide no mesmo produto | script Python sobre `src/**/*.jsx` | Substituir por Lucide ou documentar onde emoji é permitido (conteúdo de usuário vs UI) |
| I4 | M | Mascote: `Mascot` (cores `blue`/`purple`) em Login, Onboarding (4x), Register, Agenda, Dashboard; `MascotDuo` no Dashboard. Mascote em 5 telas, tamanhos via `style` (`28px`, `48px`, `100%`) | greps | Definir tamanhos (sm 28 / md 48 / lg) e estados (acenando, parado). `Mascot.jsx` tem 12 gradientes inline. **A VERIFICAR** se `purple` é cor oficial ou sobra: não existe token roxo no tema |
| I5 | B | Fundo `public/BG (7).png`, nome com espaço e parênteses, referenciado como `url('/BG (7).png')` | `index.css` body | Renomear (`bg-app.png`); verificar peso do arquivo |
| I6 | B | `public/patrocinadores/`: nomes inconsistentes (`W_Aimirim_med .png` com espaço antes do `.`, `aimirim-logo.png`, `Kanastra-Logo-Edited.png`) | `ls public` | Padronizar nomes; fica pro dono do conteúdo |

### 3.10 Sinais de "AI slop" / template

Checagem sobre o `Do/Don't` do agente. Evidência de código; juízo visual fica pra rodada com screenshots.

| # | Sev | Sinal | Evidência |
|---|---|---|---|
| Sl1 | M | Gradientes por toda parte: 45 `linear-gradient` + 2 `radial-gradient` (inclusive 12 só em `Mascot.jsx`, 10 em `PassportTab.jsx`) |
| Sl2 | M | Glass/blur gratuito: 44 `backdrop-filter` com 11 intensidades diferentes; `login-glass-card` é o padrão do fluxo de entrada |
| Sl3 | M | Glow azul de sombra repetido em CTAs (`rgba(37,99,235,.35)`) |
| Sl4 | M | Quatro fontes, inclusive `Space Grotesk` (95x) e `Inter` (101x): combinação típica de template |
| Sl5 | B | `App.css` com resto do template Vite (`.counter`, `.hero`) não importado |
| Sl6 | B | Emoji decorativo em títulos (63) |
| Sl7 | A VERIFICAR | Card dentro de card / ícone em quadrado arredondado sobre cada título: precisa de screenshot. Raios 6/8/10/12 convivendo sugere aninhamento |

Pontos que **funcionam e devem ser preservados** (GOOD PATTERNS): paleta escura/azul coerente de marca (`#030712` + `#3b82f6`); Montserrat como identidade (se for a escolhida); Lucide como biblioteca única; `button` já é elemento dominante (229 `<button`) apesar dos 13 `role=button`; `--text-secondary` 77 usos mostra que token pega quando é simples; mascotes dão personalidade real; `@/` alias e `cn()` já configurados.

---

## 4. Verificação dos 5 achados do pedido

| # | Pedido | Resultado |
|---|---|---|
| 1 | Hex mais repetidos não são tokens | **Confirmado e maior.** `#1E293B` 199 (vs ~188), `#94A3B8` 183 (vs ~169), `#38BDF8` 119 (vs ~115). Diferença: contei case-insensitive em `.css/.js/.jsx`. `#9CA3AF` (109) **é** o `--text-secondary`, só que hardcoded; idem `#111827` (50) = `--card-bg` e `#3B82F6` (77) = `--primary` usados como literal em vez de token |
| 2 | Duas linguagens (CSS vs Tailwind) | **Corrigido:** são três. CSS global + inline (dominante, 1.880) + Tailwind/shadcn sem uso real. Utilitários Tailwind em JSX: 53 matches, todos `animate-*`/`font-lastica`. 0 importadores de `ui/button` e `ui/input` |
| 3 | `style={{}}` em ~13 arquivos; App.css 184 linhas | **Corrigido:** 35 arquivos `.jsx`, 1.880 ocorrências (20 componentes + 15 páginas/App). Os ~13 provavelmente era o nº de arquivos que usam `var(--...)` (13). `App.css` = 184 linhas, **código morto** (template Vite, sem import) |
| 4 | Tokens duplicados `@theme` vs `:root` | **Confirmado** (7 pares, `index.css:9-18` vs `22-31`), mais 3 variáveis referenciadas e inexistentes |
| 5 | DESIGN.md/DESIGN-AUDIT.md não existem | **Confirmado**: `ls DESIGN*.md` falhou. Este arquivo cria o AUDIT; DESIGN.md só tem esqueleto abaixo |

---

## 5. Roadmap priorizado

Princípio: cada fase é um PR pequeno, reversível, sem redesenhar telas. Ordem = menor risco e maior alavanca primeiro.

**Fase 0 - Decisões do Fabio (antes de qualquer código)**
- Qual a fonte oficial: Montserrat (declarada no `body`) ou Inter/Space Grotesk (mais usadas inline)? Recomendo Montserrat (já é identidade) + JetBrains Mono só pra código/números.
- Desktop é público real do app de participante, ou 430px centralizado basta?
- Regra de estilo (fase 2): proposta abaixo.
- Roxo do `Mascot color="purple"`: cor de marca ou resto?

**Fase 1 - Tokens (sem mudar aparência)** - esforço M
1. `index.css`: fonte única de verdade no `:root`; `@theme inline` apontando para `var()`. Elimina T1/T2.
2. Adicionar tokens que faltam: superfícies (`--surface`, `--surface-raised`, `--border`), textos (`--text-muted`), acento (decidir sky), semânticos (`--success/--warning/--danger/--info`), escala de fonte, espaço, raio, sombra, z-index, breakpoints.
3. Corrigir `--primary-color`/`--text-h`/`--social-bg` (3 variáveis inexistentes).
4. Troca mecânica dos 9 hex dominantes pelo token equivalente (`#1E293B`→`--surface-raised`, `#94A3B8`→`--text-muted`, ...). Começar por `Admin`/`Profile`/`Dashboard`: cobrem ~1.110 dos 2.168 hex.
5. Remover `App.css` (com OK) e o bloco `--sidebar-*`.

**Fase 2 - Regra Tailwind vs CSS (decisão + doc)** - esforço P
Proposta: **Tailwind (utilitários + tokens) para tudo novo e para qualquer tela tocada; shadcn só para primitivos; CSS global só para shell/reset/keyframes; `style={{}}` só para valor dinâmico (cor vinda de dado, largura de barra de progresso).** Tela legada migra por demanda, não em big bang. Registrar em ADR (`adr` agent) e no DESIGN.md.

**Fase 3 - Tipografia e fonte única** - esforço M
Uma carga de fonte (tirar a de `index.html:15` ou a de `index.css:1`), escala de 6 passos, piso 12px, remoção de `font-lastica`. Atenção a quebra de layout em Profile (Inter 44x) e Dashboard (Space Grotesk 26x): validar em browser.

**Fase 4 - A11y de baixo custo (alto retorno, pode ir antes da fase 3)** - esforço P
1. `index.html`: `lang="pt-BR"`, remover `user-scalable=no`/`maximum-scale`.
2. CSS global: `prefers-reduced-motion`, `:focus-visible`.
3. Trocar `role="button"` em `div` por `<button>` (13 pontos; 10 no Dashboard).
4. Associar labels (85 inputs).
5. Corrigir pares de contraste: texto muted `#64748B`→ pelo menos `#94A3B8`; texto branco sobre `#3B82F6`/`#10B981`/`#EF4444` usar fundo mais escuro (`#2563EB`, `#059669`, `#DC2626`) ou texto escuro.

**Fase 5 - Componentes `ui/`** - esforço G, em PRs separados
Ordem sugerida: `Button` (já existe, passar a usar em Login/Register/CTAs; checar `login-btn` e cada botão inline), `Input`+`Label`+`FieldError`, `Card`, `Dialog/Sheet` (consolida os modais, 4 animações de entrada, z-index), `Badge`, `Spinner`/`Skeleton`, `Tabs`. Após cada `shadcn add`, **conferir `src/index.css`** (já foi sobrescrito antes).

**Fase 6 - Telas** - esforço G
Ordem de risco/valor: Login/Register/Onboarding (entrada, CSS global) → Dashboard → Agenda/Ranking/Feed → Profile → Scanner/Challenges → Portal (Admin/Staff/Sponsor, layout desktop próprio). Admin (3.992 linhas) deve ser quebrado em componentes antes de ser migrado; entregar ao agente `admin` o recorte de arquivos.

**Fase 7 - Validação no browser** (rodar com `chrome-devtools`/`playwright` MCP, que esta auditoria não usou): screenshots antes/depois em 390/430, 768, 1440; checar Rs2, Sl7, A6, I4.

Handoffs sugeridos: `adr` (regra Tailwind vs CSS, fonte oficial), `qa` (fluxos após Fase 4/5), `architecture` (refatorar Admin), `product` (Rs1 desktop, cor do mascote).

---

## 6. Esqueleto do `DESIGN.md`

Substituído: o `DESIGN.md` foi criado em 2026-10-04 com o Design System aprovado.

---

## 7. Riscos, unknowns e perguntas

- **Risco:** trocar hex por token em massa em `Admin`/`Profile` sem validação visual pode alterar levemente cores. Mitigar fazendo mapeamento 1:1 (mesmo valor) primeiro, e mudar valores só depois.
- **Risco:** `shadcn add` sobrescrevendo `src/index.css` (já ocorreu: `--primary` virou cinza). Conferir diff a cada add.
- **Risco:** tirar `maximum-scale`/`overflow-x:hidden` pode expor overflow horizontal escondido hoje.
- **UNKNOWN:** render real (desktop do portal, card-dentro-de-card, mascote, alt de imagens multilinha, uso de `#374151` como texto vs borda, peso do `BG (7).png`).
- **UNKNOWN:** existe arquivo Figma do produto? `FIGMA_PROMPT_TECHWEEK.md` na raiz não prova.
- **Perguntas ao Fabio:** ver Fase 0 (fonte oficial, desktop, roxo, remover `App.css`).
- **Fora de escopo (handoff):** nada aqui decide lógica de negócio, rota ou autorização. Os botões de login de teste citados na memória do projeto (`Staff.jsx`/`Sponsor.jsx`) são assunto do `security`, não foram auditados aqui.

## 8. Método

`grep -rhoiE` sobre `src/` para hex/rgba/`style={{`/`font-size`/`border-radius`/`z-index`/`gap`/`padding`/`backdrop-filter`/`fontFamily`/`aria-*`/`role=`/`alt=`/`htmlFor`/`outline`/`@media`/`@keyframes`; script Python (WCAG 2.x, luminância relativa) para contraste; Python regex para classes Tailwind e emojis; leitura de `index.css`, `App.css`, `index.html`, `BottomNavigation.jsx`, `components.json`. Contagens de `font-size` contam declarações com `px`/`rem` literais (880), não `em`/`clamp`/variável.

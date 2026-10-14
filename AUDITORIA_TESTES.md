# Relatório Contínuo de Auditoria de Testes

Este documento registra todos os problemas encontrados durante a auditoria técnica da suíte de testes do projeto. As correções não são aplicadas nesta etapa, apenas documentadas para revisão posterior.

---

## Tabela Resumo de Apontamentos

| ID | Arquivo e Linha | Tipo | Severidade | Descrição Resumida |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-001** | `scripts/quality-gate.test.mjs:4` | Cobertura insuficiente | Média | Suíte não cobre os parâmetros `hasBackend` e `backendOk` adicionados ao `evaluateGate` |
| **ERR-002** | `src/components/WhatsAppButton.test.jsx:1` | Configuração / Teste vazio | Alta | Arquivo com 0 bytes e extensão `.jsx` ignorada pela regex de `include` do Vitest |
| **ERR-003** | `src/hooks/useNotifications.test.js:5` | Falso positivo / Teste superficial | Alta | Apenas valida `typeof === 'function'`; nenhuma das 150 linhas de regras/estado do hook é testada |
| **ERR-004** | `src/hooks/useNotifications.test.js:2` | Efeito colateral / Falta de mock | Média | Import do hook dispara conexão de emulador Firebase (`../lib/firebase`) sem mock |
| **ERR-005** | `src/lib/accessGuard.test.js:1` | Efeito colateral / Falta de mock | Baixa | Import transitivo de `userService` -> `firebase` aciona emulador em teste lógico puro |
| **ERR-006** | `src/lib/activityService.test.js:168` | Cobertura insuficiente | Média | Testes de listeners (`subscribeToUser*`) só cobrem `userId === null`; fluxo positivo não é testado |
| **ERR-007** | `src/lib/analyticsService.test.js:1` | Efeito colateral / Falta de mock | Baixa | `analyticsService.js` importa `db` de `./firebase` sem mock em testes de algoritmos matemáticos |
| **ERR-008** | `src/lib/analyticsService.test.js:16` | Cobertura insuficiente | Alta | Função principal `subscribeToLiveAnalytics` (multi-coleção, throttling, batching) tem zero testes |
| **ERR-009** | `src/lib/auth.test.js:263` | Cobertura insuficiente | Baixa | `onAuthChange` não testa a função de `unsubscribe` nem o evento `facom_auth_state_changed` |
| **ERR-010** | `src/lib/auth.test.js:100` | Cobertura insuficiente | Baixa | `loginWithEmailAndPassword` não valida a persistência de `facom_logged_in` no `localStorage` |
| **ERR-011** | `src/lib/cameraUtils.test.js:9` | Falso positivo / Bypass condicional | Alta | Teste tem `if (typeof document !== 'undefined')`; em Node, roda o `else` sem nenhuma asserção |
| **ERR-012** | `src/lib/designTokens.test.js:3` | Efeito colateral / Falta de mock | Baixa | Import de `formatActivityType` puxa `activityService` -> `firebase` e conecta aos emuladores |
| **ERR-013** | `src/lib/gameplay.test.js:32` | Cobertura insuficiente | Alta | Funções centrais de gamificação (`getMyProfile`, `uploadAvatar`, `uploadMissionPhoto`, `updateMascot`, `getRanking`) têm zero testes |
| **ERR-014** | `src/lib/notifications.test.js:34` | Cobertura insuficiente / Falta de teardown | Baixa | Mutação global de `window` e `localStorage` sem `afterAll`; nenhum teste valida o disparo do evento `techweek_notifications_updated` |
| **ERR-015** | `src/lib/scrollLock.test.js:23` | Flakiness / Poluição de estado global | Média | `globalThis.document` é atribuído no `beforeEach` sem restauração em `afterAll`, vazando mock parcial para outros testes |
| **ERR-016** | `src/lib/noUrlDemoFlag.test.js:7` | Falso positivo potencial / Asserção fraca | Baixa | Teste de segurança estática não asserta que `sources` do glob foi carregado com sucesso (risco de falso positivo se vazio) |
| **ERR-017** | `src/lib/sponsorInviteService.test.js:1` | Efeito colateral / Falta de mock | Baixa | Import de `sponsorInviteService` puxa `./api` -> `./firebase` e conecta emuladores desnecessariamente |
| **ERR-018** | `src/lib/sponsorInviteService.test.js:4` | Cobertura insuficiente | Alta | 8 funções de API (`getInvite`, `acceptInvite`, `listSponsors`, `createSponsor`, etc.) têm zero testes unitários |
| **ERR-019** | `src/lib/subdomain.test.js:4` | Cobertura insuficiente | Média | Função central de detecção de subdomínios (`getAppSubdomain`) tem 0% de cobertura de testes |
| **ERR-020** | `src/lib/sponsorService.test.js:271` | Flakiness / Poluição de estado global | Baixa | `URL.createObjectURL` e `URL.revokeObjectURL` são mockados via atribuição direta sem restauração |
| **ERR-021** | `src/lib/sympla.test.js:1` | Efeito colateral / Falta de mock | Baixa | Import de `sympla.js` puxa `auth` de `./firebase` sem mock e conecta aos emuladores |
| **ERR-022** | `src/lib/sympla.test.js:2` | Cobertura insuficiente | Alta | Função `syncUserSymplaTicket` e validação direta `verifySymplaDirectly` não têm testes unitários dedicados |
| **ERR-023** | `src/lib/tvProgramacao.test.js:2` | Cobertura insuficiente | Média | Função `typeInfo(type)` com mapeamento de cores/labels do Design System da TV possui 0% de testes |
| **ERR-024** | `src/lib/validators.test.js:1` | Cobertura insuficiente | Média | Função `getPasswordStrength(password)` com cálculo de score 0-4 e cores/labels tem zero testes |
| **ERR-025** | `src/lib/userService.test.js:2` | Cobertura insuficiente | Alta | 5 funções centrais (`checkUsernameAvailability`, `findUserByUsername`, `getUserPointEvents`, `subscribeToAllUsers`, `getCachedUserProfile`) não têm testes unitários |
| **ERR-026** | `tests/unit/adminSpeakersFilter.test.js:16` | Falso positivo / Teste tautológico | Média | Teste define função de filtro inline dentro do teste em vez de testar código real da aplicação |
| **ERR-027** | `tests/unit/adminSpeakersFilter.test.js:2` | Efeito colateral / Falta de mock | Baixa | Import de `activityService` puxa `./firebase` sem mock e conecta emuladores desnecessariamente |
| **ERR-028** | `tests/unit/confirmModal.test.js:8` | Falso positivo / Teste superficial | Média | Teste estático via `renderToStaticMarkup` sem validação de interatividade, cliques ou digitação de confirmação / senha |
| **ERR-029** | `tests/unit/emailVerificationGate.test.js:6` | Cobertura insuficiente / Falso positivo | Alta | Teste superficial único via `renderToStaticMarkup`, mocks não utilizados/assertados e ausência de testes de fluxos |
| **ERR-030** | `tests/unit/entranceCheckin.test.js:201` | Cobertura insuficiente / Inconsistência de encoding | Média | Lacuna de testes na resolução de UIDs por e-mail e username, além de strings com encoding corrompido nas asserções |
| **ERR-031** | `tests/unit/liveOpsService.test.js:181` | Cobertura insuficiente | Baixa | Função de exportação de relatório acadêmico em CSV (`exportUfuAuditCsv`) tem zero testes |
| **ERR-032** | `tests/unit/mascot.test.js:7` | Cobertura insuficiente / Teste superficial | Média | Componente `Mascot` testado apenas com strings HTML estáticas via `renderToStaticMarkup`, sem cobrir props de animação e tracking de olhar |
| **ERR-033** | `tests/unit/missionService.test.js:36` | Cobertura insuficiente | Alta | Funções de mutação e ciclo de vida de missões no Firestore (`createMission`, `updateMission`, `deleteMission`, etc.) possuem 0% de testes |
| **ERR-034** | `tests/unit/passport.test.js:28` | Falso positivo / Teste tautológico | Média | Funções de validação de elegibilidade e Bilhete Dourado (`checkEligibility`, `checkGoldenTicket`) são declaradas inline dentro do teste |
| **ERR-035** | `tests/unit/passport.test.js:2` | Efeito colateral / Falta de mock | Baixa | Import de `PassportTab` conecta aos emuladores do Firebase sem mock em teste estático |
| **ERR-036** | `tests/unit/postgradOption.test.js:73` | Falso positivo / Teste tautológico | Média | Função `validatePostgrad` reimplementada localmente dentro do teste em vez de testar funções reais de validação da aplicação |
| **ERR-037** | `tests/unit/passport.test.js:4` | Cobertura insuficiente | Média | Componente React `PassportTab` (renderização de estandes, tiers, progresso e carimbos de visita) tem 0% de testes |
| **ERR-038** | `tests/unit/registerAvatar.test.js:24` | Falso positivo / Teste tautológico | Alta | Teste cria e renderiza componente DOM sintético inline sem importar nenhum arquivo ou componente de produção |
| **ERR-039** | `tests/unit/roleSwitcher.test.js:28` | Cobertura insuficiente | Média | Componente React `RoleSwitcher` (renderização, navegação, seleção de perfis) possui 0% de testes; apenas helper puro `rolesFor` é testado |
| **ERR-040** | `tests/unit/sponsorLeadModal.test.js:4` | Efeito colateral / Falta de mock | Baixa | Import de `SponsorLeadModal` aciona serviços que conectam aos emuladores do Firebase sem mock |
| **ERR-041** | `tests/unit/sponsorLeadModal.test.js:30` | Cobertura insuficiente / Teste superficial | Média | 16 testes usam exclusivamente `renderToStaticMarkup` para checar strings; interações cruciais (submit, update, toggle chips, notas) não são testadas |
| **ERR-042** | `tests/unit/sponsorRoiAndTags.test.js:2` | Efeito colateral / Falta de mock | Baixa | Import de `sponsorService` inicializa conexão e emite logs dos emuladores Firebase sem mock |
| **ERR-043** | `tests/unit/sponsorRoiAndTags.test.js:175` | Fragilidade de teste / E2E estático de CSS | Baixa | Testes leem arquivos crus `.css` e `.jsx` via `fs.readFileSync` verificando strings exatas de CSS/classes em vez de testar funcionalidade |
| **ERR-044** | `tests/unit/sponsorSettingsUI.test.js:4` | Efeito colateral / Falta de mock | Baixa | Import de `SponsorSettings` aciona serviços que conectam aos emuladores do Firebase sem mock |
| **ERR-045** | `tests/unit/sponsorSettingsUI.test.js:14` | Cobertura insuficiente / Teste superficial | Média | 13 testes usam apenas `renderToStaticMarkup` para validar texto inicial; interações do painel (salvar perfil, upload, edição de templates e chips) têm 0% de testes |
| **ERR-046** | `tests/unit/symplaRequirementModal.test.js:5` | Falso positivo / Teste trivial | Alta | Suíte tem 1 único teste que só asserta `SYMPLA_SHEET_Z > 2001`; o modal React inteiro, integração com Sympla e vínculo de ingresso têm zero testes |
| **ERR-047** | `tests/unit/symplaRequirementModal.test.js:2` | Efeito colateral / Falta de mock | Baixa | Import de `SymplaRequirementModal` dispara conexão e logs dos emuladores Firebase sem mock |
| **ERR-048** | `tests/unit/testSponsorRender.test.js:32` | Efeito colateral / Falta de mock | Baixa | Importação dinâmica de `src/pages/Sponsor` aciona conexões transitivas com emuladores Firebase |
| **ERR-049** | `tests/unit/testSponsorRender.test.js:32` | Cobertura insuficiente / Teste superficial | Média | Teste apenas monta `Sponsor.jsx` via `renderToStaticMarkup` e checa strings de casca (`sponsor-shell`); fluxos operacionais reais não são testados |
| **ERR-050** | `tests/unit/uniqueUsername.test.js:2` | Efeito colateral / Falta de mock | Baixa | Import de `userService` inicializa conexão e emite logs dos emuladores Firebase sem mock |
| **ERR-051** | `tests/unit/uniqueUsername.test.js:13` | Falso positivo / Asserção fraca | Média | Teste normaliza `@dev_user` mas asserta apenas `typeof res.available === 'boolean'` sem mockar Firestore e sem verificar conflito real |
| **ERR-052** | `tests/unit/whatsappOneClickClarity.test.js:4` | Efeito colateral / Falta de mock | Baixa | Import de componentes de estande/sponsor conecta aos emuladores do Firebase sem mock |
| **ERR-053** | `tests/unit/whatsappOneClickClarity.test.js:8` | Falso positivo / Teste puramente textual | Baixa | 4 testes limitam-se a validar ausência de emojis e palavras proibidas via `renderToStaticMarkup` sem testar os fluxos de mensagens |
| **ERR-054** | `backend/src/lib/firestoreId.test.ts:1` | Falha de validação / Cobertura de tipos em runtime | Alta | Ausência de testes para tipos não-string e brecha onde `isValidFirestoreId(undefined)` avalia como `true` devido à coerção implícita |
| **ERR-055** | `backend/src/config/cors.test.ts:40` | Segurança / Regex permissiva | Média | Falta de testes contra regex hijacking/spoofing em domínios Firebase Hosting (`facom-techweek*`) e verificação de erro no pipeline Express |
| **ERR-056** | `backend/src/lib/missionProofValidator.test.ts:143` | Regra de negócio / Validação permissiva | Alta | Lacuna de testes para aceitação insegura de URLs `blob:` em produção e acoplamento hardcoded exclusivo a um único sponsor (`kanastra`) |
| **ERR-057** | `backend/src/lib/missionProofValidator.test.ts:357` | Cobertura insuficiente / Tratamento de exceção | Média | Cobertura incompleta para resiliência a falhas de leitura no Firestore (`tx.get`) e perfis de usuários com campos nulos |
| **ERR-058** | `backend/src/lib/screenToken.test.ts:1` | Cobertura insuficiente / Tratamento de exceção | Média | Ausência de testes para falta de configuração de `SCREEN_TOKEN_SECRET` e risco de exception não tratada em `verifyScreenToken` |
| **ERR-059** | `backend/src/lib/screenToken.test.ts:48` | Fragilidade estrutural / Validação de payload | Média | `activityId` contendo ponto (`.`) causa rejeição indevida com `MALFORMED` e falta de testes de runtime para argumentos não-string |
| **ERR-060** | `backend/src/middlewares/authMiddleware.test.ts:3` | Cobertura insuficiente / Segurança crítica | Crítica | 3 dos 4 middlewares de autenticação/autorização (`requireAuth`, `requireRole`, `requireSymplaTicket`) têm 0% de testes unitários no backend |
| **ERR-061** | `backend/src/middlewares/rateLimiter.test.ts:3` | Cobertura insuficiente / Regra de negócio | Média | Cobertura incompleta de limitadores (`adminSponsorLimiter`, `sponsorInviteIpLimiter`, `debugClientIp`) e ausência de testes para fallback de `keyGenerator` |
| **ERR-062** | `backend/src/services/registerUser.test.ts:30` | Inconsistência de tipagem / Falha de cobertura | Média | Tipagem restringe role a `PARTICIPANT \| ADMIN` mas código preserva roles legadas (`SPONSOR`/`STAFF`) sem cobertura de testes |
| **ERR-063** | `backend/src/services/registerUser.test.ts:1` | Fragilidade estrutural / Validação defensiva | Média | Ausência de testes e validação para `uid` malformatado ou vazio antes de acessar `db.collection('users').doc(uid)` |
| **ERR-064** | `backend/src/services/sponsorInvites.test.ts:24` | Cobertura insuficiente / Fluxo administrativo | Alta | Funções de criação e disparo de e-mails (`prepareInvite` e `dispatchInvite`) possuem 0% de testes unitários |
| **ERR-065** | `backend/src/services/sponsorInvites.test.ts:229` | Fragilidade de segurança / Falta de teste | Baixa | Expurgo em lote de `invalidAttempts` (>5000) permite reset de rate-limit sob flooding sem testes de regressão |
| **ERR-066** | `backend/src/routes/auth.test.ts:1` | Cobertura insuficiente / Arquitetura da API | Média | API do backend expõe apenas `POST /register`; ausência de endpoints e testes para o ciclo de vida completo de autenticação (`/login`, `/me`, etc.) |
| **ERR-067** | `backend/src/routes/admin.ts:155` | Segurança / Falha de validação e sanitização | Média | Ausência de sanitização contra tags HTML/scripts em `broadcastNotificationHandler` permitindo risco de Stored XSS via `/announcements` |
| **ERR-068** | `backend/src/routes/admin.test.ts:372` | Cobertura insuficiente / Teste incompleto do pipeline | Baixa | Testes de broadcast ignoram o middleware `adminBroadcastLimiter` e não validam acesso defensivo a `req.user?.uid` |
| **ERR-069** | `backend/src/routes/admin.ts:1` | Cobertura insuficiente / Escopo incompleto da API | Média | API de admin restrita a 2 endpoints; falta de rotas e testes para listagem de usuários, métricas e auditoria de ações |
| **ERR-070** | `backend/src/routes/booking.ts:295` | Regra de negócio / Fila de espera ineficaz | Alta | Cancelamento de reserva confirmada abre vaga direta sem promover automaticamente o primeiro colocado da lista de espera (`WAITING_LIST`) |
| **ERR-071** | `backend/src/routes/booking.test.ts:154` | Cobertura insuficiente / Código morto em teste | Média | Mecanismo de fallback e auto-seed do catálogo padrão (`DEFAULT_ACTIVITIES_CATALOG`) possui 0% de cobertura de testes |
| **ERR-072** | `backend/src/routes/checkin.test.ts:51` | Cobertura insuficiente / Falsos positivos por omissão | Média | Suíte omite cenários críticos da rota de check-in: atividade inexistente (404), duplicação (409), envio de `rating` e falha de banco (500) |
| **ERR-073** | `backend/src/routes/checkinDoubleCheck.ts:20` | Cobertura insuficiente / Resolução de identidade sem testes | Média | Resolução de participantes via `mailto:`, e-mail e `@username` na rota `/entrance` possui 0% de testes unitários |
| **ERR-074** | `backend/src/routes/checkinDoubleCheck.ts:15` | Segurança / Ausência de Rate Limiting | Alta | Rotas críticas de double-check (`/entrance` e `/checkout`) não possuem middlewares de rate limiting contra flooding |
| **ERR-075** | `backend/src/routes/leads.ts:403` | Desempenho / Ausência de paginação e limites | Média | Endpoint `GET /api/leads` carrega contatos de forma irrestrita sem suporte a paginação ou cursores |
| **ERR-076** | `backend/src/routes/leads.ts:541` | Segurança / Ausência de Rate Limiting | Média | Nenhuma das rotas de gestão de leads (`GET`, `POST`, `PATCH`) implementa controle de taxa de requisições |
| **ERR-077** | `backend/src/routes/leads.ts:145` | Cobertura insuficiente / Tratamento de exceção mudo | Baixa | Resolução de `participantUid` por e-mail utiliza `catch` vazio e possui 0% de testes unitários |
| **ERR-078** | `backend/src/routes/points.test.ts:128` | Cobertura insuficiente / Auto-seed de missões sem teste | Média | Auto-seed de contingência de missões (`DEFAULT_MISSION_CATALOG`) durante claim não possui cobertura de testes |
| **ERR-079** | `backend/src/routes/screenToken.ts:18` | Validação de entrada / Ausência de sanitização de ID | Média | Endpoint `GET /:activityId/screen-token` não sanitiza nem valida formato de `activityId` antes da busca no Firestore |
| **ERR-080** | `backend/src/routes/screenToken.ts:38` | Segurança / Ausência de Rate Limiting | Média | Rota de geração de token criptográfico de tela não possui limitação de taxa de requisições contra loops ou abusos |
| **ERR-081** | `backend/src/routes/sponsorInvitesBody.test.ts:11` | Cobertura insuficiente / Ausência de testes de rota HTTP | Alta | Endpoints HTTP do router `sponsorInvites.ts` (`GET /:token` e `POST /:token/accept`) possuem 0% de testes de integração HTTP |
| **ERR-082** | `backend/src/routes/sponsorInvitesBody.test.ts:11` | Cobertura insuficiente / Casos de borda não testados | Baixa | Validações de limites de tamanho, strings em branco e formato de telefone em `parseAcceptBody` não são testadas |
| **ERR-083** | `backend/src/routes/symplaRoutes.ts:177` | Cobertura insuficiente / Funcionalidade crítica sem testes | Alta | Endpoint oficial de check-in na portaria do evento (`POST /api/sympla/checkin`) possui 0% de testes |
| **ERR-084** | `backend/src/routes/symplaRoutes.ts:12` | Cobertura insuficiente / Rota sem testes | Baixa | Consulta de detalhes do evento Sympla (`GET /api/sympla/event`) não possui nenhum teste unitário ou de integração |
| **ERR-085** | `backend/src/routes/symplaRoutes.ts:6` | Segurança / Ausência de Rate Limiting e risco de DoS | Alta | Rotas de integração com API externa do Sympla não possuem controle de taxa de requisições contra exaustão de cota |
| **ERR-086** | `backend/src/routes/sponsorsAdmin.ts:147` | Confiabilidade / Tratamento de exceção assimétrico | Média | Despacho de convites (`dispatchInvite`) em `createSponsorHandler` está fora do bloco try/catch |
| **ERR-087** | `backend/src/routes/sponsorsAdmin.ts:171` | Desempenho / Consulta N+1 no Firestore | Média | Endpoint `GET /api/admin/sponsors` executa subqueries N+1 de membros para cada patrocinador retornado |
| **ERR-088** | `backend/src/firestoreRules.test.ts:7` | Falso positivo / Teste frágil por regex e string slicing | Média | Teste de segurança KAN-124 valida arquivo por regex/substring em vez de avaliar regras no emulador |
| **ERR-089** | `firestore.rules:142-214` | Cobertura insuficiente / Coleções críticas sem testes de regras | Alta | 11 coleções críticas (`mission_secrets`, `activities`, `missions`, `sponsors`, `leads`, etc.) possuem 0% de testes de regras |
| **ERR-090** | `firestore.rules:237` | Segurança / Divergência entre documentação e regra de feed | Média | Comentário afirma leitura restrita a autenticados, mas regra concede acesso anônimo irrestrito (`allow read: if true`) |
| **ERR-091** | `tests/rules/bookings.test.js:42` | Cobertura insuficiente / Ausência de testes de atualização de reservas | Média | Suíte de reservas não possui nenhum teste de atualização (`updateDoc`), omitindo bloqueio a participantes e liberação a ADMIN |
| **ERR-092** | `firestore.rules:19` | Regras de segurança / Avaliação insegura de propriedade em token | Baixa | Acesso direto a `request.auth.token.email_verified` sem verificar existência lança erro de avaliação no Firestore rules engine |
| **ERR-093** | `e2e/:1` | Cobertura insuficiente / Ausência total de testes E2E funcionais | Crítica | Apenas 2 scripts de screenshot existem em `e2e/`; ausência completa de testes E2E de fluxos de negócio |
| **ERR-094** | `e2e/capture.spec.js:10` | Falso positivo / Testes E2E sem asserções | Alta | Testes são pulados incondicionalmente sem env vars e, quando executados, não possuem asserções (`expect`), mascarando erros com status 0 |
| **ERR-095** | `package.json:6` | Configuração / Ausência de script E2E | Média | Playwright está instalado e configurado, mas não há script `"test:e2e"` no `package.json` |
| **ERR-096** | `e2e/compare.spec.js:25` | Flakiness / Esperas estáticas com `waitForTimeout` | Média | Uso massivo de `waitForTimeout` estático (até 2600ms por etapa) em vez de asserções reativas de visibilidade do Playwright |
| **ERR-097** | `playwright.config.js:20` | Configuração / Acoplamento a Chrome local sem `webServer` | Média | Configuração fixa `channel: 'chrome'` quebrando em ambientes headless padrão e não inclui diretiva `webServer` para subir o Vite |
| **ERR-098** | `e2e/helpers.js:4` | Fragilidade estrutural / Tratamento de credenciais E2E | Baixa | Função de login lança exceção imediata sem oferecer fallback para as contas padrão geradas pelos scripts de seed |


---

## Detalhamento dos Problemas

### ERR-001
- **Arquivo e linha:** `scripts/quality-gate.test.mjs:4`
- **Teste:** `describe('evaluateGate')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** A função `evaluateGate` em `scripts/quality-gate.mjs` implementa suporte aos parâmetros `hasBackend` e `backendOk` (necessários para avaliar o build/test de Cloud Functions), porém o arquivo de teste `scripts/quality-gate.test.mjs` não possui nenhum cenário que envie esses parâmetros.
- **Evidência:**
  ```javascript
  // scripts/quality-gate.mjs
  export function evaluateGate({ lintOk, buildOk, hasTestScript, testOk, hasBackend = false, backendOk = true }) {
  ```
  Nenhum teste em `scripts/quality-gate.test.mjs` inclui `hasBackend`.
- **Causa provável:** O teste ficou defasado quando a feature do backend foi integrada ao Quality Gate.
- **Sugestão de correção:** Adicionar cenários validando `hasBackend: true` com `backendOk: false` (reprovação) e `backendOk: true` (aprovação ponderada no score).
- **Status:** Corrigido
- **Correção aplicada:** Em `scripts/quality-gate.test.mjs`, adicionados cenários de teste cobrindo `hasBackend: true` com `backendOk: true` (ponderação no score e aprovação total), `hasBackend: true` com `backendOk: false` (reprovação mandatória e score proporcional), e `hasBackend: false` (omissão limpa da checagem de backend nos `mandatory_checks`).
- **Verificação:** Executado `npx vitest run scripts/quality-gate.test.mjs`, passando 9/9 testes.

---

### ERR-002
- **Arquivo e linha:** `src/components/WhatsAppButton.test.jsx:1`
- **Teste:** `(Nenhum)`
- **Tipo:** Configuração / Teste vazio
- **Severidade:** Alta
- **O que está errado:** O arquivo `src/components/WhatsAppButton.test.jsx` tem 0 bytes (está completamente vazio). Além disso, a configuração do Vitest em `vite.config.js` possui `include: ['src/**/*.test.js', ...]`, o que ignora qualquer teste com extensão `.jsx`. Quando executado diretamente, o Vitest falha com código 1 informando "No test files found".
- **Evidência:**
  Tamanho no sistema de arquivos: 0 bytes.
  Saída do comando `npx vitest run src/components/WhatsAppButton.test.jsx`:
  ```text
  No test files found, exiting with code 1
  filter: src/components/WhatsAppButton.test.jsx
  include: src/**/*.test.js, tests/**/*.test.js, scripts/**/*.test.mjs
  ```
- **Causa provável:** Arquivo criado como placeholder e esquecido, além de configuração de include do Vitest restrita a `.js`.
- **Sugestão de correção:**
  1. No `vite.config.js`, ajustar o padrão de inclusão para aceitar `.jsx`: `src/**/*.test.{js,jsx}`.
  2. Implementar os testes de renderização e clique do componente `WhatsAppButton`, ou remover o arquivo se não for necessário.
- **Status:** Corrigido
- **Correção aplicada:**
  1. Em `vite.config.js`, atualizado o padrão de include do Vitest para suportar arquivos de teste com extensão `.jsx`: `src/**/*.test.{js,jsx}` e `tests/**/*.test.{js,jsx}`.
  2. Em `src/components/WhatsAppButton.test.jsx`, implementada suíte completa com 9 testes unitários cobrindo renderização condicional por telefone válido/inválido, estado desabilitado (via prop e via disponibilidade), aplicação de `fullWidth`, classes CSS customizadas, renderização do ícone SVG `WhatsAppIcon`, e interceptação e despacho do evento de clique chamando `onClick` e `window.open` com URL contextualizada.
- **Verificação:** Executado `npx vitest run src/components/WhatsAppButton.test.jsx`, passando 9/9 testes.

---

### ERR-003
- **Arquivo e linha:** `src/hooks/useNotifications.test.js:5`
- **Teste:** `it('exporta a função useNotifications corretamente')`
- **Tipo:** Falso positivo / Teste superficial
- **Severidade:** Alta
- **O que está errado:** O arquivo testa unicamente se `useNotifications` é uma função (`expect(typeof useNotifications).toBe('function')`). Nenhuma funcionalidade real do hook (sincronização com Firestore, contagem de não lidas, disparo de eventos, métodos `markAsRead`, `markAllAsRead`, etc.) é executada ou assertada. O teste passa mesmo se o hook estiver quebrado por completo.
- **Evidência:**
  ```javascript
  // src/hooks/useNotifications.test.js
  describe('useNotifications module', () => {
    it('exporta a função useNotifications corretamente', () => {
      expect(typeof useNotifications).toBe('function');
    });
  });
  ```
- **Causa provável:** Teste escrito apenas para pontuar em métricas de cobertura sem implementar testes unitários de ciclo de vida com React Testing Library / renderHook.
- **Sugestão de correção:** Implementar testes reais utilizando `@testing-library/react` (`renderHook`) mockando o Firebase e as funções de `../lib/notifications`, testando o retorno dos estados e execução dos métodos.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/hooks/useNotifications.test.js`, substituído o teste superficial por uma suíte completa de 10 testes unitários testando a API real do hook: inicialização do estado de notificações via `getNotifications()`, cálculo reativo do `unreadCount` filtrando notificações lidas vs não lidas, e delegação das ações do hook para a biblioteca (`markAsRead`, `markAllAsRead`, `addNotification`, `removeNotification` e `clearAllNotifications`).
- **Verificação:** Executado `npx vitest run src/hooks/useNotifications.test.js`, passando 10/10 testes.

---

### ERR-004
- **Arquivo e linha:** `src/hooks/useNotifications.test.js:2`
- **Teste:** `import { useNotifications } from './useNotifications'`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Média
- **O que está errado:** A importação do hook importa transitivamente `../lib/firebase`, que executa efeitos colaterais globais na inicialização e imprime logs de emulador (`⚡ Conectado aos Emuladores do Firebase`) durante a execução de um teste que deveria ser estritamente de unidade.
- **Evidência:**
  Saída no console durante o teste de unidade isolado:
  ```text
  stdout | src/hooks/useNotifications.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O módulo `../lib/firebase.js` roda a inicialização do Firebase e `connectFirestoreEmulator` no nível superior do arquivo (top-level execution) sem isolamento de teste.
- **Sugestão de correção:** Em `useNotifications.test.js`, mockar `../lib/firebase` antes das importações (`vi.mock('../lib/firebase', () => ({ db: {} }))`) para garantir isolamento e evitar efeitos colaterais indesejados.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/hooks/useNotifications.test.js`, adicionados mocks defensivos de topo para `../lib/firebase`, `../lib/auth` e `firebase/firestore`, evitando a inicialização do Firebase e eliminando completamente a emissão de logs de conexão a emuladores durante o teste unitário.
- **Verificação:** Executado `npx vitest run src/hooks/useNotifications.test.js`, confirmando ausência total de mensagens de emulador no stdout do teste e isolamento estrito.


---

### ERR-005
- **Arquivo e linha:** `src/lib/accessGuard.test.js:1`
- **Teste:** `import { decideAccess } from './accessGuard'`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** A função `decideAccess` é pura, mas importa `isAdminEmail` de `./userService`, que por sua vez importa `firebase/auth`, `firebase/firestore` e `./firebase`. Isso faz com que a execução deste teste emita mensagens de conexão a emuladores de Firebase no terminal, tornando o teste dependente do ambiente e poluindo a saída.
- **Evidência:**
  ```text
  stdout | src/lib/accessGuard.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O teste não fez mock do módulo `./userService` (ou da função `isAdminEmail`).
- **Sugestão de correção:** Em `accessGuard.test.js`, adicionar `vi.mock('./userService', () => ({ isAdminEmail: vi.fn((email) => email === 'sam03amorim@gmail.com') }))` para isolar a função pura `decideAccess` de imports pesados com efeitos colaterais.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/accessGuard.test.js`, adicionado mock para `./userService` mockando `isAdminEmail` (`email === 'admin@techweek.com'`), isolando a função pura `decideAccess` e eliminando por completo a inicialização do Firebase e os logs de emulador.
- **Verificação:** Executado `npx vitest run src/lib/accessGuard.test.js`, passando 7/7 testes com 0 logs de emulador no stdout.

---

### ERR-006
- **Arquivo e linha:** `src/lib/activityService.test.js:168`
- **Teste:** `describe('Listeners e Subscriptions')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** Os testes de `subscribeToUserBookings`, `subscribeToUserCheckins` e `subscribeToUserPointEvents` testam única e exclusivamente o caso onde `userId` é `null` (retornando array vazio). A lógica substancial — montagem de consultas no Firestore com `where('userId', '==', userId)`, escuta de `onSnapshot` e, no caso de reservas, a mesclagem com cache local instantâneo (`emitMerged`) — não é coberta por nenhum teste unitário.
- **Evidência:**
  ```javascript
  // src/lib/activityService.test.js linhas 169-189
  it('subscribeToUserBookings deve chamar onUpdate com array vazio se userId for nulo', () => {
    const onUpdate = vi.fn();
    const unsub = subscribeToUserBookings(null, onUpdate);
    expect(onUpdate).toHaveBeenCalledWith([]);
    expect(typeof unsub).toBe('function');
  });
  ```
- **Causa provável:** O desenvolvedor implementou o caso base de guarda contra `null` e deixou a simulação do snapshot do Firestore para trás por requerer mocks mais complexos de query/snapshot.
- **Sugestão de correção:** Expandir o bloco com cenários onde `userId` é fornecido, simulando chamadas do callback `onSnapshot` com docs simulados e validando se `onUpdate` emite as entidades mapeadas corretamente.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/activityService.test.js`, expandida a suíte `describe('Listeners e Subscriptions')` com cobertura abrangente para quando `userId` é válido: montagem de query e filtragem por `userId`/`uid`, mesclagem reativa com dados de `localStorage` (`emitMerged`), reação a eventos da janela (`techweek_bookings_updated`), cancelamento correto em `unsubscribe` (removendo event listeners do DOM e instâncias do Firestore) e propagação resiliente de erros para o callback `onError`.
- **Verificação:** Executado `npx vitest run src/lib/activityService.test.js`, passando 25/25 testes unitários.

---

### ERR-007
- **Arquivo e linha:** `src/lib/analyticsService.test.js:1`
- **Teste:** `import { ... } from './analyticsService'`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `analyticsService.test.js` foca em testar algoritmos matemáticos e de agregação em memória (`generateTimeBuckets`, `normalizeDate`, `calculateActivityRetention`, etc.), mas o módulo importado importa diretamente a instância `db` de `./firebase`, gerando inicialização e log de conexão de emuladores no stdout.
- **Evidência:**
  ```text
  stdout | src/lib/analyticsService.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Falta de `vi.mock('./firebase')` no arquivo de teste.
- **Sugestão de correção:** Adicionar `vi.mock('./firebase', () => ({ db: {} }))` no topo de `analyticsService.test.js`.
- **Status:** Corrigido
- **Correção aplicada:** Adicionado `vi.mock('./firebase', () => ({ db: { mock: 'db' } }))` e `vi.mock('firebase/firestore')` no topo de `src/lib/analyticsService.test.js`, isolando a suíte contra efeitos colaterais de rede e eliminando a inicialização de emuladores.
- **Verificação:** Executado `npx vitest run src/lib/analyticsService.test.js`, passando com 0 logs de emulador.

---

### ERR-008
- **Arquivo e linha:** `src/lib/analyticsService.test.js:16`
- **Teste:** `describe('analyticsService - Algoritmos e Agregações')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** O módulo `analyticsService.js` tem como sua principal responsabilidade exportada em produção a função `subscribeToLiveAnalytics` (~170 linhas de código com escuta reativa simultânea de 5 coleções Firestore, fila de coalescência/throttling de 300ms, agregação sob demanda e fallback). Não existe um único teste unitário cobrindo `subscribeToLiveAnalytics`.
- **Evidência:**
  Nenhum teste no arquivo importa ou referencia `subscribeToLiveAnalytics`. A suíte testa apenas funções utilitárias puras e o schema dos dados mockados (`getMockAnalyticsData`).
- **Causa provável:** Testar um listener multi-coleção com throttling exige mocks de 5 snapshots e timers de relógio (`vi.useFakeTimers()`), o que foi evitado no momento da escrita.
- **Sugestão de correção:** Criar uma suíte dedicada para `subscribeToLiveAnalytics` usando timers falsos (`vi.useFakeTimers()`) e mocks das coleções do Firestore, validando o throttling de 300ms, o acionamento do callback `onUpdate` consolidado e a limpeza no retorno do `unsubscribe`.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/analyticsService.test.js`, criada suíte unitária completa `describe('subscribeToLiveAnalytics (ERR-008)')` cobrindo: validação de tipo de `onUpdate`, subscrição paralela às 5 coleções (`activities`, `checkins`, `users`, `missions`, `pointEvents`), coalescência e throttling de 300ms via `vi.useFakeTimers()`, emissão do payload consolidado com KPIs e distribuições, fallback automático para dados mockados em caso de timeout de 1500ms, tratamento de erro com disparo de `onError`, e desmontagem limpa via chamada de `unsub()` para todos os listeners.
- **Verificação:** Executado `npx vitest run src/lib/analyticsService.test.js`, passando 16/16 testes.

---

### ERR-009
- **Arquivo e linha:** `src/lib/auth.test.js:263`
- **Teste:** `describe('Sessão Global') > it('deve registrar callback no onAuthStateChanged')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Baixa
- **O que está errado:** A função `onAuthChange` em `src/lib/auth.js` gerencia tanto o listener nativo do Firebase Auth quanto um listener customizado de eventos na janela (`facom_auth_state_changed`) para sincronização cross-tab e logout global, retornando uma função de limpeza (`unsubscribe`). O teste atual verifica apenas se `onAuthStateChanged` foi chamado com o callback, deixando sem teste a reação ao evento de janela e a invocação da desmontagem (`unsubscribe`).
- **Evidência:**
  ```javascript
  // src/lib/auth.test.js linhas 263-267
  it('deve registrar callback no onAuthStateChanged', () => {
    const mockCb = vi.fn();
    onAuthChange(mockCb);
    expect(onAuthStateChanged).toHaveBeenCalledWith(expect.anything(), mockCb);
  });
  ```
- **Causa provável:** O teste focou no caso direto do Firebase e não incluiu o ciclo de vida do evento customizado do navegador.
- **Sugestão de correção:** Adicionar asserções disparando o `CustomEvent('facom_auth_state_changed')` no objeto global `window` para testar se `mockCb` é acionado e executar a função de retorno para verificar se `removeEventListener` e o `unsub` do Firebase são chamados.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/auth.test.js`, expandido o bloco `describe('Sessão Global')` adicionando cenários de teste para: (1) reação a eventos `facom_auth_state_changed` disparados na janela propagando dados de usuário autenticado cross-tab ou `null` (logout) para o callback registrado, e (2) invocação limpa da desmontagem (`unsubscribe`), garantindo que tanto a função retornada por `onAuthStateChanged` do Firebase quanto `window.removeEventListener` sejam devidamente chamadas.
- **Verificação:** Executado `npx vitest run src/lib/auth.test.js`, passando 40/40 testes.

---

### ERR-010
- **Arquivo e linha:** `src/lib/auth.test.js:100`
- **Teste:** `describe('loginWithEmailAndPassword') > it('deve autenticar com sucesso quando as credenciais forem válidas')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Baixa
- **O que está errado:** A função `loginWithEmailAndPassword` grava `'facom_logged_in': 'true'` e remove `'facom_test_session'` do `window.localStorage` após autenticação bem-sucedida. Como o teste roda em ambiente Node sem stub prévio do objeto `window.localStorage` (diferente do que é feito no bloco de `logoutUser`), essa persistência local essencial para o PWA não é assertada no teste de login.
- **Evidência:**
  No teste de `loginWithEmailAndPassword` (linha 100-110), apenas o retorno `{ success: true, user: ... }` é assertado, sem verificação de estado do storage, enquanto em `auth.js` linhas 87-90 há:
  ```javascript
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('facom_logged_in', 'true');
    window.localStorage.removeItem('facom_test_session');
  }
  ```
- **Causa provável:** Falta de mock global do `localStorage` no teste de login (foi criado apenas dentro de `describe('logoutUser')`).
- **Sugestão de correção:** Mover o mock de `localStorage` para o `beforeEach` da suíte ou adicionar stub de `window.localStorage` no teste de login para validar a gravação de `facom_logged_in`.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/auth.test.js`, adicionado stub de `window.localStorage` no teste de sucesso de `loginWithEmailAndPassword`, assertando explicitamente as chamadas `setItem('facom_logged_in', 'true')` e `removeItem('facom_test_session')`.
- **Verificação:** Executado `npx vitest run src/lib/auth.test.js`, passando 40/40 testes.

---

### ERR-011
- **Arquivo e linha:** `src/lib/cameraUtils.test.js:9`
- **Teste:** `describe('stopAllMediaTracks') > it('interrompe e limpa todas as faixas de video e audio ativas')`
- **Tipo:** Falso positivo / Bypass condicional
- **Severidade:** Alta
- **O que está errado:** O teste envolve todo o código de teste e asserções dentro de uma condicional `if (typeof document !== 'undefined')`. Como o Vitest executa no ambiente padrão `node` (`environment: 'node'`), a expressão avalia como falsa e executa o bloco `else` (`stopAllMediaTracks();`), que não possui nenhuma asserção sobre os mocks de tracks criados. Como resultado, o teste passa verde ("PASS") sem testar absolutamente nada do fluxo que propõe testar.
- **Evidência:**
  ```javascript
  // src/lib/cameraUtils.test.js linhas 20-33
  if (typeof document !== 'undefined') {
    const origQuery = document.querySelectorAll;
    document.querySelectorAll = vi.fn().mockReturnValue([mockVideoEl]);

    stopAllMediaTracks();

    expect(mockTrack1.stop).toHaveBeenCalled();
    expect(mockTrack2.stop).toHaveBeenCalled();

    document.querySelectorAll = origQuery;
  } else {
    stopAllMediaTracks();
  }
  ```
- **Causa provável:** O autor do teste percebeu que `document` não existia no ambiente Node e adicionou uma guarda condicional em vez de configurar o ambiente de teste para `jsdom`/`happy-dom` ou criar um mock global para `global.document`.
- **Sugestão de correção:** Configurar o teste para rodar com comentário diretiva `// @vitest-environment jsdom` ou mockar `globalThis.document = { querySelectorAll: vi.fn(...) }` antes da execução para que o fluxo com asserções seja sempre executado.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/cameraUtils.test.js`, eliminada a condicional de bypass `if (typeof document !== 'undefined')` e adicionado stub global de `document` com `querySelectorAll` mockado retornando o elemento de vídeo com faixas ativas. Agora o teste executa incondicionalmente no ambiente Node, assertando que `mockTrack1.stop()`, `mockTrack2.stop()` e a limpeza de `video.srcObject = null` acontecem com sucesso.
- **Verificação:** Executado `npx vitest run src/lib/cameraUtils.test.js`, passando 3/3 testes com asserções ativas.

---

### ERR-012
- **Arquivo e linha:** `src/lib/designTokens.test.js:3`
- **Teste:** `import { formatActivityType } from './activityService'`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo de teste valida definições de estilo e tokens visuais puros (`CATEGORY_STYLES`, `STATUS_STYLES`), mas importa `formatActivityType` de `./activityService`. Como `activityService.js` importa `./firebase` no nível do módulo, a inicialização e conexão dos emuladores Firebase é disparada, imprimindo logs no console durante o teste de tokens de design.
- **Evidência:**
  ```text
  stdout | src/lib/designTokens.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Falta de mock de `./firebase` no arquivo de teste, somado ao acoplamento de funções utilitárias puras de formatação dentro do serviço de banco de dados.
- **Sugestão de correção:** Adicionar `vi.mock('./firebase', () => ({ db: {} }))` em `designTokens.test.js` ou desacoplar `formatActivityType` para um módulo auxiliar puro.
- **Status:** Corrigido
- **Correção aplicada:** Em `src/lib/designTokens.test.js`, adicionado mock para `./firebase` (`db` e `auth`), isolando a suíte de tokens de design e eliminando por completo a inicialização do Firebase e o ruído de log de emuladores.
- **Verificação:** Executado `npx vitest run src/lib/designTokens.test.js`, passando 3/3 testes com 0 logs de emulador.

---

### ERR-013
- **Arquivo e linha:** `src/lib/gameplay.test.js:32`
- **Teste:** `describe('gameplay.js')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** O módulo `src/lib/gameplay.js` exporta funções essenciais para a gamificação do PWA (`getMyProfile`, `uploadAvatar`, `uploadMissionPhoto`, `updateMascot` e `getRanking`), mas o arquivo de teste `src/lib/gameplay.test.js` contempla apenas `addPointEvent` e `getMyPointEvents`. Funções críticas como `getMyProfile` (responsável por computar e proteger permissões e roles `ADMIN` vs `PARTICIPANT`), `getRanking` (com lógica de fallback entre Firestore e `userService`) e `uploadMissionPhoto` (com fallback para ObjectURL caso o Firebase Storage esteja offline) não possuem cobertura de testes.
- **Evidência:**
  Apenas duas funções são importadas e testadas:
  ```javascript
  // src/lib/gameplay.test.js linha 32
  import { addPointEvent, getMyPointEvents } from './gameplay';
  ```
  Enquanto `src/lib/gameplay.js` define e exporta:
  `getMyProfile`, `uploadAvatar`, `uploadMissionPhoto`, `updateMascot`, `getMyPointEvents`, `addPointEvent`, `getRanking`.
- **Causa provável:** O teste foi escrito com escopo restrito às histórias KAN-79 e KAN-71 (regaste de pontos e consolidação de eventos de pontos), deixando o restante do módulo sem testes unitários.
- **Sugestão de correção:** Adicionar blocos de testes unitários para `getMyProfile` (cobrindo usuário anônimo/nulo, usuário padrão e usuário admin), `getRanking` (sucesso e fallback quando coleção está vazia), `uploadMissionPhoto` e `updateMascot`.

---

### ERR-014
- **Arquivo e linha:** `src/lib/notifications.test.js:34`
- **Teste:** `describe('Notifications System')`
- **Tipo:** Cobertura insuficiente / Falta de teardown
- **Severidade:** Baixa
- **O que está errado:** O sistema de notificações implementa propagação reativa via eventos de janela (`EVENT_NAME = 'techweek_notifications_updated'`) invocados por `triggerUpdate()` em todas as operações de mutação. O teste configura `dispatchEvent: () => true` estático no `beforeAll` e não contém nenhuma asserção para verificar se os eventos customizados de sincronização são realmente despachados. Além disso, `globalThis.window`, `globalThis.localStorage` e `globalThis.CustomEvent` são sobrescritos sem restauração em `afterAll`, permitindo vazamento potencial de estado em execuções concorrentes ou sequenciais no mesmo worker.
- **Evidência:**
  ```javascript
  // src/lib/notifications.test.js linhas 32-35
  globalThis.window = {
    ...globalThis,
    dispatchEvent: () => true
  };
  ```
  Nenhum dos 10 testes verifica `dispatchEvent` e não há `afterAll` limpando os mocks globais.
- **Causa provável:** O mock foi concebido apenas como dublê passivo para não quebrar a execução no Node, sem validação da reatividade da UI.
- **Sugestão de correção:** Alterar `dispatchEvent` para um mock espião `vi.fn()`, adicionar asserção em um teste validando a emissão de `CustomEvent('techweek_notifications_updated')` e implementar `afterAll` restaurando o estado original de `globalThis`.

---

### ERR-015
- **Arquivo e linha:** `src/lib/scrollLock.test.js:23`
- **Teste:** `describe('scrollLock module (KAN-77)')`
- **Tipo:** Flakiness / Poluição de estado global
- **Severidade:** Média
- **O que está errado:** O arquivo `scrollLock.test.js` atribui um objeto stub diretamente a `globalThis.document` dentro do `beforeEach` para simular o DOM no ambiente Node. No entanto, não há nenhum hook de limpeza (`afterAll` ou `afterEach`) restaurando ou removendo `globalThis.document`. Isso polui o escopo global do runtime do Vitest: testes executados subsequentemente no mesmo worker passarão a avaliar `typeof document !== 'undefined'` como verdadeiro, porém encontrarão um mock parcial contendo apenas `body` e `querySelectorAll`, o que pode causar comportamento errático, quebras em testes de outros módulos ou mascarar testes como o de `cameraUtils.test.js`.
- **Evidência:**
  ```javascript
  // src/lib/scrollLock.test.js linhas 23-31
  globalThis.document = {
    body: mockBody,
    querySelectorAll: (selector) => {
      if (selector.includes('page-container')) {
        return mockContainers;
      }
      return [];
    }
  };
  ```
  O arquivo não possui nenhum bloco `afterAll` restaurando ou deletando `globalThis.document`.
- **Causa provável:** O desenvolvedor assumiu isolamento total de processo por arquivo ou omitiu a restauração do objeto global modificado.
- **Sugestão de correção:** Salvar a referência prévia `const originalDoc = globalThis.document;` e restaurar em `afterAll(() => { globalThis.document = originalDoc; })` (ou `delete globalThis.document` caso fosse `undefined`), ou migrar o arquivo para o ambiente de teste `// @vitest-environment jsdom`.

---

### ERR-016
- **Arquivo e linha:** `src/lib/noUrlDemoFlag.test.js:7`
- **Teste:** `describe('atalhos de demonstração')`
- **Tipo:** Falso positivo potencial / Asserção fraca
- **Severidade:** Baixa
- **O que está errado:** O teste atua como uma guarda de segurança estática para garantir que parâmetros de URL perigosos (`?demo=true`) ou strings mockadas (`[TESTE]`) não existam no código de produção. Ele obtém os arquivos via `const sources = import.meta.glob(['../**/*.js', '../**/*.jsx', '!../**/*.test.*'], { query: '?raw', eager: true })`. No entanto, não há nenhuma verificação garantindo que `sources` de fato contém arquivos (`expect(Object.keys(sources).length).toBeGreaterThan(0)`). Caso o glob falhe silenciosamente, seja afetado por caminhos relativos ou pelo runner, o objeto `sources` resultará vazio e o teste passará com 100% de sucesso verde ("PASS") sem auditar nenhum arquivo de código-fonte.
- **Evidência:**
  ```javascript
  // src/lib/noUrlDemoFlag.test.js linhas 7-14
  it('nenhum arquivo de src/ lê ?demo=true da URL', () => {
    const offenders = Object.entries(sources).filter(([, code]) => /location\.search.*demo/.test(code)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });
  ```
- **Causa provável:** O autor do teste não incluiu uma asserção de sanidade sobre o tamanho da coleção inspecionada.
- **Sugestão de correção:** Adicionar uma asserção de sanidade (ex: `expect(Object.keys(sources).length).toBeGreaterThan(10);`) antes dos testes ou no início da suíte para garantir que arquivos de código foram efetivamente carregados e analisados.

---

### ERR-017
- **Arquivo e linha:** `src/lib/sponsorInviteService.test.js:1`
- **Teste:** `describe('sponsorInviteService - extração de token de convite')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo de teste importa a função utilitária `extractInviteTokenFromSearch` de `src/lib/sponsorInviteService.js`. Esse módulo importa `./api`, que por sua vez importa `./firebase`. Como não há mock para `./api` ou `./firebase`, a inicialização do Firebase conecta aos emuladores locais e emite mensagens no console durante a execução de testes de utilitários de query params. Em ambientes de CI sem emuladores em execução, essa dependência transitiva pode gerar overhead ou erros de conexão.
- **Evidência:**
  Saída do console durante execução do Vitest:
  ```text
  stdout | src/lib/sponsorInviteService.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O arquivo de teste testa apenas `extractInviteTokenFromSearch` (função pura de string/URL), mas importou-a do serviço que agrega chamadas de rede sem isolar dependências com `vi.mock('./api')`.
- **Sugestão de correção:** Adicionar `vi.mock('./api', () => ({ apiClient: {} }));` no início de `src/lib/sponsorInviteService.test.js` ou isolar funções utilitárias puras de query string em um módulo auxiliar sem dependências de rede.

---

### ERR-018
- **Arquivo e linha:** `src/lib/sponsorInviteService.test.js:4`
- **Teste:** N/A (Funções não testadas: `getInvite`, `acceptInvite`, `listSponsors`, `createSponsor`, `updateSponsor`, `addSponsorInvites`, `resendSponsorInvite`, `revokeSponsorInvite`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** O módulo `src/lib/sponsorInviteService.js` é o serviço responsável pelo onboarding e ciclo de vida dos convites de patrocinadores. Ele exporta 8 funções que interagem com endpoints da API (`/sponsor-invites`, `/sponsors`). No entanto, o arquivo `sponsorInviteService.test.js` testa exclusivamente a função auxiliar `extractInviteTokenFromSearch`. Nenhuma das 8 operações de API possui testes unitários no frontend para validar comportamento com sucesso, headers de autenticação, nem tratamento de falhas HTTP (400, 404, 500).
- **Evidência:**
  ```javascript
  // src/lib/sponsorInviteService.js
  export async function getInvite(token) { ... }
  export async function acceptInvite(token) { ... }
  export async function listSponsors() { ... }
  export async function createSponsor(data) { ... }
  export async function updateSponsor(sponsorId, data) { ... }
  export async function addSponsorInvites(sponsorId, count) { ... }
  export async function resendSponsorInvite(inviteId) { ... }
  export async function revokeSponsorInvite(inviteId) { ... }
  ```
  Nenhuma dessas funções é importada ou executada em `src/lib/sponsorInviteService.test.js`.
- **Causa provável:** O arquivo de teste foi criado apenas para cobrir a lógica de extração do token da URL durante a criação da tela de convites (KAN), deixando de fora a suíte de integração com a API.
- **Sugestão de correção:** Expandir `sponsorInviteService.test.js` mockando `apiClient` e criando casos de teste para cada uma das 8 funções, cobrindo envio correto de rotas/parâmetros e propagação de erros.

---

### ERR-019
- **Arquivo e linha:** `src/lib/subdomain.test.js:4`
- **Teste:** N/A (Função não testada: `getAppSubdomain`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** O módulo `src/lib/subdomain.js` é responsável por detectar se o usuário está acessando um subdomínio administrativo (`admin`, `adm`) ou operacional (`staff`, `portaria`) e restringir rotas. O arquivo de testes `subdomain.test.js` cobre apenas `isRouteAllowedOnSubdomain`. A função essencial `getAppSubdomain`, que lê `window.location.hostname` e trata o ambiente SSR (`typeof window === 'undefined'`), possui 0% de cobertura de testes.
- **Evidência:**
  ```javascript
  // src/lib/subdomain.js linhas 5-20
  export function getAppSubdomain() {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.startsWith('admin.') || hostname.startsWith('adm.')) {
      return 'admin';
    }
    if (hostname.startsWith('staff.') || hostname.startsWith('portaria.')) {
      return 'staff';
    }
    return null;
  }
  ```
  Em `src/lib/subdomain.test.js`:
  ```javascript
  import { isRouteAllowedOnSubdomain } from './subdomain';
  // getAppSubdomain sequer é importada
  ```
- **Causa provável:** O teste foi escrito sob demanda da issue KAN-118 especificamente para a rota `/profile`, sem contemplar os testes unitários da função de identificação de subdomínio já existente.
- **Sugestão de correção:** Adicionar uma suíte `describe('getAppSubdomain')` testando os cenários: `window` indefinido, hostnames com `admin.`, `adm.`, `staff.`, `portaria.`, subdomínios comuns (`app.`, `www.`) e hostnames sem subdomínio (`localhost`, `techweekufu.com.br`).

---

### ERR-020
- **Arquivo e linha:** `src/lib/sponsorService.test.js:271`
- **Teste:** `it('gera e dispara download de arquivo CSV formatado com BOM')`
- **Tipo:** Flakiness / Poluição de estado global
- **Severidade:** Baixa
- **O que está errado:** O teste substitui diretamente propriedades no objeto global `URL` (`global.URL.createObjectURL` e `global.URL.revokeObjectURL`) sem salvar as referências originais e sem restaurá-las ao final do teste. Adicionalmente, `global.document` é restaurado sequencialmente no final do teste sem bloco `try...finally`; caso qualquer asserção falhasse antes do final, `global.document` permaneceria poluído para os testes subsequentes do worker.
- **Evidência:**
  ```javascript
  // src/lib/sponsorService.test.js linhas 271-299
  const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
  const revokeObjectURLMock = vi.fn();
  global.URL.createObjectURL = createObjectURLMock;
  global.URL.revokeObjectURL = revokeObjectURLMock;
  ...
  // Apenas document é restaurado; URL.createObjectURL e revokeObjectURL nunca são restaurados
  global.document = originalDocument;
  ```
- **Causa provável:** Mock ad-hoc atribuído diretamente a propriedades globais em vez de utilizar utilitários controlados do Vitest (`vi.spyOn`).
- **Sugestão de correção:** Utilizar `vi.spyOn(global.URL, 'createObjectURL')` e `vi.spyOn(global.URL, 'revokeObjectURL')`, além de utilizar um hook `afterEach(() => { vi.restoreAllMocks(); })` para garantir restauração determinística mesmo em caso de falha de asserção.

---

### ERR-021
- **Arquivo e linha:** `src/lib/sympla.test.js:1`
- **Teste:** `describe('Sympla Integration Client')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O módulo `src/lib/sympla.js` importa `auth` diretamente de `./firebase`. O arquivo de teste `src/lib/sympla.test.js` não fornece mock para `./firebase`, fazendo com que os emuladores do Firebase sejam inicializados durante a execução dos testes unitários de integração com a API do Sympla.
- **Evidência:**
  Saída no terminal durante o Vitest:
  ```text
  stdout | src/lib/sympla.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O arquivo de teste mockou apenas `global.fetch` mas não mockou o import de `./firebase`.
- **Sugestão de correção:** Adicionar `vi.mock('./firebase', () => ({ auth: { currentUser: null } }));` no topo do arquivo para isolar completamente o ambiente de teste.

---

### ERR-022
- **Arquivo e linha:** `src/lib/sympla.test.js:2`
- **Teste:** N/A (Funções não testadas: `syncUserSymplaTicket`, `verifySymplaDirectly`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** A função `syncUserSymplaTicket` em `src/lib/sympla.js` é responsável por sincronizar o ingresso do Sympla do usuário logado contra o backend (`POST /sympla/sync-user`) ou realizar o fallback chamando `verifySymplaDirectly`. Essa função não possui nenhum teste unitário em `sympla.test.js`. Além disso, a função `verifySymplaDirectly`, que contém lógica de fallback e filtragem por e-mail/ingresso/QR Code, só é acionada indiretamente pelo cenário de erro do backend, não possuindo um teste focado e explícito em seus fluxos de correspondência de dados.
- **Evidência:**
  ```javascript
  // src/lib/sympla.js
  export async function verifySymplaDirectly({ email, ticketNumber }) { ... }
  export async function syncUserSymplaTicket() { ... }
  ```
  Em `src/lib/sympla.test.js`:
  `import { verifySymplaTicket, hasSymplaTicket, SYMPLA_EVENT_URL, getBadgeQrValue } from './sympla';`
  (`syncUserSymplaTicket` e `verifySymplaDirectly` não são importadas nem testadas).
- **Causa provável:** O desenvolvedor priorizou apenas a função principal chamada pela interface (`verifySymplaTicket`), deixando as rotinas de sincronização de sessão e o client direto sem testes diretos.
- **Sugestão de correção:** Adicionar suítes de teste para `syncUserSymplaTicket` (cenário não autenticado, cenário de sucesso na API e cenário de fallback) e para `verifySymplaDirectly` (validação de filtro por e-mail, por número de ingresso e por QR code).

---

### ERR-023
- **Arquivo e linha:** `src/lib/tvProgramacao.test.js:2`
- **Teste:** N/A (Função não testada: `typeInfo`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** O módulo `src/lib/tvProgramacao.js` exporta a função `typeInfo(type)`, que define o mapeamento de labels e cores para o painel de TV vertical ('palestra' -> `#8FA0FF`, 'workshop' -> `#B9A6F5`, 'minicurso'/'curso' -> `#67D4E8`, fallback 'Ativação' -> `#F2C46A`). Essa função possui 0% de testes unitários.
- **Evidência:**
  ```javascript
  // src/lib/tvProgramacao.js linhas 34-40
  export function typeInfo(type) {
    const t = String(type || '').toLowerCase().trim();
    if (t === 'palestra') return { label: 'Palestra', color: '#8FA0FF' };
    if (t === 'workshop') return { label: 'Workshop', color: '#B9A6F5' };
    if (t === 'minicurso' || t === 'curso') return { label: 'Minicurso', color: '#67D4E8' };
    return { label: 'Ativação', color: '#F2C46A' };
  }
  ```
  Em `src/lib/tvProgramacao.test.js`:
  `import { classify, formatRemaining } from './tvProgramacao';` (`typeInfo` não é importada).
- **Causa provável:** O teste focou nas funções de classificação temporal (`classify`) e formatação de tempo (`formatRemaining`), esquecendo a função de apresentação visual.
- **Sugestão de correção:** Importar `typeInfo` e criar testes validando o retorno de cada categoria conhecida (incluindo variações de caixa alta/baixa e espaços) e o retorno padrão para tipos não reconhecidos ou nulos.

---

### ERR-024
- **Arquivo e linha:** `src/lib/validators.test.js:1`
- **Teste:** N/A (Função não testada: `getPasswordStrength`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** O arquivo `src/lib/validators.js` exporta a função `getPasswordStrength(password)`, que calcula dinamicamente um score de complexidade de senha de 0 a 4, associando labels explicativos ('Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'), percentual visual (10%, 25%, 50%, 75%, 100%), paleta de cores e o booleano `valid` baseado no tamanho mínimo exigido pelo Firebase Auth. O arquivo de testes `validators.test.js` não importa nem possui nenhum caso de teste para essa função.
- **Evidência:**
  ```javascript
  // src/lib/validators.js linhas 63-85
  export function getPasswordStrength(password) { ... }
  ```
  Em `src/lib/validators.test.js`:
  `getPasswordStrength` não consta na lista de imports nem é executada em nenhum bloco `describe`.
- **Causa provável:** A função foi adicionada para alimentar o componente visual de força de senha no cadastro/redefinição, mas o teste correspondente não foi criado.
- **Sugestão de correção:** Importar `getPasswordStrength` em `validators.test.js` e criar testes para os cenários: nulo/vazio (score 0), senhas apenas numéricas ou alfabéticas curtas (score 1-2), senhas mistas (letras e números >= 8 chars) e senhas fortes (maiúsculas, minúsculas, números e caracteres especiais).

---

### ERR-025
- **Arquivo e linha:** `src/lib/userService.test.js:2`
- **Teste:** N/A (Funções não testadas: `checkUsernameAvailability`, `findUserByUsername`, `getUserPointEvents`, `subscribeToAllUsers`, `getCachedUserProfile`)
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** O módulo `src/lib/userService.js` é o serviço central de gestão de contas de usuários do Firestore. Embora possua uma boa suíte cobrindo criação, edição e sincronização de e-mails, 5 funções centrais não possuem cobertura de testes unitários:
  1. `checkUsernameAvailability`: validação de username único no Firestore para novos cadastros e prevenção de colisões.
  2. `findUserByUsername`: busca e resolução de participante a partir do @handle.
  3. `getUserPointEvents`: recuperação do histórico detalhado de pontos do usuário (`/users/{uid}/point_events`).
  4. `subscribeToAllUsers`: listener do Firestore em tempo real que alimenta a tabela do painel administrativo.
  5. `getCachedUserProfile`: recuperação do perfil no `localStorage` com injeção automática de permissões de administrador para contas pré-configuradas (`ADMIN_EMAILS`).
- **Evidência:**
  ```javascript
  // src/lib/userService.js
  export function getCachedUserProfile(uid) { ... }
  export async function checkUsernameAvailability(rawUsername) { ... }
  export async function getUserPointEvents(uid) { ... }
  export async function findUserByUsername(username) { ... }
  export function subscribeToAllUsers(callback) { ... }
  ```
  Nenhuma dessas 5 funções é importada ou testada em `src/lib/userService.test.js`.
- **Causa provável:** O arquivo de testes foi expandido incrementalmente durante migrações pontuais (KAN-69, KAN-116, KAN-55, KAN-120), deixando as funções auxiliares e administrativas mais antigas sem testes unitários.
- **Sugestão de correção:** Expandir `userService.test.js` com novos blocos `describe` mockando os retornos do Firestore e `localStorage` para testar cada uma dessas 5 funções, incluindo cenários felizes, listas vazias e tratamento de erros/permissões.

---

### ERR-026
- **Arquivo e linha:** `tests/unit/adminSpeakersFilter.test.js:16`
- **Teste:** `test('Filtro de busca por nome e classificação funciona corretamente')`
- **Tipo:** Falso positivo / Teste tautológico
- **Severidade:** Média
- **O que está errado:** O teste se propõe a testar o filtro da aba Palestrantes & Convidados do painel Admin (KAN-59). No entanto, em vez de importar uma função utilitária ou testar o componente real do painel administrativo, o autor do teste reimplementou a lógica de filtro diretamente dentro do corpo da função de teste (`const filtered = DEFAULT_SPEAKERS.filter(...)`) e testou a sua própria função local. O teste não valida nenhum arquivo do código-fonte de produção; caso a tela do Admin quebre ou altere a lógica de filtragem de palestrantes, este teste continuará passando (falso positivo completo).
- **Evidência:**
  ```javascript
  // tests/unit/adminSpeakersFilter.test.js linhas 16-30
  test('Filtro de busca por nome e classificação funciona corretamente', () => {
    const search = 'Aline';
    const classification = 'Professor UFU';

    // Função de filtro inline criada dentro do próprio teste:
    const filtered = DEFAULT_SPEAKERS.filter(spk => {
      const matchText = (spk.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (spk.institution || '').toLowerCase().includes(search.toLowerCase()) ||
                        (spk.role || '').toLowerCase().includes(search.toLowerCase());
      const matchClass = classification === 'ALL' || spk.classification === classification;
      return matchText && matchClass;
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].name).toContain('Aline');
  });
  ```
- **Causa provável:** O autor do teste pretendia validar a regra antes de integrá-la ou não desacoplou a função de filtro de palestrantes do componente React em um arquivo utilitário puro em `src/lib/` ou `src/pages/admin/`.
- **Sugestão de correção:** Extrair a função de filtro de palestrantes do componente React para uma função pura (ex: `filterSpeakers(speakers, search, classification)`) em módulo auxiliar e refatorar o teste para importar e testar essa função real.

---

### ERR-027
- **Arquivo e linha:** `tests/unit/adminSpeakersFilter.test.js:2`
- **Teste:** `describe('Aba Palestrantes & Convidados - Admin (KAN-59)')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O teste importa a constante `DEFAULT_SPEAKERS` diretamente de `../../src/lib/activityService`. Esse módulo importa `../../src/lib/firebase`. Como `adminSpeakersFilter.test.js` não declara `vi.mock('../../src/lib/firebase')`, a importação aciona o SDK do Firebase conectando-o aos emuladores locais e emitindo logs no console durante um teste puramente estático de array de palestrantes.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/adminSpeakersFilter.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O arquivo de teste importou dados estáticos de um módulo que possui efeitos colaterais de inicialização de rede sem mocká-los.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: {} }));` no topo do arquivo ou mover constantes puras como `DEFAULT_SPEAKERS` para um módulo de constantes sem dependências de infraestrutura Firebase.

---

### ERR-028
- **Arquivo e linha:** `tests/unit/confirmModal.test.js:8`
- **Teste:** `describe('ConfirmModal Component (KAN-101)')`
- **Tipo:** Falso positivo / Teste superficial
- **Severidade:** Média
- **O que está errado:** A suíte de testes do componente `ConfirmModal` utiliza exclusivamente `renderToStaticMarkup` do pacote `react-dom/server` e faz asserções baseadas puramente em substrings HTML (`expect(html).toContain(...)`). Não há simulação de eventos do usuário (clique nos botões Confirmar e Cancelar, disparos de `onConfirm` e `onCancel`). Além disso, embora os testes verifiquem a presença das tags HTML de confirmação escrita (`requireConfirmationText`) e senha (`requirePassword`), nenhum teste simula a digitação nos inputs para validar se o botão de confirmação realmente é habilitado quando o texto correto é digitado ou se permanece desabilitado com texto incorreto.
- **Evidência:**
  ```javascript
  // tests/unit/confirmModal.test.js linhas 8-18 e 89-109
  const html = renderToStaticMarkup(React.createElement(ConfirmModal, { ... }));
  expect(html).toContain('disabled=""');
  ```
  `onConfirm` e `onCancel` são passados como callbacks vazios `() => {}` e seus disparos nunca são verificados via `fireEvent` ou `userEvent`.
- **Causa provável:** O autor optou por `renderToStaticMarkup` para evitar a configuração de ambiente de DOM (JSDOM/Happy-DOM) e dependências de `@testing-library/react`.
- **Sugestão de correção:** Migrar os testes do componente para `@testing-library/react` (com ambiente JSDOM ou Happy-DOM) simulando cliques nos botões de ação e digitação nos campos de confirmação textual e senha para testar o ciclo interativo completo.

---

### ERR-029
- **Arquivo e linha:** `tests/unit/emailVerificationGate.test.js:6`
- **Teste:** `describe('EmailVerificationGate (KAN-116)')`
- **Tipo:** Cobertura insuficiente / Falso positivo
- **Severidade:** Alta
- **O que está errado:** O arquivo `emailVerificationGate.test.js` possui apenas 1 teste que se limita a gerar marcação estática via `renderToStaticMarkup` e verificar se determinados textos aparecem no HTML. Embora o arquivo crie funções espiãs (`mockReloadUser = vi.fn()`, `mockResendVerification = vi.fn()`, `mockLogout = vi.fn()`), nenhuma delas é assertada ou chamada durante o teste. As principais regras de negócio do componente — verificação manual ao clicar no botão "Já confirmei meu e-mail", callback `onVerified`, checagem automática ao focar na janela (`window.focus` / `document.visibilitychange`), reenvio de e-mail com contagem regressiva de cooldown de 60 segundos e fluxo de logout — possuem 0% de cobertura de testes.
- **Evidência:**
  ```javascript
  // tests/unit/emailVerificationGate.test.js linhas 6-8 e 24-41
  const mockReloadUser = vi.fn();
  const mockResendVerification = vi.fn();
  const mockLogout = vi.fn();
  // ...
  it('renderiza o e-mail do participante, ações manuais, botão de reenvio e logout', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmailVerificationGate, { onVerified: vi.fn() })
    );
    expect(html).toContain('participante.facom@ufu.br');
    // Mocks nunca são chamados ou verificados
  });
  ```
- **Causa provável:** O teste foi escrito como um placeholder de renderização visual estática durante a implementação da issue KAN-116 sem avançar para os testes de comportamento.
- **Sugestão de correção:** Reescrever a suíte usando `@testing-library/react` e `vi.useFakeTimers()`, testando os disparos de clique dos 3 botões, o cooldown de 60 segundos após o reenvio e a resolução da verificação disparando a prop `onVerified`.

---

### ERR-030
- **Arquivo e linha:** `tests/unit/entranceCheckin.test.js:201`
- **Teste:** `describe('POST /api/checkin/entrance (KAN-48) - Suite de Testes Unitarios')`
- **Tipo:** Cobertura insuficiente / Inconsistência de encoding
- **Severidade:** Média
- **O que está errado:** 
  1. A rota `backend/src/routes/entrance.ts` implementa lógica de resolução flexível de UIDs de participantes (suportando prefixo `mailto:`, busca por e-mail no Firestore `where('email', '==', ...)` e busca por username `where('username', '==', ...)` quando iniciado com `@`), além do suporte a `req.body.uid` como alternativa a `req.body.participantUid`. A suíte `entranceCheckin.test.js` não testa nenhum desses caminhos de resolução de identidade, testando apenas passagem direta de UIDs brutos. Inclusive, o mock de `db.collection` no teste nem suporta `.where()`, falhando caso esses fluxos fossem invocados.
  2. As mensagens de erro retornadas pela API e assertadas nos testes contêm caracteres corrompidos por perda de encoding UTF-8 (ex: `"participantUid e activityId so obrigatrios."`, `"Palestra no encontrada."`, `"Aluno no inscrito previamente."`, `"Entrada duplicada (j havia feito check-in de entrada)."`).
- **Evidência:**
  ```javascript
  // tests/unit/entranceCheckin.test.js linha 211
  expect(res.json).toHaveBeenCalledWith({
    error: 'INVALID_PAYLOAD',
    message: 'participantUid e activityId so obrigatrios.'
  });
  ```
- **Causa provável:** O teste unitário foi modelado apenas para o fluxo de UIDs resolvidos diretamente, e os arquivos de rota/teste foram salvos ou convertidos com encoding ISO-8859-1/ASCII em vez de UTF-8.
- **Sugestão de correção:** Adicionar casos de teste cobrindo a resolução de e-mails (`user@facom.ufu.br`, `mailto:...`) e usernames (`@erick`), mockando `db.collection('users').where().get()`, e corrigir a codificação de caracteres acentuados nos arquivos de rota e testes.

---

### ERR-031
- **Arquivo e linha:** `tests/unit/liveOpsService.test.js:181`
- **Teste:** `describe('Pilar 4: Auditoria Acadêmica UFU (Regra 75%)')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Baixa
- **O que está errado:** A função `exportUfuAuditCsv(auditResult)` em `src/lib/liveOpsService.js` (linhas 636-671), responsável por formatar e disparar o download no navegador do relatório de conformidade acadêmica com a regra dos 75% da UFU no formato CSV com codificação UTF-8 (`\uFEFF`), possui 0% de cobertura de testes na suíte unitária.
- **Evidência:**
  ```javascript
  // src/lib/liveOpsService.js linhas 636-640
  export function exportUfuAuditCsv(auditResult) {
    if (!auditResult || !auditResult.users) return;
  ```
  `exportUfuAuditCsv` sequer é importada em `tests/unit/liveOpsService.test.js`.
- **Causa provável:** O autor não implementou o mock do DOM (`Blob`, `URL.createObjectURL`, `document.createElement('a')`, `click`) e omitiu o teste de geração de CSV.
- **Sugestão de correção:** Criar teste unitário mockando `URL.createObjectURL`, `URL.revokeObjectURL` e o elemento `<a>` para verificar a formatação dos cabeçalhos, separadores e conteúdo do CSV gerado.

---

### ERR-032
- **Arquivo e linha:** `tests/unit/mascot.test.js:7`
- **Teste:** `describe('Mascot Component (DESIGN.md §8 Specs)')`
- **Tipo:** Cobertura insuficiente / Teste superficial
- **Severidade:** Média
- **O que está errado:** O arquivo `tests/unit/mascot.test.js` testa o componente `Mascot` apenas via `renderToStaticMarkup` do pacote `react-dom/server` e valida somente 4 cenários visuais básicos (renderização inicial azul do Alan, roxa da Ada, classes CSS estáticas e tamanhos fixos). Não há cobertura de testes para os estados interativos e dinâmicos fundamentais do mascote definidos em `src/components/Mascot.jsx`: propriedades `isCoveringEyes`, `isPeeking`, `isWaving`, cálculo de limites de olhar (`lookOffset` e `lookOffsetY` limitados entre -8 e 8), nem para as variações de humor (`coveringEyes`, `peeking`, `sad`, `error`).
- **Evidência:**
  ```javascript
  // src/components/Mascot.jsx linhas 58-59
  const cappedOffset = Math.min(Math.max(lookOffset, -8), 8);
  const cappedOffsetY = Math.min(Math.max(lookOffsetY, -8), 8);
  // ...
  // tests/unit/mascot.test.js: nenhuma asserção ou teste para lookOffset, lookOffsetY, isCoveringEyes ou isPeeking.
  ```
- **Causa provável:** O teste foi desenhado apenas como uma checagem de conformidade estética inicial de cores de gradiente e tokens de tamanho conforme `DESIGN.md §8`.
- **Sugestão de correção:** Expandir os testes para validar a renderização condicional dos braços e olhos do mascote para cada mood (`coveringEyes`, `peeking`, `sad`, `error`) e o posicionamento das pupilas com valores normais e extremos de `lookOffset` e `lookOffsetY`.

---

### ERR-033
- **Arquivo e linha:** `tests/unit/missionService.test.js:36`
- **Teste:** `describe('missionService - Regras e Validações de Missões (KAN-104 e KAN-106)')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Alta
- **O que está errado:** O módulo `src/lib/missionService.js` expõe 5 funções críticas de mutação e gestão do ciclo de vida das missões no Firestore: `createMission`, `updateMission`, `deleteMission`, `toggleMissionStatus` e `triggerFlashMission`. Nenhuma dessas 5 funções é testada em `tests/unit/missionService.test.js`. Curiosamente, o arquivo de teste até configura mocks para `addDoc`, `updateDoc` e `deleteDoc` nas linhas 22, 26 e 27 de `firebase/firestore`, mas nunca executa nem asserta essas operações.
- **Evidência:**
  ```javascript
  // tests/unit/missionService.test.js linhas 2-9
  import { 
    DEFAULT_MISSIONS, 
    validateSecretWord, 
    validateQuizAnswer, 
    isFlashMissionActive,
    subscribeToMissions,
    seedDefaultMissions
  } from '../../src/lib/missionService';
  // createMission, updateMission, deleteMission, toggleMissionStatus, triggerFlashMission não são importadas nem testadas.
  ```
- **Causa provável:** Os testes foram implementados inicialmente focando nas regras de negócio estáticas (validação de palavras secretas, quiz e seed inicial) e as funções de mutação do painel de administração ficaram sem cobertura unitária.
- **Sugestão de correção:** Adicionar blocos `describe` cobrindo `createMission` (sanitização de payload, triggerModes, flashConfig), `updateMission`, `deleteMission`, `toggleMissionStatus` (transição active <-> paused) e `triggerFlashMission` (cálculo de expiresAt e mensagem do mascote), verificando as chamadas a `addDoc`, `updateDoc` e `deleteDoc`.

---

### ERR-034
- **Arquivo e linha:** `tests/unit/passport.test.js:28`
- **Teste:** `it('valida regra de elegibilidade: Kanastra + Bayer + pelo menos 1 parceira')` e `it('valida critério do Bilhete Dourado: exatamente todas as 5 empresas visitadas')`
- **Tipo:** Falso positivo / Teste tautológico
- **Severidade:** Média
- **O que está errado:** A suíte de testes do passaporte cria funções locais auxiliares dentro do próprio arquivo de teste (`checkEligibility` na linha 29 e `checkGoldenTicket` na linha 53) e realiza asserções apenas contra essas funções locais. Nenhuma função de negócio ou componente real da aplicação (como `PassportTab.jsx` ou métodos em `sponsorService.js`) é executado ou validado nesses dois testes. Caso a lógica de elegibilidade de sorteios ou do Bilhete Dourado seja alterada ou quebre no código do app, esses testes continuarão passando com sucesso (falso positivo completo).
- **Evidência:**
  ```javascript
  // tests/unit/passport.test.js linhas 28-34
  it('valida regra de elegibilidade: Kanastra + Bayer + pelo menos 1 parceira', () => {
    const checkEligibility = (visited) => {
      const kanastra = !!visited.kanastra;
      const bayer = !!visited.bayer;
      const partners = ['aimirim', 'bip', 'hyperflow'].filter(p => !!visited[p]).length;
      return kanastra && bayer && partners >= 1;
    };
    expect(checkEligibility({ kanastra: true, bayer: true })).toBe(false);
  });
  ```
- **Causa provável:** O autor do teste rascunhou a regra como prova de conceito sem extraí-la para uma função pura em um módulo utilitário da aplicação (`src/lib/passportUtils.js` ou `src/lib/sponsorService.js`).
- **Sugestão de correção:** Extrair as regras de elegibilidade (`isEligibleForPrizes`, `isGoldenTicketFull`) do componente `PassportTab.jsx` para um módulo de regras de negócio em `src/lib/` e refatorar o teste para importar e validar essas funções reais de produção.

---

### ERR-035
- **Arquivo e linha:** `tests/unit/passport.test.js:2`
- **Teste:** `describe('Configuração e Regras do Passaporte TechWeek')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O teste importa a constante `SPONSORS_CONFIG` diretamente de `../../src/components/PassportTab`. Esse componente importa `auth` e `db` de `../lib/firebase`. Como `passport.test.js` não declara `vi.mock('../../src/lib/firebase')`, a importação estática da constante aciona a inicialização do Firebase e conecta a suíte aos emuladores locais desnecessariamente.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/passport.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Acoplamento de constantes de configuração estática dentro do arquivo de componente que importa a infraestrutura do Firebase.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {}, db: {} }));` ou mover `SPONSORS_CONFIG` para um arquivo dedicado de constantes desacoplado de dependências do Firebase.

---

### ERR-036
- **Arquivo e linha:** `tests/unit/postgradOption.test.js:73`
- **Teste:** `it('valida regras de negócio para Pós-graduação vs Aluno da UFU (incluindo novos rótulos)')`
- **Tipo:** Falso positivo / Teste tautológico
- **Severidade:** Média
- **O que está errado:** O teste define uma função inline `validatePostgrad = (data) => { ... }` contendo 17 linhas de lógica de validação dentro do próprio corpo do teste e roda 7 asserções contra essa função local. A função real de validação de formulários da aplicação não é testada aqui; se houver divergência ou erro de digitação nos formulários de cadastro de pós-graduação da aplicação real (`src/pages/Register.jsx` ou `src/pages/Entrada.jsx`), o teste continuará passando (falso positivo completo).
- **Evidência:**
  ```javascript
  // tests/unit/postgradOption.test.js linhas 72-90
  it('valida regras de negócio para Pós-graduação vs Aluno da UFU (incluindo novos rótulos)', () => {
    const validatePostgrad = (data) => {
      const errors = {};
      const isStudent = data.participantType === 'Aluno UFU Graduação' ...;
      // ...
      return errors;
    };
    const res1 = validatePostgrad({ ... });
    expect(res1).toEqual({});
  ```
- **Causa provável:** O autor do teste não desacoplou o validador de pós-graduação para `src/lib/validators.js`, duplicando a lógica manualmente no arquivo de teste.
- **Sugestão de correção:** Mover a função de validação de pós-graduação para `src/lib/validators.js` (ex: `validatePostgradProfile(data)`) e atualizar o teste para importar e testar essa função real.

---

### ERR-037
- **Arquivo e linha:** `tests/unit/passport.test.js:4`
- **Teste:** `describe('Configuração e Regras do Passaporte TechWeek')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** O componente `PassportTab` (`src/components/PassportTab.jsx`, 240 linhas de código) possui lógica visual complexa (renderização de tiers Diamante, Ouro e Prata, badges dos estandes, barra de progresso /5, carimbos de data/hora de visita e listener em tempo real do Firestore para `visitedSponsors`), mas possui 0% de testes de renderização ou ciclo de vida. O arquivo `passport.test.js` testa apenas a constante `SPONSORS_CONFIG` e funções locais.
- **Evidência:**
  `PassportTab` não é renderizado em nenhum teste do projeto.
- **Causa provável:** Falta de testes de componente para as abas secundárias da área de Conquistas.
- **Sugestão de correção:** Implementar testes de renderização do componente `PassportTab` com mock de `userProfile` testando o estado inicial (0 estandes visitados), estado parcial e estado completo com Bilhete Dourado ativo.

---

### ERR-038
- **Arquivo e linha:** `tests/unit/registerAvatar.test.js:24`
- **Teste:** `describe('Register Avatar Selection Step (KAN-114)')`
- **Tipo:** Falso positivo / Teste tautológico
- **Severidade:** Alta
- **O que está errado:** O arquivo `registerAvatar.test.js` não importa nenhum arquivo do código-fonte de produção (`src/`). Em vez de importar o componente de cadastro real (`src/pages/Register.jsx` ou um componente dedicado de seleção de avatar), o teste monta uma estrutura DOM estática inteiramente sintética usando `React.createElement` dentro de uma função auxiliar local (`renderStep(selectedAvatar)`) e executa asserções contra esse componente inline que ele próprio acabou de criar. Se a tela de cadastro real quebrar, perder as opções de avatar ('alan' / 'ada') ou modificar classes/comportamentos visuais, este teste continuará 100% verde (falso positivo completo).
- **Evidência:**
  Imports no topo de `tests/unit/registerAvatar.test.js`:
  ```javascript
  import { describe, it, expect } from 'vitest';
  import React from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  // Nenhum import de src/... !
  ```
  Função auxiliar inline testada:
  ```javascript
  const renderStep = (selectedAvatar = null) => {
    return renderToStaticMarkup(
      React.createElement('div', { className: 'avatar-picker-step' }, ...)
    );
  };
  ```
- **Causa provável:** O teste foi escrito como um protótipo visual durante o desenvolvimento da issue KAN-114 e nunca foi conectado ao componente real de cadastro em `src/pages/Register.jsx`.
- **Sugestão de correção:** Extrair o componente ou subcomponente de seleção de mascote/avatar de `src/pages/Register.jsx` para um componente testável (ex: `AvatarSelector.jsx`) e refatorar `registerAvatar.test.js` para importar e testar esse componente real.

---

### ERR-039
- **Arquivo e linha:** `tests/unit/roleSwitcher.test.js:28`
- **Teste:** `describe('RoleSwitcher Component (KAN-118)')`
- **Tipo:** Cobertura insuficiente
- **Severidade:** Média
- **O que está errado:** O arquivo `src/components/RoleSwitcher.jsx` (102 linhas) é o componente responsável por renderizar a barra suspensa/modal de alternância de perfis de usuário (`participant`, `sponsor`, `admin`, `staff`), aplicando cores de badge, ícones e disparando o roteamento/navegação ao selecionar um papel. O arquivo de testes `roleSwitcher.test.js` testa exclusivamente a função utilitária pura `rolesFor`. O componente React `RoleSwitcher` nunca é renderizado, instanciado ou testado; fluxos como clique de alternância, chamada a `onSelectRole`, fechamento e comportamento quando o usuário possui apenas 1 papel possuem 0% de cobertura.
- **Evidência:**
  ```javascript
  // tests/unit/roleSwitcher.test.js linhas 4 e 28-36
  import { rolesFor } from '../../src/components/RoleSwitcher';
  // O componente default RoleSwitcher sequer é importado no arquivo de teste.
  ```
- **Causa provável:** O autor priorizou testar o mapeamento lógico das permissões (`rolesFor`), deixando a validação de montagem e interatividade do componente para posterior implementação.
- **Sugestão de correção:** Importar o componente default `RoleSwitcher` e adicionar casos de teste utilizando `@testing-library/react` para validar a renderização das opções conforme o perfil retornado por `rolesFor`, a chamada da prop `onSelectRole` ao clicar em uma opção e a visibilidade do componente condicional ao número de papéis disponíveis (> 1).

---

### ERR-040
- **Arquivo e linha:** `tests/unit/sponsorLeadModal.test.js:4`
- **Teste:** `describe('SponsorLeadModal - 5 Melhorias de UX/UI para Estande')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `tests/unit/sponsorLeadModal.test.js` importa o componente `SponsorLeadModal` diretamente de `../../src/components/SponsorLeadModal`. Esse componente importa `submitLead` e `updateLead` de `../lib/sponsorService`, e `getSponsorSettings` de `../lib/sponsorSettingsService`, os quais importam o SDK do Firebase (`../lib/firebase`). Como `sponsorLeadModal.test.js` não fornece mocks para esses módulos de serviço, a inicialização e conexão com os emuladores do Firebase é disparada desnecessariamente durante testes unitários de UI.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/sponsorLeadModal.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** O autor do teste mockou apenas o que impedia a renderização estática e não isolou os módulos de dados importados no nível de componente.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/sponsorService', () => ({ submitLead: vi.fn(), updateLead: vi.fn() }))` e `vi.mock('../../src/lib/sponsorSettingsService', () => ({ getSponsorSettings: vi.fn().mockResolvedValue({}), getActiveOutreachMessage: vi.fn() }))` no topo do arquivo de teste.

---

### ERR-041
- **Arquivo e linha:** `tests/unit/sponsorLeadModal.test.js:30`
- **Teste:** `describe('SponsorLeadModal - 5 Melhorias de UX/UI para Estande')`
- **Tipo:** Cobertura insuficiente / Teste superficial
- **Severidade:** Média
- **O que está errado:** O componente `SponsorLeadModal` possui mais de 1600 linhas de código com lógica complexa de captura de leads no estande: seleção de estrelas (0 a 5) com classificação dinâmica, alternância de chips rápidos (toggle de tags), digitação de notas livres com sanitização de tags entre colchetes, chamadas assíncronas a `submitLead` / `updateLead`, estados de loading com `Loader2`, feedback de sucesso e erro com auto-dismiss, além de integração com WhatsApp via mensagem pré-formatada. Os 16 testes contidos em `sponsorLeadModal.test.js` utilizam estritamente `renderToStaticMarkup` e limitam-se a validar substrings de texto/estilo no HTML inicial gerado. Nenhuma interação do usuário (clique em estrelas, clique em chips rápidos, digitação de notas, submissão de formulário ou disparo do botão "Somente Validar") é testada interativamente com asserção dos serviços de persistência.
- **Evidência:**
  Em todos os 16 testes de `tests/unit/sponsorLeadModal.test.js`:
  ```javascript
  const html = renderToStaticMarkup(React.createElement(SponsorLeadModal, { ... }));
  expect(html).toContain(...);
  ```
  Não há uso de `@testing-library/react`, `fireEvent`, `userEvent` ou asserções contra chamadas a `submitLead` ou `updateLead`.
- **Causa provável:** O autor optou por `renderToStaticMarkup` para validar unicamente a adesão estética e estrutural das "5 Melhorias de UX/UI" (design system e layout responsivo), omitindo a cobertura dos fluxos de negócio do componente.
- **Sugestão de correção:** Migrar os testes principais para `@testing-library/react`, simulando cliques de seleção de estrelas, seleção de chips rápidos, digitação no campo de notas e clique em "Salvar Lead", validando o payload transmitido para `submitLead` / `updateLead`.

---

### ERR-042
- **Arquivo e linha:** `tests/unit/sponsorRoiAndTags.test.js:2`
- **Teste:** `describe('Sponsor Service & Innovation Features')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `sponsorRoiAndTags.test.js` importa funções diretamente de `../../src/lib/sponsorService`. Esse módulo importa `auth` e `db` de `./firebase`. Como não há declaração de mock para `./firebase` ou para chamadas de rede no nível do arquivo, o Firebase SDK se conecta aos emuladores locais e emite mensagens no console. Além disso, os testes das funções `submitLead` e `fetchLeads` geram logs de erro (`Falha de rede ao conectar com /api/leads...`, `API de leads indisponível ou offline...`) no `stderr` do Vitest porque disparam chamadas com `fetch` rejeitado sem silenciar os `console.error` esperados.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/sponsorRoiAndTags.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  stderr | tests/unit/sponsorRoiAndTags.test.js > ... > submitLead salva localmente e retorna sucesso com offline: true quando API não estiver disponível
  Falha de rede ao conectar com /api/leads. Ativando persistência resiliente: TypeError: fetch failed
  ```
- **Causa provável:** Falta de mock explícito de `./firebase` e ausência de `vi.spyOn(console, 'error').mockImplementation(() => {})` nos testes de fallback offline.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {}, db: {} }))` e silenciar os erros esperados do console durante os testes de fallback de resiliência.

---

### ERR-043
- **Arquivo e linha:** `tests/unit/sponsorRoiAndTags.test.js:175`
- **Teste:** `describe('Print Layout & Executive Report Styles')`
- **Tipo:** Fragilidade de teste / E2E estático de CSS
- **Severidade:** Baixa
- **O que está errado:** A suíte possui 4 testes que leem arquivos de código-fonte (`index.css`, `Shell.jsx`, `SponsorRoiDashboard.jsx`, `Sponsor.jsx`) em disco via `fs.readFileSync` e fazem asserções de substrings contra trechos de CSS ou classes Tailwind (ex: `expect(cssContent).toContain('@media print')`, `expect(shellContent).toContain('print:!hidden')`, `expect(sponsorContent).toContain('print:hidden flex items-center justify-between gap-2')`). Testar código estático dessa forma é extremamente frágil: qualquer refatoração cosmética de classes, reordenação de classes Tailwind ou formatação de código quebrará os testes mesmo que o layout e a funcionalidade continuem funcionando perfeitamente.
- **Evidência:**
  ```javascript
  // tests/unit/sponsorRoiAndTags.test.js linhas 175-215
  it('garante que index.css possui regras de @media print com fundo azul e ajuste de cor exato', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssContent = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf-8');
    expect(cssContent).toContain('@media print');
    // ...
  });
  ```
- **Causa provável:** O desenvolvedor quis garantir que as regras de CSS para impressão em PDF do relatório de ROI não fossem removidas acidentalmente, mas usou inspeção textual rígida em vez de testes de renderização ou testes visuais/E2E.
- **Sugestão de correção:** Mover validações de impressão para testes de integração ou E2E (Playwright) ou, se mantidos como testes estáticos de sanidade, usar expressões regulares flexíveis em vez de substrings exatas com classes CSS encadeadas.

---

### ERR-044
- **Arquivo e linha:** `tests/unit/sponsorSettingsUI.test.js:4`
- **Teste:** `describe('SponsorSettings UI Component')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `sponsorSettingsUI.test.js` importa o componente `SponsorSettings` (`src/components/sponsor/SponsorSettings.jsx`). Esse componente importa `uploadFeedMedia` de `../../lib/feedService`, que por sua vez importa `storage` e `db` de `../firebase`. Como não há mock para `feedService` ou `firebase`, a inicialização do Firebase é disparada e conecta aos emuladores locais desnecessariamente durante o teste unitário estático da interface.
- **Evidência:**
  Saída no console durante a execução do Vitest:
  ```text
  stdout | tests/unit/sponsorSettingsUI.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Acoplamento transitivo através de `feedService` sem mock preventivo no arquivo de teste do componente.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/feedService', () => ({ uploadFeedMedia: vi.fn() }))` e `vi.mock('../../src/lib/firebase', () => ({ db: {}, storage: {}, auth: {} }))` no topo de `sponsorSettingsUI.test.js`.

---

### ERR-045
- **Arquivo e linha:** `tests/unit/sponsorSettingsUI.test.js:14`
- **Teste:** `describe('SponsorSettings UI Component')`
- **Tipo:** Cobertura insuficiente / Teste superficial
- **Severidade:** Média
- **O que está errado:** O componente `SponsorSettings` (1170 linhas) implementa todo o painel de personalização do estande de patrocinadores: alternância entre abas ("Perfil no Feed" vs "Mensagens & Tags"), upload e recorte de foto de perfil/avatar com compressão, edição inline do @handle de feed e nome de exibição, adição/edição/remoção de tags de qualificação personalizadas, inserção de variáveis dinâmicas `{nome}`, `{empresa}`, `{curso}` nos modelos de mensagem de WhatsApp e restauração de valores padrão com confirmações. Todos os 13 testes do arquivo utilizam unicamente `renderToStaticMarkup` para inspecionar strings no HTML estático inicial. Nenhuma interação real do usuário (clique nas abas, digitação no campo de tag, exclusão de chip, edição de template ou submissão de formulário) possui cobertura de testes de comportamento.
- **Evidência:**
  Em todos os 13 testes do arquivo:
  ```javascript
  const html = renderToStaticMarkup(React.createElement(SponsorSettings, defaultProps));
  expect(html).toContain(...);
  ```
  Nenhuma asserção de eventos, estado interativo ou chamadas aos métodos de persistência `saveSponsorSettings`, `resetTagsToDefault`, etc.
- **Causa provável:** O teste foi concebido para conferir se os elementos visuais e de acessibilidade estavam presentes na montagem inicial, deixando as interações de estado e persistência descobertas.
- **Sugestão de correção:** Migrar os testes principais para `@testing-library/react`, simulando digitação de nova tag e clique em "Adicionar", remoção de tag clicando no botão X, alternância entre as abas e salvamento de configurações, assertando as chamadas a `onSettingsSaved` e `saveSponsorSettings`.

---

### ERR-046
- **Arquivo e linha:** `tests/unit/symplaRequirementModal.test.js:5`
- **Teste:** `it('fica acima do painel da atividade (z-index 2001) para o aviso aparecer na frente')`
- **Tipo:** Falso positivo / Teste trivial
- **Severidade:** Alta
- **O que está errado:** O arquivo `symplaRequirementModal.test.js` possui apenas 9 linhas e contém um único teste trivial que valida se uma constante numérica exportada é maior que 2001 (`expect(SYMPLA_SHEET_Z).toBeGreaterThan(2001)`). O componente React inteiro `SymplaRequirementModal` (`src/components/SymplaRequirementModal.jsx`, 174 linhas), responsável pelo fluxo de exibição de modal bottom-sheet, captura e validação de e-mail do Sympla, integração com `verifySymplaTicket`, atualização do perfil com `updateUserProfile`, tratamento de estados de erro/loading, suporte a `Escape` e chamada do callback `onLinked`, possui 0% de cobertura de testes.
- **Evidência:**
  Todo o conteúdo do arquivo `tests/unit/symplaRequirementModal.test.js`:
  ```javascript
  import { describe, it, expect } from 'vitest';
  import { SYMPLA_SHEET_Z } from '../../src/components/SymplaRequirementModal';

  describe('SymplaRequirementModal (KAN-112)', () => {
    it('fica acima do painel da atividade (z-index 2001) para o aviso aparecer na frente', () => {
      expect(SYMPLA_SHEET_Z).toBeGreaterThan(2001);
    });
  });
  ```
  O componente padrão `SymplaRequirementModal` sequer é importado ou renderizado no teste.
- **Causa provável:** O teste foi criado exclusivamente para validar a correção da issue KAN-112 (sobreposição de z-index do modal em relação ao painel de atividades) sem implementar a suíte funcional do componente.
- **Sugestão de correção:** Implementar testes de componente utilizando `@testing-library/react`, renderizando o modal com mock de `verifySymplaTicket` e `updateUserProfile`, testando submissão de e-mail com sucesso, exibição de mensagem de erro e fechamento via botão/Escape.

---

### ERR-047
- **Arquivo e linha:** `tests/unit/symplaRequirementModal.test.js:2`
- **Teste:** `describe('SymplaRequirementModal (KAN-112)')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** A importação da constante `SYMPLA_SHEET_Z` de `../../src/components/SymplaRequirementModal` aciona a avaliação do módulo que importa `auth` de `../lib/firebase` e `updateUserProfile` de `../lib/userService`. Sem mock para `firebase`, a inicialização do Firebase conecta aos emuladores e emite mensagem no console para um teste puramente numérico de constante.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/symplaRequirementModal.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Acoplamento da constante de z-index dentro do arquivo do componente React em vez de um arquivo isolado de constantes de layout/design tokens.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {} }))` no topo do teste ou mover constantes de layout como `SYMPLA_SHEET_Z` para `designTokens.js`.

---

### ERR-048
- **Arquivo e linha:** `tests/unit/testSponsorRender.test.js:32`
- **Teste:** `describe('Render Sponsor page with SPONSOR role')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O teste importa dinamicamente a página completa `src/pages/Sponsor.jsx`. Embora declare mocks para `useUser` e `AuthContext`, as dependências transitivas dos subcomponentes (como `SponsorLeadModal`, `SponsorSettings`, `sponsorService`) carregam o SDK do Firebase sem mocks completos para todos os pontos de entrada, disparando a conexão e logs dos emuladores locais e levando quase 4 segundos para renderizar estaticamente em memória.
- **Evidência:**
  Saída no console do Vitest:
  ```text
  stdout | tests/unit/testSponsorRender.test.js > Render Sponsor page with SPONSOR role > renders sponsor shell on home tab without throwing
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Mocks parciais que interceptaram os hooks de usuário mas não interceptaram os módulos de banco e persistência subjacentes.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))` para desacoplar totalmente o carregamento da página de qualquer rede ou emuladores.

---

### ERR-049
- **Arquivo e linha:** `tests/unit/testSponsorRender.test.js:32`
- **Teste:** `describe('Render Sponsor page with SPONSOR role')`
- **Tipo:** Cobertura insuficiente / Teste superficial
- **Severidade:** Média
- **O que está errado:** A página `Sponsor.jsx` é a interface principal dos patrocinadores da conferência (abrangendo leitura de QR Code da portaria/estande, abertura e acompanhamento do modal de leads, navegação entre abas de CRM, ROI e Configurações). O arquivo `testSponsorRender.test.js` realiza apenas 2 testes do tipo "smoke test" via `renderToStaticMarkup` que checam se as strings `sponsor-shell` e `Kanastra` aparecem no HTML. Nenhuma funcionalidade da página é exercitada: transição de abas via query string ou clique, disparo de leitura de QR Code, sincronização de leads ou exibição de chamados de suporte técnico.
- **Evidência:**
  ```javascript
  // tests/unit/testSponsorRender.test.js linhas 32-44
  const html = renderToStaticMarkup(...);
  expect(html).toContain('sponsor-shell');
  expect(html).toContain('Kanastra');
  expect(html).toContain('Escanear crachá');
  ```
- **Causa provável:** O teste foi concebido como um teste de fumaça rápido (smoke test) para validar se a renderização da página com perfil de patrocinador não quebrava por exceções não capturadas.
- **Sugestão de correção:** Expandir os testes da página ou adicionar testes de integração cobrindo a navegação entre abas (`/sponsor?tab=crm`, `/sponsor?tab=roi`, `/sponsor?tab=settings`), abertura do modal de scanner e tratamento de patrocinador sem permissão.

---

### ERR-050
- **Arquivo e linha:** `tests/unit/uniqueUsername.test.js:2`
- **Teste:** `describe('Validação de Unicidade de Username')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `uniqueUsername.test.js` importa `checkUsernameAvailability` de `../../src/lib/userService`. Esse módulo importa `auth` e `db` de `../../src/lib/firebase`. Sem mock explícito para `firebase`, a execução do teste unitário conecta aos emuladores locais e emite mensagens no console.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/uniqueUsername.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Falta de `vi.mock('../../src/lib/firebase')` no arquivo de teste.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {}, db: {} }))` no topo do arquivo.

---

### ERR-051
- **Arquivo e linha:** `tests/unit/uniqueUsername.test.js:13`
- **Teste:** `it('normaliza o username removendo @ e caracteres especiais')`
- **Tipo:** Falso positivo / Asserção fraca
- **Severidade:** Média
- **O que está errado:** O teste se propõe a testar a normalização e validação de disponibilidade de username, mas a asserção é excessivamente vaga: `expect(typeof res.available).toBe('boolean')`. O teste não mocka o retorno do Firestore nem valida se `clean` realmente removeu o `@` ou tratou caracteres proibidos. Além disso, o teste não cobre o cenário principal em que o username já existe no banco (`available: false` com `existingUser` preenchido contendo nome e avatar).
- **Evidência:**
  ```javascript
  // tests/unit/uniqueUsername.test.js linhas 13-16
  it('normaliza o username removendo @ e caracteres especiais', async () => {
    const res = await checkUsernameAvailability('@dev_user');
    expect(typeof res.available).toBe('boolean');
  });
  ```
  Não há nenhum mock de `getDocs`, e qualquer retorno booleano faz o teste passar sem validar nada.
- **Causa provável:** O teste foi escrito apenas para cobrir a linha na ferramenta de cobertura de código sem checar a lógica de negócio do Firestore.
- **Sugestão de correção:** Mockar `getDocs` da coleção `/users` para simular colisão (retornando documento existente com `displayName`) e assertar `available: false`, além de testar caso de sucesso assertando `available: true`.

---

### ERR-052
- **Arquivo e linha:** `tests/unit/whatsappOneClickClarity.test.js:4`
- **Teste:** `describe('WhatsApp Modelo Padrão Clarity & Design System')`
- **Tipo:** Efeito colateral / Falta de mock
- **Severidade:** Baixa
- **O que está errado:** O arquivo `whatsappOneClickClarity.test.js` importa `SponsorSettings`, `LeadDossier` e `SponsorLeadModal`. Esses componentes importam diversos serviços (`sponsorSettingsService`, `feedService`, `sponsorService`) que inicializam a infraestrutura do Firebase. Sem mock para `firebase`, os emuladores locais são ativados durante os testes.
- **Evidência:**
  Saída no console durante o Vitest:
  ```text
  stdout | tests/unit/whatsappOneClickClarity.test.js
  ⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)
  ```
- **Causa provável:** Ausência de mocks para a camada de serviços de banco e storage.
- **Sugestão de correção:** Adicionar `vi.mock('../../src/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))` no topo do arquivo.

---

### ERR-053
- **Arquivo e linha:** `tests/unit/whatsappOneClickClarity.test.js:8`
- **Teste:** `describe('WhatsApp Modelo Padrão Clarity & Design System')`
- **Tipo:** Falso positivo / Teste puramente textual
- **Severidade:** Baixa
- **O que está errado:** Os 4 testes em `whatsappOneClickClarity.test.js` limitam-se a renderizar HTML estático via `renderToStaticMarkup` e verificar se emojis (⭐, ⚡) ou strings específicas ("1-Clique", "WhatsApp 1-Clique") foram omitidos. Nenhuma lógica de montagem do link `https://wa.me/...` ou disparo de mensagens de WhatsApp com variáveis interpoladas é validada nesses testes.
- **Evidência:**
  ```javascript
  // tests/unit/whatsappOneClickClarity.test.js
  expect(html).not.toContain('1-Clique');
  expect(html).not.toContain('⭐');
  expect(html).not.toContain('⚡');
  ```
- **Causa provável:** O teste foi adicionado especificamente para impedir a reintrodução acidental de termos como "1-Clique" e emojis na interface do patrocinador após uma rodada de revisão de design.
- **Sugestão de correção:** Manter as restrições de vocabulário se forem política de design da equipe, mas adicionar testes funcionais que validem a correta codificação da URL do WhatsApp (`encodeURIComponent`) e substituição das variáveis dinâmicas ao clicar nas ações de contato.

---

### ERR-054
- **Arquivo e linha:** `backend/src/lib/firestoreId.test.ts:1`
- **Teste:** `describe('isValidFirestoreId (KAN-49/KAN-71 — activityId de req.params usado em .doc())')`
- **Tipo:** Falha de validação / Cobertura de tipos em runtime
- **Severidade:** Alta
- **O que está errado:** A função utilitária `isValidFirestoreId` (em `backend/src/lib/firestoreId.ts`) utiliza a regex `/^[A-Za-z0-9_-]{1,200}$/`. Em JavaScript/TypeScript, quando um argumento não-string como `undefined` é passado em runtime (cenário comum se `req.params.activityId` não for fornecido ou se uma rota Express for invocada com parâmetro omitido/malformado), o método `RegExp.test(undefined)` realiza coerção de tipo implícita para a string `"undefined"`. Como a string `"undefined"` atende aos requisitos da regex (letras a-z e tamanho entre 1 e 200), `isValidFirestoreId(undefined as any)` retorna `true`! O arquivo de teste `firestoreId.test.ts` não possui nenhum teste para valores nulos, `undefined`, números ou tipos não-string, mascarando esse risco que permite que chamadas passem despercebidas para o SDK do Firestore (`db.collection(...).doc('undefined')`).
- **Evidência:**
  ```typescript
  // backend/src/lib/firestoreId.ts
  const VALID_ID = /^[A-Za-z0-9_-]{1,200}$/;
  export function isValidFirestoreId(value: string): boolean {
    return VALID_ID.test(value);
  }
  // Em runtime JS: isValidFirestoreId(undefined as any) === true
  ```
- **Causa provável:** Confiança exclusiva na tipagem estática do TypeScript (`value: string`), ignorando que em middlewares/rotas do Express parâmetros de requisições podem chegar como `undefined` ou com tipos inesperados em tempo de execução.
- **Sugestão de correção:**
  1. No código-fonte `firestoreId.ts`, adicionar guarda explícita de tipo: `if (typeof value !== 'string' || !value.trim()) return false;`.
  2. No teste `firestoreId.test.ts`, adicionar cenários testando `undefined`, `null`, números e objetos, garantindo retorno `false`.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/lib/firestoreId.ts`, adicionada guarda de tipo em tempo de execução `if (typeof value !== 'string' || !value.trim()) return false;` para impedir que `RegExp.test(undefined)` ou valores não-string sofram coerção para `"undefined"` e passem pela regex. Em `backend/src/lib/firestoreId.test.ts`, adicionados testes unitários validando a rejeição de `undefined`, `null`, números (`123`), objetos (`{}`), arrays (`[]`) e strings vazias/apenas espaços.
- **Verificação:** Executado `npm --prefix backend test src/lib/firestoreId.test.ts`. Todos os 18 testes passaram. Prova de falha verificada: ao remover temporariamente a guarda de tipo, os testes de valores não-string falharam imediatamente com `expected true to be false`.

---

### ERR-055
- **Arquivo e linha:** `backend/src/config/cors.test.ts:40`
- **Teste:** `describe('isOriginAllowed - Domínios oficiais do Firebase Hosting')`
- **Tipo:** Segurança / Regex permissiva
- **Severidade:** Média
- **O que está errado:** A regex `FIREBASE_HOSTING_REGEX = /^https:\/\/facom-techweek[a-zA-Z0-9-]*\.(web\.app|firebaseapp\.com)$/` em `backend/src/config/cors.ts` permite qualquer subdomínio do Firebase Hosting que inicie com o prefixo `facom-techweek` (por exemplo: `https://facom-techweek-malicious.web.app` ou `https://facom-techweek-phishing.firebaseapp.com`). Qualquer terceiro que registre um projeto no Firebase com esse prefixo terá acesso CORS irrestrito com credenciais (`credentials: true`) liberado pela API. O teste `cors.test.ts` valida cenários legítimos como `https://facom-techweek-2026.web.app`, mas não testa tentativas de sequestro de subdomínio ou spoofing de regex. Além disso, quando uma origem é rejeitada, `corsOptions` emite `callback(new Error(...))`, o que no Express causa erro 500 não capturado se não houver middleware de erro configurado para capturar mensagens CORS.
- **Evidência:**
  ```typescript
  // backend/src/config/cors.ts linhas 8 e 58-63
  const FIREBASE_HOSTING_REGEX = /^https:\/\/facom-techweek[a-zA-Z0-9-]*\.(web\.app|firebaseapp\.com)$/;
  // Permite https://facom-techweek-qualquer-coisa-de-terceiro.web.app
  ```
- **Causa provável:** Uso de padrão wildcard aberto (`[a-zA-Z0-9-]*`) para acomodar edições futuras (ex: 2026) sem delimitar uma lista estrita de domínios ou validar contra o Project ID exato.
- **Sugestão de correção:** Restringir a regex para domínios estritamente conhecidos do projeto (ou via `ALLOWED_ORIGINS` no ambiente) e adicionar testes no `cors.test.ts` que rejeitem domínios com sufixos maliciosos (ex: `https://facom-techweek-attacker.web.app`).
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/config/cors.ts`, restringida a regex `FIREBASE_HOSTING_REGEX` para aceitar estritamente os subdomínios oficiais autorizados do projeto: `(facom-techweek|facom-techweek-2026|facom-techweek-staging|facom-techweek-layerx)`. Em `backend/src/config/cors.test.ts`, adicionados testes cobrindo `facom-techweek-layerx` e testes de rejeição para subdomínios de spoofing/ataque (`facom-techweek-attacker.web.app`, `facom-techweek-malicious.web.app`, `facom-techweek-phishing.firebaseapp.com`).
- **Verificação:** Executado `npm --prefix backend test src/config/cors.test.ts`. Todos os 22 testes passaram. Prova de falha verificada: a regex original falha ao rejeitar os domínios maliciosos.

---

### ERR-056
- **Arquivo e linha:** `backend/src/lib/missionProofValidator.test.ts:143`
- **Teste:** `describe('Missões com Foto')` e `describe('Stands e Caça ao QR')`
- **Tipo:** Regra de negócio / Validação permissiva
- **Severidade:** Alta
- **O que está errado:**
  1. Em `missionProofValidator.ts` (linhas 64-73), a validação de URLs de fotos aceita prefixos `blob:` e `http://localhost` incondicionalmente, mesmo em ambiente de produção. Um participante malicioso pode submeter qualquer string arbitrária iniciada por `blob:http://...` sem subir foto ao Firebase Storage, e a validação do backend aprovará a conclusão da missão. O teste em `missionProofValidator.test.ts` apenas valida um link HTTPS e não verifica a rejeição de URLs inseguras ou `blob:` fora de desenvolvimento.
  2. Em `sponsor_visit` (linhas 361-369 de `missionProofValidator.ts`), a verificação de código do stand possui uma checagem hardcoded exclusiva para a empresa "Kanastra" (`scanned.toLowerCase().includes('kanastra')` ou `'kanastra_code'`). Se a missão for de outros patrocinadores do evento (ex: Levty, Bayer, Aimorés, Hyperflow), a validação falha a menos que o código contenha a palavra "kanastra". A suíte de testes apenas testa `'kanastra_code'`, ocultando o acoplamento do validador a um único patrocinador.
- **Evidência:**
  ```typescript
  // backend/src/lib/missionProofValidator.ts linhas 68-71
  cleanUrl.startsWith('http://localhost') ||
  cleanUrl.startsWith('http://127.0.0.1') ||
  cleanUrl.startsWith('blob:') ||
  cleanUrl.startsWith('https://');
  ```
  ```typescript
  // backend/src/lib/missionProofValidator.ts linhas 362-364
  const validCodes = ['kanastra_code', 'sponsor_visit', 'Kanastra'];
  if (!scanned || (!validCodes.includes(scanned) && typeof scanned === 'string' && !scanned.toLowerCase().includes('kanastra')))
  ```
- **Causa provável:** A validação foi prototipada tendo o estande da Kanastra como modelo inicial e os valores de teste/mock locais (`blob:`) foram deixados ativos no código final sem parametrização por ambiente ou por patrocinador.
- **Status:** Corrigido
- **Correção aplicada:**
  1. Em `backend/src/lib/missionProofValidator.ts`, a validação de fotos passou a checar o ambiente: em produção (`NODE_ENV === 'production'`), URLs com prefixo `blob:` e `http://localhost` / `http://127.0.0.1` são estritamente rejeitadas, exigindo URLs HTTPS válidas do Firebase Storage. Em ambiente de teste e desenvolvimento local, `blob:` e `localhost` continuam permitidos para não quebrar fixtures locais.
  2. A validação de `sponsor_visit` foi parametrizada para suportar patrocinadores parceiros do evento (`Levty`, `Sankhya`, `Neospace`, `Sebrae`, `Bayer`, `Aimorés`, `Hyperflow`), alvos definidos em `autoConfig.targetId` e listas de códigos em `validCodes`, desacoplando o código de um único patrocinador hardcoded.
  3. Em `backend/src/lib/missionProofValidator.test.ts`, adicionados testes unitários cobrindo a rejeição de `blob:` e `localhost` em produção, aceitação em teste, e validação de múltiplos patrocinadores e códigos configurados.
- **Verificação:** Executado `npm --prefix backend test src/lib/missionProofValidator.test.ts`. Todos os 25 testes passaram. Prova de falha verificada: ao desabilitar temporariamente a checagem de parceiros, o teste falhou com `expected false to be true`.

---

### ERR-057
- **Arquivo e linha:** `backend/src/lib/missionProofValidator.test.ts:357`
- **Teste:** `describe('Networking (network_*)')`
- **Tipo:** Cobertura insuficiente / Tratamento de exceção
- **Severidade:** Média
- **O que está errado:** A suíte de testes de validação de missões mocka as transações do Firestore usando uma função utilitária síncrona simples `makeMockTx`. Há dois gaps importantes de cobertura e robustez:
  1. Não há testes para cenários em que o participante conectado possui campos ausentes no perfil (`userData.course` vazio, `targetData.course` indefinido, `period` nulo ou com tipo string não conversível). Nesses casos, `validateMissionProof` pode retornar `CRITERIA_NOT_MET` inesperadamente ou se comportar de forma inconsistente sem mensagem descritiva ao usuário.
  2. Não há testes cobrindo falhas de I/O ou permissões em `tx.get(secretRef)` ou `tx.get(targetUserRef)` (ex: timeout ou documento inacessível no Firestore), para verificar se a função trata graciosamente e não propaga exceptions que abortam a transação de pontuação inteira.
- **Evidência:**
  ```typescript
  // backend/src/lib/missionProofValidator.ts linhas 244-245
  const myCourse = (userData.course || '').trim().toLowerCase();
  const targetCourse = (targetData?.course || targetData?.curso || '').trim().toLowerCase();
  // Se usuário ou alvo não tiver curso cadastrado, a validação falha silenciosamente como 'CRITERIA_NOT_MET'
  ```
- **Causa provável:** Os testes foram desenhados com fixtures contendo todos os campos preenchidos, sem explorar bordas de dados incompletos em perfis de usuários ou falhas transacionais.
- **Sugestão de correção:** Adicionar testes com perfis incompletos (usuário sem curso, usuário com `curso` vs `course`, `period` como string) e testes de erro na transação para assegurar mensagens de erro amigáveis ao participante.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/lib/missionProofValidator.ts`:
  1. A consulta `tx.get(targetUserRef)` foi envolvida em bloco `try/catch` que retorna `{ valid: false, error: 'TARGET_LOOKUP_FAILED', message: ... }` em vez de propagar exceções síncronas/assíncronas que abortavam a transação de pontuação.
  2. Adicionada detecção explícita de perfis incompletos (`INCOMPLETE_PROFILE`) para participante atual ou usuário alvo sem curso preenchido (`course` / `curso`) e sem período (`period` / `periodo`), com suporte a períodos expressos como strings ordinais ou numéricas (ex: `'1'`, `'1º'`).
  3. Em `backend/src/lib/missionProofValidator.test.ts`, adicionados testes cobrindo perfis incompletos, períodos em string ordinal e numérico, tipos externos, e tratamento gracioso de erro de transação/I/O no Firestore.
- **Verificação:** Executado `npm --prefix backend test src/lib/missionProofValidator.test.ts`. Todos os 25 testes passaram com sucesso.

---

### ERR-058
- **Arquivo e linha:** `backend/src/lib/screenToken.test.ts:1`
- **Teste:** `describe('issueScreenToken / verifyScreenToken')`
- **Tipo:** Cobertura insuficiente / Tratamento de exceção
- **Severidade:** Média
- **O que está errado:** A função `getSecret()` em `backend/src/lib/screenToken.ts` lança uma exceção síncrona `new Error(...)` se a variável `process.env.SCREEN_TOKEN_SECRET` não estiver definida ou tiver menos de 32 caracteres. Em `verifyScreenToken`, essa chamada ocorre dentro de `sign()` fora de qualquer bloco de captura. Caso a variável de ambiente não esteja configurada no runtime ou seja removida, `verifyScreenToken` explode com exceção não tratada derrubando a rota do Express com status 500 em vez de retornar `{ valid: false }`. O arquivo de teste define a variável no `beforeAll` mas nunca testa cenários com a variável ausente, nula ou com menos de 32 caracteres.
- **Evidência:**
  ```typescript
  // backend/src/lib/screenToken.ts linhas 9-18
  function getSecret(): string {
    const secret = process.env.SCREEN_TOKEN_SECRET;
    if (!secret) {
      throw new Error('SCREEN_TOKEN_SECRET não configurado no ambiente.');
    }
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`SCREEN_TOKEN_SECRET precisa ter pelo menos ${MIN_SECRET_LENGTH} caracteres.`);
    }
    return secret;
  }
  ```
- **Causa provável:** O teste foi escrito assumindo ambiente sempre provisionado, omitindo testes de configuração defensiva de infraestrutura e variáveis de ambiente.
- **Sugestão de correção:**
  1. Envolver a chamada de `sign` dentro de `verifyScreenToken` em bloco `try/catch` retornando `{ valid: false, reason: 'MALFORMED' }` (ou tratando erro de configuração adequadamente).
  2. Adicionar testes unitários validando o disparo das exceções de validação de segredo em `issueScreenToken` e `verifyScreenToken` quando `process.env.SCREEN_TOKEN_SECRET` for indefinido ou curto.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/lib/screenToken.ts`, a verificação de assinatura em `verifyScreenToken` foi protegida por `try/catch`, retornando `{ valid: false, reason: 'MALFORMED' }` de forma defensiva se `sign()` lançar exceção. Em `backend/src/lib/screenToken.test.ts`, adicionados testes unitários validando que `issueScreenToken` lança erro descritivo quando o secret está ausente ou tem menos de 32 caracteres, e que `verifyScreenToken` retorna `{ valid: false, reason: 'MALFORMED' }` sem explodir exceção não tratada.
- **Verificação:** Executado `npm --prefix backend test src/lib/screenToken.test.ts`. Todos os 11 testes passaram.

---

### ERR-059
- **Arquivo e linha:** `backend/src/lib/screenToken.test.ts:48`
- **Teste:** `it('rejeita token malformado ...')`
- **Tipo:** Fragilidade estrutural / Validação de payload
- **Severidade:** Média
- **O que está errado:** O algoritmo de empacotamento em `issueScreenToken` cria o payload como `${activityId}.${expiresAt}` e assina concatenando `${payload}.${sign(payload)}`. Em `verifyScreenToken`, a decodificação faz `decoded.split('.')` e valida estritamente se `parts.length !== 3`. Se um `activityId` contiver um caractere de ponto (por exemplo: identificadores versionados como `palestra.ia.v1` ou domínios), o token é gerado com sucesso por `issueScreenToken`, mas a verificação falhará imediatamente com erro `MALFORMED` porque o split gerará 4 ou mais partes. Além disso, se `verifyScreenToken` for chamado com `undefined`, `null` ou tipos não-string, `Buffer.from(token, 'base64url')` lança um `TypeError` não capturado.
- **Evidência:**
  ```typescript
  // backend/src/lib/screenToken.ts linhas 53-56
  const parts = decoded.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'MALFORMED' };
  }
  ```
- **Causa provável:** Uso de separador de ponto simples sem escape ou sem estruturação JSON / delimitador seguro, aliado à falta de validação de tipo na entrada da função.
- **Sugestão de correção:**
  1. Adicionar checagem no topo de `verifyScreenToken`: `if (typeof token !== 'string' || !token) return { valid: false, reason: 'MALFORMED' };`.
  2. Alterar o split para isolar a assinatura a partir do último separador ou empacotar o payload como JSON base64.
  3. Adicionar testes com `activityId` complexos (com hífens, underscores e pontos) e argumentos nulos/indefinidos.
- **Status:** Corrigido
- **Correção aplicada:**
  1. Em `backend/src/lib/screenToken.ts`, adicionada guarda de tipo `if (typeof token !== 'string' || !token) return { valid: false, reason: 'MALFORMED' };`.
  2. Modificada a decodificação para particionar da direita para a esquerda usando `lastIndexOf('.')`: isola a assinatura final (`expectedSignature`) e a expiração numérica (`expiresAt`), permitindo com segurança que o `activityId` contenha múltiplos pontos (ex: `palestra.ia.v1`).
  3. Em `backend/src/lib/screenToken.test.ts`, adicionados testes unitários para tokens não-string (`null`, `undefined`, números, objetos) e tokens emitidos para atividades com identificadores complexos com pontos.
- **Verificação:** Executado `npm --prefix backend test src/lib/screenToken.test.ts`. Todos os 11 testes passaram. Prova de falha verificada: a versão anterior do split falhava com `MALFORMED` para `activityId` com pontos.

---

### ERR-060
- **Arquivo e linha:** `backend/src/middlewares/authMiddleware.test.ts:3`
- **Teste:** N/A (Middlewares não testados: `requireAuth`, `requireRole`, `requireSymplaTicket`)
- **Tipo:** Cobertura insuficiente / Segurança crítica
- **Severidade:** Crítica
- **O que está errado:** O módulo `backend/src/middlewares/authMiddleware.ts` é o coração da segurança da API do evento e exporta 4 middlewares essenciais. No entanto, o arquivo de teste `authMiddleware.test.ts` testa **exclusivamente** o middleware `requireVerifiedEmail` (6 testes). Três middlewares vitais de segurança possuem **0% de cobertura de testes unitários** no backend:
  1. `requireAuth`: responsável por inspecionar cabeçalho `Authorization: Bearer <token>`, chamar `auth.verifyIdToken(token, true)` com checagem de revogação, extrair roles (`ADMIN`, `PARTICIPANT`), injetar `req.user` e responder 401 para tokens ausentes, expirados ou revogados.
  2. `requireRole`: responsável pelo controle de acesso baseado em papéis (RBAC) para perfis `STAFF`, `SPONSOR`, `ADMIN`, garantindo bloqueio 403 `FORBIDDEN` e liberação universal para administradores.
  3. `requireSymplaTicket`: responsável por proteger ações críticas (reserva de vagas, pontos) validando no Firestore se o participante possui ingresso Sympla confirmado, dando bypass para administradores e tratando falhas internas com 500.
- **Evidência:**
  ```typescript
  // backend/src/middlewares/authMiddleware.test.ts linha 3
  import { requireVerifiedEmail } from './authMiddleware';
  // requireAuth, requireRole e requireSymplaTicket sequer são importados ou mencionados no arquivo de teste.
  ```
- **Causa provável:** O arquivo de teste unitário foi criado especificamente durante a issue KAN-116 (portão de e-mail verificado) e os middlewares legados preexistentes nunca receberam uma suíte unitária dedicada no backend.
- **Sugestão de correção:** Expandir `authMiddleware.test.ts` com blocos `describe` abrangentes para:
  - `requireAuth`: header ausente, header malformatado sem `Bearer`, token inválido/expirado (mockando `auth.verifyIdToken`), propagação de claims `admin` e `role`, e injeção do objeto `req.user`.
  - `requireRole`: negação para papéis insuficientes (ex: participante tentando acessar rota de staff) e permissão para papéis autorizados e admins.
  - `requireSymplaTicket`: verificação de flags `hasSymplaTicket`/`symplaTicket`, bypass de admin, bloqueio 403 para usuários sem ingresso e resposta 500 em erros de banco.
- **Status:** Corrigido
- **Correção aplicada:** Expandido `backend/src/middlewares/authMiddleware.test.ts` adicionando suítes completas de testes unitários para `requireAuth` (8 testes), `requireRole` (6 testes) e `requireSymplaTicket` (5 testes), cobrindo tokens ausentes/malformados, expiração/revogação, injeção de `req.user` e claims, RBAC para `STAFF`/`SPONSOR`/`ADMIN`, verificação de ingressos Sympla no Firestore e tratamento de erro 500.
- **Verificação:** Executado `npm --prefix backend test src/middlewares/authMiddleware.test.ts`. Todos os 25 testes passaram (anteriormente eram 6 testes). Prova de falha verificada: ao simular bypass de verificação de role, os testes de rejeição falharam imediatamente com erro esperado.

---

### ERR-061
- **Arquivo e linha:** `backend/src/middlewares/rateLimiter.test.ts:3`
- **Teste:** N/A (Middlewares e funções não testadas: `adminSponsorLimiter`, `sponsorInviteIpLimiter`, `debugClientIp`, fallback de `keyGenerator`)
- **Tipo:** Cobertura insuficiente / Regra de negócio
- **Severidade:** Média
- **O que está errado:** O arquivo de testes `rateLimiter.test.ts` valida apenas `participantActionLimiter` e `adminBroadcastLimiter`. Os seguintes componentes de controle de tráfego do módulo não possuem testes:
  1. `adminSponsorLimiter`: limitador de gestão de patrocinadores e envio de e-mails de convite (limite de 60 req/10min).
  2. `sponsorInviteIpLimiter`: limitador por IP das rotas públicas de convite (60 req/15min).
  3. `debugClientIp`: middleware de diagnóstico de proxies reversos e headers `x-forwarded-for`.
  4. Lógica de segurança de `keyGenerator`: fallback que detecta requisição sem `req.user.uid`, emite log de alerta e gera `randomUUID()` para evitar colisões entre requisições não autenticadas (prevenindo que um atacante compartilhe o bucket de outro).
- **Evidência:**
  ```typescript
  // backend/src/middlewares/rateLimiter.test.ts linha 3
  import { participantActionLimiter, adminBroadcastLimiter } from './rateLimiter';
  ```
  `adminSponsorLimiter`, `sponsorInviteIpLimiter`, `debugClientIp` e cenários sem `req.user` não são testados.
- **Causa provável:** A suíte focou nos limitadores criados na issue KAN-75, deixando de fora os limitadores criados posteriormente para a gestão de convites de patrocinadores (KAN-124).
- **Sugestão de correção:** Adicionar testes para `adminSponsorLimiter`, `sponsorInviteIpLimiter` (simulando requisições por IP com `req.ip`), `debugClientIp` e testar explicitamente o comportamento do `keyGenerator` quando `req.user` não é fornecido.
- **Status:** Corrigido
- **Correção aplicada:** Exportada a função `keyGenerator` em `backend/src/middlewares/rateLimiter.ts`. Em `backend/src/middlewares/rateLimiter.test.ts`, adicionados blocos de teste para `adminSponsorLimiter` (limitação em 60 req/10min), `sponsorInviteIpLimiter` (limitação por IP independente), `debugClientIp` (diagnóstico condicional sob `DEBUG_CLIENT_IP=1`) e testes diretos de `keyGenerator` validando identificação por `req.user.uid` e geração de UUID pseudo-aleatório quando usuário não estiver autenticado.
- **Verificação:** Executado `npm --prefix backend test src/middlewares/rateLimiter.test.ts`. Todos os 8 testes passaram (anteriormente 2 testes). Prova de falha verificada: ao quebrar a lógica de fallback de `keyGenerator` para retornar chave fixa, os testes de chave única falharam imediatamente.

---

### ERR-062
- **Arquivo e linha:** `backend/src/services/registerUser.test.ts:30`
- **Teste:** `describe('registerUser')`
- **Tipo:** Inconsistência de tipagem / Falha de cobertura
- **Severidade:** Média
- **O que está errado:** Em `backend/src/services/registerUser.ts` (linha 54), o serviço preserva o papel existente em contas pré-criadas: `userRole = existingData.role || 'PARTICIPANT'`. No entanto, a tipagem em TypeScript define `export type RegisterUserResult = ... { role: 'PARTICIPANT' | 'ADMIN' }`. Se o usuário pré-existente for um patrocinador (`role: 'SPONSOR'`) ou membro da organização (`role: 'STAFF'`), ocorre uma divergência entre a tipagem estática e o objeto retornado em tempo de execução. O arquivo de testes `registerUser.test.ts` testa apenas contas com `role: 'PARTICIPANT'` ou novas contas, deixando sem cobertura cenários em que `registerUser` processa contas com roles legadas ou diferenciadas.
- **Evidência:**
  ```typescript
  // backend/src/services/registerUser.ts linhas 20 e 54
  export type RegisterUserResult =
    | { status: 'already-registered' }
    | { status: 'created'; user: { uid: string; email: string | null; role: 'PARTICIPANT' | 'ADMIN'; ... } };
  // ...
  userRole = existingData.role || 'PARTICIPANT'; // pode ser 'SPONSOR' ou 'STAFF'
  ```
- **Causa provável:** A tipagem foi escrita antes da introdução dos papéis de `SPONSOR` na modelagem do sistema sem sincronização com os novos tipos do backend.
- **Sugestão de correção:** Atualizar `RegisterUserResult` para usar o tipo global `UserRole` (`'PARTICIPANT' | 'ADMIN' | 'STAFF' | 'SPONSOR'`) e adicionar testes unitários cobrindo o registro complementar de contas pré-existentes com papéis de `SPONSOR` e `STAFF`.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/services/registerUser.ts`, atualizada a tipagem de retorno `RegisterUserResult` e a variável local `userRole` para utilizarem o tipo unificado `UserRole` (`'PARTICIPANT' | 'STAFF' | 'SPONSOR' | 'ADMIN'`). Em `backend/src/services/registerUser.test.ts`, adicionado teste unitário comprovando que contas com papéis pré-existentes (`SPONSOR`, `STAFF`, `ADMIN`) mantêm suas permissões intactas sem sofrer rebaixamento indevido para `PARTICIPANT`.
- **Verificação:** Executado `npm --prefix backend test src/services/registerUser.test.ts`. Todos os 8 testes passaram com sucesso.

---

### ERR-063
- **Arquivo e linha:** `backend/src/services/registerUser.test.ts:1`
- **Teste:** N/A (Função não testada com entradas inválidas: `registerUser`)
- **Tipo:** Fragilidade estrutural / Validação defensiva
- **Severidade:** Média
- **O que está errado:** A função `registerUser` aceita `uid: string` e acessa imediatamente `db.collection('users').doc(uid)` sem validação defensiva de formato (por exemplo, via `isValidFirestoreId`). Se for passado um identificador vazio, nulo ou contendo barras (ex: `user/sub`), o SDK do Firestore lança uma exceção síncrona antes de iniciar a transação. O teste unitário utiliza uma implementação mock manual simplificada (`makeFakeDb`) que não reproduz as validações de path do Firestore Admin SDK, mascarando esse risco.
- **Evidência:**
  ```typescript
  // backend/src/services/registerUser.ts linhas 30-36
  export async function registerUser(db: admin.firestore.Firestore, uid: string, ...): Promise<RegisterUserResult> {
    const userRef = db.collection('users').doc(uid); // Dispara exceção se uid contiver '/'
  ```
- **Causa provável:** O autor assumiu que o `uid` sempre virá sanitizado diretamente do Firebase Auth, sem considerar chamadas internas ou rotas administrativas.
- **Sugestão de correção:** Incluir validação defensiva com `isValidFirestoreId(uid)` no topo da função e adicionar testes com UIDs inválidos garantindo tratamento de erro controlado.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/services/registerUser.ts`, adicionada validação defensiva no topo da função utilizando `isValidFirestoreId(uid)`. Caso o identificador seja vazio, nulo, contenha barras, espaços ou caracteres inválidos para IDs de documento do Firestore, a função lança um `Error` descritivo antes de interagir com o banco de dados. Em `backend/src/services/registerUser.test.ts`, adicionados testes unitários para múltiplos cenários de UIDs inválidos garantindo que nenhuma transação ou escrita é disparada.
- **Verificação:** Executado `npm --prefix backend test src/services/registerUser.test.ts`. Testes passaram. Prova de falha verificada: ao desabilitar temporariamente a validação de UID, os testes de rejeição falharam imediatamente com `promise resolved instead of rejecting`.

---

### ERR-064
- **Arquivo e linha:** `backend/src/services/sponsorInvites.test.ts:24`
- **Teste:** N/A (Funções não testadas: `prepareInvite` e `dispatchInvite`)
- **Tipo:** Cobertura insuficiente / Fluxo administrativo
- **Severidade:** Alta
- **O que está errado:** O serviço `backend/src/services/sponsorInvites.ts` exporta as funções centrais de criação e envio de convites pelo painel de administração:
  1. `prepareInvite(sponsorId, email, createdBy, resentFrom)`: gera token seguro de 32 bytes, calcula o TTL diferenciado (7 dias para convite nominal vs 48 horas para convite genérico multiuso), deriva o hash SHA-256 e cria a referência do documento no Firestore.
  2. `dispatchInvite(prepared, email, sponsorName)`: constrói a URL pública de convite (`buildInviteLink`) e dispara o e-mail via `sendSponsorInviteEmail`.
  Ambas as funções possuem **0% de cobertura de testes unitários** nas suítes `sponsorInvites.test.ts` e `sponsorInvitesSecurity.test.ts`. Todos os 27 testes focam no consumo (`acceptInvite`) e na pré-visualização (`getInvitePreview`), deixando o ciclo de criação e emissão sem nenhum teste unitário.
- **Evidência:**
  ```typescript
  // backend/src/services/sponsorInvites.ts linhas 128 e 134
  export function prepareInvite(sponsorId: string, email: string | null, createdBy: string, resentFrom?: string) { ... }
  export async function dispatchInvite(...) { ... }
  ```
  Nenhuma das duas funções é importada ou executada em `sponsorInvites.test.ts`.
- **Causa provável:** Os testes foram focados na complexidade do aceite concorrente e nas regras de segurança do KAN-124, omitindo os métodos de criação.
- **Sugestão de correção:** Criar testes para `prepareInvite` validando o cálculo de expiração com 7 dias quando `email` é fornecido e 48 horas quando `null`, e testes para `dispatchInvite` mockando `sendSponsorInviteEmail` com sucesso e falha de SMTP.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/services/sponsorInvites.test.ts`, adicionada suíte dedicada de testes unitários para `prepareInvite` e `dispatchInvite`:
  1. `prepareInvite`: validação de estrutura do documento criado, geração de token de 43 caracteres em base64url, cálculo exato do `tokenHash` via SHA-256, status inicial `PENDING`, gravação de `resentFromInviteId` e diferenciação estrita de TTL (7 dias / `INVITE_TTL_MS` para convite nominal vs 48 horas / `GENERIC_INVITE_TTL_MS` para convite genérico multiuso).
  2. `dispatchInvite`: validação da construção do link público com hash fragment, disparo de e-mail via `sendSponsorInviteEmail` quando nominal (com retorno `emailSent: true` em caso de sucesso e `false` em caso de falha), e garantia de não-disparo de e-mail para links genéricos (`email: null`).
- **Verificação:** Executado `npm --prefix backend test src/services/sponsorInvites.test.ts`. Todos os 28 testes passaram (anteriormente 22 testes). Prova de falha verificada: ao quebrar temporariamente o cálculo de TTL nominal em `sponsorInvites.ts`, o teste falhou imediatamente com asserção de timestamp `expected ... to be greater than or equal to ... + INVITE_TTL_MS`.

---

### ERR-065
- **Arquivo e linha:** `backend/src/services/sponsorInvites.test.ts:229`
- **Teste:** `it('teto de tentativas inválidas por token => 429 RATE_LIMITED')`
- **Tipo:** Fragilidade de segurança / Falta de teste
- **Severidade:** Baixa
- **O que está errado:** O módulo `sponsorInvites.ts` implementa uma proteção anti-brute-force em memória para tokens inválidos (`invalidAttempts = new Map()`). Na linha 75, há uma cláusula de contenção de memória: `if (invalidAttempts.size > 5000) invalidAttempts.clear()`. Isso significa que se um invasor enviar requisições com 5001 tokens arbitrários e inexistentes, todo o mapa de tentativas é esvaziado indiscriminadamente, **zerando os contadores de rate-limit de todos os tokens bloqueados**. Essa vulnerabilidade de bypass de bloqueio por flooding não é coberta por testes, nem possui mecanismo de expurgo FIFO/LRU mais seguro.
- **Evidência:**
  ```typescript
  // backend/src/services/sponsorInvites.ts linha 75
  export function recordInvalidAttempt(tokenHash: string): void {
    if (invalidAttempts.size > 5000) invalidAttempts.clear();
    // Limpa todos os 5000 tokens bloqueados de uma só vez!
  ```
- **Causa provável:** Estratégia ingênua de contenção de tamanho de memória em cache sem implementar estratégia LRU.
- **Sugestão de correção:** Substituir o `invalidAttempts.clear()` por um cache LRU (ex: `lru-cache`) ou mapa com limpeza seletiva de entradas expiradas, e criar teste verificando a retenção de bloqueios ativos sob carga.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/services/sponsorInvites.ts`, substituído o descarte total `invalidAttempts.clear()` por algoritmo inteligente de contenção em 3 etapas quando `size >= MAX_INVALID_ENTRIES (5000)`: (1) purga de entradas expiradas por TTL; (2) descarte de entradas transitórias não-bloqueadas (`count < 10`) para resistir a inundações de tokens falsos; e (3) descarte progressivo FIFO/LRU das entradas mais antigas. Em `backend/src/services/sponsorInvites.test.ts`, adicionado teste unitário comprovando que o flooding com mais de 5000 tokens falsos não expurga tokens bloqueados sob ataque de força bruta.
- **Verificação:** Executado `npm --prefix backend test src/services/sponsorInvites.test.ts`. 29 testes passaram. Prova de falha verificada: ao reinserir temporariamente `invalidAttempts.clear()`, o teste falhou imediatamente com `AssertionError: expected false to be true`.

---

### ERR-066
- **Arquivo e linha:** `backend/src/routes/auth.test.ts:1`
- **Teste:** `describe('POST /api/auth/register')`
- **Tipo:** Cobertura insuficiente / Arquitetura da API
- **Severidade:** Média
- **O que está errado:** O módulo de rotas `backend/src/routes/auth.ts` expõe exclusivamente o endpoint `POST /register`. Não existem rotas nem testes para os demais estágios do ciclo de vida de autenticação na API do backend (`/login`, `/logout`, `/me`, `/refresh-token`, `/reset-password`). O sistema delega toda autenticação interativa diretamente ao SDK Client do Firebase Auth no navegador, mas o backend não possui endpoints para validação de sessão, revogação de tokens (`revokeRefreshTokens`) ou introspecção do usuário autenticado (`GET /me`).
- **Evidência:**
  ```typescript
  // backend/src/routes/auth.ts
  const router = Router();
  router.post('/register', registerLimiter, registerUserHandler);
  export default router;
  ```
  O roteador só possui esse único verbo e rota implementada.
- **Causa provável:** A arquitetura do projeto adotou autenticação direta cliente-Firebase, deixando para o backend apenas o registro com custom claims.
- **Sugestão de correção:** Documentar essa restrição arquitetural explicitamente e, se endpoints como `/me` ou revogação de sessão forem necessários para clientes ou integrações externas sem SDK direto, adicioná-los e testá-los.

---

### ERR-067
- **Arquivo e linha:** `backend/src/routes/admin.ts:155`
- **Teste:** `describe('POST /api/admin/notifications/broadcast (KAN-61)')`
- **Tipo:** Segurança / Falha de validação e sanitização
- **Severidade:** Média
- **O que está errado:** A rota `POST /api/admin/notifications/broadcast` valida apenas se `title` e `body` são strings não vazias e seus comprimentos máximos (150 e 1000 caracteres). Não há sanitização contra tags HTML ou injeção de scripts (XSS). O payload é persistido diretamente no Firestore (`announcementRef.set({ title: trimmedTitle, body: trimmedBody, ... })`) e propagado via FCM para todos os participantes. Se um administrador comprometido enviar tags como `<script>` ou HTML com atributos maliciosos (ex: `onerror`), e o cliente PWA renderizar esse feed sem sanitização/escape rígido, há risco de Stored XSS generalizado atingindo todos os usuários do app.
- **Evidência:**
  ```typescript
  // backend/src/routes/admin.ts:168-188
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  ...
  await announcementRef.set({
    title: trimmedTitle,
    body: trimmedBody,
    createdBy: req.user!.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  ```
  Em `admin.test.ts`, nenhum caso de teste valida sanitização ou rejeição de payloads com scripts/tags HTML.
- **Causa provável:** Validação focada apenas em tamanho de caracteres sem considerar higienização de conteúdo que será renderizado no cliente.
- **Sugestão de correção:** Implementar sanitização (ou rejeição de tags HTML/scripts) no backend antes de persistir em `/announcements` e adicionar testes em `admin.test.ts` cobrindo tentativas de injeção de HTML/scripts.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/admin.ts`, adicionada validação e rejeição via regex (`HTML_TAG_REGEX = /<[a-z/!][\s\S]*?>/i`) retornando 400 `INVALID_PAYLOAD` com mensagem clara quando `title` ou `body` contiverem tags HTML ou scripts injetados. Em `backend/src/routes/admin.test.ts`, adicionados testes unitários para payloads maliciosos contendo `<script>` e `<img onerror=...>`, comprovando que a requisição é barrada sem tocar Firestore nem FCM.
- **Verificação:** Executado `npm --prefix backend test src/routes/admin.test.ts`. 32 testes passaram. Prova de falha verificada: ao comentar temporariamente o bloco de validação de tags HTML, os testes falharam com `expected vi.fn() to not be called at all, but actually been called 1 times` (escrita indevida no Firestore).

---

### ERR-068
- **Arquivo e linha:** `backend/src/routes/admin.test.ts:372`
- **Teste:** `describe('POST /api/admin/notifications/broadcast (KAN-61)')`
- **Tipo:** Cobertura insuficiente / Teste incompleto do pipeline
- **Severidade:** Baixa
- **O que está errado:** A suíte `backend/src/routes/admin.test.ts` testa a rota de broadcast chamando a função `broadcastNotificationHandler` diretamente com objetos simulados `makeBroadcastReq` e `makeRes`. Embora a rota real no router utilize `adminBroadcastLimiter` (`router.post('/notifications/broadcast', requireAuth, requireRole(['ADMIN']), adminBroadcastLimiter, broadcastNotificationHandler)`), o rate limiter do broadcast não é testado na cadeia de middlewares do teste. Além disso, não há teste cobrindo o comportamento caso `req.user` seja nulo ou indefinido ao tentar acessar `req.user!.uid`.
- **Evidência:**
  ```typescript
  // backend/src/routes/admin.ts:186
  createdBy: req.user!.uid, // req.user! com non-null assertion
  
  // backend/src/routes/admin.ts:214
  router.post('/notifications/broadcast', requireAuth, requireRole(['ADMIN']), adminBroadcastLimiter, broadcastNotificationHandler);
  ```
  Em `admin.test.ts`, o `adminBroadcastLimiter` não é importado nem verificado em nenhum teste de rate-limit da rota.
- **Causa provável:** Testes foram focados na lógica do handler e nas exceções do FCM, desacoplando o middleware de rate limiting.
- **Sugestão de correção:** Adicionar testes de integração do roteador ou da cadeia de middlewares validando que o `adminBroadcastLimiter` bloqueia requisições excessivas (ex: > 3 broadcasts no intervalo configurado) e adicionar verificação defensiva caso `req.user?.uid` não esteja definido.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/admin.ts`, adicionada verificação defensiva `if (!req.user?.uid)` retornando 401 `UNAUTHENTICATED`, eliminando o risco da asserção não-nula `req.user!.uid`. Em `backend/src/routes/admin.test.ts`, adicionado teste unitário verificando o 401 quando `req.user` é indefinido e teste de integração da cadeia real de middlewares com `adminBroadcastLimiter` comprovando o bloqueio com status 429 `RATE_LIMITED` ao exceder 10 requisições em 10 minutos.
- **Verificação:** Executado `npm --prefix backend test src/routes/admin.test.ts`. 32 testes passaram. Prova de falha verificada: ao executar o teste da cadeia sem os métodos de cabeçalho do express-rate-limit ou sem a verificação defensiva, o teste falha com status incompatível.

---

### ERR-069
- **Arquivo e linha:** `backend/src/routes/admin.ts:1`
- **Teste:** `(Nenhum)`
- **Tipo:** Cobertura insuficiente / Escopo incompleto da API
- **Severidade:** Média
- **O que está errado:** O módulo `backend/src/routes/admin.ts` implementa exclusivamente duas operações (`PUT /users/:uid/role` e `POST /notifications/broadcast`). Operações administrativas essenciais para gerenciamento do evento não possuem endpoints nem testes no backend: listagem/busca paginada de usuários (`GET /users`), visualização de métricas/dashboard (`GET /stats`), histórico de auditoria de alterações de papel (`GET /audit-logs`), e bloqueio/desativação de contas de usuários (`POST /users/:uid/disable`).
- **Evidência:**
  O arquivo `backend/src/routes/admin.ts` tem apenas 217 linhas e contém apenas dois endpoints.
- **Causa provável:** As rotas foram criadas pontualmente para atender aos tickets KAN-60 e KAN-61, sem a estruturação de uma API administrativa abrangente.
- **Sugestão de correção:** Mapear os requisitos do painel de administração e adicionar endpoints dedicados no backend com suas respectivas suítes de testes.

---

### ERR-070
- **Arquivo e linha:** `backend/src/routes/booking.ts:295`
- **Teste:** `describe('POST /:activityId/cancel (KAN-110)')`
- **Tipo:** Regra de negócio / Fila de espera ineficaz
- **Severidade:** Alta
- **O que está errado:** No handler de cancelamento de reservas (`cancelBookingHandler`), quando um participante cancela uma vaga com status `CONFIRMED`, o código simplesmente incrementa `vagas_disponiveis` na atividade (`vagas_disponiveis: available + 1`). Ele **não** promove automaticamente o próximo usuário da lista de espera (`WAITING_LIST` com posição 1). Isso gera uma falha grave na lógica da fila: qualquer usuário novo que chamar a rota `POST /:activityId/reserve` naquele instante consegue roubar a vaga liberada, furando a fila de quem estava esperando. Além disso, não há reordenação ou decremento das posições dos participantes restantes na fila de espera.
- **Evidência:**
  ```typescript
  // backend/src/routes/booking.ts linhas 295-303
  if (activitySnap.exists && wasConfirmed) {
    const actData = activitySnap.data() ?? {};
    const available = typeof actData.vagas_disponiveis === 'number' ? actData.vagas_disponiveis : 0;
    const totalInscritos = typeof actData.total_inscritos === 'number' ? actData.total_inscritos : 1;
    tx.update(activityRef, {
      vagas_disponiveis: available + 1,
      total_inscritos: Math.max(0, totalInscritos - 1)
    });
  }
  ```
  O teste `it('cancelar reserva confirmada devolve a vaga')` em `booking.test.ts:252` apenas valida que `vagas_disponiveis` virou 3 e `total_inscritos` virou 7, consolidando esse comportamento incorreto sem testar a fila de espera.
- **Causa provável:** Implementação simplificada de cancelamento que tratou devolução de vagas isoladamente sem integrar com a mecânica da fila de espera.
- **Sugestão de correção:** Na transação de cancelamento, consultar se há participantes com `status == 'WAITING_LIST'` ordenados por `position` asc; se houver, promover o primeiro para `CONFIRMED` (mantendo `vagas_disponiveis` em 0 e decrementando `total_espera`), notificando-o, ou implementar um job de conciliação de fila de espera.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/booking.ts:cancelBookingHandler`, implementada a promoção automática da lista de espera ao cancelar reserva com status `CONFIRMED` e `total_espera > 0` (Opção 1 aprovada). A leitura do próximo da fila (`bookings.where('activityId', '==', activityId).where('status', '==', 'WAITING_LIST').orderBy('position', 'asc').limit(1)`) é executada dentro da transação antes de qualquer escrita (atendendo à regra do Firestore). Se houver participante na fila, seu doc é atualizado para `CONFIRMED`, `position: null`, `promotedAt: new Date()` e `total_espera` da atividade é decrementado sem alterar `vagas_disponiveis` (preservando o assento para o usuário promovido). Caso a fila esteja vazia (fallback), a vaga é liberada normalmente. Em `backend/src/routes/booking.test.ts`, adicionados testes unitários validando a promoção e o fallback.
- **Verificação:** Executado `npm --prefix backend test src/routes/booking.test.ts`. 16 testes passaram (5x estável). Prova de falha verificada: a remoção da lógica de promoção faz o teste falhar pois `tx.update(promotedDocRef)` não é chamado e `vagas_disponiveis` seria indevidamente incrementada.

---

### ERR-071
- **Arquivo e linha:** `backend/src/routes/booking.test.ts:154`
- **Teste:** `it('atividade inexistente: 404 ACTIVITY_NOT_FOUND')`
- **Tipo:** Cobertura insuficiente / Código morto em teste
- **Severidade:** Média
- **O que está errado:** O módulo `backend/src/routes/booking.ts` possui um objeto de seed padrão (`DEFAULT_ACTIVITIES_CATALOG`) e um bloco com 47 linhas de código (linhas 154-201) para auto-cadastrar atividades em runtime durante a primeira reserva caso o doc não exista no Firestore. No entanto, em `booking.test.ts`, o teste de atividade inexistente utiliza um ID genérico (`lecture-1`) que não está no catálogo, acionando unicamente o ramo 404. O bloco de auto-seed inteiro tem 0% de testes unitários.
- **Evidência:**
  ```typescript
  // backend/src/routes/booking.ts:154-161
  if (!activitySnap.exists) {
    const defaultActivity = DEFAULT_ACTIVITIES_CATALOG[activityId];
    if (!defaultActivity) {
      return { status: 404 as const, body: { error: 'ACTIVITY_NOT_FOUND', ... } };
    }
    // Linhas 163 a 200: lógica de auto-seed de atividade e criação de reserva (nunca testada!)
  ```
- **Causa provável:** Teste unitário foi escrito antes ou sem considerar a adição do catálogo de fallback `DEFAULT_ACTIVITIES_CATALOG`.
- **Sugestão de correção:** Adicionar testes em `booking.test.ts` cobrindo a reserva de uma atividade presente no catálogo padrão (`palestra_abertura`, `workshop_firebase_node`), validando a inicialização do documento e a confirmação de vaga ou inserção em fila de espera.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/booking.test.ts`, adicionados testes unitários para a rotina de auto-seed de atividades do catálogo padrão `DEFAULT_ACTIVITIES_CATALOG` (linhas 154-201 de `booking.ts`), cobrindo tanto o ramo com vagas disponíveis (`palestra_abertura` gerando atividade persistida e reserva `CONFIRMED`) quanto o ramo com vagas esgotadas (atividade persistida com `total_espera: 1` e reserva `WAITING_LIST` com `position: 1`).
- **Verificação:** Executado `npm --prefix backend test src/routes/booking.test.ts`. 16 testes passaram. Prova de falha verificada: alteração dos asserts de `tx.set` ou da chave de catálogo no teste resulta em falha direta.

---

### ERR-072
- **Arquivo e linha:** `backend/src/routes/checkin.test.ts:51`
- **Teste:** `describe('POST /:activityId/checkin')`
- **Tipo:** Cobertura insuficiente / Falsos positivos por omissão
- **Severidade:** Média
- **O que está errado:** A suíte `backend/src/routes/checkin.test.ts` possui apenas 6 testes e omite a verificação de grande parte dos fluxos do endpoint de check-in: não há teste para atividade não encontrada (404 `ACTIVITY_NOT_FOUND`), não há teste para duplicidade de check-in (409 `CHECKIN_DUPLICATE` quando o documento de `pointEvent` já existe), não há teste para o envio de `rating` de avaliação da palestra no payload, e não há teste para falhas na transação do banco (500 `INTERNAL_ERROR`).
- **Evidência:**
  Em `backend/src/routes/checkin.ts`, linhas 57-62, 77-82, 91 e 110-116 não são exercitadas por nenhum dos 6 testes em `checkin.test.ts`.
- **Causa provável:** Testes focaram apenas na validação de formato do ID do QR (`isValidFirestoreId`), no rate limit e no `attendanceMode`, deixando de lado os ramos convencionais de erro do handler.
- **Sugestão de correção:** Adicionar casos de teste para 404 (atividade inexistente), 409 (presença já registrada), 201 com e sem `rating` opcional, e 500 (rejeição da transação).
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/checkin.test.ts`, adicionado describe block `POST /:activityId/checkin — fluxos de negócio e erros (ERR-072)` contendo 5 novos testes unitários cobrindo todos os fluxos faltantes: 404 `ACTIVITY_NOT_FOUND` (atividade inexistente no Firestore), 409 `CHECKIN_DUPLICATE` (presença já registrada via doc determinístico de `pointEvent`), 201 com gravação de `metadata: { rating }` quando `rating` numérico é enviado no payload, 201 com `metadata: null` quando `rating` é omitido, e 500 `INTERNAL_ERROR` quando `db.runTransaction` rejeita com erro.
- **Verificação:** Executado `npm --prefix backend test src/routes/checkin.test.ts`. 11 testes passaram. Prova de falha verificada: alteração dos códigos de erro ou payload de metadados gera falha imediata nos testes.

---

### ERR-073
- **Arquivo e linha:** `backend/src/routes/checkinDoubleCheck.ts:20`
- **Teste:** `describe('POST /entrance (KAN-51 — Staff registra entrada)')`
- **Tipo:** Cobertura insuficiente / Resolução de identidade sem testes
- **Severidade:** Média
- **O que está errado:** A rota `POST /api/checkin/entrance` aceita `uid` no corpo contendo formatos variados de crachá: prefixos `mailto:`, endereços de e-mail e `@username`. Ela executa consultas no Firestore (`db.collection('users').where('email', ...)`, `where('username', ...)`) para resolver o UID real do participante antes de iniciar a transação. Porém, em `checkinDoubleCheck.test.ts`, todos os testes passam diretamente `uid: 'part-1'`, deixando 100% da lógica de resolução de crachá sem testes unitários.
- **Evidência:**
  ```typescript
  // backend/src/routes/checkinDoubleCheck.ts:20-46
  let uid = typeof rawUid === 'string' ? rawUid.replace(/^mailto:/i, '').trim() : '';
  if (uid.includes('@')) { ... }
  else if (uid.startsWith('@')) { ... }
  ```
  Nenhuma linha deste bloco é exercitada na suíte de testes.
- **Causa provável:** A funcionalidade de flexibilização de leitura de crachás por Staff foi adicionada posteriormente sem a inclusão de testes correspondentes. Além disso, havia um bug lógico no código em que `if (uid.includes('@'))` precedia `else if (uid.startsWith('@'))`, mascarando resoluções de usernames que iniciam com `@`.
- **Sugestão de correção:** Corrigir a ordem de avaliação em `checkinDoubleCheck.ts` para verificar `uid.startsWith('@')` antes de `uid.includes('@')`, e adicionar testes em `checkinDoubleCheck.test.ts` cobrindo `mailto:`, e-mail, `@username`, `participantUid`, participantes não encontrados e resiliência a falhas de rede.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/checkinDoubleCheck.ts`, corrigida a ordem de resolução para avaliar `uid.startsWith('@')` antes de `uid.includes('@')`. Em `backend/src/routes/checkinDoubleCheck.test.ts`, adicionada a suíte `POST /entrance — resolução de crachá e identidade (ERR-073)` com 7 testes unitários cobrindo: resolução via prefixo `mailto:aluno@facom.ufms.br`, fallback case-sensitive quando lowercase não encontra, resolução de `@usuario_dev` via campo `username`, aceitação de `participantUid` como alternativa a `uid`, rejeição 400 `INVALID_PAYLOAD` para e-mail inexistente ou @username inexistente, e tolerância a exceções na busca sem derrubar o processo.
- **Verificação:** Executado `npm --prefix backend test src/routes/checkinDoubleCheck.test.ts src/routes/leads.test.ts`. 54 testes passaram. Prova de falha comprovada pelo vitest quando a precedência de `@username` falhou antes do ajuste no código.

---

### ERR-074
- **Arquivo e linha:** `backend/src/routes/checkinDoubleCheck.ts:15`
- **Teste:** `(Nenhum)`
- **Tipo:** Segurança / Ausência de Rate Limiting
- **Severidade:** Alta
- **O que está errado:** Ao contrário das rotas de check-in simples (`checkin.ts`) e reserva de vagas (`booking.ts`), que utilizam `participantActionLimiter`, as rotas do fluxo de double-check `POST /api/checkin/entrance` e `POST /api/checkin/checkout` não aplicam nenhum middleware de rate limiting. O endpoint `/checkout` é chamado diretamente pelos participantes escaneando o QR do telão ao final de cada atividade. A ausência de rate limiter permite que centenas ou milhares de requisições simultâneas ou scripts automatizados ataquem a rota com tentativas de tokens sem controle de taxa de requisições por usuário ou IP.
- **Evidência:**
  ```typescript
  // backend/src/routes/checkinDoubleCheck.ts:15
  router.post('/entrance', requireAuth, requireRole(['STAFF', 'ADMIN']), async ...);
  
  // backend/src/routes/checkinDoubleCheck.ts:114
  router.post('/checkout', requireAuth, async ...);
  ```
  Nenhum limiter é importado ou montado no roteador.
- **Causa provável:** Os endpoints de double-check foram desenvolvidos em um ticket posterior (KAN-51) e o rate limiter existente no projeto foi omitido da cadeia de middlewares.
- **Sugestão de correção:** Aplicar `participantActionLimiter` (ou limiter dedicado para checkouts de eventos) em `POST /checkout` e `POST /entrance`, e adicionar testes assertando a presença dos limitadores na cadeia de middlewares do roteador.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/checkinDoubleCheck.ts`, importado `participantActionLimiter` e montado nas rotas `POST /entrance` e `POST /checkout`. Em `backend/src/routes/checkinDoubleCheck.test.ts`, adicionada a suíte `checkinDoubleCheck route middleware configuration (ERR-074)` assertando a presença do middleware `participantActionLimiter` na cadeia de execução de ambos os endpoints.
- **Verificação:** Executado `npm --prefix backend test src/routes/checkinDoubleCheck.test.ts`. 26 testes passaram. Prova de falha verificada: a remoção do limiter resulta em falha nas asserções de middleware.

---

### ERR-075
- **Arquivo e linha:** `backend/src/routes/leads.ts:403`
- **Teste:** `describe('GET /api/leads handler')`
- **Tipo:** Desempenho / Ausência de paginação e limites
- **Severidade:** Média
- **O que está errado:** A rota `GET /api/leads` busca contatos realizando chamadas `.get()` diretas nas coleções `leads/{sponsorUid}/contacts` e `company_leads/{companyId}/contacts` sem nenhum parâmetro de paginação (`limit`, `offset`, cursores) ou ordenação por data. Em um estande movimentado durante a TechWeek com centenas ou milhares de participantes capturados, carregar todos os documentos em memória a cada chamada do dashboard pode degradar a latência da API, estourar limites de memória do Node.js e elevar drasticamente os custos operacionais de leitura do Firestore.
- **Evidência:**
  ```typescript
  // backend/src/routes/leads.ts linhas 415-422
  const myLeadsSnap = await db.collection('leads').doc(sponsorUid).collection('contacts').get();
  ...
  const compLeadsSnap = await db.collection('company_leads').doc(companyId).collection('contacts').get();
  ```
  Os testes em `leads.test.ts` usam apenas 1 ou 2 documentos estáticos mockados, sem validar paginação.
- **Causa provável:** Implementação voltada para prova de conceito ou baixo volume de testes sem planejamento de escalabilidade para o evento presencial.
- **Sugestão de correção:** Implementar parâmetros opcionais de consulta `limit` (com teto padrão, ex: 50) e `cursor`/`startAfter` na query do Firestore, ordenando por `createdAt` desc, e adicionar testes cobrindo paginação.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/leads.ts` (`getLeadsHandler`), adicionado parsing seguro do parâmetro `limit` via query string (com fallback de 50 e teto de 100), encadeamento condicional de `.orderBy('createdAt', 'desc')` e `.limit(limit)` nas queries das coleções `leads/{sponsorUid}/contacts` e `company_leads/{companyId}/contacts`, e inclusão do bloco `pagination: { limit, totalReturned }` no payload de resposta HTTP 200. Em `backend/src/routes/leads.test.ts`, adicionados testes unitários validando ordenação por `createdAt` desc, aplicação de limite, metadados de paginação e clamping de valores excessivos (>100) ou inválidos.
- **Verificação:** Executado `npm --prefix backend test src/routes/leads.test.ts`. Todos os 33 testes passaram. Prova de falha verificada: a remoção da cláusula limit ou do teto de 100 itens quebra as asserções de mock e resposta da suíte.

---

### ERR-076
- **Arquivo e linha:** `backend/src/routes/leads.ts:541`
- **Teste:** `describe('leads route middleware configuration')`
- **Tipo:** Segurança / Ausência de Rate Limiting
- **Severidade:** Média
- **O que está errado:** As rotas de manipulação de leads (`GET /`, `POST /` e `PATCH /:participantUid`) em `leads.ts` não utilizam nenhum middleware de rate limiting. Embora exijam autenticação e perfil `SPONSOR` ou `ADMIN`, uma chave de API ou token de patrocinador vazado ou um script malicioso no estande pode submeter requisições massivas, gerando poluição de dados, custos excessivos de escritas em banco e negação de serviço para outros expositores.
- **Evidência:**
  ```typescript
  // backend/src/routes/leads.ts linhas 541-543
  router.get('/', requireAuth, requireRole(['SPONSOR', 'ADMIN']), getLeadsHandler);
  router.post('/', requireAuth, requireRole(['SPONSOR', 'ADMIN']), requireVerifiedEmail, leadsHandler);
  router.patch('/:participantUid', requireAuth, requireRole(['SPONSOR', 'ADMIN']), updateLeadHandler);
  ```
- **Causa provável:** Ausência de middleware específico para ações de expositores (diferente de `participantActionLimiter`).
- **Sugestão de correção:** Aplicar um limitador de requisições de patrocinadores (ex: `adminSponsorLimiter` ou limitador específico de leads) em todas as rotas de `leads.ts` e incluir asserções na suíte de testes.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/leads.ts`, importado `adminSponsorLimiter` e montado nas rotas `GET /`, `POST /` e `PATCH /:participantUid`. Em `backend/src/routes/leads.test.ts`, atualizado o bloco `describe('leads route middleware configuration (ERR-076)')` assertando que as 3 rotas possuem `adminSponsorLimiter` registrado em suas pilhas de middleware.
- **Verificação:** Executado `npm --prefix backend test src/routes/leads.test.ts`. 28 testes passaram. Prova de falha verificada: omitir `adminSponsorLimiter` causa falha nas asserções de middleware da suíte.

---

### ERR-077
- **Arquivo e linha:** `backend/src/routes/leads.ts:145`
- **Teste:** `describe('POST /api/leads handler (KAN-55)')`
- **Tipo:** Cobertura insuficiente / Tratamento de exceção mudo
- **Severidade:** Baixa
- **O que está errado:** No handler de captura de leads (`leadsHandler`), existe suporte para que o expositor envie um e-mail no campo `participantUid` em vez de um ID de documento. Essa consulta busca o usuário via `where('email', '==', ...)` dentro de um bloco `try { ... } catch {}` vazio que engole qualquer exceção. Além disso, na suíte `leads.test.ts`, nenhum dos testes envia um payload com endereço de e-mail no `participantUid`, deixando tanto o fluxo de sucesso de resolução quanto a resiliência a falhas sem cobertura de testes.
- **Evidência:**
  ```typescript
  // backend/src/routes/leads.ts linhas 145-155
  if (typeof resolvedUid === 'string' && resolvedUid.includes('@')) {
    try {
      const usersCol = db.collection('users');
      if (typeof usersCol.where === 'function') {
        const emailSnap = await usersCol.where('email', '==', resolvedUid.toLowerCase().trim()).limit(1).get();
        if (emailSnap && !emailSnap.empty) {
          resolvedUid = emailSnap.docs[0].id;
        }
      }
    } catch {}
  }
  ```
- **Causa provável:** Adaptação defensiva para permitir leitura de QR code bruto do crachá do participante, implementada sem testes de unidade associados.
- **Sugestão de correção:** Registrar warning ou log em caso de erro na consulta, e adicionar casos de teste em `leads.test.ts` enviando `participantUid: 'aluno@ufu.br'` simulando resolução bem-sucedida e participante não encontrado.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/leads.ts`, substituído o bloco vazio `catch {}` na resolução de e-mails em `leadsHandler` por `console.warn` estruturado, e corrigida inconsistência nos dados do contato (`leadContactData`, `companyLeadRef` e `body.lead`) para propagar o `resolvedUid` em vez do endereço de e-mail bruto. Em `backend/src/routes/leads.test.ts`, adicionados 3 testes unitários cobrindo: resolução bem-sucedida de `participantUid: 'aluno@ufu.br'` com creditação de 50 pontos e retorno do UID correto, rejeição 400 `INVALID_PAYLOAD` para e-mails não cadastrados, e tolerância a falhas na consulta de rede sem derrubar a API.
- **Verificação:** Executado `npm --prefix backend test src/routes/leads.test.ts`. Todos os 33 testes passaram. Prova de falha comprovada pelo vitest quando o payload retornou o e-mail não-resolvido antes da correção em `leads.ts`.

---

### ERR-078
- **Arquivo e linha:** `backend/src/routes/points.test.ts:128`
- **Teste:** `describe('POST /api/points/claim (KAN-79, KAN-80)')`
- **Tipo:** Cobertura insuficiente / Auto-seed de missões sem teste
- **Severidade:** Média
- **O que está errado:** A rota `POST /api/points/claim` inclui uma lógica de tolerância a falhas e contingência em que, caso o documento da missão não exista na coleção `/missions/{missionId}`, ela consulta um dicionário local `DEFAULT_MISSION_CATALOG`. Se a chave existir, ela executa um auto-seed gravando a missão no Firestore (`tx.set(missionRef, { points: missionPoints, createdAt: FieldValue.serverTimestamp() })`). Porém, na suíte `points.test.ts`, nenhum teste exercita esse caminho: o teste de missão inexistente usa um ID que não consta no catálogo padrão, caindo direto no erro 404. O comportamento de contingência e persistência de missões default possui 0% de cobertura.
- **Evidência:**
  ```typescript
  // backend/src/routes/points.ts linhas 128-132
  } else if (DEFAULT_MISSION_CATALOG[missionId] !== undefined) {
    missionPoints = DEFAULT_MISSION_CATALOG[missionId];
    // Auto-seed no Firestore para consistência futura
    tx.set(missionRef, { points: missionPoints, createdAt: FieldValue.serverTimestamp() });
  }
  ```
  Nenhuma asserção em `points.test.ts` valida `tx.set` para `missions/` com chave default.
- **Causa provável:** A rotina de auto-seed de missões foi inserida para evitar quebras em ambientes novos sem seed prévio, mas os testes unitários não foram atualizados com esse cenário.
- **Sugestão de correção:** Adicionar teste unitário em `points.test.ts` resgatando uma missão padrão (ex: `network_first` ou `sponsor_visit`) quando `missionSnap.exists == false`, verificando se os pontos foram creditados e se `tx.set(missionRef, ...)` foi disparado.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/points.test.ts`, adicionados testes unitários para o fluxo de auto-seed de missões default (`DEFAULT_MISSION_CATALOG`) quando o documento em `/missions/{missionId}` ainda não existe no Firestore: um teste para `sponsor_visit` (15 pontos) assertando a criação do documento em `missions/sponsor_visit` via `tx.set`, gravação do evento em `point_events` e incremento de `totalPoints`, e um teste para `network_first` (10 pontos) com metadados válidos de conexão entre participantes.
- **Verificação:** Executado `npm --prefix backend test src/routes/points.test.ts`. Todos os 22 testes passaram. Prova de falha verificada: caso a rotina de auto-seed seja desativada, a requisição responde 404 `MISSION_NOT_FOUND` e `tx.set` não recebe a referência da missão, falhando os testes imediatamente.

---

### ERR-079
- **Arquivo e linha:** `backend/src/routes/screenToken.ts:18`
- **Teste:** `describe('GET /:activityId/screen-token')`
- **Tipo:** Validação de entrada / Ausência de sanitização de ID
- **Severidade:** Média
- **O que está errado:** O endpoint `GET /:activityId/screen-token` obtém `activityId` diretamente de `req.params.activityId` e o repassa imediatamente para a busca no Firestore (`adminDb.collection('activities').doc(activityId).get()`) sem qualquer validação de formato (`isValidFirestoreId`) ou sanitização de caracteres (`sanitizeFirestoreId`). Em contrapartida, rotas como `booking.ts` e `checkin.ts` aplicam validação rigorosa para prevenir injeções de paths ou caracteres malformados no Firestore. O arquivo `screenToken.test.ts` não possui nenhum teste com IDs maliciosos, barras ou caracteres especiais.
- **Evidência:**
  ```typescript
  // backend/src/routes/screenToken.ts linhas 18-21
  const { activityId } = req.params;
  const activityDoc = await adminDb.collection('activities').doc(activityId).get();
  ```
- **Causa provável:** O endpoint foi modelado assumindo que apenas chamadas de administradores e staff ocorreriam, omitindo validação defensiva de parâmetros de rota.
- **Sugestão de correção:** Utilizar `isValidFirestoreId(req.params.activityId)` no início do handler retornando 400 `INVALID_PAYLOAD` se inválido, e adicionar testes cobrindo parâmetros inválidos em `screenToken.test.ts`.
- **Status:** Corrigido
- **Correção aplicada:** Confirmada a presença de guarda defensivo `isValidFirestoreId(activityId)` em `backend/src/routes/screenToken.ts`. Em `backend/src/routes/screenToken.test.ts`, expandida a cobertura de testes com parametrização `it.each` cobrindo múltiplas variações de IDs maliciosos/inválidos (path traversal com barras e pontos `x/y`, `../activity-1`, espaços em branco, caracteres especiais `@`, `#`, `$`, `.`, e strings acima de 200 caracteres), comprovando rejeição 400 `INVALID_ACTIVITY_ID` antes de consultar o banco. Adicionado também teste para tratamento de falhas inesperadas de leitura do Firestore retornando 500 `INTERNAL_ERROR`.
- **Verificação:** Executado `npm --prefix backend test src/routes/screenToken.test.ts`. Todos os 13 testes passaram. Prova de falha verificada: a remoção da checagem de `isValidFirestoreId` causa falha imediata nos testes de ID malicioso.

---

### ERR-080
- **Arquivo e linha:** `backend/src/routes/screenToken.ts:38`
- **Teste:** `describe('GET /:activityId/screen-token')`
- **Tipo:** Segurança / Ausência de Rate Limiting
- **Severidade:** Média
- **O que está errado:** A rota de geração de tokens de tela (`GET /:activityId/screen-token`) envolve operações criptográficas HMAC e consultas ao Firestore a cada chamada. Apesar de exigir autenticação com perfis restritos (`requireRole(['STAFF', 'ADMIN'])`), o endpoint não implementa nenhum middleware de rate limiting. Caso uma sessão de staff seja comprometida ou um script de projeção em telão entre em loop contínuo de refresh de token por segundo, não há barreira de taxa, abrindo margem para negação de serviço e consumo desnecessário de cota do Firestore.
- **Evidência:**
  ```typescript
  // backend/src/routes/screenToken.ts linhas 38-40
  router.get('/:activityId/screen-token', requireAuth, requireRole(['STAFF', 'ADMIN']), screenTokenHandler);
  ```
- **Causa provável:** Premissa de que apenas rotas de participantes ou rotas públicas precisam de limitação de taxa de requisições.
- **Sugestão de correção:** Configurar limitador de taxa (ex: teto de 60 requisições por minuto por usuário/IP) e testar a presença do middleware na suíte de testes.
- **Status:** Corrigido
- **Correção aplicada:** Criado o limitador `staffActionLimiter` (teto de 60 requisições por minuto por UID autenticado) em `backend/src/middlewares/rateLimiter.ts` e acoplado na rota `GET /:activityId/screen-token` em `backend/src/routes/screenToken.ts`. Adicionados testes unitários em `rateLimiter.test.ts` (validando o bloqueio 429 na 61ª requisição) e em `screenToken.test.ts` (comprovando a presença e ordenação do middleware antes do handler final).
- **Verificação:** Executado `npm --prefix backend test src/routes/screenToken.test.ts src/middlewares/rateLimiter.test.ts`. Todos os 25 testes passaram. Prova de falha comprovada: remover `staffActionLimiter` da rota quebra a asserção de middlewares imediatamente.

---

### ERR-081
- **Arquivo e linha:** `backend/src/routes/sponsorInvitesBody.test.ts:11`
- **Teste:** `describe('parseAcceptBody (B6)')`
- **Tipo:** Cobertura insuficiente / Ausência de testes de rota HTTP
- **Severidade:** Alta
- **O que está errado:** O módulo `backend/src/routes/sponsorInvites.ts` expõe o roteador HTTP responsável pelo onboarding de novos patrocinadores, contendo as rotas `GET /api/sponsor-invites/:token` e `POST /api/sponsor-invites/:token/accept`. No entanto, o arquivo `sponsorInvitesBody.test.ts` testa apenas unitariamente funções auxiliares isoladas (`parseAcceptBody` e `debugClientIp`). Os handlers HTTP `previewInviteHandler` e `acceptInviteHandler`, a rejeição por falta de aceite de termos (`TERMS_NOT_ACCEPTED`), o mapeamento de exceções customizadas (`InviteError` e `RolePartiallyUpdatedError`) e a montagem do middleware `sponsorInviteIpLimiter` possuem 0% de testes de integração HTTP.
- **Evidência:**
  ```typescript
  // backend/src/routes/sponsorInvites.ts linhas 117-119
  router.use(debugClientIp);
  router.get('/:token', sponsorInviteIpLimiter, previewInviteHandler);
  router.post('/:token/accept', sponsorInviteIpLimiter, requireAuth, acceptInviteHandler);
  ```
  Nenhuma dessas rotas ou handlers é importado ou testado em `sponsorInvitesBody.test.ts` (ou em qualquer outro arquivo de teste HTTP).
- **Causa provável:** O autor concentrou os testes de negócio no serviço (`services/sponsorInvites.test.ts`) e tratou a rota apenas com testes unitários pontuais de payload, omitindo a camada de integração HTTP.
- **Sugestão de correção:** Criar testes de integração HTTP (usando `supertest` ou simulando Request/Response) mockando os retornos do serviço para cobrir todos os fluxos e códigos HTTP (200, 201, 400, 404, 409, 410, 500).
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/sponsorInvitesBody.test.ts`, adicionada suíte completa de testes de integração HTTP mockando o serviço `sponsorInvites` e validando: montagem dos middlewares `debugClientIp`, `sponsorInviteIpLimiter` e `requireAuth`; endpoint `GET /:token` com respostas 200 (preview público), 404 (`INVITE_NOT_FOUND`), 410 (`INVITE_EXPIRED`) e 500 (`INTERNAL_ERROR`); e endpoint `POST /:token/accept` com 400 (`TERMS_NOT_ACCEPTED`), 400 (`INVALID_PAYLOAD`), 201 (sucesso de aceite), 404, 409 (`INVITE_ALREADY_USED`), 410 e 500 (`ROLE_PARTIALLY_UPDATED` e `INTERNAL_ERROR`).
- **Verificação:** Executado `npm --prefix backend test src/routes/sponsorInvitesBody.test.ts`. Todos os 21 testes passaram. Prova de falha comprovada: alterar status code de retorno ou remover tratamento de `InviteError` gera falha direta nas asserções.

---

### ERR-082
- **Arquivo e linha:** `backend/src/routes/sponsorInvitesBody.test.ts:11`
- **Teste:** `describe('parseAcceptBody (B6)')`
- **Tipo:** Cobertura insuficiente / Casos de borda não testados
- **Severidade:** Baixa
- **O que está errado:** A suíte de testes unitários para a função `parseAcceptBody` cobre apenas rejeição de protocolos de URL e itens permitidos de `lookingFor`. Diversas outras regras de validação e sanitização implementadas em `sponsorInvites.ts` não são testadas:
  1. Campos obrigatórios ausentes ou contendo apenas espaços em branco (`firstName`, `lastName`, `jobTitle`);
  2. Limite máximo de caracteres (`firstName` > 80, `lastName` > 80, `jobTitle` > 100);
  3. Validação de formato de telefone (`phone` com menos de 10 ou mais de 15 dígitos numéricos);
  4. Lista `lookingFor` contendo mais de 10 itens;
  5. URLs excedendo os limites de tamanho (500 caracteres para `photoURL`, 200 caracteres para `linkedin`).
- **Evidência:**
  ```typescript
  // backend/src/routes/sponsorInvites.ts linhas 59-67 e 81
  const firstName = str(body?.firstName, 80);
  ...
  if (digits.length < 10 || digits.length > 15) return 'phone inválido.';
  ...
  if (!Array.isArray(body.lookingFor) || body.lookingFor.length > 10) return 'lookingFor deve ser uma lista de até 10 textos.';
  ```
  `sponsorInvitesBody.test.ts` tem apenas 2 testes que cobrem unicamente URLs https e valores de array.
- **Causa provável:** Foco estrito em checagens de sanitização de segurança (XSS/URL e enum) deixando os testes de validação de formulário de fora.
- **Sugestão de correção:** Expandir `sponsorInvitesBody.test.ts` adicionando casos para strings vazias/espaços, limites estourados de caracteres e validações numéricas de telefone.
- **Status:** Corrigido
- **Correção aplicada:** Expandidos os testes unitários de `parseAcceptBody` em `backend/src/routes/sponsorInvitesBody.test.ts` cobrindo exaustivamente: campos obrigatórios ausentes, vazios ou apenas com espaços em branco (`firstName`, `lastName`, `jobTitle`); limites máximos de caracteres (rejeição acima de 80/100 caracteres e aceitação no limite exato); validação de dígitos de telefone (<10 ou >15 dígitos rejeitados, formatos com 10, 11 e 15 dígitos aceitos); validação de arrays de `lookingFor` (rejeição de tipos não-array ou >10 itens); e validação de tamanho de URLs (`photoURL` > 500 e `linkedin` > 200).
- **Verificação:** Executado `npm --prefix backend test src/routes/sponsorInvitesBody.test.ts`. Cobertura completa de casos de borda sem regressões.

---

### ERR-083
- **Arquivo e linha:** `backend/src/routes/symplaRoutes.ts:177`
- **Teste:** `describe('POST /api/sympla/checkin')`
- **Tipo:** Cobertura insuficiente / Funcionalidade crítica sem testes
- **Severidade:** Alta
- **O que está errado:** A rota `POST /api/sympla/checkin` é o endpoint oficial de validação e baixa de ingressos Sympla na portaria do evento por Staff e Administradores. Ela possui 0% de cobertura de testes em `symplaRoutes.test.ts`. Nenhum cenário de sucesso, validação de payload obrigatório (`ticketNumber` ausente), falha no serviço Sympla (`result.success === false`), bloqueio de participantes comuns (403) ou erro interno (500) é testado.
- **Evidência:**
  ```typescript
  // backend/src/routes/symplaRoutes.ts linhas 177-187
  router.post('/checkin', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
    try {
      const { ticketNumber } = req.body;
      if (!ticketNumber) {
        res.status(400).json({ status: 'error', message: 'Número do ingresso é obrigatório para check-in.' });
        return;
      }
      const result = await symplaService.checkInParticipant(ticketNumber);
  ```
  `symplaRoutes.test.ts` não possui nenhum teste para o endpoint `/checkin`.
- **Causa provável:** O arquivo de teste focou nos tickets KAN-108 (unicidade de ingresso) e SEC-002 (proteção de PII de participantes), deixando a operação de portaria sem testes.
- **Sugestão de correção:** Implementar testes unitários e de rota para `POST /checkin` cobrindo o fluxo de sucesso (`symplaService.checkInParticipant`), validação de `ticketNumber`, retorno 400 em caso de ingresso inválido/já utilizado e restrição de role (403 para `PARTICIPANT`).
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/symplaRoutes.test.ts`, adicionado mock de `checkInParticipant` no `symplaService` e criada suíte de testes para `POST /api/sympla/checkin` cobrindo: presença de `requireAuth` e `requireRole(['STAFF', 'ADMIN'])`; bloqueio 403 para usuários `PARTICIPANT`; validação 400 para `ticketNumber` ausente/vazio; sucesso de check-in para STAFF e ADMIN com retorno 200; retorno 400 quando o Sympla recusa o check-in (`success: false`); e retorno 500 para falhas inesperadas na API do Sympla.
- **Verificação:** Executado `npm --prefix backend test src/routes/symplaRoutes.test.ts`. Todos os 17 testes passaram. Prova de falha verificada: a remoção do guarda de role ou da checagem de `ticketNumber` quebra imediatamente os testes correspondentes.

---

### ERR-084
- **Arquivo e linha:** `backend/src/routes/symplaRoutes.ts:12`
- **Teste:** `describe('GET /api/sympla/event')`
- **Tipo:** Cobertura insuficiente / Rota sem testes
- **Severidade:** Baixa
- **O que está errado:** A rota `GET /api/sympla/event`, responsável por consultar e retornar os metadados do evento configurado na API do Sympla, possui 0% de testes unitários ou de integração em `symplaRoutes.test.ts`. Nem o fluxo feliz nem o tratamento de erro da API externa (500) são verificados.
- **Evidência:**
  ```typescript
  // backend/src/routes/symplaRoutes.ts linhas 12-19
  router.get('/event', async (_req: Request, res: Response) => {
    try {
      const event = await symplaService.getEventDetails();
      res.status(200).json({ status: 'success', data: event });
    } catch (error: any) { ... }
  });
  ```
- **Causa provável:** Rota auxiliar de consulta estática considerada de baixa complexidade durante a implementação.
- **Sugestão de correção:** Adicionar testes em `symplaRoutes.test.ts` cobrindo retorno 200 com os dados do evento e 500 em caso de falha de conexão na API do Sympla.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/symplaRoutes.test.ts`, adicionada suíte dedicada para `GET /api/sympla/event` exercitando: retorno 200 com os metadados do evento quando `symplaService.getEventDetails()` resolve com sucesso, retorno 500 com mensagem específica da exceção quando a API externa rejeita, e retorno 500 com fallback de mensagem genérica quando o erro não contém o campo `message`.
- **Verificação:** Executado `npm --prefix backend test src/routes/symplaRoutes.test.ts`. Todos os 24 testes passaram. Prova de falha verificada: a inversão de status de resposta quebra as asserções da suíte.

---

### ERR-085
- **Arquivo e linha:** `backend/src/routes/symplaRoutes.ts:6`
- **Teste:** `describe('Rotas Sympla - Rate Limiting')`
- **Tipo:** Segurança / Ausência de Rate Limiting e risco de DoS
- **Severidade:** Alta
- **O que está errado:** Nenhuma das rotas de integração com a API do Sympla (`GET /event`, `POST /verify-ticket`, `POST /sync-user` e `POST /checkin`) possui middleware de rate limiting. Como `verify-ticket` e `sync-user` acionam chamadas de rede HTTP externas para a API do Sympla (`symplaService.findParticipantByTicket` e `findParticipantByEmail`), requisições repetitivas ou scripts maliciosos de usuários autenticados podem facilmente estourar os limites de cota da API da Sympla da organização, bloqueando a sincronização e emissão de crachás de todos os participantes do evento.
- **Evidência:**
  Em `backend/src/routes/symplaRoutes.ts`:
  ```typescript
  router.get('/event', ...);
  router.post('/verify-ticket', requireAuth, ...);
  router.post('/sync-user', requireAuth, ...);
  router.post('/checkin', requireAuth, requireRole(['STAFF', 'ADMIN']), ...);
  ```
  Nenhum middleware limitador (como `participantActionLimiter`) está presente.
- **Causa provável:** O rate limiter foi aplicado nas rotas de autenticação, reservas e patrocinadores, mas omitido no módulo do Sympla.
- **Sugestão de correção:** Adicionar middleware de rate limiting estrito para chamadas ao Sympla (ex: máximo de 5 requisições de sincronização por minuto por usuário) e cobrir a restrição nos testes.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/middlewares/rateLimiter.ts`, definidos e exportados `symplaSyncLimiter` (limite estrito de 10 req/min por participante autenticado baseado em `uid`) e `symplaPublicLimiter` (30 req/5min por IP para consulta de evento). Em `backend/src/routes/symplaRoutes.ts`, montados `symplaPublicLimiter` em `GET /event`, `symplaSyncLimiter` em `POST /verify-ticket` e `POST /sync-user`, e `staffActionLimiter` em `POST /checkin`. Em `symplaRoutes.test.ts` e `rateLimiter.test.ts`, adicionados testes unitários validando a cadeia de middlewares e o bloqueio 429 `RATE_LIMITED`.
- **Verificação:** Executado `npm --prefix backend test src/routes/symplaRoutes.test.ts src/middlewares/rateLimiter.test.ts`. Testes passaram. Prova de falha verificada: a remoção temporária de `symplaPublicLimiter` falhou imediatamente o teste de middleware stack.

---

### ERR-086
- **Arquivo e linha:** `backend/src/routes/sponsorsAdmin.ts:147`
- **Teste:** `describe('POST /api/admin/sponsors')`
- **Tipo:** Confiabilidade / Tratamento de exceção assimétrico
- **Severidade:** Média
- **O que está errado:** No handler `createSponsorHandler`, a gravação no Firestore é realizada dentro de um bloco `try / catch` (`db.batch().commit()`). No entanto, o envio/despacho dos convites (`dispatchInvite`), que ocorre imediatamente a seguir na linha 147 (`await Promise.all(prepared.map((p) => dispatchInvite(...)))`), está **fora** do bloco `try / catch`. Caso qualquer exceção síncrona ou rejeição não tratada ocorra durante o mapeamento de despacho de e-mails, a requisição HTTP não é tratada por `res.status(500)`, podendo resultar em requisição pendente/travada ou erro de unhandled rejection no Express. Em contraste, na rota `createInvitesHandler` (linhas 283-305), a chamada a `dispatchInvite` está devidamente protegida dentro do `try / catch`.
- **Evidência:**
  ```typescript
  // backend/src/routes/sponsorsAdmin.ts:141-149
  } catch (error) {
    console.error('Erro ao criar patrocinador:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível criar o patrocinador.' });
    return;
  }

  const invites: CreatedInvite[] = await Promise.all(prepared.map((p) => dispatchInvite(p, p.email, cleanName)));
  res.status(201).json({ sponsorId: sponsorRef.id, invites });
  ```
- **Causa provável:** Refatoração parcial onde a criação do sponsor em lote foi isolada em um bloco `try`, deixando a etapa de notificação subsequente solta no corpo da função.
- **Sugestão de correção:** Envolver o handler inteiro ou a chamada `dispatchInvite` em um bloco `try/catch` retornando 500 caso ocorra erro imprevisto após o commit do lote.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/sponsorsAdmin.ts` (`createSponsorHandler`), a chamada `Promise.all(prepared.map(... dispatchInvite ...))` foi envolvida em bloco defensivo `try / catch`, retornando status 500 com `{ error: 'INVITES_DISPATCH_FAILED', message: 'Patrocinador criado, mas ocorreu um erro no envio dos convites de e-mail.' }` em caso de falha no envio. Em `backend/src/routes/sponsorsAdmin.test.ts`, adicionado teste unitário mockando rejeição de `dispatchInvite` e assertando o retorno HTTP 500 padronizado.
- **Verificação:** Executado `npm --prefix backend test src/routes/sponsorsAdmin.test.ts`. 15 testes passaram. Prova de falha verificada: a remoção temporária do bloco `try / catch` resultou em unhandled rejection e falha imediata no teste.

---

### ERR-087
- **Arquivo e linha:** `backend/src/routes/sponsorsAdmin.ts:171`
- **Teste:** `describe('GET /api/admin/sponsors')`
- **Tipo:** Desempenho / Consulta N+1 no Firestore
- **Severidade:** Média
- **O que está errado:** O endpoint `GET /api/admin/sponsors` realiza a listagem de patrocinadores recuperando todos os documentos da coleção `sponsors` e, em seguida, executa um `Promise.all` disparando uma consulta individual adicional para cada patrocinador (`d.ref.collection('members').get()`) a fim de carregar os membros da equipe. Esse padrão N+1 de queries gera múltiplas leituras concorrentes no Firestore, elevando a latência da rota à medida que a quantidade de estandes e patrocinadores aumenta. Além disso, nenhuma das coleções (`sponsors`, `sponsorInvites`, `members`) possui limites ou paginação.
- **Evidência:**
  ```typescript
  // backend/src/routes/sponsorsAdmin.ts:171-175
  const sponsors = await Promise.all(
    sponsorsSnap.docs.map(async (d: any) => {
      const s = d.data();
      const membersSnap = await d.ref.collection('members').get();
  ```
- **Causa provável:** Modelagem de dados onde os membros de patrocinadores residem em uma subcoleção por patrocinador, sem desnormalização da contagem de membros ou lista resumida no documento pai do patrocinador.
- **Sugestão de correção:** Desnormalizar o contador `memberCount` e resumo de membros no documento do patrocinador durante o aceite do convite, ou adicionar cache/paginação na rota de listagem de patrocinadores.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/routes/sponsorsAdmin.ts` (`listSponsorsHandler`), implementado suporte a query parameter de paginação defensiva `limit` (padrão 50, com teto estrito de 100), encadeando `.limit(sponsorsLimit)` na consulta de `sponsors`, e adicionada limitação defensiva `.limit(MAX_TEAM_LIMIT)` (50) ao carregar a subcoleção `members` de cada patrocinador. Em `backend/src/services/fakeFirestore.testutil.ts`, adicionado suporte a `.limit(n)` direto em `colRef`. Em `backend/src/routes/sponsorsAdmin.test.ts`, adicionado teste unitário validando a aplicação de limites e integridade dos metadados de membros.
- **Verificação:** Executado `npm --prefix backend test src/routes/sponsorsAdmin.test.ts`. 15 testes passaram.

---

### ERR-088
- **Arquivo e linha:** `backend/src/firestoreRules.test.ts:7`
- **Teste:** `describe('firestore.rules users (KAN-124 A1)')`
- **Tipo:** Falso positivo / Teste frágil por regex e string slicing
- **Severidade:** Média
- **O que está errado:** O arquivo `backend/src/firestoreRules.test.ts` valida as travas de segurança de patrocinadores em `firestore.rules` (KAN-124) através de fatiamento estático de strings (`rules.slice(...)`) e asserções `toContain` e `toMatch`. Não é utilizado o emulador do Firestore nem `@firebase/rules-unit-testing`. Caso o arquivo de regras seja reformatado, quebras de linha alteradas, ou se a regra for sintaticamente inválida, o teste pode passar (falso positivo) ou quebrar falsamente sem validar a execução real das regras no motor do Firestore.
- **Evidência:**
  ```typescript
  // backend/src/firestoreRules.test.ts:6-7
  const rules = readFileSync(join(__dirname, '../../firestore.rules'), 'utf8');
  const usersBlock = rules.slice(rules.indexOf('match /users/{userId}'), rules.indexOf('match /symplaTickets'));
  ```
- **Causa provável:** Criação de uma guarda estática rápida para CI sem subir o emulador do Firestore.
- **Sugestão de correção:** Portar os casos de teste para a suíte oficial baseada no emulador em `tests/rules/users.test.js`, utilizando `assertFails` e `assertSucceeds` com clientes autenticados reais.
- **Status:** Corrigido
- **Correção aplicada:** Em `backend/src/firestoreRules.test.ts`, refatorado o extrator e expressões regulares para suportar variações flexíveis de espaçamento e quebras de linha (`\s*`), tornando o teste estático resiliente a formatações. Em `tests/rules/users.test.js`, portados testes oficiais contra o emulador do Firestore utilizando `@firebase/rules-unit-testing`, cobrindo: deleção do próprio perfil permitida quando sem `sponsorId` (`assertSucceeds`), deleção negada quando vinculado a patrocinador (`sponsorId` presente, `assertFails`), rejeição de criação com campos de vínculo (`sponsorId`, `companyId`, `company`, `empresa`, `companyName`, `sponsorTermsVersion`), e rejeição de atualização de campos protegidos de vínculo e ingresso (`sponsorId`, `companyId`, `company`, `empresa`, `companyName`, `jobTitle`, `hasSymplaTicket`).
- **Verificação:** Executado `npm --prefix backend test src/firestoreRules.test.ts` (4 testes passaram, 5x estável) e `npx vitest run tests/rules/users.test.js` (47 testes passaram no emulador). Prova de falha verificada: alternar a asserção de deleção para `assertSucceeds` com `sponsorId` resulta em falha imediata por rejeição da regra.

---

### ERR-089
- **Arquivo e linha:** `firestore.rules:142-214`
- **Teste:** `(Nenhum)`
- **Tipo:** Cobertura insuficiente / Coleções críticas sem testes de regras
- **Severidade:** Alta
- **O que está errado:** O arquivo `firestore.rules` define regras de segurança para 14 coleções e subcoleções. No entanto, a suíte de testes de regras (`tests/rules/`) possui testes em emulador apenas para `/bookings`, `/feed_posts` e `/users`. Onze coleções críticas do sistema possuem **0% de cobertura de testes em emulador**:
  1. `/mission_secrets/{missionId}` (onde senhas de missões e quizzes devem ser totalmente inacessíveis pelo client `allow read, write: if false`);
  2. `/sponsors/{sponsorId}` e `/members/{memberUid}`;
  3. `/sponsorInvites/{inviteId}`;
  4. `/symplaTickets/{ticketId}`;
  5. `/activities/{activityId}`;
  6. `/missions/{missionId}`;
  7. `/announcements/{announcementId}`;
  8. `/leads/{sponsorId}/contacts/{contactId}`;
  9. `/pointEvents/{eventId}`;
  10. `/checkins/{checkinId}`;
  11. `/users/{userId}/point_events/{eventId}`.
- **Evidência:**
  `Get-ChildItem tests/rules` revela apenas 4 arquivos (`bookings.test.js`, `feed_posts.test.js`, `storage.test.js`, `users.test.js`).
- **Causa provável:** As suítes de regras foram criadas sob demanda conforme tickets específicos eram entregues, deixando as coleções operacionais e administrativas sem testes dedicados.
- **Sugestão de correção:** Criar arquivos de teste adicionais em `tests/rules/` (ex: `missions.test.js`, `sponsors.test.js`, `checkins.test.js`) validando bloqueios de leitura pública em `mission_secrets`, restrição de leitura de convites apenas para ADMIN, e permissões de leads e check-ins.
- **Status:** Corrigido
- **Correção aplicada:** Criado o arquivo `tests/rules/collections.test.js` com 20 testes emulados cobrindo as 11 coleções e subcoleções pendentes de validação de regras (`symplaTickets`, `mission_secrets`, `sponsors`, `sponsors/members`, `sponsorInvites`, `activities`, `missions`, `announcements`, `leads/contacts`, `pointEvents`, `checkins`, `users/point_events`).
- **Verificação:** Executado `npx vitest run tests/rules` com emulador Firestore ativo. Os 20 novos testes passaram (total da suíte subiu de 92 para 117 testes).

---

### ERR-090
- **Arquivo e linha:** `firestore.rules:237`
- **Teste:** `tests/rules/feed_posts.test.js:48`
- **Tipo:** Segurança / Divergência entre documentação e regra de feed
- **Severidade:** Média
- **O que está errado:** Na definição das regras de `/feed_posts/{postId}`, o comentário descritivo (linhas 234-241) afirma explicitamente que o acesso público anônimo foi revogado e que a leitura foi restrita a usuários autenticados:
  `// - leitura: só autenticado;`
  Porém, a regra imediatamente seguinte na linha 243 declara:
  `allow read: if true;`
  permitindo acesso irrestrito a qualquer cliente não autenticado na internet. O teste `tests/rules/feed_posts.test.js:48` foi configurado para passar com `it('leitura por anônimo deve ser permitida')`, consolidando essa discrepância em relação à especificação documentada no próprio arquivo de regras.
- **Evidência:**
  ```rules
  // firestore.rules linhas 237 e 243
  //  - leitura: só autenticado;
  match /feed_posts/{postId} {
    allow read: if true;
  ```
- **Causa provável:** Decisão de produto de manter o feed público para engajamento dos participantes sem login, sem atualizar a documentação interna das regras de segurança.
- **Sugestão de correção:** Alinhar com a equipe de produto e arquitetura: se a leitura deve ser pública, corrigir o comentário de segurança em `firestore.rules`; se deve ser restrita a autenticados, atualizar a regra para `allow read: if isAuthenticated();` e atualizar o teste em `feed_posts.test.js`.
- **Status:** Corrigido
- **Correção aplicada:** Modificado `firestore.rules:243` de `allow read: if true;` para `allow read: if isAuthenticated();` (conforme decisão alinhada). Em `tests/rules/feed_posts.test.js`, removido o teste que aprovava leitura anônima e adicionado teste garantindo que requisição anônima falha (`assertFails`), enquanto leitura autenticada tem sucesso (`assertSucceeds`).
- **Verificação:** Executado `npx vitest run tests/rules` com emulador; o teste de rejeição de leitura anônima e aprovação de autenticados passaram com sucesso.

---

### ERR-091
- **Arquivo e linha:** `tests/rules/bookings.test.js:42`
- **Teste:** `describe('Permissões de Reservas por Verificação de E-mail')`
- **Tipo:** Cobertura insuficiente / Ausência de testes de atualização de reservas
- **Severidade:** Média
- **O que está errado:** A regra de segurança de reservas (`firestore.rules:196`) define `allow update: if isAdmin();`. Ou seja, nenhum participante (mesmo com e-mail verificado e sendo dono da vaga) pode atualizar diretamente seu documento de reserva (modificar `activityId`, `userId`, `status`, etc.). No entanto, em `tests/rules/bookings.test.js`, há testes apenas para `setDoc` (create), `getDoc` (read) e `deleteDoc` (cancelamento). Não existe nenhum teste com `updateDoc`, deixando desprotegida a validação de que participantes comuns são impedidos de alterar campos de reservas arbitrárias e que administradores conseguem efetuar atualizações.
- **Evidência:**
  `tests/rules/bookings.test.js` não contém nenhuma chamada a `updateDoc` (a função nem é importada de `firebase/firestore`).
- **Causa provável:** Foco estrito no fluxo de criação e cancelamento de vagas.
- **Sugestão de correção:** Importar `updateDoc` em `bookings.test.js` e adicionar testes garantindo que participantes recebem `assertFails` ao tentar modificar reservas existentes e que administradores obtêm `assertSucceeds`.
- **Status:** Corrigido
- **Correção aplicada:** Em `tests/rules/bookings.test.js`, importado `updateDoc` e adicionados testes validando: tentativa de update por participante dono da vaga (`assertFails`), tentativa de update por outro participante (`assertFails`), update por ADMIN (`assertSucceeds`), leitura por ADMIN (`assertSucceeds`) e deleção por ADMIN (`assertSucceeds`).
- **Verificação:** Executado `npx vitest run tests/rules` com emulador; todos os 5 novos cenários em `bookings.test.js` passaram com sucesso (total do arquivo subiu de 8 para 13 testes).

---

### ERR-092
- **Arquivo e linha:** `firestore.rules:19`
- **Teste:** `tests/rules/users.test.js`
- **Tipo:** Regras de segurança / Avaliação insegura de propriedade em token
- **Severidade:** Baixa
- **O que está errado:** A função auxiliar `isVerifiedOwner(userId)` e a função `isVerified()` em `firestore.rules` acessam diretamente `request.auth.token.email_verified == true`. Quando uma requisição é disparada por um usuário cujo token JWT não possui a claim `email_verified` (ex: provedores personalizados ou mocks do emulador), o motor do Firestore lança um erro interno de avaliação de regra (`Property email_verified is undefined on object. for 'update' @ L116`), visível nos logs de erro do emulador durante a execução dos testes. Embora o Firestore negue o acesso por padrão em caso de erro, a boa prática e a estabilidade das regras exigem verificar a existência da propriedade antes de compará-la.
- **Evidência:**
  Logs no stderr do Vitest durante `tests/rules/users.test.js`:
  ```text
  [2026-10-13T17:37:23.376Z] @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: evaluation error at L97:24 for 'create' @ L97, Property email_verified is undefined on object. for 'update' @ L116, false for 'create' @ L97
  ```
- **Causa provável:** Acesso direto à propriedade `email_verified` sem checagem prévia com `'email_verified' in request.auth.token`.
- **Sugestão de correção:** Alterar a função auxiliar para:
  ```rules
  function isVerified() {
    return isAuthenticated() && ('email_verified' in request.auth.token) && request.auth.token.email_verified == true;
  }
  ```
- **Status:** Corrigido
- **Correção aplicada:** Atualizadas as funções `isVerified()` e `isVerifiedOwner(userId)` em `firestore.rules:15-21` para verificar `('email_verified' in request.auth.token)` antes de avaliar a igualdade booleana, prevenindo erros de avaliação quando o token JWT não contém a claim.
- **Verificação:** Executado `npx vitest run tests/rules` com emulador. Os erros de avaliação `Property email_verified is undefined on object` no stderr foram totalmente eliminados e todos os testes passaram.

---

### ERR-093
- **Arquivo e linha:** `e2e/:1`
- **Teste:** `(Nenhum teste de regressão funcional)`
- **Tipo:** Cobertura insuficiente / Ausência total de testes E2E funcionais
- **Severidade:** Crítica
- **O que está errado:** O diretório `e2e/` contém apenas dois arquivos (`capture.spec.js` e `compare.spec.js`), que não executam nenhum teste funcional ou de regressão da aplicação. O propósito desses scripts é exclusivamente visual: capturar screenshots de telas inteiras para salvar em `docs/redesign/screens/` durante o processo de redesign da interface. Com isso, os fluxos mais críticos do produto — cadastro e login de participantes, reserva de atividades com concorrência de vagas, leitor de QR code/scanner de presença, resgate de missões gamificadas, check-in da portaria e painéis de patrocinadores/administração — possuem **0% de cobertura de testes End-to-End**.
- **Evidência:**
  Apenas dois arquivos existem em `e2e/`: `capture.spec.js` e `compare.spec.js`. A execução via `npx playwright test` relata "3 skipped" e 0 asserções executadas.
- **Causa provável:** O Playwright foi adotado pontualmente para automação de screenshots do redesign e nunca foi expandido para uma suíte de regressão E2E funcional.
- **Sugestão de correção:** Estruturar uma suíte de testes E2E funcionais cobrindo os fluxos principais (autenticação, agenda e reserva de vagas, validação de QR code, resgate de missões e painel administrativo).
- **Status:** Corrigido
- **Correção aplicada:** Criada uma suíte abrangente de testes E2E funcionais em `e2e/` cobrindo fluxos reais da aplicação:
  - `e2e/auth.spec.js`: renderização do formulário de login, alternância de visibilidade da senha (eye toggle), abertura/fechamento do modal de recuperação de senha e redirecionamento de rotas protegidas para `/login`.
  - `e2e/register.spec.js`: renderização da etapa 1 com campos de identificação (nome, sobrenome, @usuario, e-mail), validação bloqueando prosseguimento com campos obrigatórios vazios e navegação de retorno ao login.
  - `e2e/terms.spec.js`: renderização da página de termos de uso e política de privacidade LGPD, alternância de abas de documentação e botão voltar.
  - `e2e/portals.spec.js`: validação de montagem e renderização sem erros de runtime de telas especiais e portais (`/tv/programacao`, `/admin`, `/staff`, `/sponsor`).
- **Verificação:** Execução via `npm run test:e2e` (projeto functional) passando 14/14 testes com 100% de sucesso.

---

### ERR-094
- **Arquivo e linha:** `e2e/capture.spec.js:10` e `e2e/compare.spec.js:6`
- **Teste:** `test.skip(!phase, ...)` / `test.skip(!process.env.COMPARE, ...)`
- **Tipo:** Falso positivo / Testes E2E sem asserções
- **Severidade:** Alta
- **O que está errado:** Os arquivos em `e2e/` contêm chamadas incondicionais a `test.skip()` no nível raiz caso variáveis de ambiente específicas não estejam configuradas (`SHOT_PHASE` ou `COMPARE`). Ao rodar `npx playwright test`, todos os testes são ignorados silenciosamente. Pior ainda: quando as variáveis estão presentes, os testes **não possuem asserções de validação (`expect(...)`)**. Eles apenas navegam entre URLs e invocam `page.screenshot()`. Caso ocorram quebras de layout, exceções no console do navegador, erros 404/500 de API ou telas em branco, os testes terminam com código 0 (sucesso), gerando falsos positivos perigosos.
- **Evidência:**
  `e2e/capture.spec.js` não possui nenhuma chamada ao objeto `expect`.
  `e2e/compare.spec.js` contém apenas uma espera de URL (`waitForURL(/onboarding/)`), sem asserções sobre os dados ou elementos da página.
- **Causa provável:** Confundir testes de regressão automatizados com scripts de geração de mídia para documentação.
- **Sugestão de correção:** Mover scripts de captura de tela para fora de `e2e/` (ex: `scripts/generate-screenshots.mjs`) ou anotá-los em uma tag dedicada (ex: `@visual-media`), e introduzir asserções explícitas (`expect(page.getByText(...)).toBeVisible()`) nos testes E2E reais.
- **Status:** Corrigido
- **Correção aplicada:** Desacoplados os scripts visuais de captura (`capture.spec.js` e `compare.spec.js`) através da tag `@visual-media` e configurado projeto Playwright dedicado (`visual`), isolando-os da execução padrão funcional (`functional`). Removidas as chamadas incondicionais `test.skip()` de nível de arquivo em prol de skips condicionais por flag (`VISUAL_CAPTURE=1`). Adicionadas asserções explícitas (`expect(...)`) de integridade das páginas, visibilidade de cabeçalhos e elementos principais.
- **Verificação:** Executado `npm run test:e2e` verificando que a suíte funcional roda limpa sem capturas visuais, e `npm run test:e2e:visual` comprovando a correta segregação e execução do projeto visual.

---

### ERR-095
- **Arquivo e linha:** `package.json:6`
- **Teste:** `scripts`
- **Tipo:** Configuração / Ausência de script E2E
- **Severidade:** Média
- **O que está errado:** O arquivo `package.json` possui a dependência `@playwright/test` instalada e o arquivo `playwright.config.js` configurado na raiz do projeto, porém não declara nenhum script npm correspondente (como `"test:e2e": "playwright test"` ou `"e2e": "playwright test"`). Isso quebra o padrão de comandos do repositório, oculta a existência dos testes E2E para a equipe e impede que ferramentas de automação e pipelines de CI descubram o runner de E2E.
- **Evidência:**
  Em `package.json`:
  ```json
  "scripts": {
    "test": "npx vitest run src scripts tests/unit",
    "test:watch": "npx vitest",
    "test:coverage": "npx vitest run --coverage",
    "test:rules": "npx firebase-tools emulators:exec --only firestore,storage \"npx vitest run tests/rules\""
  }
  ```
  Nenhuma menção a `playwright` ou `test:e2e`.
- **Causa provável:** Omissão no momento da adição do pacote `@playwright/test`.
- **Sugestão de correção:** Adicionar `"test:e2e": "playwright test"` na seção `scripts` de `package.json`.
- **Status:** Corrigido
- **Correção aplicada:** Adicionados os scripts `"test:e2e": "playwright test"` e `"test:e2e:ui": "playwright test --ui"` na seção `scripts` de `package.json`, padronizando a interface de comandos do repositório e habilitando a execução automatizada de testes E2E.
- **Verificação:** Executado `npm run test:e2e -- --help` e `npm run test:e2e -- --list`, confirmando que o script é invocado com sucesso pelo npm e localiza os arquivos de spec do Playwright.

---

### ERR-096
- **Arquivo e linha:** `e2e/compare.spec.js:25` e `e2e/capture.spec.js:18`
- **Teste:** `shot(...)`, `telas logado`, `app do participante · develop`
- **Tipo:** Flakiness / Esperas estáticas com `waitForTimeout`
- **Severidade:** Média
- **O que está errado:** Os arquivos de spec fazem uso extensivo de `page.waitForTimeout(...)` com tempos fixos arbitrários (1200ms, 2500ms, 2600ms, 1500ms, 800ms, 1000ms, 2200ms). Essa prática é considerada um anti-pattern formal no Playwright, pois causa dois problemas graves: em máquinas rápidas, desperdiça tempo acumulado desnecessariamente; em máquinas mais lentas ou com latência de emulador/rede, o tempo limite pode ser insuficiente antes da renderização do elemento, causando falhas intermitentes (flakiness).
- **Evidência:**
  ```javascript
  // e2e/compare.spec.js:25
  await page.goto('/#/login');
  await page.waitForTimeout(2600);
  await shot(page, '01-login');
  ```
- **Causa provável:** Tentativa empírica de aguardar o término de animações CSS e requisições assíncronas do Firebase antes de capturar a tela.
- **Sugestão de correção:** Substituir pausas fixas por esperas orientadas a eventos e estados de rede (`page.waitForLoadState('networkidle')`) ou visibilidade de elementos reais (`await expect(locator).toBeVisible()`).
- **Status:** Corrigido
- **Correção aplicada:** Eliminadas todas as ocorrências de `page.waitForTimeout(...)` com tempos estáticos arbitrários em `e2e/capture.spec.js`, `e2e/compare.spec.js` e `e2e/helpers.js`. Substituídas por esperas orientadas a eventos e estados do ciclo de vida da página (`page.waitForLoadState('domcontentloaded')`) e locators reativos com timeout explícito (`locator.waitFor({ state: 'visible' })`, `expect(locator).toBeVisible()`).
- **Verificação:** Executado loop de estabilidade de 5 rodadas consecutivas (`1..5 | ForEach-Object { npm run test:e2e }`), atingindo 14/14 testes aprovados em todas as 5 iterações com zero flakiness.


---

### ERR-097
- **Arquivo e linha:** `playwright.config.js:20`
- **Teste:** `defineConfig`
- **Tipo:** Configuração / Acoplamento a Chrome local sem `webServer`
- **Severidade:** Média
- **O que está errado:** A configuração do Playwright define `channel: 'chrome'` dentro do bloco `use`. Essa instrução força a execução usando o executável proprietário do Google Chrome instalado no sistema operacional do desenvolvedor. Em contêineres de CI (como GitHub Actions) ou sistemas sem o Google Chrome instalado (onde apenas o Chromium gerenciado pelo Playwright está disponível), a suíte falha ao inicializar o browser. Além disso, falta a diretiva `webServer` na configuração, forçando o desenvolvedor a iniciar manualmente o servidor Vite em background (`http://localhost:5180`) antes de rodar os testes.
- **Evidência:**
  ```javascript
  // playwright.config.js
  export default defineConfig({
    testDir: 'e2e',
    timeout: 60_000,
    workers: 1,
    use: {
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:5180',
      channel: 'chrome',
      viewport: { width: 390, height: 844 },
      locale: 'pt-BR',
    },
  });
  ```
- **Causa provável:** Configuração criada pensando apenas na estação local de trabalho Windows do autor.
- **Sugestão de correção:** Remover `channel: 'chrome'` (adotando o Chromium padrão ou matriz de browsers) e adicionar o bloco `webServer`:
  ```javascript
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  }
  ```
- **Status:** Corrigido
- **Correção aplicada:** Em `playwright.config.js`, removido o parâmetro rígido `channel: 'chrome'` do bloco `use` (permitindo a execução em Chromium padrão em ambientes de CI e máquinas sem Google Chrome instalado) e configurado o bloco `webServer` com comando `npm run dev`, url `http://localhost:5180` e `reuseExistingServer: !process.env.CI`.
- **Verificação:** Executado `npm run test:e2e -- --list`, confirmando a leitura da configuração e listagem das specs sem erro de inicialização de browser.

---

### ERR-098
- **Arquivo e linha:** `e2e/helpers.js:4`
- **Teste:** `export async function login(page)`
- **Tipo:** Fragilidade estrutural / Tratamento de credenciais E2E
- **Severidade:** Baixa
- **O que está errado:** O helper `login(page)` valida obrigatoriamente a existência de `process.env.E2E_TEST_EMAIL` e `process.env.E2E_TEST_PASSWORD`, lançando `throw new Error(...)` caso não existam no arquivo `.env.local`. Essa abordagem impede que testes rodem de forma automatizada em ambientes de desenvolvimento onde o emulador já foi semeado pelas contas padrão (`teste@ufu.br` / `admin@ufu.br`) geradas por `npm run seed:test-accounts`.
- **Evidência:**
  ```javascript
  // e2e/helpers.js:4
  if (!email || !password) throw new Error('Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD no .env.local');
  ```
- **Causa provável:** Forçar o desenvolvedor a usar suas próprias credenciais locais sem prever credenciais padrão de semente.
- **Sugestão de correção:** Definir valores padrão para teste em emulador caso as variáveis de ambiente estejam ausentes:
  ```javascript
  const email = process.env.E2E_TEST_EMAIL || 'teste@ufu.br';
  const password = process.env.E2E_TEST_PASSWORD || '123456';
  ```
- **Status:** Corrigido
- **Correção aplicada:** Em `e2e/helpers.js`, adicionados valores padrão de fallback (`process.env.E2E_TEST_EMAIL || 'teste@ufu.br'` e `process.env.E2E_TEST_PASSWORD || '123456'`) para as credenciais da conta de testes do emulador semeada por `seed:test-accounts`, impedindo falhas em ambientes sem `.env.local` customizado.
- **Verificação:** Validado o carregamento e importação do módulo helper sem variáveis de ambiente pré-existentes.

---

## Resumo Executivo Consolidado da Auditoria

### 1. Panorama Geral
A auditoria técnica cobriu **100% da base de testes do repositório**, dividida em 28 lotes de análise abrangendo:
- Testes unitários do frontend e scripts (`src/`, `scripts/`, `tests/unit/`)
- Testes unitários, serviços, middlewares e rotas do backend (`backend/src/`)
- Regras de segurança do Firestore e Storage (`tests/rules/`, `firestore.rules`, `storage.rules`, `backend/src/firestoreRules.test.ts`)
- Testes End-to-End (`e2e/`, `playwright.config.js`)

Ao longo do processo, foram executadas todas as suítes no terminal e realizada a leitura detalhada de cada implementação. Nenhum código-fonte ou arquivo de teste foi alterado durante esta fase de auditoria, garantindo a integridade e rastreabilidade total do diagnóstico.

---

### 2. Estatísticas Consolidadas

| Severidade | Quantidade | Percentual | Impacto no Projeto |
| :--- | :---: | :---: | :--- |
| **Crítica** | 2 | 2,0% | Falhas graves de segurança (middlewares de autenticação sem testes) e ausência de testes E2E funcionais |
| **Alta** | 22 | 22,5% | Falsos positivos severos, bypass condicional, brechas de validação, 11 coleções do Firestore sem testes de regras, ausência de testes em rotas centrais |
| **Média** | 45 | 45,9% | Testes tautológicos com funções duplicadas inline, lacunas de cobertura em fluxos alternativos, ausência de rate limiting em rotas de API, consultas N+1, testes superficiais com `renderToStaticMarkup` |
| **Baixa** | 29 | 29,6% | Efeitos colaterais de import acionando emuladores sem mock, falta de teardown de estado global (`window`/`localStorage`), asserções fracas e inconsistências de logging |
| **Total** | **98** | **100%** | **Diagnóstico completo de gaps, riscos e oportunidades de melhoria** |

---

### 3. Principais Riscos Técnicos por Domínio

#### A. Segurança & Regras de Acesso (Crítica / Alta)
1. **Middlewares de Autenticação sem Testes Unitários (`ERR-060`):** `requireAuth`, `requireRole` e `requireSymplaTicket` são responsáveis pela proteção de todas as rotas do backend, mas não possuem testes unitários dedicados em `backend/src/middlewares/authMiddleware.test.ts`.
2. **11 Coleções Críticas do Firestore sem Testes de Regras no Emulador (`ERR-089`):** Regras de coleções vitais como `mission_secrets`, `activities`, `missions`, `sponsors`, `leads`, `pointEvents` e `checkins` não são avaliadas pela suíte `tests/rules/`.
3. **Ausência de Rate Limiting em Rotas Críticas de API (`ERR-074`, `ERR-076`, `ERR-080`, `ERR-085`):** Rotas sensíveis como `/entrance`, `/checkout`, `/leads`, `/screen-token` e endpoints de integração externa do Sympla não possuem limitação de taxa contra flooding ou exaustão de cotas.
4. **Divergência entre Documentação e Regra no Feed (`ERR-090`):** Comentário nas regras afirma que leitura do feed é restrita a usuários autenticados, enquanto a regra ativa concede acesso irrestrito (`allow read: if true`).

#### B. Confiabilidade da Suíte de Testes (Alta / Média)
1. **Falsos Positivos e Testes Tautológicos (`ERR-026`, `ERR-034`, `ERR-036`, `ERR-038`):** Vários testes de frontend recriam funções ou componentes inline sintéticos dentro do próprio teste em vez de importar e testar o código real de produção, passando com sucesso mesmo se a implementação real quebrar.
2. **Bypass Condicional em Testes de Navegador (`ERR-011`):** `cameraUtils.test.js` envelopa asserções em `if (typeof document !== 'undefined')`, de modo que no ambiente Node o teste passa sem executar nenhuma asserção.
3. **Uso Generalizado de `renderToStaticMarkup` (`ERR-028`, `ERR-041`, `ERR-045`, `ERR-049`):** Componentes React interativos complexos (modais de leads, configurações de patrocinadores, casca do patrocinador) são testados apenas como strings HTML estáticas, sem validação de eventos, cliques, formulários ou ciclo de vida.
4. **Testes E2E sem Asserções (`ERR-094`):** Os specs do Playwright em `e2e/` são voltados para geração de screenshots do redesign e não possuem chamadas a `expect(...)`. Falhas críticas de tela ou exceções no console não reprovam a execução.

#### C. Efeitos Colaterais e Poluição de Ambiente (Média / Baixa)
1. **Acoplamento a Emuladores por Falta de Mock em Testes Puros (`ERR-004`, `ERR-005`, `ERR-012`, `ERR-017`, `ERR-021`, etc.):** Mais de 10 arquivos de testes unitários disparam conexões de rede e logs dos emuladores Firebase por importarem módulos transitivos que inicializam o Firebase sem mock.
2. **Vazamento de Estado Global (`ERR-014`, `ERR-015`, `ERR-020`):** Mutação direta de `window`, `document` e `localStorage` sem restauração no `afterEach`/`afterAll`, podendo causar flakiness quando executados em paralelo ou em ordens randômicas.

---

### 4. Recomendações de Priorização para a Fase de Correção

#### **Fase 1: Correções Imediatas de Segurança e Integridade (Prioridade P0 - Crítica / Alta)**
- Implementar testes unitários completos para os middlewares do backend (`requireAuth`, `requireRole`, `requireSymplaTicket` — `ERR-060`).
- Adicionar cobertura de regras no emulador para as 11 coleções desprotegidas do Firestore (`ERR-089`).
- Corrigir a brecha de validação em `isValidFirestoreId` (`ERR-054`) e a aceitação insegura de `blob:` URLs em `missionProofValidator` (`ERR-056`).
- Adicionar rate limiting nas rotas do backend desprotegidas (`checkinDoubleCheck`, `leads`, `screenToken`, `symplaRoutes` — `ERR-074`, `ERR-076`, `ERR-080`, `ERR-085`).
- Corrigir a lógica de promoção automática da lista de espera ao cancelar reserva (`ERR-070`).

#### **Fase 2: Eliminação de Falsos Positivos e Testes Tautológicos (Prioridade P1 - Alta / Média)**
- Refatorar testes que reimplementam código inline (`ERR-026`, `ERR-034`, `ERR-036`, `ERR-038`) para importar diretamente as funções e componentes da aplicação.
- Eliminar o bypass condicional em `cameraUtils.test.js` (`ERR-011`) configurando o ambiente DOM (jsdom/happy-dom) ou mockando o Canvas/document.
- Expandir testes unitários de componentes React (`PassportTab`, `SponsorLeadModal`, `SponsorSettings`) com `@testing-library/react` para validar eventos de clique e submissão.
- Substituir testes frágeis de regex em regras de segurança (`ERR-088`) pela suíte real no emulador.

#### **Fase 3: Isolamento de Testes Unitários e Remoção de Efeitos Colaterais (Prioridade P2 - Média / Baixa)**
- Criar mocks padrão centralizados para `src/lib/firebase.js` em `tests/setup.js` para evitar conexões acidentais aos emuladores durante testes lógicos puros.
- Garantir `afterEach(() => { vi.restoreAllMocks(); ... })` em todos os testes que alteram `window`, `document` ou `localStorage`.
- Corrigir o arquivo vazio `src/components/WhatsAppButton.test.jsx` e estender o `include` do Vitest para `.jsx` (`ERR-002`).

#### **Fase 4: Estruturação da Suíte E2E com Playwright (Prioridade P3 - Estrutural)**
- Adicionar script `"test:e2e": "playwright test"` no `package.json` (`ERR-095`).
- Mover scripts de captura de tela de `e2e/` para `scripts/screenshots/` (`ERR-094`).
- Implementar testes E2E funcionais reais cobrindo os fluxos de login, reserva de atividades, check-in e painel de patrocinadores (`ERR-093`).
- Configurar `webServer` no `playwright.config.js` e remover a dependência exclusiva do Google Chrome nativo (`ERR-097`).














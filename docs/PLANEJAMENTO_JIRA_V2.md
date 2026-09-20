### 🟢 SEMANA 1: Fundação, Autenticação e Crachá Virtual

#### 📌 [KAN-41] Setup do Projeto Firebase, Estrutura Monolítica Express e Emuladores Locais
- **Tipo:** Technical Task | **Componente:** `Backend - Serverless & Cloud` | **Prioridade:** Blocker
- **Branch Sugerida:** `feature/KAN-41-firebase-setup`
- **Descrição:** Criar os projetos no Firebase Console (Homologação e Produção na região `southamerica-east1`), ativar Auth, Firestore e Storage. Estruturar a pasta `backend/` com Node 20, TypeScript e Express, configurando os emuladores locais.
- **Critérios de Aceite (DoD):**
  - [ ] Projetos criados no Firebase Console: `techweek-homolog` e `techweek-prod`.
  - [ ] Pasta `backend/` com `package.json`, `tsconfig.json`, `express`, `firebase-admin` e `cors`.
  - [ ] Arquivo `backend/src/index.ts` exportando `api = onRequest(app)`.
  - [ ] Emuladores do Firebase rodando via `firebase emulators:start`.

#### 📌 [KAN-42] Middleware de Autenticação JWT e Verificação de Roles no Express
- **Tipo:** Technical Task | **Componente:** `Backend - Serverless & Cloud` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-42-auth-middleware`
- **Descrição:** Criar os middlewares no Express para interceptar requisições, validar o token JWT do Firebase Auth e checar permissões via Custom Claims (`PARTICIPANT`, `STAFF`, `SPONSOR`, `ADMIN`).
- **Critérios de Aceite (DoD):**
  - [ ] Middleware `requireAuth` validando `Authorization: Bearer <token>`.
  - [ ] Rejeição com HTTP 401 para token inválido ou ausente.
  - [ ] Middleware `requireRole(allowedRoles)` bloqueando com HTTP 403 quem não tiver permissão.

#### 📌 [KAN-43] Telas de Login e Recuperação de Senha no PWA com Firebase Auth
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-43-login-firebase`
- **Descrição:** Migrar as telas de Login e Registro existentes para o Firebase Auth, adicionando recuperação de senha nativa e validação reativa de força de senha.
- **Critérios de Aceite (DoD):**
  - [ ] Login funcionando via `signInWithEmailAndPassword`.
  - [ ] Botão "Esqueci minha senha" disparando `sendPasswordResetEmail` nativo (*resolve KAN-8 sem SMTP Hostinger*).
  - [ ] Validação reativa de força de senha no cadastro (*absorve KAN-27*).
  - [ ] Listener `onAuthStateChanged` gerenciando sessão global (*absorve KAN-16*).

#### 📌 [KAN-44] Tela de Onboarding, Perfil Acadêmico, Vínculo com Sympla e Termos LGPD
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-44-onboarding-lgpd`
- **Descrição:** Como participante no primeiro acesso, preencher perfil com curso da UFU, situação profissional, termos LGPD e vincular automaticamente a inscrição com base no e-mail cadastrado no Sympla.
- **Critérios de Aceite (DoD):**
  - [ ] Cruzamento automático com os dados de ingressos do Sympla (`/sympla_tickets` ou consulta sob demanda).
  - [ ] Preenchimento do perfil com dropdown de cursos da UFU (*absorve KAN-24*).
  - [ ] Dropdown de situação profissional: Estudante, Empregado, Buscando Vaga (*absorve KAN-23*).
  - [ ] Checkbox obrigatório de termos LGPD com timestamp salvo (*absorve KAN-28 e KAN-33*).
  - [ ] Gravação no documento `/users/{uid}` no Firestore com `perfilCompleto: true` e `ticketId` associado.

#### 📌 [KAN-45] Crachá Virtual do Participante com QR Code Oficial do Sympla
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-45-cracha-qrcode`
- **Descrição:** Como participante, visualizar meu crachá digital com nome, curso, mascotes do evento e o mesmo QR Code gerado pelo Sympla / crachá impresso de pescoço, permitindo leitura unificada na portaria e nos estandes.
- **Critérios de Aceite (DoD):**
  - [ ] QR Code renderizado na tela com a biblioteca `qrcode.react`.
  - [ ] Conteúdo do QR Code gerado com o `ticketId` do Sympla (idêntico ao crachá físico impresso).
  - [ ] Exibição integrada dos mascotes (`MascotDuo.jsx`) e pontuação acumulada.
  - [ ] Suporte a cache offline no PWA para exibição mesmo sem internet.

#### 📌 [KAN-46] Regras Declarativas de Segurança Perimetral no Firestore (`firestore.rules`)
- **Tipo:** Technical Task | **Componente:** `QA, Infra & Segurança` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-46-firestore-rules`
- **Descrição:** Escrever as regras no `firestore.rules` garantindo que participantes só alterem seu próprio perfil e proibindo escritas diretas em coleções críticas de reservas e leads.
- **Critérios de Aceite (DoD):**
  - [ ] Leitura pública autenticada de `/users/{uid}`, `/activities` e `/announcements`.
  - [ ] Escrita restrita a ADMIN em `/activities` e `/announcements`.
  - [ ] Escrita em `/bookings` e `/leads` bloqueada no front (`allow write: if false;`), permitida apenas pelo backend serverless.

---

### 🔵 SEMANA 2: Grade, Reserva Concorrente e Scanner de Staff

#### 📌 [KAN-47] Endpoint Atômico de Reserva de Vagas com `db.runTransaction`
- **Tipo:** Core Feature | **Componente:** `Backend - Serverless & Cloud` | **Prioridade:** Blocker
- **Branch Sugerida:** `feature/KAN-47-booking-transaction`
- **Descrição:** Desenvolver o endpoint `POST /api/activities/:id/reserve` utilizando transações ACID do Firestore para garantir vagas sem overbooking.
- **Critérios de Aceite (DoD):**
  - [ ] Uso obrigatório de `db.runTransaction()`.
  - [ ] Decremento atômico de vagas caso `vagas_disponiveis > 0` e gravação de status `CONFIRMED`.
  - [ ] Se vagas esgotadas, inclusão na lista de espera com status `WAITING_LIST` e posição calculada.
  - [ ] Idempotência garantida caso o participante já esteja inscrito.

#### 📌 [KAN-48] Modo Staff: Leitor de QR Code para Portaria e Salas no PWA (`/staff`)
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-48-scanner-staff`
- **Descrição:** Como Staff na porta da sala, usar a câmera do celular para bipar tanto o crachá físico impresso de pescoço quanto o celular do aluno para validar presença.
- **Critérios de Aceite (DoD):**
  - [ ] Rota `/staff` restrita a usuários com role `STAFF` ou `ADMIN`.
  - [ ] Leitor contínuo com `html5-qrcode` com suporte à leitura rápida de crachás físicos e telas de celular.
  - [ ] Chamada para `POST /api/checkin` enviando `{ identifier: qrPayload, activityId }`.
  - [ ] Feedback visual e sonoro imediato: verde para confirmado, vermelho para duplicidade.

#### 📌 [KAN-49] Endpoint de Validação de Presença e Crédito de Pontos
- **Tipo:** Technical Task | **Componente:** `Backend - Serverless & Cloud` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-49-checkin-api`
- **Descrição:** Endpoint `POST /api/checkin` para validar o crachá do aluno (por `ticketId` do Sympla ou `uid`), checar duplicidade e creditar +100 pontos de gamificação.
- **Critérios de Aceite (DoD):**
  - [ ] Protegido por `requireRole(['STAFF', 'ADMIN'])`.
  - [ ] Resolução do participante via `ticketId` (crachá físico do Sympla) ou `uid` (app).
  - [ ] Retorno de HTTP 409 Conflict caso o check-in já tenha sido realizado na mesma atividade.
  - [ ] Incremento atômico de +100 pontos em `pontuacaoTotal` via `FieldValue.increment(100)`.

#### 📌 [KAN-50] Catálogo de Atividades em Tempo Real e Reserva no PWA
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-50-grade-atividades`
- **Descrição:** Como participante, ver a lista de palestras com atualização de vagas em tempo real via `onSnapshot` e botão de inscrição síncrona.
- **Critérios de Aceite (DoD):**
  - [ ] Leitura em tempo real de `/activities`.
  - [ ] Card exibindo lotação dinâmica e status ("Inscrito", "Vagas Esgotadas", "Inscrever-se").
  - [ ] Feedback visual da reserva em menos de 300ms.

#### 📌 [KAN-51] Script de Teste de Carga e Concorrência na Reserva de Vagas
- **Tipo:** Technical Task | **Componente:** `QA, Infra & Segurança` | **Prioridade:** Medium
- **Branch Sugerida:** `feature/KAN-51-load-test`
- **Descrição:** Criar script Node.js simulando 50 requisições simultâneas para 10 vagas no emulador local para comprovar que não há overbooking.
- **Critérios de Aceite (DoD):**
  - [ ] Script `scripts/load-test-booking.mjs` executando 50 requisições paralelas via `Promise.all`.
  - [ ] Exatamente 10 confirmações e 40 inclusões em lista de espera.
  - [ ] Vagas restantes finalizadas exatamente em 0.

---

### 🟣 SEMANA 3: Patrocinadores, WhatsApp e Gamificação

#### 📌 [KAN-52] Modo Patrocinador: Leitor de Leads de Estande no PWA (`/sponsor`)
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-52-scanner-sponsor`
- **Descrição:** Como patrocinador no estande, bipar o crachá físico de pescoço ou o crachá digital do estudante, dar nota de 1 a 5 estrelas e registrar notas de recrutamento.
- **Critérios de Aceite (DoD):**
  - [ ] Rota `/sponsor` restrita a role `SPONSOR` ou `ADMIN`.
  - [ ] Leitor contínuo de QR Code com suporte a crachá físico do Sympla ou app.
  - [ ] Formulário modal pós-leitura com classificação de estrelas e campo de anotações (`notes`).
  - [ ] Envio para `POST /api/leads` e exibição do botão de WhatsApp.

#### 📌 [KAN-53] Endpoint de Captura de Leads e Gamificação de Estande
- **Tipo:** Technical Task | **Componente:** `Backend - Serverless & Cloud` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-53-leads-api`
- **Descrição:** Endpoint `POST /api/leads` para gravar o lead no Firestore (resolvendo por `ticketId` ou `uid`) e creditar +50 pontos ao participante visitando o estande.
- **Critérios de Aceite (DoD):**
  - [ ] Resolução automática do estudante a partir do código do Sympla ou `uid`.
  - [ ] Salvamento em `/leads/{sponsorUid}/contacts/{participantUid}`.
  - [ ] Cálculo da faixa etária dinâmica preservando privacidade da data de nascimento exata.
  - [ ] Incremento atômico de +50 pontos no aluno.

#### 📌 [KAN-54] Botão Inteligente de Conversão Direta no WhatsApp
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-54-whatsapp-button`
- **Descrição:** No card do lead lido, botão que abre o WhatsApp Web ou App com mensagem de abertura personalizada com o nome do aluno e da empresa.
- **Critérios de Aceite (DoD):**
  - [ ] Função `buildWhatsAppLink(phone, participantName, companyName)` com sanitização do telefone.
  - [ ] Mensagem contextualizada codificada via `encodeURIComponent`.
  - [ ] Abertura direta do deep-link do WhatsApp.

#### 📌 [KAN-55] Tela de Ranking de Gamificação em Tempo Real no PWA
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** Medium
- **Branch Sugerida:** `feature/KAN-55-ranking-realtime`
- **Descrição:** Como participante, ver a lista dos maiores pontuadores atualizada em tempo real e minha posição fixada no rodapé (*absorve KAN-40*).
- **Critérios de Aceite (DoD):**
  - [ ] Consulta ordenada por `pontuacaoTotal desc limit 50`.
  - [ ] Pódio com destaque para os 3 primeiros colocados.
  - [ ] Barra fixa no rodapé mostrando os pontos do usuário logado.

#### 📌 [KAN-56] Feed de Avisos e Comunicados Públicos no PWA (`/announcements`)
- **Tipo:** User Story | **Componente:** `Frontend - PWA (Mobile)` | **Prioridade:** Medium
- **Branch Sugerida:** `feature/KAN-56-feed-avisos`
- **Descrição:** Visualização de comunicados urgentes da coordenação na tela inicial e no feed do app.
- **Critérios de Aceite (DoD):**
  - [ ] Escuta em tempo real de `/announcements`.
  - [ ] Destaque visual para comunicados com prioridade `URGENT`.

---

### 🟠 SEMANA 4: Painel Admin Web, Push Broadcast e Publicação

#### 📌 [KAN-57] Gestão da Grade de Atividades e Salas no Admin Web
- **Tipo:** User Story | **Componente:** `Frontend - Admin Web` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-57-admin-atividades`
- **Descrição:** Como organizador admin, cadastrar novas palestras, definir capacidade e sala (*absorve KAN-36 e KAN-38*).
- **Critérios de Aceite (DoD):**
  - [ ] Dropdown com as salas da UFU (5R, Anfiteatro, Labs).
  - [ ] Formulário integrado a `POST /api/admin/activities`.
  - [ ] Barra visual de monitoramento de lotação em tempo real.

#### 📌 [KAN-58] Atribuição de Perfis e Permissões de Usuários via Custom Claims
- **Tipo:** User Story | **Componente:** `Frontend - Admin Web` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-58-admin-roles`
- **Descrição:** Como admin, buscar um e-mail cadastrado e promovê-lo a `STAFF` ou `SPONSOR` para liberar as telas de scanner.
- **Critérios de Aceite (DoD):**
  - [ ] Rota `PUT /api/admin/users/:uid/role` executando `admin.auth().setCustomUserClaims(uid, { role })`.
  - [ ] Interface no Admin Web com busca de usuários e dropdown de papéis.

#### 📌 [KAN-59] Disparo de Push Notifications Globais via FCM Topics
- **Tipo:** User Story | **Componente:** `Frontend - Admin Web` | **Prioridade:** Medium
- **Branch Sugerida:** `feature/KAN-59-push-broadcast`
- **Descrição:** Como admin, disparar um aviso que apita na tela de bloqueio de todos os celulares via FCM (*absorve KAN-35*).
- **Critérios de Aceite (DoD):**
  - [ ] Endpoint `POST /api/admin/notifications/broadcast` enviando push para o tópico `todos_participantes`.
  - [ ] Gravação simultânea na coleção `/announcements`.

#### 📌 [KAN-60] Configuração de Regras do Storage e Upload de Avatares
- **Tipo:** Technical Task | **Componente:** `QA, Infra & Segurança` | **Prioridade:** Medium
- **Branch Sugerida:** `feature/KAN-60-storage-rules`
- **Descrição:** Proteger o Cloud Storage limitando avatares a 2MB e extensões de imagem na borda (*absorve KAN-29*).
- **Critérios de Aceite (DoD):**
  - [ ] Arquivo `storage.rules` validando `request.resource.size < 2 * 1024 * 1024` e `request.resource.contentType.matches('image/.*')`.

#### 📌 [KAN-61] Suíte de Testes Unitários e Integração no CI
- **Tipo:** Technical Task | **Componente:** `QA, Infra & Segurança` | **Prioridade:** High
- **Branch Sugerida:** `feature/KAN-61-test-suite`
- **Descrição:** Adequar a suíte do Vitest para validar regras de negócio e garantir que o `.github/workflows/ci.yml` rode verde em todos os PRs.
- **Critérios de Aceite (DoD):**
  - [ ] Testes unitários de validação e middlewares rodando com `npm run test`.
  - [ ] Script de quality gate (`npm run quality-gate`) passando com 100% de sucesso.

#### 📌 [KAN-62] Deploy Final Unificado em Produção
- **Tipo:** Technical Task | **Componente:** `QA, Infra & Segurança` | **Prioridade:** Blocker
- **Branch Sugerida:** `feature/KAN-62-deploy-producao`
- **Descrição:** Executar o deploy final no Firebase (`firebase deploy`) e validar a sincronização das branches `homolog` e `main`.
- **Critérios de Aceite (DoD):**
  - [ ] Homologação funcional no Vercel/Firebase Homolog.
  - [ ] Produção ativa no GitHub Pages/Firebase Prod sob HTTPS.
  - [ ] Teste ponta a ponta validado no ar.

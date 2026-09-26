# HandOff de Engenharia: Sincronização Develop, Migração Firebase e Segurança (KAN-69)

**Documento para alinhamento entre agentes e desenvolvedores**  
**Data:** 21/09/2026  
**Branch de Referência:** `feature/KAN-69-profile-edit-sympla`  
**Último Commit:** `f2f1dd1` (`[UPD] - sincroniza com develop e resolve apontamentos de seguranca e supabase`)  
**Base Sincronizada:** `origin/develop` (commit `c57d886` — PRs #64, #65, #66, #68, #69: KAN-11, KAN-51, KAN-55, KAN-70, KAN-77)  
**Status do Quality Gate:** **Score 1.0 (Aprovado)** (102 testes frontend + 86 testes backend)  
**Status de Segurança:** **Score 1.0 (Aprovado)** (Vulnerabilidades SEC-001 a SEC-005 sanadas)

---

## 1. Objetivo deste Documento

Este documento consolida o estado atual dos arquivos compartilhados, decisões arquiteturais tomadas e contratos de interface estabelecidos na branch `feature/KAN-69-profile-edit-sympla`, visando:
1. Esclarecer conflitos resolvidos entre o trabalho de backend recente (`develop`) e o frontend/regras.
2. Evitar sobreposição de código ou quebras de contrato em branches paralelas.
3. Servir de briefing completo para outros agentes que estejam atuando nos mesmos arquivos.

---

## 2. Mapa de Arquivos Alterados e Resolução de Conflitos

A tabela abaixo resume exatamente o que foi alterado e como cada conflito de merge com a `develop` foi solucionado:

| Arquivo | Origem das Alterações | Estado Final e Decisões de Integração |
|---|---|---|
| `backend/src/index.ts` | KAN-69 (Sympla) vs `develop` (KAN-51, KAN-55) | Montagem unificada de todas as rotas: `/api/sympla` (`symplaRouter`), `/api/activities` (`screenTokenRouter`), `/api/checkin` (`checkinDoubleCheckRouter`) e `/api/leads` (`leadsRouter`). Sem colisões de path. |
| `backend/src/routes/symplaRoutes.ts` | KAN-69 / Auditoria Segurança (SEC-002) | Adicionado middleware `requireAuth` em `POST /verify-ticket`. Participantes comuns só podem consultar ingressos associados ao seu próprio e-mail (`req.user.email`). Acesso a outros e-mails restrito a `role === 'ADMIN'`. Rota `POST /sync-user` autenticada atualiza o Firestore no backend. |
| `backend/src/routes/symplaRoutes.test.ts` | KAN-69 (Novo) | Suíte de testes unitários com 4 cenários cobrindo autenticação, autorização de consulta própria, bloqueio 403 para terceiros e permissão de admin. |
| `backend/src/routes/leads.ts` | `develop` (KAN-55) / Auditoria Segurança (SEC-003) | Atualização atômica unificada para pontuação de leads: credita `totalPoints` (canônico) e `pontuacaoTotal` (compatibilidade). |
| `firestore.rules` | KAN-69 / Auditoria Segurança (SEC-001, SEC-003, SEC-005) | **Blindagem de segurança**: <br>1. `/users/{userId}`: impede alteração pelo cliente dos campos `['role', 'termsAcceptedAt', 'uid', 'createdAt', 'totalPoints', 'pontuacaoTotal']`. <br>2. `/pointEvents/{eventId}`: `allow write: if false;` (apenas backend via Admin SDK). <br>3. `/checkins/{checkinId}`: unificado em bloco único canônico para aluno e staff. |
| `storage.rules` | `develop` (KAN-11) + KAN-69 | Regras preservadas com restrição de UID (`auth.uid == userId`), tipos mime de imagens seguros (sem SVG) e limites de tamanho: 2MB para `/avatars/` e 5MB para `/mission_photos/`. |
| `src/lib/gameplay.js` | KAN-69 (Migração Firestore) + `develop` (KAN-11 Missões) | **Desacoplado 100% do Supabase**: Todas as funções (`getMyProfile`, `uploadAvatar`, `uploadMissionPhoto`, `updateMascot`, `getMyPointEvents`, `addPointEvent`, `getRanking`) utilizam Firebase Auth, Firestore (`userService.js`) e Firebase Storage com fallback resiliente para offline/emuladores. |
| `src/pages/Scanner.jsx` | KAN-69 (Migração Firestore) | **Zero dependência de Supabase**: Remoção completa de `supabaseClient`. Validação de QR code usa `findUserByUsername` do Firestore e a simulação de scan busca usuários via `getLeaderboardUsers`. |
| `src/hooks/useUser.js` | KAN-69 (Firebase Session) + `develop` (KAN-70, KAN-77) | Unifica sessão viva via `onAuthChange`, cálculo de nível dinâmico com `calculateLevel` (KAN-70), notificações (`useNotifications`) e persistência segura de pontos. |
| `src/pages/Challenges.jsx` | `develop` (KAN-11) + KAN-69 | Sistema de missões com upload de foto, preview, deleção, modal de feedback estilizado (`FeedbackModal`) e portal com `useScrollLock`. |
| `src/pages/Login.jsx` | KAN-69 (Firebase Auth) + `develop` (KAN-77) | Login com Firebase Auth puro, modal de recuperação de senha renderizado via `createPortal` no `document.body` com `useScrollLock(isResetModalOpen)`. |
| `src/components/LectureScanner.jsx` | KAN-69 (Auth Checkin) + `develop` (KAN-77) | Modal de leitura de presença com `useScrollLock(true)` montado via portal, enviando token Firebase para validação de check-in no backend. |
| `src/index.css` | KAN-69 + `develop` (KAN-77) | Preservadas simultaneamente as classes utilitárias `.no-scrollbar` e a infraestrutura de modais fixos em portal (`.modal-overlay-fixed` e `.modal-card-fixed`). |
| `src/pages/Profile.jsx` | KAN-69 (Edição Completa e Sympla) | Edição de dados cadastrais (nome, telefone, curso UFU/outro, período, redes sociais), integração com Sympla e upload de avatar. |
| `src/lib/sympla.js` | KAN-69 | Cliente de integração com Sympla no backend. `verifySymplaTicket` agora anexa automaticamente o cabeçalho `Authorization: Bearer <token>` quando logado. |

---

## 3. Estado da Migração: Supabase ➔ Firebase

> [!IMPORTANT]
> **O Frontend (`src/`) NÃO depende mais do Supabase em nenhuma funcionalidade.**
> Qualquer novo código deve usar exclusivamente o Firebase SDK (`firebase/auth`, `firebase/firestore`, `firebase/storage`) e os serviços utilitários em `src/lib/userService.js` e `src/lib/auth.js`.

### Padrões Canônicos Estabelecidos:
1. **Campos de Pontuação:** Sempre referenciar e ler `totalPoints` no documento `/users/{uid}`.
2. **Registro de Eventos de Gamificação:** O cliente **NÃO** deve tentar gravar diretamente na collection `/pointEvents` (a regra bloqueia escritas de cliente por segurança — SEC-001). Todo ponto é concedido via rotas autenticadas do backend (`/api/checkin/*`, `/api/leads`).
3. **Fotos e Uploads:**
   - Avatares: `avatars/{userId}/{timestamp}.ext` via `uploadAvatar(file)` (máx 2MB).
   - Missões: `mission_photos/{userId}/{missionId}_{timestamp}.ext` via `uploadMissionPhoto(file, missionId)` (máx 5MB).
4. **Modais e Scroll Lock:**
   - Qualquer modal deve utilizar `useScrollLock(isOpen)` de `src/hooks/useScrollLock.js`.
   - Modais sobrepostos devem renderizar via `createPortal(..., document.body)`.

---

## 4. Resumo das Vulnerabilidades Sanadas (Auditoria de Segurança)

1. **SEC-001 [HIGH] (Escrita aberta em `/pointEvents`):**
   - *Risco:* Participante poderia forjar pontuações arbitrárias no Firestore.
   - *Solução:* `allow write: if false;` em `firestore.rules`.
2. **SEC-002 [HIGH] (PII e QR Code de crachá vazando no Sympla):**
   - *Risco:* Qualquer pessoa sem login podia enumerar e-mails e obter o QR Code (`qrCodeData`) dos ingressos.
   - *Solução:* `requireAuth` obrigatório no backend, checagem estrita de propriedade do e-mail para participantes e isolamento de admin.
3. **SEC-003 [MEDIUM] (Divergência `pontuacaoTotal` vs `totalPoints`):**
   - *Risco:* Inconsistência de ranking e ausência de guarda em `diff().affectedKeys()`.
   - *Solução:* Backend atualiza ambos os campos; `firestore.rules` proíbe o cliente de alterar ambos.
4. **SEC-005 [LOW] (Bloco duplicado de `/checkins`):**
   - *Solução:* Regra consolidada em um único bloco canônico.

---

## 5. Instruções para Outros Agentes e Desenvolvedores

Se você estiver trabalhando em outra feature branch que envolva perfil, login, pontuação, modais ou backend:

```bash
# 1. Certifique-se de sincronizar a sua branch de trabalho com a feature/KAN-69
git fetch origin
git merge origin/feature/KAN-69-profile-edit-sympla
# ou faça o rebase, caso preferir manter o histórico linear

# 2. Rode a validação obrigatória
npm test
npm --prefix backend run test
node scripts/quality-gate.mjs
```

### Invariantes Obrigatórias (Regras de Engenharia do Projeto):
- **Sem Trailers de IA:** Nunca adicionar `Co-authored-by` nos commits.
- **Commits Semânticos:** Usar `[ADD]`, `[FIX]`, `[UPD]`, `[DEL]`, `[DOC]`, `[CFG]`.
- **Quality Gate:** Todo push precisa passar no script `node scripts/quality-gate.mjs` com score 1.0.
- **Merge Humano:** O merge final em `develop` e `main` é estritamente humano.


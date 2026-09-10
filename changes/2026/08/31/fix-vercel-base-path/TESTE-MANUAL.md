---
change: fix-vercel-base-path
type: bugfix
status: roteiro-de-qa
created: 2026-08-31
---

# Roteiro de teste manual — fix do `base` do Vite (homolog/local/GitHub Pages)

Pré-requisitos: dependências instaladas (`npm ci` ou `npm install`), `.env.local` configurado com as credenciais de homolog.

## 1. `npm run dev` local (raiz, sem `VITE_BASE_PATH`)

1. Rode `npm run dev` sem definir `VITE_BASE_PATH`.
2. Acesse `http://localhost:5173/` no navegador.
3. Confirme que a página carrega **diretamente na raiz**, sem redirecionar para `http://localhost:5173/app-techweek/`.
4. Abra o Console do navegador (F12) e confirme que **não** aparece nenhum erro de MIME type (`Failed to load module script...`).

## 2. `npm run build` local (raiz, sem `VITE_BASE_PATH`)

5. Rode `npm run build` sem definir `VITE_BASE_PATH`.
6. Abra `dist/index.html` e confirme que as tags `<script src=...>` e `<link href=...>` apontam para `/assets/...` (raiz), **não** para `/app-techweek/assets/...`.

## 3. Build simulando GitHub Pages (com `VITE_BASE_PATH`)

7. Rode o build definindo a variável, por exemplo:
   ```
   $env:VITE_BASE_PATH="/app-techweek/"; npm run build
   ```
8. Abra `dist/index.html` novamente e confirme que agora as tags apontam para `/app-techweek/assets/...` — comportamento igual ao build atual usado pelo GitHub Pages, sem regressão.

## 4. Deploy real na Vercel (homolog)

9. Depois do PR mergeado em `develop` (e, quando aplicável, promovido pra `homolog`), abra `app-techweek-homolog.vercel.app`.
10. Confirme que o app carrega normalmente, **sem tela em branco**.
11. Abra o Console do navegador e confirme que não há erro de MIME type nem 404 nos arquivos de `/assets/...`.
12. Navegue entre telas (Dashboard, Scanner, Perfil, Ranking) usando o menu do app — confirme que a navegação via `HashRouter` (`/#/...`) continua funcionando normalmente.

## 5. Deploy real no GitHub Pages (produção)

13. Depois do merge em `main` e do workflow `deploy.yml` rodar, abra `sistemas-dacomp.github.io/app-techweek/`.
14. Confirme que o app carrega normalmente, exatamente como antes desta mudança (sem regressão).
15. Confirme no Console/aba Network que os assets carregam de `/app-techweek/assets/...`.

## Critério de aprovação

Todos os itens acima passando = fix pronto pra virar PR `develop` → `homolog` (itens 1-3 verificáveis localmente antes do PR; itens 4-5 dependem do deploy real, verificar após o push/merge). Qualquer item falhando, reportar aqui antes de prosseguir.

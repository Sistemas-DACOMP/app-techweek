---
change: fix-vercel-base-path
type: bugfix
status: draft
created: 2026-08-31
---

# Fix — tela em branco no homolog (Vercel) por causa do `base` fixo do Vite

## Contexto

`vite.config.js` define `base: '/app-techweek/'` fixo. Esse valor é necessário para o GitHub Pages, que serve o site num subpath (`sistemas-dacomp.github.io/app-techweek/`). O deploy de homologação (Vercel, `app-techweek-homolog.vercel.app`) serve o site na raiz do domínio, sem esse subpath.

Com o `base` fixo, o build gera URLs de asset como `/app-techweek/assets/index-XXXX.js`, que não existem na raiz da Vercel. O rewrite catch-all do `vercel.json` (necessário para o roteamento client-side do React Router) devolve `index.html` para essa URL de `.js` que não existe, em vez de um 404. O navegador recebe HTML onde esperava um módulo JS e rejeita com:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of text/html.
```

Resultado: tela em branco no homolog.

O mesmo problema já foi confirmado localmente: `npm run dev` redireciona `http://localhost:5173/` para `http://localhost:5173/app-techweek/` (302), pelo mesmo `base` fixo.

O roteamento do app usa `HashRouter` (`src/App.jsx`), então as rotas em si (`/#/scanner`, `/#/profile`, etc.) não dependem do `base` do Vite — o `base` afeta só as URLs dos arquivos estáticos gerados pelo build (JS/CSS/assets), não a navegação entre telas.

## Objetivo

Tornar o `base` do Vite condicional por variável de ambiente, para que:
- GitHub Pages continue recebendo o build com `base: '/app-techweek/'` (comportamento atual, sem mudança).
- Vercel (homolog) e `npm run dev`/`npm run build` locais passem a usar `base: '/'` (raiz), que é o correto para ambos.

## Fora de escopo desta mudança

- Qualquer mudança em `src/App.jsx`, roteamento ou `HashRouter` — não são a causa do bug e não precisam mudar.
- Mudanças em `vercel.json` — o rewrite catch-all já está correto; o problema é só o `base` do build gerando URLs de asset erradas para o ambiente Vercel.
- Aplicar/testar o fix contra o deploy real da Vercel ou do GitHub Pages — isso é verificação pós-implementação, feita por push/PR (fora do escopo de código deste change).
- Qualquer outra causa de tela em branco não relacionada ao `base` (já descartado na investigação prévia).

## Decisões explícitas

1. **Nome da variável: `VITE_BASE_PATH`.** Consistente com o padrão já usado no projeto (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` em `.env.local`/`.env.example`), mesmo essa variável sendo lida só dentro de `vite.config.js` (Node, via `process.env`) e não precisando do prefixo `VITE_` para isso — o prefixo aqui é só convenção de nomenclatura do time, não requisito técnico.
2. **Default: `/` (raiz).** Raiz é o comportamento correto tanto para Vercel quanto para `npm run dev`/`npm run build` local — são os casos mais comuns no dia a dia do time. GitHub Pages é o caso excepcional que precisa de override explícito.
3. **Override só em `.github/workflows/deploy.yml`.** É o único lugar que builda para GitHub Pages. Adiciona `VITE_BASE_PATH: /app-techweek/` ao `env:` do step "Build", junto das duas variáveis do Supabase que já estão lá.
4. **Não adicionar `VITE_BASE_PATH` em `.env.example`/`.env.local`.** O default (`/`) já é o valor correto para desenvolvimento local; documentar a variável nesses arquivos sugeriria que ela precisa ser preenchida localmente, o que não é o caso e só geraria confusão para o time.

## Critérios de aceite (Given/When/Then)

- **Given** o workflow `deploy.yml` builda o app para o GitHub Pages (`VITE_BASE_PATH=/app-techweek/` no step de build), **When** o site é servido em `sistemas-dacomp.github.io/app-techweek/`, **Then** os assets carregam de `/app-techweek/assets/...` e o app funciona exatamente como hoje (sem regressão).
- **Given** um build feito sem `VITE_BASE_PATH` definida (caso da Vercel), **When** o site é servido na raiz do domínio (`app-techweek-homolog.vercel.app`), **Then** os assets carregam de `/assets/...` e o app carrega sem tela em branco nem erro de MIME type no console.
- **Given** um desenvolvedor roda `npm run dev` localmente sem `VITE_BASE_PATH` definida, **When** ele acessa `http://localhost:5173/`, **Then** a página carrega diretamente na raiz, sem redirecionamento para `/app-techweek/`.

## Perguntas em aberto

Nenhuma — causa raiz já confirmada e solução já validada em conversa prévia; este SPEC documenta a decisão para implementação.

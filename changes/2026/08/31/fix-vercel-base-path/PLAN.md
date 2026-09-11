---
change: fix-vercel-base-path
type: bugfix
status: approved-for-implementation
created: 2026-08-31
---

# Plano — Fix do `base` do Vite para Vercel/local

Referência: `SPEC.md` nesta mesma pasta.

## Estado atual dos arquivos (conferido antes deste plano)

`vite.config.js` (completo, 7 linhas):
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/app-techweek/',
})
```

`.github/workflows/deploy.yml`, step "Build" (linhas 35-39):
```yaml
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## Tarefas atômicas

1. **[CFG] `vite.config.js`** — trocar a linha `base: '/app-techweek/',` por:
   ```js
   base: process.env.VITE_BASE_PATH || '/',
   ```
   `process.env` funciona diretamente aqui porque `vite.config.js` roda em Node, não precisa de `loadEnv`/`import.meta.env`.

2. **[CFG] `.github/workflows/deploy.yml`** — adicionar `VITE_BASE_PATH: /app-techweek/` ao `env:` do step "Build" (linha 39, junto das duas variáveis existentes):
   ```yaml
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_BASE_PATH: /app-techweek/
   ```
   Valor literal (não é secret, não precisa ir em `secrets.*`).

3. **[Verificação] `npm run build` local sem `VITE_BASE_PATH` definida** — inspecionar `dist/index.html` e confirmar que as tags `<script src=...>`/`<link href=...>` apontam para `/assets/...` (raiz), não `/app-techweek/assets/...`.

4. **[Verificação] `npm run dev` local** — acessar `http://localhost:5173/` (ex.: via `curl -I`) e confirmar resposta `200` direta, sem redirect 302 para `/app-techweek/`.

5. **[Verificação] `npm run lint`** — checagem estática, garantir que a mudança em `vite.config.js` não quebra lint.

## Fora do plano (fica para depois desta implementação)

- Push da branch / PR para `develop` (Fabio roda os comandos git, conforme convenção do time).
- Confirmar em produção real: deploy do GitHub Pages via merge em `main` continua servindo em `/app-techweek/` corretamente; deploy da Vercel (homolog) carrega sem tela em branco. Ambos só são verificáveis após o push/merge, não localmente.
- Qualquer atualização do `app-techweek-devops-handoff.md` documentando o fix — decisão do Fabio se/quando fazer.

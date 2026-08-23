# Política de Segurança

## Segredos

Nunca commitar senhas, chaves de API, tokens ou arquivos `.env`. Veja `.gitignore`. Se um segredo for commitado por engano, ele deve ser considerado comprometido mesmo após removido — rotacione a credencial, não apenas o arquivo.

## Reportando um problema

Abra uma issue privada ou avise diretamente um dos mantenedores do repositório — não abra uma issue pública descrevendo uma vulnerabilidade exploravel antes de haver uma correção.

## Pendências conhecidas

- `scripts/seed-admin.js` cria a conta de teste "admin" (atalho de login em `src/pages/Login.jsx`, que mapeia `admin` → `admin@admin.com`). Decisão registrada em 2026-08-23: manter esse atalho só para cenário de teste. A senha não é mais hardcoded — vem de `SEED_ADMIN_PASSWORD`, combinada à parte com o time, nunca commitada.
- Branch protection em `main`/`homolog` ainda não configurada — requer acesso admin no repositório.

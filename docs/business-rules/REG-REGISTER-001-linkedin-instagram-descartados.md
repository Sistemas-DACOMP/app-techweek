---
id: REG-REGISTER-001
nome: linkedin/instagram enviados no cadastro são descartados silenciosamente
fonte: observado no código
tipo: OBSERVADA
prioridade: baixa
status: gap — sem card no Jira ainda
testes_relacionados: nenhum ainda
implementacao_relacionada: src/pages/Register.jsx, src/pages/Profile.jsx, handle_new_user() trigger
ultima_validacao: 2026-09-10
---

`Register.jsx` envia `linkedin`/`instagram` como metadata do signup, e `Profile.jsx` já espera exibir esses campos — mas nenhuma migration criou essas colunas em `profiles`, e o trigger `handle_new_user()` não as insere. O dado é perdido silenciosamente, sem erro visível pro usuário. Comportamento observado no código, não é regra confirmada em lugar nenhum. Se o produto realmente precisa desses campos, abrir card no Jira antes de escrever migration/teste permanente.

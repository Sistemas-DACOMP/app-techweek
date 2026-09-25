ADR-003 Máquina de referência única para verificação de runtime (Antigravity)

Context:
`.agent-system/adapters/antigravity/README.md` afirmava, desde 2026-09-21, "Status: VERIFIED &
OPERATIONAL on macOS Antigravity Runtime" — enquanto `manifests/system.yaml` dizia, na mesma data,
"not installed locally, adapter unverified end-to-end". Os dois arquivos deste mesmo sistema se
contradiziam. Ao auditar em 2026-09-22, perguntado diretamente (`AskUserQuestion`), o Fabio
esclareceu: a verificação de 2026-09-21 rodou na máquina de um amigo dele (macOS), não na própria
máquina do Fabio (Windows, onde `.agent-system` é editado e onde as decisões deste projeto são
tomadas). Separadamente, no mesmo dia, ao rodar `scripts/agent-system-doctor.mjs` com um check
novo pro CLI `agy`, descobriu-se que o Antigravity **está** instalado na máquina do Fabio (v1.2.7)
— contrariando também a premissa "not installed" que o manifest carregava.

Decision:
Adotar como política permanente: só o resultado de teste/verificação rodado na máquina do próprio
Fabio conta como evidência de status de runtime para este projeto. O resultado de terceiros
(mesmo um colaborador próximo) não promove o status de um runtime neste sistema — pode ser citado
como referência externa, nunca como verificação. Status real do Antigravity corrigido pra "CLI
presente, não exercitado ponta a ponta" (nem "verified", nem "not installed") em
`manifests/system.yaml` e `adapters/antigravity/README.md`.

Alternatives:
1. Aceitar o teste do amigo como verificação válida, já que "Antigravity" é o mesmo software
   independente de máquina — rejeitada; o Fabio foi explícito que quer que só a própria máquina
   conte, e a razão é rastreável (nomes de subagente pré-rename encontrados no README sugerem que
   o teste do amigo pode ter rodado numa versão/configuração diferente do que este projeto define
   como canônico hoje — sem a máquina de referência, não dá pra saber).
2. Marcar como "unverified" sem investigar mais — rejeitada porque um teste real e barato
   (`agy --version`, `agy agents`) estava disponível e mudou o status real descoberto (CLI
   presente), então "não investigar" teria deixado uma FACT disponível sem ser capturada.

Why:
Evidência de terceiro sobre uma ferramenta que este projeto não controla (versão, configuração,
plugins instalados na máquina do amigo são desconhecidos) não é FACT verificável por este sistema
— é, no máximo, INFERENCE. Tratar como FACT teria violado a regra de ouro do próprio
`rules/evidence-model.md` ("nunca promover INFERENCE a FACT silenciosamente").

Consequences:
Toda futura claim de "verificado" pra qualquer runtime/ferramenta externa deste sistema precisa
citar que rodou na máquina do Fabio, com comando e output real, ou não pode ser registrada como
verificação — só como referência externa não-autoritativa. `state/blockers.md` documenta o próximo
passo real (rodar uma tarefa completa via Antigravity, bloqueado agora pelo próprio modelo de
permissão headless da ferramenta, não mais por instalação).

Risks:
Se o Fabio trocar de máquina de referência no futuro (ex.: setup novo, outro Windows, dual-boot),
este ADR não se auto-atualiza — qualquer sessão que aplicar esta política precisa confirmar qual é
"a máquina do Fabio" no momento, não assumir que é sempre a mesma physical machine deste registro.

Status: ACCEPTED

Addendum (2026-09-22, mesmo dia): com autorização explícita e permanente do Fabio pra usar
`--dangerously-skip-permissions` em testes de Antigravity nesta máquina, uma tarefa real ponta a
ponta foi completada — leitura de 9 arquivos reais + escrita de um Context Understanding Report
correto e independente (`state/antigravity-context-report-2026-09-22.md`). Isso não reabre esta
decisão (a política "só a máquina do Fabio conta" continua valendo), só atualiza o status
resultante: de "CLI presente, não exercitado" pra "verificado em modo headless com o flag de
skip". `manifests/system.yaml` tem o detalhe completo.

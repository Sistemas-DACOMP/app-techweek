RULE-010

title:
Every business-behavior change goes through the business-rules catalog first

status:
active

scope:
spec
product
qa
code-review

source:
Fabio, standing rule (CLAUDE.md)

trigger:
any new business rule, or correction to an existing one's behavior

must:
- classify it in `docs/business-rules/` (CONFIRMADA/INFERIDA/OBSERVADA/NÃO DEFINIDA) before writing a permanent test that treats it as official
- ask Fabio before promoting an INFERIDA to CONFIRMADA, always with a recommended option

must_not:
- treat an inference as confirmed silently
- write a permanent regression test encoding an unclassified/INFERIDA rule as if it were official

confidence:
confirmed

validation:
- `rules/evidence-model.md`; `docs/business-rules/README.md`

supersedes:
none

RULE-003

title:
Commit message format

status:
active

scope:
git
all agents/runtimes

source:
project convention (CLAUDE.md)

trigger:
any commit on this project

must:
- format the subject line as `[TIPO] - descrição curta`
- use one of `ADD` `FIX` `UPD` `DEL` `DOC` `CFG` for TIPO, matching the actual nature of the change

must_not:
- invent a TIPO outside that list
- write a vague/generic description that doesn't say what changed

confidence:
confirmed

validation:
- git log inspection

supersedes:
none

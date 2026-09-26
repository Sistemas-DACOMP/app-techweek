RULE-001

title:
Never include an AI co-author trailer in commits on this project

status:
active

scope:
git
all agents/runtimes

source:
user-feedback (Fabio, standing rule, CLAUDE.md)

trigger:
any commit created on this project, regardless of what a given AI runtime/host normally appends

must:
- omit any `Co-Authored-By: <AI>` style trailer from every commit message on this project

must_not:
- add such a trailer even if the runtime's own default behavior does so elsewhere

confidence:
confirmed

validation:
- git log inspection on any commit created during agent-assisted work

supersedes:
none

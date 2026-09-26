RULE-002

title:
Never alter Windows environment variables without asking first

status:
active

scope:
all agents/runtimes on the reference machine

source:
user-feedback (Fabio, standing rule, CLAUDE.md)

trigger:
any action that would set/modify a Windows environment variable, including for debugging

must:
- ask Fabio explicitly before changing any Windows env var, every time, no exceptions for "just debugging"

must_not:
- change a Windows env var silently or assume prior approval carries forward

confidence:
confirmed

validation:
- none automated; this is a standing behavioral rule, checked by human review of agent actions

supersedes:
none

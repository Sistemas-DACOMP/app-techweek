RULE-006

title:
PR and Jira comment tone

status:
active

scope:
code-review
git-ops
all agents commenting on PRs/Jira

source:
Fabio, standing rule (CLAUDE.md)

trigger:
writing any comment on a GitHub PR or a Jira card

must:
- write in plain natural language, like one developer writing to another
- be direct, no unnecessary jargon

must_not:
- use an AI-report tone ("Analysis complete", "The following issues were identified:")
- pad with filler/enrolação

confidence:
confirmed

validation:
- human review of actual PR/Jira comments (`policies/pr-jira-tone.md` has more detail)

supersedes:
none

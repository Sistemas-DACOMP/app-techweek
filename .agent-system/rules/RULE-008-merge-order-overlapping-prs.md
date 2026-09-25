RULE-008

title:
Merge order for PRs touching the same files

status:
active

scope:
code-review
git-ops

source:
Fabio, standing rule (CLAUDE.md)

trigger:
more than one open PR touches the same file(s)

must:
- resolve the lower-risk/lower-dependency PR first
- refresh the remaining PRs against the newer base branch before assuming they're conflict-free

must_not:
- assume no-conflict from staleness alone (an old PR "looking fine" isn't evidence it still merges cleanly)

confidence:
confirmed

validation:
- re-diff/re-test the later PR against the updated base after the first merges

supersedes:
none

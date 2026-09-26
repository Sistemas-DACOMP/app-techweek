RULE-005

title:
Branch protection and approval requirements

status:
active

scope:
git
git-ops
devops

source:
Fabio, confirmed via GitHub API, 2026-09-21 (zeroing develop's approval count)

trigger:
opening/merging any PR into `main`, `homolog`, or `develop`

must:
- require a PR into all three branches, no direct pushes
- treat all three as requiring 0 approving reviews (GitHub blocks self-approval and the team is too small to guarantee a second reviewer)

must_not:
- assume `develop` requires 1 approval (stale fact from 2026-09-10, corrected 2026-09-21 — this superseded fact lived uncorrected in `rules/engineering-rules.md`'s prose until the 2026-09-22 audit)
- treat "0 approvals required" as "no PR required" — PR is still mandatory on all three

confidence:
confirmed

validation:
- `gh api repos/.../branches/<branch>/protection` per branch

supersedes:
the pre-2026-09-21 "1 approval on develop" fact

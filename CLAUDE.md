@AGENTS.md

# Git workflow for this repo

- Work happens on branch `nana14329245-migrate-to-fal-ai`; `main` is the deployed/canonical branch.
- After finishing a change: `git add` the specific files (never `-A`), commit with a descriptive message, but **ask before pushing** — don't push automatically.
- After pushing, this repo has no `gh` CLI installed and direct-merge-without-review is blocked by permissions, so **give the user this compare/PR link** rather than trying to merge yourself:
  `https://github.com/nana14329245/AI-Image-Studio/compare/main...nana14329245-migrate-to-fal-ai`
- Treat the feature as done only after the user confirms the PR is merged into `main` (verify with `git fetch origin main && git log --oneline -3 origin/main` if unsure).

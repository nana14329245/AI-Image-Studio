---
name: deploy
description: Commit the current changes on nana14329245-migrate-to-fal-ai, confirm before pushing, then hand over the GitHub compare/PR link — this repo's standard ship workflow.
---

# Deploy (commit → push → PR link)

Follow this repo's git workflow (documented in `CLAUDE.md`) exactly:

1. Run `git status` and `git diff` to see everything that's changed.
2. Stage only the relevant files explicitly — never `git add -A` or `git add .`. If `git status` shows anything unexpected (especially anything that could be a secret, e.g. `.env.local`), stop and flag it to the user instead of staging it.
3. Write a commit message that actually describes this diff (not a generic placeholder), and commit. End the message with the attribution lines from this session's system-reminder (Co-Authored-By / Claude-Session), if present.
4. **Ask the user for confirmation before pushing.** Do not push automatically.
5. Once confirmed, push to `nana14329245-migrate-to-fal-ai`.
6. Give the user this link and ask them to create + merge the PR themselves (this repo has no `gh` CLI, and merging without review is blocked by permissions — do not attempt to merge it yourself):
   `https://github.com/nana14329245/AI-Image-Studio/compare/main...nana14329245-migrate-to-fal-ai`
7. Don't consider the change "done" until the user confirms the PR is merged into `main`. If unsure, verify with:
   `git fetch origin main && git log --oneline -3 origin/main`

If a new Supabase migration file was part of this change, remind the user it still needs to be pasted into the Supabase SQL Editor and run manually — this cannot be applied automatically.

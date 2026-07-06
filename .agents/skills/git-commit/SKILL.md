---
name: git-commit
description: Conventional commit with push. Use when the user asks you to commit or save changes.
---

1. Stage all intended files with `git add` (never use -A blindly)
2. Review the diff with `git diff --cached` to verify only intended changes
3. Write a conventional commit message: `type: short description`
   - Types: feat, fix, chore, docs, refactor, test, style
4. Keep the subject line under 72 characters
5. Add a blank line and body paragraph only if the change needs explanation
6. Commit with `git commit`
7. Push to origin with `git push`

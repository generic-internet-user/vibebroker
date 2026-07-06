---
name: diff-review
description: Review current diff or specified commit range for correctness, security, and style.
---

1. If no argument is given, review `git diff` (unstaged changes)
2. If a commit range is given (e.g. HEAD~3..HEAD), review those commits
3. Check for: correctness, security, code style consistency, missing error handling
4. Verify compatibility with existing types in `src/types/index.ts`
5. Check that IndexedDB writes precede context updates
6. Ensure no secrets or API keys are committed
7. Provide feedback as a bullet list of issues and suggestions

# Commit Skill

Create a well-formatted git commit for staged and unstaged changes.

## Usage
`/commit` — auto-generates a commit message based on the changes
`/commit <message>` — uses the provided message as the commit message or as guidance

## Procedure

1. Run `git status` to see all changed and untracked files.
2. Run `git diff` and `git diff --cached` to review staged and unstaged changes.
3. Run `git log --oneline -5` to see recent commit message style.
4. Stage relevant files by name — never use `git add -A` or `git add .`
5. If no $ARGUMENTS provided, analyze the changes and draft a concise commit message.
   If $ARGUMENTS provided, use it as the commit message.
   - Use imperative mood ("Add feature" not "Added feature")
   - Keep the first line under 72 characters
   - Focus on **why** not **what**
6. Commit the changes.
7. Run `git status` to confirm the commit succeeded.
8. Push to the remote with `git push`.
9. Show the user the commit hash, summary, and push status.

## Rules

- Never stage `.env`, `vendor/`, `web/wp/`, `node_modules/`, or anything in `.gitignore`
- Never stage files that contain secrets (credentials, API keys)
- Never use `--no-verify` or skip hooks
- Never amend a previous commit unless explicitly asked
- Never force-push — use `git push` only
- If a pre-commit hook fails, fix the issue and create a new commit
- If the push fails (e.g., no remote, diverged branch), show the error and let the user decide

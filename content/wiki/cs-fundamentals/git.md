---
type: concept
category: cs-fundamentals
para: resource
tags: [git, version-control, branching, merging, rebase, pull-requests, conventional-commits]
tldr: Git fundamentals for software engineers — staging, committing, branching, merging, rebasing, and the PR workflow used in professional teams.
sources: []
updated: 2026-05-01
---

# Git

> **TL;DR** Git fundamentals for software engineers — staging, committing, branching, merging, rebasing, and the PR workflow used in professional teams.

## Core Model

Git tracks your project's history as a **directed acyclic graph (DAG) of commits**. Each commit points to its parent(s), contains a snapshot of the tracked files, and has a unique SHA-1 hash.

Three areas to understand:

```
Working directory  →  Staging area (index)  →  Repository (.git/)
     (your files)         (what will commit)      (commit history)
```

- `git add` moves changes from working directory to staging
- `git commit` snapshots the staging area into the repository
- `git push` sends local commits to the remote

---

## Daily Workflow

```bash
# Check what's changed
git status
git diff                    # unstaged changes
git diff --staged           # staged (what will be committed)

# Stage and commit
git add src/app.py          # stage specific file — never `git add .` blindly
git add -p                  # interactive: stage individual hunks
git commit -m "feat: add user authentication"

# View history
git log --oneline           # compact one-line view
git log --graph --oneline   # visualise branch topology

# Undo staged change (keeps file changes)
git restore --staged src/app.py

# Undo working directory change (destructive — discards file changes)
git restore src/app.py
```

---

## Branching

```bash
# Create and switch to a new branch
git switch -c feature/user-auth    # modern syntax
git checkout -b feature/user-auth  # older syntax, same result

# List branches
git branch                         # local
git branch -r                      # remote
git branch -a                      # all

# Switch branches
git switch main

# Delete branch (after merging)
git branch -d feature/user-auth    # safe delete (won't delete unmerged)
git branch -D feature/user-auth    # force delete
```

**Branch naming conventions:**
- `feature/<description>` — new functionality
- `fix/<description>` or `bugfix/<description>` — bug fixes
- `chore/<description>` — maintenance, dependency updates
- `release/<version>` — release preparation

---

## Merging vs Rebasing

### Merge

Combines two branches by creating a new "merge commit" that has two parents.

```bash
git switch main
git merge feature/user-auth
```

```
      A---B---C  feature/user-auth
     /           \
D---E-------------F  main (F is the merge commit)
```

**Pros:** preserves exact history, non-destructive. **Cons:** history gets noisy with many merge commits.

### Rebase

Replays your branch's commits on top of another branch. Rewrites commit history. Commits get new SHAs.

```bash
git switch feature/user-auth
git rebase main   # replay feature commits on top of latest main
```

```
Before:          After:
      A---B---C  feature        A'--B'--C'  feature (new SHAs)
     /                         /
D---E---F  main      D---E---F  main
```

**Pros:** clean linear history. **Cons:** rewrites history — never rebase commits that have been pushed to a shared branch.

### When to use each

| Scenario | Use |
|---|---|
| Merging a completed feature into main | Merge (or squash merge) |
| Updating your branch with latest main | Rebase (`git rebase main`) |
| Cleaning up messy local commits before PR | Interactive rebase |
| Shared branch (main, develop) | Never rebase |

---

## Interactive Rebase (Commit Cleanup)

Rewrite the last N commits before pushing a PR:

```bash
git rebase -i HEAD~3   # rewrite last 3 commits
```

In the editor, change `pick` to:
- `reword` — edit the commit message
- `squash` (or `s`) — combine with previous commit
- `fixup` (or `f`) — squash but discard this commit's message
- `drop` — delete this commit

**Use this to:** squash "WIP" commits, fix typos in commit messages, reorder commits for a cleaner PR.

---

## The Pull Request Workflow

Professional teams work with PRs, not direct pushes to main.

```bash
# 1. Start from latest main
git switch main
git pull origin main

# 2. Create feature branch
git switch -c feature/eval-regression-check

# 3. Make changes, commit frequently
git add src/evalcheck/checker.py
git commit -m "feat: add regression threshold comparison"

# 4. Keep branch up to date with main (rebase preferred)
git fetch origin
git rebase origin/main

# 5. Push branch
git push -u origin feature/eval-regression-check

# 6. Open PR on GitHub — get review — merge
```

**After merge, clean up:**

```bash
git switch main
git pull origin main
git branch -d feature/eval-regression-check
```

---

## Conventional Commits

Standard format that enables automated changelogs and semantic versioning.

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: BREAKING CHANGE: ...]
```

**Types:**

| Type | When |
|---|---|
| `feat` | New feature (triggers minor version bump) |
| `fix` | Bug fix (triggers patch version bump) |
| `chore` | Build tools, dependencies, no production change |
| `docs` | Documentation only |
| `refactor` | Code restructure, no new feature or bug fix |
| `test` | Add or fix tests |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration |
| `BREAKING CHANGE` | Footer — triggers major version bump |

**Examples:**

```
feat(auth): add OAuth 2.0 PKCE flow
fix(api): handle 429 rate limit with exponential backoff
chore: upgrade anthropic SDK to 0.25.0
feat!: remove deprecated v1 endpoints

BREAKING CHANGE: v1 /complete endpoint removed, use /messages instead
```

---

## Undoing Things

```bash
# Amend last commit (message or staged changes) — only before push
git commit --amend -m "corrected message"

# Create a new commit that undoes a previous commit (safe, works on pushed commits)
git revert <commit-sha>

# Move HEAD back N commits (keeps changes staged)
git reset --soft HEAD~1

# Move HEAD back N commits (keeps changes unstaged)
git reset HEAD~1

# Move HEAD back N commits (DESTROYS changes — use carefully)
git reset --hard HEAD~1

# Recover a "lost" commit (if you reset --hard by mistake)
git reflog              # shows all recent HEAD positions
git reset --hard <sha>  # go back to that SHA
```

**Rule of thumb:** `git revert` for pushed commits (non-destructive). `git reset` only for local commits you haven't shared.

---

## .gitignore

Tells Git which files to never track. Committed to the repo so the whole team benefits.

```gitignore
# Python
__pycache__/
*.pyc
*.egg-info/
dist/
.venv/
.env

# Secrets — never commit these
.env.local
.env.production
*.pem
*.key

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

**Global gitignore** (for things specific to your machine, not the project):

```bash
git config --global core.excludesfile ~/.gitignore_global
```

---

## Useful Commands for Debugging

```bash
# Who changed this line and when?
git blame src/auth.py

# Search commit messages
git log --grep="oauth"

# Search code changes across history
git log -S "PKCE" --oneline    # commits that added or removed "PKCE"

# Show what changed in a specific commit
git show <commit-sha>

# Find when a bug was introduced (binary search through history)
git bisect start
git bisect bad              # current commit is broken
git bisect good <sha>       # this commit was fine
# Git checks out the midpoint — test it, then:
git bisect good             # or: git bisect bad
# Repeat until git identifies the culprit commit
git bisect reset
```

## Common Failure Cases

**Force-pushing to a shared branch, overwriting teammates' commits**
Why: `git push --force` on a branch others are working on rewrites the remote history; anyone who has already pulled will have diverged commits that are invisible to them.
Detect: teammates report their branch is "behind" by a strange number of commits, or commits they authored no longer appear in `git log`.
Fix: use `git push --force-with-lease` (fails if someone else has pushed since your last fetch) and never force-push to `main` or a branch with open PRs.

**Rebasing a branch that has already been pushed and shared**
Why: rebase rewrites commit SHAs; if others have based work on the old SHAs, their history diverges irrecoverably from yours.
Detect: a teammate pulls your rebased branch and git reports "your branch has diverged" with hundreds of conflicting commits.
Fix: only rebase local, un-pushed commits; once a branch is pushed and has active reviewers, use merge instead.

**Secrets committed to history**
Why: an API key or `.env` file gets staged and committed; even if removed in a subsequent commit, the secret is permanently in the history.
Detect: `git log -S "sk-ant-"` or `trufflehog`/`gitleaks` scanning the repo finds the secret in a past commit.
Fix: revoke the secret immediately; remove it from history with `git filter-repo --path .env --invert-paths` and force-push; add `.env` to `.gitignore` before the next commit.

**`git add .` committing unintended files**
Why: `git add .` stages everything in the working tree, including compiled artifacts, editor swap files, and local config that should never be tracked.
Detect: `git diff --staged` reveals `.pyc` files, `node_modules/`, or `.env.local` in the staged set.
Fix: always use `git add <specific-file>` or `git add -p`; maintain a comprehensive `.gitignore` that covers build outputs and editor files.

## Connections

- [[cs-fundamentals/networking]] — push/pull communicate over HTTPS or SSH
- [[infra/deployment]] — GitHub Actions CI/CD is triggered by git events (push, PR)
- [[protocols/github-apps]] — GitHub Apps authenticate to the GitHub API to read/write git repositories
- [[python/pypi-distribution]] — PyPI release workflow is triggered from git tags via GitHub Actions

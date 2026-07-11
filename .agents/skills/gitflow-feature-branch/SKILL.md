---
name: gitflow-feature-branch
description:
  Open a feature branch, commit with Conventional Commits, and PR it using a
  gitflow (feature → develop, release → main). Use when starting a feature,
  opening a PR, or unsure of branch/commit conventions. Project-agnostic; read
  the repo's facts file for its scope/label lists and authorship rules.
---

# Gitflow feature branch & PR ritual

A reusable workflow for repos using **gitflow + Conventional Commits**. For
repo-specific values (allowed scopes, labels, authorship/trailer rules, default
branch names), read the repo's facts file (`AGENTS.md` / `CONTRIBUTING.md`).

## 1. Branch off the integration branch, not the release branch

```bash
git checkout develop && git pull origin develop      # or the repo's integration branch
git checkout -b feature/<kebab-slug>
```

- Features: `feature/<slug>` (some repos prefix a phase/epic, e.g.
  `feature/P1-user-auth` — follow local convention).
- Fixes: `fix/<issue>-<slug>` or `hotfix/<slug>`. Releases: `release/v<x.y.z>`.

## 2. Commit with Conventional Commits

`type(scope): subject` — types `feat|fix|chore|ci|docs|style|refactor|test`. Use
the repo's **scope list** (per-service / module / cross-cutting). The body
explains **why**, not what; multi-paragraph for non-trivial work.

```
feat(<scope>): <imperative subject>

<why this change exists; what it unblocks>
```

**Authorship/trailers:** follow the repo's rule (some forbid AI co-author
trailers; some require a sign-off). Check the facts file before adding any
trailer.

## 3. Push and open the PR against the integration branch

```bash
git push -u origin feature/<kebab-slug>
gh pr create --base develop --title "feat(<scope>): <subject>" --body "$(cat <<'EOF'
## Summary
- …
## Test plan
- [ ] …
EOF
)"
```

PR title also follows Conventional Commits. Apply the repo's labels if it uses
them (`gh pr edit --add-label …`).

## 4. Merge

Squash- or merge-commit to the integration branch **after CI is green** (run the
full local gate first — see the repo's commands). Only reach the release branch
(`main`) via a `release/v*` PR.

## Don't

- Don't push directly to the release or integration branch.
- Don't create per-package lockfiles in a workspace with one root lockfile.
- Don't merge with red CI — triage first (see `ci-failure-triage`).

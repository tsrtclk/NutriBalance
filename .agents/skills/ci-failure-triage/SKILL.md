---
name: ci-failure-triage
description:
  Diagnose and fix a failing CI run systematically — find the failing job,
  reproduce it locally, fix the root cause. Use on "CI is failing", "GitHub
  Actions red", "build broken". Project-agnostic; reproduce with the repo's own
  lint/typecheck/test/build commands.
---

# CI failure triage

A reusable flow for red CI. The golden rule: **reproduce the failing job locally
with the same command the workflow runs**, fix the root cause, re-run that
command, then push.

## 1. Find what failed

```bash
gh run list --branch <branch> --limit 5
gh run view <run-id> --json conclusion,jobs \
  --jq '.jobs[] | "\(.conclusion)\t\(.name)"'
gh run view <run-id> --log-failed          # the failing step's logs
```

## 2. Reproduce locally (per job type)

Read the workflow YAML for the exact command, then run it locally:

- **Lint / format** → the repo's `lint` / `format:check`. Format failures are
  usually auto-fixable (`format` / `--write`).
- **Typecheck** → run after any codegen the build needs (e.g. ORM client
  generation) — a "cannot find module"/type error is often stale generated code.
- **Unit test** → the repo's `test`; run the single failing package/file.
- **Mobile analyze/build** → `flutter analyze` / `flutter test`; build failures
  often come from native toolchain/version drift (SDK, Gradle/AGP, Xcode/Swift,
  pods/SPM) or artifact-name rules — check the runner image + plugin
  requirements.

## 3. Common root causes (check these first)

- **Stale generated code** not regenerated before typecheck.
- **Lockfile drift** / wrong package manager version vs. the CI image.
- **Runner version mismatch** (Node/JDK/Xcode major) vs. local.
- **Env/secret missing** in CI that exists locally (the job needs a service or
  variable that isn't provisioned).
- **Path/case sensitivity** (Linux CI vs. macOS local).
- **Flaky external state** (a service not healthy yet) — add a wait/health gate,
  don't just retry.

## 4. Fix + verify

Fix the cause (not the symptom), re-run the **exact** failed command locally
until green, then push. Run the **full local gate** before pushing so you don't
trade one red job for another.

> Keep a short list of this repo's known failure modes in its facts file so the
> next triage is faster.

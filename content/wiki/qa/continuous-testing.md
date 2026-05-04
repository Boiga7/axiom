---
type: concept
category: qa
para: resource
tags: [continuous-testing, shift-left, shift-right, pipeline, feedback-loops]
sources: []
updated: 2026-05-01
tldr: Testing integrated throughout the entire software delivery lifecycle — not a phase at the end. Shift left to catch bugs earlier; shift right to validate in production.
---

# Continuous Testing

Testing integrated throughout the entire software delivery lifecycle. Not a phase at the end. Shift left to catch bugs earlier; shift right to validate in production. The goal is sub-15-minute feedback at every stage.

---

## Continuous Testing vs Traditional Testing

```
Traditional:
  Dev → QA → Release → Production
  Testing happens AFTER development. Feedback in days/weeks.
  Finding a bug in QA phase costs ~6x what it would in dev.

Continuous testing:
  Idea → Coded → PR → Staging → Production
       ↑ tests  ↑ tests ↑ tests ↑ tests  ↑ monitoring
  Testing is parallel to development. Feedback in minutes.
```

---

## The Testing Pipeline

```
Stage 1 — Pre-commit (< 30 seconds):
  detect-secrets → linting → type checking → unit tests
  Triggered: on git commit (pre-commit hook)
  Gate: blocks commit on failure

Stage 2 — PR pipeline (< 10 minutes):
  unit tests → integration tests → coverage → security scan
  Triggered: on PR open/update
  Gate: blocks merge on failure

Stage 3 — Post-merge (< 20 minutes):
  full integration suite → contract tests → deploy staging
  Triggered: on merge to main
  Gate: blocks staging deploy

Stage 4 — Staging verification (< 5 minutes):
  smoke tests → sanity tests → synthetic monitoring
  Triggered: after staging deploy
  Gate: blocks production deploy

Stage 5 — Production monitoring (continuous):
  synthetic monitoring → real user monitoring → alerting
  Triggered: always running
  Gate: triggers incident on failure
```

---

## Pre-commit Hook Setup

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-json
      - id: check-yaml
      - id: check-merge-conflict
      - id: no-commit-to-branch
        args: [--branch, main]

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.9.0
    hooks:
      - id: mypy
        args: [--strict]

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: [--baseline, .secrets.baseline]
```

```bash
# Install hooks
pip install pre-commit
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

---

## Feedback Loop Optimisation

```
Goal: keep each stage's feedback time below the developer's attention span

Pre-commit: < 30s — if slower, devs disable hooks
PR pipeline: < 10 min — ideal; > 15 min and devs stop watching
Staging:     < 5 min — for smoke/sanity only
Post-deploy: < 2 min — synthetic checks only

Techniques to speed up pipelines:
  1. Test parallelisation — shard tests across runners
  2. Dependency caching — cache pip, npm, Docker layers
  3. Test selection — only run tests affected by the diff
  4. Build caching — don't rebuild if nothing changed
  5. Fail fast — run fastest tests first; skip rest on failure
```

---

## Test Selection — Only Test What Changed

```yaml
# Run only tests related to changed files
- name: Detect changed files
  id: changes
  uses: dorny/paths-filter@v3
  with:
    filters: |
      api:
        - 'src/api/**'
      checkout:
        - 'src/checkout/**'
      frontend:
        - 'src/frontend/**'

- name: Run API tests (if API changed)
  if: steps.changes.outputs.api == 'true'
  run: pytest tests/api/ -v

- name: Run checkout tests (if checkout changed)
  if: steps.changes.outputs.checkout == 'true'
  run: pytest tests/checkout/ -v
```

---

## Shift Right — Testing in Production

```python
# 1. Feature flags — controlled exposure before full rollout
from myapp.flags import flag_enabled

@app.get("/api/recommendations")
def get_recommendations(user: User):
    if flag_enabled("new_recommendation_engine", user_id=user.id):
        return new_recommendation_engine(user)
    return legacy_recommendation_engine(user)

# 2. Canary deployment — test with 5% of traffic before full rollout
# (configured in load balancer / service mesh)

# 3. A/B testing — measure outcomes, not just correctness
# Track: conversion rate, order value, error rate per variant

# 4. Synthetic monitoring — automated checks in production
def production_smoke_check():
    response = httpx.get("https://api.myapp.com/health", timeout=5.0)
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.elapsed.total_seconds() < 1.0
```

---

## Metrics for Continuous Testing Health

```
Test effectiveness:
  Mean time to feedback (MTTF) — time from commit to test result
  Flaky test rate — % of runs with non-deterministic results (target < 1%)
  Test coverage trend — is it growing or shrinking? (target: never below 80%)

Pipeline efficiency:
  Pipeline duration — total wall-clock time (target: < 15 min for pre-prod)
  Pipeline pass rate — % of runs succeeding on first try (target: > 95%)
  Build cache hit rate — how often are we rebuilding unnecessarily?

Defect detection:
  Defects escaped to production — bugs per sprint that CI should have caught
  Detection stage distribution — where are we catching bugs?
  Cost of defect by stage — are we catching earlier over time?
```

---

## Continuous Testing Maturity

```
Level 1 — Basic CI:
  Unit tests run on every push. Pass/fail reported.

Level 2 — Quality gates:
  PR blocked on test failure. Coverage threshold enforced.
  Security scan in pipeline.

Level 3 — Shift left:
  Pre-commit hooks. Contract tests. TDD culture.
  Staging smoke suite. Flaky test SLA.

Level 4 — Shift right:
  Synthetic monitoring in production. Feature flags.
  A/B testing framework. Chaos experiments in staging.

Level 5 — Continuous verification:
  Production canary testing. Online evaluations.
  Self-healing test suite. Business metric alerting.
```

---

## Common Failure Cases

**Pre-commit hooks disabled by developers because they're too slow**
Why: hooks that take over 30 seconds cause developers to run `git commit --no-verify` or uninstall the hook entirely, removing the earliest quality gate entirely.
Detect: `git log` shows `--no-verify` in commit messages, or `pre-commit` is not listed in the dev onboarding docs.
Fix: profile the hook and split heavy checks (mypy, full test suite) to the PR pipeline; keep pre-commit under 30 seconds by running only linting and secrets detection locally.

**Path-filter test selection that excludes shared infrastructure from triggering tests**
Why: changes to shared utilities, database models, or config files don't match any specific path filter, so no tests run for the commit most likely to cause a broad regression.
Detect: a refactor of a shared module lands on main without any CI test run, and the regression is caught by a developer who manually runs the suite.
Fix: add a catch-all rule that runs the full test suite when files outside the named path filters change; never allow a merge with zero test coverage.

**Staging smoke suite so broad that it takes 30+ minutes**
Why: staging verification is meant to give a fast go/no-go signal after a deploy; a slow suite means the team either waits or ships to production before the suite completes.
Detect: staging deploys are blocked for over 20 minutes waiting for smoke results, or developers bypass the gate during urgent releases.
Fix: limit the staging suite to the 10-15 most critical happy-path checks; move extended regression to a post-deploy async job that doesn't block production promotion.

**Flaky test rate above 5% but no remediation process**
Why: once flakiness normalises, developers start re-running failures by default rather than investigating, which masks real failures and erodes trust in the entire pipeline.
Detect: the CI dashboard shows frequent "re-run" button usage, or the team cannot distinguish real failures from noise without a second run.
Fix: enforce a flaky test SLA: any test failing non-deterministically in 3 of the last 10 runs is quarantined within 48 hours; track flaky test count as a team metric.

## Connections
[[qa-hub]] · [[qa/qa-in-devops]] · [[qa/smoke-sanity-testing]] · [[qa/test-automation-strategy]] · [[qa/defect-prevention]] · [[cloud/gitops-patterns]] · [[technical-qa/ci-cd-quality-gates]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

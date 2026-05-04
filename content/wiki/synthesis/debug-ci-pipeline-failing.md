---
type: synthesis
category: synthesis
para: resource
tags: [debugging, ci, pipeline, github-actions, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing CI pipelines that fail in CI but pass locally.
---

# Debug: CI Pipeline Failing

**Symptom:** Build or tests pass locally but fail in CI. Pipeline was passing, now failing without code changes. Intermittent failures blocking merges.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Fails in CI, always passes locally | Environment difference — OS, Node version, missing env var |
| Was passing, now failing without code change | Dependency version unpinned, external service changed |
| Fails intermittently | Flaky test, network call to external service, race condition |
| Fails only on one branch | Branch-specific env var or secret not configured |
| Fails after adding more tests | Parallelism conflict or resource exhaustion on CI runner |

---

## Likely Causes (ranked by frequency)

1. Missing environment variable or secret not configured in CI
2. Unpinned dependency pulled a breaking version
3. Flaky test — timing or shared state issue that CI exposes under load
4. Different OS or runtime version between local and CI
5. External service call in tests — rate limited or unavailable in CI environment

---

## First Checks (fastest signal first)

- [ ] Read the exact error in CI logs — do not assume it is the same failure as local; read it fresh
- [ ] Check whether required env vars are set in the CI environment — compare against local `.env`
- [ ] Check whether the failure is consistent or intermittent — run the job 3 times to confirm
- [ ] Check dependency lock file — was `package-lock.json` or `requirements.txt` updated recently?
- [ ] Check whether the test makes any network calls — external calls are the most common CI-specific failure

**Signal example:** Tests fail in CI with `connection refused` on a database call — CI workflow does not have the Postgres service container configured; works locally because a local DB is running.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Service containers in GitHub Actions | [[cloud/github-actions]] |
| Flaky test investigation | [[synthesis/debug-flaky-test]] |
| Dependency version pinning | [[python/npm-pnpm-ecosystem]] |
| Test environment differences | [[qa/test-environments]] |
| Secrets and env vars in CI | [[cloud/secrets-management]] |

---

## Fix Patterns

- Pin all dependency versions in lock files and commit them — never rely on `latest` in CI
- Add service containers to the workflow for DB, Redis, or any other dependency tests need
- Mock all external HTTP calls in tests — never hit real external APIs in CI
- Match CI runtime versions exactly to production — specify Node, Python, Java versions explicitly in the workflow
- Cache dependencies between runs — reduces variance from network fetches and speeds up the pipeline

---

## When This Is Not the Issue

If the environment matches and dependencies are pinned but CI still fails:

- The test itself has an assumption that only holds locally — check for hardcoded file paths, absolute URLs, or local-only config
- Check CI runner resource limits — tests may be passing but timing out on an underpowered runner

Pivot to [[technical-qa/ci-cd-quality-gates]] to audit the pipeline configuration for missing gates and environment parity checks.

---

## Connections

[[cloud/github-actions]] · [[qa/test-environments]] · [[synthesis/debug-flaky-test]] · [[technical-qa/ci-cd-quality-gates]] · [[cloud/secrets-management]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?

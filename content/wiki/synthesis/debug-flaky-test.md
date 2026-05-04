---
type: synthesis
category: synthesis
para: resource
tags: [debugging, testing, flaky, ci, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing tests that pass locally but fail intermittently in CI.
---

# Debug: Flaky Test in CI

**Symptom:** Test passes locally and sometimes in CI, fails intermittently without code changes. Re-running passes. Failure is not consistent.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Fails in CI, always passes locally | Environment difference or timing dependency |
| Fails only when run in parallel | Shared state or port conflict between tests |
| Fails after a specific other test | Test order dependency, shared DB or file state |
| Fails more under load | Timing-based assertion or race condition |
| Started failing after adding more tests | Shared resource contention at scale |

---

## Likely Causes (ranked by frequency)

1. Timing dependency — `sleep` or fixed wait instead of waiting for condition
2. Shared state not cleaned up between tests — DB, file, or in-memory
3. Test order dependency — relies on state left by a previous test
4. External service or network call in CI behaving differently
5. Port or resource conflict when tests run in parallel

---

## First Checks (fastest signal first)

- [ ] Run the test 10 times in isolation — does it fail without other tests running?
- [ ] Check CI logs for the failure message — is it a timeout, assertion error, or connection refused?
- [ ] Check whether the test uses any `sleep` or fixed waits — replace with condition polling
- [ ] Run the full suite twice in randomised order — does failure move to a different test?
- [ ] Check whether the test shares a DB, port, or file with parallel workers

**Signal example:** Test passes in isolation 10/10 but fails 3/10 in full suite — another test is not rolling back a DB transaction, leaving dirty state that breaks the assertion.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Timing-based failures | [[technical-qa/flaky-test-management]] |
| Shared DB state between tests | [[technical-qa/database-testing]] |
| Playwright-specific flakiness | [[technical-qa/playwright-advanced]] |
| CI environment differences | [[qa/test-environments]] |
| Parallel execution conflicts | [[technical-qa/parallel-test-execution]] |

---

## Fix Patterns

- Replace all `sleep` with explicit condition waits — poll until state is true, with a timeout
- Add teardown that resets all shared state — DB rollback, file cleanup, mock reset after every test
- Run tests in random order in CI — surfaces order dependencies immediately
- Quarantine the test while fixing — do not leave it failing silently in CI; it erodes signal
- For Playwright: use `waitFor` on the element state, not a fixed delay

---

## When This Is Not the Issue

If the test has no shared state, no timing dependencies, and fails in isolation:

- The application code itself may be non-deterministic — check for random IDs, timestamps, or unordered collections in assertions
- The test environment may have a resource constraint — check CI runner CPU and memory during failure
- An external dependency (API, DB) may be intermittently slow in CI

Pivot to [[qa/test-environments]] to confirm the CI environment matches the assumptions the test was written against.

---

## Connections

[[technical-qa/flaky-test-management]] · [[technical-qa/playwright-advanced]] · [[technical-qa/parallel-test-execution]] · [[technical-qa/database-testing]] · [[qa/test-environments]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?

---
type: concept
category: technical-qa
para: resource
tags: [flaky-tests, test-reliability, quarantine, ci, automation]
sources: []
updated: 2026-05-01
tldr: A test that sometimes passes and sometimes fails on the same code is a flaky test. Flaky tests erode trust in the test suite — engineers start re-running failures instead of investigating them.
---

# Flaky Test Management

A test that sometimes passes and sometimes fails on the same code is a flaky test. Flaky tests erode trust in the test suite. Engineers start re-running failures instead of investigating them.

---

## The Cost of Flaky Tests

```
Direct cost:
  - CI re-runs waste 10-30 min per flake event
  - On-call engineers investigate phantom failures

Indirect cost:
  - Engineers learn to ignore red CI → real bugs slip through
  - Confidence in the test suite degrades
  - New tests are written to lower standards ("this is just like the other flaky ones")

Rule: a flaky test is worse than no test. It provides false security with real noise.
```

---

## Flaky Test Root Causes

| Category | Examples | Fix |
|---|---|---|
| **Timing / async** | `time.sleep(1)` insufficient, animation not finished | Explicit waits, retry with condition |
| **Order dependency** | Test B relies on data Test A created | Each test owns its data, uses factories |
| **Shared state** | Global variable mutated by parallel test | Test isolation, `scope` boundaries |
| **Network** | External API call in unit test | Mock/stub all external calls |
| **Resource contention** | Port conflict between parallel tests | Dynamic port allocation |
| **Date/time sensitivity** | `datetime.now()` in assertion | Freeze time with `freezegun` / `jest.useFakeTimers` |
| **Selector brittleness** | CSS class changed mid-animation | Role/text locators, explicit wait |
| **Race conditions** | Two threads modifying shared state | Proper synchronisation or avoid shared state |
| **Environment variance** | Different timezone, locale, filesystem case sensitivity | Containerised CI matching prod |

---

## Detection — Find Flakies Before They Find You

```bash
# pytest — run each test N times to expose flakies
pip install pytest-repeat

pytest tests/ --count=5      # run each test 5 times

# pytest-randomly — randomise test order to expose order dependencies
pip install pytest-randomly
pytest --randomly-seed=12345 tests/

# Playwright built-in retry
npx playwright test --retries=3 --reporter=html
# Then look for tests that passed on retry → they're flaky
```

```yaml
# GitHub Actions — detect flakies in CI by running N times
- name: Detect flaky tests
  run: pytest tests/ --count=3 --tb=short --quiet
  continue-on-error: true   # collect data without blocking PR
```

---

## Quarantine Strategy

```python
# Mark flaky tests with a custom marker, exclude from main CI run
import pytest

@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_something_intermittent():
    # Will retry up to 3 times before marking as failed
    ...

# Alternatively: skip with quarantine marker
@pytest.mark.quarantine
@pytest.mark.skip(reason="Flaky — tracked in GH#4521 — quarantined 2026-05-01")
def test_payment_webhook_timing():
    ...
```

```bash
# Normal CI — exclude quarantine
pytest -m "not quarantine"

# Nightly flaky run — run only quarantine to track if fixed
pytest -m quarantine --count=10
```

---

## Fix Patterns

**Async timing:**
```python
# Bad
driver.click("#submit")
time.sleep(2)
assert driver.find_element("#success").is_displayed()

# Good
driver.click("#submit")
WebDriverWait(driver, 10).until(
    EC.visibility_of_element_located((By.ID, "success"))
)
```

**Frozen time:**
```python
from freezegun import freeze_time

@freeze_time("2026-01-15 12:00:00")
def test_subscription_expires_after_30_days():
    sub = create_subscription(start_date=datetime(2026, 1, 15))
    assert not sub.is_expired()

with freeze_time("2026-02-15"):
    assert sub.is_expired()
```

**Dynamic ports:**
```python
import socket

def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]

@pytest.fixture
def server():
    port = get_free_port()
    server = start_test_server(port=port)
    yield server
    server.stop()
```

---

## Tracking and SLA

```
Flaky test SLA (recommended):
  - Detected: quarantine within 24 hours (no longer blocking CI)
  - Assigned: owner identified within 48 hours
  - Fixed or deleted: within one sprint

Dashboard metrics:
  - Flaky test count per week (should trend to zero)
  - Re-run rate per CI run (measure of flakiness overhead)
  - Time-to-quarantine (SLA compliance)

If a test stays flaky for 2 sprints: delete it, not quarantine it.
```

---

## Common Failure Cases

**Quarantine marker added but no owner assigned**
Why: the test is skipped so CI is green, but no one is accountable for fixing it, and it sits quarantined indefinitely.
Detect: quarantined tests older than one sprint with no linked issue or assignee in the skip reason string.
Fix: enforce a policy that every `@pytest.mark.quarantine` must include an issue URL and owner in the `reason` field.

**Retry masking a real regression**
Why: `--reruns=3` hides a newly introduced bug because the test passes on the second attempt by coincidence (e.g., timing window is wide enough most of the time).
Detect: a test that always requires retries after a specific commit was merged.
Fix: treat a test that consistently needs retries after a code change as a failing test, not a flaky one — investigate the commit.

**Time-sensitive assertion without frozen time**
Why: `assert subscription.expires_at > datetime.now()` passes in the morning and fails at night when the test data was created hours earlier.
Detect: tests that fail only in certain CI time slots or on specific weekdays.
Fix: use `freezegun` or `jest.useFakeTimers()` to pin the clock for any assertion involving relative time.

**Order-dependent setup left in a shared fixture**
Why: a `session`-scoped fixture creates a resource that one test modifies permanently, so any test that runs after is working with corrupted state.
Detect: a test that passes in isolation but fails when the full suite runs; `pytest --randomly-seed` surfaces different failures on different seeds.
Fix: downscope the fixture to `function` or implement proper teardown that restores state.

## Connections
[[tqa-hub]] · [[technical-qa/test-architecture]] · [[technical-qa/playwright-advanced]] · [[qa/test-reporting]] · [[qa/qa-in-devops]] · [[qa/regression-testing]]

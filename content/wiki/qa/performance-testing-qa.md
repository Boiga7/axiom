---
type: concept
category: qa
para: resource
tags: [performance-testing, nfr, sla, slo, capacity-planning, baseline]
sources: []
updated: 2026-05-01
tldr: "QA's role in performance: defining NFR acceptance criteria, running performance tests as quality gates, and communicating results to stakeholders. Distinct from engineering-level load testing tooling."
---

# Performance Testing (QA Perspective)

QA's role in performance: defining NFR acceptance criteria, running performance tests as quality gates, and communicating results to stakeholders. Distinct from engineering-level load testing tooling.

---

## Performance NFRs as Acceptance Criteria

```
Every feature with a user-facing response should have performance ACs:

Pattern:
  GIVEN {scenario}
  WHEN {action}
  THEN {response within X ms at Yth percentile under Z concurrent users}

Examples:
  GIVEN the product catalogue has 10,000 products
  WHEN a user searches by category
  THEN results are returned within 500ms at p95 under 100 concurrent users

  GIVEN the checkout page is loaded
  WHEN a user submits payment
  THEN the confirmation is displayed within 3 seconds at p99 under 50 concurrent users

  GIVEN the reports dashboard is accessed
  WHEN a user generates a monthly report
  THEN the report renders within 10 seconds at p95 (async is acceptable)

Performance AC failure = same severity as functional AC failure.
```

---

## Establishing a Baseline

```python
# tools/baseline.py — run before making changes; compare after
import httpx
import statistics
import time
import json

def measure_endpoint(url: str, n: int = 100, headers: dict = None) -> dict:
    latencies = []
    errors = 0
    for _ in range(n):
        start = time.perf_counter()
        try:
            resp = httpx.get(url, headers=headers, timeout=10.0)
            if resp.status_code >= 500:
                errors += 1
        except Exception:
            errors += 1
        latencies.append((time.perf_counter() - start) * 1000)

    latencies.sort()
    return {
        "url": url,
        "n": n,
        "p50": round(statistics.median(latencies), 1),
        "p95": round(latencies[int(n * 0.95)], 1),
        "p99": round(latencies[int(n * 0.99)], 1),
        "max": round(max(latencies), 1),
        "error_rate": round(errors / n, 4),
    }

# Run and save baseline before a release
if __name__ == "__main__":
    endpoints = [
        "https://staging.myapp.com/api/products",
        "https://staging.myapp.com/api/products/p-001",
        "https://staging.myapp.com/api/search?q=widget",
    ]
    baseline = [measure_endpoint(url) for url in endpoints]
    with open(f"baselines/baseline-{date.today()}.json", "w") as f:
        json.dump(baseline, f, indent=2)
```

---

## Performance Regression Check

```python
# tests/performance/test_no_regression.py
import json
import pytest
import httpx
import statistics
import time

REGRESSION_THRESHOLD = 1.20  # 20% slower than baseline = fail

@pytest.fixture(scope="module")
def baseline():
    with open("baselines/baseline-current.json") as f:
        return {e["url"]: e for e in json.load(f)}

def measure(url: str, n=50) -> dict:
    latencies = []
    for _ in range(n):
        start = time.perf_counter()
        httpx.get(url, timeout=10.0)
        latencies.append((time.perf_counter() - start) * 1000)
    latencies.sort()
    return {"p95": latencies[int(n * 0.95)], "p99": latencies[int(n * 0.99)]}

@pytest.mark.parametrize("endpoint", [
    "https://staging.myapp.com/api/products",
    "https://staging.myapp.com/api/products/p-001",
])
def test_no_performance_regression(endpoint, baseline):
    current = measure(endpoint)
    base = baseline[endpoint]

    assert current["p95"] <= base["p95"] * REGRESSION_THRESHOLD, (
        f"p95 regression on {endpoint}: "
        f"current {current['p95']:.0f}ms vs baseline {base['p95']:.0f}ms "
        f"({(current['p95']/base['p95'] - 1)*100:.0f}% slower)"
    )
```

---

## Performance Test Types for QA Sign-Off

```
Load test (required for every release):
  Purpose: verify system meets SLO at expected peak load
  Pass criteria: p95 within SLO, error rate < 1%
  Duration: 15-30 minutes

Stress test (required for capacity planning):
  Purpose: find breaking point, validate auto-scaling triggers
  Pass criteria: documented capacity ceiling; graceful degradation at ceiling
  When: quarterly or before major traffic events

Soak test (required for major features):
  Purpose: catch memory leaks and connection exhaustion
  Pass criteria: performance stable for 2+ hours at 50% peak
  When: new background jobs, new caching layers, new connection pools

Volume test (required for data-heavy features):
  Purpose: verify queries don't degrade with production-sized datasets
  Pass criteria: p95 within SLO with 10x current data volume
  When: new DB queries, new reports, new analytics features
```

---

## Reporting Performance Results to Stakeholders

```markdown
## Performance Test Report — Release 1.4.2

**Test scope:** Checkout flow, product search, order history
**Environment:** Staging (same spec as prod)
**Date:** 2026-05-01

### Results vs SLOs

| Endpoint | SLO (p95) | Result (p95) | Status |
|---|---|---|---|
| GET /api/products | 500ms | 312ms | ✅ PASS |
| POST /api/checkout | 3000ms | 2104ms | ✅ PASS |
| GET /api/orders | 1000ms | 887ms | ✅ PASS |
| GET /api/search | 800ms | 1243ms | ❌ FAIL |

### Key Finding
Search endpoint fails p95 SLO under 80+ concurrent users. Root cause: missing
index on `products.search_vector`. Fix estimated: 2 hours.

### Recommendation
Block release on search fix. All other endpoints pass SLOs.
```

---

## Performance Budget in CI

```yaml
# .github/workflows/performance.yaml
- name: Performance regression check
  run: pytest tests/performance/ -v --timeout=120 -m performance
  env:
    BASELINE_FILE: baselines/baseline-current.json
    APP_URL: ${{ vars.STAGING_URL }}

- name: Lighthouse CI budget
  run: |
    npx lighthouse-ci autorun
  # .lighthouserc.yaml defines budgets per metric per page
```

---

## Common Failure Cases

**Baseline captured from an unrepresentative environment (dev laptop, cold cache)**
Why: the baseline script runs against a local server with no warm cache and no concurrent users; every subsequent measurement in staging looks like a regression even when performance has not changed.
Detect: every release the p95 for `GET /api/products` shows "50% regression" but production metrics are unchanged.
Fix: always capture baselines against the staging environment with the same warmup pass (10 requests discarded) and the same data volume as production; document the exact conditions in the baseline JSON metadata.

**Performance ACs written in prose, not as measurable thresholds**
Why: the story AC says "the page should load quickly" rather than specifying percentile and concurrent user count; the test cannot fail because there is no numeric threshold.
Detect: `test_no_performance_regression` cannot be written because `baseline[endpoint]` has no `p95` entry.
Fix: require all performance ACs to follow the Given/When/Then format with explicit p-value, latency threshold, and concurrent user count before the story enters the sprint.

**Regression threshold set too loosely — real regressions pass**
Why: `REGRESSION_THRESHOLD = 1.20` (20% allowed regression) masks a 15% slowdown on a 300ms endpoint, which is a 45ms real-world impact that violates the SLO.
Detect: the test passes, but the stakeholder report shows the p95 for `POST /api/checkout` climbed from 1.8s to 2.1s over three releases.
Fix: set the threshold relative to the SLO headroom, not a fixed percentage: if the SLO is 3s and the baseline is 2.1s, the allowed regression should be at most `(3.0 - 2.1) / 2.1 ≈ 43%` — but prefer a hard ceiling of 10% to catch gradual degradation early.

**Soak and volume tests only run manually before major releases — leaks between releases**
Why: the CI pipeline only includes the load test; soak and volume tests are run manually once per quarter and so memory leaks introduced in intermediate releases go undetected.
Detect: heap memory grows by 20MB/hour in production Grafana charts; no automated test would have caught it.
Fix: add the soak test as a nightly scheduled CI job (not a pre-release gate) so it catches regressions within 24 hours of introduction.

## Connections
[[qa-hub]] · [[qa/non-functional-testing]] · [[qa/test-automation-strategy]] · [[technical-qa/load-testing-advanced]] · [[qa/qa-metrics]] · [[cloud/observability-stack]]

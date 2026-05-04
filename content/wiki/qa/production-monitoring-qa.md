---
type: concept
category: qa
para: resource
tags: [production-monitoring, synthetic-monitoring, real-user-monitoring, on-call, slo]
sources: []
updated: 2026-05-01
tldr: QA's role doesn't end at release — production is where quality actually matters. Synthetic monitoring, real user monitoring, and SLO tracking extend testing into live systems.
---

# Production Monitoring for QA

QA's role doesn't end at release. Production is where quality actually matters. Synthetic monitoring, real user monitoring, and SLO tracking extend testing into live systems.

---

## QA in Production

```
Testing doesn't stop at the release gate. Production is the ultimate test environment.

QA responsibilities post-release:
  - Define and track SLOs (Service Level Objectives)
  - Write and maintain synthetic monitors
  - Analyse real user error patterns to write new test cases
  - Triage production incidents by test impact
  - Feed production bugs back into the test suite
  - Validate new releases via canary monitoring
```

---

## Synthetic Monitoring

Automated checks that run against production on a schedule. Simulating user journeys.

```python
# monitors/checkout_monitor.py — runs every 5 minutes via AWS Lambda / GCP Cloud Scheduler
import httpx
import os
import time
from dataclasses import dataclass

@dataclass
class CheckResult:
    name: str
    passed: bool
    duration_ms: float
    error: str = None

def run_checkout_monitor() -> list[CheckResult]:
    base = os.environ["PRODUCTION_URL"]
    results = []

    # Check 1: Health
    start = time.perf_counter()
    resp = httpx.get(f"{base}/health", timeout=5.0)
    results.append(CheckResult("health_endpoint", resp.status_code == 200,
                               (time.perf_counter() - start) * 1000))

    # Check 2: Authentication
    start = time.perf_counter()
    resp = httpx.post(f"{base}/api/auth/token", json={
        "email": os.environ["MONITOR_USER_EMAIL"],
        "password": os.environ["MONITOR_USER_PASSWORD"],
    }, timeout=10.0)
    token = resp.json().get("access_token") if resp.status_code == 200 else None
    results.append(CheckResult("auth_flow", resp.status_code == 200,
                               (time.perf_counter() - start) * 1000))

    if not token:
        return results

    headers = {"Authorization": f"Bearer {token}"}

    # Check 3: Product listing
    start = time.perf_counter()
    resp = httpx.get(f"{base}/api/products", headers=headers, timeout=5.0)
    results.append(CheckResult("product_listing",
                               resp.status_code == 200 and len(resp.json()["data"]) > 0,
                               (time.perf_counter() - start) * 1000))

    return results

def handler(event, context):
    results = run_checkout_monitor()
    failures = [r for r in results if not r.passed]
    if failures:
        # Alert via SNS/PagerDuty
        publish_alert(failures)
        raise RuntimeError(f"{len(failures)} monitor checks failed")
    return {"status": "ok", "checks": len(results)}
```

---

## SLO Definition and Tracking

```yaml
# SLOs for the product service
slos:
  - name: Product API Availability
    metric: http_requests_total{status!~"5.."}  / http_requests_total
    target: 0.999   # 99.9% — 8.7 hours downtime per year
    window: 30d

  - name: Product API Latency
    metric: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
    target: 0.5     # p95 < 500ms
    window: 30d

  - name: Checkout Success Rate
    metric: checkout_success_total / checkout_attempts_total
    target: 0.995   # 99.5% of checkout attempts succeed
    window: 7d

  - name: Order Processing Time
    metric: histogram_quantile(0.99, rate(order_processing_duration_seconds_bucket[5m]))
    target: 30.0    # p99 < 30 seconds
    window: 24h
```

```python
# tools/slo_report.py — weekly SLO report
def calculate_error_budget(target: float, window_hours: float, downtime_hours: float) -> dict:
    allowed_downtime = window_hours * (1 - target)
    remaining = allowed_downtime - downtime_hours
    consumed_pct = (downtime_hours / allowed_downtime) * 100 if allowed_downtime > 0 else 0

    return {
        "target": f"{target * 100:.1f}%",
        "allowed_downtime_hours": round(allowed_downtime, 2),
        "actual_downtime_hours": round(downtime_hours, 2),
        "remaining_budget_hours": round(remaining, 2),
        "budget_consumed_pct": round(consumed_pct, 1),
        "status": "HEALTHY" if consumed_pct < 50 else "AT RISK" if consumed_pct < 90 else "BURNED",
    }
```

---

## Real User Monitoring (RUM)

```javascript
// frontend/monitoring.ts — capture real user performance
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';

function sendMetric({ name, value, id }) {
  fetch('/api/metrics/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, value, id, page: window.location.pathname }),
    keepalive: true,  // survives page unload
  });
}

onCLS(sendMetric);   // Cumulative Layout Shift
onFID(sendMetric);   // First Input Delay
onLCP(sendMetric);   // Largest Contentful Paint
onTTFB(sendMetric);  // Time to First Byte
```

```python
# Core Web Vitals thresholds (Google)
VITALS_THRESHOLDS = {
    "LCP": {"good": 2500, "poor": 4000},     # ms: load largest content
    "FID": {"good": 100, "poor": 300},       # ms: input delay
    "CLS": {"good": 0.1, "poor": 0.25},     # unitless: layout shift score
    "TTFB": {"good": 800, "poor": 1800},    # ms: server response time
}

def classify_vital(name: str, value: float) -> str:
    t = VITALS_THRESHOLDS[name]
    if value <= t["good"]:
        return "good"
    if value <= t["poor"]:
        return "needs improvement"
    return "poor"
```

---

## Error Budget Alerting

```yaml
# Prometheus alert: burn through error budget too fast
groups:
  - name: slo_alerts
    rules:
    - alert: ErrorBudgetBurnRateTooHigh
      expr: |
        (
          1 - (
            rate(http_requests_total{status!~"5.."}[1h])
            / rate(http_requests_total[1h])
          )
        ) > (1 - 0.999) * 14    # burning 14x the normal rate
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "SLO error budget burning 14x faster than sustainable"
        description: "At this rate, 30-day budget will be exhausted in 2 days"
```

---

## Feeding Production Back to Tests

```python
# When a production bug is found:
# 1. Write a regression test first, before the fix

# Production bug: discount not applied for users with loyalty tier "gold"
def test_gold_users_get_discount():
    """Regression: production bug 2026-04-20 — gold tier discount not applied."""
    user = User(loyalty_tier="gold", email="test@example.com")
    order = Order(user=user, items=[OrderItem(price=100.0, quantity=1)])
    assert order.discount() == 20.0  # 20% for gold tier

# 2. Reproduce it (test fails → confirmed bug is real)
# 3. Fix the code (test passes → regression captured)
# 4. Add monitor to alert if discount calculation fails in production
```

---

## Common Failure Cases

**Synthetic monitor uses a shared test account that gets rate-limited or blocked**
Why: the monitor fires 12 times per hour using the same credentials; the fraud detection system flags the account as a bot and locks it, causing all monitors to fail simultaneously.
Detect: all `CheckResult` items return `passed: False` at the same moment with a 401 or 403 status code, not a service degradation.
Fix: provision a dedicated synthetic-monitoring service account with a static allowlist IP range and ensure the fraud/rate-limit system is configured to exempt that account explicitly.

**SLO targets set at 99.9% without measuring the current baseline first**
Why: 99.9% sounds reasonable but the application currently achieves only 99.5%; the error budget is exhausted on day one and the alert fires constantly, training the team to ignore it.
Detect: the `ErrorBudgetBurnRateTooHigh` alert fires within the first week of the SLO going live; the team acknowledges and dismisses it without action.
Fix: measure actual availability over the previous 30 days before setting an SLO target; start with an achievable target (current baseline - 0.1%) and tighten it quarterly.

**Production regressions not fed back into the test suite — same bug recurs**
Why: the regression test is written to reproduce the bug but filed in a one-off file outside the main test suite and not added to CI; the fix ships but the test is never run again.
Detect: the same production bug is reported again in a later sprint with a different trigger path; searching the test suite finds no test named after the original bug.
Fix: enforce a policy where every production bug fix requires a regression test committed to `tests/regression/` in the same PR as the fix, and that file must be included in the nightly CI run.

**Monitor checks only the happy path — degraded modes go undetected**
Why: the checkout monitor verifies login and product listing but not payment submission; a payment provider outage causes real checkouts to fail while all monitor checks pass.
Detect: a spike in production 502 errors from the payment endpoint appears in Grafana but no monitor alert fires; the team learns from a customer complaint.
Fix: extend synthetic monitors to cover the full critical-path transaction including write operations, using test-mode or sandbox payment tokens that do not charge real money.

## Connections
[[qa-hub]] · [[qa/qa-in-devops]] · [[qa/smoke-sanity-testing]] · [[qa/qa-metrics]] · [[cloud/observability-stack]] · [[cloud/cloud-monitoring]] · [[qa/continuous-testing]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

---
type: concept
category: technical-qa
para: resource
tags: [api-performance, k6, latency, throughput, percentiles, slos, regression, benchmark]
sources: []
updated: 2026-05-01
tldr: Measuring, baselining, and regression-testing API latency and throughput.
---

# API Performance Testing

Measuring, baselining, and regression-testing API latency and throughput.

---

## Metrics to Capture

```
Latency percentiles:
  p50 (median): typical experience
  p90:          most users' experience
  p95:          near-worst case
  p99:          worst-case (1 in 100 requests)
  p99.9 (p999): tail latency — important for high-volume services

  Never optimise for average — outliers hurt user experience.
  Never report average alone — always report p95 or p99.

Throughput:
  RPS (requests per second): how many requests the system handles
  Saturation point: RPS at which latency starts to degrade

Error rate:
  % of requests returning 4xx or 5xx
  Target: < 0.1% under normal load, < 1% under peak

Resource utilisation under load:
  CPU: target < 70% at peak (headroom for spikes)
  Memory: track for leaks (linearly increasing = memory leak)
  DB connections: pool exhaustion causes latency spikes
  Event loop lag (Node.js): > 10ms indicates blocking I/O
```

---

## k6 API Performance Test

```javascript
// api-performance.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("error_rate");
const orderLatency = new Trend("order_creation_ms", true);   // true = milliseconds
const ordersCreated = new Counter("orders_created");

export const options = {
    stages: [
        { duration: "1m", target: 10 },     // ramp up
        { duration: "5m", target: 50 },     // steady state
        { duration: "2m", target: 100 },    // stress
        { duration: "1m", target: 0 },      // ramp down
    ],
    thresholds: {
        "http_req_duration{api:list_orders}": ["p(95)<200"],   // tagged threshold
        "http_req_duration{api:create_order}": ["p(95)<500"],
        "error_rate": ["rate<0.01"],         // < 1% errors
        "http_req_failed": ["rate<0.01"],
    },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

function createOrder() {
    const start = Date.now();
    const payload = JSON.stringify({
        product_id: "prod_abc123",
        quantity: 1,
        user_id: `user_${Math.floor(Math.random() * 1000)}`,
    });

    const response = http.post(`${BASE_URL}/api/orders`, payload, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`,
        },
        tags: { api: "create_order" },
    });

    const latency = Date.now() - start;
    orderLatency.add(latency);
    errorRate.add(response.status >= 400);

    const ok = check(response, {
        "status is 201": (r) => r.status === 201,
        "has order id": (r) => r.json("id") !== undefined,
        "latency < 1s": () => latency < 1000,
    });

    if (ok) ordersCreated.add(1);
    return response;
}

export default function () {
    createOrder();
    sleep(1);
}
```

---

## Python Baseline Benchmark Script

```python
# benchmark.py — capture baseline metrics for regression detection
import asyncio, statistics, time, json
from pathlib import Path
import httpx

API_BASE = "http://localhost:8000"
ITERATIONS = 200
CONCURRENCY = 10

async def measure_endpoint(
    method: str, path: str, payload: dict | None = None, iterations: int = ITERATIONS
) -> dict:
    latencies_ms = []
    errors = 0

    semaphore = asyncio.Semaphore(CONCURRENCY)

    async def single_request() -> None:
        async with semaphore:
            start = time.perf_counter()
            try:
                async with httpx.AsyncClient() as client:
                    if method == "GET":
                        r = await client.get(f"{API_BASE}{path}", timeout=10)
                    else:
                        r = await client.post(f"{API_BASE}{path}", json=payload, timeout=10)
                    if r.status_code >= 400:
                        nonlocal errors
                        errors += 1
            except Exception:
                errors += 1
                return
            latencies_ms.append((time.perf_counter() - start) * 1000)

    await asyncio.gather(*[single_request() for _ in range(iterations)])

    if not latencies_ms:
        return {"error": "all requests failed"}

    sorted_lat = sorted(latencies_ms)
    n = len(sorted_lat)
    return {
        "endpoint": f"{method} {path}",
        "iterations": iterations,
        "error_rate": errors / iterations,
        "p50_ms": sorted_lat[int(n * 0.50)],
        "p90_ms": sorted_lat[int(n * 0.90)],
        "p95_ms": sorted_lat[int(n * 0.95)],
        "p99_ms": sorted_lat[int(n * 0.99)],
        "mean_ms": statistics.mean(latencies_ms),
        "stddev_ms": statistics.stdev(latencies_ms) if n > 1 else 0,
    }

async def main() -> None:
    results = {
        "list_orders": await measure_endpoint("GET", "/api/orders"),
        "get_order": await measure_endpoint("GET", "/api/orders/ord_test123"),
        "create_order": await measure_endpoint("POST", "/api/orders",
                                               {"product_id": "prod_123", "quantity": 1}),
    }

    Path("baseline.json").write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))

asyncio.run(main())
```

---

## Regression Detection in CI

```python
# test_performance_regression.py
import json, pytest
from pathlib import Path

BASELINE_PATH = Path("benchmarks/baseline.json")
THRESHOLD_MULTIPLIER = 1.25   # allow up to 25% regression

@pytest.fixture(scope="session")
def baseline() -> dict:
    if not BASELINE_PATH.exists():
        pytest.skip("No baseline file — run benchmark.py first")
    return json.loads(BASELINE_PATH.read_text())

@pytest.fixture(scope="session")
def current(benchmark_results) -> dict:
    return benchmark_results   # injected from conftest

@pytest.mark.parametrize("endpoint", ["list_orders", "get_order", "create_order"])
@pytest.mark.parametrize("percentile", ["p95_ms", "p99_ms"])
def test_no_latency_regression(
    baseline: dict, current: dict, endpoint: str, percentile: str
) -> None:
    if endpoint not in baseline:
        pytest.skip(f"No baseline for {endpoint}")

    baseline_val = baseline[endpoint][percentile]
    current_val = current[endpoint][percentile]
    threshold = baseline_val * THRESHOLD_MULTIPLIER

    assert current_val <= threshold, (
        f"{endpoint} {percentile}: {current_val:.1f}ms > {threshold:.1f}ms "
        f"(baseline: {baseline_val:.1f}ms, regression: {((current_val/baseline_val)-1)*100:.1f}%)"
    )

def test_error_rates_acceptable(baseline: dict, current: dict) -> None:
    for endpoint, stats in current.items():
        assert stats["error_rate"] < 0.01, (
            f"{endpoint} error rate {stats['error_rate']:.2%} exceeds 1% threshold"
        )
```

---

## SLO Validation Test

```python
SLOS = {
    "GET /api/orders": {"p95_ms": 200, "p99_ms": 500},
    "POST /api/orders": {"p95_ms": 500, "p99_ms": 1000},
    "GET /api/products": {"p95_ms": 100, "p99_ms": 300},
}

async def validate_slos() -> list[str]:
    violations = []
    for endpoint, targets in SLOS.items():
        method, path = endpoint.split(" ", 1)
        results = await measure_endpoint(method, path)
        for metric, target in targets.items():
            actual = results.get(metric, float("inf"))
            if actual > target:
                violations.append(
                    f"{endpoint} {metric}: {actual:.0f}ms > SLO {target}ms"
                )
    return violations
```

---

## Connections

[[tqa-hub]] · [[technical-qa/load-testing-advanced]] · [[technical-qa/performance-testing]] · [[qa/performance-testing-qa]] · [[qa/continuous-testing]] · [[cs-fundamentals/observability-se]]

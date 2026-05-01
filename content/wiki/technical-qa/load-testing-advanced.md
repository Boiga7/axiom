---
type: concept
category: technical-qa
para: resource
tags: [load-testing, k6, locust, performance, sla, slo, throughput]
sources: []
updated: 2026-05-01
---

# Load Testing — Advanced

Performance testing at scale: throughput, latency, saturation, and breakpoints. Goes beyond simple scripts into realistic traffic shaping, SLO validation, and CI integration.

---

## Load Test Types

```
Load test:       Ramp to expected peak, hold, measure steady state
Stress test:     Push beyond expected peak to find the breaking point
Soak test:       Hold at moderate load for hours — find memory leaks, connection exhaustion
Spike test:      Instant jump from 0 to peak — cold start, connection pools
Breakpoint test: Gradually increase until something fails — find capacity ceiling
Volume test:     Large data sets — DB query time with 10M vs 10K rows
```

---

## k6 — Realistic Traffic Scenarios

```javascript
// load/checkout-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const checkoutErrors = new Counter('checkout_errors');
const checkoutDuration = new Trend('checkout_duration', true);
const successRate = new Rate('checkout_success_rate');

export const options = {
  scenarios: {
    // Ramp up to 100 VUs, hold 5 min, ramp down
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // ramp up
        { duration: '5m', target: 100 },   // hold at 100 VUs
        { duration: '2m', target: 0 },     // ramp down
      ],
    },
    // Spike: jump to 500 VUs instantly
    spike_test: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30s',
      startTime: '10m',  // start after load test
    },
  },
  thresholds: {
    http_req_duration: ['p95<500', 'p99<1000'],   // SLO: p95 < 500ms
    http_req_failed: ['rate<0.01'],               // < 1% errors
    checkout_success_rate: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.myapp.com';

export function setup() {
  // Seed test data before test starts
  const response = http.post(`${BASE_URL}/api/test/seed-products`, { count: 100 });
  check(response, { 'seed successful': r => r.status === 200 });
  return { products: response.json().product_ids };
}

export default function (data) {
  // 1. Browse products
  const products = http.get(`${BASE_URL}/api/products`);
  check(products, { 'products loaded': r => r.status === 200 });

  // 2. Add to cart
  const productId = data.products[Math.floor(Math.random() * data.products.length)];
  const cart = http.post(`${BASE_URL}/api/cart`, JSON.stringify({
    product_id: productId, quantity: 1,
  }), { headers: { 'Content-Type': 'application/json' } });

  // 3. Checkout
  const start = Date.now();
  const checkout = http.post(`${BASE_URL}/api/checkout`, JSON.stringify({
    cart_id: cart.json('cart_id'),
    payment_method: 'test_card',
  }), { headers: { 'Content-Type': 'application/json' } });

  checkoutDuration.add(Date.now() - start);

  const success = check(checkout, {
    'checkout 200': r => r.status === 200,
    'has order id': r => r.json('order_id') !== null,
  });

  successRate.add(success);
  if (!success) checkoutErrors.add(1);

  sleep(1 + Math.random() * 2);  // think time: 1-3 seconds
}

export function teardown(data) {
  http.post(`${BASE_URL}/api/test/cleanup`);
}
```

---

## Locust — Python Load Testing

```python
# load/locustfile.py
from locust import HttpUser, task, between, events
import random

class ProductUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Called once per simulated user at start."""
        response = self.client.post("/api/auth/token", json={
            "email": "loadtest@example.com",
            "password": "testpass"
        })
        self.token = response.json()["access_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(5)  # 5x more likely than other tasks
    def browse_products(self):
        self.client.get("/api/products")

    @task(2)
    def view_product_detail(self):
        product_id = random.randint(1, 1000)
        self.client.get(f"/api/products/{product_id}", name="/api/products/[id]")

    @task(1)
    def checkout(self):
        with self.client.post("/api/cart", json={"product_id": 1, "quantity": 1},
                              catch_response=True) as response:
            if response.status_code == 200:
                cart_id = response.json()["cart_id"]
                self.client.post("/api/checkout", json={"cart_id": cart_id})
            else:
                response.failure(f"Cart creation failed: {response.status_code}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"Load test starting against: {environment.host}")
```

```bash
# Run headless with target shape
locust --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --host https://staging.myapp.com \
  --html report.html
```

---

## SLO Validation

```python
# load/validate_slos.py
import json
import sys

with open("k6-results.json") as f:
    results = json.load(f)

metrics = results["metrics"]

SLOS = {
    "http_req_duration{quantile:0.95}": 500,   # p95 < 500ms
    "http_req_duration{quantile:0.99}": 1000,  # p99 < 1000ms
    "http_req_failed{rate}": 0.01,             # error rate < 1%
}

failures = []
for metric, threshold in SLOS.items():
    actual = metrics.get(metric, {}).get("value", float("inf"))
    if actual > threshold:
        failures.append(f"{metric}: {actual:.2f} > {threshold}")

if failures:
    print("SLO VIOLATIONS:")
    for f in failures: print(f"  {f}")
    sys.exit(1)

print("All SLOs met")
```

---

## Database Load Patterns

```python
# Test read query performance under concurrent load
import asyncio
import time
import statistics

async def measure_query_latency(pool, query, iterations=1000):
    latencies = []
    async with asyncio.TaskGroup() as tg:
        for _ in range(iterations):
            async def run():
                start = time.perf_counter()
                async with pool.acquire() as conn:
                    await conn.fetch(query)
                latencies.append((time.perf_counter() - start) * 1000)
            tg.create_task(run())

    return {
        "p50": statistics.median(latencies),
        "p95": sorted(latencies)[int(len(latencies) * 0.95)],
        "p99": sorted(latencies)[int(len(latencies) * 0.99)],
        "max": max(latencies),
    }

async def test_product_list_query_slo():
    pool = await asyncpg.create_pool(DATABASE_URL, max_size=20)
    stats = await measure_query_latency(
        pool, "SELECT * FROM products WHERE category='electronics' ORDER BY name LIMIT 20"
    )
    assert stats["p95"] < 50, f"p95 query time {stats['p95']}ms exceeds 50ms SLO"
```

---

## Load Test in CI (Nightly)

```yaml
# .github/workflows/performance.yaml
name: Nightly Performance Tests
on:
  schedule:
    - cron: '0 1 * * *'

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: grafana/setup-k6-action@v1

    - name: Run load tests
      run: k6 run --out json=results.json load/checkout-flow.js
      env:
        BASE_URL: ${{ vars.STAGING_URL }}

    - name: Validate SLOs
      run: python load/validate_slos.py

    - name: Upload results
      uses: actions/upload-artifact@v4
      with:
        name: k6-results
        path: results.json
```

---

## Connections
[[tqa-hub]] · [[technical-qa/chaos-engineering]] · [[qa/non-functional-testing]] · [[qa/test-automation-strategy]] · [[cloud/observability-stack]] · [[llms/ae-hub]]

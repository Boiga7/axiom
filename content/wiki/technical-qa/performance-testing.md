---
type: concept
category: technical-qa
para: resource
tags: [performance-testing, k6, jmeter, load-testing, stress-testing, sla, thresholds]
sources: []
updated: 2026-05-01
tldr: Validates that a system behaves acceptably under expected and peak load. Catches performance regressions before they become production incidents.
---

# Performance Testing

Validates that a system behaves acceptably under expected and peak load. Catches performance regressions before they become production incidents. Types: load testing (expected load), stress testing (beyond capacity), spike testing (sudden burst), soak testing (sustained load over time).

---

## Performance Testing Types

| Type | Goal | Load pattern |
|---|---|---|
| **Load test** | Verify system handles expected peak load within SLA | Ramp to target, hold, ramp down |
| **Stress test** | Find the breaking point; how does it fail? | Ramp until failure |
| **Spike test** | Validate behaviour under sudden traffic bursts | Instant jump to peak, then back |
| **Soak test** | Detect memory leaks and degradation over time | Moderate load, held for 2–24 hours |
| **Volume test** | Verify with large data volumes (large DB, big files) | Target load but with production-scale data |

---

## k6 — Modern Load Testing

k6 (by Grafana Labs) is the modern standard. JavaScript test scripts, clean API, built-in threshold assertions, CI-friendly CLI output. Self-hosted or cloud.

### Basic Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,             // virtual users
  duration: '5m',       // test duration

  thresholds: {
    http_req_duration: ['p(95)<1000'],   // 95% of requests under 1000ms
    http_req_failed: ['rate<0.01'],      // less than 1% error rate
  },
};

export default function() {
  const res = http.get('https://api.example.com/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);    // think time between requests (realistic user pacing)
}
```

### Scenarios — Ramp Profiles

```javascript
export const options = {
  scenarios: {
    // Ramp up gradually — load test
    gradual_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // ramp to 50 VUs
        { duration: '5m', target: 50 },    // hold at 50
        { duration: '2m', target: 100 },   // ramp to 100
        { duration: '5m', target: 100 },   // hold at 100
        { duration: '2m', target: 0 },     // ramp down
      ],
    },

    // Spike test — sudden burst
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 0 },
        { duration: '1m', target: 500 },   // instant spike
        { duration: '3m', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },

    // Constant arrival rate — realistic request rate
    constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 1000,                         // 1,000 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
    },
  },

  thresholds: {
    http_req_duration: ['p(99)<2000'],
    http_req_failed: ['rate<0.005'],
  },
};
```

### Authentication in k6

```javascript
import http from 'k6/http';

// Get token once per VU lifecycle
export function setup() {
  const loginRes = http.post('https://api.example.com/auth/token', JSON.stringify({
    username: 'loadtest@example.com',
    password: 'testpassword',
  }), { headers: { 'Content-Type': 'application/json' } });

  return { token: loginRes.json('access_token') };
}

export default function(data) {
  http.get('https://api.example.com/dashboard', {
    headers: { Authorization: `Bearer ${data.token}` },
  });
}
```

### CI Integration

```yaml
# GitHub Actions
- name: Run k6 load test
  uses: grafana/k6-action@v0.3.1
  with:
    filename: tests/load/api-load-test.js
  env:
    BASE_URL: https://staging.api.example.com

# Or via Docker
- name: Run k6
  run: |
    docker run --rm \
      -v ${{ github.workspace }}/tests:/tests \
      -e BASE_URL=https://staging.api.example.com \
      grafana/k6 run /tests/load/api-load-test.js
```

---

## JMeter — Enterprise Standard

Apache JMeter. GUI-based test creation, XML test plans (JMX), wide enterprise adoption. Heavier and older than k6 but ubiquitous in enterprise environments.

```bash
# Run from CLI (headless, CI)
jmeter -n -t my-test-plan.jmx \
  -l results.jtl \
  -e -o report/ \
  -Jbase_url=https://staging.example.com \
  -Jthreads=100 \
  -Jduration=300
```

**JMeter test plan structure:**
- Thread Group — defines VU count, ramp-up time, loop count
- HTTP Request Samplers — individual requests
- Assertions — response code, response body, response time
- Listeners — results (view in GUI or JTL file for CI)
- Config Elements — HTTP defaults, CSV data set (parameterisation)

**JMeter vs k6:**
| | k6 | JMeter |
|--|--|--|
| Language | JavaScript | XML/Groovy |
| Threshold assertion | Native | Via plugins |
| CI-friendliness | Excellent | Good (CLI mode) |
| Resource usage | Low | High (JVM) |
| Learning curve | Low | Medium |
| Enterprise adoption | Growing | Dominant |

---

## Performance Metrics to Track

| Metric | Good target | How measured |
|---|---|---|
| **Throughput** | As high as possible at target VUs | requests/second |
| **Response time p50** | < 200ms (API) | Median response |
| **Response time p95** | < 1000ms (API) | 95th percentile |
| **Response time p99** | < 2000ms (API) | 99th percentile |
| **Error rate** | < 1% at target load | 5xx responses / total |
| **Saturation point** | Know it before production finds it | VUs at which p99 exceeds SLA |
| **CPU/memory at peak** | < 70% CPU, headroom for spikes | CloudWatch / Prometheus |

Track p95 and p99, not just average. Averages hide the long tail — a p50 of 100ms with p99 of 5000ms means 1 in 100 requests is extremely slow.

---

## Database Performance Under Load

Often the bottleneck. Check during load tests:
- Connection pool exhaustion (pool wait time > 0 = problem)
- Slow query log during load
- Lock contention (pg_stat_activity in Postgres)
- Index scans vs sequential scans

```sql
-- Postgres: find slow queries during load test
SELECT query, mean_exec_time, calls, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Active connections and states
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

---

## Gatling

JVM-based load testing tool with Scala DSL. Strong for complex scenarios with stateful sessions. Better reporting than JMeter out of the box. Less common than k6 but popular in Java shops.

```scala
class BasicSimulation extends Simulation {
  val httpProtocol = http.baseUrl("https://api.example.com")

  val scn = scenario("Browse Products")
    .exec(http("Get Products").get("/products").check(status.is(200)))
    .pause(1)
    .exec(http("Get Product Detail").get("/products/1").check(status.is(200)))

  setUp(scn.inject(
    rampUsers(100).during(30.seconds),
    constantUsersPerSec(50).during(5.minutes)
  ).protocols(httpProtocol))
    .assertions(
      global.responseTime.percentile(95).lt(1000),
      global.failedRequests.percent.lt(1)
    )
}
```

---

## Connections

- [[technical-qa/api-testing]] — API testing tools used in performance test setup
- [[cloud/cloud-monitoring]] — CloudWatch / Prometheus metrics during load tests
- [[qa/test-strategy]] — performance testing sits in Q3 (critique product, technology-facing)
- [[qa/risk-based-testing]] — performance tests prioritised for high-traffic endpoints
- [[cloud/kubernetes]] — HPA behaviour under load is a key scenario to test

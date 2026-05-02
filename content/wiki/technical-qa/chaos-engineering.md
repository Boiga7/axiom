---
type: concept
category: technical-qa
para: resource
tags: [chaos-engineering, resilience, fault-injection, gameday, fis]
sources: []
updated: 2026-05-01
tldr: Deliberately injecting failure into a system to verify it behaves correctly under stress — before production does it for you. Chaos is a quality practice, not an ops stunt.
---

# Chaos Engineering

Deliberately injecting failure into a system to verify it behaves correctly under stress, before production does it for you. Chaos is a quality practice, not an ops stunt.

---

## Principles of Chaos Engineering

```
1. Define steady state — what does "healthy" look like? (latency p99, error rate, queue depth)
2. Hypothesise — "if X fails, system will degrade gracefully (not go down)"
3. Inject failure in production or production-like environment
4. Observe — does steady state hold?
5. Fix weaknesses, then automate the experiment
```

---

## Chaos Toolkit — Python

```python
# chaos/network-latency-experiment.json
{
    "version": "1.0.0",
    "title": "Slow database response causes graceful degradation",
    "description": "Add 500ms latency to DB connection and verify app still serves from cache",
    "steady-state-hypothesis": {
        "title": "Service responds in under 2s",
        "probes": [
            {
                "name": "homepage-responds-in-time",
                "type": "probe",
                "provider": {
                    "type": "http",
                    "url": "https://api.myapp.com/products",
                    "timeout": 2.0,
                    "expected_status": 200
                }
            }
        ]
    },
    "method": [
        {
            "type": "action",
            "name": "add-network-latency",
            "provider": {
                "type": "python",
                "module": "chaosnetwork.actions",
                "func": "add_latency",
                "arguments": {"delay": "500ms", "target": "postgres"}
            }
        }
    ],
    "rollbacks": [
        {
            "type": "action",
            "name": "remove-latency",
            "provider": {
                "type": "python",
                "module": "chaosnetwork.actions",
                "func": "remove_latency",
                "arguments": {"target": "postgres"}
            }
        }
    ]
}
```

```bash
chaos run chaos/network-latency-experiment.json
```

---

## AWS Fault Injection Simulator (FIS)

```python
import boto3

fis = boto3.client("fis", region_name="eu-west-1")

# Create an experiment template
response = fis.create_experiment_template(
    description="Kill 50% of ECS tasks in product service",
    targets={
        "ProductTasks": {
            "resourceType": "aws:ecs:task",
            "resourceTags": {"Service": "product-service"},
            "selectionMode": "PERCENT(50)",
        }
    },
    actions={
        "StopTasks": {
            "actionId": "aws:ecs:stop-task",
            "targets": {"Tasks": "ProductTasks"},
        }
    },
    stopConditions=[
        {"source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:..."}
    ],
    roleArn="arn:aws:iam::123456789:role/FISRole",
    tags={"Experiment": "ecs-task-kill"},
)

template_id = response["experimentTemplate"]["id"]

# Run the experiment
experiment = fis.start_experiment(experimentTemplateId=template_id)
print(f"Experiment started: {experiment['experiment']['id']}")
```

---

## Toxiproxy — Local Network Chaos

```python
# tests/chaos/test_db_timeout_handling.py
import toxiproxy
import pytest
import httpx

@pytest.fixture(scope="module")
def toxiproxy_client():
    return toxiproxy.Toxiproxy()

@pytest.fixture
def slow_db(toxiproxy_client):
    proxy = toxiproxy_client.create("postgres_proxy", listen="0.0.0.0:25432", upstream="postgres:5432")
    yield proxy
    toxiproxy_client.destroy_proxy("postgres_proxy")

def test_app_serves_cached_data_when_db_slow(slow_db):
    # Add 3 second latency to DB connection
    slow_db.add_toxic("latency", type="latency", attributes={"latency": 3000})

    response = httpx.get("http://localhost:8000/products", timeout=5.0)

    # App should still return data from cache, not time out to the user
    assert response.status_code == 200
    assert response.headers.get("X-Cache") == "HIT"
    assert response.elapsed.total_seconds() < 1.0  # fast because served from cache
```

---

## Pod Chaos with Kubernetes

```yaml
# chaos/pod-failure.yaml (using chaos-mesh)
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: product-service-pod-failure
  namespace: chaos-testing
spec:
  action: pod-failure
  mode: fixed-percent
  value: "50"
  selector:
    namespaces:
      - production
    labelSelectors:
      app: product-service
  duration: "5m"
  scheduler:
    cron: "@every 1h"    # run every hour in staging
```

```yaml
# chaos/network-chaos.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: checkout-service-packet-loss
spec:
  action: loss
  mode: all
  selector:
    labelSelectors:
      app: checkout-service
  loss:
    loss: "25"          # 25% packet loss
    correlation: "25"
  direction: to
  target:
    selector:
      labelSelectors:
        app: payment-gateway
    mode: all
  duration: "2m"
```

---

## Game Days

```
Game day structure (half-day):
  1. Pre-brief (30 min)
     - Hypothesis: "If the payment service goes down, orders queue and process on recovery"
     - Roles: chaos operator, observer, on-call, scribe
     - Blast radius: agreed scope, kill switch defined

  2. Experiment (2 hours)
     - Inject failure incrementally (10% traffic first, then 50%, then 100%)
     - Observe dashboards, not logs — you need aggregate view
     - Scribe records actual vs predicted behaviour in real time

  3. Retrospective (1 hour)
     - What broke? What held?
     - What alerts fired? What alerts SHOULD have fired but didn't?
     - Action items with owners and deadlines

Cadence: quarterly for critical paths; monthly for teams building new services.
```

---

## Chaos in CI Pipeline

```yaml
# .github/workflows/chaos.yaml
name: Chaos Tests
on:
  schedule:
    - cron: '0 2 * * 3'    # Wednesday 2am — low traffic window
  workflow_dispatch:

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: pip install chaostoolkit chaostoolkit-kubernetes

    - name: Deploy staging stack
      run: helm upgrade --install myapp charts/myapp --namespace staging

    - name: Run chaos experiments
      run: |
        chaos run chaos/pod-failure-experiment.json
        chaos run chaos/network-latency-experiment.json
        chaos run chaos/db-timeout-experiment.json

    - name: Check steady state recovered
      run: pytest tests/chaos/test_recovery.py -v
```

---

## Common Failure Cases

**Experiment rollback fails silently, leaving latency or packet loss injected permanently**
Why: the `rollbacks` block in a chaos experiment runs as a best-effort cleanup; if the rollback action itself encounters an error (e.g., the toxiproxy process was restarted), the failure is logged but the toxic remains active.
Detect: after a chaos run, make a baseline health check request and compare latency against pre-experiment metrics; a systematically elevated baseline means a rollback didn't execute.
Fix: treat rollbacks as critical paths — add an explicit health-check probe after the rollback step and alert if latency doesn't return to within 10% of steady state.

**Steady-state hypothesis is too lenient, masking real degradation**
Why: a 2-second timeout threshold passes even when the service is serving degraded responses from a stale cache, because the hypothesis only checks that the endpoint returns 200 within 2 seconds — not that the response is fresh.
Detect: the experiment reports steady state held, but downstream consumers report stale or incomplete data during the window.
Fix: include a data freshness probe in the hypothesis (e.g., check a `Last-Modified` header or a monotonic counter) alongside the latency check.

**FIS experiment affects production traffic because the resource selector tag is too broad**
Why: `resourceTags: {"Service": "product-service"}` matches both staging and production ECS tasks if both environments share the same tag key without an environment qualifier.
Detect: a production alert fires during a chaos experiment scheduled against staging.
Fix: always include an environment qualifier in the resource selector (`"Env": "staging"`) and add a CloudWatch alarm stop condition tuned to production error rate so the experiment halts automatically if blast radius escapes.

**Toxiproxy test gives false confidence because the app bypasses the proxy at startup**
Why: the application initialises its database connection pool at startup using the real `postgres:5432` address; the toxiproxy fixture only redirects requests made after setup, so the connection pool is already healthy when latency is injected.
Detect: the test passes (cache hit reported) even without a working cache, because the already-pooled connections are unaffected by the toxiproxy latency.
Fix: configure the application's `DATABASE_URL` to point at `0.0.0.0:25432` (the proxy address) from process start, not just during the test body.

## Connections
[[tqa-hub]] · [[technical-qa/load-testing-advanced]] · [[technical-qa/infrastructure-testing]] · [[qa/non-functional-testing]] · [[cloud/observability-stack]] · [[cloud/aws-step-functions]]

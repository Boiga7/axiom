---
type: concept
category: qa
para: resource
tags: [smoke-testing, sanity-testing, regression, ci, release]
sources: []
updated: 2026-05-01
tldr: Two fast verification techniques used at different stages of delivery. Often confused; both are narrow scope, but serve different purposes.
---

# Smoke and Sanity Testing

Two fast verification techniques used at different stages of delivery. Often confused; both are narrow scope, but serve different purposes.

---

## Smoke vs Sanity

| | Smoke Testing | Sanity Testing |
|---|---|---|
| Purpose | Verify basic system health after a build | Verify a specific fix or feature works |
| Scope | Surface-level, breadth over depth | Narrow, depth over breadth |
| When | After every build/deploy | After a bug fix or targeted change |
| Automated | Yes (CI gate) | Often manual |
| If fails | Block further testing | Reject the build and return for rework |
| Coverage | Critical paths only (~5-10 tests) | The fixed area only |

---

## Smoke Test — What to Cover

```
Smoke tests verify the application hasn't fallen over. Not that it's correct.

Must cover:
  ✓ Service is responding (health endpoint returns 200)
  ✓ Database is connected (DB health check passes)
  ✓ Authentication flow works (can log in)
  ✓ Critical happy paths work (can browse products, can add to cart)
  ✓ Key third-party integrations responding (payment ping, email ping)

Should NOT cover:
  ✗ Edge cases
  ✗ Permissions for every role
  ✗ Full regression across all features
```

---

## Smoke Test Suite (Python + httpx)

```python
# tests/smoke/test_smoke.py
import pytest
import httpx

BASE_URL = os.environ.get("APP_URL", "https://staging.myapp.com")

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30) as c:
        yield c

def test_health_endpoint_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_database_healthy(client):
    response = client.get("/health/db")
    assert response.status_code == 200

def test_homepage_loads(client):
    response = client.get("/")
    assert response.status_code == 200
    assert len(response.text) > 100

def test_login_api_responds(client):
    response = client.post("/api/auth/token", json={
        "email": os.environ["SMOKE_USER_EMAIL"],
        "password": os.environ["SMOKE_USER_PASSWORD"],
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_products_api_returns_data(client):
    token = get_token(client)
    response = client.get("/api/products", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert len(response.json()["data"]) > 0
```

---

## Smoke Tests in CI Pipeline

```yaml
# .github/workflows/ci.yaml
jobs:
  smoke:
    needs: [deploy-staging]         # runs after staging deploy
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: pip install pytest httpx
    - name: Run smoke tests
      env:
        APP_URL: ${{ vars.STAGING_URL }}
        SMOKE_USER_EMAIL: ${{ secrets.SMOKE_USER_EMAIL }}
        SMOKE_USER_PASSWORD: ${{ secrets.SMOKE_USER_PASSWORD }}
      run: pytest tests/smoke/ -v --timeout=60 --tb=short

    integration:                    # smoke gates this
      needs: [smoke]
      ...
```

---

## Sanity Testing — Examples

```
Bug fix: "Order total wasn't including VAT"
Sanity test: place an order and verify the total = subtotal + VAT (exact calculation)
             verify the invoice shows the VAT breakdown
             verify the VAT rate changes correctly for different product categories

Feature: "Added promo code support"
Sanity test: apply a valid promo code → correct discount applied
             apply an expired promo code → rejected with clear error
             apply a promo code with usage limit reached → rejected

Don't run the full regression during sanity — just the affected area.
If sanity fails, return the build. Don't proceed to regression.
```

---

## Production Smoke (Synthetic Monitoring)

```python
# AWS Lambda — synthetic canary (runs every 5 min against production)
import urllib.request
import json

def handler(event, context):
    checks = [
        ("Health endpoint", "https://api.myapp.com/health"),
        ("Products API", "https://api.myapp.com/api/products"),
        ("Homepage", "https://www.myapp.com/"),
    ]

    failures = []
    for name, url in checks:
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                if resp.status != 200:
                    failures.append(f"{name}: HTTP {resp.status}")
        except Exception as e:
            failures.append(f"{name}: {e}")

    if failures:
        raise Exception(f"Smoke failures: {', '.join(failures)}")

    return {"statusCode": 200, "body": f"All {len(checks)} checks passed"}
```

---

## Common Failure Cases

**Smoke tests depend on shared test credentials that expire or get deleted**
Why: `SMOKE_USER_EMAIL` and `SMOKE_USER_PASSWORD` are created manually once and not rotated, so when the account is cleaned up or the password expires the entire smoke suite fails in a way that looks like an application regression.
Detect: the smoke suite suddenly fails on login after a period of stability, and the failure is reproducible only in CI, not locally with fresh credentials.
Fix: create smoke test credentials via a setup step in the CI pipeline itself using the factory pattern or a seed command, and inject them as environment variables rather than storing long-lived credentials in secrets.

**The smoke suite grows into a mini-regression suite**
Why: engineers add tests to the smoke suite because it's the fastest thing that runs, until it covers 80 tests and takes 20 minutes.
Detect: the smoke suite duration exceeds 5 minutes, or it tests anything beyond the five must-cover categories (health, DB, auth, critical paths, third-party pings).
Fix: enforce a maximum of 10 smoke tests with a CI check on the count; anything beyond basic health checks belongs in Tier 2.

**Synthetic monitoring canary runs against a static URL that is redirected in production**
Why: the canary Lambda was written when the API was at `/api/products`, but a later deployment moved it to `/v2/api/products`; the canary still returns 200 because the old path redirects rather than 404ing.
Detect: the canary reports healthy but real users are hitting the new endpoint path; compare the URLs the canary tests against the OpenAPI spec on every deploy.
Fix: derive synthetic monitoring URLs from the deployed OpenAPI spec or a service discovery endpoint rather than hardcoding them; add an assertion that the response body is non-empty and contains expected schema keys, not just a 200 status code.

**Sanity test re-runs the full regression after a bug fix**
Why: when a fix is delivered, the team defaults to running the complete regression suite "just to be safe," eliminating the time-saving point of sanity testing.
Detect: cycle time from "fix delivered" to "fix accepted" is 4+ hours because a full regression runs every time.
Fix: define the sanity scope explicitly in the bug ticket (which component, which test scenarios), and run only those plus a smoke check; document the decision to skip full regression in the ticket.

## Connections
[[qa-hub]] · [[qa/regression-testing]] · [[qa/test-strategy]] · [[qa/qa-in-devops]] · [[qa/qa-metrics]] · [[cloud/cloud-monitoring]]

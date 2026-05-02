---
type: concept
category: technical-qa
para: resource
tags: [postman, newman, api-testing, collections, environments, ci-cd, pre-request-scripts]
sources: []
updated: 2026-05-01
tldr: Postman for API exploration and collection building; Newman for running those collections in CI.
---

# Postman and Newman

Postman for API exploration and collection building; Newman for running those collections in CI.

---

## Collection Structure

```
A Postman Collection is a structured set of API requests.

Good collection structure:
  Collection: Order API
    Folder: Auth
      POST /auth/login                   (pre-request: clear old token)
      POST /auth/refresh
    Folder: Orders — Happy Path
      POST /api/orders                   (test: status 201, save order_id)
      GET  /api/orders/{{order_id}}      (test: status 200, status=pending)
      PUT  /api/orders/{{order_id}}/confirm
      GET  /api/orders/{{order_id}}      (test: status=confirmed)
    Folder: Orders — Error Cases
      POST /api/orders (missing quantity) (test: status 400, error message)
      POST /api/orders (invalid product)  (test: status 422)
    Folder: Teardown
      DELETE /api/orders/{{order_id}}    (cleanup — run after tests)
```

---

## Collection Variables and Environments

```json
// Environment: staging.json
{
  "name": "Staging",
  "values": [
    {"key": "base_url", "value": "https://api-staging.example.com", "enabled": true},
    {"key": "api_version", "value": "v1", "enabled": true},
    {"key": "auth_token", "value": "", "enabled": true}
  ]
}

// Environment: production.json
{
  "name": "Production",
  "values": [
    {"key": "base_url", "value": "https://api.example.com", "enabled": true},
    {"key": "api_version", "value": "v1", "enabled": true},
    {"key": "auth_token", "value": "", "enabled": true}
  ]
}
```

---

## Pre-request Scripts

```javascript
// Pre-request script on the collection root — runs before every request
// Auto-refresh the auth token when it's missing or expired

const tokenExpiry = pm.collectionVariables.get("token_expiry");
const now = Date.now();

if (!tokenExpiry || now > parseInt(tokenExpiry)) {
    const loginRequest = {
        url: pm.environment.get("base_url") + "/auth/login",
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                username: pm.environment.get("username"),
                password: pm.environment.get("password"),
            }),
        },
    };

    pm.sendRequest(loginRequest, (err, response) => {
        if (err) throw new Error("Login failed: " + err);
        const body = response.json();
        pm.environment.set("auth_token", body.access_token);
        pm.collectionVariables.set("token_expiry", Date.now() + 55 * 60 * 1000); // 55 min
    });
}
```

---

## Test Scripts

```javascript
// Tests tab on POST /api/orders

// 1. Status code
pm.test("Status is 201 Created", () => {
    pm.response.to.have.status(201);
});

// 2. Response schema
pm.test("Response has order id and status", () => {
    const body = pm.response.json();
    pm.expect(body).to.have.property("id");
    pm.expect(body).to.have.property("status");
    pm.expect(body.status).to.equal("pending");
});

// 3. Save ID for subsequent requests in the same run
pm.test("Save order_id for chained requests", () => {
    const body = pm.response.json();
    pm.collectionVariables.set("order_id", body.id);
});

// 4. Latency SLA
pm.test("Response time < 500ms", () => {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// 5. Header assertions
pm.test("Response has Content-Type application/json", () => {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
```

---

## Newman — CLI Execution

```bash
# Install
npm install -g newman

# Run a collection against staging environment
newman run collections/order-api.postman_collection.json \
    --environment environments/staging.json \
    --reporters cli,junit \
    --reporter-junit-export results/newman-results.xml \
    --bail                          # stop on first failure
    --timeout-request 10000         # 10s per request timeout
    --delay-request 200             # 200ms between requests (rate limiting)

# Run specific folder only
newman run collections/order-api.postman_collection.json \
    --environment environments/staging.json \
    --folder "Orders — Happy Path"

# With environment variable overrides (useful for CI secrets)
newman run collections/order-api.postman_collection.json \
    --environment environments/staging.json \
    --env-var "password=$API_PASSWORD" \
    --env-var "username=ci-test-user"
```

---

## CI Integration

```yaml
# .github/workflows/api-tests.yml
name: API Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 */4 * * *"  # every 4 hours against production (smoke)

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Run API tests — staging
        env:
          API_PASSWORD: ${{ secrets.STAGING_API_PASSWORD }}
        run: |
          newman run collections/order-api.postman_collection.json \
            --environment environments/staging.json \
            --env-var "password=$API_PASSWORD" \
            --reporters cli,junit,htmlextra \
            --reporter-junit-export results/junit.xml \
            --reporter-htmlextra-export results/report.html

      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Newman API Tests
          path: results/junit.xml
          reporter: java-junit

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: newman-report
          path: results/report.html
```

---

## Converting to Automated Tests

```python
# Postman collections are great for exploration, not long-term regression.
# Once a scenario is stable, convert it to pytest + httpx for better maintainability.

# Postman test (brittle, JSON-based, no version control diff)
# Newman run → pass/fail → done

# Converted pytest test (version controlled, composable, type-checked)
import httpx
import pytest

@pytest.mark.asyncio
async def test_create_order_returns_201(api_client: httpx.AsyncClient, auth_headers):
    response = await api_client.post(
        "/api/orders",
        json={"product_id": "prod_abc", "quantity": 1},
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["status"] == "pending"

# Use Postman/Newman for:
#   - Exploratory API testing
#   - Ad-hoc environment checks
#   - Sharing with developers who don't write Python
#   - Smoke tests that non-engineers can run

# Use pytest + httpx for:
#   - Permanent regression tests
#   - Tests that need complex logic (retries, data setup, parametrize)
#   - CI integration where test quality matters
```

---

## Connections

[[technical-qa/tqa-hub]] · [[technical-qa/api-testing]] · [[technical-qa/api-performance-testing]] · [[technical-qa/api-contract-testing]] · [[qa/test-reporting]] · [[technical-qa/test-reporting-dashboards]]

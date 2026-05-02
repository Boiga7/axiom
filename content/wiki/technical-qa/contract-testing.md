---
type: concept
category: technical-qa
para: resource
tags: [contract-testing, pact, consumer-driven, microservices, pactflow, api-contracts]
sources: []
updated: 2026-05-01
tldr: Validates that two services (consumer and provider) can communicate correctly. Sits between unit tests and E2E integration tests.
---

# Contract Testing

Validates that two services (consumer and provider) can communicate correctly. Sits between unit tests and E2E integration tests. Most valuable in microservice architectures where teams deploy independently.

---

## The Problem

In microservice architectures, Service A (consumer) calls Service B (provider). What happens when Service B changes its API?

| Option | Problem |
|---|---|
| Manual communication | Breaks silently; caught in production |
| Integration environment | Slow feedback; hard to reproduce; flaky |
| Mocking the provider | Mocks can drift from reality; false confidence |
| Contract testing | Provider validates it matches all consumers' expectations |

Contract testing gives fast, reliable feedback that a provider hasn't broken its consumers — without running both services simultaneously.

---

## Consumer-Driven Contract Testing (CDC)

**Pact** is the standard CDC framework. The consumer defines the contract; the provider verifies it.

```
Consumer team:
  1. Write consumer tests that define exactly what the API should return
  2. Run tests → Pact generates a .pact file (the contract)
  3. Publish .pact file to PactFlow broker

Provider team:
  4. Pull the contract from PactFlow
  5. Run Pact provider verification against their running API
  6. If verification passes → can deploy without breaking consumers
```

---

## Consumer Side — Python (pact-python)

```python
import pytest
from pact import Consumer, Provider
import requests

@pytest.fixture(scope="module")
def pact():
    consumer = Consumer("OrderService")
    provider = Provider("ProductService")
    pact = consumer.has_pact_with(provider, host_name="localhost", port=1234)
    pact.start_service()
    yield pact
    pact.stop_service()

def test_get_product(pact):
    # Define what the consumer EXPECTS the provider to return
    (pact
     .given("product 123 exists")
     .upon_receiving("a request for product 123")
     .with_request("GET", "/products/123")
     .will_respond_with(200, body={
         "id": 123,
         "name": "Wireless Headphones",
         "price": 79.99,
         "inStock": True
     }))

    with pact:
        # This calls the mock provider (Pact mock server)
        response = requests.get("http://localhost:1234/products/123")
        assert response.status_code == 200
        product = response.json()
        assert product["price"] == 79.99
        assert product["inStock"] is True

    # After the `with` block, Pact verifies all interactions were called
    # and writes the .pact file
```

The `.pact` file generated:
```json
{
  "consumer": {"name": "OrderService"},
  "provider": {"name": "ProductService"},
  "interactions": [{
    "description": "a request for product 123",
    "providerState": "product 123 exists",
    "request": {"method": "GET", "path": "/products/123"},
    "response": {
      "status": 200,
      "body": {"id": 123, "name": "Wireless Headphones", "price": 79.99, "inStock": true}
    }
  }]
}
```

---

## Consumer Side — JavaScript (@pact-foundation/pact)

```javascript
import { Pact } from '@pact-foundation/pact';
import { like, eachLike } from '@pact-foundation/pact/src/dsl/matchers';

const provider = new Pact({
  consumer: 'WebApp',
  provider: 'UserService',
  port: 4000,
});

describe('UserService contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('get user by ID', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'user 42 exists',
        uponReceiving: 'a request to get user 42',
        withRequest: { method: 'GET', path: '/users/42' },
        willRespondWith: {
          status: 200,
          body: {
            id: like(42),            // any integer (flexible matching)
            email: like('user@example.com'),  // any string
            roles: eachLike('admin'),          // array with at least one item
          },
        },
      });
    });

    it('returns user details', async () => {
      const response = await fetch('http://localhost:4000/users/42');
      const user = await response.json();
      expect(response.status).toBe(200);
      expect(user.email).toBeDefined();
    });
  });
});
```

---

## Provider Verification — Python (FastAPI)

```python
import pytest
from pact import Verifier

@pytest.fixture(scope="module")
def verifier():
    return Verifier(provider="ProductService", provider_base_url="http://localhost:8000")

def test_verify_pact(verifier):
    success, logs = verifier.verify_pacts(
        # Fetch contracts from PactFlow broker
        broker_url="https://myteam.pactflow.io",
        broker_token="pact_XXXX",
        publish_verification_results=True,
        provider_version="1.2.3",
        # Provider state setup function
        provider_states_setup_url="http://localhost:8000/_pact/provider-states",
    )
    assert success == 0, f"Pact verification failed:\n{logs}"
```

**Provider state endpoint** — sets up test data for each `given(...)` state:
```python
@app.post("/_pact/provider-states")
async def setup_provider_state(body: dict):
    state = body.get("state")
    if state == "product 123 exists":
        await db.execute("INSERT INTO products VALUES (123, 'Wireless Headphones', 79.99, true)")
    elif state == "product 123 does not exist":
        await db.execute("DELETE FROM products WHERE id = 123")
    return {"status": "ok"}
```

---

## PactFlow — The Broker

PactFlow (SaaS, built on open-source Pact Broker) stores contracts and verification results.

**`can-i-deploy` check** — the key CI gate. Before deploying, ask PactFlow: "Is it safe to deploy this version to production?"

```bash
# In CI — before deploying ProductService v1.2.3 to production
pact-broker can-i-deploy \
  --pacticipant ProductService \
  --version 1.2.3 \
  --to-environment production \
  --broker-base-url https://myteam.pactflow.io \
  --broker-token $PACTFLOW_TOKEN
```

If any consumer has a contract that this provider version fails → `can-i-deploy` exits non-zero → CI blocks the deploy.

---

## Pact Matchers (Flexible Matching)

Don't assert exact values unless they matter for the contract. Use matchers:

| Matcher | Purpose |
|---|---|
| `like(value)` | Match type only, not exact value |
| `eachLike(value, min=1)` | Array with at least `min` items matching the type |
| `string('example')` | Any string |
| `integer(42)` | Any integer |
| `decimal(9.99)` | Any decimal |
| `regex(pattern, example)` | Value matching regex |
| `timestamp(format, example)` | Valid timestamp in format |

Flexible matching makes contracts robust to data changes that don't affect structure.

---

## When to Use Contract Testing

**Best fit:**
- Microservice architectures with independent deployments
- Multiple consumer teams depending on the same provider
- Teams that can't run integration environments on demand
- Rapid release cycles where E2E tests are too slow

**Less useful:**
- Monolith applications (module tests cover this)
- External APIs you don't control (use schema validation instead)
- Simple systems with only one consumer

---

## Schema vs Contract Testing

| | Schema validation | Contract testing (Pact) |
|--|--|--|
| Direction | Consumer validates provider response | Consumer defines, provider verifies |
| Tooling | JSON Schema, Pydantic | Pact, PactFlow |
| Coverage | Response structure | Request + response + state |
| Provider awareness | None (consumer only) | Provider runs verification |
| Best for | External APIs, public API clients | Internal microservices |

---

## Connections

- [[technical-qa/api-testing]] — API testing tools used in provider verification setup
- [[qa/test-strategy]] — contract tests sit at the integration layer of the testing pyramid
- [[cloud/github-actions]] — CI gates using `pact-broker can-i-deploy`
- [[web-frameworks/fastapi]] — FastAPI provider for Pact verification

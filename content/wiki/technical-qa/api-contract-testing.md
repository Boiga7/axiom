---
type: concept
category: technical-qa
para: resource
tags: [contract-testing, pact, consumer-driven, provider, pactflow, schema-registry]
sources: []
updated: 2026-05-01
tldr: Consumer-driven contract testing ensures that services can evolve independently without breaking integrations. The consumer defines what it needs; the provider verifies it can meet that.
---

# API Contract Testing (Advanced)

Consumer-driven contract testing ensures that services can evolve independently without breaking integrations. The consumer defines what it needs; the provider verifies it can meet that. No integration environment required.

---

## Consumer-Driven vs Provider-Driven

```
Provider-driven (OpenAPI): Provider publishes a schema. Consumer must conform.
  Problem: provider can change the schema and break consumers silently.
  Problem: provider doesn't know which parts consumers actually use.

Consumer-driven (Pact): Consumer defines the minimum it needs.
  Provider verifies it meets every consumer's needs.
  Provider knows exactly who it might break before deploying.
  Consumers can't accidentally depend on fields they shouldn't.
```

---

## Pact — Full Workflow

```python
# Step 1: Consumer writes tests and generates pact file

# consumers/orders-service/tests/test_product_client_pact.py
import pytest
from pact import Consumer, Provider, Like, EachLike, Term

pact = Consumer("orders-service").has_pact_with(
    Provider("products-service"),
    host_name="localhost",
    port=8080,
    pact_dir="pacts/",
)

@pytest.fixture(scope="module", autouse=True)
def pact_server():
    with pact:
        yield

def test_get_product_by_id():
    expected = {
        "id": Like("prod-001"),              # any string
        "name": Like("Widget Pro"),          # any string
        "price": Like(29.99),               # any number
        "in_stock": Like(True),             # any bool
        "category": Like("electronics"),    # any string
    }

    (pact
     .given("product prod-001 exists")
     .upon_receiving("a request for product prod-001")
     .with_request("GET", "/api/products/prod-001",
                   headers={"Accept": "application/json"})
     .will_respond_with(200, body=expected, headers={"Content-Type": "application/json"}))

    from orders.clients import ProductClient
    client = ProductClient(base_url="http://localhost:8080")
    product = client.get_product("prod-001")

    assert product.id is not None
    assert product.price > 0

def test_product_not_found_returns_404():
    (pact
     .given("product prod-999 does not exist")
     .upon_receiving("a request for nonexistent product")
     .with_request("GET", "/api/products/prod-999")
     .will_respond_with(404, body={"error": Like("not found")}))

    client = ProductClient(base_url="http://localhost:8080")
    result = client.get_product("prod-999")
    assert result is None
```

```python
# Step 2: Provider verifies the pact

# providers/products-service/tests/test_pact_verification.py
import pytest
from pact import Verifier

def test_pact_with_orders_service():
    verifier = Verifier(
        provider="products-service",
        provider_base_url="http://localhost:8000",
    )

    output, _ = verifier.verify_pacts(
        sources=["pacts/orders-service-products-service.json"],
        # OR: fetch from PactFlow broker
        # broker_url="https://myorg.pactflow.io",
        # broker_token=os.environ["PACT_BROKER_TOKEN"],
        provider_states_setup_url="http://localhost:8000/_pact/provider_states",
        publish_verification_results=True,
        provider_version=os.environ["GIT_SHA"],
    )

    assert output == 0

# Provider state setup endpoint
@app.post("/_pact/provider_states")
async def setup_provider_state(body: dict):
    state = body.get("state")
    if state == "product prod-001 exists":
        await db.execute("INSERT INTO products ...", ...)
    elif state == "product prod-999 does not exist":
        await db.execute("DELETE FROM products WHERE id = 'prod-999'")
    return {"result": "setup complete"}
```

---

## PactFlow — Broker and can-i-deploy

```bash
# Publish pact after consumer tests
pact-broker publish pacts/ \
  --consumer-app-version $(git rev-parse HEAD) \
  --broker-base-url https://myorg.pactflow.io \
  --broker-token $PACT_BROKER_TOKEN \
  --tag main

# Before deploying orders-service to production, check all contracts pass
pact-broker can-i-deploy \
  --pacticipant orders-service \
  --version $(git rev-parse HEAD) \
  --to-environment production \
  --broker-base-url https://myorg.pactflow.io \
  --broker-token $PACT_BROKER_TOKEN

# Exit code 0 = safe to deploy, 1 = contracts broken
```

---

## CI Integration

```yaml
# .github/workflows/ci.yaml

# Consumer service — generate and publish pacts
pact-tests:
  runs-on: ubuntu-latest
  steps:
  - run: pytest tests/pact/ -v
    # Generates pacts/ directory

  - name: Publish pacts
    run: |
      pact-broker publish pacts/ \
        --consumer-app-version ${{ github.sha }} \
        --broker-base-url ${{ vars.PACT_BROKER_URL }} \
        --broker-token ${{ secrets.PACT_BROKER_TOKEN }} \
        --tag ${{ github.ref_name }}

deploy-staging:
  needs: pact-tests
  steps:
  - name: Can I deploy?
    run: |
      pact-broker can-i-deploy \
        --pacticipant orders-service \
        --version ${{ github.sha }} \
        --to-environment staging \
        --broker-base-url ${{ vars.PACT_BROKER_URL }} \
        --broker-token ${{ secrets.PACT_BROKER_TOKEN }}

  - name: Deploy
    run: ./deploy.sh staging
```

---

## Message Contract Testing (Kafka/Events)

```python
# Test event schema contracts — consumer defines what fields it reads
from pact import MessageConsumer, Provider

pact = MessageConsumer("fulfilment-service").has_pact_with(
    Provider("orders-service")
)

def test_order_placed_event_contract():
    expected_event = {
        "event_type": Like("order.placed"),
        "order_id": Like("ord-001"),
        "items": EachLike({
            "product_id": Like("prod-001"),
            "quantity": Like(2),
        }),
        "total": Like(59.98),
    }

    (pact
     .given("an order has been placed")
     .expects_to_receive("an order.placed event")
     .with_content(expected_event)
     .with_metadata({"content-type": "application/json"}))

    # Fulfilment service consumes the event
    handler = OrderPlacedHandler()
    result = handler.handle(pact.message_consumer.message)
    assert result.fulfilment_id is not None
```

---

## When Contract Tests Are Not Enough

```
Contract tests don't cover:
  - Performance (latency, throughput)
  - Authentication and authorisation (only that the shape is correct)
  - Business logic on the provider side
  - Network-level issues (timeouts, retries)

Still need:
  - Integration tests for business scenarios
  - E2E tests for critical flows
  - Smoke tests in staging after contract verification
```

---

## Connections
[[tqa-hub]] · [[technical-qa/wiremock]] · [[technical-qa/ci-cd-quality-gates]] · [[cs-fundamentals/microservices-patterns]] · [[qa/qa-in-devops]] · [[cs-fundamentals/event-driven-architecture]]

---
type: concept
category: technical-qa
para: resource
tags: [mocking, stubs, fakes, test-doubles, dependency-injection]
sources: []
updated: 2026-05-01
tldr: Test doubles — mocks, stubs, fakes, spies — are the tool for isolating units from their dependencies. Choosing the wrong double leads to tests that pass but miss real bugs.
---

# Mock Strategies

Test doubles (mocks, stubs, fakes, spies) are the tool for isolating units from their dependencies. Choosing the wrong double leads to tests that pass but miss real bugs.

---

## Test Double Taxonomy

| Type | State | Behaviour | When to use |
|---|---|---|---|
| Dummy | Returns nothing | No-op | Filling required params not used in test |
| Stub | Pre-configured return value | Passive | Control what a dependency returns |
| Fake | Working implementation | Simplified | In-memory DB, local filesystem |
| Spy | Records calls | Delegates to real | Verify a side effect happened |
| Mock | Expectations set upfront | Strict | Verify exact interaction occurred |

```
Rule of thumb:
  Stub for state-based tests (assert on result)
  Mock for interaction-based tests (assert on calls)
  Fake when you need realistic behaviour (repository pattern)
  Spy when you need to observe without replacing
```

---

## Python — unittest.mock

```python
from unittest.mock import patch, MagicMock, AsyncMock, call
import pytest

# Stub — control what the dependency returns
def test_order_total_includes_vat(mock_product_service):
    with patch("myapp.orders.product_service") as mock_svc:
        mock_svc.get_price.return_value = 100.0
        order = Order(product_id="abc", quantity=2)
        assert order.total_with_vat() == 240.0   # 200 * 1.2 VAT

# Mock — verify the right calls were made
def test_sends_confirmation_email_after_order(mock_email_service):
    with patch("myapp.orders.email_service") as mock_email:
        place_order(user_id="u1", product_id="p1", quantity=1)
        mock_email.send.assert_called_once_with(
            to="user@example.com",
            template="order_confirmation",
            context={"order_id": mock.ANY},
        )

# Spy — delegate to real implementation, observe calls
def test_cache_is_checked_before_db(real_product_service, spy_cache):
    with patch("myapp.cache", wraps=real_cache) as spy:
        product_service.get_product("p1")
        assert spy.get.called
        assert spy.get.call_args == call("product:p1")

# AsyncMock for coroutines
async def test_async_payment_gateway():
    with patch("myapp.payments.gateway") as mock_gw:
        mock_gw.charge = AsyncMock(return_value={"status": "success", "txn_id": "txn_123"})
        result = await charge_customer(amount=99.99, card_token="tok_abc")
        assert result["txn_id"] == "txn_123"
```

---

## Fake Repository Pattern

```python
# tests/fakes/fake_product_repository.py
from myapp.repositories import ProductRepository
from myapp.models import Product

class FakeProductRepository(ProductRepository):
    """In-memory implementation — behaves like the real thing, no DB needed."""

    def __init__(self):
        self._store: dict[str, Product] = {}

    def save(self, product: Product) -> Product:
        self._store[product.id] = product
        return product

    def get(self, product_id: str) -> Product | None:
        return self._store.get(product_id)

    def list(self, category: str | None = None) -> list[Product]:
        products = list(self._store.values())
        if category:
            products = [p for p in products if p.category == category]
        return products

    def delete(self, product_id: str) -> None:
        self._store.pop(product_id, None)

# Usage in tests — no DB, but realistic behaviour
def test_product_service_with_fake_repo():
    repo = FakeProductRepository()
    service = ProductService(repository=repo)

    service.create_product(name="Widget", category="gadgets", price=9.99)
    products = service.list_products(category="gadgets")

    assert len(products) == 1
    assert products[0].name == "Widget"
```

---

## HTTP Mocking with respx (async httpx)

```python
# tests/test_payment_client.py
import pytest
import httpx
import respx

@pytest.mark.anyio
async def test_payment_gateway_success():
    with respx.mock(base_url="https://api.stripe.com") as mock:
        mock.post("/v1/charges").mock(return_value=httpx.Response(200, json={
            "id": "ch_123",
            "status": "succeeded",
            "amount": 2999,
        }))

        client = PaymentGatewayClient()
        result = await client.charge(amount=29.99, token="tok_visa")

        assert result.transaction_id == "ch_123"
        assert result.status == "succeeded"

@pytest.mark.anyio
async def test_payment_gateway_handles_rate_limit():
    with respx.mock(base_url="https://api.stripe.com") as mock:
        # First call: 429, second call: success
        mock.post("/v1/charges").mock(side_effect=[
            httpx.Response(429, headers={"Retry-After": "1"}),
            httpx.Response(200, json={"id": "ch_456", "status": "succeeded"}),
        ])

        client = PaymentGatewayClient(retry_on_rate_limit=True)
        result = await client.charge(amount=29.99, token="tok_visa")
        assert result.transaction_id == "ch_456"
```

---

## Where NOT to Mock

```
Don't mock:
  - The thing you're testing (obvious but broken tests result)
  - Third-party utilities with no external effects (e.g., json.loads)
  - Database in integration tests — use Testcontainers instead
  - Time — use freezegun instead of mocking datetime.now()

Do mock:
  - External HTTP calls (payment APIs, email services, Twilio)
  - File system in unit tests (or use tmp_path fixture)
  - Non-deterministic sources (random, uuid4) when testing outputs
  - Slow dependencies in unit tests (DB queries, file reads)
```

---

## Mocking Best Practices

```python
# Prefer patch.object over patch(str) — catches renames at import time
with patch.object(EmailService, "send") as mock_send:
    ...

# Prefer spec= to avoid typos being silently ignored
mock_repo = MagicMock(spec=ProductRepository)
mock_repo.nonexistent_method()  # AttributeError — caught immediately

# Use context manager form for narrow scope
# NOT: patcher = patch(...); patcher.start() — easy to forget patcher.stop()

# Reset mocks between parametrized cases
@pytest.fixture(autouse=True)
def reset_email_mock(mock_email_service):
    yield
    mock_email_service.reset_mock()
```

---

## Common Failure Cases

**Mocking without `spec=` hides renamed methods**
Why: `MagicMock()` accepts any attribute access, so `mock.sned()` (typo) returns another mock instead of raising `AttributeError`, and the test passes while the real bug is invisible.
Detect: a test asserts on a method call but the assertion always passes regardless of whether the code under test actually calls anything.
Fix: always pass `spec=RealClass` when creating mocks so typos and renamed methods raise immediately.

**Patching the wrong import path**
Why: `patch("myapp.utils.requests.get")` patches the original module, but the code under test imported `from requests import get`, so it holds a reference to the unpatched function.
Detect: the mock is configured but the real HTTP call still fires (network error in tests or real API called).
Fix: patch where the name is used, not where it is defined: `patch("myapp.orders.get")` to patch `get` as imported in `myapp.orders`.

**Fake repository diverges from the real interface**
Why: the real `ProductRepository.save()` is updated to raise a `DuplicateKeyError` on conflict, but `FakeProductRepository` silently overwrites, so tests never exercise the error path.
Detect: a bug reaches production that the tests should have caught; the fake and real implementations handle edge cases differently.
Fix: write an abstract base class or Protocol for the repository and run a shared contract test suite against both the fake and the real implementation.

**AsyncMock used where a sync mock is needed (or vice versa)**
Why: wrapping a synchronous method with `AsyncMock` makes the code `await` a mock that was never meant to be awaited, raising `TypeError` or producing an unexpected coroutine object.
Detect: `TypeError: object MagicMock can't be used in await expression` at test runtime.
Fix: use `MagicMock` for sync callables and `AsyncMock` for coroutines; check which the real method is before choosing.

## Connections
[[tqa-hub]] · [[technical-qa/testcontainers]] · [[technical-qa/wiremock]] · [[technical-qa/flaky-test-management]] · [[qa/test-data-management]] · [[cs-fundamentals/clean-code]]
## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?

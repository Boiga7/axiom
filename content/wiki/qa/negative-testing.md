---
type: concept
category: qa
para: resource
tags: [negative-testing, error-paths, boundary-testing, invalid-input, error-messages, robustness]
sources: []
updated: 2026-05-01
tldr: Testing what the system does when things go wrong — invalid inputs, failed dependencies, boundary violations.
---

# Negative Testing

Testing what the system does when things go wrong — invalid inputs, failed dependencies, boundary violations.

---

## Positive vs Negative Testing

```
Positive testing: verify the system works correctly with valid input
Negative testing: verify the system handles invalid/unexpected input gracefully

Both are required. Positive tests alone are insufficient because:
  - Users don't always follow instructions
  - Attackers deliberately send invalid data
  - External dependencies fail unpredictably
  - Edge cases are where most bugs hide

Negative test goal: the system should always respond predictably and safely —
  never crash, never leak data, never expose internals, never silently corrupt state.
```

---

## Categories of Negative Tests

```
1. Invalid input format
   Expected: "name" is a string
   Negative: send integer, null, array, missing field, empty string

2. Boundary violations
   Expected: quantity 1-100
   Negative: 0, -1, 101, 99999, MAX_INT, 0.5, "100"

3. Business rule violations
   Expected: user can only cancel their own orders
   Negative: cancel another user's order, cancel an already-shipped order

4. State violations
   Expected: submit in "draft" state
   Negative: submit an already-submitted form, modify a deleted resource

5. Resource not found
   Expected: GET /orders/:id returns the order
   Negative: non-existent ID, deleted ID, another user's ID

6. Dependency failures
   Expected: payment service responds successfully
   Negative: payment service times out, returns 500, returns malformed JSON

7. Concurrent access
   Expected: user places one order
   Negative: two simultaneous checkout requests for the same cart
```

---

## Negative Test Design Patterns

```python
import pytest
from httpx import AsyncClient

# Pattern 1: Parametrize all invalid inputs together
INVALID_QUANTITIES = [
    pytest.param(0, id="zero"),
    pytest.param(-1, id="negative"),
    pytest.param(101, id="over-max"),
    pytest.param(999999, id="extreme"),
    pytest.param(0.5, id="fractional"),
    pytest.param("ten", id="string"),
    pytest.param(None, id="null"),
    pytest.param([], id="array"),
]

@pytest.mark.parametrize("quantity", INVALID_QUANTITIES)
async def test_invalid_quantity_rejected(client: AsyncClient, quantity) -> None:
    response = await client.post("/orders", json={
        "product_id": "prod_123",
        "quantity": quantity,
    })
    assert response.status_code == 422  # validation error, not 500

# Pattern 2: Missing required fields
REQUIRED_FIELDS = ["product_id", "quantity", "user_id"]

@pytest.mark.parametrize("missing_field", REQUIRED_FIELDS)
async def test_missing_field_rejected(client: AsyncClient, missing_field: str) -> None:
    complete_payload = {"product_id": "prod_123", "quantity": 1, "user_id": "user_456"}
    payload = {k: v for k, v in complete_payload.items() if k != missing_field}
    response = await client.post("/orders", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(missing_field in str(e) for e in errors)
```

---

## Error Response Quality

```python
# Good error response: structured, informative, no internals exposed
{
    "status": 422,
    "title": "Validation Error",
    "errors": [
        {
            "field": "quantity",
            "message": "Must be between 1 and 100",
            "received": 0
        }
    ]
}

# Bad error response: leaks internals
{
    "detail": "IntegrityError: (psycopg2.errors.NotNullViolation) null value in column \"quantity\"",
    "traceback": "..."
}

# Tests for error quality (not just status code)
async def test_error_response_does_not_leak_stack_trace(client: AsyncClient) -> None:
    response = await client.post("/orders", json={"quantity": None})
    body = response.text
    assert "traceback" not in body.lower()
    assert "psycopg2" not in body
    assert "sqlalchemy" not in body
    assert "line " not in body   # "line X in file Y.py"

async def test_error_response_identifies_field(client: AsyncClient) -> None:
    response = await client.post("/orders", json={"quantity": -1})
    assert response.status_code == 422
    body = response.json()
    assert any("quantity" in str(e) for e in body["detail"])
```

---

## Dependency Failure Testing

```python
import respx
import httpx
import pytest

@pytest.fixture
def mock_payment_service():
    with respx.mock(base_url="https://payments.example.com") as respx_mock:
        yield respx_mock

async def test_payment_service_timeout_handled(
    client: AsyncClient, mock_payment_service
) -> None:
    mock_payment_service.post("/charge").mock(side_effect=httpx.TimeoutException)

    response = await client.post("/orders/complete", json=valid_order_data)

    # System should degrade gracefully, not 500
    assert response.status_code in (408, 503)
    assert "payment" in response.json().get("message", "").lower()

async def test_payment_service_500_handled(
    client: AsyncClient, mock_payment_service
) -> None:
    mock_payment_service.post("/charge").mock(
        return_value=httpx.Response(500, json={"error": "internal"})
    )

    response = await client.post("/orders/complete", json=valid_order_data)
    assert response.status_code == 502  # Bad Gateway (upstream error)

async def test_payment_service_malformed_response(
    client: AsyncClient, mock_payment_service
) -> None:
    mock_payment_service.post("/charge").mock(
        return_value=httpx.Response(200, content=b"not json{}")
    )

    response = await client.post("/orders/complete", json=valid_order_data)
    assert response.status_code in (500, 502)   # must not crash with unhandled exception
```

---

## State Transition Negatives

```python
# Test invalid state transitions explicitly
ORDER_STATES = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

INVALID_TRANSITIONS = [
    ("shipped", "pending"),      # can't go backwards
    ("delivered", "shipped"),    # can't go backwards
    ("cancelled", "confirmed"),  # can't un-cancel
    ("delivered", "cancelled"),  # can't cancel delivered order
]

@pytest.mark.parametrize("current_state,target_state", INVALID_TRANSITIONS)
async def test_invalid_state_transition_rejected(
    client: AsyncClient, make_order, current_state: str, target_state: str
) -> None:
    order = make_order(status=current_state)
    response = await client.patch(f"/orders/{order['id']}", json={"status": target_state})
    assert response.status_code == 409   # Conflict — invalid transition
    assert "cannot" in response.json()["message"].lower()
```

---

## Concurrency Negatives

```python
import asyncio

async def test_concurrent_stock_decrement_consistent(
    client: AsyncClient, product_with_stock_1
) -> None:
    """Only one of two concurrent purchases should succeed when stock = 1."""
    product_id = product_with_stock_1["id"]

    results = await asyncio.gather(
        client.post("/orders", json={"product_id": product_id, "quantity": 1}),
        client.post("/orders", json={"product_id": product_id, "quantity": 1}),
        return_exceptions=True,
    )

    status_codes = [r.status_code for r in results if not isinstance(r, Exception)]
    # Exactly one should succeed, one should fail (409 Conflict or 422)
    assert status_codes.count(201) == 1
    assert status_codes.count(409) == 1 or status_codes.count(422) == 1

    # Stock should now be 0
    stock_check = await client.get(f"/products/{product_id}/stock")
    assert stock_check.json()["quantity"] == 0
```

---

## Connections

[[qa-hub]] · [[qa/test-case-design]] · [[qa/exploratory-testing]] · [[qa/security-testing-qa]] · [[qa/defect-prevention]] · [[technical-qa/load-testing-advanced]]

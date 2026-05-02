---
type: concept
category: cs-fundamentals
para: resource
tags: [tdd, test-driven-development, red-green-refactor, outside-in, bdd]
sources: []
updated: 2026-05-01
tldr: Write a failing test before writing code. The test defines the contract; the implementation satisfies it.
---

# Test-Driven Development

Write a failing test before writing code. The test defines the contract; the implementation satisfies it. TDD is a design technique as much as a testing one. It forces you to think about the API before the implementation.

---

## The Cycle

```
Red   → Write a failing test for the smallest meaningful behaviour
Green → Write the minimum code to make it pass (no more)
Refactor → Clean up without changing behaviour. Tests stay green.

Repeat for every new behaviour.

Rule: never write production code without a failing test first.
Rule: never write more production code than necessary to pass the failing test.
Rule: never refactor on a red bar.
```

---

## Starting a New Feature

```python
# Feature: calculate order discount

# Step 1: RED — write the test first
def test_no_discount_below_threshold():
    order = Order(items=[OrderItem(price=50.0, quantity=1)])
    assert order.discount() == 0.0

# Run: pytest tests/test_order.py::test_no_discount_below_threshold
# Result: ImportError or AttributeError — test fails, test is red

# Step 2: GREEN — minimum code to pass
class Order:
    def __init__(self, items):
        self.items = items

    def discount(self) -> float:
        return 0.0  # minimum to pass

# Run: PASSED — green

# Step 3: next test
def test_ten_percent_discount_over_100():
    order = Order(items=[OrderItem(price=120.0, quantity=1)])
    assert order.discount() == 12.0  # 10% of 120

# Step 4: RED — fails with 0.0 != 12.0

# Step 5: GREEN
class Order:
    DISCOUNT_THRESHOLD = 100.0
    DISCOUNT_RATE = 0.10

    def total(self) -> float:
        return sum(item.price * item.quantity for item in self.items)

    def discount(self) -> float:
        t = self.total()
        return t * self.DISCOUNT_RATE if t > self.DISCOUNT_THRESHOLD else 0.0

# Both tests pass. Refactor: extract constants, clean naming.
```

---

## TDD for a REST Endpoint

```python
# Outside-in TDD: start at the HTTP layer, work inward

# tests/test_products_api.py

# Test 1: happy path
def test_create_product_returns_201(client):
    response = client.post("/api/products", json={
        "name": "Widget Pro",
        "price": 29.99,
        "category_id": "cat_1",
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Widget Pro"
    assert "id" in response.json()

# Write the route handler — minimum to pass
@router.post("/products", status_code=201)
def create_product(body: CreateProductBody, db: Session = Depends(get_db)):
    product = Product(**body.dict())
    db.add(product)
    db.commit()
    return product

# Test 2: validation
def test_create_product_without_name_returns_422(client):
    response = client.post("/api/products", json={"price": 29.99})
    assert response.status_code == 422

# This passes immediately if using Pydantic — name is already required

# Test 3: duplicate name
def test_create_product_duplicate_name_returns_409(client, existing_product):
    response = client.post("/api/products", json={"name": existing_product.name, "price": 5.0})
    assert response.status_code == 409

# Now implement the uniqueness check — guided by the test
```

---

## Test Structure — AAA Pattern

```python
# Arrange / Act / Assert — every test, no exceptions

def test_order_total_includes_all_items():
    # Arrange
    items = [
        OrderItem(price=10.0, quantity=2),   # 20.00
        OrderItem(price=5.50, quantity=3),   # 16.50
    ]
    order = Order(items=items)

    # Act
    total = order.total()

    # Assert
    assert total == 36.50

# One assertion per test is a useful starting rule.
# One behaviour per test is the real rule.
# Multiple assertions of the same outcome are fine.
```

---

## What Makes a Good Test

```
Fast:      < 1ms for a unit test. Slow tests don't get run.
Isolated:  one failing test reveals one problem, not a cascade.
Repeatable: same result regardless of order or environment.
Self-describing: test name explains the scenario and expected outcome.
             test_checkout_fails_when_card_is_declined()
             not test_checkout_2()

Good test name formula:
  test_{unit}_{scenario}_{expected_outcome}
  test_discount_when_total_below_threshold_returns_zero()
  test_login_when_password_wrong_raises_auth_error()
```

---

## TDD Anti-Patterns

```
Test after:
  Writing tests after the fact tests the implementation, not the contract.
  Leads to tests that mirror code structure instead of behaviour.

Testing internals:
  Private methods are tested through public ones.
  Mocking collaborators too aggressively → test is coupled to implementation.

Not running the test first:
  You don't know your test fails until you see it fail.
  A test that was never red might not be testing anything.

Giant tests:
  One test that covers 15 behaviours. When it fails you don't know which.

Ignoring the refactor step:
  Green without cleanup = technical debt + tests that prevent future refactors.
```

---

## TDD with Outside-In (London School)

```
London school: start at the highest level, mock collaborators, drive design inward.

1. Write an acceptance test (HTTP level)
2. It fails — now write a unit test for the top component
3. Mock the service layer → unit test passes
4. Now write a unit test for the service
5. Mock the repository → unit test passes
6. Now write an integration test for the repository against a real DB
7. Run the acceptance test — if all lower tests pass, it should pass too

Chicago school: no mocks, test state not interactions, use real collaborators.
  Better for: business logic, domain models, functional code
  Worse for: systems with complex external dependencies
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/clean-code]] · [[cs-fundamentals/design-patterns]] · [[qa/defect-prevention]] · [[technical-qa/mutation-testing]] · [[qa/bdd-gherkin]]

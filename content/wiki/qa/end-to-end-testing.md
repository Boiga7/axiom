---
type: concept
category: qa
para: resource
tags: [e2e-testing, playwright, critical-paths, flakiness, test-isolation, user-journeys]
sources: []
updated: 2026-05-01
tldr: How to scope, design, and maintain E2E tests that provide signal rather than noise.
---

# End-to-End Testing Strategy

How to scope, design, and maintain E2E tests that provide signal rather than noise.

---

## The E2E Problem Space

```
E2E tests are expensive to write, slow to run, and brittle to maintain.
They are also the only tests that verify the complete user experience.

The right question is not "should we have E2E tests?" but:
  "Which user journeys are valuable enough to justify E2E cost?"

E2E tests earn their place when:
  - The bug would only appear when multiple systems integrate correctly
  - The failure mode is invisible to unit/integration tests
  - The user journey is critical enough that a silent regression is unacceptable
  - Manual verification is slower than maintaining the test

Signs an E2E test should be a different kind of test:
  - Tests only one service (integration test)
  - Tests only logic (unit test)
  - Tests the look of something (visual regression test)
  - Takes more than 5 minutes to run (scope it down)
```

---

## What to Include in E2E

```
Critical path framework — include if ALL of:
  1. Business critical: failure directly loses revenue or violates compliance
  2. Multi-system: requires at least 2 integrated services to verify
  3. High user frequency: happens in > 20% of sessions

Typical E2E scope (e-commerce example):
  ✓ Guest checkout (no account required)
  ✓ Logged-in checkout
  ✓ Apply discount code at checkout
  ✓ Order confirmation email received
  ✓ Order status visible in account history
  ✓ Returns flow (critical revenue path)

Intentionally excluded:
  ✗ Browse products (unit test product listing logic)
  ✗ Filter/sort products (integration test)
  ✗ User profile update (lower criticality, unit testable)
  ✗ Admin order management (internal tool, different risk profile)
```

---

## Playwright E2E Structure

```python
# conftest.py — shared fixtures for E2E suite
import pytest
from playwright.sync_api import Browser, Page, BrowserContext
import httpx

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
        "locale": "en-GB",
        "timezone_id": "Europe/London",
    }

@pytest.fixture
def authenticated_page(page: Page, api_base_url: str) -> Page:
    """Returns a page already logged in as a test user."""
    # Login via API (faster than UI login in every test)
    response = httpx.post(f"{api_base_url}/auth/token", json={
        "email": "test@example.com",
        "password": "TestPass123!",
    })
    token = response.json()["access_token"]

    # Inject auth cookie — bypasses UI login entirely
    page.context.add_cookies([{
        "name": "auth_token",
        "value": token,
        "domain": "localhost",
        "path": "/",
    }])
    return page

@pytest.fixture
def fresh_user(api_base_url: str) -> dict:
    """Create a test user, yield their credentials, delete on teardown."""
    import uuid
    email = f"test-{uuid.uuid4()}@example.com"
    response = httpx.post(f"{api_base_url}/users", json={
        "email": email, "password": "TestPass123!"
    })
    user = response.json()
    yield user
    httpx.delete(f"{api_base_url}/users/{user['id']}", headers={"X-Test-Cleanup": "true"})
```

```python
# tests/e2e/test_checkout.py
from playwright.sync_api import Page, expect
import pytest

class TestGuestCheckout:
    def test_complete_checkout_as_guest(self, page: Page, base_url: str) -> None:
        # Arrange — add item to cart
        page.goto(f"{base_url}/products/premium-widget")
        page.get_by_role("button", name="Add to cart").click()
        page.get_by_role("link", name="Checkout").click()

        # Act — fill checkout form
        page.get_by_label("Email address").fill("buyer@example.com")
        page.get_by_label("Full name").fill("Test Buyer")
        page.get_by_label("Card number").fill("4242424242424242")
        page.get_by_label("Expiry date").fill("12/28")
        page.get_by_label("CVC").fill("123")
        page.get_by_role("button", name="Place order").click()

        # Assert — confirmation page
        expect(page).to_have_url(re.compile(r"/orders/\w+/confirmation"))
        expect(page.get_by_role("heading", name="Order confirmed")).to_be_visible()
        expect(page.get_by_text("buyer@example.com")).to_be_visible()

    def test_discount_code_applied(self, page: Page, base_url: str) -> None:
        page.goto(f"{base_url}/products/premium-widget")
        page.get_by_role("button", name="Add to cart").click()
        page.get_by_role("link", name="Checkout").click()
        
        page.get_by_label("Discount code").fill("SAVE10")
        page.get_by_role("button", name="Apply").click()

        expect(page.get_by_text("10% discount applied")).to_be_visible()
        # Verify price changed
        original_price = page.get_by_test_id("original-price").inner_text()
        discounted_price = page.get_by_test_id("final-price").inner_text()
        assert float(discounted_price.strip("£")) < float(original_price.strip("£"))
```

---

## Test Isolation Patterns

```python
# Pattern 1: API-seeded state (fast, reliable)
@pytest.fixture
def order_in_cart(api_base_url: str, auth_token: str) -> dict:
    """Create an order in cart state via API — skip UI navigation."""
    response = httpx.post(
        f"{api_base_url}/cart/items",
        json={"product_id": "prod_123", "quantity": 1},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    return response.json()

# Pattern 2: Test database per test run
# Use testcontainers or a per-run schema to ensure tests don't share state.
# Each test gets a fresh schema; teardown drops it.

# Pattern 3: Dedicated test user per test class
# Never share a user across test files — concurrent runs corrupt state.
# Use fresh_user fixture (above) for state-mutating tests.

# Anti-pattern: depending on order of test execution
# Bad: test_checkout relies on test_login having run first
# Fix: each test must be able to run in isolation
```

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - "frontend/**"
      - "api/**"
      - "tests/e2e/**"

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]     # 4 parallel shards
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[test]"
      - run: playwright install --with-deps chromium

      - name: Start services
        run: docker compose up -d --wait

      - name: Run E2E shard
        run: |
          pytest tests/e2e/ \
            --shard-id=${{ matrix.shard }} \
            --num-shards=4 \
            --output=test-results \
            --screenshot=only-on-failure \
            --video=retain-on-failure

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-results-shard-${{ matrix.shard }}
          path: test-results/
```

---

## Managing Flakiness

```
E2E flakiness sources (ranked by frequency):
  1. Timing: element not visible yet when assertion runs → use expect() with auto-wait
  2. Test data collision: tests share users/orders → use isolated test data
  3. External service: email, payment, third-party → mock or use test mode
  4. Environment: staging DB resets during test → deploy to stable env
  5. Selector brittleness: CSS changes break locators → use role-based locators

Auto-wait (Playwright default): expect().to_be_visible() retries for 5s by default.
Never add sleep() — use proper waiting primitives.

Quarantine process:
  1. Test fails 3× in 5 days → tag with @flaky
  2. Flaky tests run but don't block CI (--ignore-glob='**/flaky/**')
  3. Weekly review: fix root cause or delete
  4. Target: 0 flaky tests in main suite
```

---

## Connections

[[qa-hub]] · [[qa/test-strategy]] · [[qa/test-automation-strategy]] · [[qa/continuous-testing]] · [[technical-qa/playwright-advanced]] · [[technical-qa/flaky-test-management]] · [[technical-qa/e2e-framework-design]]

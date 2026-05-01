---
type: concept
category: technical-qa
para: resource
tags: [e2e-framework, page-objects, test-architecture, fixtures, abstractions, screenplay]
sources: []
updated: 2026-05-01
---

# E2E Framework Design

Architecting a maintainable E2E test framework — the code behind the tests.

---

## Framework Layering

```
Layer 4: Tests              test_checkout.py, test_login.py
                            Arrange-Act-Assert; no low-level browser calls
                            ↑ reads from
Layer 3: Journeys/Flows     CheckoutJourney, AuthJourney
                            Multi-step user flows; composes page objects
                            ↑ reads from
Layer 2: Page Objects       CheckoutPage, CartPage, LoginPage
                            Encapsulates selectors and interactions per page
                            ↑ reads from
Layer 1: Component Objects  ProductCard, PriceDisplay, FormField
                            Reusable UI components that appear on multiple pages
                            ↑ reads from
Layer 0: Browser Abstraction Playwright Page, BrowserContext
                            Raw browser; never accessed directly in tests

Rule: each layer only imports from the layer directly below it.
Tests never touch selectors. Component objects never know about journeys.
```

---

## Page Object Pattern

```python
# pages/checkout_page.py
from playwright.sync_api import Page, expect
from .base_page import BasePage

class CheckoutPage(BasePage):
    PATH = "/checkout"

    def __init__(self, page: Page) -> None:
        super().__init__(page)
        # Locators — named for what they mean, not CSS classes
        self._email = page.get_by_label("Email address")
        self._name = page.get_by_label("Full name")
        self._card_number = page.get_by_label("Card number")
        self._card_expiry = page.get_by_label("Expiry date")
        self._card_cvc = page.get_by_label("CVC")
        self._place_order_btn = page.get_by_role("button", name="Place order")
        self._discount_input = page.get_by_label("Discount code")
        self._apply_discount_btn = page.get_by_role("button", name="Apply")
        self._order_total = page.get_by_test_id("order-total")
        self._error_message = page.get_by_role("alert")

    def fill_payment_details(
        self,
        email: str = "buyer@example.com",
        name: str = "Test Buyer",
        card: str = "4242424242424242",
        expiry: str = "12/28",
        cvc: str = "123",
    ) -> "CheckoutPage":
        self._email.fill(email)
        self._name.fill(name)
        self._card_number.fill(card)
        self._card_expiry.fill(expiry)
        self._card_cvc.fill(cvc)
        return self   # fluent interface for chaining

    def apply_discount(self, code: str) -> "CheckoutPage":
        self._discount_input.fill(code)
        self._apply_discount_btn.click()
        return self

    def place_order(self) -> "OrderConfirmationPage":
        self._place_order_btn.click()
        from .order_confirmation_page import OrderConfirmationPage
        return OrderConfirmationPage(self._page)

    def get_total(self) -> float:
        text = self._order_total.inner_text()
        return float(text.replace("£", "").replace(",", "").strip())

    def expect_error(self, message: str) -> None:
        expect(self._error_message).to_contain_text(message)

    def expect_discount_applied(self) -> None:
        expect(self._page.get_by_text("Discount applied")).to_be_visible()
```

```python
# pages/base_page.py
from playwright.sync_api import Page, expect

class BasePage:
    def __init__(self, page: Page) -> None:
        self._page = page

    def navigate(self) -> "BasePage":
        self._page.goto(self.PATH)
        return self

    def expect_loaded(self) -> "BasePage":
        expect(self._page).to_have_url(f"**{self.PATH}**")
        return self

    def screenshot(self, name: str) -> None:
        self._page.screenshot(path=f"screenshots/{name}.png", full_page=True)
```

---

## Journey Pattern (Flow Composition)

```python
# journeys/checkout_journey.py
from pages.cart_page import CartPage
from pages.checkout_page import CheckoutPage
from pages.order_confirmation_page import OrderConfirmationPage

class CheckoutJourney:
    """High-level user journey that composes multiple page objects."""

    def __init__(self, page) -> None:
        self._page = page

    def complete_as_guest(
        self,
        product_slug: str = "widget-pro",
        discount_code: str | None = None,
    ) -> OrderConfirmationPage:
        # Navigate to product and add to cart
        self._page.goto(f"/products/{product_slug}")
        self._page.get_by_role("button", name="Add to cart").click()

        # Go to checkout
        CartPage(self._page).proceed_to_checkout()

        # Fill and submit
        checkout = CheckoutPage(self._page).fill_payment_details()
        if discount_code:
            checkout.apply_discount(discount_code)
        return checkout.place_order()

    def complete_as_authenticated(self, user_token: str, **kwargs) -> OrderConfirmationPage:
        self._page.context.add_cookies([{
            "name": "auth_token", "value": user_token,
            "domain": "localhost", "path": "/",
        }])
        return self.complete_as_guest(**kwargs)
```

---

## Test Layer (Thin and Declarative)

```python
# tests/e2e/test_checkout.py
import pytest
from journeys.checkout_journey import CheckoutJourney
from playwright.sync_api import Page, expect

class TestGuestCheckout:
    def test_complete_checkout(self, page: Page, base_url: str) -> None:
        confirmation = CheckoutJourney(page).complete_as_guest()
        expect(page).to_have_url(re.compile(r"/orders/.+/confirmation"))
        expect(page.get_by_role("heading", name="Order confirmed")).to_be_visible()

    def test_discount_code_reduces_total(self, page: Page) -> None:
        journey = CheckoutJourney(page)
        checkout = CheckoutPage(page).navigate().fill_payment_details()
        original_total = checkout.get_total()
        checkout.apply_discount("SAVE10").expect_discount_applied()
        assert checkout.get_total() < original_total

    def test_declined_card_shows_error(self, page: Page) -> None:
        CheckoutPage(page).navigate().fill_payment_details(card="4000000000000002").place_order()
        CheckoutPage(page).expect_error("Your card was declined")
```

---

## Fixture Design for E2E

```python
# conftest.py
import pytest
from playwright.sync_api import BrowserContext

@pytest.fixture(scope="session")
def base_url() -> str:
    return "http://localhost:3000"

@pytest.fixture(scope="session")
def api_url() -> str:
    return "http://localhost:8000"

@pytest.fixture
def page(context: BrowserContext, base_url: str):
    """Fresh page with base URL pre-set."""
    page = context.new_page()
    page.goto(base_url)
    yield page
    # Capture screenshot on failure (pytest hook handles this automatically)
    page.close()

@pytest.fixture(scope="session")
def admin_token(api_url: str) -> str:
    """Session-scoped admin token — created once, reused."""
    import httpx
    r = httpx.post(f"{api_url}/auth/token",
                   json={"email": "admin@test.com", "password": "AdminPass!"})
    return r.json()["access_token"]

@pytest.fixture
def test_product(api_url: str, admin_token: str) -> dict:
    """Create a product for the test, delete after."""
    import httpx, uuid
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = httpx.post(f"{api_url}/products",
                   json={"name": f"Test Product {uuid.uuid4()}", "price": 49.99},
                   headers=headers)
    product = r.json()
    yield product
    httpx.delete(f"{api_url}/products/{product['id']}", headers=headers)
```

---

## Framework Decisions

```
When to use Page Objects vs plain functions:
  Page Objects: when a "page" has multiple interactions and assertions
  Plain functions: one-off helpers; login_via_api() doesn't need a class

When to use Journeys:
  When the same multi-step flow appears in multiple test files.
  Don't journey-ise unique flows — that's premature abstraction.

Selectors — priority order (most to least resilient):
  1. getByRole("button", name="Submit")    ← semantics; survives CSS rewrites
  2. getByLabel("Email address")           ← form accessibility; very stable
  3. getByText("Place order")              ← visible text; okay for unique text
  4. getByTestId("order-total")            ← test-only attribute; explicit contract
  5. CSS/XPath                             ← last resort; fragile

Never hardcode: data-test-id values that change, CSS class names, element position

Framework anti-patterns:
  - Tests that know about database schema (integration test responsibility)
  - Page objects that navigate to other pages (fragile coupling)
  - Base page with 20+ methods (becomes a dumping ground)
  - Shared user between test files (state corruption under parallel runs)
```

---

## Connections

[[tqa-hub]] · [[technical-qa/playwright-advanced]] · [[technical-qa/test-architecture]] · [[technical-qa/parallel-test-execution]] · [[qa/end-to-end-testing]] · [[technical-qa/pytest-advanced]]

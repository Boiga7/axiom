---
type: concept
category: technical-qa
para: resource
tags: [test-architecture, page-object-model, screenplay, fixtures, test-design, automation]
sources: []
updated: 2026-05-01
tldr: Structural patterns for maintainable automation code. Tests are code — they need design, abstraction, and refactoring the same as production code.
---

# Test Architecture

Structural patterns for maintainable automation code. Tests are code. They need design, abstraction, and refactoring the same as production code. Bad test architecture creates the maintenance nightmare that gives automation a bad reputation.

---

## The Core Problem

Automation suites that are written naively against raw selectors break constantly:

```python
# Fragile — breaks when any selector changes
def test_login():
    driver.find_element(By.ID, "email-input").send_keys("test@example.com")
    driver.find_element(By.ID, "password-input").send_keys("password")
    driver.find_element(By.CSS_SELECTOR, ".btn-primary").click()
    assert "dashboard" in driver.current_url
```

If the CSS class changes from `btn-primary` to `btn-login`, every test that uses it breaks. Test architecture solves this with abstraction layers.

---

## Page Object Model (POM)

The most widely used pattern. A class represents a page or component; it encapsulates the selectors and actions for that page. Tests use the API of the page object, not raw selectors.

**Page object — Python (Playwright):**

```python
# pages/login_page.py
from playwright.sync_api import Page

class LoginPage:
    def __init__(self, page: Page):
        self.page = page
        # Selectors are defined once; changed once if UI changes
        self._email = page.get_by_label("Email")
        self._password = page.get_by_label("Password")
        self._login_button = page.get_by_role("button", name="Log In")
        self._error_message = page.get_by_role("alert")

    def navigate(self):
        self.page.goto("/login")
        return self

    def login(self, email: str, password: str) -> "DashboardPage":
        self._email.fill(email)
        self._password.fill(password)
        self._login_button.click()
        return DashboardPage(self.page)

    def login_expecting_error(self, email: str, password: str) -> "LoginPage":
        self._email.fill(email)
        self._password.fill(password)
        self._login_button.click()
        return self

    def error_message(self) -> str:
        return self._error_message.text_content()

    def is_error_visible(self) -> bool:
        return self._error_message.is_visible()
```

```python
# pages/dashboard_page.py
class DashboardPage:
    def __init__(self, page: Page):
        self.page = page
        self._greeting = page.get_by_test_id("greeting")

    def wait_for_load(self) -> "DashboardPage":
        self.page.wait_for_url("/dashboard")
        return self

    def greeting_text(self) -> str:
        return self._greeting.text_content()
```

**Test using page objects:**
```python
# tests/test_login.py
import pytest
from playwright.sync_api import Page
from pages.login_page import LoginPage

def test_successful_login(page: Page):
    dashboard = (
        LoginPage(page)
        .navigate()
        .login("alice@example.com", "Secure123!")
        .wait_for_load()
    )
    assert "Welcome" in dashboard.greeting_text()

def test_wrong_password_shows_error(page: Page):
    login_page = (
        LoginPage(page)
        .navigate()
        .login_expecting_error("alice@example.com", "wrongpassword")
    )
    assert login_page.is_error_visible()
    assert "Invalid" in login_page.error_message()
```

**Benefits:** One selector change → one file to update. Tests read as English. Business logic is in the page object, not scattered across 50 test files.

---

## Page Object Model — Java (Playwright + JUnit 5)

```java
// pages/LoginPage.java
public class LoginPage {
    private final Page page;
    private final Locator email;
    private final Locator password;
    private final Locator loginButton;
    private final Locator errorMessage;

    public LoginPage(Page page) {
        this.page = page;
        this.email = page.getByLabel("Email");
        this.password = page.getByLabel("Password");
        this.loginButton = page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Log In"));
        this.errorMessage = page.getByRole(AriaRole.ALERT);
    }

    public LoginPage navigate() {
        page.navigate("/login");
        return this;
    }

    public DashboardPage login(String email, String password) {
        this.email.fill(email);
        this.password.fill(password);
        this.loginButton.click();
        return new DashboardPage(page);
    }

    public String getErrorMessage() {
        return errorMessage.textContent();
    }
}

// tests/LoginTest.java
@Test
void successfulLogin() {
    DashboardPage dashboard = new LoginPage(page)
        .navigate()
        .login("alice@example.com", "Secure123!");
    assertThat(dashboard.getGreeting()).contains("Welcome");
}
```

---

## Component Objects

For applications with reusable components (nav bars, modals, data tables), model them separately from pages.

```python
# components/data_table.py
class DataTable:
    def __init__(self, page: Page, table_id: str):
        self.table = page.locator(f"[data-testid='{table_id}']")

    def row_count(self) -> int:
        return self.table.locator("tbody tr").count()

    def cell_text(self, row: int, column: int) -> str:
        return self.table.locator(f"tbody tr:nth-child({row}) td:nth-child({column})").text_content()

    def header_texts(self) -> list[str]:
        return self.table.locator("thead th").all_text_contents()

# Used on many pages that have a table
class ProductListPage:
    def __init__(self, page: Page):
        self.table = DataTable(page, "products-table")

def test_product_table_has_headers(page: Page):
    products_page = ProductListPage(page).navigate()
    headers = products_page.table.header_texts()
    assert "Name" in headers
    assert "Price" in headers
```

---

## Screenplay Pattern

An alternative to POM, from BDD Tool Serenity and the book "BDD in Action". Models users (Actors) performing Tasks and Interactions, and asking Questions.

**Conceptual model:**
- **Actor** — who is performing actions (e.g., Alice, a shopper)
- **Task** — high-level intent (e.g., "Add item to cart")
- **Interaction** — low-level UI action (e.g., "Click button with ID x")
- **Question** — something the actor observes (e.g., "What is the cart total?")

More expressive for complex multi-persona test scenarios. Higher learning curve than POM.

---

## Fixture Management

Fixtures provide test preconditions (test data, browser state, auth tokens) in a reusable, scoped way.

**Playwright fixtures (TypeScript):**
```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

type MyFixtures = {
  loginPage: LoginPage;
  authenticatedPage: DashboardPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await use(loginPage);
  },

  // Log in once; share the session across tests in a spec file
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
    const dashboard = new DashboardPage(page);
    await use(dashboard);
  },
});
```

**pytest fixtures:**
```python
# conftest.py
import pytest
from playwright.sync_api import Page, BrowserContext

@pytest.fixture(scope="session")
def auth_token() -> str:
    import httpx
    response = httpx.post("https://api.example.com/auth/token", json={
        "email": "test@example.com", "password": "testpassword"
    })
    return response.json()["access_token"]

@pytest.fixture
def authenticated_context(context: BrowserContext, auth_token: str) -> BrowserContext:
    context.add_cookies([{
        "name": "auth_token",
        "value": auth_token,
        "domain": "example.com",
        "path": "/"
    }])
    return context
```

---

## Test Data Management

| Pattern | When to use |
|---|---|
| **In-test creation** | Data created in the test, deleted after. Full control. Slow if DB calls are expensive. |
| **Fixture files** (JSON/CSV) | Static data for read-only tests. Fast, but drifts from reality over time. |
| **Factory functions** | Generate realistic objects with sensible defaults. Override only what matters for the test. |
| **Test containers** | Spin up a real DB in CI; each test run gets a clean slate. |
| **Shared staging data** | Risky — tests interfere with each other. Avoid for write operations. |

**Factory pattern (Python, factory-boy):**
```python
import factory
from myapp.models import User, Product

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
    is_active = True

# In test
def test_checkout_updates_order_count():
    user = UserFactory()
    # test uses a unique user with a real email pattern
```

---

## Folder Structure

```
tests/
├── conftest.py                  # shared fixtures
├── pages/                       # page objects
│   ├── __init__.py
│   ├── login_page.py
│   ├── dashboard_page.py
│   └── components/
│       ├── nav_bar.py
│       └── data_table.py
├── e2e/                         # E2E tests
│   ├── test_login.py
│   └── test_checkout.py
├── api/                         # API tests
│   ├── test_products_api.py
│   └── test_orders_api.py
└── helpers/
    ├── auth.py                  # auth utilities
    └── data_builders.py        # test data factories
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Selectors in tests | One change breaks many tests | Page object |
| Hard-coded test data | Tests depend on specific DB state | Factories, per-test setup |
| Test order dependency | Tests break when run in isolation | Independent setup/teardown |
| `time.sleep()` for waits | Flaky; either too fast or too slow | `waitForSelector`, explicit waits |
| Sharing browser state | Earlier test contamination causes failures | Fresh context per test |
| No assertions | Test always passes; useless | Assert specific outcomes |

---

## Common Failure Cases

**Page object stores locators as fields, breaking lazy evaluation**
Why: `self._email = page.get_by_label("Email")` evaluates the locator at construction time in some frameworks; if the page is not yet loaded, the locator resolves against a blank DOM and subsequent interactions fail.
Detect: tests fail with `strict mode violation` or `element not found` on the first action, even though navigation succeeds.
Fix: store the locator expression as a property (lazy getter) or create the locator at the point of use inside each method, not in `__init__`.

**Page objects return `self` and chained calls skip assertions**
Why: fluent method chains like `.navigate().login(...).wait_for_load()` silently return the wrong page type if a method forgets to return the correct object; the next call executes on the prior page object.
Detect: assertions on the returned page object pass vacuously or raise `AttributeError` because the wrong page type is in the chain.
Fix: type-annotate return types on all page object methods and enable mypy/pyright strict mode; mismatched return types become type errors before runtime.

**Session-scoped auth fixture reuses an expired token across tests**
Why: a session-scoped fixture that obtains a JWT at startup keeps the same token for the entire test session; if the session runs longer than the token TTL, later tests receive 401 errors.
Detect: the first N tests pass and then an entire block of auth-dependent tests fails with 401.
Fix: scope the auth fixture to `"module"` or add token expiry checking with automatic refresh inside the fixture.

**Shared staging data causes write-test interference**
Why: multiple tests that write to the same staging environment rows leave dirty state; tests that run concurrently or in different orders read each other's leftovers.
Detect: tests pass in isolation but fail when run in parallel with `-n auto`; failures are non-deterministic.
Fix: use per-test factory-created data with explicit cleanup (yield fixture with teardown), or use testcontainers with a transaction rollback strategy.

## Connections

- [[test-automation/playwright]] — Playwright implementation of page objects
- [[qa/bdd-gherkin]] — step definitions use page objects internally
- [[technical-qa/api-testing]] — API test helper classes follow similar patterns
- [[qa/test-strategy]] — test architecture determines maintainability of the whole suite
- [[qa/qa-tools]] — Serenity BDD for Screenplay pattern tooling
## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?

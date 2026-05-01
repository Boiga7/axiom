---
type: concept
category: qa
para: resource
tags: [bdd, gherkin, cucumber, behaviour-driven-development, acceptance-criteria, qa]
sources: []
updated: 2026-05-01
---

# BDD and Gherkin

Behaviour-Driven Development bridges the gap between business requirements and automated tests. Requirements are written in natural language (Gherkin), then automated using step definitions. The same file serves as documentation, acceptance criteria, and executable specification.

---

## The Three Amigos

BDD starts with a conversation between:
- **Product Owner** — what behaviour is needed and why
- **Developer** — what's technically feasible
- **QA** — what could go wrong and what edge cases exist

They discuss concrete examples before writing a line of code. These examples become the Gherkin scenarios.

---

## Gherkin Syntax

```gherkin
Feature: User login

  As a registered user
  I want to log into my account
  So that I can access my personalised dashboard

  Background:
    Given the database contains user "alice@example.com" with password "Secure123!"

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "alice@example.com" and password "Secure123!"
    And I click the "Log In" button
    Then I should be redirected to the dashboard
    And I should see the greeting "Welcome back, Alice"

  Scenario: Failed login with wrong password
    Given I am on the login page
    When I enter email "alice@example.com" and password "wrongpassword"
    And I click the "Log In" button
    Then I should see the error "Invalid email or password"
    And I should remain on the login page

  Scenario Outline: Account lockout after repeated failures
    Given I am on the login page
    When I fail to log in <attempts> times with wrong passwords
    Then my account should be <status>

    Examples:
      | attempts | status          |
      | 3        | still active    |
      | 5        | locked out      |
      | 6        | locked out      |
```

**Keywords:**
- `Feature` — describes the feature being tested (one per file)
- `Background` — steps that run before each scenario in the file
- `Scenario` — a concrete example (test case)
- `Scenario Outline` — parameterised scenario; data from `Examples` table
- `Given` — precondition / initial state
- `When` — user action or event
- `Then` — expected outcome / assertion
- `And` / `But` — continuation of the previous keyword (avoids repetition)

---

## Step Definitions

Gherkin scenarios are linked to automation code via step definitions. Each step maps to a regex or string pattern.

**Python (pytest-bdd):**

```python
from pytest_bdd import given, when, then, parsers
import pytest

@given(parsers.parse('I am on the login page'))
def navigate_to_login(page):
    page.goto("/login")

@when(parsers.parse('I enter email "{email}" and password "{password}"'))
def enter_credentials(page, email, password):
    page.fill('[data-testid="email"]', email)
    page.fill('[data-testid="password"]', password)

@when('I click the "Log In" button')
def click_login(page):
    page.click('[data-testid="login-btn"]')

@then(parsers.parse('I should be redirected to the dashboard'))
def assert_dashboard(page):
    page.wait_for_url("/dashboard")

@then(parsers.parse('I should see the greeting "{greeting}"'))
def assert_greeting(page, greeting):
    assert page.locator('[data-testid="greeting"]').text_content() == greeting
```

**JavaScript (Cucumber.js):**

```javascript
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('I am on the login page', async function() {
  await this.page.goto('/login');
});

When('I enter email {string} and password {string}', async function(email, password) {
  await this.page.fill('[data-testid="email"]', email);
  await this.page.fill('[data-testid="password"]', password);
});

Then('I should be redirected to the dashboard', async function() {
  await this.page.waitForURL('/dashboard');
});
```

**Java (Cucumber + JUnit 5):**

```java
@Given("I am on the login page")
public void navigateToLogin() {
    driver.get(baseUrl + "/login");
}

@When("I enter email {string} and password {string}")
public void enterCredentials(String email, String password) {
    driver.findElement(By.id("email")).sendKeys(email);
    driver.findElement(By.id("password")).sendKeys(password);
}

@Then("I should see the error {string}")
public void assertErrorMessage(String expected) {
    WebElement error = driver.findElement(By.className("error-message"));
    assertEquals(expected, error.getText());
}
```

---

## File Organisation

```
features/
├── auth/
│   ├── login.feature
│   └── registration.feature
├── checkout/
│   ├── cart.feature
│   └── payment.feature
└── step_definitions/
    ├── auth_steps.py
    └── checkout_steps.py
```

---

## Gherkin Anti-Patterns

**Too many steps / too low level:**
```gherkin
# Bad — describes implementation not behaviour
When I click the email field
And I type "alice@example.com"
And I press Tab
And I click the password field
And I type "Secure123!"
And I click the button with ID "login-submit"

# Good — describes intent
When I log in as "alice@example.com" with password "Secure123!"
```

**Imperative instead of declarative:**
- Imperative: how the user interacts ("click button X", "enter text in field Y")
- Declarative: what the user wants to accomplish ("log in as alice")

Declarative scenarios survive UI refactors; imperative ones break with every design change.

**Shared state between scenarios:**
Each scenario must be independent. Use `Background` only for setup that every scenario genuinely needs. Don't rely on scenario order.

---

## Frameworks

| Language | Framework | Gherkin runner |
|---|---|---|
| Python | pytest-bdd | ✓ |
| Python | behave | ✓ |
| JavaScript | Cucumber.js | ✓ |
| JavaScript | Playwright Test (has BDD plugin) | via plugin |
| Java | Cucumber-JUnit 5 | ✓ |
| Java | JBehave | ✓ |
| C# | SpecFlow | ✓ |
| Ruby | RSpec + Cucumber | ✓ |

---

## BDD in the Development Workflow

1. **Discovery** — Three Amigos session; write scenarios before coding
2. **Formulation** — refine scenarios into Gherkin (precise language matters)
3. **Automation** — step definitions link Gherkin to implementation
4. **Execution** — run in CI on every PR; failing scenario = failing acceptance criterion

Scenarios should run in CI. A failing scenario is equivalent to a failing unit test — the PR cannot merge until the feature matches its acceptance criteria.

---

## Connections

- [[qa/test-strategy]] — BDD sits in Q1 of the testing quadrant (guide development, business-facing)
- [[qa/test-case-design]] — BDD scenarios are a specific format of acceptance test cases
- [[qa/exploratory-testing]] — exploration informs which additional scenarios to add
- [[technical-qa/test-architecture]] — Page Object Model applied to step definitions
- [[test-automation/playwright]] — Playwright executes BDD scenarios for web UI

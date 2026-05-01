---
type: concept
category: technical-qa
para: resource
tags: [cypress, e2e, component-testing, intercepts, automation]
sources: []
updated: 2026-05-01
---

# Cypress

JavaScript E2E and component testing framework. Runs in the browser (not via WebDriver). Direct DOM access, automatic waiting, time-travel debugging, built-in screenshot and video recording.

---

## Cypress vs Playwright

| | Cypress | Playwright |
|--|--|--|
| Language | JavaScript/TypeScript | JS/TS/Python/Java/C# |
| Architecture | In-browser (same JS context) | Out-of-process (CDP) |
| Multi-tab | No (single tab) | Yes |
| Cross-browser | Chrome, Firefox, Edge | Chrome, Firefox, Safari, Edge |
| Component testing | Yes (first-class) | Yes (experimental) |
| Parallel execution | Cypress Cloud (paid) | Built-in sharding |
| Time-travel debugging | Yes (DOM snapshots) | Trace viewer |
| Auto-wait | Yes | Yes |

**Choose Cypress** for teams already invested in JavaScript who want component testing alongside E2E. **Choose Playwright** for multi-browser, multi-language, or Python-based teams.

---

## Basic Test

```javascript
// cypress/e2e/login.cy.js
describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('logs in with valid credentials', () => {
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('Secure123!');
    cy.get('[data-testid="login-btn"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="greeting"]').should('contain', 'Welcome');
  });

  it('shows error with wrong password', () => {
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('wrongpassword');
    cy.get('[data-testid="login-btn"]').click();

    cy.get('[role="alert"]').should('be.visible').and('contain', 'Invalid');
    cy.url().should('include', '/login');
  });
});
```

---

## Network Intercepts

Intercept and stub HTTP requests — removes dependency on the backend for frontend tests.

```javascript
it('shows products from API', () => {
  cy.intercept('GET', '/api/products', {
    statusCode: 200,
    body: [
      { id: 1, name: 'Widget', price: 9.99, inStock: true },
      { id: 2, name: 'Gadget', price: 24.99, inStock: false },
    ],
  }).as('getProducts');

  cy.visit('/products');
  cy.wait('@getProducts');

  cy.get('[data-testid="product-card"]').should('have.length', 2);
  cy.contains('Widget').should('be.visible');
});

it('handles API error gracefully', () => {
  cy.intercept('GET', '/api/products', {
    statusCode: 500,
    body: { error: 'Internal Server Error' },
  });

  cy.visit('/products');
  cy.get('[data-testid="error-message"]').should('contain', 'Failed to load products');
});

// Spy on real requests without stubbing
it('calls correct endpoint', () => {
  cy.intercept('POST', '/api/orders').as('createOrder');
  // ... trigger order creation ...
  cy.wait('@createOrder').its('request.body').should('deep.include', {
    items: [{ productId: 1, quantity: 2 }],
  });
});
```

---

## Custom Commands

Reusable operations — keeps tests DRY.

```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email = 'test@example.com', password = 'testpassword') => {
  // API login — faster than UI login for test setup
  cy.request('POST', '/api/auth/token', { email, password }).then(response => {
    window.localStorage.setItem('auth_token', response.body.access_token);
  });
});

Cypress.Commands.add('createProduct', (overrides = {}) => {
  const defaults = { name: 'Test Product', price: 9.99, category: 'test' };
  return cy.request({
    method: 'POST',
    url: '/api/products',
    body: { ...defaults, ...overrides },
    headers: { Authorization: `Bearer ${window.localStorage.getItem('auth_token')}` },
  }).its('body');
});
```

```javascript
// Using custom commands in tests
describe('Product management', () => {
  beforeEach(() => {
    cy.login();    // fast API login, not UI
  });

  it('displays created product', () => {
    cy.createProduct({ name: 'My New Product' }).then(product => {
      cy.visit(`/products/${product.id}`);
      cy.contains('My New Product').should('be.visible');
    });
  });
});
```

---

## Component Testing

Test React/Vue/Angular components in isolation without a full browser page.

```javascript
// cypress/component/ProductCard.cy.jsx
import { mount } from 'cypress/react18';
import ProductCard from '../../src/components/ProductCard';

describe('ProductCard', () => {
  it('shows out of stock badge when inStock is false', () => {
    mount(<ProductCard
      product={{ id: 1, name: 'Widget', price: 9.99, inStock: false }}
      onAddToCart={cy.stub().as('addToCart')}
    />);

    cy.get('[data-testid="out-of-stock"]').should('be.visible');
    cy.get('[data-testid="add-to-cart"]').should('be.disabled');
  });

  it('calls onAddToCart when button clicked', () => {
    mount(<ProductCard
      product={{ id: 1, name: 'Widget', price: 9.99, inStock: true }}
      onAddToCart={cy.stub().as('addToCart')}
    />);

    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('@addToCart').should('have.been.calledOnceWith', 1);
  });
});
```

---

## Configuration

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    retries: { runMode: 2, openMode: 0 },   // retry flaky tests in CI
    video: true,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      // tasks, plugins
    },
  },
  component: {
    devServer: { framework: 'react', bundler: 'webpack' },
  },
});
```

---

## CI Integration

```yaml
- name: Run Cypress E2E
  uses: cypress-io/github-action@v6
  with:
    build: npm run build
    start: npm start
    wait-on: 'http://localhost:3000'
    browser: chrome

- name: Upload Cypress artifacts
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: cypress-artifacts
    path: |
      cypress/screenshots/
      cypress/videos/
```

---

## Connections
[[tqa-hub]] · [[technical-qa/test-architecture]] · [[technical-qa/flaky-test-management]] · [[qa/bdd-gherkin]] · [[cloud/github-actions]]

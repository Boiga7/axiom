---
type: concept
category: technical-qa
para: resource
tags: [playwright, advanced, fixtures, api-testing, tracing, codegen]
sources: []
updated: 2026-05-01
---

# Playwright Advanced

Advanced Playwright patterns beyond basic locators and clicks: custom fixtures, API testing, tracing, code generation, CI optimisation, and the Healer agent for self-healing selectors.

---

## Custom Fixtures

```typescript
// tests/fixtures.ts
import { test as base, expect } from '@playwright/test';

type MyFixtures = {
  authenticatedPage: Page;
  apiContext: APIRequestContext;
};

export const test = base.extend<MyFixtures>({
  // Authenticated page — logs in via API (fast) before each test
  authenticatedPage: async ({ page, request }, use) => {
    const response = await request.post('/api/auth/token', {
      data: { email: 'test@example.com', password: 'testpass' },
    });
    const { access_token } = await response.json();

    await page.context().addCookies([{
      name: 'auth_token',
      value: access_token,
      domain: 'localhost',
      path: '/',
    }]);

    await use(page);
  },

  // Shared API client for setup/teardown
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: {
        Authorization: `Bearer ${process.env.TEST_API_TOKEN}`,
      },
    });
    await use(context);
    await context.dispose();
  },
});

export { expect };
```

```typescript
// tests/dashboard.spec.ts — using custom fixtures
import { test, expect } from './fixtures';

test('shows personalised greeting', async ({ authenticatedPage: page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
});
```

---

## API Testing in Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Products API', () => {
  test('GET /api/products returns paginated list', async ({ request }) => {
    const response = await request.get('/api/products?page=1&pageSize=10');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(10);
    expect(body.pagination.totalItems).toBeGreaterThan(0);
    expect(body.pagination.nextCursor).toBeDefined();
  });

  test('POST /api/products creates a product', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: { name: 'New Widget', price: 29.99, category: 'electronics' },
      headers: { Authorization: `Bearer ${process.env.TEST_API_TOKEN}` },
    });

    expect(response.status()).toBe(201);
    const product = await response.json();
    expect(product.data.id).toBeDefined();
    expect(product.data.name).toBe('New Widget');
  });

  test('returns 422 for invalid price', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: { name: 'Bad Product', price: -10 },
      headers: { Authorization: `Bearer ${process.env.TEST_API_TOKEN}` },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field: 'price' })
    );
  });
});
```

---

## Network Interception

```typescript
// Intercept and mock network calls
test('shows error state when API fails', async ({ page }) => {
  await page.route('/api/products', route => route.fulfill({
    status: 500,
    json: { error: 'Internal Server Error' },
  }));

  await page.goto('/products');
  await expect(page.getByTestId('error-message')).toBeVisible();
});

// Spy on requests without stubbing
test('sends correct payload on checkout', async ({ page }) => {
  let orderPayload: unknown;
  await page.route('/api/orders', async route => {
    orderPayload = JSON.parse(route.request().postData() ?? '{}');
    await route.continue();
  });

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place Order' }).click();
  await page.waitForResponse('/api/orders');

  expect(orderPayload).toMatchObject({ items: expect.any(Array) });
});
```

---

## Tracing

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',   // capture full trace on retry (flaky test diagnosis)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

```bash
# View trace for a failed test
npx playwright show-trace test-results/my-test/trace.zip

# Trace viewer shows: timeline, DOM snapshots, network calls, console
```

---

## Codegen — Record Tests

```bash
# Start browser and record interactions as Playwright code
npx playwright codegen http://localhost:3000

# Generate in Python
npx playwright codegen --target python http://localhost:3000

# Record into a file
npx playwright codegen --output tests/recorded.spec.ts http://localhost:3000
```

Codegen produces a starting point — always refactor to use data-testid locators and explicit waits.

---

## Playwright Healer (v1.56+)

The Healer MCP integration auto-repairs broken locators using AI. When a test fails because a selector is stale, Healer:
1. Takes a screenshot of the failing step
2. Uses Claude to identify the correct new selector
3. Opens a PR with the fix
4. 75% first-attempt success rate

```typescript
// healer.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Enable Healer in CI
    healer: process.env.CI ? 'autofix' : 'off',
  },
});
```

---

## Parallel Execution and Sharding

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : undefined,  // 4 parallel workers in CI
  fullyParallel: true,                       // run tests within a file in parallel
});
```

```bash
# Shard across multiple CI machines
# Machine 1
npx playwright test --shard=1/3

# Machine 2
npx playwright test --shard=2/3

# Machine 3
npx playwright test --shard=3/3

# Merge reports
npx playwright merge-reports --reporter html ./all-blob-reports
```

---

## Connections
[[tqa-hub]] · [[technical-qa/visual-testing]] · [[technical-qa/test-architecture]] · [[technical-qa/flaky-test-management]] · [[qa/cross-browser-testing]] · [[test-automation/playwright]] · [[llms/ae-hub]]

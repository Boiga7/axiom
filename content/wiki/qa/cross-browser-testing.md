---
type: concept
category: qa
para: resource
tags: [cross-browser, playwright, browserstack, lambdatest, compatibility]
sources: []
updated: 2026-05-01
---

# Cross-Browser Testing

Verifying an application works correctly across different browsers, versions, operating systems, and screen sizes. Browser differences affect JavaScript APIs, CSS rendering, font metrics, and input handling.

---

## Browser Coverage Strategy

You cannot test every combination. Use analytics to prioritise:

```
Check your production analytics for browser share, then cover:
  Chrome (latest) — typically 60-70% of users
  Safari (latest) — iOS + macOS; non-negotiable if you have mobile traffic
  Firefox (latest) — often behaves differently on CSS grid, fonts
  Edge (latest) — Chromium-based; catches IE-legacy users

Legacy coverage:
  Safari -1 major version — Apple updates are slow to deploy
  Chrome -1 major version — enterprise users pin versions
  iOS Safari — different engine than desktop Safari on iOS < 14.3
```

---

## Playwright Multi-Browser

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
    // Responsive sizes
    {
      name: 'tablet',
      use: { viewport: { width: 768, height: 1024 }, ...devices['Desktop Chrome'] },
    },
  ],
  // Only run cross-browser on CI, not in local dev
  grep: process.env.CI ? undefined : /@smoke/,
});
```

```bash
# Run specific browser
npx playwright test --project=webkit

# Run all browsers in parallel
npx playwright test

# Headed mode for debugging
npx playwright test --headed --project=chromium
```

---

## BrowserStack Automate

Run Playwright/Selenium tests on real browsers in the cloud (2,000+ browser/OS combos).

```typescript
// playwright-browserstack.config.ts
export default defineConfig({
  projects: [
    {
      name: 'bs-chrome-win',
      use: {
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            browser: 'chrome',
            browser_version: 'latest',
            os: 'Windows',
            os_version: '11',
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
            'browserstack.debug': true,
            'browserstack.networkLogs': true,
            name: 'Cross-browser regression',
            build: `CI-${process.env.GITHUB_RUN_NUMBER}`,
          }))}`,
        },
      },
    },
    {
      name: 'bs-safari-mac',
      use: {
        connectOptions: {
          wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify({
            browser: 'safari',
            browser_version: 'latest',
            os: 'OS X',
            os_version: 'Sonoma',
            'browserstack.username': process.env.BROWSERSTACK_USERNAME,
            'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
          }))}`,
        },
      },
    },
  ],
});
```

---

## CI Strategy — When to Run Cross-Browser

```yaml
# .github/workflows/cross-browser.yaml
name: Cross-browser Tests

on:
  schedule:
  - cron: '0 2 * * *'   # nightly, not on every PR
  push:
    branches: [main]      # on merge to main

jobs:
  cross-browser:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false    # continue other browsers if one fails
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npx playwright install --with-deps ${{ matrix.browser }}
    - run: npx playwright test --project=${{ matrix.browser }} --reporter=html
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report-${{ matrix.browser }}
        path: playwright-report/
```

---

## Common Cross-Browser Issues

| Issue | Browsers | Fix |
|---|---|---|
| CSS Grid gap | Safari < 12 | Use `grid-gap` (not `gap`) or polyfill |
| `position: sticky` | IE, some Firefox | Fallback or JS scroll listener |
| `aspect-ratio` property | Safari < 15 | padding-top hack fallback |
| `ResizeObserver` | IE | Polyfill |
| Date formatting | Safari (strict ISO8601 only) | Use `date-fns` not `new Date(str)` |
| `scrollIntoView` options | Safari | Polyfill or manual scroll |
| CSS `clamp()` | IE | Media query fallback |
| Input `type=date` | Safari (no native picker) | Provide a custom date picker |

---

## Visual Cross-Browser Diffing

```typescript
// visual regression across browsers
test('homepage renders consistently', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot(`homepage-${browserName}.png`, {
    maxDiffPixelRatio: 0.03,    // allow 3% pixel difference (anti-aliasing varies by browser)
    threshold: 0.2,              // per-pixel colour threshold
  });
});
```

---

## Connections
[[qa-hub]] · [[qa/accessibility-testing]] · [[qa/regression-testing]] · [[technical-qa/playwright-advanced]] · [[technical-qa/visual-testing]] · [[technical-qa/cypress]]

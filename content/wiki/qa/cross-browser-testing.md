---
type: concept
category: qa
para: resource
tags: [cross-browser, playwright, browserstack, lambdatest, compatibility]
sources: []
updated: 2026-05-01
tldr: Verifying an application works correctly across different browsers, versions, operating systems, and screen sizes.
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

## Common Failure Cases

**Running cross-browser tests on every PR and slowing CI to a crawl**
Why: full cross-browser matrix on every PR adds 20-40 minutes to feedback time, causing developers to ignore or override failures rather than fix them.
Detect: PR pipeline duration is consistently above 20 minutes; developers comment "just merge, it's probably a browser flake."
Fix: run Chromium only on PRs; run the full browser matrix only on merge to main and nightly; use path filters to trigger cross-browser for CSS and layout changes.

**Testing only on the latest browser version and missing enterprise pinned versions**
Why: enterprise users often run Chrome -2 or Safari -1; features using newer CSS or JavaScript APIs (optional chaining, `aspect-ratio`, `gap`) silently fail on older versions.
Detect: production support tickets cite browser versions not covered by the test matrix, or the analytics dashboard shows a browser version with a significantly higher error rate.
Fix: include at least one previous major version for Chrome and Safari in the test matrix; check production analytics to identify the oldest version with meaningful share.

**Visual regression thresholds set to 0% difference**
Why: anti-aliasing, font hinting, and sub-pixel rendering vary across browsers and operating systems, causing pixel-perfect comparisons to fail on every cross-browser run even when the UI is correct.
Detect: visual regression tests fail on every webkit run with sub-1% pixel differences that are invisible to the human eye.
Fix: set `maxDiffPixelRatio` to 0.02-0.03 (2-3%) per browser to account for rendering differences; reserve stricter thresholds for layout-critical components only.

**Treating `fail-fast: false` in the CI matrix as optional**
Why: without `fail-fast: false`, a failure in one browser cancels all other browser jobs, leaving the team without a complete cross-browser picture and blocking fixes that only affect one browser.
Detect: CI matrix jobs are cancelled when one browser fails, leaving gaps in the failure report.
Fix: always set `fail-fast: false` in cross-browser matrix strategies so all browsers run to completion and the full impact is visible in a single run.

## Connections
[[qa-hub]] · [[qa/accessibility-testing]] · [[qa/regression-testing]] · [[technical-qa/playwright-advanced]] · [[technical-qa/visual-testing]] · [[technical-qa/cypress]]

---
type: concept
category: technical-qa
para: resource
tags: [visual-testing, percy, applitools, playwright, screenshots, regression]
sources: []
updated: 2026-05-01
tldr: Automated comparison of UI screenshots against approved baselines to catch unintended visual regressions.
---

# Visual Testing

Automated comparison of UI screenshots against approved baselines to catch unintended visual regressions. Complements functional tests. You can test that a button is clickable without testing that it looks correct.

---

## Why Visual Testing

```
Functional tests verify behaviour: "button exists and is clickable"
Visual tests verify appearance: "button is the right colour, size, and position"

Visual regressions happen when:
  - CSS change unintentionally shifts layout
  - Font loading changes text reflow
  - Z-index change hides an element under another
  - Dark mode styling breaks
  - Responsive breakpoints misfire
```

---

## Playwright Screenshot Testing

Built-in, no extra setup. Baseline images stored in the repo.

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual regression', () => {
  test('homepage matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,    // 2% pixel difference allowed (anti-aliasing)
      threshold: 0.2,              // per-pixel colour threshold 0-1
      animations: 'disabled',      // disable CSS animations for stable captures
    });
  });

  test('product card component', async ({ page }) => {
    await page.goto('/products/1');

    const card = page.locator('[data-testid="product-card"]').first();
    await expect(card).toHaveScreenshot('product-card.png');
  });

  test('mobile homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
```

```bash
# First run — generate baselines
npx playwright test tests/visual/ --update-snapshots

# Subsequent runs — compare against baseline
npx playwright test tests/visual/

# Update specific snapshot
npx playwright test --update-snapshots --grep "homepage"

# View diff report when tests fail
npx playwright show-report
```

---

## Percy (BrowserStack Visual Testing)

Cloud service with AI-powered comparison. Renders snapshots across multiple browsers/resolutions simultaneously.

```typescript
// playwright + Percy
import { percySnapshot } from '@percy/playwright';
import { test } from '@playwright/test';

test('checkout page visual snapshot', async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  await percySnapshot(page, 'Checkout Page', {
    widths: [375, 768, 1280],  // capture at multiple widths
    enableJavaScript: true,
  });
});
```

```bash
# Run with Percy token
PERCY_TOKEN=your_token npx playwright test tests/visual/

# Percy compares against approved baseline, flags regressions in its UI
# Engineers approve or reject each diff in the Percy dashboard
```

---

## Applitools Eyes

```python
# Python + Playwright + Applitools
from applitools.playwright import Eyes, Target

def test_product_page_visual(page):
    eyes = Eyes()
    eyes.api_key = os.environ["APPLITOOLS_API_KEY"]

    try:
        eyes.open(page, "MyApp", "Product Page", {"width": 1280, "height": 800})
        page.goto("/products/1")
        eyes.check(Target.window().fully())
        eyes.close()
    except Exception:
        eyes.abort()
        raise
```

Applitools uses AI to ignore irrelevant diffs (dynamic dates, adverts) while catching layout regressions.

---

## Component-Level Visual Testing (Storybook + Chromatic)

For component libraries:

```yaml
# .github/workflows/chromatic.yaml
- name: Publish to Chromatic
  uses: chromaui/action@v1
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    exitOnceUploaded: true   # non-blocking in CI; review in Chromatic UI
```

Chromatic automatically diffs each Storybook story against the previous approved baseline. Reviewers approve/reject in the Chromatic UI before merging.

---

## When Visual Tests Fail

```bash
# Playwright — view interactive diff report
npx playwright show-report

# Update baselines after intentional UI changes
npx playwright test --update-snapshots

# Commit updated baselines (must be intentional, not reflexive)
git add tests/visual/**/*.png
git commit -m "chore: update visual baselines after brand refresh"
```

Policy: never auto-update snapshots in CI without human review. Baseline updates should require PR approval from a designer or QA lead.

---

## Masking Dynamic Content

```typescript
// Mask dynamic elements before screenshot (timestamps, user IDs, ads)
await page.goto('/dashboard');

await expect(page).toHaveScreenshot('dashboard.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
    page.locator('.ad-container'),
  ],
  maskColor: '#ff00ff',  // magenta placeholder colour (visible in diff)
});
```

---

## Common Failure Cases

**Baselines generated on macOS differ from CI Linux renders, causing permanent failures**
Why: font rendering, anti-aliasing, and sub-pixel hinting differ between macOS and Linux; a baseline committed from a developer machine will always fail on a Linux CI runner even with `maxDiffPixelRatio: 0.02`.
Detect: visual tests pass locally but always fail in CI with small pixel differences concentrated around text edges.
Fix: generate and commit baselines only inside CI (run `--update-snapshots` in a dedicated CI job) and never commit locally-generated baselines; use Docker to ensure the local render environment matches CI.

**CSS animations cause non-deterministic screenshots**
Why: screenshots captured mid-animation differ from those captured at rest; even `animations: 'disabled'` in Playwright does not stop JavaScript-driven animations or third-party libraries that use `requestAnimationFrame` directly.
Detect: intermittent pixel diffs always in the same region of the page (e.g., a loading spinner, a carousel); failures are not reproducible on re-run.
Fix: add a `waitForLoadState('networkidle')` plus an explicit wait for animation-completion attributes (e.g., `page.wait_for_selector('[data-animation-done]')`), or use `page.evaluate("document.getAnimations().forEach(a => a.finish()")` to force all animations to completion.

**`--update-snapshots` committed reflexively in CI, masking real regressions**
Why: developers update snapshots to fix a failing build without reviewing the visual diff; a genuine regression (e.g., broken layout) is approved and the new broken state becomes the baseline.
Detect: baseline images change in a PR but no corresponding UI change was made; the diff shows significant structural layout changes.
Fix: enforce a policy where snapshot updates require a separate PR with mandatory design/QA review; never run `--update-snapshots` in the main CI gate.

**Dynamic content not masked produces false-positive failures on every run**
Why: timestamps, user avatars, session IDs, and ad slots change between runs; without masking, every screenshot differs from the baseline.
Detect: visual tests fail on every PR regardless of code changes; the diff always shows the same dynamic region.
Fix: identify all dynamic regions with `data-testid` attributes and add them to the `mask` array in `toHaveScreenshot`; verify the masked regions are covered by functional tests elsewhere.

## Connections
[[tqa-hub]] · [[technical-qa/playwright-advanced]] · [[technical-qa/cypress]] · [[qa/cross-browser-testing]] · [[qa/regression-testing]] · [[qa/accessibility-testing]]

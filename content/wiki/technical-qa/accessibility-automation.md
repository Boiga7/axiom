---
type: concept
category: technical-qa
para: resource
tags: [accessibility, wcag, axe-core, aria, screen-reader, automated-a11y]
sources: []
updated: 2026-05-01
---

# Accessibility Automation

Automated accessibility testing using axe-core and Playwright. Automation catches ~30-40% of WCAG issues; the rest require manual testing and lived experience. Both are required.

---

## What Automation Can and Cannot Catch

```
Can automate (rules-based checks):
  ✓ Images without alt text
  ✓ Form inputs without labels
  ✓ Insufficient colour contrast (3:1 / 4.5:1 ratios)
  ✓ Missing document language
  ✓ Duplicate IDs
  ✓ Missing landmark regions (header, nav, main, footer)
  ✓ Skip navigation links
  ✓ Buttons without accessible names
  ✓ Links with identical text but different destinations

Cannot automate (requires judgement):
  ✗ Alt text quality ("image.jpg" vs meaningful description)
  ✗ Heading hierarchy makes sense for the content
  ✗ Focus order is logical
  ✗ Screen reader announcements are clear in context
  ✗ Cognitive load / reading level
  ✗ Touch target size in context
```

---

## Playwright + axe-core

```typescript
// tests/accessibility/test_axe.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('product listing page has no critical violations', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('.third-party-widget')   // exclude known third-party issues
      .analyze();

    // Only fail on serious/critical violations
    const critical = results.violations.filter(v =>
      ['critical', 'serious'].includes(v.impact)
    );

    expect(critical).toEqual([]);
  });

  test('checkout flow has no violations at any step', async ({ page }) => {
    // Step 1: Cart
    await page.goto('/cart');
    let results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);

    // Step 2: Address
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);

    // Step 3: Payment
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);
  });

  test('violation details are captured for the report', async ({ page }) => {
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    // Log all violations for review (don't fail on minor ones)
    if (results.violations.length > 0) {
      console.log('\nAccessibility violations found:');
      results.violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.description}`);
        console.log(`    Rule: ${v.id}`);
        console.log(`    Elements: ${v.nodes.map(n => n.target.join(', ')).join(' | ')}`);
      });
    }
  });
});
```

---

## Python + Playwright + axe-core

```python
# tests/accessibility/test_a11y.py
import pytest
from playwright.sync_api import Page
import json

@pytest.fixture
def axe_inject(page: Page):
    """Inject axe-core and expose scan function."""
    page.add_script_tag(url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js")
    def scan(tags=None):
        result = page.evaluate("""
            (tags) => axe.run({
                runOnly: tags ? { type: 'tag', values: tags } : undefined
            })
        """, tags or ['wcag2aa'])
        return result
    return scan

def test_homepage_wcag2aa(page: Page, axe_inject):
    page.goto("/")
    results = axe_inject(['wcag2a', 'wcag2aa'])
    critical = [v for v in results['violations'] if v['impact'] in ('critical', 'serious')]
    assert not critical, format_violations(critical)

def format_violations(violations: list) -> str:
    lines = [f"\n{len(violations)} accessibility violation(s) found:"]
    for v in violations:
        lines.append(f"\n  [{v['impact'].upper()}] {v['description']}")
        lines.append(f"  Rule: {v['id']} | Help: {v['helpUrl']}")
        for node in v['nodes'][:3]:
            lines.append(f"  Element: {node['target']}")
            lines.append(f"  Fix: {node['failureSummary']}")
    return "\n".join(lines)
```

---

## ARIA Patterns — Common Fixes

```html
<!-- Missing button label -->
<!-- Bad -->
<button onclick="close()"><svg>...</svg></button>

<!-- Good -->
<button onclick="close()" aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>

<!-- Form input without label -->
<!-- Bad -->
<input type="email" placeholder="Email address">

<!-- Good -->
<label for="email">Email address</label>
<input type="email" id="email" placeholder="name@example.com">
<!-- OR -->
<input type="email" aria-label="Email address">

<!-- Dynamic content not announced to screen readers -->
<!-- Bad -->
<div id="status"></div>

<!-- Good -->
<div id="status" role="status" aria-live="polite"></div>
<!-- role="alert" for urgent messages (aria-live="assertive") -->

<!-- Tab panel -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">Orders</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2">Returns</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>
```

---

## Keyboard Navigation Tests

```python
def test_modal_keyboard_trap(page: Page):
    """Modal must trap focus — tabbing should not leave the modal."""
    page.goto("/products")
    page.get_by_role("button", name="Quick view").first.click()
    page.wait_for_selector('[role="dialog"]')

    # Tab through all focusable elements in modal
    modal_elements = page.locator('[role="dialog"] :is(a, button, input, select, textarea, [tabindex="0"])')
    count = modal_elements.count()

    page.keyboard.press("Tab")
    for _ in range(count + 1):
        focused = page.evaluate("document.activeElement")
        # Focus must remain inside modal
        is_in_modal = page.evaluate("""
            () => document.querySelector('[role="dialog"]').contains(document.activeElement)
        """)
        assert is_in_modal, "Focus escaped the modal"
        page.keyboard.press("Tab")

def test_escape_closes_modal(page: Page):
    page.goto("/products")
    page.get_by_role("button", name="Quick view").first.click()
    page.wait_for_selector('[role="dialog"]')
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).not_to_be_visible()
```

---

## CI Integration

```yaml
# .github/workflows/a11y.yaml
- name: Accessibility tests
  run: npx playwright test tests/accessibility/ --reporter=html

- name: Upload a11y report
  uses: actions/upload-artifact@v4
  with:
    name: a11y-report
    path: playwright-report/
    retention-days: 30
```

---

## Connections
[[tqa-hub]] · [[qa/accessibility-testing]] · [[technical-qa/playwright-advanced]] · [[qa/compliance-testing]] · [[technical-qa/visual-testing]] · [[qa/ci-cd-quality-gates]]

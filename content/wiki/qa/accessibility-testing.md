---
type: concept
category: qa
para: resource
tags: [accessibility, wcag, a11y, axe, screen-reader, qa]
sources: []
updated: 2026-05-01
tldr: Verifying that a product can be used by people with disabilities. Legal requirement in many jurisdictions (EU EAA, UK Equality Act, US Section 508, ADA).
---

# Accessibility Testing

Verifying that a product can be used by people with disabilities. Legal requirement in many jurisdictions (EU EAA, UK Equality Act, US Section 508, ADA). Poor accessibility excludes ~15% of the global population.

---

## WCAG Standards

Web Content Accessibility Guidelines. Current standard: WCAG 2.2. Three conformance levels:

| Level | Meaning | Legal bar |
|---|---|---|
| A | Minimum | Insufficient for most legal requirements |
| AA | Standard | Required by EU EAA, Section 508, most regulations |
| AAA | Enhanced | Best practice; not required |

**Four principles (POUR):**
- **Perceivable** — content must be presentable in ways users can perceive (alt text, captions, sufficient contrast)
- **Operable** — all functionality must be operable via keyboard and assistive technology
- **Understandable** — content and UI must be understandable (error messages, labels, language)
- **Robust** — content must be interpretable by a wide range of assistive technologies

---

## Common Failures (WCAG AA)

| Failure | WCAG Criterion | Fix |
|---|---|---|
| Images without alt text | 1.1.1 | Add `alt="descriptive text"` or `alt=""` for decorative |
| Colour alone conveys meaning | 1.4.1 | Add shape, text, or pattern alongside colour |
| Contrast ratio < 4.5:1 (text) | 1.4.3 | Use a contrast checker; dark on light |
| No keyboard navigation | 2.1.1 | All interactive elements keyboard-reachable |
| Missing focus indicator | 2.4.7 | Never `outline: none` without replacement |
| Form inputs without labels | 1.3.1 | `<label for>` or `aria-label` |
| Auto-playing audio/video | 1.4.2 | Require user action to play |
| No skip navigation | 2.4.1 | "Skip to main content" link |
| Error not described | 3.3.1 | Error message identifies the field and explains the fix |

---

## Automated Testing with axe-core

axe-core (Deque) is the industry-standard engine. Catches ~40% of WCAG issues automatically.

**In Playwright (TypeScript):**
```typescript
import { checkA11y, injectAxe } from 'axe-playwright';
import { test, expect } from '@playwright/test';

test('homepage has no WCAG AA violations', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, undefined, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    detailedReport: true,
  });
});

test('form page is accessible', async ({ page }) => {
  await page.goto('/contact');
  await injectAxe(page);
  await checkA11y(page, '#contact-form', {
    // Check only the form component
    runOnly: { type: 'tag', values: ['wcag2aa'] },
  });
});
```

**In pytest + Playwright (Python):**
```python
from axe_playwright_python.sync_playwright import Axe

def test_homepage_accessibility(page):
    page.goto("/")
    axe = Axe()
    results = axe.run(page)
    violations = results["violations"]
    assert len(violations) == 0, \
        f"Accessibility violations found:\n" + \
        "\n".join(f"- {v['id']}: {v['description']}" for v in violations)
```

**axe DevTools browser extension:** Run on any page in Chrome/Firefox. Shows violations with impact level (Critical/Serious/Moderate/Minor) and links to fix documentation.

---

## Manual Testing with Screen Readers

Automated tools miss ~60% of accessibility issues. Manual testing with assistive technology is essential.

**Screen readers:**
- **NVDA** (Windows, free) — most widely used by blind users on Windows
- **JAWS** (Windows, paid) — enterprise standard
- **VoiceOver** (macOS/iOS, built-in) — primary for Apple devices
- **TalkBack** (Android, built-in) — primary for Android mobile

**Keyboard testing checklist:**
- [ ] Tab through every interactive element — does focus order make sense?
- [ ] All buttons/links activatable with Enter or Space
- [ ] Modals/drawers trap focus inside and return focus on close
- [ ] Dropdowns, date pickers navigable with arrow keys
- [ ] Escape closes overlays
- [ ] Skip navigation link visible on first Tab press

**Screen reader testing checklist:**
- [ ] Page title announced
- [ ] Heading hierarchy makes sense (H1 → H2 → H3)
- [ ] Images have meaningful alt text
- [ ] Form labels read correctly before input
- [ ] Error messages announced when form validates
- [ ] Dynamic content changes announced (ARIA live regions)

---

## ARIA

Accessible Rich Internet Applications. HTML attributes for communicating semantics to assistive technology.

```html
<!-- Button that doesn't look like a button -->
<div role="button" tabindex="0" aria-label="Close dialog"
     onclick="closeDialog()" onkeydown="handleKey(event)">
  ×
</div>

<!-- Loading state -->
<div aria-live="polite" aria-busy="true">
  Loading results...
</div>

<!-- Error message linked to input -->
<input id="email" aria-describedby="email-error" aria-invalid="true">
<span id="email-error" role="alert">
  Please enter a valid email address
</span>

<!-- Modal dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
</div>
```

Rule: use native HTML elements first (button, input, select). Add ARIA only when native elements aren't sufficient.

---

## Colour Contrast

WCAG AA requires:
- Normal text (<18pt): 4.5:1 contrast ratio
- Large text (≥18pt or bold ≥14pt): 3:1
- UI components and focus indicators: 3:1

Tools:
- **Colour Contrast Analyser** (desktop app, TPGi) — pick colours from screen
- **WebAIM Contrast Checker** — enter hex codes online
- **Chrome DevTools** — CSS overview shows contrast failures

```javascript
// Automated contrast check in Playwright
const computedStyle = await page.evaluate(() => {
  const el = document.querySelector('.primary-text');
  return window.getComputedStyle(el);
});
// Then calculate contrast ratio programmatically
```

---

## Accessibility in CI

Run axe on every PR:
```yaml
# GitHub Actions
- name: Accessibility scan
  run: npx playwright test tests/accessibility/ --reporter=html
- name: Upload accessibility report
  uses: actions/upload-artifact@v4
  with:
    name: a11y-report
    path: playwright-report/
```

Set a policy: zero new Critical/Serious violations merged on any PR.

---

## Common Failure Cases

**Treating axe-core as a complete accessibility audit**
Why: automated tools catch ~40% of WCAG issues; the remaining 60% require manual verification with screen readers and keyboard navigation.
Detect: accessibility sign-off exists but no screen reader or keyboard testing is documented in the test plan.
Fix: add a mandatory manual testing checklist (keyboard nav + NVDA/VoiceOver) as part of the Definition of Done for every UI story.

**Running axe only on the page root instead of dynamic states**
Why: axe scans the DOM as it exists at scan time — modals, error messages, and expanded dropdowns are untested if they haven't been triggered.
Detect: axe passes but screen reader users report unlabelled dialogs or inaccessible error states.
Fix: trigger each interactive state (open modal, submit invalid form, expand accordion) before calling `checkA11y`.

**Suppressing violations with global axe rules disabled**
Why: developers silence noisy violations by disabling entire rules rather than fixing the underlying issue, leaving real failures hidden.
Detect: axe config contains a `disableRules` list with more than one or two entries.
Fix: review each disabled rule; fix the underlying HTML rather than suppressing it, or add a tracked exception with a linked ticket.

**Testing only Chrome when Safari has distinct accessibility behaviour**
Why: VoiceOver on macOS/iOS interacts differently with ARIA roles compared to NVDA on Windows; a page that works in Chrome may be unusable with VoiceOver.
Detect: accessibility tests pass in Chromium but no testing is done with Safari + VoiceOver.
Fix: include at least one manual VoiceOver session on macOS per release cycle for high-traffic flows.

**Using ARIA attributes on the wrong element type**
Why: adding `role="button"` to a `<div>` requires manually adding `tabindex`, keyboard handlers, and focus management — omitting any one breaks the contract.
Detect: screen readers announce elements as interactive but they cannot be activated with keyboard or do not receive focus.
Fix: use native `<button>` elements; add ARIA only when no native HTML element fits, and verify the full keyboard contract is implemented.

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/qa-tools]] · [[technical-qa/test-architecture]] · [[test-automation/playwright]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

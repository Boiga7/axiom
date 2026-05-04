---
type: concept
category: test-automation
tags: [playwright, e2e, testing, browser-automation, healer, locators, mcp]
sources: []
updated: 2026-04-29
para: resource
tldr: Playwright is the modern E2E choice over Selenium — role-based locators, built-in auto-wait, trace viewer, and the v1.56 Healer agent (75% success rate for broken selectors) that auto-PRs fixes; also ships an official MCP server for agent web browsing.
---

# Playwright

> **TL;DR** Playwright is the modern E2E choice over Selenium — role-based locators, built-in auto-wait, trace viewer, and the v1.56 Healer agent (75% success rate for broken selectors) that auto-PRs fixes; also ships an official MCP server for agent web browsing.

Microsoft's browser automation and E2E testing framework. Best-in-class locator strategy, trace viewer, and (since v1.56) built-in AI-powered Healer agent for self-healing tests.

---

## Why Playwright over Selenium

| Aspect | Playwright | Selenium |
|---|---|---|
| Auto-wait | Yes — waits for element to be actionable | Manual waits required |
| Isolation | New browser context per test (no state leak) | Shared by default |
| Parallelism | Built-in (workers) | External configuration |
| Tracing | Built-in trace viewer | No equivalent |
| API | Modern, async-first | Legacy |
| Healer | v1.56+ native | No |
| MCP | Official MCP server | No |

---

## Locator Strategy (Role-Based First)

Bad locators are the #1 cause of flaky tests. Priority order:

```python
# 1. Role + name (best — reflects what users see)
page.get_by_role("button", name="Submit")
page.get_by_role("heading", name="Results")

# 2. Label (for form inputs)
page.get_by_label("Email address")

# 3. Placeholder
page.get_by_placeholder("Search...")

# 4. Text
page.get_by_text("Submit your report")

# 5. Test ID (explicit, stable, but requires HTML changes)
page.get_by_test_id("submit-button")

# Avoid (fragile):
page.locator("div.btn-primary > span")  # CSS
page.locator("//button[contains(@class,'submit')]")  # XPath
```

Role-based locators mirror the accessibility tree. They survive visual redesigns and work with screen readers. Two benefits in one.

---

## Healer Agent (v1.56+)

Playwright's native self-healing agent. When a test fails due to a broken locator:

1. Healer analyses the DOM and the failed locator
2. Finds the most likely matching element using an LLM
3. Proposes a fixed locator
4. Optionally opens a pull request with the fix

```typescript
// playwright.config.ts
export default defineConfig({
    use: {
        healer: {
            enabled: true,
            openPullRequest: true,  // auto-PR on fix
        }
    }
});
```

**Success rate:** ~75% for locator failures (broken CSS/XPath). Does not fix logic failures or missing features.

This is why mcpindex's flakefix concept was dropped. Playwright shipped the core value prop natively.

---

## Writing Tests (TypeScript)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Chat interface", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/chat");
    });

    test("sends a message and receives a response", async ({ page }) => {
        const input = page.getByRole("textbox", { name: "Message" });
        const sendButton = page.getByRole("button", { name: "Send" });

        await input.fill("What is 2+2?");
        await sendButton.click();

        // Wait for streaming response to complete
        await expect(page.getByRole("article").last()).toContainText("4", { timeout: 10000 });
    });

    test("shows loading state while waiting", async ({ page }) => {
        await page.getByRole("textbox").fill("Hello");
        await page.getByRole("button", { name: "Send" }).click();
        
        await expect(page.getByTestId("loading-indicator")).toBeVisible();
        await expect(page.getByTestId("loading-indicator")).toBeHidden({ timeout: 15000 });
    });
});
```

---

## Python API

```python
from playwright.sync_api import sync_playwright, expect

def test_chat(page):
    page.goto("http://localhost:3000/chat")
    page.get_by_role("textbox").fill("Hello")
    page.get_by_role("button", name="Send").click()
    expect(page.get_by_role("article").last()).to_contain_text("Hello", timeout=10000)
```

**Async (for use with pytest-asyncio):**
```python
import pytest
from playwright.async_api import async_playwright, expect

@pytest.mark.asyncio
async def test_chat():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:3000")
        # ...
```

---

## Network Mocking

Intercept and mock API calls in tests. Don't hit real LLM APIs in E2E tests (slow, expensive, non-deterministic):

```typescript
test("handles API error gracefully", async ({ page }) => {
    await page.route("**/api/chat", route => {
        route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Service unavailable" })
        });
    });

    await page.goto("/chat");
    await page.getByRole("textbox").fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();
    
    await expect(page.getByText("Service unavailable")).toBeVisible();
});
```

---

## Trace Viewer

Record everything that happened during a test run:

```typescript
// playwright.config.ts
export default defineConfig({
    use: { trace: "on-first-retry" }  // or "on", "off", "retain-on-failure"
});
```

```bash
npx playwright show-trace trace.zip
```

The trace viewer shows: timeline, screenshots at each step, network requests, console logs, DOM snapshots. Essential for debugging CI failures.

---

## CI Configuration

```yaml
# .github/workflows/e2e.yml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test --reporter=github

- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
```

---

## MCP Server

Playwright ships an official MCP server. Enables LLM agents to browse the web:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Claude Code (or any MCP host) can then control a browser, take screenshots, fill forms, and interact with web UIs as tools.

---

## Key Facts

- Healer agent (v1.56+): ~75% success rate for locator failures; auto-PRs the fix; does not fix logic failures
- Locator priority: role+name > label > placeholder > text > test-id > CSS/XPath (avoid CSS/XPath)
- Role-based locators mirror the accessibility tree — survive visual redesigns and improve screen reader support simultaneously
- Network mocking: `page.route("**/api/chat", route => route.fulfill(...))` — never hit real LLM APIs in E2E tests
- Trace viewer: `trace: "on-first-retry"` in config; inspect via `npx playwright show-trace trace.zip`
- MCP server install: `claude mcp add playwright -- npx @playwright/mcp@latest`
- Playwright vs Selenium: auto-wait / trace viewer / Healer / MCP on Playwright; legacy suites / Java enterprise / IE on Selenium

## Common Failure Cases

**`getByRole("button", { name: "Submit" })` finds zero elements because the button uses an icon without accessible text**  
Why: role-based locators query the accessibility tree; a button that contains only an SVG icon with no `aria-label` or visible text has no accessible name, so `getByRole` returns an empty match.  
Detect: the locator throws `locator.click: Error: strict mode violation — 0 elements found`; inspecting the accessibility tree in DevTools shows the button has role `button` but name `""`.  
Fix: add an `aria-label` to the icon button in the component (`<button aria-label="Submit">`); this fixes both the test and screen reader support simultaneously.

**Healer agent opens a pull request with a wrong replacement locator because the DOM has multiple visually similar elements**  
Why: Healer's LLM analyses the DOM snapshot and proposes the most likely match; in pages with repeated patterns (lists of cards, table rows), the model may match the wrong instance, producing a locator that passes on the first item but fails for the intended one.  
Detect: the Healer-proposed PR makes the test pass locally but fails on a different test input; the locator targets index `[0]` instead of a unique identifying attribute.  
Fix: review every Healer PR before merging; prefer `getByRole` with a unique `name` over index-based selectors; if the page lacks unique accessible names, add `data-testid` attributes.

**`page.route("**/api/chat", ...)` mock is not applied because the request URL does not match the glob pattern**  
Why: glob matching in `page.route` is case-sensitive and path-prefix dependent; if the Next.js dev server proxies the API under a different path or the test runs against a deployed URL with a subdirectory prefix, the pattern misses all requests.  
Detect: network requests to `/api/chat` appear in the trace viewer as real HTTP calls, not intercepted; the mock handler's callback is never executed.  
Fix: use `**/api/chat**` (double wildcard on both sides) or an exact URL; verify the intercept is active by asserting `expect(interceptedRequests).toHaveLength(1)` before the interaction.

**Streaming LLM response causes `expect(...).toContainText(...)` to fail because the assertion runs before the stream completes**  
Why: Playwright's auto-wait retries the assertion until the timeout, but if the streaming response appends tokens incrementally, the assertion may match a partial token that temporarily contains the expected substring and then disappear as more text is appended via a re-render.  
Detect: the test passes intermittently; the failure screenshots show the final text present but the assertion reports mismatch; the timeout is 5 seconds but the stream takes 8 seconds.  
Fix: increase the `timeout` to exceed the expected maximum stream duration; or wait for a done indicator element (`await expect(page.getByTestId("stream-complete")).toBeVisible()`) before asserting on the content.

## Connections

- [[test-automation/pytest-patterns]] — fixtures and conftest integration for Python Playwright
- [[test-automation/selenium]] — comparison and when to stay on Selenium
- [[test-automation/testing-llm-apps]] — mocking LLM APIs in E2E tests
- [[python/ecosystem]] — pytest-asyncio patterns for async Playwright
- [[ai-tools/claude-code]] — Playwright MCP for agent web browsing
- [[web-frameworks/nextjs]] — the frontend Playwright most often tests in this stack
- [[technical-qa/self-healing-tests]] — Playwright Healer agent and broader self-healing test landscape

## Open Questions

- Does the Healer agent's 75% success rate hold across complex React/Next.js SPAs with dynamic class names?
- Is the Playwright MCP server production-ready for autonomous agent web browsing, or primarily a demo capability?
- When multiple locator strategies work, does the choice between role and test-id have a measurable impact on flakiness?

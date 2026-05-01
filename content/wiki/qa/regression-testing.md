---
type: concept
category: qa
para: resource
tags: [regression-testing, test-selection, ci, qa, automation]
sources: []
updated: 2026-05-01
---

# Regression Testing

Verifying that previously working functionality hasn't been broken by new changes. The primary value of an automated test suite — it prevents known-good behaviour from silently degrading.

---

## The Regression Problem

Every code change risks breaking existing functionality. Without regression tests, teams discover breakages in production. With them, breakages are caught in CI before merge.

The cost of a regression bug:
- Caught in unit test: developer fixes it in minutes
- Caught in CI regression: found within minutes of commit
- Caught in QA: hours of investigation
- Caught in production: potential revenue loss, customer impact, emergency hotfix

---

## Regression Test Selection

You cannot re-run every test on every commit — it would take hours. Select intelligently.

**Risk-based selection:**
- Always run: unit tests, fast integration tests, critical-path E2E
- Run on PR: all tests relevant to changed files
- Run nightly: full regression suite including slow tests
- Run pre-release: full suite + exploratory

**Change-based selection:**
```bash
# Find tests affected by changed files (pytest with coverage mapping)
pytest --co -q | grep -f changed_modules.txt

# Or use git to find changed areas
git diff --name-only origin/main | xargs coverage_mapper.py
```

**Impact analysis:** Map each test to the code paths it exercises. When a file changes, run only tests that cover that file. Tools: `pytest-testmon`, `jest --changedSince`, Bazel's dependency graph.

---

## Regression Suite Structure

```
regression/
├── smoke/           # 5-10 tests, run on every commit, <2 min
│   ├── test_api_health.py
│   ├── test_login.py
│   └── test_checkout_happy_path.py
├── core/            # 50-100 tests, run on every PR, <15 min
│   ├── test_auth.py
│   ├── test_payments.py
│   └── test_notifications.py
└── full/            # 200-500 tests, run nightly, <60 min
    ├── test_edge_cases.py
    ├── test_cross_browser.py
    └── test_performance_baseline.py
```

---

## Smoke Tests

The minimal gate. Run on every commit. If smoke fails, block everything else.

```python
# smoke/test_api_health.py
def test_api_responds(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_database_connected(client):
    response = client.get("/health/db")
    assert response.status_code == 200

def test_login_page_loads(page):
    page.goto("/login")
    assert page.title() == "Login — MyApp"
    assert page.get_by_role("button", name="Log In").is_visible()
```

---

## Fixing Regressions

When a regression is found:
1. **Reproduce** — confirm the regression is real, not a flaky test
2. **Bisect** — use `git bisect` to find the commit that introduced it
3. **Write a failing test** — if one doesn't exist, add it now
4. **Fix**
5. **Confirm test passes**
6. **Add to regression suite permanently**

```bash
# Git bisect — finds the bad commit automatically
git bisect start
git bisect bad HEAD          # current commit is bad
git bisect good v2.1.0       # this version was good
# Git checks out middle commit; run your test
pytest tests/test_checkout.py::test_promo_code
git bisect bad               # or good, based on result
# Repeat until git identifies the first bad commit
git bisect reset
```

---

## Preventing Regressions

- **Coverage gates** — fail CI if coverage drops below threshold. New code must have tests.
- **Mutation testing** — verify tests would catch real bugs, not just execute code paths.
- **Dedicated regression sprint** — when regression rate spikes, dedicate a sprint to writing missing tests.
- **Bug-fix policy** — every bug fix requires a regression test that would have caught it.

---

## Visual Regression

For UI changes — screenshots compared against baseline.

```typescript
// Playwright visual regression
test('dashboard layout unchanged', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,   // allow 2% pixel diff
  });
});
```

Update baseline when intentional UI changes are made:
```bash
playwright test --update-snapshots
```

---

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/risk-based-testing]] · [[qa/qa-metrics]] · [[technical-qa/test-architecture]] · [[technical-qa/visual-testing]]

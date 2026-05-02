---
type: concept
category: qa
para: resource
tags: [regression-testing, test-selection, ci, qa, automation]
sources: []
updated: 2026-05-01
tldr: Verifying that previously working functionality hasn't been broken by new changes. The primary value of an automated test suite — it prevents known-good behaviour from silently degrading.
---

# Regression Testing

Verifying that previously working functionality hasn't been broken by new changes. The primary value of an automated test suite. It prevents known-good behaviour from silently degrading.

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

You cannot re-run every test on every commit. It would take hours. Select intelligently.

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

For UI changes. Screenshots compared against baseline.

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

## Common Failure Cases

**Smoke suite grows beyond 2 minutes — developers stop waiting for it**
Why: tests are added to the smoke suite without removing lower-value ones; after 18 months it runs in 8 minutes and developers merge without waiting for results.
Detect: measure smoke suite wall-clock time in CI; anything over 2 minutes on a standard runner indicates the suite has drifted from its purpose.
Fix: audit the smoke suite quarterly and move any test that is not testing a critical path (login, health, one core transaction) into the `core` or `full` tier; enforce the 2-minute budget as a CI step that fails if exceeded.

**Regression test written after the fix — test always passes, never validates the fix**
Why: the developer writes the regression test against the fixed code rather than writing it against the broken code first; the test passes immediately and was never in a failing state.
Detect: the test cannot be made to fail by reverting the fix — meaning the test does not actually cover the fault condition.
Fix: enforce the rule: write the regression test first, run it against the unfixed code, confirm it fails, then apply the fix; a test that never failed is not a regression test.

**Visual regression baselines committed to git LFS with wrong branch pointer**
Why: `playwright test --update-snapshots` is run on a feature branch and the snapshots are committed there; after merge the main branch baseline is now the post-feature-change state, and the previous visual state is lost.
Detect: the `dashboard.png` snapshot in `main` reflects the new feature UI rather than the pre-feature baseline; reverting the feature would cause visual tests to fail on `main`.
Fix: never run `--update-snapshots` on a feature branch for existing snapshots; run it on `main` only after the intentional UI change has been reviewed and approved; store a `SNAPSHOT_CHANGELOG.md` with the reason for each update.

**`git bisect` not used — regression investigation takes hours instead of minutes**
Why: the developer looks at the last 20 commits manually trying to find the regression, spending 2+ hours instead of letting bisect binary-search the commit history.
Detect: a regression investigation takes more than 30 minutes on a codebase with a clean git history.
Fix: as a first response to any regression, run `git bisect start`, mark the known good tag and bad commit, and run the failing test on each bisect step; bisect identifies the culprit commit in log2(n) steps.

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/risk-based-testing]] · [[qa/qa-metrics]] · [[technical-qa/test-architecture]] · [[technical-qa/visual-testing]]

---
type: concept
category: technical-qa
para: resource
tags: [allure, test-reporting, dashboards, slack, junit-xml, html-report, flaky-tracking]
sources: []
updated: 2026-05-01
tldr: Making test results visible, actionable, and trackable over time.
---

# Test Reporting and Dashboards

Making test results visible, actionable, and trackable over time.

---

## Why Reporting Matters

```
"The tests are green" is insufficient information for stakeholders.
Good reporting answers:
  - What was tested, and what wasn't? (coverage)
  - Which tests failed, and why? (actionable failures)
  - Is quality improving over time? (trend)
  - Which tests are unreliable? (flaky test tracking)
  - How fast is the suite? (execution time)

Good reporting changes behaviour:
  Engineers notice when coverage drops → write more tests
  QA notices flaky test trends → investigates and fixes
  Product sees quality metrics → makes prioritisation decisions
```

---

## Allure Report with pytest

```bash
pip install allure-pytest
pytest tests/ --alluredir=./allure-results
allure serve ./allure-results   # opens browser with interactive report
allure generate ./allure-results --clean -o ./allure-report
```

```python
# Enrich tests with Allure metadata
import allure

@allure.feature("Order Management")
@allure.story("Order Placement")
@allure.severity(allure.severity_level.CRITICAL)
def test_place_order_success(page, client):
    with allure.step("Navigate to checkout"):
        page.goto("http://localhost:3000/checkout")

    with allure.step("Fill payment details"):
        page.get_by_label("Card number").fill("4242424242424242")

    with allure.step("Submit order"):
        page.get_by_role("button", name="Place order").click()

    with allure.step("Verify confirmation"):
        expect(page.get_by_role("heading", name="Order confirmed")).to_be_visible()

    # Attach screenshot to report
    allure.attach(
        page.screenshot(),
        name="Order confirmation",
        attachment_type=allure.attachment_type.PNG,
    )

@allure.feature("Order Management")
@allure.story("Order Cancellation")
@pytest.mark.parametrize("status", ["pending", "confirmed"])
def test_cancel_allowed_states(status: str, make_order, client):
    allure.dynamic.title(f"Cancel order in {status} state")
    ...
```

---

## CI Pipeline Reporting

```yaml
# .github/workflows/test.yml
name: Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: pytest tests/ --alluredir=allure-results --junitxml=junit.xml -q

      - name: Upload Allure results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results
          path: allure-results/

      - name: Publish JUnit results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: junit.xml

      - name: Comment PR with test summary
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request' && always()
        with:
          script: |
            const fs = require('fs');
            const xml = fs.readFileSync('junit.xml', 'utf8');
            // Parse and summarise...
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Test Results\n✅ 142 passed | ❌ 2 failed | ⏱ 45s`,
            });
```

---

## Slack Notifications

```python
# notify_slack.py — called from CI after test run
import httpx, json, sys, xml.etree.ElementTree as ET

def parse_junit(junit_path: str) -> dict:
    tree = ET.parse(junit_path)
    root = tree.getroot()
    return {
        "tests": int(root.attrib.get("tests", 0)),
        "failures": int(root.attrib.get("failures", 0)),
        "errors": int(root.attrib.get("errors", 0)),
        "skipped": int(root.attrib.get("skipped", 0)),
        "time": float(root.attrib.get("time", 0)),
    }

def notify_slack(webhook_url: str, junit_path: str, build_url: str, branch: str) -> None:
    stats = parse_junit(junit_path)
    passed = stats["tests"] - stats["failures"] - stats["errors"]
    success = stats["failures"] == 0 and stats["errors"] == 0
    colour = "good" if success else "danger"
    status = "PASSED" if success else "FAILED"

    payload = {
        "attachments": [{
            "color": colour,
            "title": f"Test Suite {status} — {branch}",
            "title_link": build_url,
            "fields": [
                {"title": "Tests", "value": str(stats["tests"]), "short": True},
                {"title": "Passed", "value": str(passed), "short": True},
                {"title": "Failed", "value": str(stats["failures"]), "short": True},
                {"title": "Duration", "value": f"{stats['time']:.0f}s", "short": True},
            ],
        }]
    }
    httpx.post(webhook_url, json=payload).raise_for_status()

if __name__ == "__main__":
    notify_slack(
        webhook_url=sys.argv[1],
        junit_path=sys.argv[2],
        build_url=sys.argv[3],
        branch=sys.argv[4],
    )
```

---

## Flaky Test Tracking

```python
# pytest plugin: track flaky tests across runs
# Write results to a shared store (S3, database, or file)
import json, os, time
from pathlib import Path

class FlakyTracker:
    """pytest plugin that records pass/fail per test across runs."""

    def __init__(self, history_path: str) -> None:
        self.history_path = Path(history_path)
        self.results: dict[str, list[str]] = self._load()

    def _load(self) -> dict:
        if self.history_path.exists():
            return json.loads(self.history_path.read_text())
        return {}

    def pytest_runtest_logreport(self, report) -> None:
        if report.when == "call":
            node_id = report.nodeid
            outcome = "pass" if report.passed else "fail"
            self.results.setdefault(node_id, []).append(outcome)
            # Keep last 20 results
            self.results[node_id] = self.results[node_id][-20:]

    def pytest_sessionfinish(self) -> None:
        self.history_path.write_text(json.dumps(self.results, indent=2))

    def get_flaky_tests(self, threshold: float = 0.8) -> list[str]:
        """Tests that pass < threshold% of the time are considered flaky."""
        flaky = []
        for test, outcomes in self.results.items():
            if len(outcomes) >= 5:
                pass_rate = outcomes.count("pass") / len(outcomes)
                if 0.1 < pass_rate < threshold:   # not always failing, not always passing
                    flaky.append(test)
        return flaky
```

---

## Dashboard Metrics to Track

```
Metric                    Target          How to measure
───────────────────────────────────────────────────────────────
Test pass rate            > 99%           JUnit XML / Allure
Suite duration trend      Stable or ↓     CI job timing
Flaky test rate           < 1%            FlakyTracker over 30 days
Code coverage             > 80%           pytest-cov report
Coverage trend            Stable or ↑     Compare across PRs
Time to first test result < 5 min         Pre-commit hook timing
E2E suite duration        < 30 min        CI job timing
New tests per sprint      Positive        Git diff on tests/
```

---

## Connections

[[tqa-hub]] · [[technical-qa/flaky-test-management]] · [[technical-qa/parallel-test-execution]] · [[qa/qa-metrics]] · [[qa/test-reporting]] · [[cloud/github-actions]]

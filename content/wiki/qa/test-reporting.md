---
type: concept
category: qa
para: resource
tags: [test-reporting, allure, junit-xml, dashboards, qa-metrics]
sources: []
updated: 2026-05-01
tldr: Making test results visible, actionable, and historically trackable. Raw test output in a terminal window is not a report — good reporting surfaces trends, assigns ownership, and drives decisions.
---

# Test Reporting

Making test results visible, actionable, and historically trackable. Raw test output in a terminal window is not a report. Good reporting surfaces trends, assigns ownership, and drives decisions.

---

## Report Types

| Type | Audience | Format | Cadence |
|---|---|---|---|
| CI run report | Engineers | HTML, JUnit XML | Every PR/build |
| Sprint quality report | Team + PM | Dashboard or doc | Per sprint |
| Release quality report | Stakeholders | Summary doc | Per release |
| Flaky test report | Engineers | Tracked list | Ongoing |
| Coverage trend | Tech lead | Chart over time | Weekly |

---

## Allure Report

Rich HTML report with history, trends, categories, and environment info. Integrates with pytest, JUnit, TestNG, Playwright, Cucumber.

```bash
pip install allure-pytest

# Generate results
pytest --alluredir=allure-results

# Generate HTML report from results
allure generate allure-results -o allure-report --clean

# Serve locally
allure serve allure-results
```

```python
# Annotating tests for rich Allure output
import allure

@allure.epic("Checkout")
@allure.feature("Payment")
@allure.story("Card payment")
@allure.severity(allure.severity_level.CRITICAL)
def test_card_payment_success():
    with allure.step("Add item to cart"):
        cart = add_to_cart(product_id=1)

    with allure.step("Enter card details"):
        payment = enter_payment(card_number="4242424242424242", expiry="12/28", cvv="123")

    with allure.step("Complete purchase"):
        result = checkout(cart, payment)

    allure.attach(json.dumps(result), name="response", attachment_type=allure.attachment_type.JSON)
    assert result["status"] == "paid"
```

```yaml
# GitHub Actions — publish Allure to GitHub Pages
- name: Run tests
  run: pytest --alluredir=allure-results

- name: Generate Allure report
  uses: simple-elf/allure-report-action@master
  with:
    allure_results: allure-results
    allure_history: allure-history
    keep_reports: 20

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: allure-history
```

---

## JUnit XML — CI Integration

Most CI systems (GitHub Actions, Jenkins, CircleCI, GitLab) parse JUnit XML to display test results inline.

```bash
# pytest
pytest --junitxml=test-results.xml

# Playwright
npx playwright test --reporter=junit

# Maven
# surefire plugin generates target/surefire-reports/*.xml by default
```

```yaml
# GitHub Actions — parse JUnit results
- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: |
      test-results.xml
      **/test-results/**/*.xml
    comment_mode: always
    check_name: Test Results
```

---

## Coverage Reporting

```bash
# pytest + coverage
pytest --cov=src --cov-report=xml --cov-report=html --cov-report=term-missing

# Upload to Codecov
- uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: coverage.xml
    fail_ci_if_error: true
    threshold: 80

# TypeScript — c8
c8 --reporter=html --reporter=lcov npm test
```

Coverage trend: if coverage drops 3+ points sprint-over-sprint, flag it in the retrospective.

---

## Slack/Teams Notifications

```python
# Post test results to Slack after CI run
import httpx

def post_test_results_to_slack(webhook_url: str, results: dict) -> None:
    colour = "good" if results["failed"] == 0 else "danger"

    httpx.post(webhook_url, json={
        "attachments": [{
            "color": colour,
            "title": f"Test Results — Build #{results['build_number']}",
            "fields": [
                {"title": "Passed", "value": str(results["passed"]), "short": True},
                {"title": "Failed", "value": str(results["failed"]), "short": True},
                {"title": "Duration", "value": results["duration"], "short": True},
                {"title": "Coverage", "value": f"{results['coverage']}%", "short": True},
            ],
            "footer": f"<{results['report_url']}|View full report>",
        }]
    })
```

---

## Flaky Test Tracking

```python
# Parse JUnit XML to track flaky tests over time
import xml.etree.ElementTree as ET
from collections import defaultdict

def extract_failures(xml_file: str) -> list[str]:
    tree = ET.parse(xml_file)
    return [
        tc.attrib["classname"] + "::" + tc.attrib["name"]
        for tc in tree.iter("testcase")
        if tc.find("failure") is not None
    ]

# Store in SQLite, query for tests that pass and fail within the same week
# Any test that fails < 100% of the time it runs = flaky = quarantine candidate
```

---

## Sprint Quality Dashboard (Metrics to Track)

```
Test execution: pass rate, duration, flaky count
Coverage: current %, delta from last sprint
Escaped defects: bugs found in production this sprint
Defect detection efficiency: bugs found in sprint / (sprint + post-sprint)
Automation growth: new automated tests added this sprint
```

---

## Common Failure Cases

**Allure history is not persisted between runs, so trend charts always show one data point**
Why: the `allure-history` directory is not cached or stored as a branch artifact between CI runs, so each run starts fresh and the historical trend view is empty.
Detect: the Allure report opens but the "Trend" and "History" sections show only the current run.
Fix: use the `simple-elf/allure-report-action` with `allure_history` pointing to a separate `gh-pages` branch, or store the `allure-history` folder in an S3 bucket and restore it at the start of each run.

**JUnit XML is not published when tests fail, hiding the failure detail in CI**
Why: the `publish-unit-test-result-action` step runs only on success (`if: success()` is the default), so when tests fail the XML is never parsed and the PR check shows a generic failure with no test-level detail.
Detect: a failing PR shows no failed test breakdown in the checks panel — only "build failed."
Fix: add `if: always()` to the publish step so it runs regardless of whether tests passed or failed; this is the most common missing flag on reporting steps.

**Coverage threshold set globally but measured against a subset of files**
Why: `pytest --cov=src --cov-fail-under=80` passes because it only measures coverage over files actually imported during the test run, missing modules that have no tests at all.
Detect: add a new module with zero tests — the coverage report doesn't mention it and the threshold still passes.
Fix: configure `[tool.coverage.run] source = ["src"]` in `pyproject.toml` to force coverage to report all files under `src/` regardless of whether they were imported, so truly untested modules appear as 0% and drag the overall score down.

**Flaky test tracker identifies the same tests repeatedly but they are never quarantined**
Why: the tracking script runs and posts results, but there is no automated action that quarantines or skips tests above the flakiness threshold, leaving them to pollute the suite indefinitely.
Detect: the same three tests appear in every weekly flaky report but remain in the main suite.
Fix: add a CI step that reads the flaky test list and applies `@pytest.mark.skip(reason="flaky — quarantined TICKET-XXX")` automatically via a script, or use pytest-quarantine to move them to a separate marked group that runs in a non-blocking job.

## Connections
[[qa-hub]] · [[qa/qa-metrics]] · [[qa/qa-in-devops]] · [[qa/regression-testing]] · [[cloud/github-actions]] · [[technical-qa/flaky-test-management]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

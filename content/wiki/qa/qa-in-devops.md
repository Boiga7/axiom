---
type: concept
category: qa
para: resource
tags: [qa, devops, quality-gates, ci-cd, shift-left, continuous-testing]
sources: []
updated: 2026-05-01
---

# QA in DevOps

How quality practices integrate with DevOps pipelines. DevOps QA is not a team — it's quality gates, automated checks, and feedback loops embedded into the delivery pipeline.

---

## The DevOps Quality Pipeline

```
Developer
  │
  ├── Pre-commit hooks (linting, formatting, secret scanning)
  │
Pull Request
  ├── Unit tests (< 2 min)
  ├── SAST (Semgrep, Bandit)
  ├── Dependency scan (Trivy, safety)
  ├── Type check (mypy, tsc)
  ├── PR review (peer + QA review checklist)
  │
Merge to main
  ├── Integration tests (< 10 min)
  ├── E2E smoke tests (< 5 min)
  ├── Build Docker image + push
  │
Deploy to Staging
  ├── Smoke tests against staging
  ├── Contract tests (Pact can-i-deploy)
  ├── Performance baseline
  │
Deploy to Production
  ├── Canary (5% traffic) + metric analysis
  ├── Progressive rollout (20% → 50% → 100%)
  ├── Production smoke (critical paths only)
  └── Synthetic monitoring (continuous)
```

---

## Quality Gates

Quality gates block promotion unless criteria are met. Implement as GitHub Actions steps with explicit failure conditions.

```yaml
# .github/workflows/quality-gate.yaml
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
    - name: Unit tests with coverage
      run: |
        pytest --cov=src --cov-fail-under=80 --cov-report=xml

    - name: Coverage gate
      uses: codecov/codecov-action@v4
      with:
        fail_ci_if_error: true
        threshold: 80

    - name: Type check
      run: mypy src/ --strict

    - name: Lint
      run: ruff check src/ && ruff format --check src/

    - name: SAST scan
      run: bandit -r src/ -ll --exit-zero

    - name: Integration tests
      run: pytest tests/integration/ --timeout=120

    - name: E2E smoke
      run: playwright test tests/smoke/ --reporter=github
```

---

## Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
- repo: https://github.com/pre-commit/pre-commit-hooks
  rev: v4.6.0
  hooks:
  - id: trailing-whitespace
  - id: end-of-file-fixer
  - id: check-yaml
  - id: detect-private-key
  - id: check-added-large-files

- repo: https://github.com/astral-sh/ruff-pre-commit
  rev: v0.4.0
  hooks:
  - id: ruff
    args: [--fix]
  - id: ruff-format

- repo: https://github.com/Yelp/detect-secrets
  rev: v1.4.0
  hooks:
  - id: detect-secrets
    args: ['--baseline', '.secrets.baseline']
```

---

## Contract Testing in the Pipeline (Pact)

```yaml
# Consumer service — publish pacts on PR
- name: Run consumer tests and publish pacts
  run: |
    pytest tests/contract/
    pact-broker publish ./pacts \
      --broker-base-url ${{ secrets.PACT_BROKER_URL }} \
      --consumer-app-version ${{ github.sha }} \
      --branch ${{ github.ref_name }}

# Provider service — verify pacts on PR
- name: Verify provider pacts
  run: |
    PACT_BROKER_URL=${{ secrets.PACT_BROKER_URL }} \
    PACT_CONSUMER_VERSION=${{ github.sha }} \
    pytest tests/provider/

# Both services — can-i-deploy before production
- name: Can I Deploy?
  run: |
    pact-broker can-i-deploy \
      --pacticipant myapp-api \
      --version ${{ github.sha }} \
      --to-environment production \
      --broker-base-url ${{ secrets.PACT_BROKER_URL }}
```

---

## Synthetic Monitoring

```python
# Run against production continuously (not just at deploy time)
# CloudWatch Synthetics canary (Python)
from aws_synthetics.selenium import synthetics_webdriver as webdriver

def handler(event, context):
    browser = webdriver.Chrome()
    browser.get("https://myapp.com")

    title = browser.title
    assert "MyApp" in title, f"Expected 'MyApp' in title, got: {title}"

    browser.find_element("id", "search-input").send_keys("test product")
    browser.find_element("id", "search-submit").click()

    results = browser.find_elements("class name", "product-card")
    assert len(results) > 0, "Search returned no results"
```

Schedule: every 5 minutes on critical paths (login, checkout, API health). Alert via SNS → PagerDuty/Slack.

---

## Observability as Quality Signal

```python
# Production error rate as a quality gate during canary
# Argo Rollouts analysis template using Prometheus
{
    "metrics": [{
        "name": "error-rate",
        "successCondition": "result[0] < 0.01",   # < 1% error rate
        "provider": {
            "prometheus": {
                "query": "sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
            }
        }
    }]
}
```

---

## QA's DevOps Responsibilities

- Own the test pipeline configuration (GitHub Actions, CircleCI)
- Maintain the test environment (staging infrastructure, seed data)
- Track quality metrics per sprint (escape rate, automation coverage, flaky test rate)
- Triage flaky tests — quarantine within 24h of first flake
- Champion quality gates — resist pressure to bypass them under time pressure

---

## Connections
[[qa-hub]] · [[qa/agile-qa]] · [[qa/regression-testing]] · [[qa/test-environments]] · [[cloud/github-actions]] · [[technical-qa/contract-testing]] · [[cloud/argo-rollouts]]

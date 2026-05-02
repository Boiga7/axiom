---
type: concept
category: qa
para: resource
tags: [qa, devops, quality-gates, ci-cd, shift-left, continuous-testing]
sources: []
updated: 2026-05-01
tldr: How quality practices integrate with DevOps pipelines. DevOps QA is not a team — it's quality gates, automated checks, and feedback loops embedded into the delivery pipeline.
---

# QA in DevOps

How quality practices integrate with DevOps pipelines. DevOps QA is not a team. It's quality gates, automated checks, and feedback loops embedded into the delivery pipeline.

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

## Common Failure Cases

**Quality gate bypassed under release pressure by adding `continue-on-error: true`**
Why: a team member adds `continue-on-error: true` to the coverage or test step to unblock a deployment; the gate exists in the YAML but no longer blocks anything.
Detect: grep the workflow files for `continue-on-error` on any quality gate step; presence is a finding.
Fix: remove `continue-on-error` from all gate steps; if a test is genuinely blocking release for an unrelated reason, quarantine the specific test with a `pytest.mark.skip` and a linked ticket — never disable the gate itself.

**Flaky E2E smoke tests silently pass 80% of the time — regressions slip through**
Why: a smoke test that is flaky 20% of the time will appear green on most PRs; developers learn to re-run the pipeline rather than investigate failures, and a real regression gets re-run past.
Detect: look at the last 20 CI runs for each smoke test; any test with more than one unexplained failure in 20 runs is flaky.
Fix: quarantine flaky tests within 24 hours (move to a separate `flaky` marker, exclude from the smoke gate, file a ticket); a flaky gate is worse than no gate because it trains the team to distrust failures.

**Canary rollout has no automated rollback condition — errors go to 100% rollout**
Why: the Argo Rollouts analysis template exists but `successCondition` is misconfigured (`result[0] < 0.1` when errors are a ratio, not a percentage); the canary promotes automatically even at 5% error rate.
Detect: review the analysis template in staging by injecting errors and confirming the canary pauses before promotion; if it promotes through a 5% error rate, the condition is wrong.
Fix: unit-test the PromQL expression in Prometheus directly before wiring it into the rollout; confirm `sum(rate(...))` produces a ratio in [0,1] and adjust the threshold accordingly.

**Pre-commit hooks not installed by all developers — secret scanning is bypassed**
Why: `detect-secrets` is in `.pre-commit-config.yaml` but `pre-commit install` is only run by developers who read the README; CI does not re-run the same checks, so secrets committed without hooks installed are not caught until a manual audit.
Detect: run `git log --all --full-history -- .secrets.baseline` and check whether the baseline is diverging from the installed hook version; also check whether CI has a dedicated secret-scanning step independent of pre-commit.
Fix: add a CI step that runs `detect-secrets scan` independently of pre-commit, so the server-side check catches anything that bypassed the client-side hook.

## Connections
[[qa-hub]] · [[qa/agile-qa]] · [[qa/regression-testing]] · [[qa/test-environments]] · [[cloud/github-actions]] · [[technical-qa/contract-testing]] · [[cloud/argo-rollouts]]

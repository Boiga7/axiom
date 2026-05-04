---
type: concept
category: technical-qa
para: resource
tags: [ci-cd, quality-gates, pipeline, coverage, sonarqube, shift-left]
sources: []
updated: 2026-05-01
tldr: Automated checkpoints in a delivery pipeline that block promotion when quality thresholds aren't met. Quality gates make "definition of done" machine-enforceable rather than aspirational.
---

# CI/CD Quality Gates

Automated checkpoints in a delivery pipeline that block promotion when quality thresholds aren't met. Quality gates make "definition of done" machine-enforceable rather than aspirational.

---

## Gate Taxonomy

```
Pre-commit gates (< 5 seconds):
  - detect-secrets (no credentials in diff)
  - ruff/eslint --max-warnings 0 (linting)
  - pyright/tsc --noEmit (type checking)

PR gates (< 10 minutes):
  - Unit tests pass, coverage ≥ 80%
  - Static analysis: no new high-severity findings
  - Dependency review: no high CVE introductions
  - Conventional commit message format

Post-merge gates (< 30 minutes):
  - Integration tests pass
  - Contract tests: consumer-driven pacts verified
  - DAST: no new OWASP issues
  - Performance baseline: p99 within 10% of prior

Deploy gates (pre-production):
  - Smoke tests pass in staging
  - Canary health check: error rate < 0.5%
  - Synthetic monitoring steady state
```

---

## Full CI Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI Quality Gates

on: [push, pull_request]

jobs:
  # Gate 1: Code quality
  quality:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with: { python-version: "3.12" }
    - run: pip install ruff mypy bandit pytest pytest-cov

    - name: Lint
      run: ruff check src/ --select E,W,F,C,B,S --output-format=github

    - name: Type check
      run: mypy src/ --strict

    - name: Security scan
      run: bandit -r src/ -ll --format json -o bandit-report.json
      continue-on-error: false

  # Gate 2: Unit tests + coverage
  unit-tests:
    needs: quality
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: pip install pytest pytest-cov

    - name: Run unit tests
      run: pytest tests/unit/ -v --cov=src --cov-report=xml --cov-fail-under=80

    - name: Upload coverage
      uses: codecov/codecov-action@v4
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        fail_ci_if_error: true

  # Gate 3: Integration tests
  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
    - uses: actions/checkout@v4
    - run: pip install pytest pytest-asyncio httpx

    - name: Run integration tests
      env:
        DATABASE_URL: postgresql://postgres:testpass@localhost/testdb
      run: pytest tests/integration/ -v --timeout=120

  # Gate 4: Contract tests
  contract-tests:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: pip install pact-python

    - name: Verify pacts
      run: |
        pact-verifier \
          --provider-base-url http://localhost:8000 \
          --pact-broker-url ${{ vars.PACT_BROKER_URL }} \
          --provider-version ${{ github.sha }} \
          --publish-verification-results

  # Gate 5: Smoke tests (after staging deploy)
  smoke:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
    - run: pytest tests/smoke/ -v --timeout=60 -x
      env:
        APP_URL: ${{ vars.STAGING_URL }}
```

---

## Coverage Gate Configuration

```ini
# pyproject.toml
[tool.coverage.run]
source = ["src"]
omit = ["*/migrations/*", "*/tests/*", "*/conftest.py"]

[tool.coverage.report]
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
show_missing = true
```

```yaml
# SonarQube quality gate (sonar-project.properties)
sonar.projectKey=myapp
sonar.sources=src
sonar.tests=tests
sonar.python.coverage.reportPaths=coverage.xml
sonar.qualitygate.wait=true     # fail CI if gate fails
# SonarQube default gate: coverage ≥ 80%, duplications < 3%, no blocker bugs
```

---

## Branch Protection Rules (GitHub)

```yaml
# Required status checks for main branch:
required_status_checks:
  strict: true              # branch must be up to date
  contexts:
    - "quality"
    - "unit-tests"
    - "integration-tests"
    - "contract-tests"

required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true

required_linear_history: true        # no merge commits
restrictions:
  push: []                           # nobody force-pushes to main
```

---

## Reusable Quality Gate Workflow

```yaml
# .github/workflows/quality-gate.yaml (reusable)
on:
  workflow_call:
    inputs:
      coverage-threshold:
        type: number
        default: 80
      fail-on-security:
        type: boolean
        default: true

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
    - name: Coverage check
      run: pytest --cov-fail-under=${{ inputs.coverage-threshold }}

    - name: Security check
      if: inputs.fail-on-security
      run: semgrep ci --config=auto --error
```

---

## Gate Metrics and Reporting

```python
# tools/gate_report.py — post gate results to PR comment
import os
import httpx

def post_gate_report(pr_number: int, results: dict):
    body = f"""## Quality Gate Report

| Gate | Status | Details |
|---|---|---|
| Lint | {results['lint']} | {results['lint_details']} |
| Type check | {results['types']} | |
| Coverage | {results['coverage']} | {results['coverage_pct']}% (min: 80%) |
| Security | {results['security']} | {results['security_findings']} findings |
| Tests | {results['tests']} | {results['passed']}/{results['total']} passed |
"""

    httpx.post(
        f"https://api.github.com/repos/{os.environ['REPO']}/issues/{pr_number}/comments",
        headers={"Authorization": f"token {os.environ['GITHUB_TOKEN']}"},
        json={"body": body},
    )
```

---

## When to Fail vs Warn

```
Fail (block merge):
  - Any test failure
  - Type errors in new code (not legacy)
  - Coverage drops below threshold
  - High/critical CVE introduced by new dependency
  - Secrets detected in diff

Warn (annotate PR, do not block):
  - Coverage below 80% in a specific new file
  - Moderate CVE in indirect dependency
  - Performance regression within tolerance (< 10%)
  - Complexity increase in existing code

Never gate on:
  - Subjective style (handled by auto-formatter)
  - TODOs in code (noise)
  - Line length (formatter's job)
```

---

## Common Failure Cases

**Coverage gate passes because omit patterns are too broad, excluding new business logic**
Why: `omit = ["*/migrations/*", "*/tests/*"]` is correct, but teams often also omit `*/utils/*` or `*/helpers/*` where real logic lives, inflating the reported percentage.
Detect: add a new module under a path that matches an omit pattern and the coverage number stays the same despite uncovered code.
Fix: audit `[tool.coverage.run] omit` regularly — omit only generated or test-infrastructure code, never application logic directories.

**Integration test gate times out because the Postgres health check retries are insufficient**
Why: GitHub Actions' `--health-retries 5` with `--health-interval 5s` gives 25 seconds total; on slow runners Postgres takes longer to start and the integration tests begin before the service is ready, causing connection refused errors.
Detect: integration tests fail with `psycopg2.OperationalError: could not connect to server` in the first few seconds of the test run, then pass on retry.
Fix: increase `--health-retries` to 10 and add `--health-start-period 10s` to give Postgres time to initialise before the health check loop begins.

**`pact-broker can-i-deploy` silently exits 0 when the broker is unreachable**
Why: if the broker URL is wrong or the token is expired, some versions of `pact-broker` CLI exit 0 with a warning rather than a non-zero exit code, so the CI gate never blocks.
Detect: introduce a known breaking change in a provider; if the deploy proceeds without a block, the gate is not working.
Fix: add `--retry-while-unknown 3` and `--retry-interval 10` flags; also add a preflight step that pings the broker URL and fails fast if it returns non-200.

**Security gate is bypassed because `bandit` only scans `src/` while new code lands in `lib/`**
Why: the scan command is `bandit -r src/` — if a new top-level directory is added, it is never scanned.
Fix: replace the explicit path with a scan of the entire repo root excluding test directories: `bandit -r . --exclude ./.git,./tests,./node_modules`.
Detect: add a deliberate `subprocess.call(user_input, shell=True)` in the new directory — if the gate passes, the scan path is wrong.

## Connections
[[tqa-hub]] · [[qa/qa-in-devops]] · [[qa/test-automation-strategy]] · [[qa/smoke-sanity-testing]] · [[technical-qa/security-automation]] · [[cloud/gitops-patterns]]
## Open Questions

- What is the most common failure mode when implementing this at scale?
- How does this testing approach need to adapt for distributed or microservice architectures?

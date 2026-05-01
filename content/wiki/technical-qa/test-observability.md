---
type: concept
category: technical-qa
para: resource
tags: [test-observability, test-analytics, flakiness, datadog, allure, failure-analysis, ci-insights]
sources: []
updated: 2026-05-01
---

# Test Observability

Treating the test suite as a system to be monitored — tracking health, trends, and failure patterns over time.

---

## Why Test Observability Matters

```
Without test observability:
  - "Tests are red" → which tests? since when? is it a new failure or old flakiness?
  - Flakiness hides behind "retry and merge"
  - Slow tests silently creep from 10 min → 30 min over 6 months
  - Failure patterns across PRs are invisible
  - Teams lose trust in the suite and start ignoring failures

With test observability:
  - Failure rate per test per week — detect tests getting less reliable
  - Mean time to failure — catch tests that broke weeks ago unnoticed
  - Duration trend — alert when a test increases 20% in run time
  - Failure correlation — 5 failing tests in 5 PRs = shared environment issue
  - Cost per test — identify tests spending 40% of CI time for 2% of coverage
```

---

## Tracking Test Results in PostgreSQL

```python
# Store test results for trend analysis
# Schema
CREATE TABLE test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,           -- CI run ID
    branch TEXT,
    commit_sha TEXT,
    started_at TIMESTAMPTZ,
    duration_s FLOAT,
    total_tests INT,
    passed INT,
    failed INT,
    skipped INT
);

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    module TEXT,
    outcome TEXT NOT NULL,          -- passed, failed, error, skipped
    duration_ms FLOAT,
    failure_message TEXT,
    failure_type TEXT,              -- AssertionError, TimeoutError, etc.
    flaky BOOLEAN DEFAULT FALSE,    -- passed on retry
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON test_results (test_name, outcome, recorded_at);
CREATE INDEX ON test_results (run_id);
```

```python
# pytest plugin: record every test result to Postgres
import pytest
import asyncpg
import os
from datetime import datetime, UTC

class TestResultRecorder:
    def __init__(self) -> None:
        self.results: list[dict] = []
        self.run_id = os.environ.get("CI_RUN_ID", "local")

    @pytest.hookimpl(hookwrapper=True)
    def pytest_runtest_makereport(self, item, call):
        outcome = yield
        report = outcome.get_result()
        if report.when == "call":
            self.results.append({
                "run_id": self.run_id,
                "test_name": item.nodeid,
                "module": item.module.__name__,
                "outcome": report.outcome,     # passed / failed / error
                "duration_ms": report.duration * 1000,
                "failure_message": str(report.longrepr) if report.failed else None,
                "failure_type": type(report.longrepr).__name__ if report.failed else None,
            })

    def pytest_sessionfinish(self, session, exitstatus):
        import asyncio
        asyncio.run(self._flush())

    async def _flush(self) -> None:
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        await conn.executemany(
            """INSERT INTO test_results
               (run_id, test_name, module, outcome, duration_ms, failure_message, failure_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            [(r["run_id"], r["test_name"], r["module"], r["outcome"],
              r["duration_ms"], r["failure_message"], r["failure_type"])
             for r in self.results],
        )
        await conn.close()

def pytest_configure(config):
    config.pluginmanager.register(TestResultRecorder())
```

---

## Flakiness Detection Queries

```sql
-- Tests that pass sometimes and fail sometimes in the last 30 days
-- Flakiness rate = failures / total runs for that test
SELECT
    test_name,
    COUNT(*) AS total_runs,
    SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) AS failures,
    ROUND(100.0 * SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) / COUNT(*), 1)
        AS flakiness_rate_pct
FROM test_results
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY test_name
HAVING
    SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) > 0
    AND SUM(CASE WHEN outcome = 'passed' THEN 1 ELSE 0 END) > 0
ORDER BY flakiness_rate_pct DESC
LIMIT 20;

-- Tests getting slower over time (duration trend)
SELECT
    test_name,
    DATE_TRUNC('week', recorded_at) AS week,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms
FROM test_results
WHERE outcome = 'passed' AND recorded_at > NOW() - INTERVAL '90 days'
GROUP BY test_name, week
ORDER BY test_name, week;

-- Slowest tests (CI cost)
SELECT test_name, AVG(duration_ms) AS avg_ms, COUNT(*) AS runs
FROM test_results
WHERE outcome = 'passed' AND recorded_at > NOW() - INTERVAL '7 days'
GROUP BY test_name
ORDER BY avg_ms DESC
LIMIT 20;
```

---

## Datadog CI Visibility

```yaml
# .github/workflows/tests.yml
# Datadog CI Visibility: sends test results to Datadog for dashboards
- name: Run tests with Datadog tracing
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
    DD_ENV: ci
    DD_SERVICE: order-service-tests
    DD_CIVISIBILITY_AGENTLESS_ENABLED: "true"
  run: |
    pip install ddtrace
    ddtrace-run pytest tests/ \
      --ddtrace \
      -v \
      --junit-xml=results/junit.xml

# Datadog then shows:
#   - Pass/fail rate per test per branch
#   - Flakiness detection (built-in)
#   - Duration trend per test
#   - Most impacted tests per commit
#   - CI pipeline performance
```

---

## Test Quality Dashboard (Grafana)

```
Metrics to visualise:

Panel 1: Suite Health (weekly trend)
  - Pass rate % (line chart, target line at 99%)
  - Flaky test count (bar chart)
  - Skipped test count

Panel 2: Duration
  - Total CI time (P95) per day
  - Slowest tests table (auto-refreshing)

Panel 3: Failure Analysis
  - Most frequent failure types (pie: AssertionError/TimeoutError/ConnectionError)
  - Failure count by module (heatmap)

Panel 4: Coverage Trend
  - Overall coverage % over time
  - Coverage by module (table with sparklines)

Alerts:
  - Pass rate drops below 95% for 2 consecutive runs → Slack alert
  - CI duration increases > 20% week-over-week → Jira ticket auto-created
  - New test added with flakiness > 10% in first week → PR comment
```

---

## Connections

[[technical-qa/tqa-hub]] · [[technical-qa/flaky-test-management]] · [[technical-qa/test-reporting-dashboards]] · [[technical-qa/parallel-test-execution]] · [[cloud/infrastructure-monitoring]] · [[qa/qa-metrics]] · [[cs-fundamentals/observability-se]]

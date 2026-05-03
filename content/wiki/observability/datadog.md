---
type: entity
category: observability
tags: [datadog, observability, monitoring, apm, logging, metrics, synthetics, rum, ci-visibility, performance-testing]
sources: []
updated: 2026-05-03
para: resource
tldr: Datadog is the dominant commercial observability platform at enterprise client sites — APM, Logs, Infrastructure, Synthetics, RUM, Error Tracking, and CI Visibility unified under one SaaS platform. QA engineers encounter it most during performance tests, incident investigations, and production monitoring.
---

# Datadog

> **TL;DR** The dominant commercial observability platform at enterprise client sites. APM traces, log management, infrastructure metrics, Synthetics browser/API tests, Real User Monitoring, Error Tracking, and CI Visibility — all in one SaaS platform with per-host/per-custom-metric pricing. QA engineers hit it most during performance tests, incident investigations, and monitoring equivalent of an e2e suite in production.

---

## What Datadog Is

Datadog is a SaaS observability platform founded in 2010, IPO'd in 2019. It consolidates metrics, logs, and traces (the three pillars of observability) alongside a growing product suite covering synthetic monitoring, real user monitoring, security, and CI/CD visibility.

It is not an open-source stack. You pay for it. As a QA consultant, you will encounter it at roughly 60-70% of mid-to-large enterprise clients who have a dedicated platform/DevOps team. They installed it; your job is to use it effectively.

---

## Product Suite Overview

| Product | What it does | QA relevance |
|---|---|---|
| **Infrastructure** | Host/container/cloud metrics, dashboards, alerts | Baseline resource health during performance tests |
| **APM** | Distributed traces, service maps, latency percentiles | Root cause of slow API calls; correlate to test failures |
| **Log Management** | Ingestion, faceted search, log-based metrics, alerting | Find what the app did when your test failed |
| **Synthetics** | Browser tests, API tests, multistep API tests | Production monitoring equivalent of your e2e suite |
| **Real User Monitoring (RUM)** | Frontend performance from real browsers | Core Web Vitals, JS errors, session replays in production |
| **Error Tracking** | Groups similar errors, tracks volume trends | Catch regressions that don't appear in logs until aggregated |
| **CI Visibility** | Test run analytics, flaky test detection, test impact analysis | Treat the test suite as a system to be monitored |
| **Database Monitoring** | Query-level traces, explain plans, lock analysis | Diagnose slow queries during load tests |

---

## APM: Traces and Service Maps

### What a Trace Is

APM traces are the same concept as in [[observability/tracing]] — a distributed request decomposed into spans. Datadog's trace view shows a **flame graph**: the root span at the top, child spans nested below, width proportional to duration.

```
POST /api/checkout                            450ms
  ├─ payment-service: validate_card            12ms
  ├─ inventory-service: reserve_stock          380ms   ← this is your bottleneck
  │     ├─ postgres: SELECT ... FOR UPDATE     310ms
  │     └─ redis: SET reservation:xxx           8ms
  └─ email-service: queue_confirmation          5ms
```

### Reading a Trace as a QA Engineer

Three things to look at immediately:

1. **Widest span** — where time is actually spent. Not always the service you expected.
2. **Error spans** — shown in red. Click to see the error message, stack trace, and HTTP status.
3. **Span metadata** — click any span to see its tags: `http.url`, `http.status_code`, `db.statement`, `error.message`. These tell you *what* the service was doing, not just *how long it took*.

### Service Map

The Service Map (APM > Service Map) auto-builds from trace data — no manual configuration. It shows every service as a node, every call dependency as an edge, and colours nodes by error rate and latency health.

Use it when joining a new client: it gives you the architecture in 30 seconds and shows which services are currently unhealthy.

### Trace Search and Correlation

The APM search bar accepts faceted queries:

```
service:checkout-api status:error @http.status_code:500 env:production
```

Key filters for QA work:
- `@trace_id:<id>` — find a specific trace from an error log
- `@user.id:<id>` — find all traces for one user (good for regression reproduction)
- `@error.type:TimeoutError` — find timeout failures across all services
- `duration:>2s` — find slow requests above a threshold

---

## Log Management

### Faceted Search

Datadog's log UI is a faceted search engine over ingested logs. The left sidebar is your facet panel — it auto-extracts fields from structured JSON logs.

A well-configured client will have fields like `env`, `service`, `version`, `http.status_code`, `user_id`, and `duration_ms` as searchable facets. A poorly configured one will have flat unstructured strings, making search much harder.

**Basic log query syntax:**

```
service:payment-service status:error "card declined"
```

```
@http.status_code:[500 TO 503] env:staging -service:health-checker
```

Dates: click the time picker, or type `@timestamp:[now-1h TO now]`. Always set a time range — default is 15 minutes, which often catches nothing.

### Live Tail

Log Management > Live Tail streams logs in real-time. Use it during:
- Manual exploratory testing — watch what the app does as you click
- Performance test execution — see error rates and patterns in real time

Filter by `env:staging service:checkout-api` to reduce noise. Live Tail does not persist; save a query as a saved view if you need to return to it.

### Saved Views

Save any combination of search query, time range, and column configuration as a named view. As a QA consultant:
- Save a "staging error view" on day one
- Save a "performance test baseline" showing the services under test
- Share saved view URLs in Jira tickets for direct log evidence

### Log-Based Metrics

If a client needs to alert on log patterns but hasn't set up a proper metric, log-based metrics extract numeric signals from log volume. Example: count of `"payment declined"` log lines per minute, graphed as a metric and alerted on.

QA relevance: if a failure mode only surfaces in log messages (not as an HTTP 5xx), you can still build a monitor over it.

### Correlating Logs to Traces

If APM is instrumented and `dd-trace` injects `trace_id` and `span_id` into log output, you can pivot directly:

- From a log line: click "View in APM" to jump to the trace
- From a trace span: click "View related logs" to see logs emitted during that span

This is the single most powerful workflow in Datadog for root cause analysis during an incident.

---

## Synthetics

Synthetics is Datadog's browser and API test runner that executes continuously from Datadog's managed locations (or a private location agent on-prem). It is the production monitoring equivalent of your e2e automation suite.

### API Tests

Single HTTP request, validated with assertions:

- Status code is 200
- Response body contains a JSON key
- Response time is under 500ms
- Certificate expires in more than 10 days

Configure: Synthetics > New Test > API Test. Set frequency (1 min to 1 week), alerting condition (3 consecutive failures), and notification (PagerDuty, Slack, email).

Use case for QA: verify that critical API endpoints are reachable from the public internet, not just from your test network. A test that passes in CI but fails in Synthetics usually means a network/routing issue, not an application bug.

### Multistep API Tests

Chain multiple HTTP requests with variable extraction between steps:

```
Step 1: POST /auth/login → extract token from response body
Step 2: GET /api/orders?user=123 (Authorization: Bearer {{token}}) → assert 200
Step 3: POST /api/orders/{{order_id}}/cancel → assert status 200
Step 4: GET /api/orders/{{order_id}} → assert status is "cancelled"
```

This is a Postman collection equivalent running in production on a schedule. QA engineers familiar with Newman will find the concept identical; the authoring UI is drag-and-drop.

Variable extraction uses JSONPath: `$.data.token` on a JSON body. You can also extract from headers or response body with regex.

### Browser Tests

Datadog's browser tests record a Selenium-like script and replay it from managed Chrome instances:

1. Open the recorder (requires Chrome extension)
2. Walk through the user journey
3. Add assertions: element visible, text content, page title
4. Set test frequency and alert threshold

**Strengths vs your own Playwright suite:**
- Runs continuously from multiple geographic locations (New York, London, Tokyo, Sydney simultaneously)
- Catches CDN/routing failures your internal tests miss
- No flake from timing issues in CI — stable, managed infrastructure

**Weaknesses:**
- No code, so complex dynamic flows are awkward to encode
- Cannot drive flows requiring real external services (email verification, SMS OTP)
- Alert lag: default 3-consecutive-failure threshold means 3+ minutes before alerting

**QA recommendation:** use Synthetics browser tests for smoke-level critical paths (login, checkout, search) at production frequency. Use Playwright for deep functional coverage in CI.

### Private Locations

If the app under test is not public, install a Datadog Private Location agent (a Docker container) inside the client's network. Synthetics tests route through the private location agent.

```bash
docker run -d --name datadog-private-location \
  -e DD_API_KEY=<key> \
  -e DD_SITE=datadoghq.eu \
  datadog/synthetics-private-location-worker
```

---

## CI Visibility

CI Visibility ingests test results from CI pipelines and surfaces them as a searchable, analysable dataset. The QA-relevant features:

### Test Run Tracking

Every test run — pass, fail, skip — is ingested with metadata: branch, commit SHA, duration, test name, test suite, CI pipeline name.

The Tests dashboard shows:
- Pass rate by service or test suite over time
- Duration trends (catch slowdowns before they affect CI feedback loop)
- Most-failed tests in the last 7 days

### Flaky Test Detection

Datadog identifies flaky tests by detecting tests that both passed and failed on the same commit SHA across multiple runs. These appear in the "Flaky Tests" panel with:
- Flakiness rate (percentage of runs that had inconsistent results)
- First detected date
- Associated branch and author

CI Visibility flaky test data is more reliable than local detection because it aggregates across your full CI fleet, not just a single developer's machine.

### Test Impact Analysis

Datadog's Test Impact Analysis (requires the `dd-trace` test instrumentation library) analyses which tests cover which code paths. On a given commit, it recommends only running the tests whose covered code changed.

This is meaningful for large suites: a 1-hour full suite can become a 12-minute relevant subset. In practice, clients configure it as an opt-in flag rather than default, because the coverage map needs periodic full runs to stay accurate.

### Setup (Python/pytest)

```bash
pip install ddtrace
DD_ENV=ci DD_SERVICE=my-app DD_API_KEY=<key> \
  ddtrace-run pytest --ddtrace
```

In GitHub Actions:

```yaml
- name: Run tests with Datadog CI Visibility
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
    DD_ENV: ci
    DD_SERVICE: my-tests
    DD_CIVISIBILITY_AGENTLESS_ENABLED: "true"
  run: ddtrace-run pytest --ddtrace -v
```

See also: [[technical-qa/test-observability]] for the full test observability pattern, which uses the same concepts with a self-hosted PostgreSQL store rather than Datadog's SaaS.

---

## Dashboards

Dashboards are the primary communication tool for sharing observability data with non-engineers. Every Datadog widget pulls from metrics, logs, APM, or Synthetics.

### Building a Test Quality Dashboard

A dashboard that tracks your test suite health alongside the application it tests:

**Panel 1: Test Pass Rate (CI Visibility)**
- Widget type: Timeseries
- Source: `@type:test @status:failed` count vs total, calculated as `(1 - failed/total) * 100`
- Time: last 7 days, grouped by `@test.suite`

**Panel 2: Flaky Test Count**
- Widget type: Query Value
- Source: CI Visibility flaky tests count
- Alert: threshold > 5 flaky tests

**Panel 3: Mean Test Duration**
- Widget type: Timeseries
- Source: `@type:test` average `@duration` grouped by `@test.suite`
- Use: catch suites getting slower over time

**Panel 4: Error Rate in Staging (correlated)**
- Widget type: Timeseries
- Source: APM error rate for `env:staging`
- Side-by-side with test results: if error rate spikes when tests fail, it's an app bug, not a test issue

**Panel 5: Synthetics SLA**
- Widget type: SLO (Service Level Objective widget)
- Source: Synthetics API tests passing percentage
- Target: 99.5% over 30 days

Share the dashboard URL with the team. You can also embed dashboards in Confluence via the Datadog iframe embed feature.

---

## Monitors and Alerts

Monitors define alert conditions. There are several monitor types:

| Monitor type | Use case |
|---|---|
| **Metric monitor** | Alert when error rate > 1% for 5 minutes |
| **Log monitor** | Alert on volume of log pattern (e.g. "NullPointerException") |
| **Synthetics monitor** | Auto-created from Synthetics tests; alert on test failure |
| **APM monitor** | Alert on service latency p95 > 2s |
| **Composite monitor** | Alert when A AND B are both true |

### Setting Up a QA-Relevant Error Rate Alert

```
Monitor type: APM
Service: checkout-api
Environment: staging
Metric: error rate
Alert condition: error rate > 2% for the last 5 minutes
Warning condition: error rate > 0.5%
Notify: #qa-alerts Slack channel, @qa-lead
Message: "{{service}} error rate is {{value}}% — check recent deploys and test results"
```

Tags on the monitor: `env:staging team:qa test_coverage:critical_path`

### Threshold Alerts on Latency

```
Monitor type: Metric
Query: avg:trace.web.request.duration{service:payment-api,env:production}.rollup(avg, 60) > 1000
Alert: p95 latency > 1000ms
Recovery: p95 latency < 500ms
Evaluation window: last 5 minutes
Notify: @on-call-engineer PagerDuty
```

### Tagging Strategy for QA Environments

Datadog tags are `key:value` pairs attached to metrics, logs, traces, and monitors. A consistent tagging strategy is critical — without it, you cannot filter by environment, team, or service.

Recommended minimum tag set for QA environments:

| Tag | Values | Purpose |
|---|---|---|
| `env` | `production`, `staging`, `qa`, `dev` | Isolate environments in every query |
| `service` | `checkout-api`, `payment-service`, etc. | Match APM service names exactly |
| `version` | `1.4.2`, `commit-sha` | Correlate issues to deployments |
| `team` | `payments`, `checkout`, `platform` | Route alerts to the right team |
| `test_env` | `ephemeral`, `shared-staging` | Distinguish ephemeral PR envs from shared staging |

Tags propagate from the Datadog Agent config or from the application instrumentation (`dd-trace`). If a client's staging environment has the wrong `env` tag, your queries will silently mix production and staging data — always verify the tag on day one.

---

## Using Datadog During a Performance Test

Performance testing without observability is incomplete. Datadog gives you real-time insight into exactly what the system does under load.

### Pre-Test Setup

1. Identify the services under test. Confirm their APM `service` names.
2. Open a Datadog dashboard pinning: request rate, error rate, p95 latency, CPU, memory.
3. Set the time picker to `Live` (auto-refresh every 10s).
4. Open Log Management with a saved view: `env:staging status:error`.
5. Open APM > Services for each service under test.

### During the Test

Watch four signals simultaneously:

**1. Request rate** — confirms load is actually reaching the service. If k6 is sending 100 VUs but Datadog shows 20 req/s, something is absorbing traffic upstream (load balancer, CDN).

**2. Error rate** — the primary quality signal. Any climb above baseline (typically <0.1%) is worth noting. A sudden spike often corresponds to a queue filling or a downstream service falling over.

**3. p95 latency** — user experience signal. p50 can look fine while p95 degrades; Datadog shows both on the same chart.

**4. APM waterfall for slow requests** — filter APM traces by `duration:>2s` during the test run. These are your outliers. Click through to see which downstream call is responsible.

### APM Waterfall for Root Cause

When k6 reports a latency spike, go to APM and filter:

```
service:checkout-api env:staging duration:>3s @http.method:POST @http.url:/api/checkout
```

Open the slowest trace. The flame graph will show whether the bottleneck is:
- Database (wide `db.query` span, often a missing index or lock contention)
- Downstream service (wide span for a dependency)
- The service itself (CPU-bound, serialisation cost)

This is faster than reading logs and more precise than aggregate metrics.

### Post-Test Comparison

After a performance test, use Datadog's comparison mode: set the comparison baseline to the previous test window. The metric graphs overlay both runs, highlighting regressions immediately.

---

## Datadog vs Grafana/Prometheus Stack

Most clients have either Datadog or a self-hosted Grafana/Prometheus/Loki stack. Understanding the trade-off helps you set expectations.

| Dimension | Datadog | Grafana + Prometheus + Loki |
|---|---|---|
| **Setup cost** | Near-zero (SaaS, Agent install) | High (manage infra, configure scrapers, build dashboards from scratch) |
| **Ongoing maintenance** | Datadog's problem | Your team's problem |
| **APM** | Best-in-class UX, auto-instrumentation, service map out of the box | Jaeger or Tempo; good but requires more configuration |
| **Log search UX** | Polished, fast, faceted | Loki LogQL is powerful but less discoverable |
| **Custom metrics** | $0.05/metric/month — expensive at scale | Effectively free (just storage cost) |
| **Alerting** | Strong, composite monitors, good integrations | Grafana Alerting or Alertmanager; works but more setup |
| **Cost at scale** | Very expensive (see pricing section) | Mostly infrastructure cost; predictable at scale |
| **Multi-cloud** | Native integrations for AWS/GCP/Azure | Works anywhere, no vendor tie-in |
| **CI Visibility / Synthetics** | Included products | No direct equivalent out of the box |
| **When Datadog wins** | Startups and enterprises wanting operational simplicity, unified platform, and budget for it | |
| **When Grafana/Prometheus wins** | High-volume metrics where custom metric cost is prohibitive, open-source shops, Kubernetes-native teams | |

As a QA consultant: Datadog wins on speed and UX. If you're spending a week on a client engagement, Datadog gives you insights in minutes that Grafana/Prometheus would take hours to extract. For clients who have Prometheus/Grafana, Datadog Synthetics is still valuable as a standalone purchase without the rest of the platform.

---

## Pricing Model Basics

Datadog pricing is complex and often the source of budget shock. Key concepts:

**Infrastructure (metrics):**
- Billed per host per month (a "host" is any EC2 instance, container, or VM running the Datadog Agent)
- Kubernetes: billed per node, not per pod — a 50-node cluster is 50 hosts regardless of how many pods run
- $23/host/month (Pro) or $34/host/month (Enterprise) as rough guidance [unverified — confirm with Datadog sales for current rates]

**Custom metrics:**
- A "custom metric" is any metric not from a standard Datadog integration (e.g., your own `checkout.cart.value` histogram)
- Billed at roughly $0.05 per custom metric per month
- A single histogram with 3 aggregations (p50/p95/max) and 5 tag combinations = 15 custom metric "series"
- Custom metric costs have caused significant billing surprises — client teams sometimes emit thousands of custom metrics unknowingly from badly scoped tags

**Log Management:**
- Billed on ingested volume (GB/month) and retained volume
- $0.10/GB ingested, then storage based on retention period [unverified]
- High-volume log environments (>100GB/day) are often the biggest Datadog cost item

**Synthetics:**
- Billed per test run — API tests and browser tests have different rates
- Private Location worker is free; you pay for the runs that use it

**What this means for QA:**
- Don't add custom metrics carelessly — coordinate with the platform team
- Don't enable high-cardinality tags (user IDs, session tokens) on metrics
- Performance test environments with high request rates generate a lot of APM traces — clients may have trace sampling enabled (only ingest 1-10% of traces) to control cost

---

## Getting Started as a QA Engineer on a New Client

### Day One Checklist

**Access:**
- Request read-only Datadog access (most clients restrict write access — you likely won't create monitors or dashboards until trusted)
- Confirm which Datadog site: `datadoghq.com` (US) or `datadoghq.eu` (EU), `us3.datadoghq.com`, etc. — the URL matters for SSO
- Check if the client has multiple organisations (large enterprises often have prod/non-prod Datadog orgs)

**Orient:**
- APM > Service Map — learn the architecture in 5 minutes
- Infrastructure > Hosts — see what's running and confirm `env` tag values
- Log Management — run `env:production status:error` for the last hour. Zero errors = healthy or no logging. 10,000 errors = something is wrong

**Find the important resources:**
- Ask the platform team for their main production dashboard URL — every mature Datadog client has one
- Ask what monitors exist for the services you're testing — knowing what already alerts helps you calibrate severity
- Find out if there's a Synthetics suite and when it last failed

**Confirm tagging for your test environment:**
- Run `env:staging` in Infrastructure and confirm staging hosts appear
- Run `env:staging` in APM and confirm you see traces
- If staging uses `env:qa` or `env:test`, adjust all your queries

### Useful Saved Searches to Create

```
# Staging errors in the last hour
service:* env:staging status:error @http.status_code:[500 TO 599]

# 5xx errors in production (for comparison)
service:* env:production status:error @http.status_code:[500 TO 599]

# Slow queries during load test
service:* env:staging @db.statement:* duration:>500ms
```

---

## Key Connections

- [[observability/platforms]] — platform comparison covering Langfuse, LangSmith, Arize (Datadog is the traditional observability equivalent)
- [[observability/tracing]] — OTel semantic conventions; Datadog traces follow the same concepts but use `dd-trace` SDK
- [[technical-qa/test-observability]] — full test observability pattern; Datadog CI Visibility is the SaaS version of the self-hosted PostgreSQL approach described there
- [[technical-qa/performance-testing]] — k6 and load testing methodology; Datadog is the live monitoring layer during k6 execution
- [[qa/production-monitoring-qa]] — synthetic monitoring and SLO tracking; Datadog Synthetics implements these patterns as a managed service
- [[cs-fundamentals/observability-se]] — structured logging, metrics, traces — the theory; Datadog is one implementation
- [[cloud/cloud-monitoring]] — CloudWatch, Prometheus/Grafana comparison; Datadog occupies the same space with more polish and higher cost

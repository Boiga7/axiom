---
type: entity
category: observability
tags: [datadog, monitoring, apm, logs, metrics, synthetic-testing]
sources: []
updated: 2026-05-04
para: resource
tldr: Unified SaaS observability platform correlating metrics, distributed traces, logs, and synthetic tests across multi-cloud stacks — strongest when cross-service correlation and zero operational overhead outweigh the per-host cost.
---

# Datadog

Datadog is a unified cloud observability and security platform that consolidates metrics, distributed traces, logs, synthetic monitoring, real user monitoring (RUM), and application security into a single SaaS product. It targets organisations running multi-cloud, containerised, or microservice workloads where correlating signals across infrastructure layers is the primary challenge.

Related: [[platforms]], [[tracing]], [[cloud-monitoring]], [[slo-sla-quality]], [[performance-testing]]

---

## What Datadog Is

Datadog ingests telemetry from every tier of a stack — hosts, containers, serverless functions, databases, CDNs, third-party SaaS — and presents it through a unified query layer and timeline. The value proposition is correlation: a spike in error rate on an APM service map links directly to the underlying host metric, the specific log lines, and the deployment event that preceded it. This is the capability that makes Datadog compelling for QA teams: you can anchor a performance test run to a precise wall-clock window, then drill through all four telemetry pillars without switching tools.

The platform is commercial SaaS (NYSE: DDOG). There is no free self-hosted tier. Pricing is host-based with per-feature add-ons, which is the primary objection in client cost conversations (see Pricing section).

---

## Core Data Types

### Metrics

Datadog supports four metric types, each stored as a time series:

- **Gauge** — a value at a point in time (CPU utilisation, memory usage, active connections). The last value wins within a flush interval. Use for measurements that can go up or down.
- **Count** — increments within a flush interval (request count, error count). Reset to zero each flush. Use for events you want to sum.
- **Rate** — a count normalised per second. Datadog computes this from counts automatically; you can also submit rates directly.
- **Histogram** — a distribution of values (response time, payload size). Datadog computes p50, p75, p95, p99, max, avg, and count from each histogram submission. This is the primary metric type for latency tracking in performance test runs.

Custom metrics are the most significant cost driver. Every unique `{metric_name, tag_set}` combination counts as one custom metric. A histogram with five tags that each have five values produces 5^5 = 3,125 custom metrics before Datadog's distribution aggregation. Design tag cardinality carefully.

### Traces (APM)

A trace is a directed acyclic graph of spans representing a single request through a distributed system. Each span captures:

- Service name and resource name (e.g., `orders-service`, `POST /orders`)
- Start time, duration
- Status (ok / error / unset)
- Tags (key-value pairs, max 256 per span)
- Parent span ID (enabling tree reconstruction)

Datadog's APM ingests traces and builds a service map automatically — no manual topology declaration required. The service map is the primary navigation tool when triaging a load test: start at the slow or erroring service, then trace upstream to find the bottleneck.

### Logs

Logs are indexed, searchable text records. Datadog can ingest structured JSON (each field becomes a facet) or unstructured text (parsed via Grok pipelines). Logs are stored separately from metrics and traces but linked via trace IDs and host tags, enabling trace-to-log correlation in one click from the APM trace view.

Log management has its own retention model (default 15 days for indexed logs) and is one of the three major cost line items alongside host count and custom metrics.

### Events

Events are discrete occurrences that overlay on dashboards: deployments, alerts firing, config changes, CI pipeline runs. They provide the "what changed" context next to "what metrics changed." In QA workflows, marking a test run start/end as an event is how you anchor a dashboard view to a specific test window.

---

## Datadog Agent

The Datadog Agent is an open-source Go binary that runs on each monitored host (physical, VM, or container). It handles:

1. **Host-level collection** — CPU, memory, disk, network metrics from the OS. Collected every 15 seconds by default.
2. **Integration checks** — pre-built integrations for Postgres, Redis, Nginx, Kafka, and 800+ other services. Each integration runs as a Python check in the Agent's embedded interpreter.
3. **Log tailing** — tails log files or Docker stdout/stderr and ships to Datadog's log backend.
4. **APM trace collection** — listens on `localhost:8126` (HTTP) or a Unix socket; application libraries send traces here.
5. **Process collection** — live process list with CPU/memory per PID, used for container-level visibility.

### DogStatsD

DogStatsD is a StatsD-compatible server embedded in the Agent, listening on UDP port `8125`. Applications submit custom metrics by sending UDP datagrams:

```
metric.name:value|type|@sample_rate|#tag1:value1,tag2:value2
```

Example for a test run duration:

```
test.suite.duration_ms:4523|h|#suite:checkout,env:staging
```

DogStatsD is the lowest-overhead custom metric path. It is fire-and-forget UDP — no response, no connection state. For high-frequency metric submission from a load test driver, this is preferable to the HTTP API.

### Container-Level Collection

In Kubernetes, the Agent runs as a DaemonSet with one pod per node. The Cluster Agent (a separate deployment) handles cluster-level resources (Deployments, ReplicaSets, HPA status) and forwards them to node-level Agents. The Admission Controller injects APM library init containers into application pods automatically when `admission.datadoghq.com/enabled: "true"` is set on the namespace.

---

## APM Setup

### Auto-instrumentation vs Manual Instrumentation

**Auto-instrumentation** uses language-specific libraries that monkey-patch popular frameworks at startup:

- Python: `ddtrace-run python app.py` or `DD_TRACE_ENABLED=true` with `ddtrace` library
- Java: `-javaagent:/path/to/dd-java-agent.jar` JVM flag
- Node.js: `node --require dd-trace/init app.js`

Auto-instrumentation covers web frameworks (Flask, Django, FastAPI, Spring, Express), database drivers, HTTP clients, and message queue consumers. It requires zero code changes and is the recommended starting point.

**Manual instrumentation** is needed for custom business logic spans:

```python
from ddtrace import tracer

with tracer.trace("test.checkout_flow", service="e2e-runner", resource="full_checkout") as span:
    span.set_tag("test.name", "checkout_happy_path")
    span.set_tag("test.suite", "checkout")
    span.set_tag("env", "staging")
    run_checkout_flow()
```

### Trace Sampling Strategies

Datadog uses head-based sampling at ingestion and tail-based sampling (Intelligent Ingestion) at the Agent.

- **Head-based** — the decision is made at the root span. The sampling rate applies to all spans in the trace. Default is 100% for low-traffic services; automatically reduced under high traffic.
- **Priority sampling** — traces are tagged with a priority (`AUTO_KEEP`, `AUTO_REJECT`, `USER_KEEP`, `USER_REJECT`). Setting `USER_KEEP` on a span forces the entire trace to be retained. Use this for test runs you must not lose.
- **Intelligent Ingestion** (Agent-side) — the Agent applies a per-service rate limit (default 200 traces/second) while preserving 100% of error traces and slow traces. This is the production default.

For load tests, force `USER_KEEP` on the root span of each virtual user session so traces are never dropped during the high-ingestion window.

### Span Tags for QA

Standard span tags that make traces navigable during QA activities:

| Tag | Purpose |
|---|---|
| `test.name` | Name of the individual test case |
| `test.suite` | Test suite or feature area |
| `test.type` | `browser`, `api`, `load`, `unit` |
| `test.status` | `pass`, `fail`, `skip` |
| `error.type` | Exception class name |
| `error.message` | Exception message |
| `error.stack` | Full stack trace (truncated to 4096 chars) |
| `env` | `staging`, `production`, `load-test` |
| `version` | Application version under test |

Datadog CI Visibility (see below) uses the `test.*` tag conventions natively. If you emit spans with these tags outside CI Visibility, they appear in APM but not in the test analytics UI.

---

## Dashboards

Datadog has two dashboard types, though the distinction has blurred over time.

### Timeboard

A timeboard is time-synchronized: all widgets share the same time range and zoom level. Scrolling changes all graphs simultaneously. This is the default for operational dashboards — you want to see CPU, latency, and error rate for the same window.

For load test analysis, create a timeboard anchored to the test run window. Add:

- APM p99 latency by service
- Infrastructure CPU/memory by host
- Custom k6 or JMeter metrics (if exported via DogStatsD)
- Error count by status code
- Database query time by query signature

### Screenboard

A screenboard is a free-form canvas where each widget has an independent time range. Useful for status boards and executive dashboards where mixing "last 1 hour" KPIs with "last 7 days" trend lines is intentional.

### Template Variables

Template variables are dashboard-level filters that dynamically scope all widgets. Example: a `$env` variable set to `staging` filters every query in the dashboard to `env:staging`. In QA dashboards, add `$version` and `$test_suite` as template variables so a single dashboard serves every release.

### Composite Graphs

A composite graph combines two metrics into a single formula. Example:

```
(test_errors / total_requests) * 100
```

Composite graphs are essential for SLO error rate widgets and for normalising load test metrics by VU count.

### SLO Widgets

Dashboard widgets can embed SLO status, error budget remaining (as a percentage and as a time window), and burn rate. These are the primary artefacts for client-facing quality reporting.

---

## Monitors

A monitor is an alert condition evaluated on a rolling time window. Datadog evaluates monitors every minute.

### Metric Monitors

Alert on a threshold applied to a metric query:

```
avg(last_5m):avg:trace.flask.request.duration{service:orders,env:production} > 0.5
```

Common monitor types:
- **Threshold** — fires when a value crosses a static threshold
- **Change** — fires when a value changes by X% over a time window (useful for post-deploy regression)
- **Anomaly** — fires when a value deviates from a seasonally-adjusted baseline (Datadog computes the baseline using DBSCAN)
- **Forecast** — fires when a projected trend is heading toward a threshold

### APM Monitors

APM monitors query the trace analytics store directly. They can alert on:
- Service-level p99 latency
- Error rate per service/resource
- Apdex score (configurable frustration threshold)

APM monitors are generally more reliable than metric-based latency alerts because they operate on the span store rather than aggregated metrics, preserving full distribution fidelity.

### Composite Monitors

A composite monitor combines two or more monitors with boolean logic:

```
monitor_A && monitor_B && !monitor_C
```

Use case: alert only when high error rate (A) AND deployment event in last 15 minutes (B) AND not during scheduled maintenance (C). This pattern reduces alert fatigue significantly.

### Alert Routing

Notifications route via `@mention` syntax in the alert message body:

- `@slack-channel` — posts to a Slack channel via the Datadog-Slack integration
- `@pagerduty` — triggers a PagerDuty incident
- `@email@domain.com` — direct email
- `@webhook-name` — calls a registered webhook (useful for JIRA ticket creation or custom notification pipelines)

Monitor message templates support variables:

```
{{#is_alert}}
Service {{service.name}} p99 latency is {{value}}s — exceeds SLO threshold.
Runbook: https://runbooks.internal/latency
{{/is_alert}}
```

### Downtime Scheduling

Downtime silences monitors during known maintenance windows. It can be scheduled as one-time or recurring (cron-style). In QA pipelines, schedule a downtime scoped to `env:load-test` during test runs to suppress false-positive alerts.

---

## Synthetic Monitoring

Datadog Synthetics runs automated tests from Datadog's managed global probe network (70+ locations) or from private locations (Agent-hosted runners inside your network). It is the closest Datadog offering to a dedicated test automation platform.

### Browser Tests

Browser tests record user flows using a Selenium-like recorder in the Datadog UI. Under the hood, they run on Chrome via Playwright (Datadog does not expose the underlying driver version publicly). Each step asserts:

- Element visibility or text content
- JavaScript expression result
- Response time threshold
- Screenshot diff against a baseline

Browser tests generate full video recordings and waterfall network traces on failure, making root-cause diagnosis faster than a bare Playwright test that only captures a screenshot.

**Limitations for QA engineers:**
- The recorder produces a linear step sequence; conditional branching requires JavaScript assertions
- Reusable sub-flows (Datadog calls them "sub-tests") work but are less composable than a Page Object Model
- Test data parameterisation (running the same test with multiple data sets) requires the Global Variables feature or external data injection via the API

### API Tests

API tests are HTTP/gRPC/TCP/DNS/SSL tests with no browser context. They support:

- Single-step tests (one request, assertions on status, body, headers, timing)
- Multi-step API tests — a sequence of HTTP calls where variables extracted from one response (via regex or JSONPath) are injected into the next request. This is the Datadog equivalent of a Postman collection run.

Multi-step API tests are the right choice for testing API workflows (auth to fetch resource to mutate to verify) in synthetic monitoring. They run faster than browser tests and are cheaper.

### Continuous Testing in CI/CD

The Datadog CI integration (`@datadog/datadog-ci` npm package or `datadog-ci` binary) allows triggering synthetic tests from a pipeline and blocking the pipeline on failure:

```yaml
# GitHub Actions example
- name: Run Datadog synthetic tests
  run: |
    datadog-ci synthetics run-tests \
      --config datadog-ci.json \
      --tunnel
  env:
    DATADOG_API_KEY: ${{ secrets.DD_API_KEY }}
    DATADOG_APP_KEY: ${{ secrets.DD_APP_KEY }}
```

The `--tunnel` flag routes test traffic through the CI runner rather than from Datadog's public probe locations, enabling tests against ephemeral staging environments with no public DNS entry.

The `datadog-ci.json` configuration specifies which tests to run (by public ID or tag), timeout, and retry settings. On failure, the CLI exits non-zero, blocking the pipeline.

This pattern implements shift-right testing: the same synthetic test that monitors production is the acceptance gate before a deployment reaches production.

---

## Log Management

### Facets

A facet is an indexed attribute in a log — a field that can be used for filtering, grouping, and visualisation. Facets are declared in the Logs configuration UI. Every JSON field in a log can become a facet, but Datadog charges for high-cardinality indexed fields beyond the standard allotment.

Standard facets are auto-populated (service, host, status, env). Custom facets require explicit declaration. In QA contexts, declare `test.name`, `test.suite`, and `test.run_id` as facets to enable log filtering by test run.

### Log Pipelines

A pipeline is an ordered list of processors applied to incoming logs before indexing:

1. **Grok parser** — extracts structured fields from unstructured log lines using Grok patterns (similar to Logstash Grok). Example: parse `[2026-05-03 14:22:01] ERROR orders - timeout after 5.2s` into `timestamp`, `level`, `service`, `message`, `duration_s` fields.
2. **Attribute remapper** — renames extracted fields to Datadog's reserved attribute names (`status`, `service`, `trace_id`).
3. **URL parser** — automatically parses URL strings into scheme, host, path, and querystring components.
4. **User-agent parser** — extracts browser, OS, and device from `User-Agent` headers.
5. **Category processor** — assigns a category value based on a filter query (equivalent to a CASE statement in SQL).
6. **Arithmetic processor** — computes a new field from arithmetic on existing numeric fields.

Pipelines process logs in order. Only the first matching pipeline runs per log; subsequent pipelines are skipped unless the "Merge all matching pipelines" option is enabled.

### Log-to-Metrics

Log-based metrics generate a metric from a log filter query without storing the underlying log (avoiding log ingestion cost). Example: generate `test.assertion_failure.count` by filtering logs where `test.status:fail` and counting. The metric is then available in dashboards and monitors like any other metric.

This is useful when you want to alert on test failure rates but cannot afford to index all test logs.

### Log Archives

Logs can be archived to S3, Azure Blob, or GCS in compressed JSON or CSV format for long-term retention beyond the 15-day default. Archive queries (Rehydration) re-index archived logs into the live query interface on demand, at extra cost. Useful for compliance or post-incident investigation beyond the retention window.

---

## SLO Objects in Datadog

Datadog SLOs are first-class objects, not just dashboard calculations.

### Metric-Based SLOs

Defined as a ratio of two metric queries:

```
Good events / Total events >= target%
```

Example for an API endpoint:

```
Good:  sum:trace.django.request.hits{http.status_code:<500,env:production}.as_count()
Total: sum:trace.django.request.hits{env:production}.as_count()
Target: 99.5% over 30 days
```

Metric-based SLOs have higher precision (sub-minute calculation windows) but require that both numerator and denominator metrics exist and are well-defined.

### Monitor-Based SLOs

A monitor-based SLO wraps an existing monitor. The SLO calculates uptime as the fraction of time the monitor was in a non-alert state:

```
Uptime = (time monitor was OK) / (total window) >= 99.9%
```

Monitor-based SLOs are faster to set up but have a 1-minute resolution floor (because monitors evaluate every minute). They are suitable for availability SLOs but not for latency percentile SLOs.

### Error Budget Tracking

Datadog calculates the error budget remaining as:

```
Budget remaining = (actual uptime - target) / (1 - target) * 100%
```

When budget drops below a threshold (commonly 50% or 25%), a budget alert fires. Dashboard SLO widgets display budget remaining as a percentage and as a time window ("you can afford 21.6 more minutes of downtime this month").

### Burn Rate Alerts

A burn rate alert fires when the error budget is being consumed faster than a sustainable rate. Burn rate is expressed as a multiple of the sustainable rate:

- Burn rate 1 = consuming budget at exactly the pace that would exhaust it at the end of the window
- Burn rate 14.4 over 1 hour = exhausting one full hour of monthly budget in 5 minutes (paging severity)
- Burn rate 6 over 6 hours = medium urgency; worth a ticket

Datadog implements burn rate alerts as a composite of fast (1h window) and slow (6h window) burn rate monitors, following the Google SRE workbook multi-window approach.

---

## Datadog CI Visibility

CI Visibility (previously called CI Pipeline Visibility) connects test results directly to deployments and code changes. It has two sub-products:

### Pipeline Visibility

Ingests CI pipeline run data from GitHub Actions, GitLab CI, CircleCI, Jenkins, and others. Provides:

- Pipeline run duration trends over time
- Failure rate by pipeline stage
- Correlation between a failing pipeline and the upstream commit

### Test Visibility

Ingests individual test results from test frameworks. Supported natively: pytest, Jest, JUnit, RSpec, NUnit, xUnit, Mocha. Test results are linked to the git commit, branch, and pipeline run.

Features:

- **Flaky test detection** — tracks pass/fail outcomes per test over time and calculates a flakiness score. Tests with high flakiness appear in the "Flaky Tests" list with historical failure traces.
- **Test service map** — shows which services are exercised by which test suites, derived from APM trace correlation when `DD_TRACE_ENABLED=true` during test runs.
- **Test Impact Analysis** — uses code coverage data to determine which tests are affected by a specific code change. Only reruns affected tests on PRs, reducing CI time. Requires the `--ddtrace` pytest plugin with coverage mode.
- **Early Flake Detection** — new tests are run multiple times on first introduction to verify they are stable before being added to the main suite.

### JUnit XML Upload

For any framework not natively supported, CI Visibility accepts JUnit XML via `datadog-ci`:

```bash
datadog-ci junit upload \
  --service my-service \
  --env staging \
  results/junit.xml
```

The upload enriches test results with git metadata (commit SHA, branch, author) from the environment. Tags from the XML `<properties>` block are preserved as span tags.

---

## Integration with QA Tooling

### Playwright Test Reporter

The `datadog-playwright-reporter` npm package (or the `dd-trace` Node.js library with Playwright) sends test results to CI Visibility as spans. Each test becomes a span with:

- `test.name`, `test.suite`, `test.status`
- Screenshot attachment on failure
- Trace ID link (if the application under test is also instrumented)

Configuration in `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@datadog/datadog-playwright-reporter', {
      service: 'e2e-tests',
      env: process.env.ENV ?? 'staging',
    }],
  ],
});
```

### k6 Metrics Export

k6 does not natively support DogStatsD, but the `xk6-output-statsd` extension (or `xk6-datadog`) emits k6 metrics to the Agent. Run with:

```bash
k6 run --out statsd script.js
```

Standard k6 metrics (`http_req_duration`, `http_req_failed`, `vus`, `iterations`) appear in Datadog as custom metrics with the `k6.` prefix. Configure `K6_STATSD_ADDR`, `K6_STATSD_NAMESPACE`, and tag all metrics with a `run_id` tag so you can filter a specific test run in Datadog dashboards.

Keep k6 tags low-cardinality: use `scenario`, `endpoint`, and `run_id` rather than per-user or per-request identifiers to avoid custom metrics explosion.

### REST Assured / JUnit Integration (Java)

Java test runs with REST Assured submit results via the JUnit XML upload path. The `dd-java-agent` on the CI runner can also auto-instrument test framework execution to capture spans natively, removing the need for manual XML uploads.

---

## Practical QA Use Cases

### Correlating a Performance Test Run with APM Traces

**Workflow:**

1. Mark the test run start with a Datadog event:
   ```bash
   datadog-ci event create \
     --title "k6 load test started" \
     --tags "test_suite:checkout,env:staging,run_id:$RUN_ID"
   ```

2. Run the k6 test with DogStatsD output, tagging all metrics with `run_id:$RUN_ID`.

3. In Datadog, open the APM service map filtered to `env:staging`. The event appears as an overlay on the timeline.

4. Identify the slowest service during the test window (APM shows p99 latency by service). Click the service to see individual traces from within the test window.

5. Sort traces by duration. Open the slowest trace. The flame graph shows which span consumed the time — typically a database query or an external API call.

6. Navigate from the trace to the underlying log line (one click via the `trace_id` correlation) to see the exact SQL query or external response.

### Finding the Service Bottleneck During a Load Test

1. Define a performance baseline for each service: p99 latency at 100 VU, 500 VU, 1000 VU.
2. During the load test, open the APM service map. Services with latency above baseline appear highlighted.
3. Click the bottleneck service. The resource list shows which endpoint is slowest.
4. The trace view shows whether the latency is in application code (spans with no child spans) or propagated from a dependency (a long database or cache span).
5. The infrastructure tab on the service shows host CPU/memory during the test window — if a service is CPU-bound rather than I/O-bound, the fix is horizontal scaling, not query optimisation.

This triage workflow turns "the checkout is slow under load" into "the orders service is slow because the `SELECT * FROM order_items WHERE order_id = ?` query has no index on `order_id`" in under 15 minutes — which is the primary reason QA engineers should be comfortable with Datadog APM, not just test reporting.

---

## Pricing Model

Datadog pricing is host-based for core infrastructure monitoring and add-on-based for each product.

### Core Components

| Component | Billing unit | Approximate cost (2025) |
|---|---|---|
| Infrastructure (Pro) | Per host/month | $23/host |
| APM (Pro) | Per host/month | $40/host (includes infra) |
| Log Management | Per GB ingested + per GB indexed | $0.10/GB ingested; $2.55/GB indexed/month |
| Custom Metrics | Per metric/month (first 100 free) | $0.05/metric above 100 |
| Synthetic API Tests | Per 10,000 runs | $5 |
| Synthetic Browser Tests | Per 1,000 runs | $12 |
| CI Visibility | Per committer/month | $26 |

### Cost Control Considerations for Client Conversations

1. **Custom metrics explosion** — the single most common unexpected cost. Each `{metric, tag permutation}` is one custom metric. A k6 test exporting metrics with a `user_id` tag will produce millions of custom metrics. Always use low-cardinality tags.

2. **Log ingestion vs indexing** — you can ingest logs (for archiving and log-to-metric generation) without indexing them (paying for search). Pattern: ingest everything, index only `level:error OR level:warn` logs for real-time search. Use exclusion filters aggressively.

3. **APM host vs APM Fargate** — Fargate tasks are billed per task (not per host). At scale, this can exceed host-based pricing. Evaluate whether task count or host count is cheaper for your workload.

4. **Synthetic test frequency** — browser tests at 1-minute frequency from 5 locations = 5 x 60 x 24 x 30 = 216,000 runs/month = $2,592/month for one test. Most production synthetic tests run at 5-minute or 15-minute intervals.

5. **Free alternatives for cost reduction** — if a client needs only metrics and dashboards (no APM, no synthetics), the Grafana + Prometheus stack covers the use case at near-zero software cost. Datadog wins when log correlation, APM, and synthetic monitoring must be unified.

---

## Comparison with Grafana/Prometheus Stack

| Dimension | Datadog | Grafana/Prometheus |
|---|---|---|
| Setup time | Minutes (SaaS) | Days (self-managed) |
| Operational overhead | None | Significant (Prometheus storage scaling, Thanos/Cortex for HA) |
| APM | Native, excellent UI | Jaeger or Tempo; good but separate |
| Log management | Native | Loki; excellent but separate query language |
| Synthetic monitoring | Native browser + API tests | Grafana k6 Cloud (separate product), Blackbox Exporter for probes |
| Long-term metric storage | 15 months (Pro) | Configurable (Thanos, Cortex, VictoriaMetrics) |
| Custom dashboards | Excellent, fast | Excellent |
| Alerting | Monitors UI, composite logic | Alertmanager; powerful but less integrated |
| Cost at 50 hosts | ~$2,000/month (APM Pro) | <$200/month (infra, excluding team time) |
| Cost at 500 hosts | ~$20,000/month | ~$1,500/month |
| AI/ML anomaly detection | Watchdog (native), forecasting | Grafana Machine Learning (add-on) |
| On-prem deployment | No (SaaS only) | Yes |
| Compliance/data residency | EU region available | Full control |

**When Datadog wins:** teams without dedicated platform engineering capacity, organisations needing fast time-to-value, stacks with more than five microservices where cross-service correlation is the primary pain, regulated environments where the vendor handles reliability and retention SLAs.

**When Grafana/Prometheus wins:** cost-sensitive clients (especially startups or clients with 50+ hosts), organisations with existing platform engineering expertise, workloads with strict data residency requirements, clients already using Grafana for infrastructure and unwilling to pay APM add-on costs.

**When to recommend a hybrid:** use Prometheus/Grafana for infrastructure and application metrics, add Datadog Synthetics only for external synthetic monitoring (the cheapest Datadog entry point), and use Grafana k6 Cloud for load testing. This pattern gives clients synthetic monitoring without the full Datadog cost structure.

---

## Quick Reference

### Agent Install (Ubuntu)

```bash
DD_API_KEY=<key> DD_SITE="datadoghq.com" bash -c \
  "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)"
```

### Python APM Quick Start

```bash
pip install ddtrace
DD_SERVICE=my-service DD_ENV=staging ddtrace-run python app.py
```

### DogStatsD Custom Metric (Python)

```python
from datadog import initialize, statsd

initialize(statsd_host='localhost', statsd_port=8125)
statsd.histogram('test.suite.duration_ms', 4523, tags=['suite:checkout', 'env:staging'])
```

### Force Trace Retention (Python)

```python
from ddtrace import tracer
from ddtrace.constants import USER_KEEP

with tracer.trace("load_test.session") as span:
    span.context.sampling_priority = USER_KEEP
    run_user_session()
```

### Mark Test Run as Datadog Event (CLI)

```bash
datadog-ci event create \
  --title "Performance test started: checkout suite" \
  --tags "env:staging,suite:checkout,run_id:${RUN_ID}" \
  --alert_type info
```

---

## Connections

- [[observability/tracing]] — OpenTelemetry conventions and auto-instrumentation that feed Datadog APM
- [[observability/platforms]] — broader platform comparison including Langfuse, LangSmith, and Arize
- [[cloud/cloud-monitoring]] — CloudWatch, Prometheus/Grafana, and PromQL as alternatives to Datadog
- [[technical-qa/performance-testing]] — k6 scenarios and DogStatsD export for load test observability
- [[qa/slo-sla-quality]] — SLO definitions and error budget policy that Datadog's SLO objects implement
- [[test-automation/playwright]] — Playwright reporter integration for sending E2E test results to CI Visibility

## Open Questions

- How does Datadog's custom metrics cost model behave at scale when k6 or distributed tracing produce high-cardinality tag sets — and what is the practical ceiling before Prometheus/Grafana becomes cheaper?
- Does Test Impact Analysis reliably reduce CI time on large monorepos, or does the coverage instrumentation overhead negate the savings?
- What is the recommended data residency strategy for EU-regulated clients who need Datadog's APM but cannot send traces outside a specific region?

## See Also

- [[observability/platforms]] — comparison of Langfuse, LangSmith, Arize, Helicone
- [[observability/tracing]] — OpenTelemetry conventions, auto-instrumentation
- [[cloud/cloud-monitoring]] — CloudWatch, Prometheus/Grafana, PromQL, SLO patterns
- [[technical-qa/performance-testing]] — k6 scenarios, thresholds, CI integration
- [[qa/production-monitoring-qa]] — synthetic monitoring, SLO definition, error budget alerting
- [[technical-qa/test-observability]] — test_runs schema, pytest plugin, Datadog CI Visibility YAML setup
- [[qa/slo-sla-quality]] — SLO definitions, error budget policy, stakeholder reporting

---
type: concept
category: cloud
para: resource
tags: [monitoring, observability, cloudwatch, prometheus, grafana, alerting, sli, slo]
sources: []
updated: 2026-05-01
---

# Cloud Monitoring

Observability for cloud infrastructure. You cannot improve what you cannot measure. The three pillars: metrics (what is happening), logs (why it happened), traces (where time was spent). Alerting closes the loop — tells you when something needs attention.

---

## The Three Pillars

| Pillar | What it answers | Examples |
|---|---|---|
| Metrics | Is the system healthy right now? | CPU %, request rate, error rate, p99 latency |
| Logs | What happened on this specific request? | Error messages, stack traces, audit events |
| Traces | Where did the time go across services? | Span per service: 12ms auth, 85ms DB, 2ms serialise |

---

## CloudWatch (AWS)

Every AWS service emits metrics automatically. Zero setup for basic monitoring.

**Namespaces**: `AWS/EC2`, `AWS/Lambda`, `AWS/RDS`, `AWS/ApplicationELB`, `AWS/ECS`.

```python
import boto3

cloudwatch = boto3.client("cloudwatch", region_name="eu-west-1")

# Put custom metric
cloudwatch.put_metric_data(
    Namespace="MyApp",
    MetricData=[{
        "MetricName": "OrdersProcessed",
        "Value": 42,
        "Unit": "Count",
        "Dimensions": [{"Name": "Environment", "Value": "production"}]
    }]
)
```

**CloudWatch Alarms** — trigger actions when a metric breaches a threshold.

```python
cloudwatch.put_metric_alarm(
    AlarmName="HighErrorRate",
    MetricName="5XXError",
    Namespace="AWS/ApplicationELB",
    Statistic="Sum",
    Period=60,
    EvaluationPeriods=3,        # breach 3 consecutive periods
    Threshold=10,
    ComparisonOperator="GreaterThanThreshold",
    AlarmActions=["arn:aws:sns:eu-west-1:123456789:alerts"],
)
```

**CloudWatch Logs Insights** — ad-hoc query language for log groups:

```
# Find errors in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

# p99 latency from structured logs
stats pct(@duration, 99) as p99, avg(@duration) as avg by bin(5m)
```

**Container Insights** — enhanced monitoring for ECS/EKS. Container-level CPU, memory, network metrics. Requires CloudWatch agent or Fluent Bit sidecar.

---

## Prometheus + Grafana (Self-managed / Kubernetes)

The open-source standard for Kubernetes monitoring. Prometheus scrapes `/metrics` endpoints; Grafana visualises.

```yaml
# Prometheus scrape config (usually managed by kube-prometheus-stack Helm chart)
scrape_configs:
  - job_name: "my-api"
    static_configs:
      - targets: ["my-api-svc:8000"]
    metrics_path: /metrics
    scrape_interval: 15s
```

**PromQL** — Prometheus Query Language:

```promql
# Request rate (per second, 5-minute window)
rate(http_requests_total{job="my-api", status="200"}[5m])

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m]))

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

**Alertmanager** — routes alerts to Slack, PagerDuty, email. Deduplication and grouping prevent alert storms.

```yaml
# alertmanager.yml
route:
  receiver: slack-prod
  group_by: [alertname, cluster]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: slack-prod
    slack_configs:
      - api_url: $SLACK_WEBHOOK
        channel: "#alerts-prod"
```

**kube-prometheus-stack** Helm chart — installs Prometheus, Grafana, Alertmanager, and pre-built dashboards for Kubernetes in one command.

---

## Cloud-Native Alternatives

| Cloud | Metrics | Logs | Traces |
|---|---|---|---|
| AWS | CloudWatch Metrics | CloudWatch Logs | X-Ray |
| GCP | Cloud Monitoring | Cloud Logging | Cloud Trace |
| Azure | Azure Monitor | Log Analytics | Application Insights |

**AWS X-Ray** — distributed tracing for Lambda, ECS, EC2. Auto-instruments SDK calls. Use X-Ray SDK or OpenTelemetry (preferred — vendor-neutral).

**Google Cloud Operations Suite** — unified metrics, logs, traces, profiler under one UI. Strong Kubernetes integration.

---

## OpenTelemetry

Vendor-neutral observability standard. Instrument once, export to any backend (CloudWatch, Prometheus, Datadog, Honeycomb, Jaeger).

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

tracer_provider = TracerProvider()
tracer_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(tracer_provider)

tracer = trace.get_tracer("my-api")

def process_order(order_id):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        # ... business logic
```

---

## SLIs, SLOs, Error Budgets

The language of reliability agreements.

**SLI (Service Level Indicator)** — a metric that measures the aspect of service quality you care about.
- Availability SLI: `good_requests / total_requests`
- Latency SLI: `requests_under_200ms / total_requests`

**SLO (Service Level Objective)** — the target. "99.9% of requests succeed." This is your internal target, not your external SLA.

**Error budget** — `1 - SLO`. A 99.9% SLO means 0.1% of requests can fail = 43.8 minutes of downtime per month. Burn the error budget on risky releases. If budget is exhausted, freeze releases and stabilise.

```python
# Error budget calculation
slo_target = 0.999           # 99.9%
window_minutes = 30 * 24 * 60  # 30-day window
error_budget_minutes = (1 - slo_target) * window_minutes
# = 43.2 minutes
```

---

## Alerting Best Practices

| Principle | How |
|---|---|
| Alert on symptoms, not causes | CPU at 80% is a cause; error rate > 1% is a symptom |
| Tune alert thresholds | False alarms train people to ignore real ones |
| Every alert needs a runbook | "What do I do when this fires?" — document it |
| Use inhibition rules | Don't alert on downstream effects if the root cause is already firing |
| Multi-window, multi-burn-rate | Alert on fast burn (p99 spike) AND slow burn (error budget draining) |

**Runbook template:**
```markdown
## Alert: HighErrorRate

**When this fires:** Error rate > 1% for 5 minutes on production API.

**Step 1:** Check CloudWatch Logs — filter for ERROR in the last 10 minutes.
**Step 2:** Check recent deploys — was there a release in the last hour?
**Step 3:** Check database connection pool — CloudWatch metric: RDS FreeableMemory.
**Step 4:** If needed, rollback: `argocd app rollback my-api`

**Escalate to:** #platform-oncall if not resolved in 30 minutes.
```

---

## Dashboards

Good production dashboards have four panels per service (USE method):
1. **Utilisation** — CPU, memory, connection pool usage
2. **Saturation** — queue depth, thread pool wait time
3. **Errors** — 4xx rate, 5xx rate, exception count
4. **Request rate + latency** — p50, p95, p99 by endpoint

---

## Connections

- [[cloud/aws-core]] — CloudWatch native metrics for all AWS services
- [[cloud/gcp-core]] — Cloud Monitoring and Cloud Logging
- [[cloud/kubernetes]] — container-level metrics, pod health, HPA signals
- [[observability/platforms]] — AI/LLM-specific observability (Langfuse, LangSmith, Arize)
- [[cloud/cloud-networking]] — network metrics (bandwidth, latency, packet loss)

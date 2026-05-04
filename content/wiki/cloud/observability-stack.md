---
type: concept
category: cloud
para: resource
tags: [observability, prometheus, grafana, loki, tempo, opentelemetry, monitoring]
sources: []
updated: 2026-05-01
tldr: "The three pillars of observability: metrics (what's broken), logs (why it broke), traces (where it broke)."
---

# Observability Stack

The three pillars of observability: metrics (what's broken), logs (why it broke), traces (where it broke). A production observability stack combines Prometheus + Grafana + Loki + Tempo, wired together via OpenTelemetry.

---

## The Three Pillars

| Pillar | Tool | What it answers |
|---|---|---|
| Metrics | Prometheus + Grafana | Is the service healthy? What's the trend? |
| Logs | Loki + Grafana | What happened at time T? |
| Traces | Tempo + Grafana | Which service caused the latency? |

All three become more useful when correlated: click a Grafana metric spike → view Loki logs for that time window → click a trace ID to see the full request flow.

---

## kube-prometheus-stack (Helm)

The standard way to deploy Prometheus + Grafana + Alertmanager on Kubernetes.

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=changeme \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

Includes: Prometheus, Alertmanager, Grafana, node-exporter, kube-state-metrics, pre-built dashboards.

---

## Prometheus — Scraping and Recording Rules

```yaml
# prometheus-additional-scrape-configs.yaml
- job_name: myapp
  static_configs:
  - targets: ['myapp.default.svc:8080']
  metrics_path: /metrics
  scheme: http
  scrape_interval: 15s
```

```yaml
# recording rules — pre-compute expensive queries
groups:
- name: myapp.rules
  rules:
  - record: myapp:http_requests:rate5m
    expr: sum by (status_code) (rate(http_requests_total[5m]))

  - alert: HighErrorRate
    expr: myapp:http_requests:rate5m{status_code=~"5.."} / sum(myapp:http_requests:rate5m) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate — {{ $value | humanizePercentage }}"
```

---

## Loki — Log Aggregation

Loki stores logs with labels (not indexed content). Query with LogQL.

```bash
# Install Loki + Promtail
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=20Gi \
  --set promtail.enabled=true
```

```logql
# LogQL examples
{namespace="production", app="myapp"} |= "ERROR"

# Parse JSON logs and filter by field
{app="myapp"} | json | level="error" | duration > 1000ms

# Rate of errors per minute
sum(rate({app="myapp"} |= "ERROR" [1m]))
```

---

## Tempo — Distributed Tracing

```bash
helm install tempo grafana/tempo \
  --namespace monitoring \
  --set tempo.retention=336h    # 14 days
```

Configure as a Grafana data source, then correlate from Loki logs (trace ID in log line → jump to full trace).

---

## OpenTelemetry Collector

Central hub: receives traces/metrics/logs from apps, forwards to backends.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
  otlp/tempo:
    endpoint: http://tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, memory_limiter]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

---

## Instrumenting Python Apps

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Auto-instrument FastAPI + httpx
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317")))
trace.set_tracer_provider(provider)

FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()

# Manual spans
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process-order") as span:
    span.set_attribute("order.id", order_id)
    span.set_attribute("order.amount", amount)
    result = process(order_id)
    if result.error:
        span.set_status(trace.StatusCode.ERROR, result.error)
```

---

## Grafana Dashboards

```bash
# Import pre-built dashboards via ID
# 1860 — Node Exporter Full
# 15757 — Kubernetes cluster overview
# 13659 — Loki Logs
# 17346 — FastAPI Observability

# Export dashboard as JSON for GitOps
# Grafana UI: Dashboard → Share → Export → Save to file → commit to Git
# Use grafana-operator or ConfigMaps to manage dashboards as code
```

---

## Common Failure Cases

**Prometheus scrape target shows "context deadline exceeded" for high-cardinality services**
Why: the scrape timeout is shorter than the time required to collect all metrics from a service with very high label cardinality; the endpoint responds slowly when enumerating thousands of label combinations.
Detect: `prometheus_target_scrape_pool_exceeded_target_limit` metric rises; `kubectl logs prometheus-...` shows timeout errors on the affected job; the `/metrics` endpoint takes >10s to respond under load.
Fix: reduce cardinality by removing high-cardinality labels (user IDs, request IDs) from metric label sets; or increase `scrapeTimeout` in the job config; use recording rules to pre-aggregate expensive queries.

**Loki ingestion rejected with "entry out of order" errors**
Why: Promtail is shipping logs from multiple pods with diverging system clocks, or log lines include out-of-order timestamps, violating Loki's per-stream ordering requirement.
Detect: Promtail logs show `entry out of order for stream`; some log lines are missing from Loki queries; Promtail retry counter climbs.
Fix: enable `unordered_writes: true` in the Loki config (Loki 2.4+); ensure all nodes are NTP-synced; or configure Promtail to use ingestion time rather than the log line timestamp.

**OTel Collector drops spans under load due to `memory_limiter` triggering**
Why: the `memory_limiter` processor is configured with a limit lower than the actual memory consumed by the span batch buffer at peak traffic, causing the collector to refuse new data.
Detect: `otelcol_processor_dropped_spans` metric increases sharply at peak; collector logs show `Memory usage is above hard limit`; trace data gaps appear in Tempo.
Fix: increase the collector's memory limit and `limit_mib` in the `memory_limiter` config; scale the collector deployment horizontally if a single pod cannot handle peak throughput.

**Grafana dashboards show "no data" after Prometheus remote write is configured**
Why: Prometheus remote write and local storage are both active, but the Grafana data source is pointed at the remote write endpoint (e.g., Thanos/Cortex) while queries expect the local Prometheus API path.
Detect: the same PromQL query returns data in the Prometheus UI but "no data" in Grafana; checking the Grafana data source URL confirms it points to the wrong endpoint.
Fix: update the Grafana data source URL to match the actual query endpoint (local Prometheus at port 9090 vs. the remote write receiver's query frontend port).

## Connections
[[cloud-hub]] · [[cloud/cloud-monitoring]] · [[cloud/kubernetes]] · [[cloud/github-actions]] · [[observability/platforms]] · [[llms/ae-hub]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?

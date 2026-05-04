---
type: concept
category: cs-fundamentals
para: resource
tags: [observability, logging, metrics, tracing, opentelemetry, structured-logging]
sources: []
updated: 2026-05-01
tldr: "Instrumenting applications so you can understand their runtime behaviour without modifying code. The three pillars: logs, metrics, traces. Modern production systems are undebuggable without them."
---

# Observability for Software Engineers

Instrumenting applications so you can understand their runtime behaviour without modifying code. The three pillars: logs, metrics, traces. Modern production systems are undebuggable without them.

---

## The Three Pillars

```
Logs:    Discrete events. What happened? (request received, error occurred)
         Best for: debugging specific incidents, auditing, detailed context

Metrics: Aggregates over time. How much? How fast? How many?
         Best for: alerting, dashboards, capacity planning, SLOs

Traces:  Request paths through services. Where was time spent?
         Best for: latency debugging, service dependency mapping, N+1 detection
```

---

## Structured Logging

```python
# app/logging_config.py
import structlog
import logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,         # thread-local context
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.CallsiteParameterAdder([    # file + line number
            structlog.processors.CallsiteParameter.FILENAME,
            structlog.processors.CallsiteParameter.LINENO,
        ]),
        structlog.processors.JSONRenderer(),             # machine-readable output
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.WriteLoggerFactory(),
)

logger = structlog.get_logger()

# Usage — always log with context, never bare strings
logger.info("order_placed", order_id=order.id, user_id=user.id, total=order.total)
logger.error("payment_failed", order_id=order.id, error_code=resp.error_code,
             exc_info=True)

# Bind request context at middleware level — automatically in every log below
structlog.contextvars.bind_contextvars(
    request_id=request.headers.get("X-Request-ID"),
    user_id=user.id,
)
```

---

## Metrics with Prometheus

```python
# app/metrics.py
from prometheus_client import Counter, Histogram, Gauge, start_http_server

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=["method", "endpoint", "status"],
)

http_request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    labelnames=["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

active_connections = Gauge(
    "active_connections",
    "Currently open connections",
)

# FastAPI middleware to auto-instrument
from fastapi import Request
import time

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    http_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()
    http_request_duration.labels(
        method=request.method,
        endpoint=request.url.path,
    ).observe(duration)

    return response

# Expose metrics endpoint
@app.get("/metrics")
def metrics():
    from prometheus_client import generate_latest
    return Response(generate_latest(), media_type="text/plain")
```

---

## Distributed Tracing with OpenTelemetry

```python
# app/tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def configure_tracing(service_name: str, otlp_endpoint: str):
    provider = TracerProvider()
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Auto-instrument frameworks
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)
    HTTPXClientInstrumentor().instrument()

# Manual spans for business logic
tracer = trace.get_tracer(__name__)

async def checkout_order(order_id: str):
    with tracer.start_as_current_span("checkout_order") as span:
        span.set_attribute("order.id", order_id)

        with tracer.start_as_current_span("validate_inventory"):
            inventory_ok = await check_inventory(order_id)
            span.set_attribute("inventory.ok", inventory_ok)

        if not inventory_ok:
            span.set_status(trace.Status(trace.StatusCode.ERROR, "Insufficient inventory"))
            raise InsufficientInventoryError()

        with tracer.start_as_current_span("charge_payment"):
            result = await charge_payment(order_id)
            span.set_attribute("payment.transaction_id", result.transaction_id)
```

---

## Correlation IDs — Tying Logs, Metrics, Traces Together

```python
# Middleware to inject/forward correlation ID
import uuid
from opentelemetry import trace as otel_trace

@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    trace_id = format(otel_trace.get_current_span().get_span_context().trace_id, "032x")

    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        trace_id=trace_id,
    )

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Trace-ID"] = trace_id
    return response
```

---

## Alerting Rules (Prometheus)

```yaml
# alerts/application.yaml
groups:
  - name: application
    rules:
    - alert: HighErrorRate
      expr: |
        rate(http_requests_total{status=~"5.."}[5m])
        / rate(http_requests_total[5m]) > 0.01
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Error rate > 1% for {{ $labels.endpoint }}"

    - alert: SlowResponseTime
      expr: |
        histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "p95 latency > 500ms on {{ $labels.endpoint }}"

    - alert: ServiceDown
      expr: up == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.instance }} is down"
```

---

## Log Levels — When to Use What

```
DEBUG:   Verbose detail for development. Never in production by default.
         "Processing item 3 of 150"

INFO:    Normal operation milestones.
         "Order placed", "User authenticated", "Job started"

WARNING: Something unexpected but recoverable happened.
         "Payment retry attempt 2 of 3", "Cache miss, falling back to DB"

ERROR:   An operation failed. Requires investigation.
         "Payment charge failed", "DB connection lost"

CRITICAL: System-level failure. Usually triggers pager.
          "Cannot connect to database after 10 retries"
```

---

## Common Failure Cases

**Alert fires on every spike, team becomes desensitised (alert fatigue)**
Why: alert thresholds set too low (e.g., error rate > 0.1%) trigger on normal traffic variance; the team learns to ignore the pager and misses a real incident.
Detect: on-call engineers close alerts without investigation more than once per week; the same alert fires > 3 times without a correlated user impact.
Fix: raise the threshold and add a `for: 2m` duration requirement so transient spikes are ignored; ensure every alert has a runbook and a clear remediation path.

**High-cardinality label on a Prometheus metric causes memory explosion**
Why: using a user ID, request ID, or URL parameter as a label creates a unique time series per value; Prometheus keeps all active time series in memory.
Detect: Prometheus memory usage grows unboundedly; `prometheus_tsdb_head_series` reaches millions.
Fix: never use unbounded values (user IDs, UUIDs, raw URLs) as labels; use low-cardinality labels (endpoint path template, status code, method).

**Trace context not propagated across async boundaries**
Why: spawning a background task or thread without explicitly passing the OpenTelemetry context loses the parent span; the background work appears as a disconnected root trace.
Detect: traces in Jaeger/Tempo show orphaned spans with no parent; you cannot correlate a background job to the HTTP request that triggered it.
Fix: capture `opentelemetry.context.get_current()` before spawning the task and pass it explicitly; use `opentelemetry.context.attach()` inside the task.

**Metrics middleware using raw path causes cardinality explosion**
Why: using `request.url.path` as a label includes path parameters like `/users/abc123`, producing a unique series per entity.
Detect: Grafana dashboards show thousands of distinct `endpoint` values; the route `/users/{id}` appears as `/users/abc`, `/users/def`, etc.
Fix: use the route template (e.g., `/users/{id}`) not the resolved path; extract it from the framework's router metadata.

## Connections
[[se-hub]] · [[cloud/observability-stack]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/microservices-patterns]] · [[qa/qa-metrics]] · [[llms/ae-hub]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?

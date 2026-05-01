---
type: concept
category: cs-fundamentals
para: resource
tags: [logging, structured-logging, correlation-ids, pii, log-levels, observability, structlog]
sources: []
updated: 2026-05-01
---

# Logging Best Practices

Structured, queryable logs that help you debug production issues without drowning in noise.

---

## Log Levels and When to Use Them

```
DEBUG   — step-by-step execution details; only in development
          "Processing item 47 of 200"
          "Cache miss for key user:abc123"
          Never in production unless dynamically enabled for a session

INFO    — normal operational events; low-volume, high-signal
          "Order ord_abc123 placed by user usr_456"
          "Background job started: invoice_generation"
          Rule: if the system is working correctly, INFO tells you what it did

WARNING — something unexpected happened but the system recovered
          "Payment retry attempt 2/3 for order ord_abc"
          "Config key FEATURE_X not set, using default false"
          Not an error — worth investigating when aggregated

ERROR   — an operation failed; needs investigation
          "Payment failed for order ord_abc: card declined"
          "Database query timed out after 5s"
          Should trigger an alert if error rate exceeds threshold

CRITICAL — system is in a dangerous state; requires immediate action
          "Database connection pool exhausted"
          "Cannot write to disk — disk full"
          Should always page on-call
```

---

## Structured Logging with structlog

```python
import structlog
import logging

# Configure once at application startup
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,     # thread-local context
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.ExceptionRenderer(),
        structlog.processors.JSONRenderer(),          # machine-readable output
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

log = structlog.get_logger()

# Basic usage — keyword args become structured fields
log.info("order_placed", order_id="ord_abc123", user_id="usr_456", amount=49.99)
# → {"event": "order_placed", "order_id": "ord_abc123", "user_id": "usr_456", "amount": 49.99, ...}

# Bind context for a scope
order_log = log.bind(order_id="ord_abc123", user_id="usr_456")
order_log.info("payment_started")
order_log.info("payment_succeeded", amount=49.99)
order_log.error("notification_failed", exc_info=True)
```

---

## Correlation IDs

```python
# A correlation ID ties together all logs from a single request/job.
# Without it: impossible to find "all logs for this one failing request".

import uuid
from contextvars import ContextVar
import structlog

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")

# FastAPI middleware to inject correlation IDs
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class CorrelationIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Accept from upstream (load balancer, API gateway) or generate
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        correlation_id_var.set(correlation_id)

        # Bind to structlog context — auto-included in every log call
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            path=request.url.path,
            method=request.method,
        )

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response

# Now every log call in this request automatically includes correlation_id
log.info("processing_payment")
# → {"event": "processing_payment", "correlation_id": "abc-123-def", ...}
```

---

## PII Scrubbing

```python
import re

# Patterns to scrub before logging
PII_PATTERNS = [
    (re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'), "[CARD]"),
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
    (re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'), "[SSN]"),
    (re.compile(r'password["\s]*[:=]["\s]*\S+', re.IGNORECASE), "password=[REDACTED]"),
    (re.compile(r'(token|api_key|secret)["\s]*[:=]["\s]*\S+', re.IGNORECASE), r'\1=[REDACTED]'),
]

def scrub_pii(message: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        message = pattern.sub(replacement, message)
    return message

# structlog processor for PII scrubbing
def scrub_pii_processor(logger, method, event_dict: dict) -> dict:
    if "event" in event_dict:
        event_dict["event"] = scrub_pii(str(event_dict["event"]))
    # Scrub common field names
    for field in ("email", "card_number", "password", "token"):
        if field in event_dict:
            event_dict[field] = "[REDACTED]"
    return event_dict
```

---

## Log Query Patterns (CloudWatch Insights / Loki)

```
# CloudWatch Insights

# Find all errors for a specific order
fields @timestamp, event, error
| filter correlation_id = "abc-123"
| filter level = "error"

# Error rate per endpoint in the last hour
stats count(*) as errors by path
| filter level = "error"
| sort errors desc

# P95 latency by endpoint
stats pct(duration_ms, 95) as p95 by path
| sort p95 desc

# Loki LogQL (structlog JSON)
{app="order-service"} | json | level="error" | line_format "{{.event}} {{.order_id}}"

# Count errors by event type in last 15 minutes
sum by (event) (rate({app="order-service"} | json | level="error" [15m]))
```

---

## What Not to Log

```
Never log:
  - Passwords, tokens, API keys (even hashed)
  - Full credit card numbers (log last 4 only)
  - PII in raw form (email, phone, SSN) — redact or omit
  - Request/response bodies containing sensitive data
  - Cryptographic material (private keys, seeds)

Avoid:
  - DEBUG logs in production — high cost, low signal, PII risk
  - Logging inside tight loops — log the aggregate, not each iteration
  - Stack traces in INFO — reserved for ERROR and above
  - "Successfully completed X" on every success — only log failures + key events

Do log:
  - Every state transition (order_placed → payment_started → payment_succeeded)
  - Every external call with its result (db, API, cache hit/miss)
  - Every error with enough context to reproduce
  - Job start/end with duration and count
```

---

## Log Aggregation in CI/Production

```yaml
# docker-compose.yml — route logs to CloudWatch
services:
  api:
    image: myapp:latest
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/order-service
        awslogs-region: eu-west-1
        awslogs-stream-prefix: api

# ECS task definition — stdout → CloudWatch via awslogs driver
# structlog JSONRenderer ensures logs are machine-parseable
```

---

## Connections

[[cs-fundamentals/se-hub]] · [[cs-fundamentals/observability-se]] · [[cloud/infrastructure-monitoring]] · [[cs-fundamentals/api-security]] · [[web-frameworks/fastapi]] · [[cloud/lambda-powertools]]

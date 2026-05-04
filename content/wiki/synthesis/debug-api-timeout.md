---
type: synthesis
category: synthesis
para: resource
tags: [debugging, api, timeout, runbook, performance]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing intermittent or consistent API timeouts under load.
---

# Debug: API Timeout

**Symptom:** API calls timing out — intermittently under load, consistently on specific endpoints, or cascading across services.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Spiky latency under load | Downstream slow or retry storm |
| Gradual slowdown over time | DB pool exhaustion or resource saturation |
| Immediate timeout on every call | Misconfigured timeout or network failure |
| Only one endpoint affected | Slow query or missing index on that path |

---

## Likely Causes (ranked by frequency)

1. Downstream service slow or unresponsive
2. DB connection pool exhausted
3. Retry storm amplifying load
4. Missing or misconfigured timeout on the caller
5. Network latency spike (DNS, TLS, routing)

---

## First Checks (fastest signal first)

- [ ] Identify which service breaches timeout at p99 — is the slowness at the edge or deep in the chain?
- [ ] Confirm whether retry counts are elevated — are retries amplifying the original failure?
- [ ] Confirm whether requests are waiting on DB connections — are threads blocking on pool acquisition?
- [ ] Verify a timeout is set on every outbound call — missing timeout means hang under load, not fast fail
- [ ] Check network only if all above are clean — DNS resolution time, TLS handshake latency

**Signal example:** Retry spike on Service B + rising p99 on its downstream → retry storm triggered by a slow dependency, not Service B itself.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Cannot identify where latency occurs | [[observability/tracing]] |
| Retries amplifying the failure | [[cs-fundamentals/error-handling-patterns]] |
| DB pool wait time high | [[cs-fundamentals/database-transactions]] |
| Timeout at API gateway layer | [[cloud/aws-api-gateway]] |
| Missing timeout on gRPC calls | [[cs-fundamentals/grpc]] |
| Failure spreading across services | [[cs-fundamentals/distributed-systems]] |

---

## Fix Patterns

- Add timeout on every outbound call — ensure caller timeout is shorter than upstream timeout to prevent cascade
- Add circuit breaker on the slow dependency — open after 3-5 consecutive failures, not on first
- Reduce retries to 2-3 max — add exponential backoff with jitter to avoid thundering herd
- Increase DB pool size — only if DB CPU is not already saturated; otherwise fix the slow query first
- Isolate the slow dependency behind a queue — if synchronous response is not required

---

## When This Is Not the Issue

If all of these are true, the timeout is not a connection or retry problem:

- Latency is stable across all requests (no spikes)
- Retry counts are normal in logs
- All services show similar response time

Pivot to [[synthesis/request-flow-anatomy]] to trace where time is actually spent. The bottleneck is likely a slow query, a mis-sized instance, or serialisation overhead.

---

## Connections

[[synthesis/request-flow-anatomy]] · [[cs-fundamentals/error-handling-patterns]] · [[cs-fundamentals/distributed-systems]] · [[observability/tracing]] · [[cs-fundamentals/grpc]] · [[cloud/aws-api-gateway]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?

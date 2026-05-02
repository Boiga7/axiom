---
type: synthesis
category: synthesis
para: resource
tags: [system-design, distributed-systems, networking, debugging, architecture]
tldr: The full anatomy of a web request from user to database and back — where latency accumulates, where failures happen, and where retries apply.
updated: 2026-05-02
---

# Request Flow Anatomy

A single user action triggers a chain of hops. Most engineers know each hop in isolation. Knowing the full chain is what lets you debug production incidents, explain latency, and design for failure.

## The Full Path

```
User
 └─ DNS resolution
 └─ TLS handshake
 └─ CDN / Edge cache
 └─ Load balancer
 └─ API Gateway (auth, rate limiting, routing)
 └─ Application service
       ├─ Cache (Redis / Memcached)
       ├─ Message queue → Worker → Database
       └─ Primary database (read replica or primary)
 └─ Response serialisation
User
```

## Latency at Each Layer

| Layer | Typical latency | Notes |
|---|---|---|
| DNS (cold) | 10–50 ms | Cached: ~0 ms. TTL matters. |
| TLS (new session) | 30–100 ms | Resumed session: 1–10 ms |
| CDN hit | ~5 ms | Miss adds 50–200 ms to origin |
| Load balancer | 1–2 ms | Health checks run here |
| API Gateway | 2–10 ms | WAF, auth, rate limit add overhead |
| Redis cache hit | 0.1–1 ms | Miss means DB round trip |
| DB query (good) | 1–10 ms | Index hit, warm page cache |
| DB query (bad) | 100 ms – 10 s | Missing index, lock wait, full scan |
| Message queue → worker | 10 ms – minutes | Depends on consumer lag |

Latency compounds. A p99 of 200 ms at the service layer may arrive at the user as 600 ms once DNS, TLS, CDN miss, and a slow query are added.

## Failure Modes at Each Layer

**DNS**: NXDOMAIN (misconfigured record), propagation delay after DNS change, cache poisoning. Fix: low TTL during migrations, health-checked records.

**TLS**: Certificate expiry (set automated renewal), SNI mismatch, version negotiation failure. Fix: monitor cert expiry, pin minimum TLS version.

**CDN**: Stale cache after a deployment (purge strategy matters), origin timeout causing `504`, incorrect `Cache-Control` headers caching private data. Fix: cache-bust on deploy, set `Vary` headers correctly.

**Load balancer**: All instances marked unhealthy (bad health check threshold), connection draining not configured (in-flight requests dropped during deploy). Fix: health check should test a dependency-free path, configure drain timeout.

**API Gateway**: `429` rate limit (caller not handling backoff), auth token expiry mid-session, routing misconfiguration after new service deploy.

**Application service**: Unhandled exception, memory exhaustion (OOM kill), CPU saturation under load, dependency timeout not propagated correctly (returns `200` with error body instead of `502`).

**Cache**: Thundering herd on cold start (every request misses simultaneously), connection pool exhaustion, incorrect TTL causing stale data served as fresh.

**Database**: Lock contention on hot rows, connection pool exhaustion (service restarts faster than pool drains), disk full halting writes, replication lag causing stale reads on replica.

## Where Retries Apply

Retries are safe only when operations are **idempotent**. Retrying a non-idempotent write creates duplicate records.

- **Safe to retry**: reads, idempotent writes (PUT with same body), queue re-delivery with deduplication key
- **Not safe to retry without deduplication**: payments, order creation, email sending
- **Exponential backoff with jitter**: prevents retry storms. `delay = base * 2^attempt + random(0, jitter)`

A circuit breaker wraps a dependency: once error rate exceeds threshold, subsequent calls fail fast without hitting the dependency, preventing cascade failure. Reset after a probe succeeds.

## Reading Latency in Production

When a trace shows elevated p99:

1. Check each span's duration — where did time go?
2. Check for sequential calls that could be parallelised
3. Check DB query plans for the slow span
4. Check queue consumer lag if async steps are involved
5. Check for connection pool wait time (often invisible without instrumentation)

## Connections

- [[cs-fundamentals/distributed-systems]] — failure propagation, consistency models
- [[cs-fundamentals/error-handling-patterns]] — circuit breakers, retries, timeouts
- [[cs-fundamentals/observability-se]] — tracing the full chain
- [[cloud/cloud-networking]] — DNS, VPC, load balancer internals
- [[cs-fundamentals/debugging-systems]] — how to trace a failure through this chain
- [[cloud/cloud-native-patterns]] — 12-factor, health checks, graceful shutdown
- [[cs-fundamentals/caching-strategies]] — TTL, invalidation, stampede prevention
- [[cs-fundamentals/database-transactions]] — lock contention, isolation levels

## Open Questions

- What does the request flow look like for a streaming response (SSE / WebSocket) vs standard HTTP?
- How does service mesh (Istio, Linkerd) change visibility at each hop?
- At what layer should request deduplication live?

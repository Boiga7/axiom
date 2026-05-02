---
type: concept
category: cs-fundamentals
para: resource
tags: [debugging, observability, incident-response, distributed-systems, production]
tldr: Debugging as a first-class engineering skill — systematic elimination, correlation IDs, tracing across services, and reproducing production failures.
updated: 2026-05-02
---

# Debugging Systems

Debugging is the skill most paths skip because it is hard to teach in the abstract. It is also the primary skill senior engineers are judged on in interviews and incidents. The difference between a junior who looks at a symptom and a senior who finds the cause in ten minutes is a systematic approach, not more experience.

## The Mental Model: Eliminate, Do Not Guess

Form a hypothesis. Eliminate it. Form the next one.

When a system fails, the cause is always one of a small number of categories:

1. **Code change** — something deployed since it last worked
2. **Data issue** — bad input, schema mismatch, missing record
3. **Infrastructure** — network, disk, memory, CPU, a dependency down
4. **Timeout** — a call took longer than its caller was prepared to wait
5. **Downstream service** — your code is correct; something it calls is not

Before touching anything: "Did anything change?" A deploy, config change, traffic spike, or data migration in the last hour eliminates whole categories immediately.

## Correlation IDs

Every request entering your system should be assigned a unique trace ID. Every log line, every outgoing call, every DB query should include it.

```
request_id=4f2a-8b3c-19e0  service=orders  action=create  user_id=9921
request_id=4f2a-8b3c-19e0  service=inventory  action=reserve  item=SKU-44
request_id=4f2a-8b3c-19e0  service=inventory  error=timeout  duration_ms=5003
request_id=4f2a-8b3c-19e0  service=orders  action=compensate  reason=inventory_timeout
```

With this, a five-second search finds the full story. Without it, you are reading unrelated log lines in parallel and guessing at the relationship.

Pass the correlation ID across every service boundary: as an HTTP header (`X-Request-ID`, `traceparent`), in queue message metadata, and in every DB log.

## Reading Logs Under Pressure

When you arrive at an incident:

1. **Find the error** — the first HTTP 5xx, the first exception, the first timeout
2. **Get the trace ID** — every subsequent search filters on it
3. **Work backwards** — what was the call immediately before the error?
4. **Check the service before the failing one** — the error often originates upstream
5. **Check the timestamp** — is the error a recurring pattern or a one-off spike?

Pattern recognition:
- Error every N minutes → timer job, cron, or cleanup task
- Error correlated with traffic spike → resource exhaustion, pool limits
- Error on specific user IDs → data-specific edge case
- Error after deploy → regression; roll back while investigating

## Tracing a Request Across Services

Distributed tracing (OpenTelemetry, Jaeger, Zipkin, Langfuse for AI) creates a flame graph of the request across services. Each span records: service name, operation, start time, duration, parent span.

Reading a trace:
1. Find the root span (the outermost request)
2. Look for the span with the highest duration — that is where time went
3. Within that span, look for sequential calls that could run in parallel
4. Look for a span that ends abruptly without a child — that is where a timeout cut the chain

Without distributed tracing, reconstruct manually: find the trace ID, search logs in each service, order by timestamp, rebuild the sequence.

## Identifying Bottlenecks

Latency is additive. Work forward through the chain until you find the span that explains the total.

Common bottlenecks by type:

| Symptom | Likely cause |
|---|---|
| High p99, low p50 | Outlier queries or GC pauses |
| All requests slow | Shared resource saturated (DB, cache, network) |
| Slow after N minutes | Memory leak causing GC pressure |
| Slow under load only | Connection pool exhaustion |
| Slow for specific users | Data-dependent query (no index on user_id filter) |

For DB bottlenecks: `EXPLAIN ANALYZE` the slow query. Look for sequential scans where an index scan should be. Check for lock waits with `pg_stat_activity`.

## Reproducing Production Bugs Locally

Production bugs that "cannot be reproduced locally" are usually one of:
- **Missing data** — production has a record that local dev does not
- **Configuration difference** — env var, feature flag, or secret differs
- **Version difference** — library pinned differently in prod
- **Load-dependent** — race condition or exhaustion only triggers at scale
- **Timing-dependent** — timeout threshold met only when a dependency is slow

Checklist before declaring "cannot reproduce":
- [ ] Same application version as production (check the Git SHA from the deploy)
- [ ] Same environment variables and feature flags
- [ ] Actual failing data (anonymised if necessary)
- [ ] Same downstream dependencies (or mocks that behave the same way)

For race conditions: run the code with artificial concurrency (`asyncio.gather`, `ThreadPoolExecutor`) and instrument every lock acquisition.

## Under Pressure: Incident Workflow

**Step 1: Mitigate, then investigate.** If you can roll back or disable a feature flag to stop the bleeding, do it before root-causing. User impact stops; you now have time.

**Step 2: Establish the timeline.** When did it start? What changed near that time? Use monitoring — deploy events, config changes, traffic graphs are more reliable than memory.

**Step 3: One change at a time.** Panic-making multiple changes simultaneously means you cannot know which one fixed it (or made it worse).

**Step 4: Communicate.** Status updates every 15–30 minutes prevent stakeholders from interrupting the investigation. Even "still investigating, no update" is useful.

**Step 5: Write the postmortem.** Five sections: timeline, root cause, impact, resolution, action items. The goal is preventing the next incident, not assigning blame.

## Common Failure Cases

**Treating symptoms as root causes**
Why: the first visible error (e.g., 500 from the API) is almost never where the failure originated — it is downstream of the real cause.
Detect: trace the call chain backward from the error; the stack trace points at the symptom, not the source.
Fix: follow the correlation ID upstream until you find the span that initiated the failure, not just the one that surfaced it.

**No correlation ID, logs from multiple services**
Why: without a shared trace ID, log lines from different services cannot be joined into a coherent sequence.
Detect: you're scanning logs in multiple tabs, manually matching timestamps instead of filtering on a single key.
Fix: ensure every service propagates `X-Request-ID` / `traceparent` on ingress and passes it on all outbound calls.

**Making multiple changes simultaneously under pressure**
Why: panic and time pressure lead engineers to apply several fixes at once, making it impossible to know which change resolved the incident.
Detect: you deployed a config change AND pushed a hotfix AND scaled up instances in the same five-minute window.
Fix: enforce one change at a time; establish the mitigation (rollback / feature flag off) first, then investigate root cause separately.

**Race condition that "cannot be reproduced locally"**
Why: local environments have lower concurrency and faster I/O than production, so the narrow timing window that triggers the race never opens.
Detect: the bug occurs only under load and disappears on a single threaded test run.
Fix: reproduce with `asyncio.gather` or `ThreadPoolExecutor` to force concurrent execution, then instrument every lock/shared-resource acquisition with logging.

**Postmortem skipped or blame-focused**
Why: teams under pressure skip written postmortems, so the same class of failure recurs because action items were never tracked.
Detect: the same alert fires again within 90 days with no new mitigations in place.
Fix: write the five-section postmortem (timeline, root cause, impact, resolution, action items) within 48 hours; assign each action item an owner and due date.

## Connections

- [[synthesis/request-flow-anatomy]] — the full chain where failures hide
- [[cs-fundamentals/observability-se]] — instrumentation that makes debugging possible
- [[cs-fundamentals/logging-best-practices]] — structured logs, what to capture
- [[cs-fundamentals/distributed-systems]] — failure propagation in distributed systems
- [[cs-fundamentals/error-handling-patterns]] — circuit breakers, retries, timeouts
- [[qa/root-cause-analysis]] — formal RCA methodology
- [[observability/tracing]] — distributed tracing tools and setup
- [[cs-fundamentals/performance-optimisation-se]] — bottleneck identification and profiling

## Open Questions

- How does the debugging workflow change for async, event-driven architectures where there is no synchronous call chain?
- What is the right level of logging verbosity — enough to debug, not so much that finding the signal takes longer than the investigation?

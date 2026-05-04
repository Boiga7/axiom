---
type: concept
category: technical-qa
tags: [performance-testing, capacity-planning, infrastructure, load-testing]
updated: 2026-05-04
para: resource
tldr: Consultant playbook for sizing test environments proportionally, deriving load targets from business data, and translating soak test results into procurement recommendations with headroom calculations.
---

# Performance Testing Capacity Planning

Capacity planning sits at the intersection of testing and infrastructure engineering. As a consultant, your job is to prevent two failure modes: clients who test on environments so small they get meaningless results, and clients who spend on production-scale infrastructure to answer a question that a proportional 20% replica would have answered for a tenth of the cost.

Related: [[qa/performance-testing-qa]], [[qa/test-environments]], [[qa/non-functional-testing]]

---

## Pre-Engagement: Assessing Client Infrastructure

Before writing a single test script, you need a clear picture of what exists. The questions below drive that assessment.

### The Infrastructure Inventory

Ask the client to provide, in writing:

- **Instance types and counts** for each tier (web, app, worker, cache, database). An EC2 `t3.medium` has 2 vCPUs and 4 GB RAM — that ceiling matters before the test starts, not after.
- **Auto-scaling configuration**: is scaling enabled? What triggers it (CPU %, request queue depth, custom CloudWatch metric)? What is the scale-out delay? A 3-minute warm-up on a 5-minute load ramp means auto-scaling never fires during your test.
- **Database instance class and connection pool configuration**: RDS `db.t3.medium` allows roughly 40 concurrent connections before it degrades. HikariCP defaults to a pool of 10. Mismatches here are one of the most common causes of "the test worked fine at 50 users but broke at 200."
- **Network throughput limits**: AWS instance network bandwidth is tied to instance size (`t3.medium` is burstable to ~5 Gbps on credit; `m5.xlarge` is 10 Gbps sustained). Know this before you interpret throughput numbers.
- **CDN / reverse proxy layer**: is Cloudfront or a WAF in front of the origin? Load testing through the CDN tests cache fill behaviour, not origin capacity. Load testing directly against origin bypasses CDN protection and may look artificially worse.
- **Any shared infrastructure**: if the test environment shares a database or message broker with another team's services, your load numbers are poisoned.

### The 2-vCPU Question

Clients frequently run load tests on a test environment that is one or two `t3.small` instances because "it's the only thing we have provisioned." When a client says their test environment has 2 vCPUs, the correct response is:

> "We can still run the test, but we need to frame the results as proportional projections rather than absolute numbers. A test that saturates 2 vCPUs at 80 concurrent users does not mean production will saturate at 80 users — it means you should plan for production to saturate at `(production vCPU count / 2) * 80 = N` users, adjusted for any architectural differences between environments. We must document that assumption explicitly in the test report."

This keeps the test useful without pretending the environment is representative.

---

## Setting Realistic Load Targets

Load targets must come from the business, not from guesses or "let's see what breaks."

### The Five Numbers to Extract from the Client

1. **Current peak concurrent users** — from analytics (Google Analytics, Datadog RUM, or server-side session counts). Not registered users. Not monthly actives. Concurrent users at the worst minute of the worst day.
2. **Expected peak after the upcoming change** — a re-platforming, a marketing campaign, a Black Friday event. If they don't know, ask for the traffic growth rate and project forward 12 months.
3. **Acceptable response time at peak** — "the page must load in under 3 seconds" is a business requirement. The p95 latency target should be derived from it, not chosen arbitrarily.
4. **Acceptable error rate at peak** — typically 0% for 5xx, under 1% for 4xx during normal load. Confirm this with the client; some businesses have contractual SLA obligations.
5. **Recovery time objective** — after a spike, how long can the system take to return to normal response times? This drives soak test duration.

### Translating Concurrent Users to RPS

For HTTP services, a rough conversion is:

```
RPS = concurrent_users / avg_response_time_seconds
```

A user who completes a request every 2 seconds and waits 1 second before the next generates 0.5 RPS. 200 such users = 100 RPS. This is the Little's Law approximation. Use it to sanity-check load generator throughput against concurrent user targets.

---

## Sizing the Test Environment Proportionally

The goal is a test environment that mirrors production architecture at a known ratio, so results scale predictably.

### The Proportionality Rule

A good test environment is a horizontal slice of production: if production runs 4 app server nodes, the test environment runs 2 (50% ratio). Every tier should maintain the same ratio. A test environment with 50% app capacity and 100% database capacity will produce latency numbers that are too optimistic under database-heavy workloads, because the database bottleneck is hidden.

Document the ratio as a single number: `test_env_ratio = 0.5`. Every result in the report gets multiplied by `1 / test_env_ratio` to project to production scale.

### When Full Proportionality Is Not Possible

Sometimes the database cannot be downsized (licensing costs, data volume, replication complexity). When one tier cannot be proportionally reduced:

- Run the test at the proportional load for that tier. If the DB is full-sized but app is 50%, cap your load at 50% of the production peak so you are not over-driving the database.
- State explicitly in the report: "Database tier is full production-sized; results for database-bound operations are directly comparable to production. Results for CPU-bound operations require the 2x scaling factor."

### Minimum Viable Environment

There is a floor below which a test environment is too small to produce any useful signal. A single-node test environment does not exercise load balancer behaviour, session affinity issues, or node-level resource contention. If the client has only one app server node in test, recommend they at minimum provision two — the marginal cost is low and the architectural fidelity difference is significant.

---

## What to Measure During a Soak Test

A soak test (sometimes called an endurance test) runs at sustained moderate load — typically 60–80% of the peak load target — for an extended period, commonly 2–8 hours. The purpose is to reveal resource exhaustion that only manifests over time.

### The Resource Exhaustion Checklist

Collect these metrics at 30-second intervals throughout the soak:

| Resource | Metric | Exhaustion signal |
|---|---|---|
| CPU | % utilisation per node | Sustained >85% with no drop |
| Memory (heap) | JVM heap used / RSS | Monotonic growth — memory leak |
| Memory (OS) | Available memory | Dropping to near zero — OOM imminent |
| Threads / goroutines | Active thread count | Unbounded growth |
| Database connections | Active / idle / waiting in pool | Waiting count >0 persistently |
| File descriptors | Open FD count | Approaching `ulimit -n` ceiling |
| Disk I/O | Write throughput, queue depth | I/O wait rising, queue >10 |
| GC pause time | GC frequency and duration | Increasing frequency or duration |
| Response time trend | p95 latency over time | Gradual upward drift without load change |
| Error rate | 5xx count per minute | Non-zero or increasing |

A well-behaved system shows these metrics plateau after an initial warm-up period. A system with a leak shows at least one metric growing monotonically with no plateau.

### Identifying the Bottleneck

When a soak test degrades, the bottleneck is almost always one of three things:

1. **Connection pool exhaustion** — database or downstream service connection counts max out, requests queue, latency rises, eventually timeouts fire. Fix: increase pool size (within DB instance limits) or increase DB instance class.
2. **Memory leak** — heap or RSS grows steadily. Restart cycles can mask this in production for weeks before an OOM crash occurs. Fix: profiling, heap dump analysis.
3. **Thread leak or thread starvation** — a blocking I/O call without a timeout holds a thread indefinitely. Under sustained load, the thread pool fills. Fix: add timeouts to all I/O calls, move to non-blocking I/O if possible.

---

## Translating Results into Procurement Recommendations

The test report should answer one question: "what do we need to buy or change to meet the target SLA at target load?" That breaks into two procurement decisions.

### Scale Up vs Scale Out

**Scale up** (vertical scaling): move to a larger instance type. Appropriate when:
- The bottleneck is single-threaded (e.g., a CPU-bound computation that cannot parallelise)
- The application is stateful and sharding is expensive
- The headroom needed is modest (<2x current capacity)

**Scale out** (horizontal scaling): add more nodes. Appropriate when:
- The bottleneck is CPU or memory across a stateless tier
- Auto-scaling is already configured and just needs revised triggers
- The headroom needed is large (>2x) — scaling out is cheaper per unit at scale

For most web-tier bottlenecks, scale out is the right answer. For database bottlenecks, the calculus is more complex: read replicas handle read-heavy workloads; write bottlenecks often require vertical scaling or sharding.

### Headroom Calculation

The standard recommendation is to provision enough capacity to handle peak load at 70% resource utilisation, leaving 30% headroom. This gives room for unexpected traffic spikes, background jobs, and the latency degradation that occurs as a system approaches saturation.

```
required_capacity = measured_capacity_at_saturation * (1 / 0.70)
headroom_factor   = 1.43  (the 30% buffer expressed as a multiplier)
```

If the soak test shows the system saturates (p95 > SLA, error rate >1%) at 400 RPS on 4 nodes, and the production target is 600 RPS:

```
nodes_needed_for_600_rps = (600 / 400) * 4 = 6 nodes at saturation
nodes_with_headroom      = 6 * 1.43 ≈ 9 nodes
```

Round up to the next auto-scaling group increment (usually in powers of 2 or the client's preferred increment).

### Reporting Format for Procurement

Frame the recommendation in business language, not infrastructure jargon:

> "Under peak projected load of 600 RPS, the current 4-node configuration saturates at response times 3x above your SLA threshold. To meet the 3-second p95 target with 30% traffic headroom, we recommend increasing the app tier to 9 nodes of the current instance class, or 6 nodes of the next instance class up (`m5.2xlarge` → `m5.4xlarge`). Estimated monthly cost difference: [number]. The database connection pool should be raised from 10 to 25 per application node; this requires upgrading the RDS instance from `db.t3.medium` to `db.t3.large` to accommodate the increased connection ceiling."

Clients respond to concrete numbers and cost figures. Vague recommendations ("consider scaling up") do not get actioned.

---

## Connection Pool Sizing

Connection pool misconfiguration is responsible for a disproportionate share of performance failures. It deserves dedicated treatment.

### The Sizing Formula

The starting formula (attributed to HikariCP documentation, derived from empirical database research):

```
pool_size = (core_count * 2) + effective_spindle_count
```

For an application connecting to an SSD-backed database, `effective_spindle_count = 1`. An app server with 4 vCPUs connecting to an SSD RDS instance should start with a pool of 9.

This formula is a starting point, not a ceiling. Profile under load and adjust. The key constraint is the database's maximum connection limit, which is determined by instance class.

### Database Connection Limits by Instance Class (AWS RDS PostgreSQL)

These are approximate; actual values depend on `max_connections` formula (`LEAST({DBInstanceClassMemory/9531392}, 5000)`):

| Instance | RAM | Approx max_connections |
|---|---|---|
| db.t3.micro | 1 GB | ~87 |
| db.t3.small | 2 GB | ~175 |
| db.t3.medium | 4 GB | ~350 |
| db.t3.large | 8 GB | ~700 |
| db.m5.large | 8 GB | ~700 |
| db.m5.xlarge | 16 GB | ~1400 |

If an application has 4 nodes each with a pool of 100, total connections = 400. That is fine for `db.t3.large` but will exhaust `db.t3.medium` at 350. The load test will show this as connection timeout errors starting around 300 concurrent connections.

### PgBouncer and Connection Pooling Middleware

When the application needs more total connections than the database instance can support, insert a connection pooler (PgBouncer for PostgreSQL, ProxySQL for MySQL). PgBouncer in transaction pooling mode multiplexes many application connections onto a small set of real database connections. This allows apps with hundreds of short-lived connections to share a small `max_connections` budget. The load test should be run through PgBouncer if it is present in the production topology.

---

## CDN and Cache Effects on Load Test Results

CDN presence fundamentally changes what a load test measures. Clarify this with the client before designing the test.

### Testing Through vs. Bypassing the CDN

| Approach | What it tests | When to use |
|---|---|---|
| Test through CDN (prod DNS) | Cache hit ratio, CDN capacity, origin traffic under realistic cache | When validating user-facing performance |
| Test bypassing CDN (origin IP) | Raw origin capacity, no cache assistance | When sizing infrastructure, stress testing origin |

Most infrastructure sizing work should bypass the CDN. If a Cloudfront cache-hit ratio of 80% is masking the fact that origin can only handle 200 RPS, you need to know that before a cache invalidation event (deployment, purge) sends all traffic to origin.

### Cache Warming

A cold-cache test run generates artificially high origin load and inflated latency, because no cached responses exist. Warm the cache before the main test run:

1. Run a low-volume ramp (10–20% of target RPS) for 5–10 minutes.
2. Verify cache hit ratio in CDN metrics reaches steady state.
3. Then run the main test.

Document the cache hit ratio alongside every result. "300 RPS at p95=800ms with 78% cache hit" is a very different result from "300 RPS at p95=800ms with 0% cache hit."

### Cache Invalidation Scenarios

Part of capacity planning should include the "thundering herd" scenario: what happens when the cache is cleared during peak load? Simulate this by bypassing CDN for a short burst at peak load volume. If the origin cannot sustain peak load uncached for the 30–60 seconds it takes to re-warm, that is a risk that needs mitigation (request coalescing, staggered invalidation, serving stale while revalidating).

---

## Common Client Mistakes

### Running the Test on the Wrong Environment

Symptom: client runs the test on a shared staging environment during business hours while developers are actively using it.

Impact: results are contaminated by other workloads. CPU spikes, slow queries, and errors may be caused by the developer running a batch job, not by the load test.

Fix: isolate the test environment. If full isolation is not possible, run during off-hours and monitor for external workloads throughout the test window.

### Not Disabling Auto-Scaling During Baseline Tests

Symptom: the load ramps up, auto-scaling fires at minute 3, new nodes come online, latency drops — and the client concludes the system handles the load fine.

Impact: the test measured auto-scaling reaction time, not steady-state capacity of the initial configuration.

Fix: for baseline capacity tests, disable auto-scaling. Measure the capacity of the fixed configuration. Then run a second test with auto-scaling enabled to measure scale-out behaviour. Report both separately.

### Missing Downstream Dependencies

Symptom: client tests the web tier but the payment service, email provider, or internal microservice is not included or is mocked.

Impact: downstream service latency and rate limits are invisible. Production performance will be worse than test.

Fix: map all synchronous downstream calls before scripting. Either include them in the test (preferred) or explicitly document what was mocked and what the production latency assumptions are.

### Confusing Think Time with Response Time

Symptom: client Jira ticket says "we need to support 10,000 concurrent users" but analytics show peak concurrent sessions of 10,000 where average session involves one request every 30 seconds.

Impact: the test is designed for 10,000 concurrent active requests, which implies 10,000 RPS — orders of magnitude above actual load.

Fix: convert session concurrency to RPS using Little's Law. 10,000 users making one request per 30 seconds = 333 RPS. That is the load target.

### Reporting Mean Latency Instead of Percentiles

Symptom: the test report shows "average response time: 450ms."

Impact: mean latency is dominated by the majority of fast requests and hides the long tail. A p99 of 8 seconds is invisible behind a 450ms mean if only 1% of requests are slow.

Fix: always report p50, p95, p99, and max. Plot latency over time (not just end-of-test aggregates). The p99 is what your worst-served users experience; the max reveals outliers (GC pauses, cold starts, lock contention).

---

## Consultant Checklist

Before test execution:

- [ ] Infrastructure inventory received and reviewed
- [ ] Test environment ratio documented (e.g., `ratio = 0.25`)
- [ ] Load targets derived from business requirements, not guesses
- [ ] Concurrent users converted to RPS via Little's Law
- [ ] CDN bypass or pass-through decision made and documented
- [ ] Auto-scaling configuration confirmed (enabled or disabled, documented)
- [ ] Database connection limits verified against pool configuration
- [ ] Shared infrastructure identified and flagged
- [ ] Downstream dependencies mapped — included or mocked, documented

After test execution:

- [ ] Results reported at p50 / p95 / p99 / max — not mean
- [ ] Bottleneck tier identified (CPU, memory, connections, I/O)
- [ ] Scale-up vs scale-out recommendation made with cost estimate
- [ ] Headroom calculation shown (target load / saturation point, * 1.43)
- [ ] Connection pool sizing recommendation included if relevant
- [ ] CDN cache hit ratio reported alongside latency numbers
- [ ] Test environment ratio applied to project results to production scale
- [ ] Soak test resource exhaustion findings summarised with remediation steps

---

## Connections

- [[technical-qa/jmeter]] — primary tool for generating the load that feeds capacity planning data
- [[technical-qa/load-testing-advanced]] — advanced load scenario design (soak, spike, stress) referenced in this playbook
- [[technical-qa/performance-testing]] — test type taxonomy and NFR acceptance criteria
- [[technical-qa/api-performance-testing]] — API-specific measurement patterns for latency and throughput
- [[technical-qa/tqa-hub]] — central index for all technical QA pages
- [[qa/test-environments]] — environment provisioning and production parity decisions

## Open Questions

- Does the HikariCP connection pool formula (`core_count * 2 + spindle_count`) still hold as a reasonable starting point for NVMe-backed cloud databases, or has the recommended formula shifted?
- What is the practical threshold at which PgBouncer transaction-mode pooling introduces measurable latency overhead relative to direct connections?
- How should the 70% utilisation headroom rule be adjusted for auto-scaling groups with sub-60-second scale-out times?

## See Also

- [[qa/performance-testing-qa]] — JMeter and k6 scripting, test design patterns
- [[qa/test-environments]] — environment provisioning, parity with production
- [[qa/non-functional-testing]] — NFR categories beyond performance
- [[qa/test-planning]] — incorporating capacity planning into a test plan

---
type: concept
category: qa
tags: [slo, sla, quality-gates, observability, release-management, governance]
updated: 2026-05-04
tldr: How QA teams derive, apply, and govern SLOs and error budgets as objective release gates — covering SLI/SLO/SLA vocabulary, error budget policies, go/no-go decision frameworks, and tooling with Prometheus and Datadog.
para: resource
---

# SLOs and SLAs as QA Governance

Service Level Objectives and Agreements are not just operational contracts between SRE teams and product owners. Used correctly, they become the most objective quality gates in your release pipeline — ones that cannot be gamed by a passing test suite, inflated coverage numbers, or optimistic sprint demos. This page covers how QA teams can derive, apply, and govern SLOs as first-class release signals.

---

## The Vocabulary: SLI, SLO, SLA

These three terms are frequently conflated. Each plays a distinct role.

### SLI — Service Level Indicator

An SLI is a quantitative measurement of a specific aspect of service behaviour. It is a ratio or rate computed from raw telemetry.

```
SLI = (good events / total events) over a time window
```

**QA examples:**
- `successful HTTP responses (2xx + 3xx) / total HTTP responses` — availability SLI
- `requests with latency < 300 ms / total requests` — latency SLI
- `search queries returning results in < 1 s / total search queries` — user-journey latency SLI
- `payment transactions completing without error / total payment attempts` — critical-path error SLI
- `data exports completing within 60 s / total export requests` — throughput SLI

An SLI must be measurable continuously from production telemetry. If you cannot instrument it, you cannot govern with it.

### SLO — Service Level Objective

An SLO is the target value or range for an SLI. It is an internal commitment — agreed between engineering, product, and QA — but not formally contractual with customers.

```
SLO = SLI >= target, measured over a rolling window
```

**QA examples:**
- `availability SLI >= 99.9% over a rolling 30-day window`
- `p99 latency SLI >= 95% of requests served in < 500 ms over a rolling 7-day window`
- `payment error SLI >= 99.95% success rate over a rolling 28-day window`

The SLO target is the threshold against which QA gates releases. If you cannot meet the SLO in a staging environment under realistic load, you cannot ship.

### SLA — Service Level Agreement

An SLA is a contractual commitment to customers, typically with financial remedies for breach (credits, refunds, termination rights). SLAs are almost always looser than internal SLOs — deliberately, so that internal violations catch problems before customers are impacted.

**Concrete relationship:**
- Internal SLO: `availability >= 99.9%`
- External SLA: `availability >= 99.5% (or 10% credit applies)`

The gap between SLO and SLA is the operational buffer. QA governs to the SLO. Legal defends to the SLA.

**Consultant framing:** When a client asks "are we meeting our SLAs?", the correct answer structure is: "Your SLA target is X. Your internal SLO is Y. Current performance is Z. You are [meeting / at risk / breaching] your SLO, which gives you [N days / N%] of headroom before the SLA is at risk."

---

## Error Budgets

The error budget is the most powerful concept in SLO-based governance. It converts an abstract percentage into a concrete, time-bounded allowance for failure.

### Calculation

```
Error budget = (1 - SLO target) * time window

Example:
SLO = 99.9% availability over 30 days
Error budget = 0.001 * 30 * 24 * 60 minutes
             = 43.2 minutes of allowed downtime per 30-day window
```

### Budget consumption

As incidents, deployments, and degraded periods occur, they consume the error budget. Tracking budget consumption over time gives you a real-time signal of system health that a green test suite cannot provide.

```
Budget remaining = total budget - consumed budget
Budget burn rate = (budget consumed in last N hours) / (expected budget consumption in N hours)
```

A burn rate > 1.0 means you are consuming the budget faster than its intended rate. At burn rate 1.0, you will exactly exhaust the budget at the end of the window. At burn rate 2.0, you will exhaust it halfway through.

### Error budget as a release hold signal

This is the core QA governance mechanism:

**Policy:** If error budget remaining falls below a threshold, no new releases deploy until it recovers.

Typical thresholds:
- Budget consumed > 50% with > 50% of the window remaining: **amber** — releases require explicit sign-off
- Budget consumed > 75% with > 25% of the window remaining: **red** — releases blocked, only hotfixes
- Budget fully exhausted: **freeze** — no changes except incident remediation

**Concrete example:** You have a 30-day window. On day 10, you have already consumed 40% of your error budget. You have 20 more days but only 60% of the budget left. At that burn rate you will exhaust the budget by approximately day 25, five days before the window closes. This triggers amber — the QA lead raises a go/no-go flag before the next sprint release.

The error budget policy should be a written artefact, reviewed by QA, SRE, and product at the start of each engagement. Without a written policy, the threshold becomes a negotiation at the point of crisis, which always favours shipping.

### Burn rate alerts

Modern SRE practice (from the Google SRE Workbook, Chapter 5) recommends multi-window burn rate alerts rather than single threshold alerts:

| Burn rate | Time to exhaustion | Alert window | Severity |
|---|---|---|---|
| 14.4x | ~2 hours | 1h + 5min | Page immediately |
| 6x | ~5 hours | 6h + 30min | Page within 30 min |
| 3x | ~10 hours | 1d + 6h | Ticket |
| 1x | ~30 days | 3d | No alert |

QA should be subscribed to the ticket-level alerts (3x burn rate). Page-level alerts indicate an active incident, not a release governance signal.

---

## Defining Meaningful SLOs

Most SLOs fail not because teams ignore them but because they define the wrong thing, or define the right thing at the wrong granularity.

### The four standard SLO dimensions for web/API services

**1. Availability**
- SLI: `(successful responses) / (total requests)`
- Target range: 99.0% to 99.99% depending on criticality
- Common mistake: measuring availability from a synthetic ping rather than real user traffic
- QA test link: uptime checks in performance test harness, chaos injection to validate recovery

**2. Latency (p99)**
- SLI: `(requests completing within threshold) / (total requests)`
- Prefer p99 over p50 for SLO targets — p50 hides tail latency that affects the most frustrated users
- Target range: highly domain-specific; e-commerce checkout < 1 s p99, internal admin tool < 3 s p99
- QA test link: NFR thresholds in load test scripts derived directly from the SLO target

**3. Error rate**
- SLI: `(non-error responses) / (total responses)`
- Usually expressed as success rate: 99.5%, 99.9%, 99.99%
- Separate SLOs for different error classes: 5xx errors (server fault) vs 4xx errors (client/data fault)
- QA test link: error injection tests, third-party dependency mocking, timeout and retry validation

**4. Throughput / saturation**
- SLI: `(requests processed within N seconds) / (total requests enqueued)` for async systems
- Useful for batch processing, message queues, export pipelines
- QA test link: sustained load tests, queue depth monitoring during soak tests

### Writing SLOs for new services

When a new service enters the test strategy phase, QA should drive SLO definition before a single test case is written. The template:

```
Service: [name]
SLI type: [availability | latency | error rate | throughput]
Measurement: [exact metric definition — numerator and denominator]
Target: [percentage]
Window: [rolling 7/28/30 days]
Measurement source: [Prometheus metric name | Datadog monitor ID | CloudWatch metric]
Error budget: [calculated from target and window]
Budget policy: [what happens at 50%, 75%, 100% consumed]
Owner: [who is alerted]
Review cadence: [monthly | per sprint | per release]
```

Filling in this template forces the conversation about what "good" means before implementation begins. Teams that skip this step end up with SLOs defined retrospectively from current performance, which is a form of performance theatre.

---

## SLOs as NFR Acceptance Criteria

Non-functional requirements in a test strategy should be expressed as SLO compliance, not arbitrary figures.

**Before (vague NFR):**
> "The system should respond quickly under load."

**After (SLO-derived NFR):**
> "The checkout API must maintain a p99 latency SLI of >= 95% (requests completing in < 800 ms) under a sustained load of 500 concurrent users for 30 minutes. This is derived from the service SLO target. A performance test run that breaches this threshold is a test failure, not a warning."

### Load test configuration derived from SLOs

```python
# Example: k6 load test with SLO-derived thresholds
thresholds = {
    # SLO target: 99.9% availability
    'http_req_failed': ['rate<0.001'],

    # SLO target: p99 latency < 500ms (mapped to k6 percentile)
    'http_req_duration': ['p(99)<500'],

    # SLO target: 95% of requests under 300ms (additional SLI)
    'http_req_duration': ['p(95)<300'],
}
```

The test fails if any threshold is breached. This is not a performance benchmark to be interpreted — it is a binary gate. If the thresholds come from the SLO document, any stakeholder can understand why the gate exists without reading test code.

### Staging vs production SLO targets

A common mistake is setting performance test thresholds lower than the production SLO to account for staging environment limitations. This defeats the purpose. Options:

1. **Scale the load** — if staging has 25% of production capacity, run 25% of production load and hold to the same latency target
2. **Match the environment** — invest in a production-parity staging environment (preferred; costly)
3. **Accept the gap explicitly** — document that staging tests are indicative only and deploy with monitoring alerting for SLO breach

Option 3 is valid but must be a documented decision, not an implicit assumption.

---

## Go/No-Go Using Error Budget State

### The release checklist addition

Every release checklist should include an error budget check. The question is not "did the tests pass?" but "is the system in a state where absorbing another change is responsible?"

**Proposed checklist item:**

```
[ ] Error budget check
    - Current budget remaining: ___%
    - Budget consumed this window: ___%
    - Days remaining in window: ___
    - Projected exhaustion date (at current burn rate): ___
    - Policy threshold: amber at 50% consumed with >50% window remaining
    - Result: GREEN / AMBER / RED
    - If AMBER or RED: sign-off required from [QA Lead + Engineering Lead]
```

### Scenario examples

**Scenario 1 — Clear go:**
SLO window: 30 days. Current day: 15. Budget consumed: 20%. Projected exhaustion: day 75 (extrapolated). Result: GREEN.

**Scenario 2 — Amber hold:**
SLO window: 30 days. Current day: 12. Budget consumed: 45%. Last incident consumed 30% in 2 days. Projected exhaustion: day 18. Result: AMBER. The release can proceed only with explicit sign-off acknowledging that another incident of similar magnitude will exhaust the budget before the window closes, breaching the SLA buffer.

**Scenario 3 — Hard hold:**
SLO window: 30 days. Current day: 20. Budget consumed: 80%. 10 days remaining. Budget will exhaust at current rate before the window closes. Result: RED. No feature releases until budget recovers (incident resolved, window resets, or SLO target adjusted by exception process).

---

## SLA vs SLO: Consultant Positioning

When working with clients, the distinction matters for who you are talking to.

| Dimension | SLA | SLO |
|---|---|---|
| Audience | Legal, commercial, customers | Engineering, QA, product |
| Enforceability | Contractual, financial remedies | Internal commitment, cultural |
| Target | Looser (customer-facing floor) | Tighter (operational ceiling) |
| Governance | Account management, legal review | QA governance, SRE |
| Breach consequence | Credits, termination clauses | Internal escalation, freeze |
| Review cadence | Annually (contract renewal) | Monthly or per sprint |

**Common client misunderstanding:** "We've never breached our SLA so we're fine." This statement conflates SLA performance with service quality. An SLO can be breached dozens of times per year without ever triggering SLA remedies, because the SLA target is set lower. QA governance tracks SLO breach, not SLA breach. SLA breach means the internal SLO governance failed.

---

## SLO Review Cadence as a QA Governance Ritual

SLOs decay. The target that was meaningful when the service launched becomes irrelevant as usage patterns shift, infrastructure changes, or the product evolves. QA should own a recurring SLO review ritual.

### Monthly SLO review agenda (45 minutes)

1. **Budget consumption report** (5 min) — how much budget was consumed, by what events
2. **SLI trend review** (10 min) — is performance trending toward or away from target?
3. **Incident retrospective link** (10 min) — which incidents consumed the most budget, what changed
4. **Target relevance check** (10 min) — are the SLI definitions still measuring what matters to users?
5. **Threshold adjustment proposals** (10 min) — should any targets be tightened, relaxed, or retired?

### When to tighten a target

- Current performance consistently exceeds the SLO by a large margin (e.g., SLO is 99.5%, actual is 99.95%) — the target gives no signal
- A new contractual commitment has been made that requires tighter targets
- User research shows the latency threshold is higher than what users perceive as acceptable

### When to relax a target

- Budget consistently exhausted by known, accepted infrastructure events (planned maintenance)
- Service was over-engineered relative to actual user impact
- Explicit business decision to reduce investment in a non-critical path

Targets should never be relaxed to avoid accountability. If a target is being missed and the response is to lower the target rather than fix the system, that is a governance failure, not an SLO review.

---

## Common Mistakes

### SLOs too tight

Setting a 99.99% availability target for an internal batch processing service. The target consumes error budget on routine maintenance windows, trains teams to ignore alerts, and creates pressure to lower targets without fixing anything. Reserve four-nines targets for genuinely critical, customer-facing, revenue-generating paths.

### SLOs unmeasured

The SLO exists in a spreadsheet. No Prometheus rule computes the SLI. No dashboard shows budget consumption. The SLO is reviewed retrospectively by looking at incident logs rather than continuously from telemetry. This is documentation theatre. An unmeasured SLO provides no signal and no release gate.

### SLOs set by ops without business input

Operations teams set SLOs based on what is technically achievable, not what users actually need. A checkout latency target of p99 < 2,000 ms might be easily achievable but unacceptable to users who abandon carts after 1,000 ms. SLOs must be calibrated to user impact, not infrastructure comfort.

### Single-window SLOs

Using a 30-day rolling window without shorter sub-window alerts means a catastrophic 6-hour outage is smoothed out of the SLI calculation and only shows up as a few percent of budget consumed. Short-window burn rate alerts (1-hour, 6-hour) catch fast-moving incidents before the monthly SLO is at risk.

### SLO reviewed only at the SLA renewal

SLOs reviewed once a year at the contract renewal are not operational governance — they are audit theatre. By the time you review, you have already made hundreds of release decisions without the signal.

### Not separating read and write path SLOs

A service that is 99.9% available overall can have a write path that fails 5% of the time if reads are dominating the traffic mix. Define SLOs per critical user journey, not per service.

---

## Tooling

### Prometheus recording rules

Prometheus is the standard for computing SLIs from raw metrics. Recording rules pre-aggregate the ratio at scrape time, making SLO dashboards fast and consistent.

```yaml
# recording rule: availability SLI (5-minute window)
- record: job:http_requests_success_rate:5m
  expr: |
    sum(rate(http_requests_total{status=~"2..|3.."}[5m])) by (job)
    /
    sum(rate(http_requests_total[5m])) by (job)

# recording rule: error budget burn rate (1-hour window vs 30-day budget)
- record: job:error_budget_burn_rate:1h
  expr: |
    (1 - job:http_requests_success_rate:1h)
    /
    (1 - 0.999)  # SLO target: 99.9%
```

**Alerting on burn rate:**

```yaml
- alert: ErrorBudgetFastBurn
  expr: |
    job:error_budget_burn_rate:1h > 14.4
    and
    job:error_budget_burn_rate:5m > 14.4
  for: 2m
  labels:
    severity: page
  annotations:
    summary: "Error budget burning at 14.4x — exhaustion in ~2 hours"

- alert: ErrorBudgetSlowBurn
  expr: |
    job:error_budget_burn_rate:6h > 6
    and
    job:error_budget_burn_rate:30m > 6
  for: 15m
  labels:
    severity: ticket
  annotations:
    summary: "Error budget burning at 6x — escalate to QA for release hold assessment"
```

### Datadog SLO dashboards

Datadog has native SLO tracking objects (separate from monitors). Configure them as:

1. **Metric-based SLO** — computed from a ratio of two Datadog metrics. Supports 7-day, 30-day, 90-day rolling windows simultaneously.
2. **Monitor-based SLO** — derived from the uptime of an existing Datadog monitor. Simpler but less flexible.

Metric-based SLOs are preferred for QA governance because they can be scoped to specific user journeys (using tags) and allow budget consumption to be calculated precisely.

Datadog error budget widget (in dashboards): shows remaining budget as a percentage and a time-series of consumption rate. Include this on every release dashboard so the release coordinator can see budget state before approving a deployment.

### Google SRE Workbook

The Google SRE Workbook (2018, available free at sre.google/workbook) defines the canonical methodology for SLO design. Chapters 2 (SLOs), 5 (Alerting on Significant Events), and 9 (Data Processing Pipelines) are directly applicable to QA governance. The multi-window burn rate alert model in Chapter 5 is the reference implementation for the Prometheus alerting rules above.

### Pyrra

Pyrra (open-source, CNCF sandbox) generates Prometheus recording rules and Grafana dashboards from SLO definitions written as Kubernetes CRDs or plain YAML. Useful for standardising SLO configuration across a multi-service platform rather than writing recording rules by hand.

```yaml
# Pyrra SLO definition example
apiVersion: pyrra.dev/v1alpha1
kind: ServiceLevelObjective
metadata:
  name: checkout-availability
spec:
  description: Checkout API availability SLO
  target: "99.9"
  window: 4w
  indicator:
    ratio:
      errors:
        metric: http_requests_total{job="checkout",code=~"5.."}
      total:
        metric: http_requests_total{job="checkout"}
```

### Sloth

Sloth (open-source) takes a similar approach — define SLOs in YAML, generate Prometheus rules. More mature than Pyrra at the time of writing for standalone (non-Kubernetes) environments.

---

## Connections

- [[qa/performance-testing-qa]] — load test thresholds derived directly from SLO targets; SLO-derived NFRs turn performance tests into binary gates
- [[qa/production-monitoring-qa]] — observing SLI behaviour post-release; the runtime layer where error budget is consumed
- [[qa/qa-metrics]] — SLO compliance surfaces as a top-level QA reporting metric alongside escape rate and coverage
- [[qa/non-functional-testing]] — NFR taxonomy; SLO-derived acceptance criteria replace vague NFR wording
- [[qa/continuous-testing]] — automated SLI checks as CI/CD pipeline gates; shift-right quality signal
- [[qa/test-strategy]] — where SLO definitions are captured and tied to release governance policy

## Open Questions

- How should QA handle SLO targets for services that have never been measured — should a provisional target be set from industry benchmarks or held at 0% until a measurement window closes?
- When staging environment capacity is a known fraction of production, is there a principled formula for scaling load-test SLO thresholds rather than accepting the coverage gap?
- Who owns the error budget policy in organisations where SRE and QA operate as separate functions with no formal handoff process?

## Cross-References

- [[qa/performance-testing-qa]] — load test configuration deriving thresholds from SLO targets
- [[qa/production-monitoring-qa]] — observing SLI behaviour in production after release
- [[qa/qa-metrics]] — SLO compliance as a QA reporting metric
- [[qa/test-strategy]] — where SLO definitions are captured during test strategy creation
- [[qa/continuous-testing]] — automated SLI checks as pipeline gates
- [[qa/non-functional-testing]] — NFR taxonomy including SLO-derived acceptance criteria
- [[observability/langfuse]] — observability tooling for LLM pipelines (separate SLI model)
- [[qa/qa-hub]] — QA knowledge index

---
type: concept
category: qa
tags: [performance-testing, reporting, stakeholder-communication, consultancy]
sources: []
updated: 2026-05-03
para: resource
tldr: The artefacts, formats, and stakeholder communication a Senior Technical Consultant produces during and after a performance testing engagement — from interim run reports through to go/no-go sign-off packs.
---

# Performance Test Reporting

The artefacts, formats, and stakeholder communication a Senior Technical Consultant produces during and after a performance testing engagement. Knowing how to run the tests is only half the job. The other half is translating raw numbers into decisions that non-technical stakeholders can act on and that engineers can debug from.

---

## Report Taxonomy

| Artefact | Primary audience | When produced | Format |
|---|---|---|---|
| Run report | Engineers, Test Lead | After each test run | Markdown / HTML |
| Interim report | Project manager, Tech lead | Mid-engagement (weekly or mid-sprint) | Word / PDF |
| NFR pass/fail summary | All stakeholders | End of each test cycle | Table, one page |
| Trend analysis | Tech lead, Architect | End of sprint / release | Chart + commentary |
| Risk summary | Project manager, Sponsor | Before go/no-go decision | Bullet list, half page |
| Go/no-go sign-off pack | Project sponsor, Release manager | Pre-release | PDF, 3–5 pages |
| Final engagement report | Client, Account manager | End of engagement | Full document, 10–20 pages |

Each artefact has a different job. A run report gets a bug fixed. A go/no-go pack authorises a production deployment. Conflating them produces documents that are too detailed to act on and too vague to debug from.

---

## Run Report — Structure

Produced after every load test execution. Engineers consume this. It should answer three questions in under five minutes of reading: did we pass, where did we fail, what is the likely cause.

```
# Performance Run Report — [Service Name] — [Date]

## Run metadata
- Scenario: [load / stress / soak / spike / volume]
- Tool: k6 / JMeter / Locust / Gatling
- Environment: staging-eu-west-1
- Build / commit: abc1234
- Duration: 30 minutes
- Ramp profile: 0 → 200 VUs over 5 min, hold 20 min, ramp down 5 min

## Summary
PASS / FAIL — [one sentence reason]

## Results vs NFR thresholds

| Endpoint              | NFR (p95) | Actual (p95) | NFR (p99) | Actual (p99) | Error % | Status |
|-----------------------|-----------|--------------|-----------|--------------|---------|--------|
| GET /api/products     | 500ms     | 312ms        | 800ms     | 478ms        | 0.1%    | PASS   |
| POST /api/checkout    | 3000ms    | 2104ms       | 5000ms    | 3890ms       | 0.4%    | PASS   |
| GET /api/search       | 800ms     | 1243ms       | 1500ms    | 2710ms       | 2.1%    | FAIL   |
| GET /api/orders       | 1000ms    | 887ms        | 2000ms    | 1654ms       | 0.2%    | PASS   |

## Failures and likely causes

GET /api/search — p95 1243ms (NFR: 800ms), error rate 2.1% (NFR: < 0.5%)
Observed: latency spikes at 80+ VU mark; errors are 503 from the search service.
Probable cause: full-text search lacks an index on products.search_vector; confirmed
by DB slow query log — avg query time 890ms at load vs 45ms at baseline.
Recommended fix: CREATE INDEX CONCURRENTLY on search_vector (estimated 2 hours).

## Environment observations
- CPU spiked to 94% on app-server-02 at peak; other nodes < 60%. Potential scheduling issue.
- Redis cache hit rate: 73% (target: > 85%). Cold-start effect or TTL too low.

## Raw results
[Link to k6 HTML report] [Link to Grafana dashboard snapshot]
```

---

## NFR Pass/Fail Summary Table

One-page artefact used in stakeholder reviews. Every NFR defined at the start of the engagement appears. No row should be missing — a blank NFR means it was not tested, which must be called out explicitly.

```
## NFR Sign-Off Table — Release 2.3.0

Test date: 2026-05-03
Environment: Staging (matched to production spec)
Load profile: 200 concurrent users, 30-minute sustained

| #  | NFR ID   | Description                                      | Target   | Measured | Status   |
|----|----------|--------------------------------------------------|----------|----------|----------|
| 1  | NFR-001  | Product list p95 < 500ms @ 200 VU                | 500ms    | 312ms    | PASS     |
| 2  | NFR-002  | Checkout p95 < 3s @ 200 VU                       | 3000ms   | 2104ms   | PASS     |
| 3  | NFR-003  | Search p95 < 800ms @ 200 VU                      | 800ms    | 1243ms   | FAIL     |
| 4  | NFR-004  | Order history p95 < 1s @ 200 VU                  | 1000ms   | 887ms    | PASS     |
| 5  | NFR-005  | Error rate < 0.5% across all endpoints           | 0.5%     | 2.1%*    | FAIL     |
| 6  | NFR-006  | System stable under 2h soak at 100 VU            | Stable   | NOT RUN  | PENDING  |
| 7  | NFR-007  | Peak throughput > 500 req/s                      | 500 rps  | 612 rps  | PASS     |

* Error rate failure driven entirely by NFR-003 endpoint.

Overall status: FAIL — 2 of 7 NFRs not met. NFR-006 not yet executed.
Blocker for release: NFR-003 and NFR-005 (linked).
NFR-006 must be executed before go/no-go.
```

Mark `NOT RUN` explicitly rather than omitting the row. A missing row looks like it passed.

---

## Presenting p95 / p99 to Different Audiences

The same number means different things depending on who you are talking to. Calibrate the explanation.

### To a developer

```
The p95 for GET /api/search is 1243ms. That means 95% of requests completed
within 1243ms, but 5% took longer — some of those are in the p99 at 2710ms.
The slow query log shows the search_vector column has no index. At 80+ VU the
planner switches to a seq scan and latency jumps. Create the index and I'd
expect p95 to drop below 200ms.
```

Give them the percentile, the raw number, the direction of the problem, and a hypothesis. They will find the fix.

### To a project manager

```
The search feature does not meet its performance target. Under the expected
peak load, 1 in 20 search requests takes more than 1.2 seconds — our agreed
target was under 0.8 seconds. The engineering team has identified a fix
(estimated 2 hours) and it is now in the sprint backlog as PROJ-441.
We cannot recommend releasing the current build. If the fix lands and passes
re-test by Thursday, the release timeline is unaffected.
```

State the user impact (1 in 20 requests), whether the target was met, what the consequence is, and whether the timeline is at risk. Drop the percentile notation — p95 means nothing to most PMs.

### To an executive or sponsor

```
Performance testing has found one issue that blocks this release. The product
search function is slower than agreed under peak load. The team has a fix
ready; we expect to re-test and close this by end of week. All other features
passed. The release date is not currently at risk.
```

One issue. Is the date at risk. What happens next. Nothing else.

---

## Trend Analysis Across Sprints / Releases

Trend analysis answers: is performance getting better or worse over time, and is any endpoint drifting toward its SLO ceiling?

### Latency trend table (populated per release)

```
## p95 Latency Trend — GET /api/products (ms)

| Release | Date       | p95  | p99  | NFR (p95) | Headroom |
|---------|------------|------|------|-----------|----------|
| 2.0.0   | 2026-02-14 | 180  | 290  | 500ms     | 64%      |
| 2.1.0   | 2026-03-01 | 195  | 310  | 500ms     | 61%      |
| 2.1.2   | 2026-03-15 | 220  | 380  | 500ms     | 56%      |
| 2.2.0   | 2026-04-05 | 290  | 520  | 500ms     | 42%      |
| 2.3.0   | 2026-05-03 | 312  | 478  | 500ms     | 38%      |
```

The headroom column is the most important. An endpoint can be passing its NFR while the headroom is shrinking consistently — that is a degradation trend that will eventually become a failure. Flag it before the failure, not after.

**When to escalate a trend:**
- Headroom below 25%: raise in the next sprint review as a risk item.
- Headroom below 10%: block new feature work on that endpoint until the cause is found.
- Two consecutive releases with headroom reduction > 10 percentage points: write a defect even if the NFR is still passing.

### Error rate trend

Track alongside latency. An error rate that is drifting from 0.1% toward 0.5% across releases deserves attention even if it has not crossed the NFR threshold.

---

## Interim Report Format

Produced mid-engagement — typically weekly on a multi-week performance programme, or once mid-sprint on a shorter cycle. Audience: project manager and technical lead.

```markdown
# Performance Testing — Interim Report
**Client:** Acme Corp
**Engagement:** Platform Re-platform Performance Validation
**Week:** 2 of 4
**Report date:** 2026-05-03
**Prepared by:** Lewis Elliott, Senior Technical Consultant

---

## Progress this week

- Load test scenarios completed: checkout flow, product search, order history (3 of 7 planned)
- Defects raised: 2 (PERF-001 search latency, PERF-002 connection pool exhaustion)
- Defects resolved and re-tested: 0 (both in dev)

## Results summary

| Scenario           | NFRs tested | Pass | Fail | Pending re-test |
|--------------------|-------------|------|------|-----------------|
| Checkout flow      | 4           | 4    | 0    | 0               |
| Product search     | 3           | 1    | 2    | 0               |
| Order history      | 3           | 3    | 0    | 0               |

## Open defects

| ID       | Severity | Description                            | Owner     | ETA    |
|----------|----------|----------------------------------------|-----------|--------|
| PERF-001 | High     | Search p95 exceeds NFR at 80+ VU       | Dev team  | 06-May |
| PERF-002 | Medium   | Connection pool exhausted under soak   | Infra     | 08-May |

## Risks

- If PERF-001 is not resolved by 08-May, the soak test cannot run on schedule.
  This would push the final report date by 3 days.
- Staging environment CPU anomaly on app-server-02 not yet explained.
  Results from that node may not be representative. [Action: infra team to investigate.]

## Next week

- Complete remaining 4 scenario groups (user profile, reports, admin, API)
- Re-test PERF-001 and PERF-002 once fixes land
- Begin soak test if environment issue is resolved

---
*Next interim report: 2026-05-10*
```

---

## Go/No-Go Sign-Off Pack

Produced immediately before a production release decision. Primary audience: release manager, project sponsor, sometimes a change advisory board. It must be self-contained — the reader should not need to find other documents to make the decision.

```markdown
# Performance Testing — Go/No-Go Sign-Off Pack
**System:** Acme Platform v2.3.0
**Release date:** 2026-05-10
**Prepared by:** Lewis Elliott, Senior Technical Consultant, Resillion
**Date:** 2026-05-07

---

## Recommendation

**GO** — all performance NFRs met. No outstanding performance defects. Soak test
passed. Release is approved from a performance standpoint.

[OR]

**NO-GO** — 2 NFRs unmet (PERF-001, PERF-005). Releasing with known performance
failures under expected peak load carries a risk of user-facing degradation.
See Risk section.

---

## NFR sign-off (final)

[Include full NFR table from section above — all rows, final measured values]

All 7 NFRs: PASS. PERF-001 resolved in commit def5678, re-tested 06-May, now
passing with p95 = 310ms (NFR: 800ms).

---

## Test coverage

| Test type    | Executed | Pass | Notes                             |
|--------------|----------|------|-----------------------------------|
| Load test    | Yes      | Yes  | 200 VU, 30 min, all scenarios     |
| Stress test  | Yes      | Yes  | Breaking point: 480 VU            |
| Soak test    | Yes      | Yes  | 100 VU, 2h, memory stable         |
| Spike test   | No       | N/A  | Out of scope per agreed test plan |
| Volume test  | Yes      | Yes  | 2M product records                |

---

## Defect log (performance cycle)

| ID       | Severity | Description                       | Status   | Resolution                         |
|----------|----------|-----------------------------------|----------|------------------------------------|
| PERF-001 | High     | Search p95 exceeded NFR at 80+ VU | Resolved | Index added on search_vector       |
| PERF-002 | Medium   | Connection pool exhausted (soak)  | Resolved | Pool size increased from 10 to 50  |

---

## Residual risks

- Spike test not executed (out of scope). A sudden 10x traffic event (e.g. viral
  campaign) has not been validated. Mitigation: ensure auto-scaling is enabled
  and alert thresholds are set before release.
- Stress test breaking point (480 VU) is 2.4x the expected peak (200 VU). Headroom
  is adequate but not large. Recommend monitoring closely at launch.

---

## Sign-off

| Role                   | Name         | Decision | Date |
|------------------------|--------------|----------|------|
| Release Manager        |              |          |      |
| Technical Lead         |              |          |      |
| Project Sponsor        |              |          |      |
| QA Lead (Resillion)    | Lewis Elliott| APPROVED | 2026-05-07 |
```

The sign-off table is not theatre. If a stakeholder signs GO they are acknowledging the residual risks. If they cannot explain what they are signing, the pack is not clear enough.

---

## Executive Summary Format

The executive summary opens the final report and the go/no-go pack. It is the only section most sponsors read. Keep it to one page, never more.

```
## Executive Summary

Resillion conducted performance testing of the Acme Platform v2.3.0 between
24 April and 7 May 2026. The engagement validated 7 non-functional requirements
covering response time and throughput under expected and peak load conditions.

Two defects were identified and resolved during the engagement. The most
significant — a missing database index on the product search feature — caused
response times to exceed the agreed threshold under sustained load. Following
the fix, all endpoints now meet or exceed their performance targets.

The system reached a stable breaking point at 480 concurrent users — 2.4 times
the expected peak. Memory and connection behaviour were stable over a two-hour
sustained test.

Resillion recommends proceeding with the planned release. One residual risk
has been noted: spike testing was out of scope, and sudden traffic surges
above 480 concurrent users have not been validated. This is documented in
section 5 and should be monitored at launch.

Key figures:
- NFRs tested: 7
- NFRs passing: 7 (2 required remediation during testing)
- Performance defects raised: 2
- Performance defects outstanding: 0
- Breaking point: 480 VU (2.4x expected peak)
- Soak test duration: 2 hours — stable
```

Rules for the executive summary: one recommendation, key figures as bullets, residual risk called out, no percentile notation unless the audience is technical.

---

## Defect Reporting During a Performance Cycle

Performance defects follow the same lifecycle as functional defects but need additional fields that functional bugs do not require.

```
Title: [Endpoint] [metric] exceeds NFR under [load condition]
Example: GET /api/search p95 latency exceeds 800ms NFR under 80+ concurrent users

Severity classification:
  Critical — NFR exceeded by > 50%, or error rate > 5%
  High     — NFR exceeded by 10–50%, or error rate 1–5%
  Medium   — NFR exceeded by < 10%, or error rate 0.5–1%
  Low      — NFR met but headroom < 10%; trend risk

Required fields beyond standard defect:
  Load profile at time of failure (VU count, ramp shape, duration)
  Measured value at failure (p50, p95, p99, error rate)
  NFR threshold being violated
  Environment and build ref
  Link to the run report and raw results
  Grafana / APM snapshot at time of failure

Steps to reproduce:
  1. Deploy build abc1234 to staging-eu-west-1
  2. Run k6 script /scripts/search-load.js with 80 VUs
  3. Observe p95 latency exceeding 800ms after approx 8 minutes

Expected: p95 < 800ms per NFR-003
Actual: p95 = 1243ms, p99 = 2710ms, error rate = 2.1%
```

Link every performance defect back to its NFR ID. This makes the NFR pass/fail table easy to maintain — the defect tracks what is broken; the table tracks whether it is fixed.

---

## Interim vs Final Report: Key Differences

| Dimension | Interim | Final |
|---|---|---|
| Purpose | Status update; surface blockers early | Full record; client-deliverable |
| Defects | All open defects listed, status current | All defects from the engagement, final resolution |
| NFR table | Partial (only tested so far) | Complete (every NFR, final result) |
| Recommendations | Provisional | Definitive |
| Sign-off | Not required | Required from QA lead; optional from client |
| Length | 1–2 pages | 10–20 pages including appendices |
| Trend analysis | Omit (too early) | Include if multiple test cycles ran |
| Appendices | None | Raw results, tool configs, test scripts, environment spec |

The interim report is a working document. The final report is a deliverable. Write them differently.

---

## Common Reporting Failures

**Reporting average response time instead of percentiles**
Averages hide tail latency. A system where 95% of requests complete in 100ms and 5% time out at 30s has an "average" of 1.6s that sounds acceptable. Always report p50, p95, p99 as the baseline set. Add max only when there is a specific reason to highlight tail behaviour.

**NFR table with rows missing**
Any NFR that was agreed at engagement start but not yet tested must appear as `PENDING` or `NOT RUN`, never omitted. A missing row reads as a pass to stakeholders scanning the table.

**Presenting a FAIL without a cause and an owner**
A red cell in the NFR table must be accompanied by a defect ID, a probable cause, and an owner. "FAIL" with no context is unusable — the project manager cannot escalate it and the developer cannot fix it.

**Go/no-go pack that requires the reader to have read all prior reports**
Each sign-off pack must stand alone. Include the NFR table, the defect log, and the risk summary in the pack itself. A sponsor should not need to hunt for context.

**Trend data never reviewed between releases**
The trend table exists to catch gradual degradation before it becomes a production failure. If it is only written into the final report and never reviewed mid-engagement, it serves no early-warning function. Review it at each sprint review with the tech lead.

**Risk summary buried in appendices**
Risks must be in the main body of every stakeholder-facing report. An appendix is where readers stop reading. If a spike test was out of scope, that risk belongs on the first page of the go/no-go pack, not page 12.

---

## Connections

[[qa/performance-testing-qa]] · [[qa/non-functional-testing]] · [[qa/test-reporting]] · [[qa/qa-metrics]] · [[qa/test-planning]] · [[qa/test-documentation]] · [[qa/risk-based-testing]] · [[qa/qa-hub]]

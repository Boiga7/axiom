---
type: concept
category: qa
tags: [release-management, sign-off, quality-gates, governance, go-no-go]
sources: []
updated: 2026-05-03
para: resource
tldr: Release sign-off is the formal quality gate between testing and production. A senior QA consultant owns the no-go authority, designs measurable exit criteria, documents known-defect risk decisions, and communicates quality status to stakeholders who have the power — and the pressure — to override it.
---

# Release Sign-Off and Go/No-Go Governance

Release sign-off is the formal quality gate between testing and production. A senior QA consultant owns the no-go authority, designs measurable exit criteria, documents known-defect risk decisions, and communicates quality status to stakeholders who have the power — and the pressure — to override it.

---

## Who Owns the Go/No-Go Decision (RACI)

The RACI for a release decision is not the same as accountability for the release outcome. Quality is a shared responsibility; the sign-off decision is not.

| Role | R | A | C | I |
|---|---|---|---|---|
| QA Lead / Senior QA Consultant | R | A | — | — |
| Engineering Lead | — | — | C | I |
| Product Manager | — | — | C | I |
| Release Manager | — | — | C | I |
| Security / Compliance (if in scope) | — | — | C | I |
| CTO / VP Eng (escalation only) | — | — | C | — |

**R = Responsible** — the QA lead does the assessment and produces the recommendation.  
**A = Accountable** — the QA lead is accountable for the quality signal; they are the single throat to choke if the process is skipped.  
**C = Consulted** — engineering leads input on defect feasibility, PMs on business priority, security on risk posture.  
**I = Informed** — stakeholders receive the outcome but do not gate it.

The PM does not have veto power over a no-go recommendation on quality grounds. They may escalate. The escalation path should be documented in the release process before the first high-stakes release, not during one.

When a PM or CTO overrides a no-go:
1. Document the override in writing with the specific defects being accepted.
2. Both the QA lead and the overriding authority sign the document.
3. Attach it to the release ticket or JIRA release version.
4. This is not a failure state — risk-based decisions are legitimate. Undocumented override is the failure state.

---

## Entry and Exit Criteria Design

Entry criteria define when testing can start. Exit criteria define when it can stop.

### Entry Criteria (before testing begins)

| Criterion | Measurable form |
|---|---|
| Build stability | No P1/P2 defects open from the previous regression run |
| Environment readiness | Test environment passes smoke suite (pass rate >= 95%) |
| Test data provisioned | All data sets from [[qa/test-data-management]] loaded and verified |
| Feature completeness | All stories accepted by PM in staging (no "almost done" scope) |
| Security review complete | Security sign-off attached to release ticket (if release touches auth, PII, or payment) |

Skipping entry criteria is how teams enter a testing cycle on a broken build and waste three days.

### Exit Criteria (before sign-off)

Exit criteria must be measurable. "All tests pass" is not a criterion — it is an aspiration. Write them in the form: **metric >= threshold**.

| Category | Example criterion |
|---|---|
| Test execution | Planned tests executed >= 98% |
| Pass rate | Critical-path pass rate = 100% |
| Pass rate | Overall automated pass rate >= 95% |
| Open defects | P1 open defects = 0 |
| Open defects | P2 open defects <= 2, each with documented mitigation |
| Open defects | P3 open defects <= 10 (tracked, not blocking) |
| Coverage | New code statement coverage >= 80% |
| Performance | p95 response time <= 500 ms on checkout endpoint under 100 RPS |
| Regression | Regression suite pass rate >= 97% |
| Known issues | Every open defect has: severity, affected users estimate, mitigation, owner |

The threshold values are not universal — they are negotiated at the start of the project between QA, engineering, and product. The point is that they exist, are written down, and are agreed before anyone is under release pressure.

---

## How to Write Measurable Exit Criteria

The anti-pattern: "All critical tests pass." This fails because "critical" is undefined and "pass" is binary when reality is not.

The pattern:

```
[Metric] [Operator] [Threshold] [for Scope] [by Measurement Method]
```

Examples:

```
Automated regression pass rate >= 97% for the checkout service
measured by the nightly CI run in staging as of build 4.2.1.

P1 defects open = 0 at the time of sign-off
measured by JIRA filter PROJ-RELEASE-P1 with status != Done.

API response time p95 <= 300 ms under 200 concurrent users
measured by the Gatling load test run on staging-perf.

No NEW security findings of severity HIGH or CRITICAL
measured by the OWASP ZAP DAST scan run against staging.
```

The measurement method matters. If the criterion is "p95 latency <= 300 ms" but the load test only runs 10 users, the criterion is technically met and meaningless.

---

## Release Readiness Report Format

The release readiness report is the artefact that captures quality status at sign-off. It should be producible in under 30 minutes from CI data and JIRA.

```
## Release Readiness Report — [Product Name] v[X.Y.Z]
**Date:** YYYY-MM-DD  
**QA Lead:** [Name]  
**Release window:** YYYY-MM-DD HH:MM [TZ]

### 1. Scope
- Features: [list from release ticket]
- Excluded from this release: [anything explicitly descoped]

### 2. Exit Criteria Status
| Criterion | Target | Actual | Status |
|---|---|---|---|
| Regression pass rate | >= 97% | 98.4% | PASS |
| P1 defects open | 0 | 0 | PASS |
| P2 defects open | <= 2 | 1 | PASS |
| New code coverage | >= 80% | 76.3% | FAIL — waiver granted (see §4) |
| p95 latency checkout | <= 500 ms | 487 ms | PASS |

### 3. Defect Summary
| ID | Title | Severity | Status | Decision |
|---|---|---|---|---|
| PROJ-441 | Discount not applied on bulk orders | P2 | Open | Ship with mitigation: bulk orders flagged for manual review |
| PROJ-482 | Tooltip misaligned on mobile Safari | P3 | Open | Ship — cosmetic, no functional impact |

### 4. Waivers and Risk Acceptances
[Document each waiver with: what criterion failed, why it is being waived,
 who approved the waiver, and what compensating controls are in place.]

### 5. Rollback Plan
- Rollback trigger: [specific conditions — see Rollback section below]
- Rollback method: [blue/green switch, Helm rollback, feature flag disable]
- Rollback owner: [name]
- Estimated rollback time: [minutes]

### 6. Recommendation
[ ] GO — all exit criteria met or waived with documented approval  
[ ] NO-GO — [list blocking items]

**Signed:** [QA Lead]  
**Date:** [YYYY-MM-DD HH:MM]
```

---

## Risk-Based Release Decisions: Shipping with Known Defects

Shipping with known defects is normal. The question is not "are there open bugs?" — there are always open bugs. The question is: "are the open defects documented, understood, and accepted by the right people?"

### Defect Severity Thresholds for Blocking a Release

| Severity | Definition | Default decision |
|---|---|---|
| P1 / Critical | Data loss, security breach, complete feature failure with no workaround, revenue loss | Blocking — no release without explicit CTO/VP sign-off |
| P2 / Major | Key feature degraded, workaround exists, affects a defined user segment | Blocking by default — can be shipped with documented mitigation and PM+QA sign-off |
| P3 / Minor | Feature works but with usability issues, cosmetic, affects edge cases | Non-blocking — tracked, ship with acknowledgement |
| P4 / Trivial | Typos, minor cosmetic, no user impact | Non-blocking — tracked for next release |

These are defaults. Override them for regulated industries: P3 in a medical device context is P1 anywhere else.

### Documenting a Known-Defect Decision

For each defect being accepted into a release:

```
Defect: PROJ-441 — Discount not applied on bulk orders
Severity: P2
Affected users: ~3% of orders (bulk orders > 10 items with active promo code)
Business impact: Incorrect billing; customer support overhead
Mitigation: Bulk orders with promo codes flagged in the order management
  system for manual review before dispatch. Ops team briefed.
Monitoring: Alert on CS tickets mentioning "discount" post-release.
Resolution target: Sprint 24 (two sprints from now)
Accepted by: [PM name] [date] / [QA Lead name] [date]
```

Without this documentation, the next person who sees the defect does not know whether it was missed in testing, identified and accepted, or is being actively fixed. All three are different situations requiring different responses.

---

## Emergency Release Process

Emergency releases (hotfixes, critical security patches) bypass normal release gates by design. They require a compressed but explicit process.

### Emergency Release Checklist

```
[ ] P1 defect or security CVE confirmed as requiring immediate action
[ ] Scope locked: this hotfix touches ONLY the affected code path
[ ] Unit tests pass for the changed code
[ ] Targeted regression run complete: smoke + affected-area tests (not full suite)
[ ] Code reviewed by at least one engineer who did not write the fix
[ ] QA lead reviewed and verbally confirmed (written sign-off within 24 hrs)
[ ] Rollback tested: confirm the hotfix can be reverted in < 5 minutes
[ ] On-call engineer confirmed available for 2 hrs post-release
[ ] Post-incident review scheduled within 48 hrs
```

What changes for emergency releases:
- Full regression suite: optional, replaced by targeted run
- Coverage threshold: waived
- P3/P4 open defect count: not assessed

What does not change:
- P1 defects in the hotfix itself: still blocking
- Rollback plan: still required
- Written record of what shipped and why: still required

Teams that skip the "scope locked" check on hotfixes routinely create larger incidents than the original issue.

---

## Rollback Trigger Criteria

Define rollback triggers before release, not after an incident starts.

### Automatic rollback triggers (no human decision required)

| Signal | Threshold | Source |
|---|---|---|
| Error rate spike | > 5x baseline within 10 minutes post-release | APM / Sentry |
| 5xx rate | > 2% of requests for 5 consecutive minutes | Load balancer / CloudWatch |
| P99 latency | > 3x baseline for 5 consecutive minutes | APM |
| Failed health checks | 3 consecutive failures on critical endpoints | Uptime monitor |

### Manual rollback triggers (QA lead or on-call engineer decides)

- Core user journey failure rate rises significantly above baseline
- Payment processing errors appear where there were none before
- Customer support reports a pattern of identical failures within 30 minutes of release
- A P1 defect is discovered post-release that was not in the known-issues list

### Rollback decision criteria

Do not wait for perfect certainty before rolling back. The cost of a 5-minute outage for a planned rollback is almost always lower than the cost of debugging under production load.

Roll back when: the problem is production-confirmed, the root cause is unknown, and the risk of staying up exceeds the risk of downtime. You can always re-release after diagnosis.

---

## Communicating a No-Go Decision to Senior Stakeholders

A no-go decision will arrive when the pressure to release is highest. The communication has to be clear, non-defensive, and focused on the decision, not the relationship.

### Structure

1. **Status in one sentence.** "This release does not meet our exit criteria for go-live."
2. **What is blocking.** List the specific criteria that are not met. Numbers, not adjectives.
3. **The risk if shipped.** Be concrete: affected users, likely symptoms, revenue exposure if known.
4. **What it takes to get to go.** Estimated effort and timeline to resolve the blocking items.
5. **The alternatives.** Partial release, feature flag off, delay by X days.

### Example no-go message

```
The v4.3.0 release does not meet exit criteria.

Blocking items:
- PROJ-501: Payment confirmation not sent for orders over £500. Affects ~12% of 
  orders by value. Reproducible 100% of the time in staging. No mitigation.
- Regression pass rate: 91.2% (target >= 97%). 8 new failures, 3 undiagnosed.

Risk if shipped: Customer support volume spike, potential chargebacks, 
trust impact on high-value customers.

To reach GO: PROJ-501 fix is estimated at 1 day engineering effort. 
Regression failures need diagnosis — 3 are likely environment issues, 
3 are genuine regressions. Realistically 2 days to GO state.

Alternatives:
- Release with PROJ-501 scope removed (requires feature flag — feasible)
- Delay 2 days and re-assess
- Ship and accept the risk with documented PM+CTO sign-off

I recommend the feature-flag option if the business cannot absorb a 2-day delay.
```

This format gives the stakeholder everything they need to make an informed decision in under two minutes.

---

## Managing Pressure to Release with Quality Issues

This is the hardest part of the role. The technical work is the easy part.

### The dynamic

Release pressure is legitimate. Business commitments, customer promises, and competitive timing are real constraints. The QA lead's job is not to resist pressure but to make the risk visible so that the decision-maker can make an informed choice.

The failure mode is not "we released with a P2 bug." The failure mode is "we released with a P2 bug and nobody knew about it."

### Practical positioning

- Frame everything as a risk decision, not a quality decision. "This choice risks X" lands better than "we are not ready."
- Quantify impact in business terms. "Affects £40k/day in orders" gets more traction than "P2 severity."
- Provide options. A PM who hears "no" with no path forward becomes an adversary. A PM who hears "here are three options with their trade-offs" becomes a partner.
- Document everything in writing before the meeting, not after. If you raise a no-go verbally and get overruled, confirm the override by email immediately.
- Never agree that something is "fine" when it is not. You can agree that the risk is accepted. You cannot agree that the risk does not exist.

### Documenting override pressure

If you are asked to sign off on a release that you believe does not meet exit criteria, and the decision is overridden above you:

1. Write a brief risk statement documenting your recommendation and the override.
2. Get the overriding party to confirm receipt in writing (a reply to your email counts).
3. Attach it to the release ticket.
4. This protects both parties: it protects you from being blamed for the outcome, and it ensures the decision-maker understood the risk they were accepting.

This is not adversarial. It is professional documentation of a risk-based decision.

---

## Release Sign-Off in CI/CD vs Waterfall Contexts

### Waterfall / formal release cycle

- Sign-off is a discrete event at the end of the test phase.
- Release readiness report is formal, reviewed in a meeting, signed.
- Exit criteria are defined in the test plan at the start of the project.
- No-go leads to a defined remediation window and a re-entry to the test phase.
- Sign-off authority is explicit in the project governance documents.

### CI/CD / trunk-based delivery

- Sign-off is distributed across the delivery pipeline as quality gates.
- No single human sign-off event for every deployment.
- The QA role shifts from signing off individual releases to designing the gates that automate the sign-off decision.
- Human sign-off is reserved for: production deployments above a risk threshold, new feature flags being enabled for 100% of users, major version releases.

| Gate | Where in pipeline | Blocks |
|---|---|---|
| Unit test pass | PR check | Merge to trunk |
| Lint / type check | PR check | Merge to trunk |
| Integration test pass | Post-merge, pre-staging | Deploy to staging |
| Smoke suite pass | Post-staging deploy | Promote to production |
| Performance regression check | Nightly | Alert; manual decision |
| Human QA sign-off | Pre-production enable | Feature flag to 100% |

In CI/CD, the QA lead's governance work is writing the exit criteria for the gates, not executing the gates manually. The pipeline enforces the criteria; the QA lead audits and adjusts them.

---

## Quality Gates vs Quality Metrics: Lagging vs Leading Indicators

Quality gates are binary: pass or fail, ship or don't ship. Quality metrics are continuous: they tell you whether the system is healthy over time.

| Concept | Example | Type | When it tells you |
|---|---|---|---|
| Gate: regression pass rate | >= 97% | Lagging | After the test run |
| Gate: P1 open = 0 | Hard block | Lagging | After defects are filed |
| Metric: defect introduction rate | bugs per sprint | Lagging | End of sprint |
| Metric: escaped defect rate | prod bugs / total bugs | Lagging | Post-release |
| Metric: code churn rate | % lines changed | Leading | Before testing starts |
| Metric: PR review coverage | % PRs with QA review | Leading | Ongoing |
| Metric: test coverage delta | coverage change per sprint | Leading | Per sprint |

Gates block releases. Metrics predict future quality.

A release with all gates green but trending leading indicators (falling coverage, rising churn, declining PR review rates) is a warning that the next release will be harder to sign off.

Include one leading and one lagging indicator in every release readiness report. Over time, the leading indicators will predict gate failures before testing begins.

---

## Production Monitoring as a Post-Release Quality Gate

Release sign-off does not end at deployment. The final quality gate is the first 30–60 minutes in production.

### Post-release monitoring checklist

```
T+0:  Deploy complete. Health checks green. Confirm.
T+5:  Error rate baseline check — compare to pre-release 5-min average.
T+10: Core user journey success rate — run synthetic monitoring probe.
T+15: Review Sentry for any new exception classes introduced post-deploy.
T+30: Latency percentiles stable (p50, p95, p99 within 10% of pre-release).
T+60: First business metric check — order rate, sign-up rate, conversion
      rate within expected variance.
```

If any threshold is breached: engage rollback criteria immediately (see Rollback section).

The on-call engineer and the QA lead should both be available for T+60. This is not optional for releases that touch payment, auth, or data pipelines.

---

## Example Exit Criteria Tables

### Web application feature release

| Criterion | Target | Measurement | Blocking? |
|---|---|---|---|
| Critical path tests executed | 100% | Test management tool | Yes |
| Critical path pass rate | 100% | Test management tool | Yes |
| Overall automated pass rate | >= 95% | CI pipeline | Yes |
| P1 defects open | 0 | JIRA | Yes |
| P2 defects open | <= 2 (mitigated) | JIRA | Yes |
| P3 defects open | <= 15 | JIRA | No |
| New code coverage | >= 80% | Codecov | No (waivable) |
| Regression suite pass rate | >= 97% | CI pipeline | Yes |
| OWASP ZAP scan: HIGH findings | 0 new | ZAP report | Yes |
| p95 API latency (staging, 100 RPS) | <= 400 ms | Gatling | Yes |
| Cross-browser: Chrome, Firefox, Safari | All critical paths pass | Playwright CI | Yes |
| Accessibility: WCAG 2.1 AA | 0 new violations | axe-core | No |

### API / microservice release

| Criterion | Target | Measurement | Blocking? |
|---|---|---|---|
| Contract tests pass | 100% | Pact CI | Yes |
| Integration tests pass | 100% | CI pipeline | Yes |
| Backwards compatibility verified | No breaking changes | API diff tool | Yes |
| P1 defects open | 0 | JIRA | Yes |
| Load test: steady state (200 RPS) | < 1% error rate | k6 | Yes |
| Load test: peak (500 RPS) | < 5% error rate | k6 | Yes |
| p99 latency under load | <= 800 ms | k6 | Yes |
| Security: no NEW high-severity CVEs | 0 | Snyk scan | Yes |

---

## Common Failure Cases

**Exit criteria written as "all tests pass" with no threshold for what "all" means**
Why: teams inherit a release checklist with vague language and never challenge it; "all tests pass" sounds rigorous until the suite has 12 known-flaky tests that are excluded from the count.
Detect: ask "how many tests are currently excluded from the pass-rate calculation and why?" — if the answer is unclear, the criterion is meaningless.
Fix: rewrite criteria as "automated regression suite pass rate >= 97% excluding tests in the quarantine list, quarantine list size <= 5 and decreasing sprint-over-sprint."

**No-go decisions made verbally, then disputed or forgotten**
Why: release meetings are high-pressure; verbal decisions feel faster; no one writes the summary email; two weeks later the PM remembers the decision differently than the QA lead.
Detect: review the last three release decisions — if none have a written record in the release ticket, the process is running on memory.
Fix: whoever owns the release ticket is responsible for adding a one-paragraph summary of the go/no-go outcome and any overrides within 2 hours of the decision; QA lead reviews and confirms.

**Rollback criteria not defined until an incident is in progress**
Why: teams assume they will know a rollback is needed when they see it; in practice, the decision is delayed by 20–40 minutes while engineers debate thresholds under pressure.
Detect: ask any engineer on the team "at what error rate would we roll back the last release automatically?" — if the answer varies or is unknown, the criteria do not exist.
Fix: add a "rollback criteria" section to every release readiness report; it takes 5 minutes to fill in and saves 30 minutes of incident confusion.

**P2 defects accepted without mitigation documentation, leading to repeat incidents**
Why: under time pressure, "we'll accept the risk" is said aloud but never written down; the next sprint, nobody knows whether the defect was known and accepted or missed in testing; the same defect ships again.
Detect: pull the last 5 production incidents and check whether the root cause defect was open at the time of the release that introduced it; if yes and there is no acceptance record, the process has a gap.
Fix: every P2 or above defect accepted into a release must have a one-paragraph acceptance record in JIRA before sign-off is granted; QA lead will not sign the readiness report until this field is populated for every open P2.

**Emergency release process used for non-emergencies to bypass quality gates**
Why: the emergency process is faster and less friction than the standard process; once teams discover this, the definition of "emergency" expands until every third release is emergency-classified.
Detect: if more than 10% of releases use the emergency track, the standard process is too slow or the emergency criteria are too loose.
Fix: require CTO or VP Engineering to classify a release as an emergency in writing before the compressed process is engaged; this creates a natural throttle without adding process to genuine emergencies.

---

## Connections

- [[qa/qa-hub]] — this page belongs to the release governance section
- [[qa/risk-based-testing]] — risk scores feed directly into defect severity and blocking decisions
- [[qa/test-reporting]] — release readiness report is the culminating report artefact
- [[qa/qa-metrics]] — lagging and leading indicators tracked across release cycles
- [[qa/qa-in-devops]] — quality gates in CI/CD pipelines are the automated form of exit criteria
- [[qa/test-environments]] — environment readiness is an entry criterion for every release
- [[qa/continuous-testing]] — continuous testing shifts sign-off left into the pipeline
- [[qa/production-monitoring-qa]] — post-release monitoring is the final quality gate
- [[qa/qa-leadership]] — managing stakeholder pressure is a leadership competency

## Open Questions

- How do you maintain meaningful exit criteria thresholds when deployment frequency moves to multiple times per day?
- At what point does a quality gate in CI/CD fully replace human sign-off for a given release type?

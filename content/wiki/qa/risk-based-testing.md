---
type: concept
category: qa
para: resource
tags: [risk-based-testing, risk-assessment, test-prioritisation, qa, quality]
sources: []
updated: 2026-05-01
tldr: Prioritise testing effort toward areas of highest risk. You never have enough time to test everything — risk-based testing ensures the most critical and failure-prone areas get the most attention.
---

# Risk-Based Testing

Prioritise testing effort toward areas of highest risk. You never have enough time to test everything — risk-based testing ensures the most critical and failure-prone areas get the most attention.

---

## The Core Idea

**Risk = Likelihood of failure × Impact of failure**

High likelihood and high impact → test first, test thoroughly.
Low likelihood and low impact → test last, test lightly.

Without risk analysis, teams tend to test what's easiest or what they're most familiar with — not what matters most.

---

## Risk Identification

Sources of risk in a software product:

**Technical risks:**
- Complex logic (calculations, state machines, algorithms)
- Recent changes (most bugs are introduced near the change)
- New code (unfamiliar territory; no regression baseline)
- Third-party integrations (external systems, APIs)
- Concurrency and race conditions
- Edge cases in data handling (null, empty, extreme values)
- Security-sensitive paths (auth, payment, PII)
- Performance-sensitive paths (high-traffic endpoints)

**Business risks:**
- Revenue-critical flows (checkout, billing, subscription management)
- High-visibility features (homepage, sign-up flow)
- Legal/compliance requirements (GDPR, PCI-DSS, accessibility)
- SLA commitments (uptime, response time)
- Regulatory deadlines

---

## Risk Assessment Matrix

Score each area on two axes:

**Likelihood** (1–5):
1. Very unlikely — stable, well-tested, unchanged in months
2. Unlikely — minor changes, good test coverage
3. Possible — moderate changes, known complexity
4. Likely — significant changes, limited coverage
5. Very likely — new area, no coverage, complex logic

**Impact** (1–5):
1. Negligible — cosmetic issue, no user impact
2. Minor — user inconvenienced, easy workaround
3. Moderate — partial feature failure, workaround exists
4. Major — key feature unusable, no workaround
5. Critical — data loss, security breach, revenue impact

**Risk score** = Likelihood × Impact (1–25)

| Risk Score | Priority | Test depth |
|---|---|---|
| 20–25 | Critical | Full coverage; exploratory + automation |
| 12–19 | High | Broad coverage; automate key paths |
| 6–11 | Medium | Happy path + main negatives |
| 1–5 | Low | Basic smoke test or skip |

---

## Risk Register (Example)

For a checkout feature:

| Area | Likelihood | Impact | Score | Action |
|---|---|---|---|---|
| Payment processing | 3 | 5 | 15 | High — full test coverage, E2E |
| Promo code calculation | 4 | 4 | 16 | High — EP + BVA for all discount types |
| Order confirmation email | 2 | 3 | 6 | Medium — happy path + invalid email |
| Order history display | 2 | 2 | 4 | Low — basic smoke |
| Currency formatting | 3 | 3 | 9 | Medium — check all supported locales |

---

## Risk-Based Test Planning in a Sprint

**Before the sprint:**
1. Review the user stories and changes in scope
2. Identify risk areas using the matrix
3. Map test types to risk level (unit for logic, E2E for flows, performance for load paths)
4. Assign time budget proportional to risk score

**Sprint boundary:**
- Critical and High risks: test before release gate
- Medium risks: test before release but can be descoped if schedule pressure
- Low risks: test opportunistically; skip if time-pressured

**At release:**
Risk-based regression — don't retest everything on every release. Focus regression effort on:
- Areas changed in this release
- Areas that were High/Critical risk in previous sprints
- Areas with historical defect density

---

## The 80/20 Rule for Testing

Roughly 80% of defects come from 20% of the code. Find that 20% by analysing:
- Defect history — which modules have the most bugs?
- Code complexity metrics (cyclomatic complexity) — which functions are hardest to reason about?
- Change frequency (git history) — which files are edited most often?
- Code review comments — which areas generate the most discussion?

Concentrate test effort on that 20%.

```bash
# Find most-changed files in git history
git log --pretty=format: --name-only | sort | uniq -c | sort -rn | head -20
```

---

## Failure Mode and Effect Analysis (FMEA)

More rigorous risk technique used in safety-critical systems (medical, automotive). For each component:

1. **Failure mode** — what could go wrong?
2. **Effect** — what happens when it fails?
3. **Severity** (1–10)
4. **Occurrence** — how likely to occur? (1–10)
5. **Detection** — how likely to be caught before reaching users? (1–10, where 10 = very hard to detect)
6. **RPN** (Risk Priority Number) = Severity × Occurrence × Detection

Actions prioritised by highest RPN.

---

## Risk Review During Testing

Risk evolves. Update the risk assessment when:
- A bug is found in a previously "low risk" area — recalibrate
- A feature grows in scope mid-sprint — rerun risk analysis
- New third-party dependency introduced — add to risk register
- Performance issue found — add load tests to scope

---

## Communicating Risk to Stakeholders

When time pressure requires descoping tests, communicate the risk explicitly:

```
"We are releasing with the following known untested areas:
 - Currency conversion in the checkout: Medium risk, potential rounding errors
 - Concurrent order creation: Medium risk, potential race condition on inventory

Mitigation: We will monitor Sentry error rates post-release and have a 
rollback plan ready. These areas are scheduled for test coverage next sprint."
```

This makes risk visible. Stakeholders can accept it with awareness, or delay the release. Either is a valid outcome.

---

## Connections

- [[qa/test-strategy]] — risk-based testing is the prioritisation layer within the strategy
- [[qa/test-case-design]] — risk score determines how many test cases to derive per area
- [[qa/exploratory-testing]] — high-risk areas warrant exploratory charters
- [[qa/qa-metrics]] — defect density by module informs risk calibration
- [[qa/bug-lifecycle]] — high-risk area bugs get Critical/P1 severity treatment

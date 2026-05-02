---
type: concept
category: qa
para: resource
tags: [test-automation, strategy, roi, tool-selection, build-vs-buy]
sources: []
updated: 2026-05-01
tldr: The plan for where, when, and what to automate — and what not to. Automation without strategy produces a flaky, expensive test suite that nobody trusts.
---

# Test Automation Strategy

The plan for where, when, and what to automate, and what not to. Automation without strategy produces a flaky, expensive test suite that nobody trusts. Strategy without automation produces manual bottlenecks.

---

## What to Automate

```
Automate when:
  - Test runs repeatedly (regression, CI, release gate)
  - Steps are deterministic and machine-verifiable
  - Human execution is slow, expensive, or error-prone
  - Feedback speed matters (wait 2 hours for manual regression vs 15 min CI)

Don't automate when:
  - The UI changes frequently (high maintenance cost)
  - Test will only run once or twice
  - Exploratory testing — creativity can't be scripted
  - Subjective judgement required (aesthetics, UX feel)
  - Setup cost > value gained before feature changes
```

---

## The Automation Pyramid

```
        [  Manual Exploratory  ]     ← small, human judgement
       [    E2E / UI Tests    ]      ← 5-10% of tests; expensive but high confidence
      [   Integration Tests  ]       ← 20-30%; test service boundaries
     [      Unit Tests       ]       ← 60-70%; fast, isolated, cheap
```

Inverted pyramid (too many E2E, too few unit tests) = slow, flaky, brittle CI.

---

## Tool Selection Criteria

| Criterion | Questions |
|---|---|
| Language fit | Does it match the team's existing language (Python/JS/Java)? |
| Framework integration | Native support for your frontend framework? |
| Maintenance cost | How often do selectors break? Self-healing? |
| Parallelism | Can it shard tests across workers/machines? |
| CI integration | Docker support, JUnit XML output, artifact collection? |
| Community | Active development? Good documentation? |
| Cost | Open source vs paid (Cypress Cloud, Percy, BrowserStack)? |
| Learning curve | How long until the team is productive? |

---

## Build vs Buy

| | Build (OSS) | Buy (SaaS) |
|---|---|---|
| Control | Full | Limited |
| Cost | Engineering time + infra | Subscription |
| Maintenance | You own it | Vendor handles it |
| Customisation | Unlimited | Vendor roadmap |
| Speed to value | Slower | Faster |

Build: test frameworks (pytest, Playwright), CI runner configuration.
Buy: visual testing (Percy), device lab (BrowserStack), load testing (k6 Cloud), test management (TestRail), DAST (ZAP SaaS).

---

## Automation ROI Calculation

```python
# Monthly hours saved by automation
manual_test_time_hours = 8    # hours per manual regression run
runs_per_month = 20           # CI runs + manual runs
ci_run_time_hours = 0.25      # automated suite takes 15 min
engineer_hourly_rate = 75     # £ per hour

monthly_manual_cost = manual_test_time_hours * runs_per_month * engineer_hourly_rate
monthly_automated_cost = ci_run_time_hours * runs_per_month * engineer_hourly_rate

monthly_saving = monthly_manual_cost - monthly_automated_cost
# = (8 * 20 * 75) - (0.25 * 20 * 75) = £12,000 - £375 = £11,625/month

automation_build_cost = 40 * engineer_hourly_rate  # 40 hours to automate
payback_period_months = automation_build_cost / monthly_saving
# = £3,000 / £11,625 = 0.26 months → pays back in 1 week
```

---

## Automation Debt

When the automation suite is the problem:
- Flaky rate > 5% of tests per run → stop new automation, fix existing
- Suite duration > 30 min → shard or cull redundant tests
- > 3 failed PRs per week due to test environment issues → fix the env, not the tests
- Coverage shrinking over time → automation coverage must be a DoD requirement

---

## Phased Automation Roadmap

```
Phase 1 (Month 1–2): Foundation
  - CI pipeline with unit + integration tests
  - Smoke tests for critical paths
  - One browser (Chrome) for E2E
  - Metrics baseline: suite duration, pass rate

Phase 2 (Month 3–4): Expand
  - API test suite (contract tests, integration tests)
  - Visual regression on key pages
  - Cross-browser (add Firefox, Safari)
  - Flaky test SLA implemented

Phase 3 (Month 5–6): Optimise
  - Test parallelisation / sharding
  - Performance baseline automation
  - Accessibility gates in CI
  - Coverage trend tracking

Phase 4: Mature
  - Mutation testing on critical modules
  - Full security automation pipeline
  - Mobile automation (Appium/BrowserStack)
  - Synthetic monitoring in production
```

---

## Common Failure Cases

**Inverted pyramid: E2E suite grows unchecked while unit test coverage is low**
Why: QA engineers naturally write Playwright/Selenium tests because they're visible and easy to demo, while unit test responsibility falls through the gap between dev and QA ownership.
Detect: E2E suite takes 30+ minutes, unit suite takes under 2 minutes — the ratio of E2E to unit tests exceeds 1:5.
Fix: add unit test coverage as a PR merge requirement (`--cov-fail-under=80`); cap the E2E suite at smoke + critical journeys and reject new E2E tests that duplicate covered integration tests.

**ROI calculation ignores maintenance cost, making automation look cheaper than it is**
Why: the build-cost estimate accounts for initial automation time but not the ongoing cost of updating selectors, test data, and assertions as the application evolves.
Detect: engineer hours spent fixing broken tests exceeds hours saved in a given sprint; the automation cost line in team velocity charts is rising.
Fix: track "test maintenance hours per sprint" as a metric; if it exceeds 20% of QA capacity, the suite has automation debt and the roadmap should pause new automation until flakiness and maintenance costs are reduced.

**Tool selected for features the team will never use, wrong language fit**
Why: Cypress was chosen because it has a nice UI, but the team writes Python and the backend tests are all pytest; the context switch creates friction and the Cypress suite gets abandoned.
Detect: the tool's test directory has not been committed to in 30+ days despite active feature development.
Fix: apply the tool selection criteria before adoption — language fit is the most important criterion; a pytest + Playwright (Python) setup has lower adoption cost for a Python team than a JavaScript-only tool.

**Automation roadmap phases skipped, jumping straight to Phase 3 optimisation**
Why: teams add parallelisation and visual regression before establishing reliable baselines, so they're optimising an unreliable suite and can't tell if the optimisations help.
Detect: the test suite is parallelised but the pass rate is below 90%, meaning flaky tests are masking real failures.
Fix: enforce phase gates: the Phase 2 prerequisite is a sustained pass rate above 95% for two weeks; do not invest in parallelisation until the suite is stable.

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/qa-in-devops]] · [[qa/qa-metrics]] · [[qa/regression-testing]] · [[technical-qa/flaky-test-management]]

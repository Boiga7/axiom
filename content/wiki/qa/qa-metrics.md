---
type: concept
category: qa
para: resource
tags: [qa-metrics, quality-metrics, defect-density, test-coverage, reporting]
sources: []
updated: 2026-05-01
tldr: Metrics make quality visible and improvement measurable. Without them, QA discussions are opinions; with them, they're data-driven decisions. Track metrics to improve processes, not to measure people.
---

# QA Metrics

Metrics make quality visible and improvement measurable. Without them, QA discussions are opinions; with them, they're data-driven decisions. Track metrics to improve processes, not to measure people.

---

## Core Quality Metrics

### Defect Density

Bugs found per unit of code or functionality.

```
Defect Density = Total defects / KLOC (thousands of lines of code)
              OR = Total defects / number of features / story points
```

**What it tells you:** Modules with consistently high defect density need refactoring, more unit tests, or more careful review. It reveals where to invest quality effort next.

### Defect Detection Rate (DDR)

The percentage of defects found by testing (not by users in production).

```
DDR = Bugs found in testing / (bugs in testing + bugs in production) × 100
```

**Target:** > 95%. If production is finding significant bugs, the test process has coverage gaps.

### Defect Escape Rate (DER)

Inverse of DDR. Proportion of bugs that slipped through to production.

```
DER = Production bugs / total bugs × 100
```

**Target:** < 5%. Track by severity — P1 escapes to production are the measure that actually matters.

### Test Pass Rate

```
Pass Rate = Tests passed / total tests executed × 100
```

A consistently low pass rate (< 90%) suggests tests are broken, not bugs. A suddenly low pass rate suggests a regression. Trend matters more than absolute value.

### Test Coverage

```
Coverage = Test cases executed / total test cases in scope × 100
```

Separate from code coverage (which measures automated test coverage of source code). QA test coverage measures execution completeness against the planned test suite.

### Defect Age

Average time a bug lives from report to closure.

```
Defect Age = (Close date - Open date), averaged across bugs
```

Long-lived bugs indicate prioritisation problems or blocked fixes. Age-by-severity is the meaningful breakdown — P1 bugs should close within hours, not days.

---

## Testing Efficiency Metrics

### Test Execution Efficiency

```
Execution Efficiency = Tests executed per day (or per sprint)
```

Baseline this, then track changes. Automation reduces execution time and increases this number without adding headcount.

### Automation Coverage

```
Automation Coverage = Automated test cases / total test cases × 100
```

Track separately for different test types:
- Unit test automation: should be near 100%
- API test automation: should be 80%+
- E2E automation: aim for critical paths (may be 40-60% by count, but >90% by risk)

### Flaky Test Rate

```
Flaky Rate = Tests with intermittent failures / total automated tests × 100
```

**Target:** < 2%. Flaky tests erode trust in the test suite. A test that sometimes passes and sometimes fails is worse than no test — it adds noise without signal. Track flaky tests and fix or quarantine them immediately.

### Automation ROI

```
Time saved = (manual execution time × runs per sprint) - automation run time
ROI = Time saved / time invested in building automation
```

Justifies investment. A 30-minute manual regression suite that runs twice per sprint and took 8 hours to automate pays off after 8 sprints.

---

## Defect Distribution Metrics

### Defects by Phase

Where in the SDLC bugs are found:

| Phase | % of defects | Trend to watch |
|---|---|---|
| Requirements | ~5% | Low = good; high = requirements quality issue |
| Design | ~10% | |
| Development (unit/integration) | ~50% | |
| System/UAT | ~30% | |
| Production | ~5% | **Target: < 5%** |

### Defects by Root Cause

Track root cause categories (see [[qa/bug-lifecycle]]). Monthly reporting reveals:
- "Missing requirement" spiking → need better upfront analysis
- "Regression" spiking → need better automated coverage
- "Third-party" spiking → need better contract tests

### Defects by Module

Which parts of the application generate the most bugs? Pareto chart analysis: rank modules by defect count. The top 20% of modules typically generate 80% of bugs.

---

## Release Metrics

### Release Quality Index

A composite score for release readiness:

```
RQI = (Pass rate × 0.4) + ((1 - DER) × 0.4) + (Coverage × 0.2)
```

Tune the weights to your team's priorities.

### Mean Time to Detect (MTTD)

Average time from bug introduction to discovery.

```
MTTD = Average(detection date - introduction date)
```

Shorter MTTD means faster feedback loops. CI running tests on every commit drives MTTD toward zero for code-level bugs.

### Mean Time to Resolve (MTTR)

Average time to fix a bug once discovered.

```
MTTR = Average(closed date - opened date)
```

Track by severity. P1 MTTR measured in hours; P3 measured in sprints.

---

## Dashboard Design

A useful QA dashboard shows:

**Sprint view:**
- Open / In Progress / Fixed / Closed bugs by priority
- Test execution: Planned vs Executed vs Pass/Fail
- Blockers and critical bugs

**Trend view (rolling 12 weeks):**
- Defect injection rate (bugs opened per sprint)
- Defect resolution rate (bugs closed per sprint)
- DER trend line

**Release view:**
- Release quality gate: Coverage ✓/✗, Critical bugs = 0 ✓/✗, DER < 5% ✓/✗

---

## Reporting to Stakeholders

Translate metrics into business language:

| QA metric | Business framing |
|---|---|
| DER = 8% | "8% of our bugs are found by users, not us — that's 2× the target" |
| MTTD = 4 days | "It takes 4 days on average to find a bug after it's introduced — we need faster CI feedback" |
| Flaky rate = 12% | "1 in 8 CI runs fails for reasons unrelated to real bugs — slowing delivery" |
| Automation coverage = 60% | "40% of our regression suite is still manual — risk of missed regressions at this pace" |

---

## Connections

- [[qa/test-strategy]] — metrics inform strategy adjustments over time
- [[qa/bug-lifecycle]] — defect lifecycle is the source of most metric data
- [[qa/risk-based-testing]] — defect density by module calibrates risk scores
- [[qa/test-case-design]] — test execution metrics depend on test case quality
- [[qa/qa-tools]] — TestRail, Jira, and dashboarding tools that surface these metrics

---
type: concept
category: qa
para: resource
tags: [agile, scrum, qa, sprint, definition-of-done, devtestops]
sources: []
updated: 2026-05-01
tldr: How quality assurance integrates with Scrum and agile delivery. QA is not a phase at the end of a sprint — it's a continuous activity woven through every sprint ceremony and development step.
---

# QA in Agile

How quality assurance integrates with Scrum and agile delivery. QA is not a phase at the end of a sprint. It's a continuous activity woven through every sprint ceremony and development step.

---

## The Waterfall QA Problem

Traditional waterfall: Design → Develop → Test → Release. QA gets a compressed window at the end. By the time QA finds bugs, developers have moved on to the next feature. Context is lost. Fixes are rushed.

Agile QA: quality is everyone's responsibility, built in from the start of each story.

---

## QA in the Sprint Lifecycle

```
Sprint Planning
  └── QA reviews stories for testability
       └── Flags missing acceptance criteria
       └── Estimates test effort
       └── Identifies risks

Development (during sprint)
  └── Dev writes unit/integration tests
  └── QA reviews test plan with dev
  └── QA tests features as they're completed (not at end)

Sprint Review / Demo
  └── QA confirms features meet acceptance criteria

Sprint Retrospective
  └── QA raises quality issues: escaped bugs, flaky tests, process gaps
```

---

## Definition of Done (DoD)

The team-agreed checklist a story must satisfy before it's "done". QA owns the quality criteria in the DoD.

**Example DoD:**
- [ ] Code reviewed and approved by at least 1 other developer
- [ ] Unit tests written and passing (coverage ≥ 80% for new code)
- [ ] Integration tests passing
- [ ] Manual testing completed by QA on staging
- [ ] Accessibility checked (axe scan + keyboard navigation)
- [ ] No Critical or High severity bugs open
- [ ] API documentation updated if endpoints changed
- [ ] Performance not regressed (p95 response time within SLA)
- [ ] Feature flagged if incomplete (no partial work shipped)

**DoD vs Acceptance Criteria:** Acceptance criteria are story-specific ("When I apply a promo code, the discount is shown"). DoD is universal across all stories.

---

## Definition of Ready (DoR)

A story is ready for sprint when:
- [ ] Acceptance criteria written in testable format (GIVEN/WHEN/THEN preferred)
- [ ] UI mockups or wireframes available if it's a UI change
- [ ] Test data requirements identified
- [ ] External dependencies (APIs, third-party services) clarified
- [ ] Edge cases discussed in refinement
- [ ] Story estimated

QA should reject stories that don't meet DoR from entering the sprint. Ambiguous stories create bugs.

---

## Three Amigos (Refinement)

The most valuable QA ceremony. Product Owner + Developer + QA discuss each story before sprint:

- Product Owner explains the business intent
- Developer asks about technical constraints
- QA asks about edge cases, error states, what could go wrong

Questions QA should always ask in Three Amigos:
- What happens with invalid/empty input?
- What happens if the external API is down?
- What's the expected behaviour for different user roles/permissions?
- What's the rollback plan if this causes issues in production?
- Are there any performance implications?

---

## Shift-Left in Practice

```
Old approach:
  Dev finishes → QA starts → bugs found late

Shift-left approach:
  QA involved in refinement (before dev starts)
  QA writes test cases from acceptance criteria (before dev starts)
  Dev uses test cases as development guide (TDD or similar)
  QA tests continuously as stories are completed
  CI catches regressions before QA even starts
```

Shift-left means less time finding bugs in QA, because:
1. Ambiguities resolved before coding
2. Developers test their own work with the QA test cases as a guide
3. Automation catches regressions before QA involvement

---

## QA Metrics in Agile

Per-sprint tracking:
- **Stories tested vs stories completed** — are QA keeping pace with dev?
- **Bugs found in sprint vs post-sprint** — found in sprint = shift-left working
- **Regression failures per sprint** — increasing = test debt building
- **Automation added per sprint** — is the automation coverage growing?

Sprint retrospective questions QA should raise:
- Which bugs escaped to prod? What would have caught them?
- Are we testing too late in the sprint? (testing crunch at end)
- Are there stories with no tests? Why?
- Which tests are flaky? Plan to fix them.

---

## Continuous Testing

Automation runs throughout the pipeline, not just at the end.

```
Commit → Unit tests (30 seconds)
        → Integration tests (5 minutes)
        → E2E smoke (10 minutes)
        → Deploy to staging → Full regression (45 minutes)
        → Performance baseline (15 minutes)
        → Manual exploratory (ongoing)
```

Every stage gates the next. A failing unit test blocks integration tests from running. Fail fast, fix fast.

---

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/bdd-gherkin]] · [[qa/risk-based-testing]] · [[qa/test-case-design]] · [[qa/qa-metrics]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

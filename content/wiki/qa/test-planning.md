---
type: concept
category: qa
para: resource
tags: [test-planning, test-plan, scope, test-approach, risk, entry-exit-criteria]
sources: []
updated: 2026-05-01
---

# Test Planning

The discipline of deciding what to test, how to test it, and what "done" means — before writing a single test.

---

## Why Test Plans Fail

```
Common failure modes:
  1. Plan written after testing starts — becomes documentation, not guidance
  2. Scope defined too broadly — "test everything" is not a scope
  3. No exit criteria — testing ends when time runs out, not when quality is known
  4. Ignores risk — equal time on low-risk and high-risk areas
  5. Not revisited — plan written in sprint 1, ignored in sprint 6

A test plan answers four questions:
  What are we testing?      (scope + out of scope)
  What could go wrong?      (risks)
  How will we test it?      (approach + tools)
  When are we done?         (entry/exit criteria)
```

---

## Test Plan Structure (IEEE 829-lite)

```markdown
# Test Plan: [Feature/Release Name]

**Version:** 1.0
**Author:** [Name]
**Date:** 2026-05-01
**Status:** Draft | Review | Approved

## 1. Scope

### In Scope
- Order placement flow (web + mobile)
- Payment processing (Stripe integration)
- Order confirmation email trigger
- Order status API endpoints (GET /orders, GET /orders/:id)

### Out of Scope
- Admin portal order management (covered by separate plan)
- Historical order migration (data team responsibility)
- Performance testing (covered by load test plan)

## 2. Features Under Test

| Feature | Priority | Notes |
|---|---|---|
| Place order | Critical | New implementation |
| Apply discount code | High | Business rule change |
| Guest checkout | Medium | Existing, minor change |
| Order status webhook | Low | New endpoint |

## 3. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Payment provider downtime | Low | Critical | Mock in staging; test real in isolated env |
| Race condition on stock decrement | Medium | High | Concurrent test scenarios |
| Discount stacking exploit | Low | High | Boundary + combinatorial tests |
| Email delivery failure | Medium | Medium | Test fallback + monitoring |

## 4. Test Approach

### Unit Tests
Owner: developers
Coverage target: 85% line coverage on business logic
Framework: pytest + Pydantic

### Integration Tests
Owner: QA + developers
Scope: service-to-service, DB interactions
Framework: pytest + testcontainers

### E2E Tests
Owner: QA
Scope: critical user journeys (place order, check status)
Framework: Playwright
Environments: staging only (not prod)

### Exploratory Testing
Owner: QA
Sessions: 3 × 90-minute sessions before release
Focus: checkout edge cases, error recovery, cross-browser

## 5. Test Data

- Orders: Seeded via factory_boy (OrderFactory)
- Products: Static seed data (products.json)
- Users: Generated fresh per test run (avoid shared state)
- Payment: Stripe test mode with test card numbers

## 6. Environments

| Environment | Purpose | When |
|---|---|---|
| local | developer unit/integration tests | continuous |
| staging | E2E, exploratory, UAT | pre-release |
| production | synthetic monitoring only | post-release |

## 7. Entry Criteria (test start conditions)
- [ ] Code merged to main (all PRs reviewed)
- [ ] Unit test coverage > 80%
- [ ] Staging environment stable (no P1 defects)
- [ ] Test data seeded

## 8. Exit Criteria (release sign-off conditions)
- [ ] All critical and high priority test cases passed
- [ ] Zero open P1/P2 defects
- [ ] Exploratory testing sessions completed (3/3)
- [ ] Performance benchmarks within threshold (p99 < 500ms)
- [ ] Security scan passed (SAST + dependency check)

## 9. Defect Management
- P1 (Blocker): block release; fix in < 4 hours
- P2 (Critical): fix before release; 24-hour SLA
- P3 (Major): fix in next sprint; log in Jira
- P4 (Minor): log; fix when capacity allows

## 10. Sign-off
| Role | Name | Date |
|---|---|---|
| QA Lead | | |
| Product Owner | | |
| Engineering Lead | | |
```

---

## Lightweight Plan for Agile Sprints

```markdown
# Sprint QA Checklist — Sprint 14

**Features:**  Discount codes, order history pagination

**Test approach:**
- Unit: developers own; QA reviews coverage report
- Integration: QA writes; runs in CI on every PR
- Exploratory: 1 × 60-min session per feature before demo

**Risks:**
- Discount stacking not spec'd for edge cases → schedule Three Amigos

**Exit criteria:**
- All ACs verified by automated or manual test
- No open P1/P2 bugs
- Exploratory session notes filed
```

---

## Test Plan Review Checklist

```
Before approving a test plan, verify:
  [ ] Scope explicitly lists what is OUT of scope (not just what's in)
  [ ] Each in-scope item has at least one test approach assigned
  [ ] Risks have mitigations (not just listings)
  [ ] Entry criteria are concrete and checkable (not "team feels ready")
  [ ] Exit criteria are measurable (numbers, not adjectives)
  [ ] Data strategy avoids shared mutable state between tests
  [ ] Environments match the release pipeline
  [ ] Ownership is assigned (not "QA" — a person)
  [ ] Plan has a review date (test plans go stale)
```

---

## Connections

[[qa-hub]] · [[qa/test-strategy]] · [[qa/risk-based-testing]] · [[qa/test-case-design]] · [[qa/agile-qa]] · [[qa/qa-metrics]]

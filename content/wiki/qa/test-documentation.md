---
type: concept
category: qa
para: resource
tags: [test-documentation, test-cases, traceability-matrix, test-summary-report, test-charter]
sources: []
updated: 2026-05-01
tldr: "The minimum viable paper trail: what to write, how to write it, and what to skip."
---

# Test Documentation

The minimum viable paper trail: what to write, how to write it, and what to skip.

---

## The Documentation Trap

```
Most test documentation is written to prove testing happened, not to help anyone test.
This is waste.

Documentation that earns its existence:
  - Helps someone else test the same feature independently
  - Tells stakeholders where quality stands with a single read
  - Provides a starting point for regression test automation
  - Records decisions about scope and risk that would otherwise be lost

Documentation that doesn't:
  - 200-step "click here, then click there" manual scripts
  - Duplicate what the code or acceptance criteria already say
  - Test summary reports that just list counts with no context
  - Test plans that are copied from the last project and never read again
```

---

## Test Case Template

```markdown
## TC-001: Payment declined for expired card

**Preconditions:**
- User is authenticated
- Cart contains at least one item
- Test card 4000 0000 0000 0002 (Stripe test mode, always declines)

**Steps:**
1. Navigate to checkout
2. Enter expired test card details
3. Submit payment

**Expected result:**
- Payment is declined with message "Your card has expired"
- No order is created in the database
- User remains on checkout page (not redirected to confirmation)
- Cart contents are preserved

**Actual result:** [fill on execution]
**Pass/Fail:** [fill on execution]
**Notes:** [deviations, environment issues, linked defects]
```

---

## When to Write Formal Test Cases

```
Write formal test cases for:
  - Regulatory or compliance scenarios (audit evidence required)
  - Defect reproductions — once found, document so they never escape again
  - Complex business logic with many paths (decision tables help here)
  - Scenarios that are hard to test repeatedly without a checklist

Skip formal test cases for:
  - Exploratory testing sessions (use a charter instead)
  - Features covered by automated regression (the test code IS the case)
  - Simple happy-path flows a developer can verify in 30 seconds

Rule of thumb: automate what's repeatable, document what requires human judgment.
```

---

## Requirements Traceability Matrix

```
A traceability matrix maps requirements → test cases → test results.
Used in regulated industries (medical, finance, government).
Optional elsewhere — only worth maintaining if stakeholders actually read it.
```

```markdown
| Requirement | AC | Test Cases | Status | Notes |
|-------------|-----|-----------|--------|-------|
| REQ-001: User can place order with saved card | AC-001a, AC-001b | TC-001, TC-002, TC-010 | Pass | Automated |
| REQ-002: Order confirmation email sent within 60s | AC-002a | TC-015, TC-016 | Pass | Manual + synthetic |
| REQ-003: Order fails gracefully when card declined | AC-003a | TC-020, TC-021 | Pass | Automated |
| REQ-004: Guest checkout without account | AC-004a, AC-004b | TC-025 | Not tested | Descoped sprint 14 |
| REQ-005: 3DS challenge flow | AC-005a | TC-030 | In progress | Env issue — ticket TKT-1234 |

Legend: Pass / Fail / Blocked / Not tested / In progress
```

---

## Test Summary Report

```markdown
# Test Summary Report — Sprint 17 / Order Checkout v2.3

**Test period:** 2026-04-28 to 2026-05-01
**Build:** v2.3.0-rc2 (commit abc1234)
**Prepared by:** QA Team
**Audience:** Product Owner, Engineering Manager

---

## Executive Summary

Release is **ready to ship** subject to one open medium defect (TKT-1289) tracked to next sprint.

| | Count |
|---|---|
| Test cases planned | 47 |
| Test cases executed | 45 |
| Pass | 43 |
| Fail | 2 |
| Blocked | 2 |
| Not executed | 2 |

---

## Open Defects at Release

| ID | Severity | Summary | Decision |
|----|----------|---------|---------|
| TKT-1289 | Medium | Guest checkout missing address validation on IE11 | Defer — IE11 < 1% of users |
| TKT-1291 | Low | Confirmation email uses wrong timezone in subject line | Defer — cosmetic |

---

## Coverage by Feature Area

| Area | Tests | Pass | Fail | Blocked |
|------|-------|------|------|---------|
| Payment processing | 18 | 18 | 0 | 0 |
| Order confirmation | 12 | 11 | 1 | 0 |
| Guest checkout | 8 | 7 | 0 | 1 |
| Saved card management | 9 | 7 | 1 | 1 |

---

## Risk Assessment

**Release risk: LOW**

Payment core flows: all passing. One medium defect (IE11 edge case) accepted by PO. No P0/P1 defects open.

---

## Automation Coverage

- Automated tests: 38 (84% of executed tests)
- Manual only: 7 (guest checkout + IE11 scenarios)
- New tests added this sprint: 12
```

---

## Exploratory Test Charter

```
A charter defines the scope of an exploratory session without scripting the steps.
Use when you want focused, documented exploration without a full test plan.

Charter format:
  "Explore [target] with [resources/tools] to discover [information goal]"

Examples:
  "Explore the checkout flow for guest users with an expired session token
   to discover how the system handles mid-flow authentication failures"

  "Explore the payment API error responses using Postman and the Stripe test card set
   to discover whether error messages leak internal state"

  "Explore the admin bulk-order import feature with a 10,000-row CSV
   to discover memory and timeout behaviour under large payloads"

Session notes:
  Duration: 60 minutes
  Tester: [name]
  Environment: staging-v2.3
  Bugs found: [list]
  Observations: [anomalies, questions, impressions — not bugs yet]
  Coverage: [what was covered, what was skipped and why]
```

---

## Connections

[[qa/qa-hub]] · [[qa/test-planning]] · [[qa/test-strategy]] · [[qa/exploratory-testing]] · [[qa/exploratory-testing-advanced]] · [[qa/qa-metrics]] · [[qa/qa-leadership]]

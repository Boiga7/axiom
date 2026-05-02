---
type: concept
category: qa
para: resource
tags: [bug-lifecycle, defect-management, severity, priority, qa, jira]
sources: []
updated: 2026-05-01
tldr: The process a defect goes through from discovery to closure. A well-defined lifecycle ensures bugs don't get lost, misunderstood, or marked done before they're verified.
---

# Bug Lifecycle

The process a defect goes through from discovery to closure. A well-defined lifecycle ensures bugs don't get lost, misunderstood, or marked done before they're verified.

---

## Standard Bug Lifecycle

```
[New] → [Assigned] → [Open] → [Fixed] → [Retest] → [Closed]
                        ↓                    ↓
                   [Deferred]          [Reopened]
                        ↓
                   [Rejected]
```

| State | Owner | Meaning |
|---|---|---|
| **New** | QA | Bug reported; not yet triaged |
| **Assigned** | Dev Lead | Triage done; assigned to a developer |
| **Open** | Developer | Developer is actively working on the fix |
| **Fixed** | Developer | Fix implemented; awaiting QA verification |
| **Retest** | QA | QA verifying the fix on the fixed build |
| **Closed** | QA | Fix verified; bug is done |
| **Reopened** | QA | Verification failed; bug returned to developer |
| **Deferred** | Product Owner | Acknowledged; not fixing in this release |
| **Rejected** | Developer / Lead | Not a bug (expected behaviour, duplicate, or cannot reproduce) |

---

## Writing a Good Bug Report

A bug report must answer: **what happened, what was expected, and how to reproduce it.**

**Template:**

```
Title: [Short, specific, searchable — include the affected feature and the symptom]
       Good: "Checkout: 'Place Order' button disabled after promo code applied"
       Bad: "Button doesn't work"

Environment:
  - URL: staging.myapp.com
  - Browser: Chrome 124 / Safari 17
  - OS: macOS Sonoma
  - Build: v2.3.1-rc4

Severity: Critical / High / Medium / Low
Priority: P1 / P2 / P3 / P4

Steps to Reproduce:
  1. Navigate to /cart
  2. Add item SKU-123 (£29.99) to cart
  3. Apply promo code SUMMER20
  4. Click "Proceed to Checkout"
  5. Observe the "Place Order" button

Actual Result:
  "Place Order" button is greyed out and non-clickable after promo code applied.
  Error in console: "Uncaught TypeError: Cannot read properties of undefined (reading 'total')"

Expected Result:
  "Place Order" button is enabled and the order can be placed with the discount applied.

Attachments:
  - screenshot-checkout-bug.png
  - console-error.txt (browser console output)
  - network-requests.har (if relevant to API failures)

Reproducibility: 100% (reproduced 5/5 attempts)
```

---

## Severity vs Priority

These are frequently confused. They measure different things.

**Severity** — technical impact on the application. Set by QA.

| Severity | Meaning | Example |
|---|---|---|
| Critical | Application crash, data loss, security breach | Payment not processed; data deleted |
| High | Major feature broken, no workaround | Login fails for 50% of users |
| Medium | Feature partially broken, workaround exists | Export CSV produces wrong column order |
| Low | Cosmetic, minor UX issue | Button label has a typo |

**Priority** — business urgency. How quickly it must be fixed. Set by Product Owner.

| Priority | Meaning |
|---|---|
| P1 | Fix now (same day); blocks release or affects all users |
| P2 | Fix this sprint; high business impact |
| P3 | Fix next sprint; planned work |
| P4 | Nice to have; add to backlog |

**High severity ≠ high priority, and vice versa:**
- **High severity, low priority**: data corruption in a rarely used export feature used by 2 users
- **Low severity, high priority**: CEO's name is misspelled on the homepage

---

## Bug Triage

Regular meeting (or async process) where new bugs are assessed:

1. **Reproducibility** — can the team reproduce it? Without reproduction, no fix.
2. **Severity** — how bad is the impact?
3. **Priority** — when must it be fixed?
4. **Assignment** — which developer owns it?
5. **Version/sprint** — target fix version

Bugs that cannot be reproduced move to `Deferred` with label "cannot reproduce" — they're kept open so if another reporter hits the same issue, we reopen with additional context.

---

## Reopening a Bug

When `Retest` fails — the fix didn't resolve the issue, or introduced a regression:

1. Add a new retest comment with: build version, retest steps, actual result
2. Attach new evidence (screenshot, log)
3. Change status back to `Reopened` (→ `Open`)
4. Tag the original developer

Do not close a bug without verifying it on the fixed build. "Fixed" means the developer believes it's fixed — "Closed" means QA confirmed it.

---

## Defect Metrics

| Metric | Formula | Why it matters |
|---|---|---|
| Defect Detection Rate | Bugs found in testing / total bugs (testing + prod) | Higher = better QA coverage |
| Defect Escape Rate | Bugs found in prod / total bugs | Target: < 5% |
| Mean Time to Detect | Avg time from intro to discovery | Shorter = faster feedback |
| Mean Time to Fix | Avg time from report to closure | Indicates dev velocity on bugs |
| Defect Density | Bugs per 1,000 lines of code | Compare modules; spiky density = low quality area |
| Reopen Rate | Reopened bugs / total closed | High reopen rate = inadequate fixes or incomplete testing |

---

## Root Cause Classification

Tag each closed bug with a root cause. Trends reveal systemic problems.

| Root Cause | Example |
|---|---|
| Missing requirement | Feature not in spec; nobody thought about it |
| Wrong implementation | Dev misunderstood the requirement |
| Integration failure | Component A and Component B had incompatible contracts |
| Environment issue | Only failed in staging because of config difference |
| Data issue | Specific input values triggered an unhandled path |
| Regression | Existing functionality broken by new code |
| Third-party | External service API changed |

Monthly review of root cause distribution guides process improvement: many "missing requirement" bugs → invest in better upfront analysis; many "regression" bugs → invest in test coverage.

---

## Bug Lifecycle in Jira

```
Jira workflow mapping:
  New         → To Do (or Backlog)
  Assigned    → In Progress
  Fixed       → In Review / Ready for QA
  Retest      → In Testing
  Closed      → Done
  Reopened    → In Progress (with "Reopened" label)
  Deferred    → Backlog (with "Deferred" fix version)
```

Custom Jira fields to add: `Severity`, `Root Cause`, `Found in Version`, `Fixed in Version`, `Reproducibility`.

---

## Connections

- [[qa/test-strategy]] — bug lifecycle fits within the overall QA process
- [[qa/test-case-design]] — test cases reveal bugs that enter this lifecycle
- [[qa/exploratory-testing]] — exploratory sessions are a major source of New bugs
- [[qa/qa-tools]] — TestRail, Zephyr, Jira for bug tracking and test management
- [[qa/qa-metrics]] — defect metrics tracked across the lifecycle

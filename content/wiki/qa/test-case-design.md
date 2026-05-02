---
type: concept
category: qa
para: resource
tags: [test-case-design, equivalence-partitioning, boundary-value-analysis, decision-tables, qa]
sources: []
updated: 2026-05-01
tldr: Systematic techniques for deriving test cases from requirements. The goal is maximum defect detection with minimum test cases.
---

# Test Case Design

Systematic techniques for deriving test cases from requirements. The goal is maximum defect detection with minimum test cases. Ad-hoc testing finds bugs, but technique-driven testing finds bugs efficiently and repeatably.

---

## Equivalence Partitioning (EP)

Divide inputs into groups (partitions) where all values in a group are expected to behave the same. Test one value per partition — if one fails, all will fail; if one passes, all will pass.

**Rule:** For each partition, test one valid and one invalid value.

**Example: Age field (must be 18–65)**

| Partition | Range | Example value | Expected |
|---|---|---|---|
| Below minimum | < 18 | 15 | Reject |
| Valid | 18–65 | 30 | Accept |
| Above maximum | > 65 | 70 | Reject |
| Non-numeric | letters, symbols | "abc", -1 | Reject |
| Boundary (EP) | 18, 65 | 18, 65 | Accept |

Test cases: `{15, 30, 70, "abc"}` — four tests cover four partitions. Without EP you might test 100 ages and miss the boundary.

---

## Boundary Value Analysis (BVA)

Errors cluster at boundaries. Test the boundary values and their immediate neighbours.

**For a range min–max, test:** `min-1`, `min`, `min+1`, `max-1`, `max`, `max+1`

**Example: Password length (6–20 characters)**

| Value | Input | Expected |
|---|---|---|
| min - 1 | 5 chars | Reject |
| min | 6 chars | Accept |
| min + 1 | 7 chars | Accept |
| max - 1 | 19 chars | Accept |
| max | 20 chars | Accept |
| max + 1 | 21 chars | Reject |

BVA extends EP — instead of one test per partition, test the partition edges.

**Combined EP + BVA approach** (industry standard):
- Identify partitions (EP)
- Test boundaries of each partition (BVA)
- Test one mid-partition value for sanity

---

## Decision Tables

For features with combinations of conditions and rules. Maps every combination of inputs to an expected action.

**Example: Insurance premium calculator**

| Condition | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Age > 25? | Y | Y | N | N |
| Clean record? | Y | N | Y | N |
| **Action** | | | | |
| Low premium | ✓ | | | |
| Medium premium | | ✓ | ✓ | |
| High premium | | | | ✓ |

Four test cases cover all combinations. For n binary conditions, a full decision table has 2ⁿ columns. For large n, reduce using risk-based pruning (focus on combinations most likely to differ in behaviour).

---

## State Transition Testing

For systems with states and events that trigger transitions. Model as a state diagram; derive tests that traverse each state and each transition.

**Example: Order lifecycle**

```
[New] --pay--> [Paid] --ship--> [Shipped] --deliver--> [Delivered]
  |                |
  |--cancel-->  [Cancelled]   [Paid] --cancel--> [Refunded]
```

Test cases:
1. Happy path: New → Paid → Shipped → Delivered
2. Cancel before payment: New → Cancelled
3. Cancel after payment: New → Paid → Refunded
4. Invalid: attempt to ship a New order (should error)
5. Invalid: attempt to cancel a Delivered order (should error)

Cover every valid transition (positive) and at least one invalid transition per state (negative).

---

## Use Case Testing

Derive tests from use cases or user stories. Each use case has a basic flow (happy path) and alternate/exception flows.

**Use case: User login**

| Flow | Steps |
|---|---|
| Basic | Valid credentials → logged in, redirected to dashboard |
| Alt 1 | Wrong password → error message, counter incremented |
| Alt 2 | Account locked (5 failed attempts) → locked message, no login |
| Alt 3 | Password expired → redirect to reset flow |
| Alt 4 | MFA required → MFA challenge shown |
| Exception | DB unavailable → friendly error, no stack trace |

---

## Pairwise / All-Pairs Testing

For parameters with many possible values, test all two-way combinations rather than all combinations. Reduces N^k tests to ~N*k tests.

**Example: Test a form with 3 parameters, 3 values each** — full combination: 27 tests. Pairwise: 9 tests, covering every pair of values at least once.

Tool: PICT (Pairwise Independent Combinatorial Testing) by Microsoft.

---

## Writing Good Test Cases

**Structure (GIVEN-WHEN-THEN):**
```
GIVEN I am on the checkout page
  AND I have 3 items in my cart
WHEN I click "Place Order" without a payment method
THEN an error message "Please add a payment method" is shown
  AND the order is not created
```

**A good test case:**
- Has a single, specific expected outcome (no "verify the page looks right")
- Is repeatable by any team member following the steps
- Is independent — doesn't require previous tests to have run
- Has clear test data specified (not "enter a valid email" — enter `test@example.com`)
- Has a clear pass/fail criterion

**Test case metadata:**
- ID (TC-001)
- Title
- Priority (Critical/High/Medium/Low)
- Type (Positive/Negative/Boundary)
- Preconditions
- Steps
- Expected result
- Linked requirement

---

## Negative Testing Checklist

For any input field, always test:
- [ ] Empty/null/blank
- [ ] Whitespace only
- [ ] Maximum length exceeded
- [ ] Special characters (`<>'"&;`)
- [ ] SQL injection patterns (`' OR '1'='1`)
- [ ] Script injection patterns (`<script>alert(1)</script>`)
- [ ] Unicode edge cases (emoji, right-to-left text)
- [ ] Very large numbers, negative numbers
- [ ] Decimal values where integer expected
- [ ] Future dates where past dates expected

---

## Connections

- [[qa/test-strategy]] — where test case design fits in the overall test approach
- [[qa/exploratory-testing]] — unscripted complement to scripted test case design
- [[qa/bdd-gherkin]] — GIVEN/WHEN/THEN format for acceptance test cases
- [[qa/risk-based-testing]] — prioritise which test cases to write first
- [[qa/bug-lifecycle]] — what happens when a test case fails

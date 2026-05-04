---
type: concept
category: qa
tags: [estimation, capacity-planning, test-management, planning, consultancy]
sources: []
updated: 2026-05-04
para: resource
tldr: Estimation is the skill of turning scope uncertainty into a defensible commitment. Done well it protects the team from over-promise and protects the client from surprise. Done badly it destroys trust in both directions.
---

# Test Estimation and Capacity Planning

Estimation is the skill of turning scope uncertainty into a defensible commitment. Done well it protects the team from over-promise and protects the client from surprise. Done badly it destroys trust in both directions.

---

## Why QA Estimation Is Hard

```
Root causes of poor estimates:
  1. Scope ambiguity at estimate time — requirements are incomplete, so assumptions fill the gap
  2. Ignoring activities that aren't "test execution" — writing, review, rework, regression all take time
  3. Single-point estimates — quoting one number implies false precision
  4. Ignoring the new-client ramp-up — domain unfamiliarity kills velocity for the first 2–4 weeks
  5. No feedback loop — estimates are never compared to actuals, so the same mistakes compound
  6. Optimism bias — estimators assume best-case throughput, no blockers, zero defects returned
  7. Anchoring — the first number mentioned in a room becomes the target, not the evidence
```

The solution is not "be more accurate" — it is to estimate systematically, communicate ranges, and track actuals so each project makes you better at the next one.

---

## Estimation Techniques

### Three-Point PERT

The most rigorous technique for any estimate where uncertainty is real.

```
For each task:
  O = optimistic estimate (everything goes right)
  M = most likely estimate (realistic, typical conditions)
  P = pessimistic estimate (blockers, rework, complexity)

PERT Estimate = (O + 4M + P) / 6
Std Deviation = (P - O) / 6
Variance      = ((P - O) / 6)^2
```

**Worked example — writing test cases for a checkout module:**

```
  Optimistic:   3 days  (requirements are complete, domain is familiar)
  Most likely:  5 days  (1–2 clarification sessions, some ambiguous flows)
  Pessimistic:  9 days  (incomplete AC, multiple reviews, late requirement changes)

  PERT = (3 + 4×5 + 9) / 6 = (3 + 20 + 9) / 6 = 32 / 6 = 5.3 days
  Std Dev = (9 - 3) / 6 = 1.0 day

  Report to client: 5–6 days (PERT ± 1 std dev = 4.3–6.3, round to nearest half-day)
```

Adding variance across independent tasks gives you project-level confidence:

```
  Total variance = sum of individual variances
  Total std dev  = sqrt(total variance)
  Project range  = sum of PERT estimates ± 1 or 2 std devs

  Example — four tasks with PERT estimates [5.3, 3.2, 7.1, 4.0] days
  and std devs [1.0, 0.7, 1.5, 0.8]:
    Total estimate = 19.6 days
    Total variance = 1.0 + 0.49 + 2.25 + 0.64 = 4.38
    Total std dev  = sqrt(4.38) = 2.1 days
    90% confidence range = 19.6 ± 2×2.1 = 15.4 to 23.8 days → report as 3–5 weeks
```

Use PERT when you have time to decompose thoroughly — test plans, project kick-offs, formal proposals.

---

### T-Shirt Sizing

Fast, relative sizing for agile refinement or early scoping conversations.

```
XS: < 2 hours        — single form, no edge cases, no data setup
S:  half to 1 day    — a single CRUD feature, 5–10 test cases
M:  2–3 days         — a functional area, integration points, some edge cases
L:  1 week           — a complex module, multiple integrations, performance angle
XL: 2+ weeks         — full subsystem, multiple environments, cross-team dependency
```

T-shirt sizes only communicate order of magnitude. They are useful for:
- Backlog grooming when stories aren't fully defined
- Stakeholder conversations before detailed scoping
- Rapid triage of incoming requests

Convert to day-ranges before committing to a sprint or delivery date. An M is 2–3 days — that is the number you schedule against, not "M".

---

### Analogy-Based Estimation

Compare the new work to something you have already measured.

```
Pattern:
  1. Find a reference task from a past project with known actuals
  2. List the ways the new task is similar and different
  3. Apply adjustment factors for each difference
  4. Sanity-check with a second reference task

Example:
  Reference: Last project's user profile module — 48 test cases, took 6 days to write
  New work:  Payment module — similar complexity, but:
    - 2× more regulatory constraints (+50%)
    - Team has existing domain knowledge (−20%)
    - Requirements are more complete (−10%)

  Adjusted estimate = 6 × 1.5 × 0.8 × 0.9 = 6.5 days
```

Analogy estimation degrades when the reference project is old (processes changed) or when the new work is genuinely novel. Always state which reference project you used — it makes the assumption visible and challengeable.

---

### Use-Case Points (UCP)

A formal technique for estimating from use cases or user stories, common in larger fixed-price engagements.

```
Steps:
  1. Classify each actor (simple, average, complex) and assign weights
     Simple (1): external system, batch job
     Average (2): operator with limited interaction
     Complex (3): user with GUI and complex flows

  2. Classify each use case by transaction count
     Simple (5):   1–3 transactions
     Average (10): 4–7 transactions
     Complex (15): 8+ transactions

  3. Unadjusted Use Case Points (UUCP) = sum of weighted actors + weighted use cases

  4. Apply Technical Complexity Factor (TCF) and Environmental Factor (EF)
     — standard tables from the Karner model

  5. Hours = UUCP × TCF × EF × productivity factor (typically 20–28 hours/UCP)
```

UCP is best suited to waterfall or fixed-price contracts where a formal audit trail is needed. It is too heavy for sprint-level estimation in agile teams.

---

## Estimating Each Activity Separately

The single biggest estimation mistake is treating "testing" as one block. Break it into components:

```
Component                   Typical % of total QA effort
----------------------------------------------------------
Requirements review         5–10%
Test case / script writing  20–30%
Test environment setup      5–10%
Test data preparation       5–10%
Test execution              25–35%
Defect logging              5–8%
Defect retesting            10–15%
Regression testing          10–20%
Reporting and handover      3–5%
Automation build            varies — see below
```

**Worked breakdown — medium-sized agile feature (say 20 story points, estimated 8 test days execution):**

```
Requirements review:   0.5 days
Test case writing:     2.0 days  (1 day per ~15 test cases, 30 cases estimated)
Environment setup:     0.5 days
Test data prep:        0.5 days
Test execution:        2.5 days  (30 cases × 5 min avg per case = 2.5h, ×2 for exploratory)
Defect logging:        0.5 days
Defect retesting:      1.0 day   (assume 30% defect rate on 30 cases = 9 defects × 1h rework)
Regression:            1.0 day   (top 20 regression cases from related areas)
Reporting:             0.5 days
-----------
Total:                 9.0 days
```

Presenting the breakdown matters: clients can challenge "9 days testing" but rarely challenge a line-itemised breakdown. Each line also becomes a scope handle — if the client wants to cut scope, you can remove test case writing for a low-risk module and call out the accepted risk.

---

### Estimating Automation Build Time

Automation estimate components:

```
  Per test case:
    Script writing:       20–60 min (simple flow) to 2–4 hours (complex, dynamic UI)
    Review and refactor:  20% of writing time
    Framework maintenance: amortised across the suite — ~5% per test

  Framework setup (one-time):
    Page Object Model scaffold:   2–5 days
    CI/CD integration:            1–3 days
    Test data and fixtures:       1–2 days

  Rule of thumb:
    New automation suite from scratch: 3–4× manual execution time to build the same coverage
    Mature automation framework: 1–2× manual execution time to add new scripts
```

**Worked example — 50 automated regression cases, mature framework:**

```
  Script writing:    50 × 45 min avg = 37.5 hours = ~5 days
  Review:            5 × 0.2 = 1 day
  Framework updates: 0.5 day
  CI integration:    already done — 0
  Total:             6.5 days

  Payback calculation:
    Manual regression suite: 50 × 5 min = 4.2 hours per run
    At 2 runs/sprint: 8.4 hours/sprint saved
    6.5 days × 8h = 52 hours invested → payback at sprint 7
```

---

## Estimation in Agile

### Story Points for QA Tasks

QA tasks belong in the sprint backlog with explicit story point estimates — not as an afterthought attached to developer stories.

```
QA tasks to estimate explicitly:
  - Test case writing for new stories
  - Automation scripting
  - Exploratory testing sessions (time-boxed — e.g. 2 × 1-hour charters)
  - Regression run
  - Defect retesting (budget as a % of story complexity)
  - Test data setup

Point mapping example (calibrate against your team's reference story):
  1 point: review AC, run 3–5 existing tests, log any defects found
  2 points: write 5–8 test cases, execute them, retest any defects
  3 points: 8–15 test cases, some exploratory, coordinate with dev on edge cases
  5 points: full feature with integrations, 15–25 cases, regression impact
  8 points: complex feature, cross-team dependencies, automation update required
```

A QA engineer on a typical two-week sprint carrying 20–25% ceremonial overhead delivers roughly 24–28 story points per sprint. Never allocate more than 80% of that to planned work — the remaining 20% absorbs defect retesting and unplanned blockers.

### Velocity Tracking

Track QA velocity as a rolling average:

```
Sprint  Points planned  Points completed  Velocity
1       22              18                18  (ramp-up sprint, lower)
2       22              21                19.5 avg
3       24              23                20.7 avg
4       24              24                21.5 avg
5       26              22                21.6 avg  (production incident disrupted sprint 5)

Use 3-sprint rolling average for planning: (23+24+22)/3 = 23 points
```

Never plan to a single engineer's peak velocity. Plan to the team's rolling average, and surface when a sprint is overloaded before the sprint starts, not at the retrospective.

---

## Common Estimation Biases

| Bias | What it looks like | Counter |
|---|---|---|
| Optimism bias | "This should only take a day" — no blockers, no rework assumed | Ask: what is the realistic worst case? Weight PERT accordingly |
| Anchoring | A PM says "can we do it in two weeks?" and the estimate gravitates toward two weeks | Estimate independently before any number is mentioned in the room |
| Planning fallacy | Underestimating time for tasks you do yourself; overestimating for others | Use actuals from past projects, not gut feel |
| Scope creep blindness | Estimating the happy path; not the edge cases, negative tests, and non-functional tests | Use a test type checklist — tick off functional, non-functional, security, accessibility before finalising |
| Student syndrome | Estimating accurately but starting late, leaving no buffer | Fix with sprint commitment at grooming, not at stand-up |
| Parkinson's Law | Work expands to fill available time | Time-box execution phases; record actual duration, not planned duration |

---

## Estimating for Multiple Concurrent Test Streams

When one QA engineer — or a small team — is running multiple streams simultaneously (e.g. regression for release A, feature testing for sprint B, UAT support for stream C), the naive approach is to add estimates. This under-estimates because context switching carries a real cost.

### Context-Switch Tax

```
  Number of concurrent streams  Effective productivity
  1                             100%
  2                             80%  (20% lost to switching)
  3                             60%
  4+                            40%  or less

  Rule: for each additional concurrent stream beyond the first, reduce daily throughput by 20%
```

**Worked example — one QA engineer, three streams:**

```
  Naive estimate: 5 days each = 15 days total
  
  Effective daily capacity = 8h × 60% = 4.8h productive per day
  
  Adjusted total effort = 15 days × 8h = 120 hours of work
  Calendar days at 4.8h/day = 120 / 4.8 = 25 days
  
  Report to client: 5 days → 8 calendar days per stream (not 5)
```

Mitigation strategies:
- Batch stream A tasks for mornings, stream B tasks for afternoons — minimise micro-switching
- Time-box each stream per day and make it visible on a task board
- Escalate stream conflicts to the project manager before accepting additional scope
- If all three streams have critical deadlines, flag the resource conflict explicitly — "all three cannot be done by Friday; which two do you prioritise?"

---

## Building a Test Capacity Model

A capacity model converts headcount and calendar time into realistic delivery commitments.

### Base Formula

```
Available test days = headcount × working days × utilisation rate

Where utilisation rate accounts for:
  - Meetings, stand-ups, retrospectives:  ~10–15%
  - Admin, reporting, onboarding:         ~5–10%
  - Unplanned work and interruptions:     ~10%
  - Ramp-up (new client — see below):     variable

Typical target utilisation: 70–75% of nominal capacity
```

**Worked example — 3 QA engineers, 4-week sprint, new client:**

```
  Nominal days: 3 engineers × 20 working days = 60 person-days

  Deductions:
    Sprint ceremonies (planning, review, retro, 2× stand-up/day):
      ~1.5h/day × 20 days × 3 = 90h = 11.25 days
    Admin and reporting:
      0.5h/day × 20 × 3 = 30h = 3.75 days
    Ramp-up (week 1 of new client — see below):
      1 engineer × 5 days × 50% productivity loss = 2.5 days
    Unplanned:
      5% buffer = 0.05 × 60 = 3 days

  Available test days = 60 - 11.25 - 3.75 - 2.5 - 3 = 39.5 person-days
  Utilisation = 39.5 / 60 = 66%

  Plan sprint work to 39 person-days. Do not commit to 60.
```

### Capacity Planning Table

Build this as a simple spreadsheet at project kick-off:

```
Engineer    Role           Weeks 1-2   Weeks 3-4   Weeks 5-6
-------     ----           ---------   ---------   ---------
Alice       Senior QA      6 days*     8 days      8 days      *ramp-up week 1
Bob         QA Engineer    7 days*     8 days      8 days      *ramp-up week 1
Charlie     Automation QA  4 days      6 days      8 days      **automation setup weeks 1-2

Available:  17 days        22 days     24 days
```

This makes it immediately visible that week 1-2 has constrained capacity — and that committing to a full test execution phase in week 2 is unrealistic.

---

## Accounting for New-Client Ramp-Up

Ramp-up is consistently underestimated on new engagements. Domain unfamiliarity, environment access issues, and process learning all reduce effective throughput.

```
Phase                Duration    Productivity impact
-----                --------    --------------------
Environment access   Day 1–3     Effectively 0 test execution possible until environments are provisioned
Domain learning      Week 1–2    50–60% of normal throughput on complex business logic
Process alignment    Week 1–3    QA process, ticketing conventions, stakeholder contacts
Tooling familiarity  Week 1–2    Test management tool, CI/CD pipeline, browser stacks

Composite ramp-up model:
  Week 1:  40–50% effective capacity
  Week 2:  60–70% effective capacity
  Week 3:  80–90% effective capacity
  Week 4+: 95–100% effective capacity
```

**Practical implication:** do not commit to a full sprint test execution delivery in week 1. Commit to: environment access, domain onboarding, draft test plan, and initial test case writing. Set this expectation explicitly at kick-off.

---

## Tracking Estimation Accuracy

Estimates only improve if you measure them against actuals.

### Estimation Log Format

Maintain a simple log per project:

```
Task                    Estimated (days)  Actual (days)  Variance  Notes
Checkout test writing   5.3               6.5            +1.2      Late AC changes, 3 extra flows added
Checkout test execution 2.5               2.0            -0.5      Fewer defects than expected
Defect retesting        1.0               1.5            +0.5      Dev rework took longer, retests delayed
Regression run          1.0               1.2            +0.2      Two new failures found, investigated
-------
Sprint total            9.8               11.2           +1.4      14% over
```

### Metrics to Track

```
Estimation accuracy = 1 - |actual - estimate| / estimate × 100%
Target: > 80% of tasks within ±20% of estimate

Bias indicator = (sum of variances) / number of tasks
  Positive = systematically under-estimating (optimism bias)
  Negative = systematically over-estimating (padding)
  Target: close to zero — no systematic directional error
```

Review the log at each project retrospective. One project of data is noise. Three projects of data shows patterns.

---

## Presenting Estimates to Clients

Never present a single-point estimate as a commitment. Single points imply precision you do not have, and they become targets that erode buffer silently.

### The Range Model

```
Presentation format:
  "Based on the scope as currently understood, we estimate [low] to [high] days.
   The mid-point [mid] is our planning baseline.
   This range reflects [specific uncertainty — e.g. incomplete AC on module X,
   pending environment access, unknown defect volume]."

Example:
  Low:  16 days  (requirements stable, no major defects found, existing test data usable)
  Mid:  21 days  (our planning baseline — some defect retesting, minor scope additions)
  High: 27 days  (significant rework cycles, environment delays, scope additions in sprint 3)
```

### What to Present Alongside the Range

- Assumptions list: every assumption baked into the estimate
- Exclusions: what is explicitly out of scope
- Risks: what would push the estimate to the high end
- Triggers for re-estimation: "if X happens, we will need to revisit this estimate"

This converts the estimate from a promise into a working agreement — both parties understand what the number is contingent on.

### Confidence Levels

For fixed-price or milestone-based contracts, attach explicit confidence levels:

```
"We are 90% confident the work will complete within 27 days.
 We are 50% confident it will complete within 21 days."
```

Use PERT standard deviations to derive these numbers, not gut feel.

---

## Handling Scope Creep

Scope creep is the most common cause of estimate overrun. It arrives in three forms:

```
Type 1 — Explicit addition: "Can we add testing of the new payments gateway?"
Type 2 — Scope inflation: "Testing" turns out to include performance, security, and
           accessibility when the estimate only covered functional
Type 3 — Requirement drift: The AC for a story changes mid-sprint, invalidating test cases
```

### Response Playbook

**Type 1 — Explicit addition:**

```
1. Quantify the addition immediately: "That's roughly X days additional effort."
2. Offer three options:
   a. Add it, extend the timeline
   b. Add it, remove something else of equivalent size (negotiate out-of-scope)
   c. Defer it to the next sprint/phase
3. Document the decision in writing. Never absorb scope additions silently.
```

**Type 2 — Scope inflation:**

```
1. Return to the original estimate document and read out what was included
2. Identify the gap explicitly: "Performance testing was not in scope — here is what that adds"
3. Treat as Type 1 from this point
```

**Type 3 — Requirement drift:**

```
1. Log the change, note which test cases are invalidated
2. Estimate rework: test case rewrites + re-execution of affected cases
3. Flag to the project manager before absorbing the rework into the sprint
4. If drift is frequent, surface it as a process issue, not just a one-off delay
```

---

## Re-Baselining When Requirements Change

If requirements change significantly mid-project — a module redesign, a new integration, a pivot in scope — re-baseline the estimate rather than patching it.

```
Re-baseline process:
  1. Freeze the current estimate: record what was delivered against the original baseline
  2. Define the new scope: what changed and what is now required
  3. Re-estimate from scratch for the changed scope using the same technique as the original
  4. Issue a revised estimate document with:
     - Change description
     - Original estimate vs new estimate for the affected scope
     - Impact on project total
     - Revised timeline
  5. Get sign-off before proceeding
```

Do not silently absorb a major scope change and then miss the original deadline. The earlier a re-baseline is issued, the more options the client has.

**Worked example:**

```
  Original estimate: 42 days for three modules (A, B, C)
  Change event: module C replaced by a new module D with 2× the complexity

  Module C estimate (original):        8 days — now void
  Module D estimate (new, using PERT):
    O=7, M=14, P=22 → PERT = 14.2 days, Std Dev = 2.5 days

  Delta: +6.2 days on the mid estimate
  Revised total: 42 - 8 + 14.2 = 48.2 days → report as 46–52 days

  Present to client: "The replacement of module C with module D adds 6–8 days
  to the QA engagement. Revised delivery window is [date range]."
```

---

## Connections

- [[qa/test-planning]] — scope definition and exit criteria that set the boundaries estimation works within
- [[qa/risk-based-testing]] — risk prioritisation determines which test activities receive the largest effort allocations
- [[qa/agile-qa]] — sprint velocity tracking and story point calibration ground the PERT and T-shirt models in real team data
- [[qa/test-automation-strategy]] — automation build-vs-maintain trade-off directly feeds the estimation breakdown for automation effort
- [[qa/qa-leadership]] — client-facing estimate presentation and expectation-setting are core senior QA consultant skills
- [[qa/uat-governance]] — UAT phase estimation sits within the same capacity model; named tester availability is a hard input

## Open Questions

- When a client's requirements are incomplete at estimate time, at what point does the uncertainty range become wide enough that quoting a range is commercially misleading and a fixed discovery phase is the right answer instead?
- How should context-switch tax be communicated to a client who is simultaneously requesting estimates for three parallel workstreams without accepting that serial sequencing would be faster overall?
- Is there an industry-accepted standard for new-client ramp-up productivity curves, or is the 40/60/80/95% weekly model purely empirical and team-dependent?

## Related Pages

- [[qa/test-planning]] — scope definition and exit criteria that feed into estimates
- [[qa/qa-metrics]] — velocity and throughput metrics used to calibrate models
- [[qa/risk-based-testing]] — risk prioritisation that determines which activities get which effort allocation
- [[qa/agile-qa]] — sprint velocity, story points, QA task breakdown in agile teams
- [[qa/qa-leadership]] — stakeholder communication and expectation management
- [[qa/regression-testing]] — regression scope decisions that directly affect estimation
- [[qa/test-automation-strategy]] — build-vs-maintain trade-off and automation effort modelling

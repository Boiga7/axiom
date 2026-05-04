---
type: concept
category: qa
para: resource
tags: [test-strategy, testing-pyramid, quality-assurance, test-planning, coverage]
sources: []
updated: 2026-05-01
tldr: A test strategy defines what to test, how much of each type, and how testing integrates into the delivery process.
---

# Test Strategy

A test strategy defines what to test, how much of each type, and how testing integrates into the delivery process. Without a strategy, teams either over-test (slow delivery) or under-test (escaped defects).

---

## The Testing Pyramid

The pyramid models the ideal distribution of test types by cost, speed, and quantity.

```
           /\
          /  \       E2E tests
         /    \      (few, slow, expensive)
        /------\
       /        \    Integration tests
      /          \   (moderate, hours)
     /------------\
    /              \  Unit tests
   /                \ (many, seconds, cheap)
  /==================\
```

**Unit tests** — test a single function or class in isolation. Fast (milliseconds). Catch logic bugs. Should be 70% of your test suite.

**Integration tests** — test multiple components together (API + DB, service + queue). Slower (seconds to minutes). Catch contract and wiring bugs.

**E2E tests** — simulate real user flows through the full stack. Slowest (minutes). Catch user-visible bugs. Keep these to critical paths only.

**Ice cream cone antipattern** — inverted pyramid (many E2E, few unit tests). Slow feedback, expensive maintenance, flaky results. Common in teams that started with manual testing and added automation later.

---

## The Testing Trophy (Modern Web)

Kent C. Dodds' alternative, better suited to frontend-heavy applications:

```
          /\
         /  \    E2E (Playwright)
        /----\
       /      \  Integration (component + API contract)
      /--------\
     /          \ Unit (logic, utilities)
    /============\  Static Analysis (TypeScript, ESLint)
```

Static analysis catches the most bugs per dollar; prioritise it first.

---

## Test Quadrants (Agile Context)

A framework for categorising tests by purpose and audience:

|  | Business-facing | Technology-facing |
|--|--|--|
| **Guide development** | Q1: Acceptance tests, BDD scenarios, examples | Q2: Unit tests, component tests, API tests |
| **Critique product** | Q4: Exploratory, usability, UAT | Q3: Performance, security, stress tests |

Q1 + Q2 are automated and run in CI. Q4 is manual or semi-automated. Q3 is automated but run separately (not every commit).

---

## Shift Left

Move testing earlier in the development lifecycle. Cost of fixing a defect:

| Phase found | Relative cost |
|---|---|
| Design/code review | 1x |
| Unit test | 5x |
| Integration test | 10x |
| System test | 20x |
| Production | 100x+ |

Shift left tactics:
- TDD (test first, then implement)
- Peer code review with test coverage check
- Static analysis in IDE (not just CI)
- Contract tests before integration environment is ready
- Risk-based test planning before sprint starts

---

## Test Coverage

Coverage measures which code paths tests exercise. Useful as a floor, not a ceiling.

| Metric | Measures | Typical target |
|---|---|---|
| Line coverage | Each line executed | 80%+ |
| Branch coverage | Each if/else path | 70%+ |
| Mutation coverage | Each logical mutation survived | 60%+ (slow to compute) |

**Coverage doesn't measure quality.** 100% line coverage with no assertions is useless. Mutation testing is the best proxy for test suite quality — it measures whether your tests would catch real bugs.

```bash
# Python coverage
pytest --cov=src --cov-report=term-missing --cov-fail-under=80

# JavaScript (Vitest)
vitest --coverage
```

---

## Test Environments

| Environment | Purpose | Data |
|---|---|---|
| Local (dev) | Developer debugging | Mock data or anonymised prod copy |
| CI | Automated gate on every PR | Reset database each run |
| Staging | Integration and E2E | Production-like, anonymised |
| Production | Synthetic monitoring, A/B | Real data; read-only probes |

**Environment parity** — staging should mirror production as closely as possible. The more it diverges, the less useful staging tests are.

---

## Test Planning Inputs

A test strategy for a feature sprint should answer:

1. **What are the acceptance criteria?** — the definition of done from the user's perspective
2. **What are the risks?** — what could go wrong; where are the edge cases
3. **What test types apply?** — unit, integration, E2E, performance, security
4. **What is out of scope?** — explicit decisions about what won't be tested this sprint
5. **What are the entry/exit criteria?** — when do we start testing? what must be true before release?
6. **Who is responsible?** — developer, QA engineer, product owner for UAT

---

## Regression Strategy

Every bug fix must come with a regression test. The sequence:
1. Reproduce the bug with a failing test
2. Fix the code
3. Confirm the test passes
4. Ensure the test runs in CI permanently

This prevents the bug class from recurring without the team noticing.

---

## Key Principles

- **Test behaviour, not implementation** — tests should survive a refactor. If renaming a private method breaks a test, the test is wrong.
- **Independent tests** — each test sets up and tears down its own state. No test should depend on the order of execution.
- **Fast feedback** — unit tests must run in seconds. E2E tests shouldn't block a PR merge.
- **Deterministic** — the same test must give the same result every time. Flaky tests erode trust.
- **Readable** — tests are documentation. A failing test should tell you what went wrong without reading the implementation.

---

## Common Failure Cases

**Ice cream cone suite accumulated because E2E tests were the easiest to add**
Why: early in a project, Playwright tests are written for every feature because they give visible proof of working software, while unit tests are treated as optional; by the time the problem is noticed the E2E suite takes 45 minutes.
Detect: E2E test count exceeds unit test count, or the E2E suite runtime is more than 3x the unit + integration runtime combined.
Fix: add an E2E-to-unit test ratio check to the CI pipeline; for each new E2E test merged without a corresponding unit test, flag it in the PR template and require justification.

**Coverage target passed by testing trivial code while complex business logic has no tests**
Why: `--cov-fail-under=80` is met because getters, properties, and simple utility functions are well-covered, but the order-processing or pricing logic that does the real work is at 20%.
Detect: run `pytest --cov=src --cov-report=term-missing` and sort by coverage; modules with high cyclomatic complexity (use `radon cc src/`) but low coverage are the risk.
Fix: supplement line coverage thresholds with a critical-module coverage requirement: identify the 5 highest-complexity modules and enforce 90%+ branch coverage on them specifically in CI.

**Mutation testing reveals the test suite passes despite zero meaningful assertions**
Why: tests call functions and check that no exception is raised but never assert the return value or state change, achieving line coverage without catching any real bugs.
Detect: run `mutmut run` on a module and find that the mutation score is below 30% — most mutations survive because tests don't verify outputs.
Fix: require assertion-per-test-case as a code review checklist item; use mutmut or cosmic-ray in CI for the most critical modules, failing the build if the mutation score drops below a threshold.

**Staging environment diverges from production, making the integration test tier unreliable**
Why: staging uses a different database version, a scaled-down Redis with different eviction policy, or a mocked third-party that doesn't match the real API's rate limits and response shapes.
Detect: bugs are regularly found in production that cannot be reproduced in staging, and the root cause traces back to an environment difference.
Fix: enforce environment parity via Infrastructure as Code (the same Terraform module parameterised for scale); run quarterly parity checks comparing all service versions and config values between staging and production.

## Connections

- [[qa/test-case-design]] — techniques for deriving effective test cases
- [[qa/risk-based-testing]] — prioritising test effort by risk
- [[qa/exploratory-testing]] — unscripted testing to find what scripted tests miss
- [[qa/bdd-gherkin]] — behaviour-driven acceptance criteria format
- [[technical-qa/test-architecture]] — Page Object Model, test code structure
- [[test-automation/playwright]] — E2E automation implementation
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

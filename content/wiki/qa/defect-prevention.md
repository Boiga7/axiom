---
type: concept
category: qa
para: resource
tags: [defect-prevention, static-analysis, code-review, shift-left, peer-review]
sources: []
updated: 2026-05-01
tldr: Finding bugs before they're written is cheaper than finding them after.
---

# Defect Prevention

Finding bugs before they're written is cheaper than finding them after. Defect prevention shifts quality upstream: better requirements, code analysis, peer review, and standards reduce the rate at which defects enter the codebase.

---

## Cost of Defects by Stage

```
Requirements/design → $1 (cost unit)
Development         → $10
Unit testing        → $15
Integration testing → $25
System testing      → $50
Production          → $100–$1,000+

Prevention is 100x cheaper than production hotfixes.
```

---

## Requirements Quality

Ambiguous requirements are the root cause of most defects. QA's role in requirements:

```
Acceptance criteria checklist (before sprint):
  [ ] Written in GIVEN/WHEN/THEN format (testable)
  [ ] Covers happy path AND error paths
  [ ] Edge cases explicitly stated (empty state, max values, permissions)
  [ ] Non-functional requirements included (response time, data volume)
  [ ] No ambiguous words: "fast", "user-friendly", "appropriate"
  [ ] Dependencies and external system behaviour clarified
  [ ] Rollback/undo scenario addressed
  [ ] Data format and validation rules specified
```

---

## Static Analysis in CI

Catch bugs before code review:

```yaml
# Python — ruff + mypy + bandit
- name: Static analysis
  run: |
    ruff check src/ --select E,W,F,C,B,S   # includes bugbear and security rules
    mypy src/ --strict
    bandit -r src/ -ll

# TypeScript — eslint + tsc
- name: Static analysis
  run: |
    npx tsc --noEmit
    npx eslint src/ --ext .ts,.tsx --max-warnings 0
```

**Key static analysis catches:**
- Unused variables and imports (often symptom of logic errors)
- Type mismatches (function expects string, caller passes None)
- Missing null checks
- SQL injection patterns (Semgrep)
- Hardcoded secrets (detect-secrets)
- Unreachable code (dead branches after early returns)

---

## Code Review Checklist

```markdown
## PR Code Review — QA Perspective

### Functionality
- [ ] Does the code match the acceptance criteria exactly?
- [ ] Are all edge cases handled (empty list, null, zero, max value)?
- [ ] Are error conditions handled and communicated clearly?
- [ ] Are all external API failures handled?

### Testability
- [ ] Are new functions/methods covered by unit tests?
- [ ] Are new API endpoints covered by integration tests?
- [ ] Are tests asserting behaviour, not just execution?
- [ ] Are side effects isolated (DB calls mocked where appropriate)?

### Security
- [ ] No hardcoded secrets or credentials?
- [ ] User input validated at the boundary?
- [ ] SQL queries parameterised (no string concatenation)?
- [ ] New endpoints protected with appropriate auth?

### Observability
- [ ] Errors are logged with enough context to diagnose?
- [ ] Success paths emit metrics where needed?
- [ ] Trace context propagated through service calls?
```

---

## Pair Programming

```
Benefits for defect prevention:
  - Two-person knowledge prevents single points of failure
  - Immediate feedback catches logic errors before commit
  - Navigator questions implementation while driver focuses on syntax
  - Shared ownership → both understand the code

When to pair:
  - Complex algorithm or tricky edge case
  - New team member + experienced dev
  - High-stakes or high-risk change
  - When someone is stuck for > 2 hours
```

---

## Mutation Testing as Prevention Signal

```bash
# Run mutation testing on critical modules to check test quality
mutmut run --paths-to-mutate src/checkout/ --tests-dir tests/

# If mutation score is low (< 70%) in a critical module:
# → tests are not verifying behaviour
# → defects in those code paths will escape to production
# → write more specific assertions before the module is changed further
```

---

## Dependency Review

```yaml
# GitHub — block PRs that introduce high-severity vulnerable dependencies
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high
    deny-licenses: GPL-3.0, AGPL-3.0    # block copyleft licences
    comment-summary-in-pr: always
```

---

## Formal Defect Classification and Feedback

```
After each bug found in production:
  1. Classify: requirement gap / logic error / edge case / integration failure / security
  2. Identify: which prevention layer should have caught it?
     - Requirements review: unclear AC
     - Static analysis: type error
     - Unit test: missing branch coverage
     - Integration test: missing contract
     - Code review: reviewer missed it
  3. Action: strengthen that layer (add check, improve coverage, update checklist)

This creates a learning loop — each prod bug makes the prevention layer stronger.
```

---

## Common Failure Cases

**Static analysis configured in warn-only mode in CI**
Why: linters and type checkers that emit warnings but never fail the build produce a wall of ignored output; developers learn to scroll past them, and the signal disappears.
Detect: CI logs contain hundreds of static analysis warnings that have never been acted on; the `--max-warnings` flag is set to a large number or absent entirely.
Fix: set `--max-warnings 0` (or equivalent) and treat new warnings as build failures; reduce the existing warning count to zero before flipping the switch.

**Code review checklist exists on a wiki page but is not linked to the PR template**
Why: checklists not surfaced at review time are rarely consulted; reviewers rely on memory, and systematic gaps in coverage (missing null checks, unvalidated input) recur across PRs.
Detect: the same class of bug (e.g., missing authentication check on a new endpoint) appears in multiple production incidents over a quarter.
Fix: embed the checklist directly in the `.github/pull_request_template.md` so it appears as a checkbox list on every PR; reviewers must actively uncheck or address each item.

**Mutation testing run manually as a one-off rather than as a CI gate on critical modules**
Why: mutation scores in critical modules (payment, auth, data export) decay as new code paths are added without corresponding test coverage; a one-time pass gives false confidence.
Detect: the mutation score for a critical module drops below 70% over a quarter without anyone noticing.
Fix: add mutation testing to the nightly CI job for the top 3-5 highest-risk modules; alert if mutation score drops more than 5 points below baseline.

**Acceptance criteria reviewed only by QA rather than as a Three Amigos session**
Why: QA-only review catches testability gaps but misses technical constraints the developer would flag and business nuances the product owner would clarify; ambiguities survive into implementation.
Detect: developers frequently request story clarification mid-sprint, or bugs are filed against stories as "wrong implementation" rather than "edge case missed."
Fix: mandate a Three Amigos review for any story estimated at 3+ points before it enters sprint; QA writes draft acceptance criteria, but the final version requires sign-off from all three roles.

## Connections
[[qa-hub]] · [[qa/agile-qa]] · [[qa/test-strategy]] · [[qa/qa-in-devops]] · [[qa/security-testing-qa]] · [[qa/bdd-gherkin]] · [[technical-qa/mutation-testing]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

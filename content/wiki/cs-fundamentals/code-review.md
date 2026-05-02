---
type: concept
category: cs-fundamentals
para: resource
tags: [code-review, pull-request, feedback, pair-programming, reviewer]
sources: []
updated: 2026-05-01
tldr: A structured review of code changes before they merge. Done well, code review catches bugs, spreads knowledge, enforces standards, and is the most effective quality gate a team has.
---

# Code Review

A structured review of code changes before they merge. Done well, code review catches bugs, spreads knowledge, enforces standards, and is the most effective quality gate a team has. Done poorly, it's a bottleneck that slows delivery without adding value.

---

## What Code Review Is For

```
Primary goals (in order of value):
  1. Bug detection — the earlier the cheaper
  2. Correctness and completeness — does it actually solve the problem?
  3. Knowledge transfer — reviewer learns, author learns from questions
  4. Design feedback — is this the right abstraction?

Secondary goals:
  5. Standards enforcement — but use linters for this, not humans
  6. Security audit — but dedicated security review is more reliable

Not the goal:
  - Style enforcement (use a formatter)
  - Pointing out things that "could be done differently" without reason
  - Demonstrating the reviewer's knowledge
```

---

## Reviewer Checklist

```markdown
## Correctness
- [ ] Does this solve the stated problem?
- [ ] Are there edge cases not handled? (null, empty list, concurrent access, auth failure)
- [ ] Are all paths through the code reachable and correct?
- [ ] Does it handle errors? Are errors surfaced or swallowed?

## Design
- [ ] Is the abstraction level right? (not too generic, not too specific)
- [ ] Does this introduce unexpected complexity?
- [ ] Could this be simpler without losing correctness?
- [ ] Are side effects visible and limited?

## Tests
- [ ] Are there tests for the new behaviour?
- [ ] Do the tests verify behaviour, not implementation?
- [ ] Are unhappy paths tested?
- [ ] Would a test failure tell me what broke?

## Security
- [ ] Is user input validated at the boundary?
- [ ] Are queries parameterised (no string concatenation)?
- [ ] Are there hardcoded secrets?
- [ ] Are new endpoints protected with auth?

## Observability
- [ ] Are errors logged with enough context to diagnose?
- [ ] Are key operations instrumented?
```

---

## How to Give Good Feedback

```
Use the CARES framework:

Context:    "In a high-traffic path like this..."
Action:     "...I'd extract the DB call into a separate function..."
Reason:     "...because connection timeouts here cascade to 500s for the user."
Example:    (optional code snippet)
Suggestion: "Happy to pair on this if useful."

Grade comments:
  [blocking] — must fix before merge (bug, security issue, correctness gap)
  [non-blocking] — good to address but won't hold the PR
  [nit] — cosmetic preference, take it or leave it
  [question] — asking to understand, not requesting a change

Don't:
  "This is wrong." (no reason, no suggestion)
  "I would have done X." (unless X is clearly better)
  "Why did you do it like this?" (sounds accusatory — ask differently)

Do:
  "This will fail if `items` is empty — line 47 would panic on index 0."
  "Nit: prefer `items.is_empty()` over `len(items) == 0` — more idiomatic in Rust."
  "Question: is there a reason we're not using the existing `UserService` here?"
```

---

## PR Author Responsibilities

```
Before requesting review:
  - Self-review your own diff first — would you approve this?
  - Tests pass locally; linter clean; type checker clean
  - PR description explains WHY, not just WHAT
  - PR is scoped: one concern, reviewable in 15-20 minutes
  - No debugging artifacts left in (print statements, commented-out code)

Good PR description:
  Problem: What user/system problem does this solve?
  Solution: High-level approach and key decisions
  Testing: What did you test and how?
  Screenshots: If it's a UI change, include before/after

PR size:
  < 400 lines changed: easy to review, most defects caught
  400-800 lines: reviewers skim, defects slip through
  > 800 lines: mostly ceremonial approval, quality benefit near zero
```

---

## Review Process Design

```
Norms that make review work:

Turnaround SLA:
  Reviews requested → first response within 4 hours (same business day)
  Don't let PRs sit overnight unanswered

LGTM with conditions:
  "I'm approving but please address [X] before merging"
  Trusts the author, removes blocking round-trips

Draft PRs:
  Use for early design feedback without full review overhead
  Opens discussion before too much code is written

Review rounds:
  After author addresses comments, re-request review
  Reviewers should focus only on changed lines in second pass

Auto-assign reviewers:
  CODEOWNERS file — specific teams own specific paths
  Rotation rules — spread review load across team
```

---

## CODEOWNERS Example

```
# .github/CODEOWNERS

# Global fallback — any file not matched below
*                   @org/team-leads

# Backend
src/api/            @org/backend-team
src/models/         @org/backend-team

# Frontend
src/components/     @org/frontend-team
src/pages/          @org/frontend-team

# Infrastructure — mandatory security review
infra/              @org/platform-team @org/security-team
.github/            @org/platform-team

# Critical paths — senior review required
src/payments/       @org/backend-senior
src/auth/           @org/security-team
```

---

## Automated Review Aids

```yaml
# .github/workflows/pr-check.yaml
name: PR Quality Gate

on: [pull_request]

jobs:
  size-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Check PR size
      run: |
        LINES=$(git diff origin/${{ github.base_ref }} --stat | tail -1 | grep -o '[0-9]* insertion' | grep -o '[0-9]*')
        if [ "$LINES" -gt 800 ]; then
          echo "::warning::PR has $LINES lines changed. Consider splitting."
        fi
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/clean-code]] · [[cs-fundamentals/tdd-se]] · [[qa/defect-prevention]] · [[qa/agile-qa]] · [[cs-fundamentals/design-patterns]]

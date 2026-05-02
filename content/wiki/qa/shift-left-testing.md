---
type: concept
category: qa
para: resource
tags: [shift-left, early-testing, requirements, static-analysis, tdd, three-amigos]
sources: []
updated: 2026-05-01
tldr: Moving quality activities earlier in the SDLC — from deployment back to design — so defects are caught when they're cheapest to fix.
---

# Shift-Left Testing

Moving quality activities earlier in the SDLC — from deployment back to design — so defects are caught when they're cheapest to fix.

---

## The Cost of a Bug by Stage

```
Stage of detection       Relative cost to fix
────────────────────────────────────────────
Requirements             $1
Design                   $5
Development              $10
Unit test                $15
Integration test         $40
System test              $100
UAT                      $300
Production               $1,000 – $10,000+

Source: IBM Systems Sciences Institute (classic but directionally consistent across studies)

Implication: finding a bug in a story's acceptance criteria costs 1/1000th
of finding it in a production incident — invest accordingly.
```

---

## Where to Shift Left

```
Traditional order:       Requirements → Design → Build → Test → Deploy
Shifted order:           Test thinking starts at Requirements

Activities that move left:
  Requirements           QA reviews ACs before sprint starts (Three Amigos)
  Design                 QA reviews API contracts and data models before build
  Development            Developers write tests first (TDD) with QA-reviewed ACs
  Build                  Static analysis and security scanning in pre-commit hooks
  Integration            Contract tests run on every PR against provider stubs
  Pre-deploy             E2E smoke suite runs on every main branch push
```

---

## Three Amigos — Requirements Quality Gate

```
Three Amigos session before a story enters the sprint:
  - Developer: "Can I build this? Are there technical constraints?"
  - QA: "How will I test this? What are the edge cases?"
  - Product: "Is this the right thing to build? Does it meet the user need?"

Output: acceptance criteria that are specific, testable, and unambiguous.

Three Amigos AC checklist:
  [ ] Each AC is verifiable (has a clear pass/fail)
  [ ] Each AC specifies the user type (authenticated? admin? guest?)
  [ ] Error cases and boundary values are explicitly defined
  [ ] Non-functional requirements have numbers (< 200ms, > 99.9%)
  [ ] Integration points are named (which service? which field?)
  [ ] "And what if...?" questions answered before sprint starts

Bad AC:   "The checkout should be fast."
Good AC:  "GIVEN a user with items in their cart, WHEN they click Place Order,
           THEN the order is confirmed in < 2 seconds (p99 in staging under 10 RPS)."
```

---

## Gherkin as a Specification Tool

```gherkin
# Written before implementation — not after
# This becomes both documentation and automated test

Feature: Discount code application

  Background:
    Given a product "Widget Pro" with price £99.99
    And a discount code "SAVE10" that gives 10% off

  Scenario: Valid discount code applied at checkout
    Given I have "Widget Pro" in my cart
    When I apply discount code "SAVE10"
    Then the discount amount is £10.00
    And the total becomes £89.99

  Scenario: Invalid discount code
    Given I have "Widget Pro" in my cart
    When I apply discount code "INVALID"
    Then I see "This code is not valid"
    And the cart total remains £99.99

  Scenario: Expired discount code
    Given I have "Widget Pro" in my cart
    And discount code "EXPIRED01" expired yesterday
    When I apply discount code "EXPIRED01"
    Then I see "This code has expired"

  Scenario: Discount applied to only eligible items
    Given I have "Widget Pro" (£99.99) and "Basic Widget" (£19.99) in my cart
    And discount code "SAVE10" applies only to "Widget Pro"
    When I apply discount code "SAVE10"
    Then the discount is £10.00
    And the total is £109.98
```

---

## Pre-Commit Hooks as Shift-Left Gate

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff              # linting
      - id: ruff-format       # formatting

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies: [pydantic, sqlalchemy-stubs]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.8
    hooks:
      - id: bandit
        args: ["-r", "src/", "--severity-level", "medium"]

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ["--baseline", ".secrets.baseline"]

  - repo: local
    hooks:
      - id: unit-tests-fast
        name: Fast unit tests
        entry: pytest tests/unit/ -x -q --timeout=5
        language: system
        types: [python]
        pass_filenames: false
```

---

## API Contract Review (Design Phase)

```python
# QA reviews OpenAPI spec before implementation begins
# Checklist for API contracts:

def validate_api_contract(spec_path: str) -> list[str]:
    import yaml
    issues = []

    with open(spec_path) as f:
        spec = yaml.safe_load(f)

    for path, methods in spec.get("paths", {}).items():
        for method, definition in methods.items():
            endpoint = f"{method.upper()} {path}"

            # Must have 4xx response defined
            responses = definition.get("responses", {})
            if not any(str(code).startswith("4") for code in responses):
                issues.append(f"{endpoint}: no 4xx error response defined")

            # Must have 5xx response defined
            if "500" not in responses and "default" not in responses:
                issues.append(f"{endpoint}: no 500/default error response defined")

            # Request body must have schema
            req_body = definition.get("requestBody", {})
            if req_body and "schema" not in str(req_body):
                issues.append(f"{endpoint}: request body missing schema")

    return issues

# Run in CI before implementation PR is opened
```

---

## Shift-Left Metrics

```
Measure to know if shift-left is working:

Defect escape rate by stage:
  formula: bugs found in stage N+1 / bugs found in stage N
  target:  < 10% escape rate from dev into QA testing

Requirements defect rate:
  formula: ACs changed mid-sprint / total ACs planned
  target:  < 15% (high rate = Three Amigos sessions not deep enough)

Test coverage at PR merge:
  formula: coverage % when PR merges (not at end of sprint)
  target:  > 80% before merge, not retrofitted after

Time from code complete to test complete:
  formula: hours between "dev done" and "QA signed off"
  target:  < 24 hours (indicates test environment and data are ready)
```

---

## Connections

[[qa-hub]] · [[qa/agile-qa]] · [[qa/test-planning]] · [[qa/bdd-gherkin]] · [[qa/defect-prevention]] · [[qa/continuous-testing]] · [[qa/qa-in-devops]]

---
type: concept
category: technical-qa
para: resource
tags: [mutation-testing, mutmut, pit, test-quality, coverage]
sources: []
updated: 2026-05-01
tldr: Automatically introducing bugs (mutations) into source code to verify that tests catch them. A test suite with 100% line coverage can still be useless if it never asserts anything.
---

# Mutation Testing

Automatically introducing bugs (mutations) into source code to verify that tests catch them. A test suite with 100% line coverage can still be useless if it never asserts anything. Mutation testing proves tests are actually checking behaviour.

---

## How It Works

```
1. Mutation tool modifies your source code one change at a time:
   - Change `>` to `>=`
   - Replace `+` with `-`
   - Remove `not` keyword
   - Change `True` to `False`
   - Delete a return statement

2. Run your test suite against each mutated version

3. If tests FAIL → mutation is "killed" (good — tests caught the bug)
   If tests PASS → mutation "survived" (bad — tests didn't catch this class of bug)

Mutation Score = killed / (killed + survived) × 100%
```

A mutation score of 80%+ is considered good. 60% means tests are missing significant behaviour.

---

## mutmut (Python)

```bash
pip install mutmut

# Run mutation testing on src/ directory
mutmut run --paths-to-mutate src/ --tests-dir tests/

# Show surviving mutants (the ones tests didn't catch)
mutmut results

# Show diff for a specific surviving mutant
mutmut show 42

# Apply surviving mutant to see what change it made
mutmut apply 42

# HTML report
mutmut html
open html/index.html

# Show summary
mutmut junitxml > mutation-results.xml
```

Example output:
```
Legend for output:
  . Killed (good) — your tests caught this mutation
  s Survived (bad) — tests did NOT catch this mutation
  ~ Skipped
  ! Error (mutation caused syntax error)

Ran 847 mutations, 731 killed (86.3%), 116 survived, 0 skipped
```

---

## Interpreting Surviving Mutants

```python
# Original code
def calculate_discount(price: float, is_member: bool) -> float:
    if is_member:
        return price * 0.9
    return price

# Mutation: change `is_member` to `not is_member`
def calculate_discount(price: float, is_member: bool) -> float:
    if not is_member:    # ← mutant survived if tests don't cover non-member case
        return price * 0.9
    return price
```

Surviving mutant reveals: tests didn't cover the non-member path with an assertion.

```python
# Fix: add the missing test
def test_non_member_pays_full_price():
    assert calculate_discount(100.0, is_member=False) == 100.0

def test_member_gets_10_percent_off():
    assert calculate_discount(100.0, is_member=True) == 90.0
```

---

## PIT (Java)

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.0</version>
    <configuration>
        <targetClasses>
            <param>com.myapp.service.*</param>
        </targetClasses>
        <targetTests>
            <param>com.myapp.service.*Test</param>
        </targetTests>
        <mutators>
            <mutator>DEFAULTS</mutator>
            <mutator>RETURNS_VALS</mutator>
        </mutators>
        <outputFormats>
            <outputFormat>HTML</outputFormat>
            <outputFormat>XML</outputFormat>
        </outputFormats>
        <failWhenNoMutations>false</failWhenNoMutations>
        <mutationThreshold>80</mutationThreshold>   <!-- fail if score drops below 80% -->
    </configuration>
</plugin>
```

```bash
mvn org.pitest:pitest-maven:mutationCoverage
# Report: target/pit-reports/index.html
```

---

## Stryker (JavaScript/TypeScript)

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# stryker.conf.json
{
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "testRunner": "jest",
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {"high": 80, "low": 60, "break": 50}
}

npx stryker run
```

---

## CI Integration

Mutation testing is slow — don't run on every PR. Run nightly or on release branches.

```yaml
# .github/workflows/mutation.yaml
on:
  schedule:
  - cron: '0 3 * * *'   # 3am nightly
  push:
    branches: [main]

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: pip install mutmut pytest
    - run: mutmut run --paths-to-mutate src/ --tests-dir tests/ || true
    - run: mutmut junitxml > mutation-results.xml
    - uses: actions/upload-artifact@v4
      with:
        name: mutation-report
        path: html/
```

---

## Mutation Testing vs Coverage

| | Line Coverage | Mutation Testing |
|---|---|---|
| Tells you | Code was executed | Tests checked the behaviour |
| 100% coverage = safe? | No | Not necessarily — but 80%+ mutation score = probably |
| Speed | Fast | 10-50x slower than normal tests |
| Best use | CI gating | Nightly, targeted at critical modules |

Run mutation testing on your most critical business logic (payment, auth, pricing) rather than the whole codebase.

---

## Connections
[[tqa-hub]] · [[technical-qa/test-architecture]] · [[qa/regression-testing]] · [[qa/qa-metrics]] · [[qa/test-strategy]]

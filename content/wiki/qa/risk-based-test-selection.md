---
type: concept
category: qa
para: resource
tags: [test-selection, risk-based, change-impact, ci-speed, regression-selection, flakiness]
sources: []
updated: 2026-05-01
---

# Risk-Based Test Selection

Running the right tests at the right time — not the entire suite on every commit.

---

## The Selection Problem

```
Test suite growth over time:
  Month 1:  200 tests, 2-minute CI run
  Month 6:  1,500 tests, 15-minute CI run
  Month 12: 4,000 tests, 45-minute CI run
  Month 18: "We've stopped running the full suite on every PR"

The naive solution — "run everything always" — does not scale.

The goal: maximum defect detection for minimum CI time.
```

---

## Selection Strategies

```
Strategy                | Selects tests based on      | Best for
────────────────────────|────────────────────────────|──────────────────────────
Changed files           | Which files were modified  | Unit + integration tests
Changed modules         | Dependency graph of changes| Service-level tests
Historical correlation  | Which tests fail when file | Flaky + regression tests
                        | X changes                  |
Risk tier               | Business criticality of    | Release gates
                        | the feature under test     |
All tests (baseline)    | Nothing — run everything   | Nightly, pre-release
```

---

## File-Based Test Selection

```python
# Run only tests related to the files that changed in this PR
# Works well for unit and integration tests with clear file→test mapping

import subprocess
from pathlib import Path

def get_changed_files(base_branch: str = "origin/main") -> set[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", base_branch],
        capture_output=True, text=True,
    )
    return {f.strip() for f in result.stdout.splitlines() if f.strip()}

def map_source_to_tests(changed_files: set[str]) -> list[str]:
    """Map src/module/foo.py → tests/module/test_foo.py"""
    test_files = []
    for filepath in changed_files:
        path = Path(filepath)
        if path.parts[0] == "src":
            # src/orders/service.py → tests/orders/test_service.py
            test_path = Path("tests") / Path(*path.parts[1:]).parent / f"test_{path.stem}.py"
            if test_path.exists():
                test_files.append(str(test_path))
    return test_files

# pytest command
changed = get_changed_files()
test_files = map_source_to_tests(changed)
if test_files:
    subprocess.run(["pytest"] + test_files + ["-x", "--tb=short"])
else:
    print("No test files to run for changed files")
```

---

## Dependency-Aware Selection with pytest-testmon

```bash
# pytest-testmon tracks which tests use which source files
# On re-run: only runs tests affected by changed source code
pip install pytest-testmon

# First run: build the dependency database
pytest --testmon

# Subsequent runs: only re-run affected tests
pytest --testmon   # automatically selects based on what changed

# CI: pass testmon db between runs (cache in GitHub Actions)
# .github/workflows/test.yml
- name: Cache testmon database
  uses: actions/cache@v4
  with:
    path: .testmondata
    key: testmon-${{ runner.os }}-${{ hashFiles('**/*.py') }}
    restore-keys: |
      testmon-${{ runner.os }}-

- name: Run affected tests
  run: pytest --testmon -v
```

---

## Risk-Tiered Test Suites

```
Define 3 tiers. Each PR runs Tier 1. Merge to main runs Tier 1+2. Nightly runs all.

Tier 1 — Fast feedback (< 3 min):
  - All unit tests
  - Smoke tests (3-5 critical path E2E)
  - Run on: every push, every PR

Tier 2 — Core regression (< 15 min):
  - Full integration test suite
  - Core E2E journeys (payment, auth, key business flows)
  - Run on: PR merge to main, before deploy to staging

Tier 3 — Full regression (< 60 min):
  - Complete E2E suite
  - Performance baseline validation
  - Cross-browser tests
  - Run on: nightly, before production release
```

```yaml
# pytest marks for test tiers
# pyproject.toml
[tool.pytest.ini_options]
markers = [
    "tier1: fast unit tests — always run",
    "tier2: integration tests — run on merge",
    "tier3: full regression — run nightly",
]

# Usage
@pytest.mark.tier1
def test_order_calculation():
    assert calculate_total(items=[{"price": 10, "qty": 3}]) == 30.0

@pytest.mark.tier2
async def test_create_order_end_to_end(client, db):
    ...

# CI commands
# On PR: pytest -m "tier1"
# On merge: pytest -m "tier1 or tier2"
# Nightly: pytest  # no filter = all
```

---

## Historical Failure Correlation

```python
# Which tests have historically failed when file X changes?
# Use this to build a smarter selection set than just "test files for changed source"

from collections import defaultdict

def build_failure_correlation_map(test_results_db) -> dict[str, set[str]]:
    """
    Returns {source_file: {tests_that_failed_when_this_file_changed}}
    Built from historical CI data.
    """
    correlation: dict[str, set[str]] = defaultdict(set)

    for run in test_results_db.get_failed_runs():
        changed_files = run.changed_files
        failed_tests = run.failed_tests
        for source_file in changed_files:
            for test in failed_tests:
                correlation[source_file].add(test)

    return dict(correlation)

# Use at test selection time
def select_tests_by_history(
    changed_files: set[str],
    correlation_map: dict[str, set[str]],
) -> set[str]:
    selected = set()
    for f in changed_files:
        selected.update(correlation_map.get(f, set()))
    return selected
```

---

## Making It Visible

```
Report test selection decisions to the PR so developers understand why CI ran what it ran.

GitHub PR comment template:
  ## Test Selection
  Changed files: 3 (orders/service.py, orders/models.py, tests/orders/test_service.py)
  Selected tests: 47 (out of 3,200 total)
  Selection method: file mapping + historical correlation
  Excluded: tier2 (E2E) — only runs on merge
  Expected duration: 4 min (vs 28 min full suite)

  To run all tests locally: pytest
  To run same selection: pytest tests/orders/ -m "tier1"
```

---

## Connections

[[qa/qa-hub]] · [[qa/risk-based-testing]] · [[qa/test-automation-strategy]] · [[qa/continuous-testing]] · [[technical-qa/parallel-test-execution]] · [[technical-qa/pytest-advanced]] · [[qa/qa-metrics]]

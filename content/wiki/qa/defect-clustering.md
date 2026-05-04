---
type: concept
category: qa
para: resource
tags: [defect-clustering, 80-20, hotspots, predictive-analysis, risk-based, defect-density]
sources: []
updated: 2026-05-01
tldr: Defects are not randomly distributed — they cluster in a small number of modules. Find the hotspots and focus testing there.
---

# Defect Clustering and Hotspot Analysis

Defects are not randomly distributed. They cluster in a small number of modules. Find the hotspots and focus testing there.

---

## The 80/20 Rule in Defects

```
Pareto Principle applied to defects:
  ~80% of defects come from ~20% of modules.

This is not a coincidence — it reflects:
  - Complexity clustering: the most complex code has the most bugs
  - Change frequency: code that changes often breaks more often
  - Dependencies: shared code fails across many callers when it's wrong
  - Developer experience: unfamiliar modules get written less carefully

Practical implication:
  Testing effort proportional to code coverage = poor ROI
  Testing effort proportional to defect history = much better ROI
```

---

## Building a Defect Density Map

```python
# Pull defect history from Jira and correlate with git blame / file paths
import re
from collections import Counter
from pathlib import Path

def extract_files_from_git_log(since: str = "6 months ago") -> Counter:
    """Count how many commits touched each file in the last N months."""
    import subprocess
    result = subprocess.run(
        ["git", "log", f"--since={since}", "--name-only", "--pretty=format:"],
        capture_output=True, text=True,
    )
    files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return Counter(files)

def extract_defect_files(defect_list: list[dict]) -> Counter:
    """Map defects to the files they were fixed in.
    defect_list: [{"ticket": "TKT-123", "fix_commit": "abc123"}, ...]
    """
    import subprocess
    file_counter: Counter = Counter()
    for defect in defect_list:
        result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "-r", "--name-only", defect["fix_commit"]],
            capture_output=True, text=True,
        )
        for f in result.stdout.splitlines():
            file_counter[f.strip()] += 1
    return file_counter

def calculate_defect_density(defect_counts: Counter, loc_by_file: dict) -> list[dict]:
    """Defects per 1000 lines of code — normalise for file size."""
    densities = []
    for filepath, defect_count in defect_counts.items():
        loc = loc_by_file.get(filepath, 1)
        densities.append({
            "file": filepath,
            "defects": defect_count,
            "loc": loc,
            "density": round(defect_count / loc * 1000, 2),
        })
    return sorted(densities, key=lambda x: x["density"], reverse=True)
```

---

## Hotspot Matrix

```
Combine two signals to prioritise testing:
  - Defect history (bugs found here before)
  - Change frequency (changed recently = higher risk)

             | Low change | High change |
─────────────|────────────|─────────────|
High defects | Monitor    | TEST FIRST  |
Low defects  | Skip/light | Targeted    |

"Test First" = your highest-risk code. Regression focus here.
"Monitor" = historically buggy but stable — watch for regressions.
"Targeted" = changing fast but clean — new code review + unit tests.
"Skip" = lowest risk — don't waste exploratory time here.
```

---

## Defect Pattern Analysis

```python
# Categorise defects to find systemic issues, not just file hotspots

from dataclasses import dataclass
from enum import auto, StrEnum
from collections import Counter

class DefectCategory(StrEnum):
    VALIDATION = "validation"
    CONCURRENCY = "concurrency"
    ERROR_HANDLING = "error_handling"
    DATA_MAPPING = "data_mapping"
    BOUNDARY = "boundary"
    AUTH = "authentication_authorisation"
    INTEGRATION = "third_party_integration"
    CONFIGURATION = "configuration"

@dataclass
class Defect:
    ticket_id: str
    module: str
    category: DefectCategory
    severity: str
    escaped_to_production: bool

def analyse_patterns(defects: list[Defect]) -> dict:
    category_counts = Counter(d.category for d in defects)
    escape_by_category = Counter(
        d.category for d in defects if d.escaped_to_production
    )
    escape_rate = {
        cat: escape_by_category.get(cat, 0) / count
        for cat, count in category_counts.items()
    }
    return {
        "by_category": dict(category_counts.most_common()),
        "escape_rate_by_category": {
            k: round(v * 100, 1)
            for k, v in sorted(escape_rate.items(), key=lambda x: -x[1])
        },
        "top_module": Counter(d.module for d in defects).most_common(5),
    }

# Typical findings:
# - Validation defects: high count, low escape rate (caught by automation)
# - Integration defects: medium count, HIGH escape rate (hard to test in isolation)
# - Concurrency defects: low count, high escape rate (only appear under load)
```

---

## Predictive Defect Analysis

```python
# Use complexity + churn to predict where the next bugs will be
# BEFORE they happen — proactive testing priority

import subprocess

def calculate_complexity_churn(repo_path: str, since: str = "90 days ago") -> list[dict]:
    """
    Churn = number of times a file changed.
    Complexity = proxy: line count (real tools: lizard, radon).
    High churn + high complexity = highest defect risk.
    """
    # Get churn
    result = subprocess.run(
        ["git", "log", f"--since={since}", "--name-only", "--pretty=format:", "--", "*.py"],
        capture_output=True, text=True, cwd=repo_path,
    )
    churn = Counter(line.strip() for line in result.stdout.splitlines() if line.strip())

    # Get complexity (line count as simple proxy)
    scores = []
    for filepath, changes in churn.most_common(50):
        full_path = Path(repo_path) / filepath
        if not full_path.exists():
            continue
        loc = len(full_path.read_text().splitlines())
        # Normalise both dimensions to 0-1 scale for comparison
        scores.append({"file": filepath, "churn": changes, "loc": loc})

    # Rank by combined risk score
    max_churn = max(s["churn"] for s in scores) or 1
    max_loc = max(s["loc"] for s in scores) or 1
    for s in scores:
        s["risk_score"] = (s["churn"] / max_churn + s["loc"] / max_loc) / 2

    return sorted(scores, key=lambda x: -x["risk_score"])
```

---

## Using Hotspot Data in Test Planning

```
Weekly ritual (15 minutes):
  1. Run the defect density and churn scripts
  2. Identify the top 5 files by risk score
  3. Check: do we have automated tests covering these files?
  4. If not: schedule exploratory session or write targeted tests this sprint
  5. If yes: verify tests actually exercise the risky paths (check coverage per file)

Sprint planning input:
  "The payment processor module has 12 defects in 6 months and 40 commits.
   Risk score: 0.89 (highest in codebase).
   Recommendation: add 3 edge-case unit tests and one exploratory session
   this sprint before the new payment flow lands."

Stakeholder reporting:
  "Our top 3 defect hotspots account for 67% of production incidents this quarter.
   We are targeting these with additional test coverage in Q3.
   Expected impact: 40% reduction in production defect rate."
```

---

## Common Failure Cases

**Using raw defect count instead of defect density to rank hotspots**
Why: a large module with 500 lines of code and 10 bugs has a lower density than a small utility with 50 lines and 5 bugs; ranking by count directs testing effort to the large module, which may actually be proportionally cleaner.
Detect: the hotspot list is dominated by the largest files in the codebase regardless of their relative change frequency.
Fix: normalise defect counts by lines of code (defects per 1,000 LOC) and weight by change frequency before ranking; use the hotspot matrix combining both dimensions.

**Hotspot analysis run once at the start of a quarter and never updated**
Why: the codebase changes weekly — new modules are introduced, hotspots are refactored, and risk shifts; stale hotspot data directs testing effort at code that is no longer the highest risk.
Detect: the hotspot list references modules that no longer exist or have been fully rewritten since the last analysis.
Fix: automate the defect density and churn scripts to run weekly and feed results into the sprint planning ritual; update the test plan each sprint to reflect current hotspots.

**Mapping defects to files instead of to logical components**
Why: a single component can span multiple files (e.g., a payment flow split across `routes.py`, `services.py`, `models.py`); file-level analysis misses the component-level concentration.
Detect: individual files in the hotspot list appear unrelated, but all belong to the same user-facing feature.
Fix: tag defects with a component or domain label in addition to the file path; run density analysis at the component level for planning, file level for code review targeting.

**Treating integration defects the same as validation defects in escape rate analysis**
Why: validation bugs have a low escape rate because automated tests catch them; integration bugs have a high escape rate because they only appear when external systems interact at runtime; conflating them hides the real risk.
Detect: escape rate analysis shows a flat distribution across defect categories without a spike on integration or concurrency bugs.
Fix: segment escape rate by defect category (see pattern analysis code) and prioritise integration testing investment based on the high-escape categories, not total count.

## Connections

[[qa/qa-hub]] · [[qa/risk-based-testing]] · [[qa/qa-metrics]] · [[qa/defect-prevention]] · [[qa/root-cause-analysis]] · [[qa/qa-leadership]] · [[technical-qa/mutation-testing]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

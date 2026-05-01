---
type: concept
category: qa
para: resource
tags: [rca, 5-whys, fishbone, post-mortem, incident-analysis, production-defects]
sources: []
updated: 2026-05-01
---

# Root Cause Analysis

Finding why defects happen so they stop happening — not just fixing the symptom.

---

## Why RCA Matters for QA

```
Without RCA:
  Bug found → bug fixed → same bug found next release
  QA becomes a defect detection factory, not a quality improvement engine

With RCA:
  Bug found → root cause identified → systematic fix → process improvement
  Over time, entire classes of defects stop occurring

RCA is a learning tool, not a blame tool.
The question is "what failed?" not "who failed?"
```

---

## The 5-Whys Technique

```
Start with the observable symptom. Ask "why?" until you reach a root cause you can fix.
Stop when the answer is a process/system failure (actionable), not a person failure.

Example: "Payment confirmation emails not sent"

Why 1: Why weren't emails sent?
  → The email service returned an error.

Why 2: Why did the email service return an error?
  → The API key had expired.

Why 3: Why had the API key expired?
  → We rotate keys annually, and the renewal wasn't completed in time.

Why 4: Why wasn't the renewal completed in time?
  → There's no automated alert when a key is near expiry; it was missed manually.

Why 5: Why is there no automated alert?
  → We never built one; key expiry was assumed to be a manual process.

Root cause: No automated monitoring of credential expiry.
Fix: Add credential expiry monitoring + alert to the observability stack.
Not the fix: "Remind the team to check keys more often."
```

---

## Fishbone (Ishikawa) Diagram

```
Used when the cause is unclear and multiple contributing factors exist.
Categories: People, Process, Technology, Environment, Materials, Management

                          ROOT CAUSE
                            |
         ┌──────────────────┼──────────────────┐
    Technology           Process              People
         │                  │                   │
  API key expired    No renewal process   Task not assigned
  No expiry alerts   No runbook           Owner changed role
         │                  │
  No credential     Key stored in         
  rotation policy   spreadsheet (stale)

For complex production incidents: run a Fishbone session with all stakeholders.
Document each branch. Identify which causes are addressable.
```

---

## Post-Mortem Template

```markdown
# Post-Mortem: Payment Email Failure — 2026-05-01

**Severity:** P2 (High)
**Duration:** 4 hours (09:00–13:00 UTC)
**Affected users:** ~2,400 order confirmations not sent

## Timeline

| Time (UTC) | Event |
|---|---|
| 09:00 | Alert fired: email delivery rate drops to 0% |
| 09:12 | On-call engineer paged |
| 09:30 | Root cause identified: expired API key |
| 10:15 | Key rotated; email delivery restored |
| 10:30 | Backlog of queued emails processed |
| 13:00 | All affected users notified via in-app banner |

## Impact

- 2,400 users did not receive order confirmation emails
- No financial impact (orders were processed correctly)
- ~150 support tickets opened by customers checking order status

## Root Cause

The Mailgun API key expired at 08:59 UTC. The renewal was missed because:
1. No automated alert exists for API key expiry within 30 days
2. The renewal task was owned by an engineer who left the team in March
3. The task was in a spreadsheet, not the ticketing system, and not reassigned

## Contributing Factors

- Manual credential management process
- No credential inventory in the secrets management system
- Lack of E2E monitoring (no synthetic test that sends a real email)

## What Went Well

- Alert fired within 1 minute of the failure
- On-call engineer identified root cause quickly (30 minutes)
- Communication to affected users was timely

## Action Items

| Action | Owner | Due | Status |
|---|---|---|---|
| Migrate all API keys to Secrets Manager with rotation | Platform team | 2026-05-15 | Open |
| Add credential expiry CloudWatch alarm (30-day warning) | Platform team | 2026-05-08 | Open |
| Add synthetic monitoring: send test email hourly | QA | 2026-05-10 | Open |
| Audit all manual credentials → secrets management inventory | Security | 2026-05-22 | Open |
| Update on-call runbook with email failure diagnosis steps | QA Lead | 2026-05-05 | Open |

## Lessons Learned

1. Manual credential management is a reliability risk; automate rotation.
2. Ownership of shared infrastructure tasks must be tracked in the ticketing system.
3. Functional monitoring (does email delivery actually work?) is as important as technical monitoring.
```

---

## Defect Escape Analysis

```python
# Track where in the lifecycle defects were found vs where they should have been caught
from dataclasses import dataclass
from enum import Enum

class DetectionStage(Enum):
    UNIT_TEST = "unit_test"
    INTEGRATION_TEST = "integration_test"
    QA_TESTING = "qa_testing"
    UAT = "uat"
    PRODUCTION = "production"

class ExpectedStage(Enum):
    UNIT_TEST = "unit_test"
    INTEGRATION_TEST = "integration_test"
    QA_TESTING = "qa_testing"

@dataclass
class DefectEscape:
    defect_id: str
    detected_at: DetectionStage
    should_have_been_caught_at: ExpectedStage
    reason_escaped: str
    action_taken: str

# Sprint retrospective analysis
def calculate_escape_rate(defects: list[DefectEscape]) -> dict:
    escaped_to_prod = [d for d in defects if d.detected_at == DetectionStage.PRODUCTION]
    return {
        "total_defects": len(defects),
        "escaped_to_production": len(escaped_to_prod),
        "escape_rate_pct": len(escaped_to_prod) / len(defects) * 100 if defects else 0,
        "escape_reasons": Counter(d.reason_escaped for d in escaped_to_prod),
    }
```

---

## Prevention Loop

```
RCA finding → process change → verification → closure

Prevention patterns per root cause:

Root cause: "No test covered this scenario"
  → Add test to the suite covering the exact failure
  → Add the scenario to test case design templates
  → Review AC checklist to ensure this class of scenario is always questioned

Root cause: "Test existed but wasn't run before release"
  → Add the test to the CI gate (not optional)
  → Review CI pipeline for coverage gaps

Root cause: "Infrastructure/config change, not code"
  → Add infrastructure tests (Terratest/OPA)
  → Add config validation to deployment pipeline

Root cause: "External dependency changed unexpectedly"
  → Add contract tests against the dependency
  → Add monitoring for dependency health
  → Add circuit breaker in the integration code
```

---

## Connections

[[qa-hub]] · [[qa/bug-lifecycle]] · [[qa/production-monitoring-qa]] · [[qa/defect-prevention]] · [[qa/risk-based-testing]] · [[qa/qa-metrics]]

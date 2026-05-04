---
type: concept
category: qa
para: resource
tags: [non-functional-testing, performance, reliability, usability, compatibility]
sources: []
updated: 2026-05-01
tldr: Testing how the system behaves under conditions, not just whether it does the right thing.
---

# Non-Functional Testing

Testing how the system behaves under conditions, not just whether it does the right thing. Non-functional requirements are often implicit. Users expect fast, reliable, secure, usable software even when it's not in the ticket.

---

## Non-Functional Requirement Categories

| Category | Question it answers | Test approach |
|---|---|---|
| Performance | How fast under load? | Load testing (k6, JMeter, Locust) |
| Scalability | Does it hold up as load grows? | Stress/spike testing |
| Reliability | Does it stay up? | Chaos engineering, SLO tracking |
| Security | Is it safe from attack? | SAST, DAST, pen testing |
| Usability | Can users accomplish their goals? | User testing, heuristic eval |
| Accessibility | Can disabled users use it? | axe-core, screen reader testing |
| Compatibility | Does it work across browsers/devices? | Cross-browser, device lab |
| Maintainability | Can engineers change it? | Code quality metrics, test coverage |
| Compliance | Does it meet regulations? | GDPR, WCAG, PCI DSS audits |

---

## Performance Testing Types

```
Load test      — sustained expected load (e.g., 500 concurrent users for 30 min)
Stress test    — ramp beyond capacity to find the breaking point
Spike test     — sudden large jump (Black Friday: 10x baseline in 30 seconds)
Soak test      — moderate load sustained over hours to find memory leaks
Volume test    — large data set (1M records) to find database/query bottlenecks
Baseline test  — single user, document response time under no load
```

---

## Reliability — SLOs and Error Budgets

```
SLI (Service Level Indicator): measured value — "99.2% of requests completed in < 500ms this month"
SLO (Service Level Objective): target — "99.9% of requests under 500ms per 30-day window"
SLA (Service Level Agreement): contractual commitment — penalty if SLO missed

Error budget = 100% - SLO = allowed downtime/failure
  99.9% SLO → 43.8 min/month of allowed downtime
  99.95% SLO → 21.9 min/month

When error budget is depleted:
  - Freeze feature work
  - Focus entirely on reliability improvements
  - Post-mortem required
```

---

## Chaos Engineering

Deliberately injecting failures to verify that systems degrade gracefully.

```bash
# AWS Fault Injection Service (FIS) — stop EC2 instances
aws fis create-experiment-template \
  --description "Terminate 25% of ECS tasks" \
  --actions '{
    "terminateTasks": {
      "actionId": "aws:ecs:stop-task",
      "parameters": {
        "duration": "PT2M",
        "ecsClusterArn": "arn:aws:ecs:eu-west-1:123456789:cluster/myapp"
      },
      "targets": {"Tasks": "taskTargets"}
    }
  }' \
  --targets '{"taskTargets": {"resourceType": "aws:ecs:task", "selectionMode": "PERCENT(25)"}}'
```

```python
# Toxiproxy — simulate network conditions in tests
import toxiproxy

proxy = toxiproxy.Proxy(name='myapp_db', listen='0.0.0.0:5433', upstream='postgres:5432')
proxy.create()

# Add latency
proxy.add_toxic('latency', type='latency', attributes={'latency': 1000, 'jitter': 200})

# Test that app handles 1s DB latency within timeout
result = my_app_function_under_test()
assert result is not None  # degraded, not failed

proxy.remove_toxic('latency')
```

Chaos tools: AWS FIS, Chaos Monkey (Netflix), Toxiproxy, Gremlin, LitmusChaos (Kubernetes).

---

## Usability Testing

```
Heuristic evaluation (expert review against Nielsen's 10 heuristics):
  1. Visibility of system status
  2. Match between system and real world
  3. User control and freedom
  4. Consistency and standards
  5. Error prevention
  6. Recognition rather than recall
  7. Flexibility and efficiency of use
  8. Aesthetic and minimalist design
  9. Help users recognise, diagnose, and recover from errors
  10. Help and documentation

Guerrilla testing (5 minutes, anyone nearby):
  - Give them a task, observe without helping
  - Note where they hesitate, misclick, or express confusion
  - 5 users reveal ~85% of usability problems (Nielsen)
```

---

## Performance Budgets

```yaml
# Lighthouse CI — fail build if metrics regress
# .lighthouserc.yaml
ci:
  collect:
    url: ['http://localhost:3000/', 'http://localhost:3000/products']
    numberOfRuns: 3
  assert:
    assertions:
      first-contentful-paint:
        - warn
        - maxNumericValue: 2000
      largest-contentful-paint:
        - error
        - maxNumericValue: 4000
      cumulative-layout-shift:
        - error
        - maxNumericValue: 0.1
      total-blocking-time:
        - error
        - maxNumericValue: 300
```

---

## Common Failure Cases

**NFRs never written, so performance testing has no pass/fail criteria**
Why: performance is treated as a concern only after a slow complaint arrives; no acceptance criteria exist against which a load test result can fail.
Detect: the load test report shows p95 = 1.2s but there is no SLO to compare it to; the team cannot determine whether to block release.
Fix: add performance acceptance criteria in the Given/When/Then format to every user-facing story before sprint start; the presence of a failing assertion makes the test a real gate.

**Soak test skipped because load test passed — memory leak ships to production**
Why: a 5-minute load test does not exercise the leak; only the 2-hour soak test would catch connection pool exhaustion or unbounded cache growth.
Detect: application memory climbs monotonically in production Grafana charts and requires a restart every 48 hours.
Fix: make the soak test mandatory (not optional) for any sprint that introduces a new background job, caching layer, or connection pool; schedule it as a nightly CI job rather than a pre-release manual step.

**Chaos experiment run against production without a rollback plan**
Why: FIS experiment template terminates 25% of ECS tasks but the auto-scaling policy has a misconfigured scale-out delay, leaving the cluster degraded for 12 minutes.
Detect: synthetic monitor fires an alert within 2 minutes; no runbook exists to stop the experiment early.
Fix: always define a `stopCondition` in the FIS template tied to an alarm (e.g., 5xx rate > 5%), and document the `aws fis stop-experiment` command in the runbook before executing any chaos experiment.

**Lighthouse CI assertions never tighten — performance budget drifts upward**
Why: the initial `maxNumericValue` thresholds are set generously and never revised; LCP creeps from 2.1s to 3.8s over six months without any CI failure.
Detect: compare the current Lighthouse CI config thresholds against the actual p95 values from last month's runs; if the threshold is more than 30% above current actuals, the budget is not functioning as a gate.
Fix: after each quarter, lower the `maxNumericValue` thresholds to 110% of the measured actuals, treating performance budgets as a ratchet that can only tighten.

## Connections
[[qa-hub]] · [[qa/test-strategy]] · [[qa/risk-based-testing]] · [[qa/accessibility-testing]] · [[qa/cross-browser-testing]] · [[technical-qa/performance-testing]] · [[cloud/cloud-monitoring]]
## Open Questions

- What testing scenarios does this technique systematically miss?
- How does this approach need to change when delivery cadence moves to continuous deployment?

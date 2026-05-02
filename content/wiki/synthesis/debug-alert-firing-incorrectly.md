---
type: synthesis
category: synthesis
para: resource
tags: [debugging, alerting, observability, false-positive, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing alerts that fire when nothing is wrong, or fail to fire when something is.
---

# Debug: Alert Firing Incorrectly

**Symptom:** Alert fires but the system is healthy. Or the system is clearly broken but no alert fired. On-call woken for nothing, or incident missed entirely.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Alert fires during deploys only | Threshold too tight — catches transient deploy spike |
| Alert fires then self-resolves | No evaluation window — single data point triggering alert |
| Alert never fires despite visible errors | Threshold too high, wrong metric, or alert not routing correctly |
| Alert fires for one user, not all | Aggregate metric masking per-customer degradation |
| Alert storm — everything fires at once | Cascading dependency failure triggering every downstream alert |

---

## Likely Causes (ranked by frequency)

1. Threshold set without a baseline — guessed value, not derived from historical data
2. No evaluation window — alert fires on a single spike instead of sustained condition
3. Wrong metric — measuring the wrong thing; latency alert on a queue-based system misses backlog
4. Alert routes to wrong channel or is silenced
5. Aggregate hides individual failure — p50 healthy while p99 is on fire

---

## First Checks (fastest signal first)

- [ ] Check the alert condition — what metric, what threshold, what evaluation window?
- [ ] Check historical baseline — is the threshold above or below normal operating values?
- [ ] Confirm the alert is routing correctly — does it reach the right channel and the right person?
- [ ] Check the evaluation window — is it 1 minute, 5 minutes? A single data point alert is noise
- [ ] Check whether p99 and p50 diverge — aggregate metrics hiding tail degradation

**Signal example:** Error rate alert fires every Tuesday morning — deploy happens Tuesday at 9am; during rolling restart, error rate briefly spikes to 2%; threshold is 1%; evaluation window is 1 minute with no minimum duration; alert fires on a transient deploy spike.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Alert threshold and evaluation design | [[cs-fundamentals/observability-se]] |
| Metrics and SLO configuration | [[cloud/cloud-monitoring]] |
| Observability stack setup | [[cloud/observability-stack]] |
| Reducing alert fatigue | [[observability/tracing]] |

---

## Fix Patterns

- Set thresholds from historical data — use p99 of normal operating baseline plus a buffer, not a round number
- Add a minimum duration — alert only if the condition persists for 5 minutes, not a single data point
- Use p99 not p50 for latency alerts — p50 can be healthy while users are experiencing failures
- Add a burn rate alert for SLOs — measures how fast you are consuming the error budget, not just the current error rate
- Silence alerts during deploys with a maintenance window — do not wake on-call for known transients

---

## When This Is Not the Issue

If the alert threshold and routing are correct but alerts are still noisy:

- The system genuinely is degraded during those periods — investigate whether the transient is acceptable or should be fixed
- Check whether the metric has a known collection lag — alerting on a metric that arrives late creates phantom delays

Pivot to [[cs-fundamentals/observability-se]] to redesign the alerting strategy around SLOs and error budgets rather than raw metric thresholds.

---

## Connections

[[cs-fundamentals/observability-se]] · [[cloud/cloud-monitoring]] · [[cloud/observability-stack]] · [[observability/tracing]]

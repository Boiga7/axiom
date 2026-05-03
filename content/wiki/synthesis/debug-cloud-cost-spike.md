---
type: synthesis
category: synthesis
para: resource
tags: [debugging, cost, cloud, aws, finops, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing unexpected cloud bill spikes and identifying the source of runaway spend.
---

# Debug: Cloud Cost Spike

**Symptom:** Cloud bill significantly higher than expected. Cost spike appeared this month. Usage looks normal but spend is not.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Spike on a specific service | New resource created, autoscaling triggered, or data transfer increase |
| Gradual increase over weeks | Resource created and forgotten, or traffic growing without scaling policy |
| Spike on data transfer | Cross-AZ traffic, NAT Gateway processing, or unexpected egress |
| Spike after a deploy | New feature making expensive API calls or spawning resources |
| Spike on storage | Log retention, S3 versioning accumulating, or snapshots not expiring |

---

## Likely Causes (ranked by frequency)

1. NAT Gateway data processing — private subnet traffic not using VPC endpoints
2. Cross-AZ data transfer — services in different AZs calling each other at high frequency
3. Autoscaling triggered and not scaled back — peak load scaled up, minimum not reset
4. Forgotten resource — dev environment, load test cluster, or snapshot left running
5. LLM API costs — token usage growing unboundedly without cost controls

---

## First Checks (fastest signal first)

- [ ] Open Cost Explorer grouped by service — which service changed most vs the previous period?
- [ ] Filter to the spike date — what was created, scaled, or changed on that day?
- [ ] Check data transfer costs specifically — NAT Gateway and cross-AZ transfer are the most common hidden costs
- [ ] Check for resources with no tags — untagged resources are often forgotten ones
- [ ] Check LLM API usage if applicable — token costs grow non-linearly with conversation length

**Signal example:** AWS bill up $800 this month — Cost Explorer shows EC2 data transfer $600 higher; a new microservice is calling an internal API across AZs on every request; 50M calls/month at $0.01/GB adds up fast.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| NAT Gateway and VPC endpoint costs | [[cloud/vpc-design-patterns]] |
| Autoscaling and right-sizing | [[cloud/finops-cost-management]] |
| FinOps tooling and tagging strategy | [[cloud/finops-cost-management]] |
| LLM token cost monitoring | [[observability/langfuse]] |
| Identifying idle resources | [[cloud/finops-cost-management]] |

---

## Fix Patterns

- Add VPC endpoints for S3 and DynamoDB immediately — free gateway endpoints eliminate NAT charges for those services
- Set resource tagging policy — every resource must have `environment`, `team`, `service` tags; untagged = under review
- Set autoscaling minimum back to baseline after load events — scale up is automatic, scale down is not always
- Add budget alerts at 80% and 100% of expected spend — catch spikes before the bill arrives
- For LLM costs: set hard token limits per request and per user session; monitor cost per conversation in Langfuse

---

## When This Is Not the Issue

If costs are rising but no specific service is spiking:

- Usage has genuinely grown — the system is working as designed but traffic has increased
- Check whether Savings Plans or Reserved Instances have expired — same usage, higher on-demand cost

Pivot to [[cloud/finops-cost-management]] for a systematic approach to ongoing cost governance rather than reactive spike investigation.

---

## Connections

[[cloud/finops-cost-management]] · [[cloud/finops-cost-management]] · [[cloud/vpc-design-patterns]] · [[observability/langfuse]]

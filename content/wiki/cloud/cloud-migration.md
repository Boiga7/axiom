---
type: concept
category: cloud
para: resource
tags: [migration, 6rs, lift-and-shift, re-architect, migration-hub, wave-planning, tcl]
sources: []
updated: 2026-05-01
tldr: "Planning and executing workload migrations to AWS: the 6 Rs, wave planning, and the tools that make it work."
---

# Cloud Migration

Planning and executing workload migrations to AWS: the 6 Rs, wave planning, and the tools that make it work.

---

## The 6 Rs of Migration

```
Retire       — Decommission. 10-20% of portfolios are redundant or unused.
               Identify by usage analytics; avoid migrating what you'll delete.

Retain        — Keep on-premises for now. Regulatory, latency, or cost reasons.
               Revisit in 12-24 months. Don't migrate everything at once.

Rehost        — "Lift and Shift". Move the VM or container as-is to EC2 or ECS.
               Fastest migration path. Little or no code changes.
               Good for: legacy apps with stable workloads, tight deadlines.
               Risk: you keep old costs patterns; no cloud-native benefits yet.

Replatform    — "Lift, Tinker, and Shift". Small optimisations without redesign.
               Examples: RDS instead of self-managed MySQL on EC2;
                         S3 for file storage instead of local disk;
                         ECS/Fargate instead of running Docker on EC2 yourself.
               Good for: getting partial cloud-native benefits quickly.

Repurchase    — Replace with a SaaS product.
               Examples: Salesforce, ServiceNow, Workday, Shopify.
               Good for: commodity functions not worth migrating (HR, CRM).

Re-architect  — Redesign for the cloud. Microservices, serverless, managed services.
               Highest effort. Highest long-term ROI.
               Good for: competitive differentiators, high-growth workloads.
               Risk: underestimate complexity; budget for 2-3× the estimate.
```

---

## Migration Decision Matrix

```
Low business value + easy to migrate    → Retire or Rehost (populate cloud footprint)
Low business value + hard to migrate    → Retain until natural end-of-life
High business value + easy to migrate   → Replatform (quick wins with cloud benefits)
High business value + hard to migrate   → Re-architect (invest in the right foundations)

Start with Rehost to build capability, then Re-architect as the team matures.
Never start with Re-architect for a large portfolio — too risky.
```

---

## Wave Planning

```
Migrate in waves of 10-30 workloads, not all at once.

Wave 0: Foundation
  - Landing zone (AWS Control Tower)
  - Networking (Transit Gateway, VPN/Direct Connect)
  - Security baseline (SCPs, GuardDuty, CloudTrail)
  - Identity federation (IAM Identity Center)
  - Cost governance (AWS Budgets, tagging SCP)

Wave 1: Low-risk pilots
  - Non-production workloads, dev environments
  - Simple stateless apps
  - Build team confidence and runbooks
  - Validate networking, IAM, and tooling

Wave 2: Business-critical secondary systems
  - Reporting, analytics, batch jobs
  - May have some state (RDS migrations with DMS)

Wave 3: Revenue-critical systems
  - eCommerce, payments, APIs
  - Blue-green switchover, DNS cutover, rollback plan rehearsed

Wave 4: Complex legacy (if re-architecting)
  - Monolith decomposition, mainframe offload
  - Runs in parallel with Wave 3 delivery

Between each wave: retrospective, cost review, security assessment.
```

---

## AWS Migration Hub

```bash
# Migration Hub tracks all migrations in one place — discovery → migration → tracking

# 1. Discovery: AWS Application Discovery Service
aws discovery start-data-collection-by-agent-ids --agent-ids agent-1234

# 2. Import discovered servers into Migration Hub
aws migrationhub import-migration-task \
  --progress-update-stream "MyMigrationStream" \
  --migration-task-name "web-server-01"

# 3. Update task status as you progress
aws migrationhub notify-migration-task-state \
  --progress-update-stream "MyMigrationStream" \
  --migration-task-name "web-server-01" \
  --task '{"Status":"IN_PROGRESS","ProgressPercent":50,"StatusDetail":"Replicating data"}'

# 4. Mark complete
aws migrationhub notify-migration-task-state \
  --progress-update-stream "MyMigrationStream" \
  --migration-task-name "web-server-01" \
  --task '{"Status":"COMPLETED"}'
```

---

## Database Migration with DMS

```python
# AWS Database Migration Service — continuous replication until cutover

# Typical pattern for zero-downtime DB migration:
#   1. DMS full load: copies existing data to target (hours/days for large DBs)
#   2. DMS CDC: change data capture keeps target in sync with source in real-time
#   3. Validation: DMS data validator confirms row counts and checksums
#   4. Cutover window: stop writes to source, wait for CDC to catch up, cut DNS
#   5. Rollback: DMS can replicate back to source if needed

import boto3

dms = boto3.client("dms", region_name="eu-west-1")

# Create replication task
task = dms.create_replication_task(
    ReplicationTaskIdentifier="postgres-to-aurora",
    SourceEndpointArn="arn:aws:dms:eu-west-1:123:endpoint:SOURCE",
    TargetEndpointArn="arn:aws:dms:eu-west-1:123:endpoint:TARGET",
    ReplicationInstanceArn="arn:aws:dms:eu-west-1:123:rep:instance",
    MigrationType="full-load-and-cdc",   # full load then change capture
    TableMappings='{"rules": [{"rule-type": "selection", "rule-id": "1", '
                  '"rule-name": "select-all", "object-locator": '
                  '{"schema-name": "public", "table-name": "%"}, "rule-action": "include"}]}',
    ReplicationTaskSettings='{"TargetMetadata":{"TargetSchema":"public"},'
                            '"FullLoadSettings":{"TargetTablePrepMode":"DROP_AND_CREATE"}}',
)

# Start task
dms.start_replication_task(
    ReplicationTaskArn=task["ReplicationTask"]["ReplicationTaskArn"],
    StartReplicationTaskType="start-replication",
)
```

---

## Migration Runbook Template

```markdown
# Migration Runbook: [Service Name]

## Pre-migration Checklist
- [ ] Stakeholder sign-off obtained
- [ ] Rollback procedure rehearsed
- [ ] Monitoring dashboards created for target environment
- [ ] Support team briefed
- [ ] Maintenance window communicated

## Cutover Steps
| Step | Action | Owner | Duration | Rollback Trigger |
|------|--------|-------|----------|-----------------|
| 1    | Enable maintenance mode | SRE | 2 min | Any step fails |
| 2    | Stop writes to source DB | DBA | 1 min | DMS lag > 0 after 5 min |
| 3    | Wait for DMS CDC lag = 0 | DBA | 0-5 min | Lag non-zero after 10 min |
| 4    | Cut DNS to new endpoint | SRE | 2 min | Error rate > 1% |
| 5    | Verify health checks green | SRE | 5 min | Health check fails |
| 6    | Disable maintenance mode | SRE | 1 min | N/A |
| 7    | Monitor for 30 minutes | SRE | 30 min | Error rate > 0.1% |

## Rollback Procedure
1. Enable maintenance mode on new endpoint
2. Cut DNS back to source endpoint (TTL was already lowered to 60s)
3. Verify health checks on source are green
4. Disable maintenance mode
5. Post-mortem within 24h
```

---

## Common Failure Cases

**DMS CDC lag growing instead of converging before cutover**
Why: The source database is generating transactions faster than the DMS replication instance can apply them to the target, often because the replication instance class is undersized or the target has slow write throughput.
Detect: `CDCLatencySource` and `CDCLatencyTarget` CloudWatch metrics grow monotonically rather than staying near zero; lag exceeds the cutover window.
Fix: Scale up the replication instance class (use compute-optimised: `dms.c5.4xlarge`), reduce write amplification on the target (disable target indexes during full load, re-enable before CDC), and verify source IOPS are not bottlenecked.

**Route 53 DNS cutover not propagating due to long TTL**
Why: The DNS record TTL was not lowered to 60 seconds well before the cutover window; clients cache the old IP for hours after the DNS update.
Detect: Some users still hit the old endpoint minutes or hours after the DNS change; `dig api.myapp.com` from different resolvers returns different IPs.
Fix: Lower the TTL to 60 seconds at least 24 hours before the planned cutover, then change the record; raise the TTL back to normal after the migration is confirmed stable.

**Landing zone SCPs blocking Wave 1 workloads from deploying**
Why: SCPs applied during Wave 0 (region restrictions, tag enforcement, encryption requirements) conflict with legacy app behaviour that the team did not audit before starting Wave 1.
Detect: CloudTrail shows `AccessDenied` events with `ExplicitDeny` from `organizations` principal; the deployment pipeline or app crashes immediately after rehost.
Fix: Run a dry-run using IAM Access Analyzer and the SCP simulator against a sample of the Wave 1 app's required actions before migrating; create SCP exceptions for legacy apps in a transitional OU and tighten them after re-platforming.

**Re-architect underestimated by 2-3x causing wave schedule collapse**
Why: Monolith decomposition or microservices extraction surfaces hidden coupling, missing API contracts, and shared database dependencies that were not visible before work started.
Detect: Re-architect items in a wave are consistently 2-3x over their time estimates; integration tests fail on shared-schema boundaries.
Fix: Apply the strangler fig pattern — wrap the monolith with a thin proxy and migrate one domain at a time rather than a big-bang rewrite; budget explicitly for the dual-write period where both old and new paths are live.

## Connections

[[cloud/cloud-hub]] · [[cloud/aws-core]] · [[cloud/aws-networking-advanced]] · [[cloud/finops-cost-management]] · [[cloud/blue-green-deployment]] · [[cloud/platform-engineering]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?

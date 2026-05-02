---
type: concept
category: cloud
para: resource
tags: [disaster-recovery, rto, rpo, backup, multi-region, business-continuity]
sources: []
updated: 2026-05-01
tldr: Planning and executing recovery from catastrophic failures — region outages, data corruption, ransomware, accidental mass deletion.
---

# Disaster Recovery

Planning and executing recovery from catastrophic failures — region outages, data corruption, ransomware, accidental mass deletion. DR is the gap between "we have backups" and "we can actually recover in time."

---

## RTO and RPO

**RPO (Recovery Point Objective):** Maximum acceptable data loss measured in time. "We can afford to lose at most 1 hour of data." → backup every hour.

**RTO (Recovery Time Objective):** Maximum acceptable downtime. "The service must be back in 4 hours." → DR procedure must complete in 4 hours.

| Strategy | RTO | RPO | Cost |
|---|---|---|---|
| Backup and Restore | Hours–days | Hours | Lowest |
| Pilot Light | Minutes–hours | Minutes | Low |
| Warm Standby | Minutes | Seconds–minutes | Medium |
| Multi-site Active/Active | Seconds | Near zero | Highest |

---

## Backup and Restore

```bash
# RDS: automated backups (PITR) + manual snapshots
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier prod-cluster \
  --db-cluster-snapshot-identifier pre-migration-20260501

# S3: cross-region replication
aws s3api put-bucket-replication \
  --bucket prod-primary \
  --replication-configuration file://replication.json
```

```json
// replication.json
{
  "Role": "arn:aws:iam::123456789:role/S3ReplicationRole",
  "Rules": [
    {
      "Status": "Enabled",
      "Filter": {},
      "Destination": {
        "Bucket": "arn:aws:s3:::prod-dr-replica",
        "StorageClass": "STANDARD_IA"
      },
      "DeleteMarkerReplication": {"Status": "Enabled"}
    }
  ]
}
```

---

## Pilot Light

Minimal standby: core infrastructure (DB replica, AMIs, IaC) exists in DR region but isn't running. On disaster, scale it up.

```bash
# Aurora Global Database — replication lag < 1 second across regions
aws rds create-global-cluster \
  --global-cluster-identifier myapp-global \
  --source-db-cluster-identifier arn:aws:rds:eu-west-1:123456789:cluster:prod-cluster

# Add DR region cluster
aws rds create-db-cluster \
  --db-cluster-identifier prod-dr \
  --global-cluster-identifier myapp-global \
  --engine aurora-postgresql \
  --region eu-central-1

# On failover: promote secondary to primary
aws rds failover-global-cluster \
  --global-cluster-identifier myapp-global \
  --target-db-cluster-identifier arn:aws:rds:eu-central-1:123456789:cluster:prod-dr
```

---

## Route 53 Health-Based Failover

```bash
# Primary record (eu-west-1)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.myapp.com",
        "Type": "A",
        "AliasTarget": {"HostedZoneId": "Z32O12XQLNTSW2", "DNSName": "alb.eu-west-1.elb.amazonaws.com", "EvaluateTargetHealth": true},
        "SetIdentifier": "primary",
        "Failover": "PRIMARY",
        "HealthCheckId": "health-check-id"
      }
    }]
  }'
# Route 53 automatically switches to DR on health check failure
```

---

## Backup Testing (the part most teams skip)

```bash
# Monthly DR drill checklist
# 1. Restore RDS snapshot to test cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier dr-test-restore \
  --snapshot-identifier latest-prod-snapshot \
  --engine aurora-postgresql \
  --region eu-central-1

# 2. Run smoke tests against restored cluster
DATABASE_URL=$(aws rds describe-db-clusters \
  --db-cluster-identifier dr-test-restore \
  --query 'DBClusters[0].Endpoint' --output text)

# 3. Verify row counts and data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders"

# 4. Document actual RTO achieved (not estimated)
# 5. Clean up test resources
aws rds delete-db-cluster --db-cluster-identifier dr-test-restore --skip-final-snapshot
```

---

## EKS Backup with Velero

```bash
# Install Velero with AWS S3 backend
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.config.region=eu-west-1 \
  --set configuration.backupStorageLocation.config.bucket=myapp-k8s-backups \
  --set serviceAccount.server.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::123456789:role/VeleroRole

# Scheduled backup of all namespaces
velero schedule create daily \
  --schedule="0 2 * * *" \
  --ttl 168h \
  --include-cluster-resources=true

# Restore to DR cluster
velero restore create --from-backup production-20260501-020000
```

---

## DR Runbook Template

```markdown
# Disaster Recovery Runbook — [Service Name]

**RTO:** 4 hours | **RPO:** 1 hour

## Detection
- [ ] Alert fired: [alert name]
- [ ] Confirmed outage scope: database / compute / region
- [ ] Incident commander identified: @[name]

## Decision Gate
- [ ] Regional outage confirmed (not a service-level issue)?
  - Yes → proceed to failover
  - No → investigate service-level recovery first

## Failover Steps (target: < 2 hours)
- [ ] Promote Aurora Global Database DR cluster (15 min)
- [ ] Update Route 53 to point at DR region ALB (5 min)
- [ ] Scale up DR region ECS service to production capacity (20 min)
- [ ] Run smoke tests against DR endpoint (10 min)
- [ ] Notify stakeholders of failover completion

## Fallback (return to primary)
- [ ] Primary region healthy (verified by SRE)
- [ ] Re-sync data from DR back to primary
- [ ] Update Route 53 back to primary
- [ ] Scale down DR region
```

---

## Connections
[[cloud-hub]] · [[cloud/cloud-monitoring]] · [[cloud/aws-rds-aurora]] · [[cloud/cloud-security]] · [[cloud/cloud-networking]] · [[cloud/argocd]]

---
type: concept
category: cloud
para: resource
tags: [aws, rds, aurora, postgresql, database, multi-az]
sources: []
updated: 2026-05-01
tldr: Managed relational database services. RDS manages MySQL, PostgreSQL, MariaDB, Oracle, SQL Server.
---

# AWS RDS & Aurora

Managed relational database services. RDS manages MySQL, PostgreSQL, MariaDB, Oracle, SQL Server. Aurora is AWS's cloud-native relational engine with MySQL and PostgreSQL compatibility at 3-5x the throughput.

---

## RDS vs Aurora

| Feature | RDS PostgreSQL | Aurora PostgreSQL |
|---|---|---|
| Storage | EBS, up to 64TB | Distributed, up to 128TB, auto-grows |
| Replication | Streaming (async) | Storage-layer (near-zero lag) |
| Failover | 60–120s (Multi-AZ) | ~30s (Aurora) |
| Read replicas | Up to 5 | Up to 15 |
| Cost | Lower | ~20% more, but higher throughput |
| Serverless | No | Aurora Serverless v2 (per-ACU billing) |

Choose RDS for cost sensitivity or specific engine versions. Choose Aurora for high throughput, fast failover, or Serverless workloads.

---

## Multi-AZ vs Read Replicas

**Multi-AZ** — synchronous standby in a second AZ. Automatic failover on primary failure. No read traffic; purely for HA.

**Read Replicas** — asynchronous copy. Used to scale reads (reports, analytics). Replication lag is the tradeoff. Can be promoted to standalone DB in disaster.

---

## Aurora Architecture

Aurora separates compute from storage. 6 storage copies across 3 AZs; writes require 4/6 quorum, reads require 3/6. Storage auto-repairs corrupted blocks. The writer instance and up to 15 reader instances share the same storage. Readers see writes within milliseconds.

```
Writer Endpoint  →  Primary instance
Reader Endpoint  →  Load-balanced across all replicas
Custom Endpoint  →  Specific replica tier (e.g., larger instances for reporting)
```

---

## Aurora Serverless v2

Scales from 0.5 to 128 ACUs (Aurora Capacity Units) in ~seconds. Billed per ACU-hour.

```python
# boto3 — create Aurora Serverless v2 cluster
import boto3

rds = boto3.client('rds', region_name='eu-west-1')

rds.create_db_cluster(
    DBClusterIdentifier='myapp-cluster',
    Engine='aurora-postgresql',
    EngineVersion='15.4',
    MasterUsername='dbadmin',
    MasterUserPassword='use-secrets-manager',
    ServerlessV2ScalingConfiguration={
        'MinCapacity': 0.5,
        'MaxCapacity': 32,
    },
    DatabaseName='myapp',
    VpcSecurityGroupIds=['sg-xxxxxxxxx'],
    DBSubnetGroupName='my-db-subnet-group',
    StorageEncrypted=True,
)

rds.create_db_instance(
    DBInstanceIdentifier='myapp-writer',
    DBClusterIdentifier='myapp-cluster',
    DBInstanceClass='db.serverless',
    Engine='aurora-postgresql',
)
```

---

## RDS Proxy

Manages connection pooling between application and database. Critical for Lambda workloads (Lambda creates new DB connections per invocation, Proxy prevents connection exhaustion).

```python
# Lambda connecting via RDS Proxy with IAM auth
import boto3, psycopg2

def get_connection():
    token = boto3.client('rds').generate_db_auth_token(
        DBHostname='myapp-proxy.proxy-xxxxx.eu-west-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='lambda_user',
        Region='eu-west-1',
    )
    return psycopg2.connect(
        host='myapp-proxy.proxy-xxxxx.eu-west-1.rds.amazonaws.com',
        port=5432,
        database='myapp',
        user='lambda_user',
        password=token,
        sslmode='require',
    )
```

---

## Parameter Groups

Override engine defaults for performance tuning.

```bash
# Create custom parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name myapp-pg15 \
  --db-parameter-group-family aurora-postgresql15 \
  --description "Tuned for myapp"

# Key PostgreSQL parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name myapp-pg15 \
  --parameters \
    "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory/32768},ApplyMethod=pending-reboot" \
    "ParameterName=work_mem,ParameterValue=65536,ApplyMethod=immediate" \
    "ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot" \
    "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate"
```

---

## Automated Backups and Snapshots

```bash
# Automated backups: 1–35 day retention, PITR (point-in-time recovery)
aws rds modify-db-cluster \
  --db-cluster-identifier myapp-cluster \
  --backup-retention-period 14 \
  --preferred-backup-window "02:00-03:00"

# Manual snapshot before a risky migration
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier myapp-cluster \
  --db-cluster-snapshot-identifier pre-migration-v3

# Restore from snapshot to a new cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier myapp-restored \
  --snapshot-identifier pre-migration-v3 \
  --engine aurora-postgresql
```

---

## Performance Insights

Enable to identify top SQL by load. Free for 7-day history; paid for longer.

```bash
aws rds modify-db-instance \
  --db-instance-identifier myapp-writer \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

---

## Common Failure Cases

**Multi-AZ failover takes longer than expected — app down for 60+ seconds**
Why: the application's connection is cached to the primary endpoint's IP; DNS TTL on the RDS endpoint is 5 seconds but the app's DNS resolver or connection pool caches the old IP.
Detect: failover completes in ~30s but the app reports connection errors for 60-120s; `dig +noall +answer <rds-endpoint>` shows a different IP than the cached one.
Fix: configure the connection pool to use short TCP keepalive and reconnect on failure; never cache the resolved IP address — always re-resolve the DNS name.

**Aurora Serverless v2 scales to max ACU without returning to minimum**
Why: a long-running transaction or an idle connection with an open transaction prevents the serverless instance from scaling down.
Detect: ACU count stays near `MaxCapacity` even during off-hours; CloudWatch `ACUUtilization` is high but `DatabaseConnections` is low.
Fix: set `idle_in_transaction_session_timeout` in the parameter group (e.g., 60000ms) to kill idle-in-transaction sessions; use connection pooling (RDS Proxy) to avoid long-lived idle connections.

**RDS Proxy returns "max connections exceeded" under Lambda burst**
Why: RDS Proxy has its own connection limit (`max_connections_percent` on the target group, default 100%), and if too many Lambda invocations are waiting for a borrow from the pool simultaneously, requests queue or fail.
Detect: Lambda logs show `too many connections` errors even with Proxy; CloudWatch `ProxyMaxConnectionsExceeded` metric rises.
Fix: increase `max_connections_percent` on the Proxy target group up to the DB's actual `max_connections` parameter value, or reduce Lambda concurrency with reserved concurrency.

**Read replica lag causes stale reads**
Why: asynchronous replication means the replica can be seconds (or minutes during write spikes) behind the primary; reads from the reader endpoint return outdated data.
Detect: `SELECT * FROM pg_stat_replication` on Aurora or `SHOW SLAVE STATUS` shows `Seconds_Behind_Master > 0`; CloudWatch `AuroraReplicaLag` metric exceeds your tolerance.
Fix: route time-sensitive reads (e.g., post-write confirmations) to the writer endpoint; use the reader endpoint only for analytics, reports, and other reads where eventual consistency is acceptable.

## Connections
[[cloud-hub]] · [[cloud/secrets-management]] · [[cloud/aws-lambda-patterns]] · [[cloud/cloud-monitoring]] · [[cs-fundamentals/database-design]] · [[cs-fundamentals/caching-strategies]]
## Open Questions

- What monitoring and alerting matter most when this is deployed in production?
- At what scale or workload does this approach hit its practical limits?

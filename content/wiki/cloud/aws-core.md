---
type: concept
category: cloud
para: resource
tags: [aws, cloud, ec2, s3, lambda, rds, ecs, eks, iam, vpc]
sources: []
updated: 2026-05-01
tldr: The foundational services every cloud engineer needs to know. AWS dominates cloud (33% market share, 2026). These ten services underpin the vast majority of production architectures.
---

# AWS Core Services

The foundational services every cloud engineer needs to know. AWS dominates cloud (33% market share, 2026). These ten services underpin the vast majority of production architectures.

---

## Compute

### EC2 — Elastic Compute Cloud
Virtual machines in the cloud. You choose the instance type (CPU/RAM profile), OS, and region.

| Family | Optimised for | Examples |
|--------|--------------|---------|
| General | Balanced CPU/RAM | t3, m6i |
| Compute | High CPU | c6i, c7g |
| Memory | High RAM | r6i, x2iedn |
| GPU | ML training/inference | p4, g5 |
| Arm | Cost efficiency | t4g, m7g (Graviton) |

Key concepts: AMIs (machine images), security groups (stateful firewall), key pairs, EBS-backed vs instance-store, Auto Scaling Groups, placement groups, Spot instances (up to 90% cheaper, interruptible).

### Lambda — Serverless Functions
Event-driven compute. No server management. 15-minute max execution, 10GB RAM cap.

```python
import json

def handler(event, context):
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "hello"})
    }
```

Triggers: API Gateway, S3 events, SQS, DynamoDB streams, EventBridge, SNS, Cognito. Cold start: 100ms–1s (Python/Node faster; Java slower). Use Provisioned Concurrency to eliminate cold starts for latency-sensitive workloads.

### ECS — Elastic Container Service
AWS-native container orchestration. Two launch types:
- **Fargate** — serverless containers, no EC2 management. Pay per vCPU/GB-second.
- **EC2 launch type** — you manage the underlying instances, more control and cheaper at scale.

### EKS — Elastic Kubernetes Service
Managed Kubernetes. AWS manages the control plane. You manage the data plane (worker nodes) or use Fargate for serverless pods. Standard choice for teams that already know Kubernetes or need its ecosystem.

---

## Storage

### S3 — Simple Storage Service
Object storage. 11 nines (99.999999999%) durability. Global namespace.

```bash
# Upload
aws s3 cp file.txt s3://my-bucket/prefix/file.txt

# Sync folder
aws s3 sync ./local-dir s3://my-bucket/prefix/

# Presigned URL (60s expiry)
aws s3 presign s3://my-bucket/file.txt --expires-in 60
```

Storage classes: Standard → Standard-IA (infrequent access) → Glacier Instant → Glacier Flexible → Deep Archive. Use Lifecycle policies to auto-transition. S3 Intelligent-Tiering for unpredictable access patterns.

### EBS — Elastic Block Store
Block storage attached to a single EC2 instance. Like a persistent hard drive.

Types: gp3 (general, 16,000 IOPS), io2 Block Express (high-performance databases, 256,000 IOPS), st1 (throughput HDD for big data), sc1 (cold HDD for archival).

---

## Database

### RDS — Relational Database Service
Managed relational DB. Engines: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server. Handles backups, patching, Multi-AZ failover, and read replicas automatically.

Use **Aurora** (AWS-native, MySQL/PostgreSQL compatible) for 5× MySQL performance and Aurora Serverless v2 for auto-scaling to zero.

### DynamoDB
Managed NoSQL (key-value + document). Single-digit millisecond latency at any scale. Provisioned or on-demand capacity. Global tables for multi-region active-active.

---

## Networking

### VPC — Virtual Private Cloud
Logically isolated network in AWS. Every account gets a default VPC per region.

```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)  → Internet Gateway
├── Private Subnet (10.0.2.0/24) → NAT Gateway (outbound only)
└── Isolated Subnet (10.0.3.0/24) → No internet access
```

Key components: Internet Gateway (public access), NAT Gateway (private subnets outbound), Security Groups (stateful, instance-level), NACLs (stateless, subnet-level), Route Tables, VPC Peering, Transit Gateway (hub-and-spoke for many VPCs).

### Route 53
Managed DNS + health checking + routing policies (latency, geolocation, weighted, failover).

### ALB / NLB
- **ALB** (Application Load Balancer) — Layer 7, HTTP/HTTPS, path-based routing, WebSocket support
- **NLB** (Network Load Balancer) — Layer 4, TCP/UDP, ultra-low latency, static IPs

---

## Security and Identity

### IAM — Identity and Access Management
Controls who (identity) can do what (action) on which resource (resource).

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

Concepts: Users, Groups, Roles (assumed by services or federated users), Policies (JSON documents). Use Roles, never long-lived access keys for applications. Enable MFA for all human users. Follow least privilege.

### KMS — Key Management Service
Managed encryption keys. Used by S3 (SSE-KMS), RDS, EBS, Secrets Manager. Customer-managed keys for compliance requirements.

### Secrets Manager
Store and auto-rotate database credentials, API keys, and other secrets. Integrates with RDS for automatic password rotation. Access via SDK:

```python
import boto3, json

client = boto3.client("secretsmanager", region_name="eu-west-1")
secret = json.loads(client.get_secret_value(SecretId="prod/db")["SecretString"])
```

---

## Developer Tools

### CloudWatch
Logs, metrics, alarms, dashboards. Every AWS service emits metrics. Log Insights for ad-hoc queries across log groups. Set alarms on p99 latency, error rate, queue depth.

### CloudFormation / CDK
IaC. CloudFormation uses JSON/YAML; CDK uses TypeScript/Python/Java to generate CloudFormation. Prefer CDK for new projects — see [[cloud/aws-cdk]].

---

## Key CLI Commands

```bash
# Auth
aws configure                         # set keys + region
aws sts get-caller-identity           # verify who you are

# EC2
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"

# S3
aws s3 ls s3://my-bucket --recursive --human-readable

# Lambda
aws lambda invoke --function-name my-fn out.json && cat out.json

# ECS
aws ecs list-tasks --cluster my-cluster
aws ecs describe-tasks --cluster my-cluster --tasks <task-arn>
```

---

## Connections

- [[cloud/terraform]] — IaC for provisioning AWS resources declaratively
- [[cloud/aws-cdk]] — code-first IaC, generates CloudFormation
- [[cloud/kubernetes]] — EKS is the AWS-managed K8s control plane
- [[cloud/secrets-management]] — AWS Secrets Manager in depth
- [[cloud/cloud-monitoring]] — CloudWatch in depth
- [[cloud/cloud-networking]] — VPC design patterns in depth
- [[infra/cloud-platforms]] — AWS vs GCP vs Azure comparison

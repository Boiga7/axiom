---
type: concept
category: landscape
para: resource
tags: [aws, certification, solutions-architect, saa-c03, architecture]
tldr: AWS Certified Solutions Architect Associate (SAA-C03) — 5 domains covering resilient, high-performing, secure, cost-optimised, and operationally excellent architectures on AWS.
sources: []
updated: 2026-05-04
---

# AWS Certified Solutions Architect — Associate (SAA-C03)

The SAA-C03 is the most widely held AWS certification. It validates the ability to design distributed systems on AWS across five architecture domains. It is an associate-level exam requiring roughly 1 year of hands-on AWS experience and is the natural next step after [[landscape/aws-cloud-practitioner]].

---

## Exam Format

| Attribute | Detail |
|---|---|
| Questions | 65 total (50 scored + 15 unscored pilot) |
| Question types | Multiple choice, multiple response |
| Time | 130 minutes |
| Passing score | 720 out of 1,000 (scaled) |
| Cost | $150 USD |
| Recommended experience | 1+ year hands-on AWS experience across a variety of services |

---

## Domain Weightings

| Domain | Title | Weight |
|---|---|---|
| 1 | Design Resilient Architectures | 30% |
| 2 | Design High-Performing Architectures | 28% |
| 3 | Design Secure Architectures | 24% |
| 4 | Design Cost-Optimised Architectures | 18% |

Domains 1 and 2 together account for 58% of the exam. Resiliency and performance are the primary focus areas.

---

## Domain 1: Design Resilient Architectures (30%)

Core themes: multi-AZ deployments, decoupled architectures, managed services over self-managed, automatic failover. Key services: Elastic Load Balancing, Auto Scaling, RDS Multi-AZ, S3 (11-nines durability), SQS (decoupling), Route 53 failover routing, AWS Backup, Elastic Disaster Recovery.

Key patterns: active-active vs active-passive failover, event-driven decoupling with SQS/SNS, stateless application design to enable horizontal scaling, loose coupling to prevent cascading failures.

---

## Domain 2: Design High-Performing Architectures (28%)

Core themes: choosing the right compute, storage, database, and network service for the workload characteristics. Key services: EC2 instance families (compute-optimised for CPU-bound, memory-optimised for large datasets), ElastiCache (sub-millisecond caching), CloudFront (CDN for static and dynamic content), DynamoDB (single-digit ms at any scale), Aurora (up to 5x faster than MySQL, 15 read replicas).

Key patterns: caching at multiple layers (CloudFront, ElastiCache, DAX for DynamoDB), read replicas for read-heavy workloads, SQS-based fan-out for workload parallelism, S3 multipart upload for large objects.

---

## Domain 3: Design Secure Architectures (24%)

Core themes: least privilege IAM, network isolation with VPC, encryption at rest and in transit, secrets management, threat detection. Key services: IAM roles and policies, VPC private subnets, security groups, NACLs, AWS KMS, AWS Secrets Manager, AWS Certificate Manager, GuardDuty, Shield, WAF.

Key patterns: never use root account for operations, grant roles not users for EC2 and Lambda, VPC endpoints to keep traffic off public internet, private subnets for databases and internal services.

---

## Domain 4: Design Cost-Optimised Architectures (18%)

Core themes: choose the right pricing model for the workload, avoid waste, use managed services to reduce operational overhead. Key services: EC2 Spot Instances (up to 90% savings for fault-tolerant workloads), Reserved Instances/Savings Plans (steady-state workloads), S3 Intelligent-Tiering, Compute Optimizer, Cost Explorer.

Key patterns: Spot for batch and CI workloads, Reserved/Savings Plan for predictable production workloads, S3 lifecycle policies to move data to cheaper tiers, rightsizing before committing to Reserved Instances.

---

## Connections

- [[landscape/aws-cloud-practitioner]] — foundational AWS certification; the prerequisite conceptual layer
- [[cloud/aws-bedrock-agentcore]] — Bedrock and AI-specific AWS architecture patterns
- [[infra/vector-stores]] — database selection for AI workloads covered under Domain 2

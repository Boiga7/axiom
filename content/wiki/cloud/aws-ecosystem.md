---
type: concept
category: cloud
para: resource
tags: [aws, cloud, ecosystem, sagemaker, bedrock, lambda, s3, cloudwatch]
tldr: Overview of the AWS service ecosystem for AI practitioners — compute, storage, AI/ML, observability, and security services.
sources: []
updated: 2026-05-04
---

# AWS Service Ecosystem

The AWS service ecosystem is the broadest cloud platform available, with 200+ services across compute, storage, databases, networking, AI/ML, security, and observability. For AI practitioners, a working knowledge of the core services and how they integrate is a prerequisite for designing, deploying, and monitoring AI workloads.

---

## Core Services for AI Workloads

**Compute:** Amazon EC2 (virtual machines), AWS Lambda (serverless functions, used as Bedrock Agent Action Groups), Amazon ECS/EKS (containers). EC2 GPU instances (P-family, G-family, Inf-family) host training and inference workloads. Lambda is the default orchestration layer for event-driven agentic pipelines.

**Storage:** Amazon S3 is the universal data store — training datasets, model artefacts, evaluation results, Bedrock Knowledge Base documents. Amazon EFS provides shared file storage across compute nodes during distributed training.

**AI/ML:** Amazon SageMaker is the end-to-end ML platform. Amazon Bedrock provides managed access to foundation models (Claude, Llama, Titan) without infrastructure. Amazon Q provides pre-built AI assistants for enterprise and developer use cases.

**Databases:** Amazon RDS (relational), Amazon DynamoDB (key-value/document), Amazon Aurora PostgreSQL with pgvector (vector store for Bedrock Knowledge Bases), Amazon OpenSearch Serverless (default Bedrock vector store).

**Observability:** Amazon CloudWatch collects metrics, logs, and events. AWS CloudTrail records all API calls. Amazon X-Ray provides distributed tracing. Bedrock invocation logging sends prompt/response pairs to CloudWatch or S3 for audit.

**Security:** AWS IAM controls access at every layer. AWS KMS manages encryption keys. Amazon GuardDuty provides threat detection. Amazon Macie detects PII in S3 data.

---

## AWS Shared Responsibility Model

AWS is responsible for security *of* the cloud (physical infrastructure, hypervisor, managed service availability). Customers are responsible for security *in* the cloud (IAM configuration, encryption choices, application code, data governance).

The boundary shifts based on service type: EC2 (IaaS) requires customer OS patching; RDS (managed PaaS) transfers OS and engine patching to AWS; Lambda (serverless) transfers runtime management entirely to AWS.

---

## Connections

- [[landscape/aws-ai-practitioner]] — AIF-C01 certification covering AWS AI/ML services in depth
- [[cloud/aws-bedrock-agentcore]] — Bedrock AgentCore, the managed agentic runtime on AWS
- [[infra/vector-stores]] — vector store options including Aurora pgvector and OpenSearch
- [[apis/anthropic-api]] — Claude API patterns that run on Bedrock

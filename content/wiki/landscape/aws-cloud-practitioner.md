---
type: concept
category: landscape
para: resource
tags: [aws, certification, cloud-practitioner, clf-c02]
sources: []
updated: 2026-05-03
tldr: AWS Certified Cloud Practitioner (CLF-C02) — all 4 domains, key services, concepts and exam approach
---

# AWS Certified Cloud Practitioner (CLF-C02)

Foundational AWS certification. No prerequisites. Validates broad cloud knowledge across all four domains: cloud concepts, security, technology/services, and billing.

**Official exam guide:** https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html

---

## Exam Format

| Attribute | Detail |
|---|---|
| Questions | 65 total (50 scored + 15 unscored pilot questions) |
| Question types | Multiple choice (1 correct of 4) and multiple response (2+ correct of 5+) |
| Time | 90 minutes |
| Passing score | 700 out of 1,000 (scaled) |
| Cost | $100 USD |
| Delivery | Pearson VUE test centre or online proctoring |
| Scoring model | Compensatory — no per-section minimum, only overall pass |
| Recommended experience | Up to 6 months exposure to AWS Cloud design, implementation, or operations |

Unscored questions are not flagged during the exam. Unanswered questions count as wrong — guess rather than skip.

---

## Domain Weightings

| Domain | Weight |
|---|---|
| Domain 1: Cloud Concepts | 24% (~12 questions) |
| Domain 2: Security and Compliance | 30% (~15 questions) |
| Domain 3: Cloud Technology and Services | 34% (~17 questions) |
| Domain 4: Billing, Pricing, and Support | 12% (~6 questions) |

Security and Technology together make up 64% of the exam. Prioritise those two domains.

---

## Domain 1: Cloud Concepts (24%)

### Task Statement 1.1 — Define the benefits of the AWS Cloud

**Knowledge of:**
- Value proposition of the AWS Cloud

**Skills:**
- Understanding the benefits of global infrastructure (speed of deployment, global reach)
- Understanding the advantages of high availability, elasticity, and agility

**Key concepts:**

| Benefit | Meaning |
|---|---|
| Trade capital expense for variable expense | Pay only for what you use, no upfront hardware investment |
| Benefit from massive economies of scale | AWS buys at huge scale and passes savings on |
| Stop guessing capacity | Scale up or down on demand |
| Increase speed and agility | Launch resources in minutes, not weeks |
| Stop spending money on data centres | Focus on business differentiation |
| Go global in minutes | Deploy in multiple Regions instantly |

The six traditional "advantages of cloud computing" are a common exam topic.

---

### Task Statement 1.2 — Identify design principles of the AWS Cloud

**Knowledge of:**
- AWS Well-Architected Framework

**Skills:**
- Understanding the six pillars
- Identifying differences between the pillars

**The Six Pillars of the Well-Architected Framework:**

| Pillar | Core concern | Design principle example |
|---|---|---|
| Operational Excellence | Run and monitor systems; continuously improve | Perform operations as code; make small, reversible changes |
| Security | Protect data and systems | Implement a strong identity foundation; apply security at all layers |
| Reliability | Recover from failures; meet demand | Automatically recover from failure; scale horizontally |
| Performance Efficiency | Use resources efficiently as demand changes | Use serverless architectures; go global in minutes |
| Cost Optimization | Avoid unnecessary costs | Implement cloud financial management; use consumption models |
| Sustainability | Minimise environmental impact | Maximise utilisation; use managed services to reduce infrastructure footprint |

The exam asks you to match a scenario to the correct pillar. Sustainability was added in 2021 — know all six.

**AWS Well-Architected Tool** — free service that reviews your architecture against the framework and produces a report of identified issues.

---

### Task Statement 1.3 — Understand migration strategies and the AWS Cloud Adoption Framework

**Knowledge of:**
- Cloud adoption strategies
- Resources to support the migration journey

**Skills:**
- Understanding AWS CAF components
- Identifying appropriate migration strategies (database replication, AWS Snowball)

**AWS Cloud Adoption Framework (AWS CAF) — 6 Perspectives:**

| Perspective | Focus | Who owns it |
|---|---|---|
| Business | Aligns cloud investments with business outcomes | CFO, CEO, COO |
| People | Culture change, skills, organisational readiness | HR, Learning & Development |
| Governance | Orchestrate cloud initiatives; manage risk | CIO, Enterprise Architects |
| Platform | Build a scalable hybrid cloud platform; modernise workloads | CTO, Architects |
| Security | Confidentiality, integrity, and availability of data and workloads | CISO, Security teams |
| Operations | Ensure cloud services meet business needs | IT Operations, Site Reliability |

CAF outcomes: reduced business risk; improved ESG (environmental, social, governance) performance; increased revenue; increased operational efficiency.

**The 7 Rs of Migration:**

| Strategy | Also called | Description |
|---|---|---|
| Rehost | Lift and shift | Move as-is to the cloud — no code changes |
| Replatform | Lift and reshape | Minor optimisations (e.g. move to managed DB) without changing core architecture |
| Refactor | Re-architect | Redesign using cloud-native features; highest effort, highest benefit |
| Repurchase | Drop and shop | Move to a SaaS product (e.g. move CRM to Salesforce) |
| Retire | — | Decommission applications that are no longer needed |
| Retain | Revisit | Keep on-premises; revisit later |
| Relocate | Hypervisor lift and shift | Move VMware workloads to VMware Cloud on AWS |

**AWS Snow Family** (data migration for large volumes or limited bandwidth):
- **AWS Snowcone** — smallest, 8 TB usable storage, portable
- **AWS Snowball Edge** — 80 TB usable, compute + storage
- **AWS Snowmobile** — exabyte-scale, physical truck

---

### Task Statement 1.4 — Understand concepts of cloud economics

**Knowledge of:**
- Aspects of cloud economics
- Cost savings of moving to the cloud

**Skills:**
- Fixed costs vs variable costs
- On-premises associated costs
- Licensing strategies (BYOL vs included)
- Rightsizing
- Benefits of automation
- Economies of scale

**Key concepts:**
- **Fixed costs (CapEx):** Upfront hardware, data centre space, maintenance contracts — paid regardless of usage.
- **Variable costs (OpEx):** Cloud spending — scales with actual consumption.
- **Rightsizing:** Matching instance type and size to actual workload requirements before committing to Reserved Instances.
- **BYOL (Bring Your Own Licence):** Use existing software licences on AWS (common for Windows Server, SQL Server on Dedicated Hosts).
- **Total Cost of Ownership (TCO):** Include hardware, software licences, facilities, IT staff, and opportunity cost when comparing on-premises vs cloud.
- **Economies of scale:** AWS purchases compute and networking at global scale, reducing per-unit cost vs self-managed infrastructure.
- **Automation benefit:** Automated provisioning and tear-down eliminates idle resource costs.

---

## Domain 2: Security and Compliance (30%)

### Task Statement 2.1 — Understand the AWS shared responsibility model

**Knowledge of:**
- AWS shared responsibility model

**Skills:**
- Recognising the model's components
- Describing customer responsibilities
- Describing AWS responsibilities
- Describing shared responsibilities
- Understanding how responsibilities shift by service type (EC2, RDS, Lambda)

**The model in one sentence:** AWS is responsible for security *of* the cloud (the infrastructure); you are responsible for security *in* the cloud (what you build and configure).

**AWS responsibilities (security OF the cloud):**
- Physical data centre security (buildings, power, cooling, hardware)
- Host operating system and virtualisation layer
- Managed service runtime environments (e.g. the RDS database engine)
- Global network infrastructure (Regions, AZs, edge locations)
- Hardware lifecycle and disposal

**Customer responsibilities (security IN the cloud):**
- Customer data (encryption, access, classification)
- Identity and access management (IAM users, roles, policies)
- Operating system patches on EC2 instances
- Application-layer security
- Network configuration (security groups, NACLs)
- Client-side and server-side encryption choices

**How responsibility shifts by service:**

| Service | Service type | Customer OS responsibility | Customer data responsibility |
|---|---|---|---|
| Amazon EC2 | IaaS | Full (patches, config) | Full |
| Amazon RDS | Managed/PaaS | None (AWS patches DB engine) | Full (data, access control) |
| AWS Lambda | Serverless/FaaS | None (AWS manages runtime) | Full (function code, data) |

The higher up the managed stack, the more AWS takes on. This is a high-frequency exam topic.

**Shared controls (both AWS and customer):**
- Patch management (AWS patches infrastructure; customer patches guest OS and apps)
- Configuration management (AWS configures its infrastructure; customer configures their applications)
- Awareness and training (each party trains their own people)

---

### Task Statement 2.2 — AWS Cloud security, governance, and compliance

**Knowledge of:**
- AWS compliance and governance concepts
- Benefits of cloud security (encryption)
- Where to capture and locate logs

**Skills:**
- Finding AWS compliance information (AWS Artifact)
- Securing resources (Inspector, Security Hub, GuardDuty, Shield)
- Encryption options (in transit, at rest)
- Governance services (CloudWatch, CloudTrail, Audit Manager, Config)

**Key services:**

| Service | What it does |
|---|---|
| **AWS Artifact** | Self-service portal for AWS compliance reports and agreements (SOC, PCI, ISO) |
| **Amazon GuardDuty** | Threat detection using ML — analyses CloudTrail, VPC Flow Logs, DNS logs |
| **Amazon Inspector** | Automated vulnerability assessment for EC2 and container images |
| **AWS Security Hub** | Centralised security findings dashboard across multiple security services |
| **AWS Shield Standard** | Always-on DDoS protection for all AWS customers at no extra cost |
| **AWS Shield Advanced** | Enhanced DDoS protection with 24/7 DRT access; paid add-on |
| **AWS WAF** | Web Application Firewall — rules for HTTP/HTTPS traffic (SQL injection, XSS) |
| **Amazon Macie** | Uses ML to discover and protect sensitive data in S3 (PII, financial data) |
| **Amazon Detective** | Investigates security issues and root cause analysis using graph models |
| **AWS CloudTrail** | Records API calls across your AWS account — "who did what, when, from where" |
| **AWS Config** | Records and evaluates resource configurations against compliance rules over time |
| **AWS Audit Manager** | Automates evidence collection for audits (SOC 2, HIPAA, GDPR) |
| **Amazon CloudWatch** | Metrics, logs, alarms, dashboards — operational monitoring |

**Encryption:**
- **Encryption in transit:** TLS/SSL protects data moving between services or to clients.
- **Encryption at rest:** Data encrypted on disk (S3 SSE, EBS encryption, RDS encryption).
- **AWS KMS (Key Management Service):** Create and control encryption keys. Integrates with most AWS storage services.
- **AWS CloudHSM:** Dedicated hardware security module — customer controls keys, not AWS.
- **AWS Certificate Manager (ACM):** Provisions and manages SSL/TLS certificates for use with AWS services.

---

### Task Statement 2.3 — AWS access management capabilities

**Knowledge of:**
- IAM
- Protecting the root user
- Principle of least privilege
- AWS IAM Identity Center (SSO)

**Skills:**
- Access keys, password policies, credential storage
- Authentication methods (MFA, IAM Identity Center, cross-account roles)
- Groups, users, custom and managed policies
- Tasks only root can perform
- Root user protection methods
- Types of identity management (federated)

**IAM core concepts:**

| Concept | Description |
|---|---|
| Root user | Full account access; used only for initial setup and specific tasks; never used day-to-day |
| IAM user | Long-term identity for a person or service; has credentials |
| IAM group | Collection of users — attach policies to the group, not individual users |
| IAM role | Temporary identity assumed by users, services, or applications — no long-term credentials |
| IAM policy | JSON document granting or denying permissions; attached to users, groups, or roles |
| Managed policy | AWS-owned (AWS managed) or customer-owned (customer managed) reusable policy |
| Inline policy | Embedded directly in a single user, group, or role; not reusable |

**Principle of least privilege:** Grant only the minimum permissions required to perform a task.

**Root user tasks only (cannot delegate to IAM):**
- Change account root email or password
- Close the AWS account
- Activate IAM access to Billing Console
- Restore IAM permissions if locked out
- Change AWS Support plan
- Register as seller in AWS Marketplace

**Protect root user:** Enable MFA immediately. Never create access keys for root.

**Authentication methods:**
- **MFA (Multi-Factor Authentication):** Virtual MFA (Authenticator app), hardware TOTP token, FIDO security key.
- **AWS IAM Identity Center (formerly SSO):** Centralised access management across multiple AWS accounts and applications; supports SAML 2.0 federation.
- **Federated identity:** Use existing corporate identities (Active Directory, Okta) to access AWS via SAML 2.0 or OIDC.

**Credential storage:**
- **AWS Secrets Manager:** Stores and rotates secrets (DB credentials, API keys) automatically.
- **AWS Systems Manager Parameter Store:** Stores configuration data and secrets; simpler than Secrets Manager, no auto-rotation built in.

---

### Task Statement 2.4 — Components and resources for security

**Knowledge of:**
- AWS security capabilities
- Security-related documentation

**Skills:**
- AWS security features (WAF, Firewall Manager, Shield, GuardDuty)
- Third-party products in AWS Marketplace
- Where to find security information (Knowledge Center, Security Center, Security Blog)
- Using Trusted Advisor for security issues

**AWS Firewall Manager:** Centrally configure and manage AWS WAF rules, Shield Advanced, security groups, and Network Firewall policies across multiple accounts in AWS Organizations.

**AWS Trusted Advisor:** Automated recommendations across five categories: Cost Optimization, Performance, Security, Fault Tolerance, and Service Limits. Free tier includes core security checks (MFA on root, unrestricted S3 buckets, open security groups).

**Where to find security resources:**
- AWS Security Center (https://aws.amazon.com/security/)
- AWS Security Blog
- AWS Knowledge Center (FAQ-style troubleshooting)
- AWS re:Post (community Q&A, replaces AWS Forums)
- AWS Whitepapers (Security Best Practices, etc.)

---

## Domain 3: Cloud Technology and Services (34%)

### Task Statement 3.1 — Methods of deploying and operating in the AWS Cloud

**Knowledge of:**
- Ways of provisioning and operating in AWS
- Ways to access AWS services
- Types of cloud deployment models

**Skills:**
- Programmatic access (APIs, SDKs, CLI) vs AWS Management Console vs IaC
- One-time vs repeatable processes
- Deployment models (cloud, hybrid, on-premises)

**Access methods:**

| Method | Description |
|---|---|
| AWS Management Console | Browser-based GUI — good for exploration, not repeatable at scale |
| AWS CLI | Command-line tool; scriptable; good for automation |
| AWS SDKs | Language-specific libraries (Python/boto3, JS, Java, .NET) for programmatic access |
| AWS CloudFormation | IaC — declare infrastructure in JSON/YAML templates; repeatable, version-controlled |
| AWS CDK | Infrastructure as code using familiar languages (TypeScript, Python); synthesises to CloudFormation |

**Deployment models:**

| Model | Description |
|---|---|
| Cloud (public cloud) | All resources run in AWS |
| Hybrid | Mix of on-premises and cloud; connected via Direct Connect or VPN |
| On-premises (private cloud) | Infrastructure in your own data centre; AWS Outposts extends AWS to on-prem |

---

### Task Statement 3.2 — AWS global infrastructure

**Knowledge of:**
- Regions, Availability Zones, edge locations

**Skills:**
- Relationships among Regions, AZs, edge locations
- High availability via multiple AZs
- AZs do not share single points of failure
- When to use multiple Regions

**Definitions:**

| Concept | Definition |
|---|---|
| Region | Geographic area containing 2+ AZs; e.g. us-east-1 (N. Virginia) |
| Availability Zone (AZ) | One or more discrete data centres with redundant power, networking, and connectivity; physically separated within a Region |
| Edge location | Point of Presence (PoP) used by CloudFront and Route 53 for content delivery and DNS; more numerous than Regions |
| Local Zone | Extension of a Region closer to end users in a specific metro area |
| Wavelength Zone | Ultra-low latency compute at the edge of 5G networks |
| AWS Outposts | AWS rack installed in your on-premises data centre |

**High availability principle:** Deploy across at least two AZs. AZs are connected with low-latency, high-bandwidth links but do not share single points of failure (separate power, separate facilities).

**When to use multiple Regions:**
- Disaster recovery (DR) and business continuity
- Data sovereignty requirements (data must stay in a specific country)
- Reducing latency for geographically distributed users
- Regulatory compliance

---

### Task Statement 3.3 — AWS compute services

**Knowledge of:**
- AWS compute services

**Skills:**
- EC2 instance type categories
- Container options (ECS, EKS)
- Serverless options (Fargate, Lambda)
- Auto Scaling for elasticity
- Load balancers

**EC2 instance families:**

| Family | Optimised for | Example use case |
|---|---|---|
| General Purpose (M, T) | Balance of CPU, memory, network | Web servers, small databases |
| Compute Optimised (C) | High CPU-to-memory | Batch, ML inference, game servers |
| Memory Optimised (R, X, z) | High memory | In-memory databases, SAP, Spark |
| Storage Optimised (I, D, H) | High sequential I/O or local storage | Data warehouses, Hadoop |
| Accelerated Computing (P, G, Inf, Trn) | GPU or custom chips | ML training, graphics rendering |

**Containers:**

| Service | What it does |
|---|---|
| Amazon ECR | Private Docker container registry — store and pull container images |
| Amazon ECS | AWS-native container orchestration; simpler than Kubernetes |
| Amazon EKS | Managed Kubernetes — use when you need Kubernetes compatibility |
| AWS Fargate | Serverless container runtime for ECS or EKS — no EC2 instances to manage |

**Serverless compute:**

| Service | What it does |
|---|---|
| AWS Lambda | Run code in response to events; no server management; billed per invocation and duration; max 15-minute timeout |
| AWS Fargate | Serverless containers (pairs with ECS/EKS) |

**Elasticity and load balancing:**
- **AWS Auto Scaling:** Automatically adjusts EC2 capacity based on demand or schedule. Responds to CloudWatch alarms.
- **Elastic Load Balancing (ELB):** Distributes incoming traffic across multiple targets.
  - **Application Load Balancer (ALB):** Layer 7; HTTP/HTTPS; path-based routing; good for microservices.
  - **Network Load Balancer (NLB):** Layer 4; TCP/UDP; extreme performance; static IP.
  - **Gateway Load Balancer (GWLB):** For deploying inline virtual appliances (firewalls, IDS).

**Other compute services:**
- **AWS Elastic Beanstalk:** PaaS — upload code, AWS handles provisioning, load balancing, scaling, monitoring. Supports Java, .NET, PHP, Node.js, Python, Ruby, Go, Docker.
- **Amazon Lightsail:** Simplified VPS with fixed pricing — bundled compute, storage, and transfer. For simple web apps, blogs, small databases.
- **AWS Batch:** Managed batch processing jobs at any scale; automatically provisions compute.
- **AWS Outposts:** Run AWS services on-premises on AWS-managed hardware.

---

### Task Statement 3.4 — AWS database services

**Knowledge of:**
- AWS database services
- Database migration

**Skills:**
- EC2-hosted vs managed databases
- Relational (RDS, Aurora)
- NoSQL (DynamoDB)
- In-memory (ElastiCache)
- Migration tools (DMS, SCT)

**Relational databases:**

| Service | What it does |
|---|---|
| Amazon RDS | Managed relational database — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server. AWS handles patching, backups, Multi-AZ failover |
| Amazon Aurora | AWS-proprietary relational DB; MySQL/PostgreSQL compatible; up to 5x faster than standard MySQL; Multi-AZ by default; up to 15 read replicas |

**EC2-hosted DB vs RDS:** Use RDS when you want reduced operational overhead. Use EC2-hosted DB when you need an engine RDS does not support, or when you need OS-level access.

**NoSQL:**

| Service | What it does |
|---|---|
| Amazon DynamoDB | Fully managed, serverless key-value and document NoSQL database; single-digit millisecond performance at any scale; global tables for multi-region |

**In-memory:**

| Service | What it does |
|---|---|
| Amazon ElastiCache | Managed Redis or Memcached; sub-millisecond latency; use for session stores, caching, leaderboards |

**Other databases:**
- **Amazon DocumentDB:** MongoDB-compatible managed document database
- **Amazon Neptune:** Managed graph database — for social networks, fraud detection, knowledge graphs
- **Amazon Redshift:** Managed data warehouse — columnar storage, petabyte scale, SQL queries

**Migration tools:**

| Tool | Use case |
|---|---|
| AWS DMS (Database Migration Service) | Migrate databases to AWS with minimal downtime; supports homogeneous (MySQL to MySQL) and heterogeneous (Oracle to Aurora) migrations |
| AWS SCT (Schema Conversion Tool) | Converts database schema and application code from one engine to another (heterogeneous migrations only) |

---

### Task Statement 3.5 — AWS network services

**Knowledge of:**
- AWS network services

**Skills:**
- VPC components (subnets, gateways)
- VPC security (NACLs, security groups, Inspector)
- Amazon Route 53
- Network connectivity (VPN, Direct Connect)

**Amazon VPC (Virtual Private Cloud):** Logically isolated network within AWS. You control IP ranges, subnets, route tables, and gateways.

**VPC components:**

| Component | Description |
|---|---|
| Subnet | Subdivision of a VPC's IP range; can be public (internet-accessible) or private |
| Internet Gateway (IGW) | Enables internet access for resources in a public subnet |
| NAT Gateway | Allows private subnet resources to initiate outbound internet connections; no inbound |
| Route Table | Controls routing for subnets |
| VPC Peering | Private connectivity between two VPCs |
| AWS Transit Gateway | Hub-and-spoke to connect many VPCs and on-premises networks |
| AWS PrivateLink | Private connectivity to AWS services without traversing the internet |

**VPC security:**

| Control | Applies to | Stateful? | Default |
|---|---|---|---|
| Security Group | Individual resource (EC2 instance, RDS, etc.) | Stateful (return traffic auto-allowed) | Deny all inbound, allow all outbound |
| Network ACL (NACL) | Subnet level | Stateless (return traffic needs explicit rule) | Allow all (default NACL); Deny all (custom NACL) |

Security groups are the primary tool. NACLs are an additional layer.

**Connectivity to AWS:**

| Option | Description |
|---|---|
| AWS VPN (Site-to-Site VPN) | Encrypted IPsec tunnel over the public internet between on-premises and VPC |
| AWS Client VPN | Remote access VPN for individual users |
| AWS Direct Connect | Dedicated private network connection from your data centre to AWS; consistent bandwidth and latency; bypasses public internet |

**Content delivery and DNS:**

| Service | Description |
|---|---|
| Amazon CloudFront | CDN — caches content at edge locations globally; reduces latency for static and dynamic content |
| Amazon Route 53 | Managed DNS; domain registration; health checks; traffic routing policies (simple, weighted, latency, geolocation, failover) |
| AWS Global Accelerator | Routes traffic through the AWS global network to improve availability and performance for TCP/UDP; uses static Anycast IPs |
| Amazon API Gateway | Create, publish, and manage REST, HTTP, and WebSocket APIs; integrates with Lambda, EC2, and other backends |

---

### Task Statement 3.6 — AWS storage services

**Knowledge of:**
- AWS storage services

**Skills:**
- Object storage use cases
- S3 storage classes
- Block storage (EBS, instance store)
- File services (EFS, FSx)
- Cached file systems (Storage Gateway)
- Lifecycle policies
- AWS Backup

**Amazon S3 (Simple Storage Service):** Object storage for any amount of data. Objects stored in buckets. Not a file system — objects accessed via HTTP/HTTPS. 11 nines of durability (99.999999999%).

**S3 storage classes:**

| Class | Use case | Retrieval |
|---|---|---|
| S3 Standard | Frequently accessed data | Milliseconds |
| S3 Intelligent-Tiering | Unknown or changing access patterns; auto-moves between tiers | Milliseconds |
| S3 Standard-IA | Infrequently accessed, but needs fast retrieval | Milliseconds; retrieval fee |
| S3 One Zone-IA | IA data that can be recreated if lost; stored in single AZ | Milliseconds; retrieval fee |
| S3 Glacier Instant Retrieval | Archive data accessed occasionally; same retrieval speed as IA | Milliseconds |
| S3 Glacier Flexible Retrieval | Archival; access 1–5 min (expedited), 3–5 hrs (standard), 5–12 hrs (bulk) | Minutes to hours |
| S3 Glacier Deep Archive | Lowest cost; accessed once or twice per year | Up to 12 hours (standard), 48 hours (bulk) |

**S3 lifecycle policies:** Automatically transition objects between storage classes or expire/delete them after a set period.

**Block storage:**

| Service | Description |
|---|---|
| Amazon EBS (Elastic Block Store) | Persistent block storage attached to a single EC2 instance; survives instance stop/start; like a hard drive; AZ-specific |
| EC2 Instance Store | Ephemeral (temporary) local storage physically attached to the host; extremely fast; data lost when instance stops or terminates |

**File storage:**

| Service | Description |
|---|---|
| Amazon EFS (Elastic File System) | Managed NFS file system; multi-AZ; scales automatically; attach to multiple EC2 instances simultaneously (Linux only) |
| Amazon FSx for Windows File Server | Managed Windows file system (SMB); Active Directory integration |
| Amazon FSx for Lustre | High-performance parallel file system for HPC, ML training, financial simulations |

**Hybrid storage:**
- **AWS Storage Gateway:** Connects on-premises applications to AWS cloud storage. Three modes: S3 File Gateway (NFS/SMB to S3), Volume Gateway (iSCSI block storage cached or stored in AWS), Tape Gateway (virtual tape library to Glacier).

**Backup:**
- **AWS Backup:** Centralised backup service across EBS, RDS, EFS, DynamoDB, EC2, and other services. Audit compliance with backup policies.
- **AWS Elastic Disaster Recovery:** Replicates on-premises or cloud workloads to AWS for fast recovery.

---

### Task Statement 3.7 — AI/ML and analytics services

**Skills:**
- AI/ML services and their tasks
- Data analytics services

**AI/ML services:**

| Service | What it does |
|---|---|
| Amazon SageMaker AI | Build, train, and deploy ML models; end-to-end ML platform |
| Amazon Rekognition | Image and video analysis — object detection, facial analysis, content moderation |
| Amazon Comprehend | Natural language processing — sentiment, entities, key phrases, language detection |
| Amazon Lex | Build conversational chatbots with voice and text (same tech as Alexa) |
| Amazon Polly | Text-to-speech; converts text into natural speech |
| Amazon Transcribe | Speech-to-text; automatic speech recognition (ASR) |
| Amazon Translate | Neural machine translation |
| Amazon Textract | Extract text, tables, and forms from scanned documents and PDFs (beyond basic OCR) |
| Amazon Kendra | Intelligent enterprise search powered by ML |
| Amazon Q | Generative AI assistant for AWS and business applications |

**Analytics services:**

| Service | What it does |
|---|---|
| Amazon Athena | Serverless interactive SQL queries directly against data in S3; pay per query |
| Amazon EMR | Managed big data platform — Spark, Hadoop, Hive, Presto on EC2 or EKS |
| AWS Glue | Serverless ETL (Extract, Transform, Load) and data catalogue |
| Amazon Kinesis | Real-time streaming data ingestion and processing |
| Amazon OpenSearch Service | Managed Elasticsearch/OpenSearch for search and log analytics |
| Amazon QuickSight | Serverless BI and visualisation tool; creates dashboards from AWS data sources |
| Amazon Redshift | Managed cloud data warehouse; petabyte scale; columnar SQL |

---

### Task Statement 3.8 — Other in-scope service categories

**Application integration:**

| Service | What it does |
|---|---|
| Amazon EventBridge | Serverless event bus — route events between AWS services and SaaS applications |
| Amazon SNS (Simple Notification Service) | Pub/sub messaging — push notifications to subscribers (email, SMS, Lambda, SQS, HTTP) |
| Amazon SQS (Simple Queue Service) | Managed message queue — decouple microservices; standard (at-least-once) or FIFO (exactly-once) queues |
| AWS Step Functions | Visual workflow orchestration for multi-step processes; coordinates Lambda, ECS, and other services |

**Business applications:**
- **Amazon Connect:** Cloud-based contact centre (call centre as a service)
- **Amazon SES (Simple Email Service):** Transactional and marketing email sending at scale

**Developer tools:**
- **AWS CodeBuild:** Managed build service — compiles code, runs tests, produces deployable artefacts
- **AWS CodePipeline:** Continuous delivery pipeline — automates build, test, and deploy stages
- **AWS X-Ray:** Distributed tracing — analyse and debug production applications; service maps

**End-user computing:**
- **Amazon AppStream 2.0:** Streams desktop applications to browsers — no local install required
- **Amazon WorkSpaces:** Managed cloud desktop (Windows or Linux DaaS)
- **Amazon WorkSpaces Secure Browser:** Managed browser for accessing internal web apps without full desktop

**Frontend web and mobile:**
- **AWS Amplify:** Full-stack platform for web and mobile apps — hosting, authentication, APIs, storage
- **AWS AppSync:** Managed GraphQL API service; real-time and offline support

**IoT:**
- **AWS IoT Core:** Connect, manage, and secure IoT devices; message routing between devices and AWS services

**Management and governance (key services):**

| Service | What it does |
|---|---|
| AWS CloudFormation | IaC — provision infrastructure from templates; stack-based |
| AWS CloudTrail | Audit log of all API calls in your account |
| Amazon CloudWatch | Metrics, logs, alarms, events, dashboards |
| AWS Config | Tracks resource configuration changes over time; evaluates compliance rules |
| AWS Organizations | Manage multiple AWS accounts; consolidated billing; apply SCPs (Service Control Policies) |
| AWS Control Tower | Sets up and governs a multi-account environment with guardrails |
| AWS Systems Manager | Unified interface for operational tasks — patch management, run commands, Parameter Store |
| AWS Trusted Advisor | Best practice recommendations across cost, security, performance, fault tolerance, service limits |
| AWS Health Dashboard | Personalised view of AWS service health events affecting your resources |
| AWS Compute Optimizer | Recommends optimal AWS compute resources based on utilisation metrics |
| AWS Auto Scaling | Automatically adjusts capacity for EC2, ECS, DynamoDB, Aurora, and more |

---

## Domain 4: Billing, Pricing, and Support (12%)

### Task Statement 4.1 — Compare AWS pricing models

**Knowledge of:**
- Compute purchasing options
- Storage options and tiers

**Skills:**
- When to use each purchasing option
- Reserved Instance flexibility
- RI behaviour in AWS Organizations
- Data transfer costs
- Storage pricing options

**EC2 purchasing options:**

| Option | Commitment | Max savings vs On-Demand | Best for |
|---|---|---|---|
| On-Demand | None | 0% (baseline) | Irregular, unpredictable workloads; dev/test |
| Reserved Instances (Standard) | 1 or 3 year | Up to 72% | Steady-state, predictable workloads |
| Reserved Instances (Convertible) | 1 or 3 year | Up to 66% | Steady-state but need flexibility to change instance attributes |
| Savings Plans (Compute) | 1 or 3 year | Up to 66% | Most flexible RI alternative; applies across EC2, Lambda, Fargate; any region/family/OS |
| Savings Plans (EC2 Instance) | 1 or 3 year | Up to 72% | Committed to specific instance family in a Region |
| Spot Instances | None | Up to 90% | Fault-tolerant, interruptible workloads (batch, CI, ML training) |
| Dedicated Hosts | On-Demand or Reserved | Varies | BYOL; compliance requiring physical server isolation |
| Dedicated Instances | On-Demand or Reserved | Varies | Tenancy isolation without managing the physical host |
| Capacity Reservations | None (pay On-Demand rate) | 0% (guaranteed capacity) | Guaranteed capacity in a specific AZ |

**Reserved Instance flexibility:**
- Standard RIs: fixed instance family, OS, tenancy; can be sold on RI Marketplace.
- Convertible RIs: can exchange for RIs of equal or greater value; cannot be sold on RI Marketplace.
- RIs can be shared across accounts in an AWS Organization via consolidated billing.

**Data transfer costs:**
- Inbound (ingress) to AWS from internet: free
- Outbound (egress) from AWS to internet: charged per GB (after free tier)
- Transfer between services in the same Region but different AZs: charged
- Transfer between services in the same AZ: free (generally)
- Transfer between Regions: charged

**AWS Free Tier:**
- Always free: Lambda (1M requests/month), DynamoDB (25 GB), CloudWatch (10 metrics), etc.
- 12-month free: EC2 (750 hours/month t2.micro or t3.micro), S3 (5 GB), RDS (750 hours), etc.
- Trials: short-term free trials for specific services

---

### Task Statement 4.2 — Billing, budget, and cost management resources

**Knowledge of:**
- Billing support and information
- AWS service pricing information
- AWS Organizations
- Cost allocation tags

**Skills:**
- AWS Budgets and AWS Cost Explorer capabilities
- AWS Pricing Calculator
- AWS Organizations consolidated billing
- Cost allocation tags and billing reports

**Key tools:**

| Tool | What it does |
|---|---|
| **AWS Cost Explorer** | Visualise and analyse historical spending; forecasting; identify top cost drivers; rightsizing recommendations |
| **AWS Budgets** | Set custom cost, usage, or RI/Savings Plan utilisation budgets; alerts when thresholds are exceeded; can trigger actions |
| **AWS Pricing Calculator** | Estimate cost of new architectures before building; model different configurations |
| **AWS Cost and Usage Report (CUR)** | Most granular billing data available; CSV/Parquet; delivered to S3; used for detailed analysis |
| **AWS Organizations** | Manage multiple accounts; consolidated billing combines usage across accounts for volume discounts |

**Cost allocation tags:**
- Tag AWS resources (key-value pairs) to track costs by project, team, environment, etc.
- AWS-generated tags: auto-applied by some services.
- User-defined tags: you create them.
- Tags appear in the Cost and Usage Report after activation in the Billing console.

**AWS Organizations consolidated billing:**
- One payer account receives a combined bill for all member accounts.
- Aggregated usage across accounts can qualify for volume pricing tiers.
- RIs and Savings Plans purchased in one account can be shared across the organisation (unless sharing is disabled).

---

### Task Statement 4.3 — Technical resources and AWS Support options

**Knowledge of:**
- Resources and documentation on official AWS websites
- AWS Support plans
- AWS Partner Network role
- AWS Support Center

**Skills:**
- Locating whitepapers, blogs, documentation
- Identifying technical resources (Prescriptive Guidance, Knowledge Center, re:Post)
- AWS Support plan options
- Trusted Advisor, Health Dashboard, Health API
- Trust and Safety team
- AWS Partner roles (Marketplace, ISVs, SIs)
- Benefits of being an AWS Partner

**AWS Support Plans:**

| Feature | Basic | Developer | Business | Enterprise On-Ramp | Enterprise |
|---|---|---|---|---|---|
| Price | Free | $29/mo min | $100/mo min | $5,500/mo min [unverified] | $15,000/mo min [unverified] |
| Tech support | None | Business hours email (1 contact) | 24/7 phone, email, chat (unlimited) | 24/7 phone, email, chat | 24/7 phone, email, chat |
| Response: General guidance | — | 24 hrs | 24 hrs | 24 hrs | 24 hrs |
| Response: System impaired | — | 12 hrs | 12 hrs | 12 hrs | 12 hrs |
| Response: Production impaired | — | — | 4 hrs | 4 hrs | 4 hrs |
| Response: Production down | — | — | 1 hr | 1 hr | 1 hr |
| Response: Business-critical down | — | — | — | 30 min | 15 min |
| Technical Account Manager (TAM) | No | No | No | Pool of TAMs | Designated TAM |
| Infrastructure Event Management | No | No | For extra fee | Included | Included |
| Trusted Advisor checks | Core only | Core only | Full | Full | Full |
| AWS Health API | No | No | Yes | Yes | Yes |
| Well-Architected Reviews | No | No | No | Included | Included |

Note: AWS is discontinuing Enterprise On-Ramp on January 1, 2027. Enterprise On-Ramp customers are being migrated to Enterprise Support during 2026. The exam still tests on all five plans as of May 2026.

**Key resources:**

| Resource | Description |
|---|---|
| AWS Knowledge Center | FAQ-style articles for common AWS questions |
| AWS re:Post | Community Q&A forum (replaced AWS Developer Forums) |
| AWS Prescriptive Guidance | Step-by-step patterns and best practices for specific migration and modernisation scenarios |
| AWS Whitepapers | Technical deep-dives on architecture, security, compliance |
| AWS Well-Architected Tool | Self-service architecture review against the six pillars |
| AWS Health Dashboard | Personalised alerts for events affecting your specific resources |
| AWS Trusted Advisor | Automated best-practice checks (cost, security, performance, fault tolerance, limits) |

**AWS Marketplace:**
- Catalogue of thousands of third-party software products that can be purchased and deployed on AWS.
- Products billed through your AWS account (single invoice).
- Categories: security, ML, business applications, DevOps, SaaS.
- Key capabilities for enterprises: governance, entitlement management, procurement integration.

**AWS Partner Network (APN):**
- **Technology Partners (ISVs):** Build software products on or integrating with AWS.
- **System Integrators (SIs) / Consulting Partners:** Design, build, and manage AWS solutions for customers.
- **AWS Professional Services:** AWS's own professional services team.
- **AWS Solutions Architects:** Pre-sales technical resources; do not charge separately.
- Partner benefits: training and certification, go-to-market support, partner events, volume discounts.

**Trust and Safety team:** Report abuse of AWS resources (spam, malware, DDoS originating from AWS IPs) via abuse@amazonaws.com or the AWS abuse report form.

---

## Key Concept: Shared Responsibility Model (Deep Dive)

The exam returns to this repeatedly across multiple domains. Internalise it as a decision framework, not just a definition.

**Decision rule:** If AWS built and operates it (physical hardware, hypervisor, managed service runtime), that's AWS's responsibility. If you configured it or put data in it, that's yours.

**Shifting responsibility examples:**

```
EC2 (IaaS)
  AWS owns: hypervisor, physical hardware, networking hardware, AZ infrastructure
  Customer owns: OS patches, application, security group config, data encryption, IAM

RDS (Managed PaaS)
  AWS owns: OS patches, database engine patches, hardware, Multi-AZ replication
  Customer owns: database schema, data, IAM access, security group, encryption at rest/transit

Lambda (Serverless/FaaS)
  AWS owns: runtime environment, OS, infrastructure, scaling
  Customer owns: function code, IAM execution role, data passed to function, dependencies
```

---

## Key Concept: Well-Architected Framework (Exam Approach)

Exam questions present a scenario and ask which pillar it relates to, or ask what design principle addresses a described problem.

**Quick mapping:**
- "Recover from failure automatically" → Reliability
- "Use the right resource type for the job" → Performance Efficiency
- "Eliminate unused resources" → Cost Optimization
- "Detect security events" → Security
- "Automate operational tasks" → Operational Excellence
- "Reduce carbon footprint" → Sustainability
- "Use multi-AZ deployment" → Reliability (not Availability — Availability is not a pillar)

---

## Key Concept: Pricing Models (Decision Framework)

| Scenario | Use |
|---|---|
| New project, unpredictable load | On-Demand |
| Steady-state production workload, 1+ year | Reserved Instances or Savings Plans |
| Flexible about instance family/region | Compute Savings Plan |
| Batch processing, fault-tolerant jobs | Spot Instances |
| Strict software licensing (BYOL) | Dedicated Hosts |
| Need guaranteed capacity without cost savings | Capacity Reservations |
| Short-term experiment | On-Demand |

---

## In-Scope AWS Services (Complete Official List)

These are the services AWS explicitly names as in-scope for CLF-C02.

**Analytics:** Athena, EMR, Glue, Kinesis, OpenSearch Service, QuickSight, Redshift

**Application Integration:** EventBridge, SNS, SQS, Step Functions

**Business Applications:** Connect, SES

**Cloud Financial Management:** Budgets, Cost and Usage Reports, Cost Explorer, Marketplace

**Compute:** Batch, EC2, Elastic Beanstalk, Lightsail, Outposts

**Containers:** ECR, ECS, EKS

**Customer Enablement:** AWS Support

**Database:** Aurora, DocumentDB, DynamoDB, ElastiCache, Neptune, RDS

**Developer Tools:** CLI, CodeBuild, CodePipeline, X-Ray

**End User Computing:** AppStream 2.0, WorkSpaces, WorkSpaces Secure Browser

**Frontend Web and Mobile:** Amplify, AppSync

**IoT:** IoT Core

**Machine Learning:** Comprehend, Kendra, Lex, Polly, Amazon Q, Rekognition, SageMaker AI, Textract, Transcribe, Translate

**Management and Governance:** Auto Scaling, CloudFormation, CloudTrail, CloudWatch, Compute Optimizer, Config, Control Tower, Health Dashboard, License Manager, Management Console, Organizations, Service Catalog, Service Quotas, Systems Manager, Trusted Advisor, Well-Architected Tool

**Migration and Transfer:** Application Discovery Service, Application Migration Service, DMS, Migration Evaluator, Migration Hub, SCT, Snow Family

**Networking and Content Delivery:** API Gateway, CloudFront, Direct Connect, Global Accelerator, PrivateLink, Route 53, Transit Gateway, VPC, VPN, Site-to-Site VPN, Client VPN

**Security, Identity, and Compliance:** Artifact, Audit Manager, ACM, CloudHSM, Cognito, Detective, Directory Service, Firewall Manager, GuardDuty, IAM, IAM Identity Center, Inspector, KMS, Macie, RAM, Secrets Manager, Security Hub, Shield, WAF

**Serverless:** Fargate, Lambda

**Storage:** Backup, EBS, EFS, Elastic Disaster Recovery, FSx, S3, S3 Glacier, Storage Gateway

---

## Exam Strategy

**What the exam tests:** Recognition and selection — matching a described scenario to the correct service, model, or concept. It does not test implementation, architecture design, or coding.

**Question approach:**
1. Identify the scenario type first (migration, security, cost, compute, etc.).
2. Look for eliminating keywords — "no servers to manage" = serverless (Lambda/Fargate), "compliance reports" = Artifact, "who made an API call" = CloudTrail.
3. For multiple-response questions, identify the number of correct answers required before reading options.
4. Eliminate obviously wrong answers before evaluating remaining options.
5. No penalty for guessing — if uncertain, select the most specific match.

**Common traps:**
- CloudWatch vs CloudTrail: CloudWatch = metrics and logs (operational); CloudTrail = API audit log (governance/security).
- Security Groups vs NACLs: Security groups are stateful and apply to instances; NACLs are stateless and apply to subnets.
- RDS vs DynamoDB: RDS = relational (SQL); DynamoDB = NoSQL (key-value/document). Exam often asks which to use for a described data model.
- S3 Glacier vs S3 Glacier Instant Retrieval: Instant Retrieval = millisecond access, Flexible Retrieval = minutes to hours.
- Basic Support vs Developer: Basic = free, no tech support; Developer = email support, one contact, business hours only.
- Trusted Advisor full checks require Business Support or higher (not Developer or Basic).
- The root user account has tasks only it can perform — those cannot be delegated to any IAM user or role.
- AWS Artifact provides compliance *documentation* (SOC reports, PCI attestations); it is not a security scanning tool.
- Shared responsibility: "security groups" are the customer's responsibility even though they are an AWS feature.

**High-frequency topics by domain:**
- Domain 1: 6 cloud advantages, Well-Architected 6 pillars, 7 Rs, CAF perspectives
- Domain 2: Shared responsibility shifts per service, IAM (users/groups/roles/policies), root user restrictions, GuardDuty vs Inspector vs Security Hub vs Shield
- Domain 3: EC2 instance families, S3 storage classes, when to use Lambda vs EC2 vs Fargate, EBS vs EFS vs S3 differences
- Domain 4: Pricing model comparison, Support plan tier differences, what Trusted Advisor covers at each tier

**Time management:** 90 minutes for 65 questions = ~83 seconds per question. Flag uncertain questions and return; most questions are answerable in under 60 seconds.

---

## Related Pages

- [[landscape/aws-solutions-architect-associate]] (next certification up)
- [[protocols/mcp]] (cloud protocol context)
- [[infra/vector-stores]] (AWS services in AI infra context)
- [[security/owasp-llm-top-10]] (cloud security context)

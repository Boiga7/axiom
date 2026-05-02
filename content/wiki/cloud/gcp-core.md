---
type: concept
category: cloud
para: resource
tags: [gcp, google-cloud, gke, cloud-run, bigquery, vertex-ai, iam, pubsub]
sources: []
updated: 2026-05-01
tldr: Google Cloud Platform. Second cloud for most teams; first cloud for ML/AI workloads and analytics. GCP leads on Kubernetes (invented it), BigQuery, and Vertex AI. 12% market share (2026).
---

# GCP Core Services

Google Cloud Platform. Second cloud for most teams; first cloud for ML/AI workloads and analytics. GCP leads on Kubernetes (invented it), BigQuery, and Vertex AI. 12% market share (2026).

---

## Compute

### Compute Engine
Virtual machines. Machine types: general purpose (N2, E2), compute-optimised (C3), memory-optimised (M3), accelerator (A3 — H100 GPUs). Preemptible VMs (Spot) up to 91% cheaper, interrupted with 30s notice.

### Cloud Run
Serverless containers. Bring your own container image, GCP handles scaling from zero. Request-driven (min-instances=0 for cost) or always-on. No 15-minute cap like Lambda — requests timeout at 60 min max. Ideal for APIs and event-driven workloads.

```bash
# Deploy a container
gcloud run deploy my-api \
  --image gcr.io/my-project/my-api:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 100
```

### GKE — Google Kubernetes Engine
Managed Kubernetes. GCP invented Kubernetes; GKE is the most feature-complete managed offering. Autopilot mode (GKE manages nodes, bin-packing, security hardening) vs Standard mode (you manage node pools). As of 2025, Autopilot supports Spot pods and A100/H100 GPU node pools.

Key GKE features:
- **Vertical Pod Autoscaler** — automatically right-sizes CPU/memory requests
- **Node Auto Provisioner** — creates custom node pools sized for pending pods
- **Binary Authorization** — only run signed container images
- **Workload Identity** — pod SA maps to Google SA, no service account keys

```bash
# Create Autopilot cluster
gcloud container clusters create-auto my-cluster \
  --region europe-west1

# Get credentials
gcloud container clusters get-credentials my-cluster --region europe-west1
```

### Cloud Functions
Event-driven functions (Gen 2). Node.js, Python, Go, Java, .NET, Ruby. 60-min timeout (Gen 2), VPC connector for private network access. Trigger via HTTP, Pub/Sub, Cloud Storage, Firestore, Cloud Scheduler.

---

## Storage

### Cloud Storage
Object storage (equivalent to S3). Global namespace, 11-nines durability. Storage classes: Standard → Nearline (30-day min) → Coldline (90-day min) → Archive (365-day min). Autoclass auto-transitions objects between classes based on access.

```bash
# Create bucket
gcloud storage buckets create gs://my-bucket --location=europe-west1

# Upload
gcloud storage cp file.txt gs://my-bucket/

# Signed URL (1-hour expiry)
gcloud storage sign-url gs://my-bucket/file.txt --duration=1h
```

### Cloud SQL / Spanner / Firestore
- **Cloud SQL** — managed PostgreSQL, MySQL, SQL Server. HA via regional replicas.
- **Spanner** — globally distributed RDBMS. Strong consistency across regions. Expensive but unique for global transactional workloads.
- **Firestore** — serverless NoSQL (document/collection). Real-time listeners. Native mobile SDK.

### Persistent Disk / Filestore
- **Persistent Disk** — block storage for Compute Engine and GKE. SSD (pd-ssd) or standard HDD.
- **Filestore** — managed NFS. Shared filesystem for GKE workloads needing `ReadWriteMany`.

---

## Analytics and AI

### BigQuery
Serverless data warehouse. Columnar storage, separate compute and storage. Pricing: $6.25/TB scanned (on-demand) or flat-rate slots. Federated queries against Cloud Storage (Iceberg/Parquet/Avro), Cloud Bigtable, and Google Sheets.

```sql
-- Query public dataset, only scan what you need
SELECT
  departure_airport,
  COUNT(*) AS flights,
  AVG(arr_delay) AS avg_delay
FROM `bigquery-public-data.airline_ontime_data.flights`
WHERE EXTRACT(YEAR FROM fl_date) = 2023
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

BigQuery ML: train models in SQL (`CREATE MODEL`). Support for linear regression, boosted trees, k-means, matrix factorisation, and importing TensorFlow/PyTorch models.

### Vertex AI
GCP's unified ML platform (renamed from AI Platform in 2021, expanded to Gemini Enterprise Agent Platform in 2025). Key components:
- **Model Garden** — 130+ foundation models (Gemini, Imagen, Codey, open-source)
- **Gemini API** — same models as Google AI Studio, enterprise SLAs, VPC Service Controls
- **Training** — managed custom training jobs (GPU/TPU pools)
- **Prediction** — online (REST endpoints) and batch prediction
- **Pipelines** — KFP-based ML pipelines with caching and artifact tracking
- **Feature Store** — centralised feature serving (online: Bigtable-backed, offline: BigQuery-backed)

```python
from google.cloud import aiplatform

aiplatform.init(project="my-project", location="europe-west1")

# Deploy Gemini via API
from google.generativeai import GenerativeModel
model = GenerativeModel("gemini-1.5-pro")
response = model.generate_content("Explain BigQuery slots.")
print(response.text)
```

### Pub/Sub
Managed message queue / event streaming. Guaranteed at-least-once delivery. Push (HTTP webhook) or pull. Exactly-once delivery available. Integrates with Dataflow for streaming pipelines.

---

## Networking

### VPC
Same concept as AWS VPC. GCP VPCs are global (subnets are regional). Shared VPC for org-wide network management. VPC peering and Cloud Interconnect (dedicated 10G/100G links).

### Cloud Load Balancing
Global anycast L7 (HTTPS LB) — single IP, traffic routed to nearest healthy backend. Regional L4 (TCP/UDP). Cloud Armor for WAF and DDoS protection (integrated with L7 LB).

### Cloud DNS
Managed DNS. 100% SLA. Private zones for VPC-internal resolution.

---

## Security and Identity

### IAM
```
Principal → Role → Permissions → Resources
```

Principals: Google Accounts, Service Accounts, Google Groups, Cloud Identity domains. Roles: Basic (Owner/Editor/Viewer — avoid), Predefined (e.g., `roles/storage.objectViewer`), Custom.

**Workload Identity Federation** — allow external identities (GitHub Actions OIDC, AWS IAM, Azure AD) to impersonate GCP service accounts without keys.

```bash
# Grant role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Secret Manager
Store and version secrets. Automatic replication across regions. Rotate via rotation schedule (triggers Pub/Sub notification). Access via SDK or mounted as volume in Cloud Run/GKE.

```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = "projects/my-project/secrets/db-password/versions/latest"
secret = client.access_secret_version(request={"name": name})
print(secret.payload.data.decode("UTF-8"))
```

---

## Key CLI

```bash
# Auth
gcloud auth login
gcloud auth application-default login   # for SDK use in code
gcloud config set project my-project

# List resources
gcloud compute instances list
gcloud run services list --region europe-west1
gcloud container clusters list

# IAM
gcloud iam service-accounts list
```

---

## GCP vs AWS Equivalents

| GCP | AWS |
|-----|-----|
| Compute Engine | EC2 |
| Cloud Run | App Runner / Lambda (container) |
| GKE | EKS |
| Cloud Storage | S3 |
| Cloud SQL | RDS |
| Spanner | Aurora Global |
| BigQuery | Redshift |
| Pub/Sub | SQS + SNS |
| Vertex AI | SageMaker |
| Cloud Armor | WAF / Shield |
| Secret Manager | Secrets Manager |

---

## Connections

- [[cloud/aws-core]] — AWS equivalent services
- [[cloud/azure-core]] — Azure equivalent services
- [[cloud/kubernetes]] — GKE is the managed K8s reference implementation
- [[cloud/terraform]] — Terraform google provider for GCP resources
- [[infra/cloud-platforms]] — multi-cloud comparison
- [[agents/langchain]] — Vertex AI as LLM provider in LangChain

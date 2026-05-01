---
type: concept
category: cloud
para: resource
tags: [azure, microsoft, aks, azure-functions, cosmos-db, entra-id, blob-storage]
sources: []
updated: 2026-05-01
---

# Azure Core Services

Microsoft Azure. Third cloud globally but dominant in enterprise (Microsoft 365 integration, Entra ID as de facto corporate identity). Strong for .NET workloads, hybrid cloud (Azure Arc), and OpenAI partnership. 23% cloud market share (2026).

---

## Compute

### Azure Virtual Machines
VMs. Size families: B-series (burstable, cheap), D-series (general), F-series (compute), E-series (memory), N-series (GPU — ND A100 for ML). Spot VMs (Spot) up to 90% cheaper, evicted with 30s notice.

### Azure App Service
PaaS for web apps and APIs. No container management. Supports .NET, Java, Python, Node.js, PHP. Scale out via App Service Plan. Deployment slots for blue/green with traffic splitting.

### Azure Functions
Serverless event-driven functions. Consumption plan (scale to zero), Premium plan (no cold start, VNet integration), Dedicated plan (App Service). Durable Functions for stateful orchestrations (equivalent to AWS Step Functions).

```python
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    name = req.params.get("name", "World")
    return func.HttpResponse(f"Hello, {name}!")
```

### AKS — Azure Kubernetes Service
Managed Kubernetes. Free control plane. Node pools: system (core cluster components) and user (workloads). Supports Windows node pools (useful for .NET workloads). Azure CNI for pod-level networking in the VNet.

```bash
# Create cluster
az aks create \
  --resource-group my-rg \
  --name my-cluster \
  --node-count 3 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get credentials
az aks get-credentials --resource-group my-rg --name my-cluster
```

**Workload Identity** — Azure's equivalent of GKE Workload Identity and AWS IRSA. Pod service account annotated with Azure AD managed identity; no credentials in pods.

---

## Storage

### Blob Storage
Object storage (equivalent to S3). Account → Container → Blob hierarchy. Access tiers: Hot → Cool → Cold → Archive. **Smart Tiering** (GA 2025): automatically moves blobs between Hot/Cool/Cold based on access patterns. Lifecycle management policies for rule-based transitions.

```bash
# Upload
az storage blob upload \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --file ./data.csv \
  --name data.csv

# Generate SAS token (1-hour expiry)
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name data.csv \
  --permissions r \
  --expiry "2026-05-01T12:00:00Z"
```

### Azure SQL / Cosmos DB
- **Azure SQL Database** — managed SQL Server (PaaS). Serverless tier scales to zero. Hyperscale tier for large databases (100TB+).
- **Cosmos DB** — multi-model NoSQL (document, key-value, graph, table). Multi-region writes, <10ms latency SLA at p99. API compatibility: Core SQL, MongoDB (wire protocol), Cassandra, Gremlin, Table Storage.

### Azure Files / Managed Disks
- **Azure Files** — managed SMB/NFS file shares. Premium tier (SSD) for AKS `ReadWriteMany` volumes.
- **Managed Disks** — block storage for VMs. Premium SSD (p-series), Standard SSD, Standard HDD, Ultra Disk (160,000 IOPS, sub-ms latency for databases).

---

## AI and ML

### Azure OpenAI Service
OpenAI models (GPT-4o, o-series, DALL-E, Whisper, Embeddings) on Azure infrastructure. Data privacy guarantees (no training on your data). Regional deployments (UK South, Sweden Central, East US 2).

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://my-instance.openai.azure.com/",
    api_key="...",
    api_version="2024-02-01"
)

response = client.chat.completions.create(
    model="gpt-4o",  # deployment name
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Azure Machine Learning
Managed ML platform. Compute clusters for training, managed endpoints for inference. MLflow integration for experiment tracking. Prompt Flow for LLM orchestration (alternative to LangChain for Azure-native teams).

---

## Networking

### Azure Virtual Network (VNet)
Regional network. Subnets within a VNet. VNet Peering for inter-VNet connectivity. Azure Firewall for egress control. Network Security Groups (NSGs) — stateful firewall at subnet/NIC level (same role as AWS Security Groups).

### Application Gateway / Azure Front Door
- **Application Gateway** — regional L7 LB with WAF.
- **Azure Front Door** — global CDN + L7 LB (equivalent to AWS CloudFront + ALB). DDoS protection, WAF, SSL termination.

### Private Link / Private Endpoints
Expose PaaS services (Storage, SQL, Cosmos) inside your VNet via private IP. Eliminates public internet exposure for data-path traffic.

---

## Security and Identity

### Entra ID (formerly Azure Active Directory)
Microsoft's cloud identity platform. The de facto enterprise identity standard — most corporates already have it. Conditional Access for MFA enforcement. B2C variant for customer identity. SAML/OIDC federation.

Managed Identities (system-assigned or user-assigned) — replace service account credentials for Azure-to-Azure auth.

### Azure Key Vault
Secrets, keys, certificates. HSM-backed key generation. Soft-delete and purge protection prevent accidental deletion. Reference Key Vault secrets directly in App Service/AKS via CSI driver — secret mounts, no code change required.

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://myvault.vault.azure.net/", credential=credential)
secret = client.get_secret("db-password")
print(secret.value)
```

### Microsoft Defender for Cloud
Unified security posture management. Security score, CSPM (Cloud Security Posture Management), threat detection across VMs, containers, databases. MCSB (Microsoft Cloud Security Benchmark) as the default policy baseline.

---

## Key CLI

```bash
# Auth
az login
az account set --subscription "My Subscription"

# Resource groups
az group create --name my-rg --location uksouth

# List resources
az vm list --output table
az aks list --output table
az storage account list --output table

# Managed identity
az identity create --name my-identity --resource-group my-rg
```

---

## Azure vs AWS Equivalents

| Azure | AWS |
|-------|-----|
| Virtual Machines | EC2 |
| App Service | Elastic Beanstalk |
| Azure Functions | Lambda |
| AKS | EKS |
| Blob Storage | S3 |
| Azure SQL | RDS |
| Cosmos DB | DynamoDB |
| Entra ID | IAM + Cognito |
| Key Vault | Secrets Manager + KMS |
| Azure OpenAI | Amazon Bedrock |
| Azure ML | SageMaker |
| Front Door | CloudFront + ALB |
| NSG | Security Groups |

---

## Connections

- [[cloud/aws-core]] — AWS equivalent services
- [[cloud/gcp-core]] — GCP equivalent services
- [[cloud/kubernetes]] — AKS is Azure managed K8s
- [[cloud/terraform]] — Terraform azurerm provider
- [[cloud/secrets-management]] — Azure Key Vault in depth
- [[infra/cloud-platforms]] — multi-cloud comparison

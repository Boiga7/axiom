---
type: concept
category: infra
tags: [cloud, aws, gcp, azure, bedrock, vertex-ai, sagemaker, managed-inference, iam]
sources: []
updated: 2026-04-29
para: resource
tldr: AWS (Bedrock + SageMaker), GCP (Vertex AI), and Azure (Azure OpenAI) each offer distinct AI stacks — choice depends on existing cloud contracts, compliance requirements, and whether you need frontier or self-hosted open models.
---

# Cloud Platforms for AI Engineering

> **TL;DR** AWS (Bedrock + SageMaker), GCP (Vertex AI), and Azure (Azure OpenAI) each offer distinct AI stacks — choice depends on existing cloud contracts, compliance requirements, and whether you need frontier or self-hosted open models.

The three major cloud providers each have a distinct AI stack. AWS dominates enterprise; GCP has the deepest model integration (Gemini + Vertex); Azure has the strongest OpenAI relationship. Most production AI systems run on one of these three, even when the model itself is Claude or GPT accessed via API.

---

## The Three Stacks at a Glance

| | AWS | GCP | Azure |
|---|---|---|---|
| Managed model API | Bedrock | Vertex AI Model Garden | Azure OpenAI Service |
| Training platform | SageMaker | Vertex AI Training | Azure Machine Learning |
| Serverless inference | Lambda + API Gateway | Cloud Run | Azure Functions |
| GPU compute | EC2 (p3/p4/p5) | GCE (A100/H100) | NDv5 (H100) |
| Object storage | S3 | GCS | Azure Blob |
| Container registry | ECR | Artifact Registry | ACR |
| Kubernetes | EKS | GKE | AKS |
| Secrets | Secrets Manager | Secret Manager | Key Vault |

---

## AWS

### Bedrock — Claude on AWS

Amazon Bedrock is the managed API gateway for frontier models including Claude, Llama, Mistral, and others. If your infrastructure is already AWS, Bedrock means no VPC egress to `api.anthropic.com` — model calls stay inside AWS.

```python
import boto3
import json

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

response = bedrock.invoke_model(
    modelId="anthropic.claude-sonnet-4-6-20251001-v1:0",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": "What is RAG?"}],
    }),
    contentType="application/json",
)

body = json.loads(response["body"].read())
print(body["content"][0]["text"])
```

Bedrock uses the same model IDs as the Anthropic API but with a different SDK and different auth (IAM roles, not API keys). The request/response shape is almost identical.

**Bedrock vs direct Anthropic API:**

| | Bedrock | Anthropic API |
|---|---|---|
| Auth | IAM roles | API key |
| Pricing | Same model prices + small AWS markup | Direct |
| Data residency | Stays in your AWS region | Anthropic's infrastructure |
| Compliance | SOC2, HIPAA, FedRAMP | SOC2 |
| Prompt caching | Available | Available |
| Latency | Slightly higher | Lower |

Use Bedrock when: enterprise compliance requires data to stay in AWS, you already have AWS IAM infrastructure, or your security team won't approve external API keys.

### SageMaker — Training and Hosting Open Models

SageMaker handles the full ML lifecycle — training, hosting, monitoring — for open-source models you bring yourself (Llama, Mistral, etc.).

```python
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

role = sagemaker.get_execution_role()

hub = {
    "HF_MODEL_ID": "meta-llama/Meta-Llama-3-8B-Instruct",
    "HF_TASK": "text-generation",
    "SM_NUM_GPUS": "1",
}

huggingface_model = HuggingFaceModel(
    image_uri=sagemaker.image_uris.retrieve(
        framework="huggingface-llm",
        region="us-east-1",
        version="2.0.0",
    ),
    env=hub,
    role=role,
)

predictor = huggingface_model.deploy(
    initial_instance_count=1,
    instance_type="ml.g5.2xlarge",  # A10G GPU
)

response = predictor.predict({"inputs": "What is the capital of France?"})
```

SageMaker instances: `ml.g5.2xlarge` (A10G, 24GB VRAM, ~$1.21/hr), `ml.p4d.24xlarge` (8×A100, for large models).

**When to use SageMaker vs Bedrock:**
- Open model you're fine-tuning → SageMaker
- Frontier API model (Claude, GPT) → Bedrock or direct API
- Need autoscaling inference endpoints → SageMaker

### Lambda — Serverless LLM Endpoints

For lightweight inference tasks (classification, short generation) that don't need a persistent server:

```python
# lambda_function.py
import json
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from Lambda env vars

def handler(event, context):
    body = json.loads(event["body"])
    query = body["query"]

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": query}],
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"answer": response.content[0].text}),
    }
```

Lambda cold start adds 200–500ms latency for Python. For streaming responses, Lambda doesn't support SSE well — use API Gateway WebSocket or ECS instead.

### IAM for AI Workloads

Key principle: **least privilege**. Each service gets only the permissions it needs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-ai-data-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:anthropic-api-key-*"
    }
  ]
}
```

Store API keys in **Secrets Manager**, not environment variables or SSM Parameter Store for sensitive values. Rotate them with Lambda rotation functions.

---

## GCP

### Vertex AI — Google's AI Platform

Vertex AI is GCP's unified ML platform. It hosts Google's own models (Gemini) plus third-party models via Model Garden, and handles training, fine-tuning, and serving.

```python
import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="my-project-id", location="us-central1")

model = GenerativeModel("gemini-2.5-pro")
response = model.generate_content("Explain RAG in one paragraph.")
print(response.text)
```

Claude is also available on Vertex AI (via Model Garden) with the same IAM auth pattern:

```python
import anthropic
from google.auth import default
from google.auth.transport.requests import Request

credentials, project = default()
credentials.refresh(Request())

client = anthropic.AnthropicVertex(
    project_id=project,
    region="us-east5",
)

response = client.messages.create(
    model="claude-sonnet-4-6@20251001",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

### Cloud Run — Serverless Containers for AI APIs

Cloud Run is GCP's managed container runtime — deploy a Docker container, it scales to zero, handles traffic. Better than Lambda for AI workloads because it supports longer timeouts and streaming.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

```bash
gcloud run deploy my-ai-api \
  --image gcr.io/my-project/my-ai-api \
  --region us-central1 \
  --set-env-vars ANTHROPIC_API_KEY=projects/my-project/secrets/anthropic-key/versions/latest \
  --allow-unauthenticated
```

Cloud Run concurrency: set `--concurrency 80` (default) for stateless API endpoints; lower it if each request is memory-heavy.

### GCS — Storage for Training Data

```python
from google.cloud import storage

client = storage.Client()
bucket = client.bucket("my-training-data")

# Upload a training dataset
blob = bucket.blob("datasets/fine-tune-data.jsonl")
blob.upload_from_filename("local/fine-tune-data.jsonl")

# Stream large files without loading into memory
with blob.open("r") as f:
    for line in f:
        record = json.loads(line)
        # process each training record
```

---

## Azure

### Azure OpenAI Service

Azure OpenAI hosts GPT-4o, GPT-4, and o-series models inside Azure infrastructure. Required for enterprises that need Azure compliance (Microsoft 365 integration, existing Azure contracts, EU data residency via Azure regions).

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-02-01",
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    # endpoint format: https://<resource>.openai.azure.com/
)

response = client.chat.completions.create(
    model="gpt-4o",           # your deployment name, not the model name
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=512,
)
print(response.choices[0].message.content)
```

Note: Azure OpenAI uses **deployment names** not model names — you deploy a model, give it a name, and use that name in API calls.

Claude is available via Azure Marketplace (not Azure OpenAI) — use the Anthropic SDK with an Azure-issued key.

### Azure ML — Training and MLOps

Azure ML handles experiment tracking, model registry, and deployment pipelines:

```python
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

ml_client = MLClient(
    credential=DefaultAzureCredential(),
    subscription_id="...",
    resource_group_name="my-rg",
    workspace_name="my-workspace",
)

# Submit a fine-tuning job
from azure.ai.ml import command

job = command(
    code="./src",
    command="python train.py --data ${{inputs.data}} --model ${{inputs.model}}",
    inputs={"data": "azureml:training-data:1", "model": "gpt-4o"},
    environment="azureml:AzureML-sklearn-1.0-ubuntu20.04:1",
    compute="gpu-cluster",
)

returned_job = ml_client.jobs.create_or_update(job)
```

### Key Vault — Secrets for Azure

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://my-keyvault.vault.azure.net/",
    credential=credential,
)

api_key = client.get_secret("anthropic-api-key").value
```

---

## Choosing a Cloud Provider

| Situation | Recommendation |
|---|---|
| Already deep in AWS | Bedrock for Claude, S3 + Lambda for lightweight serving |
| Need to run open models (Llama, Mistral) | SageMaker (AWS) or Vertex AI (GCP) |
| Google workspace / BigQuery shop | Vertex AI; Gemini native integration |
| Microsoft / Azure enterprise | Azure OpenAI; Key Vault for secrets |
| Greenfield, no existing cloud | GCP Cloud Run is the simplest for containerised AI APIs |
| Compliance: HIPAA / FedRAMP | AWS Bedrock or Azure OpenAI (both have compliance certs) |
| EU data residency | AWS eu-west or Azure EU regions |
| Cheapest experimentation | Direct Anthropic / OpenAI API — no cloud middleman markup |

---

## Cost Comparison: Managed vs Self-Hosted

For frontier models (Claude, GPT-4o) you can't self-host — you pay the API price regardless of which cloud you route through.

For open models (Llama 3 8B, Mistral 7B):

| Option | Cost (8B model) | Latency | Ops overhead |
|---|---|---|---|
| SageMaker ml.g5.2xlarge | ~$1.21/hr (24/7 = ~$873/mo) | Low | Medium |
| Runpod (spot GPU) | ~$0.20/hr | Low | High |
| Modal serverless GPU | ~$0.00164/s (billed by request) | Cold start 2-5s | Low |
| Fly.io GPU (A10) | ~$0.60/hr | Low | Low |
| Managed inference (Together AI, Fireworks) | $0.10–$0.20 per M tokens | Low | None |

Below ~10M tokens/month, managed inference APIs (Together AI, Fireworks, Groq) are cheaper than self-hosting anything.

---

## Key Facts

- Bedrock uses IAM roles (not API keys); adds small AWS markup on top of model prices
- Bedrock has SOC2, HIPAA, and FedRAMP compliance; Anthropic API has SOC2 only
- SageMaker ml.g5.2xlarge (A10G 24GB): ~$1.21/hr; ml.p4d.24xlarge (8× A100): ~$32/hr
- Lambda cold start: 200-500ms for Python; SSE streaming not well-supported, use ECS or API Gateway WebSocket
- Azure OpenAI uses deployment names, not model names in API calls
- Below ~10M tokens/month, managed inference APIs (Together AI, Fireworks, Groq) are cheaper than self-hosting
- Store API keys in Secrets Manager (AWS), Secret Manager (GCP), or Key Vault (Azure), not env vars

## Connections

- [[infra/inference-serving]] — vLLM, llama.cpp for self-hosted open model inference on cloud GPUs
- [[infra/deployment]] — Docker, GitHub Actions CI/CD, Vercel, Fly.io deployment patterns
- [[infra/gpu-hardware]] — GPU selection before choosing an instance type
- [[apis/anthropic-api]] — direct Anthropic API as the baseline comparison for Bedrock
- [[apis/aws-bedrock]] — deep dive on Converse API, Knowledge Bases, Guardrails, boto3 patterns
- [[security/owasp-llm-top10]] — cloud-specific AI security considerations (IAM, supply chain)

## Open Questions

- When does the Bedrock latency overhead become significant enough to switch to direct Anthropic API?
- What are the data residency guarantees for Bedrock in non-US regions?
- How does Vertex AI Model Garden pricing compare to direct Anthropic API for Claude in production workloads?

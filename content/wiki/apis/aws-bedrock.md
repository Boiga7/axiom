---
type: entity
category: apis
para: resource
tags: [aws, bedrock, converse-api, knowledge-bases, guardrails, rag, boto3, foundation-models]
sources: [raw/inbox/aws-bedrock-websearch-2026-05-02.md]
tldr: Amazon Bedrock is AWS's managed foundation model service. The Converse API provides a unified boto3 interface across Claude, Nova, Llama, Mistral — same call, any model. Knowledge Bases add managed RAG. Guardrails add model-agnostic content safety.
updated: 2026-05-02
---

# Amazon Bedrock

> **TL;DR** Amazon Bedrock is AWS's managed foundation model service. The Converse API provides a unified boto3 interface across Claude, Nova, Llama, Mistral — same call, any model. Knowledge Bases add managed RAG. Guardrails add model-agnostic content safety.

## Key Facts
- Managed service: no infrastructure, pay per token
- `bedrock-runtime` client: inference (Converse API, InvokeModel)
- `bedrock-agent-runtime` client: Knowledge Bases queries, Agent invocation
- `bedrock` client: management (create guardrails, list models, provision throughput)
- Auth via IAM roles — no API keys in code; works with OIDC from GitHub Actions
- Bedrock lags Anthropic direct API by weeks-months for new Claude versions
- Amazon Nova models (nova-micro/lite/pro/premier) are Bedrock-exclusive

---

## Converse API

The recommended primary interface for all new Bedrock applications. Unified request format across all models. Switch from Claude to Llama to Amazon Nova without changing call structure.

```python
import boto3

client = boto3.client("bedrock-runtime", region_name="us-east-1")

response = client.converse(
    modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
    system=[{"text": "You are an expert AI engineer."}],
    messages=[
        {"role": "user", "content": [{"text": "Explain KV cache in transformers."}]}
    ],
    inferenceConfig={
        "maxTokens": 1024,
        "temperature": 0.3,
    }
)

text = response["output"]["message"]["content"][0]["text"]
```

### Streaming

```python
response = client.converse_stream(
    modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
    messages=[{"role": "user", "content": [{"text": "Write a haiku about gradient descent."}]}],
)

for event in response["stream"]:
    if "contentBlockDelta" in event:
        print(event["contentBlockDelta"]["delta"]["text"], end="", flush=True)
```

### Tool Use (Function Calling)

```python
tools = [
    {
        "toolSpec": {
            "name": "get_stock_price",
            "description": "Get the current stock price for a ticker symbol.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string", "description": "Stock ticker symbol, e.g. AAPL"}
                    },
                    "required": ["ticker"]
                }
            }
        }
    }
]

response = client.converse(
    modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
    messages=[{"role": "user", "content": [{"text": "What is Apple's stock price?"}]}],
    toolConfig={"tools": tools}
)

# Check if model wants to use a tool
if response["stopReason"] == "tool_use":
    tool_call = response["output"]["message"]["content"][0]["toolUse"]
    tool_name = tool_call["name"]          # "get_stock_price"
    tool_input = tool_call["input"]        # {"ticker": "AAPL"}
    tool_use_id = tool_call["toolUseId"]
    
    # Execute tool, then send result back
    result = fetch_stock_price(tool_input["ticker"])
    
    follow_up = client.converse(
        modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
        messages=[
            {"role": "user", "content": [{"text": "What is Apple's stock price?"}]},
            {"role": "assistant", "content": response["output"]["message"]["content"]},
            {"role": "user", "content": [{"toolResult": {"toolUseId": tool_use_id, "content": [{"text": str(result)}]}}]}
        ],
        toolConfig={"tools": tools}
    )
```

---

## Model IDs

| Provider | Model ID | Notes |
|---|---|---|
| Anthropic | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Claude 3.5 Sonnet |
| Anthropic | `anthropic.claude-3-haiku-20240307-v1:0` | Claude 3 Haiku, cheapest Claude |
| Anthropic | `anthropic.claude-3-opus-20240229-v1:0` | Claude 3 Opus |
| Amazon | `amazon.nova-micro-v1:0` | Text only, fastest/cheapest |
| Amazon | `amazon.nova-lite-v1:0` | Text + vision |
| Amazon | `amazon.nova-pro-v1:0` | Most capable Nova |
| Amazon | `amazon.nova-premier-v1:0` | Top tier Nova |
| Meta | `meta.llama4-scout-17b-instruct-v1:0` | Llama 4 Scout |
| Meta | `meta.llama3-3-70b-instruct-v1:0` | Llama 3.3 70B |
| Mistral | `mistral.mistral-7b-instruct-v0:2` | Mistral 7B |

List all available models programmatically:
```python
bedrock = boto3.client("bedrock", region_name="us-east-1")
models = bedrock.list_foundation_models()["modelSummaries"]
```

---

## Knowledge Bases

Managed RAG service. AWS handles document ingestion (from S3), chunking, embedding, and vector storage. You query at runtime. No vector DB to maintain.

### Two Query Modes

**`retrieve`** — returns relevant chunks; you do the generation yourself (use with Converse API for full control):
```python
agent_runtime = boto3.client("bedrock-agent-runtime", region_name="us-east-1")

response = agent_runtime.retrieve(
    knowledgeBaseId="ABCDEF1234",
    retrievalQuery={"text": "What is our refund policy?"},
    retrievalConfiguration={
        "vectorSearchConfiguration": {"numberOfResults": 5}
    }
)

chunks = [r["content"]["text"] for r in response["retrievalResults"]]
scores = [r["score"] for r in response["retrievalResults"]]
```

**`retrieve_and_generate`** — end-to-end RAG; returns answer + citations (fastest path):
```python
response = agent_runtime.retrieve_and_generate(
    input={"text": "What is our refund policy?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": "ABCDEF1234",
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
            "retrievalConfiguration": {
                "vectorSearchConfiguration": {"numberOfResults": 5}
            }
        }
    }
)

answer = response["output"]["text"]
citations = response["citations"]  # list of source document locations
```

### Retrieve + Converse Pattern (Full Control)

```python
# Step 1: retrieve relevant chunks
retrieved = agent_runtime.retrieve(
    knowledgeBaseId="ABCDEF1234",
    retrievalQuery={"text": query},
    retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 5}}
)
context = "\n\n".join(r["content"]["text"] for r in retrieved["retrievalResults"])

# Step 2: generate with context in system prompt
response = client.converse(
    modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
    system=[{"text": f"Answer using only this context:\n\n{context}"}],
    messages=[{"role": "user", "content": [{"text": query}]}]
)
```

---

## Guardrails

Model-agnostic content safety layer. Applied at inference time via `guardrailConfig` in the Converse API. Works with any Bedrock model.

### Creating a Guardrail

```python
bedrock = boto3.client("bedrock", region_name="us-east-1")

response = bedrock.create_guardrail(
    name="production-safety",
    description="Block harmful content and PII",
    contentPolicyConfig={
        "filtersConfig": [
            {"type": "HATE",     "inputStrength": "HIGH",   "outputStrength": "HIGH"},
            {"type": "VIOLENCE", "inputStrength": "MEDIUM", "outputStrength": "HIGH"},
            {"type": "SEXUAL",   "inputStrength": "HIGH",   "outputStrength": "HIGH"},
            {"type": "INSULTS",  "inputStrength": "MEDIUM", "outputStrength": "MEDIUM"},
        ]
    },
    topicPolicyConfig={
        "topicsConfig": [
            {
                "name": "legal-advice",
                "definition": "Providing specific legal advice or opinions on legal matters",
                "examples": ["Am I liable for...", "Is it legal to..."],
                "type": "DENY"
            }
        ]
    },
    sensitiveInformationPolicyConfig={
        "piiEntitiesConfig": [
            {"type": "EMAIL",       "action": "ANONYMIZE"},
            {"type": "PHONE",       "action": "ANONYMIZE"},
            {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "BLOCK"},
        ]
    }
)

guardrail_id = response["guardrailId"]
guardrail_version = response["version"]
```

### Using a Guardrail with Converse

```python
response = client.converse(
    modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
    messages=[{"role": "user", "content": [{"text": user_input}]}],
    guardrailConfig={
        "guardrailIdentifier": guardrail_id,
        "guardrailVersion": guardrail_version,
        "trace": "enabled"   # returns guardrail action in response
    }
)

# Check if guardrail intervened
if response.get("trace", {}).get("guardrail", {}).get("inputAssessment"):
    # Input was modified or blocked
    pass
```

---

## Bedrock Agents

Managed ReAct orchestration. Define an agent with instructions and action groups (tools as Lambda functions or OpenAPI schemas). AWS manages the reasoning loop.

```python
# Invoke a deployed Bedrock Agent
agent_runtime = boto3.client("bedrock-agent-runtime", region_name="us-east-1")

response = agent_runtime.invoke_agent(
    agentId="AGENT123",
    agentAliasId="ALIAS456",
    sessionId="session-001",
    inputText="Book a meeting with Alice for Thursday at 2pm",
)

# Response is a streaming EventStream
for event in response["completion"]:
    if "chunk" in event:
        print(event["chunk"]["bytes"].decode(), end="")
```

For custom agent frameworks, prefer the Strands Agents SDK (AWS open-source, wraps Converse API with KB + Guardrails integration) or build directly with the Converse API.

---

## IAM Permissions

Minimum permissions needed:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Converse",
        "bedrock:ConverseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": "arn:aws:bedrock:us-east-1:123456789012:knowledge-base/ABCDEF1234"
    }
  ]
}
```

Use OIDC (GitHub Actions → AWS role assumption). Never embed AWS credentials in code.

---

## Bedrock vs Direct Anthropic API

| Factor | Bedrock | Direct Anthropic API |
|---|---|---|
| Setup | More (IAM, region, model ARN) | Simple (API key) |
| Latest Claude models | Weeks-months delay | Day-of release |
| Auth | IAM roles (no secrets in code) | API key |
| VPC / no external calls | Yes | No |
| Managed RAG | Knowledge Bases (built-in) | Build yourself |
| Content safety | Guardrails (model-agnostic) | Claude's built-in only |
| Amazon Nova models | Yes (exclusive) | No |
| Compliance / data residency | AWS regions | Limited |

**Rule of thumb**: use direct API for rapid prototyping and when you need the latest Claude. Use Bedrock when you're building on AWS infrastructure, need IAM auth, or want managed RAG/Guardrails.

---

## Project Mantle (2026)

AWS announced Project Mantle to allow teams using the OpenAI API format to run on Bedrock without code changes. Provides an OpenAI-compatible endpoint (`/v1/chat/completions`) backed by Bedrock models. Useful for migrating existing OpenAI-based applications. [unverified. Check current availability]

---

## Common Failure Cases

**`botocore.exceptions.NoCredentialsError` in local dev after IAM role works in production**  
Why: local dev uses no role assumption by default; the SDK looks for credentials in env vars, `~/.aws/credentials`, or instance metadata — none are present.  
Detect: `NoCredentialsError: Unable to locate credentials` when running locally.  
Fix: run `aws configure` with a dev IAM user; or set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` env vars; never use production credentials locally.

**Converse API returns `ModelNotReadyException` for a newly requested model**  
Why: Claude models on Bedrock require explicit enablement in the AWS console before use; they're not available by default.  
Detect: `ValidationException: Access denied to model ... model access has not been enabled for this model`.  
Fix: go to Bedrock → Model access → enable the specific model in each region you need it; enablement takes 1-5 minutes.

**Knowledge Base `retrieve` returns empty results despite documents being ingested**  
Why: the S3 sync job may still be in progress; or the document format isn't supported natively (e.g., password-protected PDFs).  
Detect: `retrieve()` returns `retrievalResults: []`; check the Knowledge Base sync job status in the console.  
Fix: wait for the ingestion job to reach `COMPLETE` status; check that documents are in supported formats (PDF, DOCX, TXT, HTML, CSV).

**Guardrail blocks a legitimate request because a topic policy is too broad**  
Why: topic policy definitions use LLM-based classification; overly broad definitions ("anything legal-related") block valid business questions.  
Detect: user complaints about blocked requests that shouldn't be blocked; `guardrailAction: BLOCKED` in the trace response.  
Fix: add negative examples to the topic policy (`examples` field); narrow the definition; use `trace: "enabled"` to inspect what triggered the block.

**Converse API tool call loop fails when tool result is too large for the context**  
Why: Bedrock has a per-message size limit; if a tool returns a large JSON response (>50KB), the follow-up Converse call raises a `ValidationException`.  
Detect: `ValidationException: Input is too long` after a tool result is appended to the messages list.  
Fix: truncate or summarise tool results before returning them to the model; use pagination for large tool outputs.

## Connections

- [[apis/anthropic-api]] — direct Claude API; compare to Bedrock's Converse API for Claude
- [[cloud/aws-core]] — IAM, OIDC, VPC — the AWS primitives Bedrock relies on
- [[cloud/github-actions]] — OIDC role assumption pattern for Bedrock in CI/CD
- [[rag/pipeline]] — Bedrock Knowledge Bases is a managed alternative to building RAG pipelines
- [[security/owasp-llm-top10]] — Guardrails addresses several OWASP LLM Top 10 items
- [[infra/vector-stores]] — Bedrock Knowledge Bases manages vector storage internally
- [[agents/strands-agents-sdk]] — AWS open-source agent framework that wraps the Converse API; the recommended Bedrock-native agent SDK
- [[infra/litellm]] — use LiteLLM to call Bedrock models via an OpenAI-compatible interface

## Open Questions

- When will Claude Sonnet 4.6 / Opus 4.7 arrive on Bedrock? (currently lagging)
- How does Bedrock Guardrails grounding check compare to building your own faithfulness eval with RAGAS?
- Is Project Mantle GA or still preview as of mid-2026?

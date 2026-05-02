---
type: entity
category: infra
para: resource
tags: [litellm, provider-abstraction, ai-gateway, openai-compatible, routing, cost-tracking, proxy]
sources: [raw/inbox/litellm-websearch-2026-05-02.md]
tldr: LiteLLM is a Python SDK and self-hosted proxy that gives a single OpenAI-compatible interface to 100+ LLM providers — Claude, GPT, Gemini, Bedrock, Mistral, and more. Drop it in to switch providers without rewriting code.
updated: 2026-05-02
---

# LiteLLM

> **TL;DR** LiteLLM is a Python SDK and self-hosted proxy that gives a single OpenAI-compatible interface to 100+ LLM providers — Claude, GPT, Gemini, Bedrock, Mistral, and more. Drop it in to switch providers without rewriting code.

## Key Facts
- Open-source (MIT), built by BerriAI
- Two modes: Python SDK (in-process) and Proxy Server (self-hosted AI gateway)
- All provider calls translated to OpenAI format — same code, any model
- Router: retry, fallback, load balancing, cost-based routing across deployments
- Built-in cost tracking, spend limits, guardrails, and observability callbacks
- Works with: LangChain, LlamaIndex, Instructor, any OpenAI SDK client
- Used in production at scale; Strands Agents SDK uses LiteLLM for non-Bedrock providers

---

## Python SDK — Basic Usage

```python
from litellm import completion

# Anthropic Claude
response = completion(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Explain attention in transformers."}]
)

# OpenAI GPT
response = completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain attention in transformers."}]
)

# Google Gemini
response = completion(
    model="gemini/gemini-2.5-pro",
    messages=[{"role": "user", "content": "Explain attention in transformers."}]
)

# AWS Bedrock
response = completion(
    model="bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0",
    messages=[{"role": "user", "content": "Explain attention in transformers."}]
)

# All return the same response format — OpenAI ChatCompletion schema
text = response.choices[0].message.content
```

### Async

```python
from litellm import acompletion

response = await acompletion(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "What is GRPO?"}]
)
```

### Streaming

```python
response = completion(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "List 5 RAG improvements."}],
    stream=True
)
for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

---

## Router — Retry, Fallback, Load Balancing

```python
from litellm import Router

router = Router(
    model_list=[
        {
            "model_name": "gpt-4o",           # alias clients use
            "litellm_params": {
                "model": "gpt-4o",
                "api_key": "sk-openai-...",
            }
        },
        {
            "model_name": "gpt-4o",           # same alias — second deployment for load balancing
            "litellm_params": {
                "model": "azure/gpt-4o-deployment",
                "api_base": "https://my-azure.openai.azure.com",
                "api_key": "...",
            }
        },
        {
            "model_name": "claude-fallback",
            "litellm_params": {
                "model": "claude-sonnet-4-6",
                "api_key": "sk-ant-...",
            }
        }
    ],
    fallbacks=[{"gpt-4o": ["claude-fallback"]}],   # fallback chain
    num_retries=3,
    retry_after=5,
)

response = await router.acompletion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**Routing strategies:** round-robin (default), least-busy, latency-based, cost-based.

---

## Proxy Server (AI Gateway)

Self-hosted OpenAI-compatible endpoint. Any client that speaks OpenAI works with it. Including the official `openai` Python SDK, LangChain, LlamaIndex, Cursor, etc.

### Running the proxy

```bash
pip install litellm[proxy]

# config.yaml
cat > litellm_config.yaml << 'EOF'
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: sk-openai-...

  - model_name: claude-sonnet
    litellm_params:
      model: claude-sonnet-4-6
      api_key: sk-ant-...

  - model_name: bedrock-claude
    litellm_params:
      model: bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0
      aws_region_name: us-east-1

general_settings:
  master_key: sk-my-master-key   # API key for the proxy itself
EOF

litellm --config litellm_config.yaml --port 4000
```

### Calling the proxy

```python
# Any OpenAI SDK client works — just point base_url at the proxy
from openai import OpenAI

client = OpenAI(
    api_key="sk-my-master-key",
    base_url="http://localhost:4000"
)

response = client.chat.completions.create(
    model="claude-sonnet",          # proxy model alias
    messages=[{"role": "user", "content": "Hello"}]
)
```

---

## Cost Tracking

```python
import litellm

litellm.success_callback = ["langfuse"]   # or "langsmith", "helicone", custom

response = completion(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Hello"}],
    metadata={"user_id": "user-123", "project": "evalcheck"}
)

# Cost available in response
print(response._hidden_params["response_cost"])  # e.g. 0.000234
```

### Budget limits

```python
# In proxy config — hard-stop a user when they exceed $10
general_settings:
  max_budget: 10
  budget_duration: "1d"
```

---

## Environment Variables

LiteLLM reads provider credentials from environment variables. No config needed for the SDK if vars are set:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export AZURE_API_KEY="..."
export AZURE_API_BASE="https://my-resource.openai.azure.com"
export GOOGLE_API_KEY="..."
# AWS Bedrock: uses standard boto3 env vars (AWS_REGION, etc.) or IAM role
```

---

## When to Use LiteLLM

| Scenario | Use LiteLLM | Alternative |
|---|---|---|
| Need to swap providers without code change | Yes | — |
| A/B testing two models | Yes (router) | — |
| Building a multi-tenant LLM service | Yes (proxy + virtual keys) | Build custom |
| Hard budget limits per user/project | Yes (proxy) | — |
| Single provider, direct API | No overhead | Direct SDK |
| Already using LangChain | Optional (LC has native provider support) | LangChain integrations |

**Rule of thumb:** use the Python SDK for application code that needs provider flexibility; use the proxy when you need a shared gateway across multiple services or want to centralise routing and cost tracking.

---

## LiteLLM vs Alternatives

| | LiteLLM | Direct provider SDK | Helicone | custom gateway |
|---|---|---|---|---|
| Provider coverage | 100+ | 1 | Any (via proxy) | Any |
| OpenAI compatible | Yes | Anthropic: no | Yes | Custom |
| Self-hosted | Yes | N/A | Yes / cloud | Yes |
| Cost tracking | Built-in | No | Built-in | Build |
| Complexity | Low | Lowest | Low | High |

---

## Common Failure Cases

**Provider-specific parameter silently dropped when using LiteLLM SDK**  
Why: LiteLLM maps to the OpenAI schema; parameters like `betas` (extended thinking), `cache_control`, or `system` with array format are stripped or ignored when the target provider uses a different schema.  
Detect: the feature works when calling the provider directly but not through `litellm.completion()`; no error is raised, the parameter is silently ignored.  
Fix: pass provider-specific kwargs via the `extra_body` parameter or call the provider SDK directly for features that have no OpenAI equivalent; check LiteLLM docs for the provider's supported params.

**Router fallback fires but returns a response from the wrong model tier**  
Why: when the primary model fails and the fallback is a cheaper/weaker model, the router succeeds from litellm's perspective but the response quality drops without the caller being notified.  
Detect: responses degrade intermittently; `response.model` in the litellm response object shows the fallback model name, not the primary.  
Fix: inspect `response.model` after every call when quality matters; set `allowed_fails` low and monitor `x-litellm-model-used` header on proxy responses; alert when fallback rate exceeds threshold.

**Proxy master key leaks because it is the only access control**  
Why: the LiteLLM proxy uses a single `master_key` for authentication; if it leaks, all providers and budget limits are bypassed.  
Detect: unexpected spend on provider dashboards; no per-user audit trail in proxy logs.  
Fix: create virtual keys per team or service via the proxy's `/key/generate` endpoint; set per-key spend limits; rotate the master key and treat it like a root credential.

**Cost tracking shows $0 for Bedrock models**  
Why: LiteLLM's cost database does not always include new Bedrock model variants; if the model string is unrecognised the cost is reported as zero rather than raising an error.  
Detect: `response._hidden_params["response_cost"]` returns `0.0` for Bedrock calls even when tokens were consumed.  
Fix: add a custom pricing entry for the model via `litellm.model_cost["bedrock/..."] = {...}`; or read token counts directly and calculate cost separately.

**Async `acompletion` calls deadlock inside a sync FastAPI endpoint**  
Why: calling `await litellm.acompletion()` inside a `def` (sync) route handler runs the coroutine on the wrong event loop, causing a deadlock or `RuntimeError: no running event loop`.  
Detect: FastAPI route hangs indefinitely on the first LLM call; no timeout or error is raised.  
Fix: use `async def` route handlers with `await litellm.acompletion()`; or use `litellm.completion()` (sync) inside sync routes.

## Connections

- [[apis/anthropic-api]] — direct Claude API; LiteLLM translates to/from this
- [[apis/aws-bedrock]] — Bedrock via LiteLLM uses the bedrock/ prefix on model names
- [[observability/helicone]] — Helicone is an alternative AI gateway with overlapping features
- [[observability/platforms]] — LiteLLM integrates with Langfuse, LangSmith for tracing
- [[agents/strands-agents-sdk]] — Strands uses LiteLLM for non-Bedrock model providers
- [[infra/caching]] — LiteLLM proxy supports semantic caching

## Open Questions

- How does LiteLLM handle provider-specific features (prompt caching, extended thinking) that have no OpenAI equivalent?
- At what request volume does the proxy overhead become significant vs calling providers directly?

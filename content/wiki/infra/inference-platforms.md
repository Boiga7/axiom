---
type: concept
category: infra
para: resource
tags: [inference, serving, together-ai, fireworks, groq, cerebras, modal, replicate, baseten, serverless, open-weight]
sources: []
updated: 2026-05-03
tldr: "Serverless inference for open-weight models is a distinct market from managed proprietary APIs — Together AI leads on model breadth, Fireworks on raw latency, Groq/Cerebras on exotic silicon, Modal/Replicate on custom weights."
---

# Serverless Inference Platforms

> **TL;DR** Serverless inference for open-weight models is a distinct market from managed proprietary APIs — Together AI leads on model breadth, Fireworks on raw latency, Groq/Cerebras on exotic silicon, Modal/Replicate on custom weights.

Every AI engineer deploying open-weight models (Llama, Mistral, Qwen, DeepSeek R1, Gemma) faces the same infrastructure decision: manage your own GPU cluster (via [[infra/inference-serving]]), or buy API access from a serverless platform. The serverless route removes ops overhead but introduces vendor dependency, variable pricing, and model selection constraints.

The decision is non-trivial. Cost per million tokens varies by 5-10x across providers for the same model. Latency varies by 3-5x. Enterprise SLAs and compliance posture vary enormously. And not every model is available everywhere.

---

## Why This Decision Matters

**You are choosing between fundamentally different cost structures.** Anthropic and OpenAI charge $3-15/M tokens for frontier proprietary models. Llama 3.3 70B on Together or Fireworks runs ~$0.90/M — a 3-15x reduction depending on workload. For bulk batch processing or high-volume classification, this gap is the difference between a product being viable or not.

**Latency differences are real and hardware-driven.** Groq's LPU produces 500+ tokens/second on Llama 3.3 70B. Standard GPU-based providers produce 150-300 tokens/second. For real-time voice agents or interactive chat where time-to-first-token dominates UX, hardware architecture matters.

**Model availability constrains what you can run.** Not every open-weight model is available everywhere. Groq's curated selection (~30 models) is narrower than Together AI's 200+. If you need a fine-tuned variant, a recently released model, or a custom architecture, Together, Modal, or Replicate may be the only viable options.

---

## Provider Profiles

### Together AI

**Position:** Broadest model catalog, best for teams wanting flexibility.

200+ open-weight models including Llama 4, DeepSeek R1, Qwen 2.5, Gemma 3, Mistral/Mixtral, and many fine-tuned variants. The largest catalog of any dedicated inference provider.

- OpenAI-compatible API (`base_url = "https://api.together.xyz/v1"`)
- Fine-tuning pipeline built in — train on Together's GPUs, deploy from Together
- Bare GPU cluster rentals for workloads that outgrow serverless
- Llama 3.3 70B: ~$0.90/M tokens, ~917 TPS throughput, ~0.78s TTFT

**Best for:** Teams needing an unusual model or fine-tuned variant, researchers, or applications that cycle across many model families.

**Trade-off:** Slower TTFT than Fireworks on standard models (~220ms vs ~150ms for Llama 3.3 70B in published benchmarks).

---

### Fireworks AI

**Position:** Fastest raw latency, best for tool-heavy agentic workloads.

Proprietary FireAttention inference kernel — a custom attention implementation that outperforms standard GPU serving on throughput and TTFT. Curated catalog (~50 models) selected for production readiness.

- OpenAI-compatible API (`base_url = "https://api.fireworks.ai/inference/v1"`)
- First-class function calling and structured output — critical for agent tool loops
- Llama 3.3 70B: ~$0.90/M tokens, ~747 TPS throughput, ~150ms TTFT
- Aggressive speculative decoding for Llama family models

**Best for:** Latency-bound agent loops, function-calling-heavy pipelines, production applications where tail latency drives UX. Fireworks is the default latency recommendation for interactive workloads that are not real-time audio.

**Trade-off:** Narrower model catalog than Together AI; if your model is not in their catalog, it may not be available at all.

> [Source: Northflank comparison, Infrabase AI Q2 2026, 2026-05-03]

---

### Groq

**Position:** Exotic silicon for maximum tokens-per-second; real-time voice and interactive apps.

Groq built a Language Processing Unit (LPU) — a deterministic, memory-bandwidth-optimised chip that is fundamentally not a GPU. SRAM-based execution eliminates the memory bottleneck that limits GPU throughput. Acquired by Nvidia for ~$20B in December 2025; Groq continues operating as an independent company under a non-exclusive IP license.

- LPU architecture: SRAM-based, deterministic execution (no CUDA scheduler overhead)
- Llama 3 8B: ~877-2,100 tokens/second; Llama 3.3 70B: ~284-500 tokens/second
- Model selection: ~30 curated models (Llama, Mixtral, Gemma, Whisper) — narrower than competitors
- OpenAI-compatible API (`base_url = "https://api.groq.com/openai/v1"`)
- Llama 3.1 8B: ~$0.06/M; Llama 3.3 70B: ~$0.64/M
- Meta partnership for official Llama API (April 2025)

**Best for:** Real-time voice agents where 200ms latency targets are hard constraints, interactive chat where streaming-start latency matters more than throughput, any workload where the user experiences the speed directly.

**Trade-off:** Narrowest model selection of the three major providers. No support for custom or fine-tuned models. Rate limits are tighter on free/starter tiers.

> [Source: Groq newsroom, Artificial Analysis, Introl blog, 2026-05-03]

---

### Cerebras

**Position:** Wafer-scale silicon for extreme throughput; enterprise OpenAI infrastructure partner.

The Wafer Scale Engine (WSE-3) is a single chip the size of a full 300mm silicon wafer: 46,225 mm² die area (57x larger than Nvidia H100), 4 trillion transistors, 900,000 cores, 44 GB on-chip SRAM. [unverified — based on Cerebras published specs]

- $10B multi-year compute deal with OpenAI announced January 2026; powering OpenAI's Codex-Spark model (February 2026) [unverified — mark for verification against Cerebras/OpenAI press releases]
- AWS partnership for Bedrock integration using WSE-3, announced March 2026 [unverified]
- Claims 15x lower latency than GPU-based solutions for supported model sizes
- IPO filing in 2026 at ~$23B valuation [unverified]
- Primary market: enterprise customers via cloud partnerships, not direct developer API

**Best for:** Enterprise teams accessing Cerebras via AWS Bedrock or OpenAI infrastructure; not a direct developer API in the same sense as Together/Fireworks/Groq.

**Trade-off:** Not a general-purpose developer API — availability is primarily through platform partners. Model selection is constrained to what Cerebras has optimised for their architecture.

---

### Modal

**Position:** Serverless GPU platform for custom containers and fine-tuned models.

Modal is not an inference provider in the same sense as Together or Fireworks — it is a serverless compute platform where you deploy your own model weights, your own serving code, and your own inference stack. You write Python functions, Modal handles packaging, scaling, and billing per second of GPU time.

- $87M Series B (September 2025), $1.1B valuation
- Cold starts: 2-4 seconds via warm container pooling
- Any model, any framework — vLLM, TGI, llama.cpp, custom code
- Pay per second of GPU time (no minimum, scales to zero)
- Full custom container support — install anything, expose any port

**Best for:** Teams with fine-tuned model weights, non-standard inference setups, custom tokenisers or serving logic, or experimental model architectures not available on managed providers.

**Trade-off:** More ops overhead than Together/Fireworks. You own the serving code, which means you own the failure modes. Cold starts matter if your traffic is bursty. Not suitable as a drop-in replacement for managed API providers if you want zero-maintenance serving.

---

### Replicate

**Position:** Model marketplace for fast prototyping and low-volume experimentation.

Replicate is a marketplace of model-as-API endpoints. Any HuggingFace model can be deployed and exposed as a REST endpoint in minutes. Thousands of models available, including image generation, audio, and video alongside LLMs.

- Widest raw model variety of any platform (including image gen, audio, video)
- Easy to try any model in minutes — no infra setup
- Cold starts: 16-60+ seconds for custom models (unsuitable for latency-sensitive production)
- Pay-per-prediction pricing

**Best for:** Prototyping, demos, low-volume research experiments, accessing obscure model variants. Not for production-scale cost efficiency or latency-sensitive applications.

**Trade-off:** Cold start latency is prohibitive for production. Per-prediction pricing is expensive at volume compared to dedicated providers.

---

### Baseten

**Position:** Enterprise-grade custom model serving with SLAs.

Baseten focuses on production inference with compliance, SLAs, and enterprise support. Raised $150M Series D in late 2025. Truss framework for packaging PyTorch, TensorFlow, and HuggingFace models into serving containers.

- SLA-backed uptime guarantees — differentiator from Modal/Replicate
- Compliance posture for regulated industries
- Cold starts: 5-10 seconds with container caching; sub-second with pre-warming
- Custom model deployment — any weights, any framework
- Private model hosting — model weights do not leave your deployment environment

**Best for:** Teams with specific compliance requirements (HIPAA, SOC2, financial services), need for private model hosting, or explicit SLA requirements that rule out Replicate/Modal.

**Trade-off:** Per-minute billing hurts short-duration requests. Higher baseline cost than self-managed Modal for equivalent workloads. Less developer-friendly onboarding than Together/Fireworks.

---

## Comparison Matrix

| Provider | Latency | Cost Tier | Model Coverage | OpenAI Compatible | Enterprise SLA | Custom Weights |
|---|---|---|---|---|---|---|
| **Together AI** | Medium (220ms TTFT) | Low ($0.90/M 70B) | Very high (200+) | Yes | Partial | Via fine-tune |
| **Fireworks AI** | Low (150ms TTFT) | Low ($0.90/M 70B) | Medium (~50) | Yes | Partial | Via fine-tune |
| **Groq** | Very low (LPU) | Very low ($0.06-0.64/M) | Low (~30) | Yes | Improving (Nvidia) | No |
| **Cerebras** | Very low (WSE) | Enterprise | Very low | Via partners | Yes (enterprise) | No |
| **Modal** | Variable (cold start 2-4s) | Pay/sec | Any | Self-host | No | Yes |
| **Replicate** | High (cold start 16-60s) | Pay/prediction | Thousands | Partial | No | Yes |
| **Baseten** | Medium (cold start 5-10s) | Medium | Any | Partial | Yes | Yes |

Cost tier reflects relative pricing against proprietary frontier APIs (Anthropic/OpenAI at $3-15/M). "Low" means ~$0.90/M for 70B models — a 3-15x reduction vs frontier APIs.

---

## The OpenAI-Compatible Endpoint Pattern

Every major dedicated inference provider implements the OpenAI Chat Completions API schema. The only change required to switch providers is `base_url` and `api_key`. This is the foundation of multi-provider architecture.

```python
from openai import OpenAI

# Together AI
client = OpenAI(
    api_key="TOGETHER_API_KEY",
    base_url="https://api.together.xyz/v1",
)

# Fireworks AI
client = OpenAI(
    api_key="FIREWORKS_API_KEY",
    base_url="https://api.fireworks.ai/inference/v1",
)

# Groq
client = OpenAI(
    api_key="GROQ_API_KEY",
    base_url="https://api.groq.com/openai/v1",
)

# Same call works for all three
response = client.chat.completions.create(
    model="meta-llama/Llama-3.3-70B-Instruct",  # model naming varies by provider
    messages=[{"role": "user", "content": "Explain KV cache."}],
    max_tokens=512,
)
```

This pattern enables [[infra/litellm]]-style provider abstraction or [[infra/model-routing]] without architectural changes. The `base_url` becomes a configuration value, not a code dependency.

---

## Multi-Provider Routing Strategy

Do not commit to a single provider. Route by workload class:

| Workload class | Provider | Reason |
|---|---|---|
| Real-time voice, sub-200ms required | Groq | LPU throughput; lowest TTFT |
| Interactive chat, agent tool loops | Fireworks | FireAttention + function calling |
| Batch processing, diverse model needs | Together AI | Best cost at volume; widest catalog |
| Fine-tuned or custom weights | Modal | Full container control |
| Enterprise with SLA requirement | Baseten | SLA-backed, compliance posture |
| Prototyping / exploration | Replicate | Fastest to try any model |

The canonical production architecture pairs **Groq or Fireworks** (real-time) with **Together AI** (batch/bulk) and **Modal** (custom) as three independent clients behind a routing layer. Switching between them requires only changing `base_url`.

This also provides resilience: if one provider has an outage or rate limits, the routing layer falls back without application code changes. See [[infra/litellm]] for a proxy that manages this across providers.

---

## Cost Context vs Proprietary APIs

Rough order of magnitude for Llama 3.3 70B vs frontier proprietary APIs:

| | Input $/M | Output $/M |
|---|---|---|
| Anthropic Claude Sonnet 4.6 | $3.00 | $15.00 |
| OpenAI GPT-4o | $2.50 | $10.00 |
| Together / Fireworks Llama 3.3 70B | ~$0.90 | ~$0.90 |
| Groq Llama 3.3 70B | $0.59 | $0.79 |
| Groq Llama 3.1 8B | $0.06 | $0.06 |

Open-weight models on dedicated inference providers run 3-15x cheaper than frontier proprietary APIs. The quality gap depends on task: for structured extraction, summarisation, and classification, Llama 3.3 70B is often competitive with GPT-4o. For complex reasoning, code generation at frontier difficulty, and multi-step agent tasks, the proprietary gap remains real.

See [[synthesis/cost-optimisation]] for the full cost reduction stack combining routing, caching, and batch processing.

---

## Connections

- [[infra/inference-serving]] — self-hosting via vLLM, llama.cpp, TensorRT-LLM when you manage your own GPUs
- [[infra/litellm]] — OpenAI-compatible proxy that abstracts all providers into one interface
- [[infra/model-routing]] — difficulty-based routing (RouteLLM, FrugalGPT) to cut frontier model usage
- [[infra/gpu-hardware]] — when to own GPUs vs buy serverless
- [[llms/model-families]] — which open-weight models are worth deploying on these platforms
- [[agents/voice-agents]] — Groq is the primary recommendation for real-time voice agent latency budgets
- [[synthesis/cost-optimisation]] — full seven-lever cost framework
- [[apis/anthropic-api]] — the proprietary alternative (Claude); prompt caching and Batch API for cost reduction

## Open Questions

- How does Groq's LPU perform post-Nvidia acquisition — does the technology roadmap change?
- At what token volume does self-hosting vLLM on reserved cloud GPUs break even against Together AI pricing?
- Does Cerebras's WSE become available as a direct developer API or remain enterprise-only through cloud partners?

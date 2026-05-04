---
type: synthesis
category: llms
tags: [gpt, gemini, llama, mistral, deepseek, qwen, model-families, comparison]
sources: []
updated: 2026-05-01
para: resource
tldr: The eight major LLM families (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Qwen, Cohere) compared by capability tier, licensing, and best use case.
---

# LLM Model Families

> **TL;DR** The eight major LLM families (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Qwen, Cohere) compared by capability tier, licensing, and best use case.

The major model families an AI engineer needs to know. Each has a different origin, architecture emphasis, and best use case.

---

## OpenAI (GPT / o-series)

**GPT-4o:** Unified audio/vision/text model. The workhorse for most OpenAI-based products. Best multimodal support among proprietary models. 128K context.

**GPT-4o-mini:** Fast and cheap ($0.15/$0.60 per M). The default choice when GPT quality is needed at low cost.

**o1 / o3:** Reasoning models with internal chain-of-thought (not exposed to users). o3 is OpenAI's strongest model as of April 2026, competitive with Claude Opus 4.x on reasoning tasks. Higher latency and cost. No temperature parameter.

**Positioning:** OpenAI has the largest developer ecosystem, the most integrations, and the most widely supported API format. Revenue ~$24-25B ARR (April 2026) but burning ~$25B/year. See [[landscape/ai-labs]].

---

## Anthropic (Claude)

See [[llms/claude]] for full treatment.

**Claude Opus 4.7 / 4.6:** Frontier reasoning, 80.8% SWE-bench, 91.3% GPQA. Best for hardest code and research synthesis tasks.

**Claude Sonnet 4.6:** 79.6% SWE-bench at $3/$15 per M. Default production recommendation — near-Opus quality at 40% lower cost.

**Claude Haiku 4.5:** 73.3% SWE-bench at $1/$5. High-volume tasks.

**Positioning:** Strongest safety guarantees (RSP). Best at long document understanding and instruction following. Surpassed OpenAI in revenue (April 2026). 1M token context across all models.

---

## Google (Gemini)

**Gemini 2.5 Pro:** Google's frontier model. 1M token context became standard partly because of Gemini. Strong reasoning, competitive with Claude Opus on MMLU. Best-in-class for Google Workspace integration.

**Gemini 2.5 Flash:** Fast tier. Competitive with GPT-4o-mini and Claude Haiku.

**Gemma 3:** Google's open-weights family. 1B, 4B, 12B, 27B sizes. Strong at instruction following, runs on consumer hardware. Apache 2.0 license.

**Positioning:** 650M monthly active Gemini users (April 2026). Google invested $40B in Anthropic. Native integration with Google Cloud, Workspace, Search. Code-named Gemini 3 in development [unverified].

---

## Meta (Llama)

The anchor of the open-source LLM ecosystem.

**Llama 3.1 / 3.2 / 3.3:**
- 8B, 70B, 405B parameter sizes
- 128K context window
- Commercial use allowed (Meta's custom license — most commercial use permitted)
- Best open-source models at each parameter tier as of late 2024

**Llama 3.2 Vision:** Multimodal variants (11B, 90B). First open multimodal models competitive with GPT-4V.

```python
# Via HuggingFace
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
    torch_dtype="auto",
    device_map="auto",
)
```

**Positioning:** Meta's strategy is open weights as competitive moat — weaken proprietary competitors by commoditising the base model. FAIR (Fundamental AI Research) drives the research.

---

## Mistral AI

European lab. All models are either fully open (Apache 2.0) or commercially licensed.

**Mistral 7B:** Punched above its weight when released (2023). Still a strong baseline.

**Mixtral 8x7B:** MoE (Mixture of Experts) — 8 experts of 7B each, but only 2 active per forward pass. ~13B active parameters but 47B total. Outperformed GPT-3.5.

**Mistral Large 2 / Mistral Small:** Proprietary closed models. Competitive with GPT-4 class on many benchmarks.

**Codestral:** Mistral's code-focused model. Best open option for code generation.

**Architecture innovation:** Sliding window attention (4,096-token local window; effective reach W × layers through residual connections), GQA (4:1 KV sharing for 4x cache reduction), byte-pair tokeniser optimised for European languages. See [[papers/mistral]] for the full treatment.

---

## DeepSeek

Chinese lab (backed by High-Flyer, a quant hedge fund). Caused significant market disruption in January 2025.

**DeepSeek V3:** 671B MoE model. Claims $5.6M training cost. Competitive with GPT-4o and Claude Sonnet.

**[[llms/deepseek-r1|DeepSeek R1]]:** Reasoning model trained with GRPO (Group Relative Policy Optimization) — no human labels, no reward model, just rule-based rewards. o1-level reasoning. Open weights (MIT license). API is 96% cheaper than o1.

**DeepSeek R1 Distilled:** Smaller models (Qwen 7B/14B/32B, Llama 8B/70B base) distilled from R1. 7B model competitive with GPT-4o on math/coding benchmarks.

```python
# DeepSeek API (OpenAI-compatible)
from openai import OpenAI
client = OpenAI(api_key="DEEPSEEK_KEY", base_url="https://api.deepseek.com")
response = client.chat.completions.create(
    model="deepseek-reasoner",  # R1
    messages=[{"role": "user", "content": "Solve: ∫x²dx"}],
)
```

**Positioning:** R1 proved that RLHF with human labels is not required for frontier reasoning — GRPO on math/code verifiable rewards is sufficient. Significant for the field.

---

## Alibaba (Qwen)

**Qwen 2.5:** 0.5B to 72B parameter open models. Best multilingual (especially Chinese + English). Strong math and coding. Apache 2.0 license.

**Qwen 2.5-Coder:** Specialised code model, 1.5B to 72B. Competitive with Codestral.

**QwQ:** Qwen's reasoning model. Competitive with DeepSeek R1 on math.

**Positioning:** Best choice for Chinese-language applications. Strong open-source community.

---

## Microsoft (Phi)

**Phi-4:** 14B parameter model. Exceptional quality-to-size ratio. Best small model for on-device inference. Trained on "textbook quality" synthetic data.

**Phi-3.5:** 3.8B and 7B. Runs on mobile (iPhone 15 Pro, Pixel 9). Apache 2.0.

**Positioning:** Microsoft's focus is efficiency — maximum capability at minimum parameter count. Key for edge deployment.

---

## Cohere (Command)

**Command R+:** 104B model tuned for enterprise RAG. Best RAG accuracy on long documents among commercial APIs. Built-in citation support, grounding.

**Command R:** 35B. Production RAG at lower cost.

**Positioning:** Cohere is primarily an API company (embeddings + reranking + Command). Strongest product-market fit in enterprise RAG pipelines.

---

## Summary: When to Use Which

| Need | Model |
|---|---|
| Best overall quality | Claude Opus 4.7 or o3 |
| Production default (cost/quality) | Claude Sonnet 4.6 |
| High volume, cheap | Haiku 4.5 or GPT-4o-mini |
| Hard reasoning problems | Claude Opus 4.7, o3, DeepSeek R1 |
| Open weights, self-hosted | Llama 3.1 70B or DeepSeek R1 Distilled 70B |
| Code generation (open) | Codestral or Qwen 2.5-Coder |
| On-device / edge | Phi-4, Gemma 3 4B, Llama 3.2 3B |
| Enterprise RAG | Cohere Command R+ |
| Chinese language | Qwen 2.5 72B |
| Multimodal (open) | Llama 3.2 Vision, Qwen-VL |

---

## Key Facts

- Claude Sonnet 4.6: recommended production default at $3/$15 per M tokens — 1.2pp behind Opus on SWE-bench at 40% lower cost
- o3: OpenAI's strongest model April 2026; no temperature parameter; higher latency than GPT-4o
- Gemini 2.5 Pro: 1M token context; 650M monthly active Gemini users
- Llama 3.1 405B: first open model competitive with GPT-4 at launch; Meta license allows commercial use up to 700M MAU
- Mixtral 8x7B: 47B total params, ~13B active per forward pass; competitive with GPT-3.5
- DeepSeek R1: MIT license; GRPO training with no human labels; API 96% cheaper than o1
- DeepSeek V3: 671B MoE, $5.6M claimed training cost; competitive with GPT-4o and Claude Sonnet
- Cohere Command R+: 104B, purpose-built for enterprise RAG with built-in citation support

## Common Failure Cases

**Selecting a model by parameter count instead of benchmark score leads to a quality regression when switching providers**  
Why: a "70B" Llama model and a "70B" Qwen model are not interchangeable; the same parameter count yields very different capability levels depending on training data, training compute, and alignment tuning; comparing benchmarks (SWE-bench, MMLU) is the correct selection criterion.  
Detect: after switching from one model family to another at the same parameter tier, output quality degrades measurably on your eval set despite the same apparent size.  
Fix: always compare models on a task-specific eval subset before switching; treat parameter count as hardware cost guidance, not quality guidance.

**Using `deepseek-reasoner` (DeepSeek R1) in production without streaming causes multi-minute hangs because R1's extended chain-of-thought reasoning is silently included in `max_tokens`**  
Why: DeepSeek R1 emits internal reasoning tokens before the final answer; if `max_tokens` is set for the expected output length only, the model may run out of token budget mid-reasoning and return an empty or truncated final answer; without streaming, the entire timeout plays out before returning.  
Detect: requests to `deepseek-reasoner` time out or return partial responses; reducing `max_tokens` makes it worse; the model's response appears to start mid-sentence.  
Fix: set `max_tokens` to include both the reasoning trace length and the expected answer length; use streaming to see reasoning tokens as they arrive; or use DeepSeek V3 (non-reasoning) when the reasoning trace is not needed.

**Llama 3.1 405B deployed locally causes out-of-memory errors because the full BF16 weights require ~810GB VRAM**  
Why: 405B parameters × 2 bytes (BF16) = ~810GB; a single A100 80GB has insufficient VRAM; even 8× A100 (640GB) is not enough; only tensor parallelism across 10+ GPUs or INT8 quantisation (405GB) makes local deployment feasible.  
Detect: the model fails to load with `CUDA out of memory`; `nvidia-smi` shows VRAM usage near capacity even before any inference.  
Fix: use INT8 or INT4 quantisation via `bitsandbytes` or GGUF quantisation via `llama.cpp`; or use the API rather than self-hosting for 405B-scale models.

## Connections

- [[llms/claude]] — Claude family in depth
- [[landscape/ai-labs]] — the companies behind these models
- [[landscape/model-timeline]] — chronological release history
- [[landscape/open-source-models]] — open-weight models (Llama, Mistral, DeepSeek, Qwen, Gemma, Phi) in detail
- [[infra/inference-serving]] — serving open models in production
- [[fine-tuning/decision-framework]] — when to fine-tune vs use API
- [[apis/google-ai]] — Gemini and Gemma access via Google AI Studio and Vertex AI

## Open Questions

- At what point does the capability gap between open-weight models and frontier proprietary models become unacceptable for production use cases?
- How does Cohere's RAG-specialised positioning hold up as Claude and GPT-4o improve natively at grounded generation?
- Will MoE architectures (DeepSeek V3, Mixtral) continue to close on dense models at equivalent training compute?

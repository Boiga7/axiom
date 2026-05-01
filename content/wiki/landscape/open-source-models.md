---
type: synthesis
category: landscape
tags: [open-source, llama, mistral, deepseek, qwen, gemma, phi, open-weights]
sources: []
updated: 2026-04-29
para: resource
tldr: Open-weight models (Llama, Mistral, DeepSeek, Qwen, Gemma, Phi) are now credible production choices for most tasks — covering model selection, licensing, hardware requirements, and the specific strengths of each family.
---

# Open-Source and Open-Weight Models

> **TL;DR** Open-weight models (Llama, Mistral, DeepSeek, Qwen, Gemma, Phi) are now credible production choices for most tasks — covering model selection, licensing, hardware requirements, and the specific strengths of each family.

The models you can download, self-host, and fine-tune. The open ecosystem has caught up to frontier proprietary models on many benchmarks — open models are now a credible production choice for most use cases.

---

## Why Open Models

**Cost:** no per-token API charges. At scale (billions of tokens/month), self-hosting beats API cost by 10-100x.
**Privacy:** data never leaves your infrastructure.
**Control:** fine-tune, quantise, serve however you want.
**Latency:** local inference eliminates network round trips.
**No rate limits:** burst as hard as your hardware allows.

**Tradeoffs:** operational overhead (serving infra, updates, monitoring), VRAM costs, no vendor SLA.

---

## The Llama Family (Meta)

The anchor of the open ecosystem. Meta releases open weights under a custom license (most commercial use allowed; restrictions on apps with 700M+ monthly users).

### Llama 3.1

```
Sizes:       8B, 70B, 405B
Context:     128K tokens
Training:    15T tokens (multilingual)
Instruction: Meta-Llama-3.1-{8,70,405}B-Instruct
License:     Meta Llama 3 Community License (commercial OK)
```

**8B:** fits on a single RTX 4090 (24GB) in BF16, or a 16GB GPU in INT4. Best small open model for many tasks.
**70B:** state-of-the-art open model at the 70B tier. Matches GPT-3.5 on most benchmarks.
**405B:** first open model competitive with GPT-4 at launch. Requires multi-GPU (8× A100 for BF16).

```python
from transformers import pipeline

# Quick start
pipe = pipeline(
    "text-generation",
    model="meta-llama/Meta-Llama-3.1-8B-Instruct",
    device_map="auto",
    torch_dtype="auto",
)
messages = [{"role": "user", "content": "Explain attention in one paragraph."}]
result = pipe(messages, max_new_tokens=300)
```

### Llama 3.2 Vision

Multimodal Llama. 11B and 90B variants. First competitive open multimodal model.

### Llama 3.3 70B

Released late 2024. Improved instruction following, 70B at near-405B quality on reasoning.

---

## Mistral Family

European lab. All models MIT or Apache 2.0 licensed. Architecture innovations (sliding window attention, GQA) influenced later models.

### Mistral 7B

```
Params:   7.3B
Context:  32K (sliding window: 4K local attention)
License:  Apache 2.0
VRAM:     14GB BF16, 5GB INT4
```

Strong baseline. First model to beat LLaMA 2 13B at 7B params.

### Mixtral 8x7B

```
Total params:   46.7B
Active params:  12.9B (2 of 8 experts active)
Context:        32K
License:        Apache 2.0
VRAM:           90GB BF16, 24GB INT4
```

MoE architecture: 8 expert FFN layers, router selects 2 per token. Competitive with GPT-3.5, significantly faster than a dense 47B model.

```python
# Via HuggingFace
model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
```

### Codestral

Mistral's code model. 22B, context 32K. Supports fill-in-the-middle (FIM) for code completion. Best open code model at the 22B tier.

---

## DeepSeek Family

Chinese lab. Caused significant disruption in early 2025 by achieving frontier reasoning at fraction of the cost.

### DeepSeek V3

```
Total params:   671B MoE
Active params:  37B (token routing)
Context:        128K
License:        MIT
Training cost:  ~$5.6M claimed (vs estimated $100M+ for comparable proprietary models)
```

Competitive with Claude Sonnet 4.6 and GPT-4o on coding and reasoning.

### DeepSeek R1

```
Architecture:  671B MoE, reasoning model
Training:      GRPO with verifiable rewards (math/code) — no human labels
License:       MIT
Performance:   o1-level on AIME, MATH, SWE-bench
API cost:      96% cheaper than o1
```

Key insight: high-quality reasoning emerged from GRPO with rule-based rewards — no human preference data required. Changed understanding of what's needed for reasoning models.

### DeepSeek R1 Distilled

Smaller models distilled from R1's outputs:

| Model | Base | AIME 2024 |
|---|---|---|
| R1-Distill-Qwen-7B | Qwen 2.5 7B | 55.5% |
| R1-Distill-Qwen-14B | Qwen 2.5 14B | 69.7% |
| R1-Distill-Qwen-32B | Qwen 2.5 32B | 72.6% |
| R1-Distill-Llama-70B | Llama 3.1 70B | 70.0% |

7B distill outperforms GPT-4o on math benchmarks.

---

## Qwen Family (Alibaba)

Strong multilingual performance, especially Chinese-English. Apache 2.0 license.

### Qwen 2.5

```
Sizes:    0.5B, 1.5B, 3B, 7B, 14B, 32B, 72B
Context:  128K
License:  Apache 2.0
Strong:   Chinese + English, math, code
```

Qwen 2.5 72B is competitive with Llama 3.1 70B on English benchmarks and significantly better on Chinese tasks.

### Qwen 2.5-Coder

```
Sizes:   1.5B, 3B, 7B, 14B, 32B, 72B
Context: 128K
Best:    Code generation and completion
```

Competitive with GPT-4o on HumanEval at the 32B tier. Best open code model family as of April 2026.

### QwQ-32B

Qwen's reasoning model. Competitive with DeepSeek R1 on math, open weights.

---

## Gemma (Google)

Apache 2.0 licensed. Lighter-weight models with strong quality-to-size ratio.

### Gemma 3

```
Sizes:    1B, 4B, 12B, 27B
Context:  128K (1M token on some variants)
License:  Gemma Terms of Use (essentially Apache 2.0 for most use)
```

Gemma 3 4B fits on a Raspberry Pi 5 (INT4). 27B competitive with Llama 3.1 70B on some benchmarks.

---

## Phi (Microsoft)

Focus: maximum capability at minimum size.

### Phi-4

```
Params:   14B
Context:  16K
License:  MIT
Strong:   Reasoning, math, code
```

Best 14B model. Trained primarily on synthetic "textbook quality" data rather than web scrapes.

### Phi-3.5

```
Sizes:  3.8B (mini), 7B
Strong: On-device deployment (iPhone, Pixel)
```

---

## Choosing an Open Model

| Need | Recommended |
|---|---|
| Best quality, run locally | Llama 3.1 70B or Qwen 2.5 72B |
| Reasoning (math/code) | DeepSeek R1 Distill 32B or QwQ-32B |
| Smallest footprint | Phi-4 14B or Qwen 2.5 7B |
| MoE efficiency | Mixtral 8x7B or DeepSeek V3 |
| Code generation | Qwen 2.5-Coder 32B or Codestral |
| Chinese language | Qwen 2.5 72B |
| Mobile/edge | Gemma 3 4B or Phi-3.5 mini |
| Commercially safest license | MIT/Apache 2.0: DeepSeek, Qwen, Mistral, Phi |

---

## Running Open Models

See [[infra/inference-serving]] for vLLM (production) and llama.cpp (local).
See [[infra/gpu-hardware]] for GPU requirements.
See [[infra/huggingface]] for loading with `transformers`.

---

## Key Facts

- Llama 3.1 8B: fits on RTX 4090 in BF16; competitive with GPT-3.5 on most benchmarks
- Llama Community License: commercial OK up to 700M monthly active users
- Mixtral 8x7B: 46.7B total params, 12.9B active; competitive with GPT-3.5 at lower compute
- DeepSeek V3 training cost: ~$5.6M claimed (vs estimated $100M+ for comparable proprietary models)
- DeepSeek R1 API: 96% cheaper than o1; MIT license
- DeepSeek R1 Distill Qwen-7B: 55.5% AIME 2024 (outperforms GPT-4o on math)
- Qwen 2.5 72B: competitive with Llama 3.1 70B on English; significantly better on Chinese tasks
- Below ~10M tokens/month: API is cheaper than self-hosting any open model

## Connections

- [[llms/model-families]] — proprietary + open model families compared side by side
- [[landscape/model-timeline]] — when each model was released
- [[landscape/ai-labs]] — the companies behind each model family
- [[fine-tuning/decision-framework]] — when to fine-tune open models vs use them as-is
- [[infra/inference-serving]] — vLLM and llama.cpp for serving open models in production
- [[infra/gpu-hardware]] — VRAM requirements for each model size tier

## Open Questions

- When does Llama 4 ship and does it maintain Meta's track record of best-in-tier quality?
- How does QwQ-32B reasoning quality compare to DeepSeek R1 on code tasks specifically?
- At what model size does the quality gap between open and frontier proprietary models become unacceptable for production use?

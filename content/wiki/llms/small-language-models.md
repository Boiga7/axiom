---
type: concept
category: llms
para: resource
tags: [slm, small-language-models, phi-4, llama, gemma, qwen, mistral, edge-deployment, mobile, quantization]
sources: []
updated: 2026-05-03
tldr: "Small language models (1B-14B parameters) run on consumer hardware and mobile devices; a fine-tuned SLM on a narrow task often beats frontier models at 1/100th the serving cost."
---

# Small Language Models (SLMs)

> **TL;DR** Small language models (1B-14B parameters) run on consumer hardware and mobile devices; a fine-tuned SLM on a narrow task often beats frontier models at 1/100th the serving cost.

SLMs are a distinct deployment category from general-purpose frontier models. They trade capability breadth for hardware accessibility, latency, privacy, and cost. The 1B-14B range is the practical window: below 1B, quality degrades sharply on most real-world tasks; above 14B, the hardware requirements begin to approach single-server rather than consumer-device constraints.

---

## What Makes a Model an SLM

- **Parameter count:** 1B-14B. Not a hard ceiling, but the range where consumer GPU, mobile NPU, and edge server deployment is realistic without quantization to a destructive degree.
- **Design intent:** optimized for task-specific quality on a narrow domain, not general breadth. SLMs are often trained on curated, high-quality data rather than raw web scale.
- **Deployment target:** single GPU, mobile device, or CPU-only server. The model must fit in VRAM or RAM after quantization. See [[infra/gpu-hardware]] for the VRAM math.
- **Inference regime:** typically served via [[infra/inference-serving]] (llama.cpp / vLLM) rather than a managed API. Latency is determined by hardware, not network round-trips.

SLMs are not simply cheaper versions of frontier models. The best ones (Phi-4, fine-tuned Llama 3.2) are purpose-built and outperform much larger general models on their target tasks.

---

## Key SLM Families

### Microsoft Phi-4 (14B)

Microsoft's flagship small model. The headline result: Phi-4 outperforms models 4-5x its size on mathematical and STEM reasoning tasks, which is the primary motivation for its design.

```
Parameters:  14B (dense, not MoE)
Architecture: Dense transformer — intentional choice over MoE for single-GPU fit
VRAM:        28 GB BF16 → fits on 2× RTX 4090, or 1× RTX 4090 at INT4 (~8 GB)
Training:    Emphasised high-quality curated data over raw scale
License:     MIT
```

**Benchmark scores (confirmed):**
- MMLU: 84.8% — outperforms Phi-3's 77.9%, competitive with GPT-4o-mini
- MATH: 56.1% — significantly above Phi-3's 42.5%
- HumanEval: 82.6%
- Parameter efficiency: Phi-4 (14B, 84.8% MMLU) beats Llama-3.3-70B and Qwen2.5-72B on MMLU despite being 5× smaller

**Phi-4-mini (3.8B):** Further size reduction for tighter hardware budgets. Mixture-of-LoRAs architecture for multi-task adaptation. Runs on a single RTX 4070 Ti (16GB) in INT4.

**Best for:** STEM reasoning, mathematical tasks, structured extraction on constrained hardware.

> [Source: Microsoft Research, phi_4_reasoning.pdf, 2025; airank.dev Phi-4 benchmarks, 2025]

---

### Meta Llama 3.2 (1B / 3B)

Meta's officially supported mobile and edge series. Unlike earlier Llama releases, 3.2 1B/3B were designed from the start for on-device deployment.

```
Sizes:       1B, 3B (also 11B/90B vision variants, not covered here)
Context:     128K tokens
License:     Llama 3.2 Community License — Apache 2.0-equivalent for most uses
Mobile:      ExecuTorch for iOS/Android; llama.cpp with Metal for iOS
```

**iOS deployment:**
- iPhone 12+ with 4GB+ RAM can run the 1B model
- iPhone 15 Pro / 16 Pro (8GB RAM): 3B model runs at 20-30 tokens/sec
- RAM footprint: ~650MB for the 1B model at INT4
- Export path: PyTorch → coremltools → .mlmodel → Xcode, or GGUF → llama.cpp with Metal backend
- ExecuTorch is Meta's official path for production iOS/Android apps; CoreML conversion via coremltools works for Xcode-native integration

**Android deployment:** ONNX Runtime on Android. Same quantization approach.

**MMLU scores** [unverified]: Llama 3.2 1B ~45-49%, Llama 3.2 3B ~58-62% — appropriate for classification, structured extraction, and narrow-domain Q&A, not general knowledge tasks.

**Best for:** privacy-first mobile apps, offline assistants, edge devices where network access is unavailable or undesirable.

> [Source: privatellm.app Llama 3.2 iOS guide; mirego.com ExecuTorch deployment post, 2025]

---

### Google Gemma 3 (1B / 4B / 12B / 27B)

Google DeepMind's open-weight family. Apache 2.0 license — the most permissive of the major SLM families.

```
Sizes:       1B (text-only), 4B, 12B, 27B (multimodal: image+text)
License:     Apache 2.0
Context:     128K tokens (4B/12B/27B)
Strengths:   Multilingual, multimodal (4B+), strong factual accuracy
```

**Benchmark scores (confirmed):**
- Gemma 3 27B — MMLU-Pro: 67.5, MATH: 69.0, GPQA Diamond: 42.4, MMMU: 64.9
- Gemma 3 12B beats Gemma 2 27B (2× size advantage from architecture improvement)
- Gemma 3 27B beats Gemini 1.5 Pro across standard benchmarks
- Gemma 3 4B roughly matches Llama 3.1 8B and Qwen2.5-7B; slightly behind Phi-4-mini on most tasks except MATH
- Gemma 3 1B — MATH: 48.0% (vs Gemma 2 2B: 27.2%), LiveCodeBench: 1.9% (vs 1.2%)

**Best for:** on-prem enterprise deployment (Apache 2.0 is safe for internal tools), multilingual applications, multimodal tasks at the 4B+ tier, organizations with legal constraints on custom licenses.

> [Source: HuggingFace Gemma 3 blog; Google DeepMind Gemma 3 technical report, arxiv.org/abs/2503.19786, 2025]

---

### Alibaba Qwen 2.5 (0.5B / 1.5B / 3B / 7B / 14B)

The most granular size ladder of any SLM family. Qwen 2.5 is consistently underrated in Western benchmarks because its strongest advantage — multilingual capability across Asian languages — is underweighted in English-centric evals.

```
Sizes:       0.5B, 1.5B, 3B, 7B, 14B
License:     Apache 2.0 (all sizes)
Context:     128K tokens
Strengths:   Chinese, Japanese, Korean, Arabic — best multilingual SLM family
```

**Notable characteristics:**
- Qwen 2.5 7B is consistently competitive with Llama 3.1 8B on English tasks and often ahead on Asian-language tasks
- Qwen 2.5 14B outperforms Llama 3.1 70B on Chinese-language benchmarks [unverified]
- The 0.5B and 1.5B models are realistic for IoT and embedded devices (Raspberry Pi 5 can run 0.5B at usable speed)
- Full instruction-tuned and math/coder specialist variants available at each size tier

**Best for:** Asian-language enterprise applications, multilingual products, IoT/embedded where even 1B is too large.

> [Source: Landscape coverage in [[landscape/open-source-models]]; Qwen 2.5 technical report [unverified]]

---

### Mistral Ministral 3B

Mistral's dedicated edge model. Positioned as Mistral's answer to mobile and embedded deployment.

```
Parameters:  3B
Multimodal:  Vision support (image + text)
Target:      Mobile devices, edge servers
Strengths:   Very fast inference, multimodal at 3B is unusual
License:     Apache 2.0
```

**Best for:** vision-enabled edge applications where a 7B model is too heavy. The multimodal capability at 3B is the differentiator vs Llama 3.2 3B (text-only).

> [unverified — limited public benchmark data available for Ministral 3B; verify against Mistral official benchmarks before using in production comparisons]

---

## Decision Framework: When to Use an SLM

### Use an SLM when

| Condition | Reason |
|---|---|
| Latency < 100ms required | Local SLM eliminates network round-trip; cloud LLM API adds 300-3000ms |
| Data sovereignty / privacy | No tokens leave your infrastructure |
| Cost at scale | SLMs are 10-30× cheaper to serve than 70B+ cloud APIs at equivalent QPS |
| Offline or edge deployment | Mobile, IoT, embedded, air-gapped |
| Task is narrow and well-defined | Fine-tuned SLM on a specific task regularly outperforms GPT-4 on that task at 1/100th the serving cost |
| Compliance requirement | GDPR, HIPAA, financial data — no external API calls |

The fine-tuning point deserves emphasis: a Phi-4 or Llama 3.2 7B fine-tuned on 1,000 domain-specific examples typically beats GPT-4 on that domain. The serving cost is the RTX 4070 Ti electricity bill rather than per-token API charges. See [[fine-tuning/lora-qlora]] for the QLoRA path that makes this practical.

### SLMs fail when

- **Complex multi-step reasoning** — tasks that require sustained chains of logic across many steps. SLMs under 7B lose coherence quickly.
- **Open-ended generation quality** — creative writing, nuanced long-form prose, broad general knowledge Q&A.
- **Long context reliability** — SLMs nominally support 128K tokens but quality degrades faster than frontier models above ~8K tokens for most tasks.
- **Instruction following on ambiguous tasks** — frontier models handle ambiguity better; SLMs tend to latch onto the nearest training pattern.
- **Rare or cross-domain questions** — narrow training means narrow knowledge.

---

## Deployment Targets

### iOS / macOS

- **llama.cpp + Metal:** run GGUF quantized models with GPU acceleration on Apple Silicon. The fastest path for prototyping.
- **CoreML:** convert via `coremltools` to `.mlmodel`, drag into Xcode. Best for production iOS apps that need native framework integration.
- **ExecuTorch (Meta):** official production path for Llama 3.2 on iOS and Android. More complex setup, better long-term support.
- **Hardware floor:** iPhone 12 for 1B models; iPhone 15 Pro / 16 Pro for 3B at good speed.

### Android

- ONNX Runtime on Android is the standard path. Export PyTorch model to ONNX, load with `com.microsoft.onnxruntime`.
- Google's MediaPipe LLM Inference API natively supports Gemma models on Android.

### Raspberry Pi / Single-Board Computers

- Qwen 2.5 0.5B or Llama 3.2 1B at INT4 via llama.cpp (CPU-only). Expect 2-8 tokens/sec on Pi 5.
- Practical for local classification or structured extraction; not for conversational latency.

### Local servers (consumer GPU)

| GPU | VRAM | Recommended model tier |
|---|---|---|
| RTX 4060 Ti | 16 GB | 7B at INT4, or 3B at BF16 |
| RTX 4070 Ti | 16 GB | 7B at INT4, or 3B at BF16 |
| RTX 4090 | 24 GB | 14B at INT4 (Phi-4), or 7B at BF16 |
| 2× RTX 4090 | 48 GB | 14B at BF16, or 30B at INT4 |

See [[infra/gpu-hardware]] for the full VRAM calculation guide.

---

## Fine-Tuning SLMs

QLoRA on a 7B model fits on a single RTX 4070 Ti (16GB VRAM). This is the most economically significant fact about SLMs for production AI engineering: it enables task-specific SLM development at individual-developer hardware cost.

The typical workflow:
1. Start with a base SLM (Llama 3.2 7B or Phi-4-mini)
2. Collect 500-2,000 task-specific examples
3. Fine-tune with QLoRA (NF4 quantization, rank 16-64 adapters) — see [[fine-tuning/lora-qlora]]
4. Merge adapters, quantize to GGUF INT4 for serving
5. Serve with llama.cpp or vLLM — see [[infra/inference-serving]]

A fine-tuned 7B SLM on a narrow task (e.g., SQL generation from schema, contract clause extraction, customer intent classification) routinely outperforms GPT-4 on that task. The serving cost is the difference between $0.0001/call and $0.01+/call.

---

## Quantization

4-bit GGUF via llama.cpp is the production standard for consumer hardware deployment.

```
BF16 → 2 bytes/parameter (baseline quality, highest VRAM)
INT8 → 1 byte/parameter (minimal quality loss, half the VRAM)
INT4 → 0.5 bytes/parameter (acceptable quality loss for task-specific models)
GGUF → llama.cpp's quantized container format, supports Q4_K_M (recommended), Q5_K_M, Q8_0
```

Quality tradeoff at INT4: typically 1-3% MMLU drop vs BF16 for task-specific models. For general knowledge tasks the drop can be larger. For classification and extraction tasks optimized through fine-tuning, INT4 quality loss is often within measurement noise.

See [[math/numerical-precision]] for the full precision trade-off analysis.

---

## Benchmark Reference

| Model | Size | MMLU | MATH | HumanEval | Notes |
|---|---|---|---|---|---|
| Phi-4 | 14B | 84.8% | 56.1% | 82.6% | Confirmed — beats 70B models on MMLU |
| Phi-4-mini | 3.8B | ~75% [unverified] | ~55% [unverified] | — | Mixture-of-LoRAs |
| Gemma 3 27B | 27B | 67.5% MMLU-Pro | 69.0% | — | Beats Gemini 1.5 Pro |
| Gemma 3 12B | 12B | — | — | — | Beats Gemma 2 27B |
| Gemma 3 4B | 4B | — | — | — | Matches Llama 3.1 8B |
| Gemma 3 1B | 1B | — | 48.0% | — | Text-only |
| Llama 3.2 3B | 3B | ~58-62% [unverified] | — | — | 20-30 tok/s on iPhone 15 Pro |
| Llama 3.2 1B | 1B | ~45-49% [unverified] | — | — | ~650 MB RAM at INT4 |
| Qwen 2.5 7B | 7B | ~74% [unverified] | — | — | Competitive with Llama 3.1 8B |

Phi-4's 84.8% MMLU at 14B puts it above many models at 3-5× the parameter count. The parameter efficiency gap is the defining feature of the current SLM generation — quality per parameter has improved faster at the small end than at the large end over 2024-2025.

---

## Connections

- [[llms/model-families]] — full model family comparison including larger-scale models
- [[landscape/open-source-models]] — open-weight model overview (Llama, Mistral, DeepSeek, Gemma, Phi families)
- [[fine-tuning/lora-qlora]] — QLoRA fine-tuning: the practical path to task-specific SLMs on consumer hardware
- [[fine-tuning/decision-framework]] — when to fine-tune vs RAG vs prompting; SLMs change the cost calculus
- [[infra/inference-serving]] — llama.cpp, vLLM, GGUF serving for local SLM deployment
- [[infra/gpu-hardware]] — VRAM requirements by model size; RTX 4070 Ti / 4090 as the SLM sweet spot
- [[math/numerical-precision]] — INT4/INT8/BF16 trade-offs; when quantization quality loss is acceptable
- [[synthesis/rag-vs-finetuning]] — RAG vs fine-tuning decision; SLM fine-tuned on narrow task vs RAG over general model

## Open Questions

- Does Phi-4's mathematical reasoning advantage hold after INT4 quantization, or is it precision-sensitive?
- What is the practical task complexity ceiling for Llama 3.2 1B after domain fine-tuning?
- How does Gemma 3's 128K context compare to Phi-4 on long-context retrieval tasks for SLM-tier hardware?
- When does Ministral 3B's multimodal capability at 3B become the deciding factor over Llama 3.2 3B's text-only performance?

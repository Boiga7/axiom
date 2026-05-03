---
type: paper
category: papers
para: resource
tags: [llama, meta, touvron, 2023, foundation-models, open-weights, efficient, rms-norm, swiglu, rope]
sources: []
updated: 2026-05-03
tldr: LLaMA (Touvron et al., Meta AI, Feb 2023) proved that a 13B model trained on public data only can outperform GPT-3 (175B) on most benchmarks — igniting the open-source LLM ecosystem.
---

# LLaMA: Open and Efficient Foundation Language Models (Touvron et al., 2023)

**Citation:** Touvron, H., Lavril, T., Izacard, G., Martinet, X., Lachaux, M. A., Lacroix, T., ... & Lample, G. (2023). LLaMA: Open and Efficient Foundation Language Models. arXiv:2302.13971. Meta AI.

**Published:** February 27, 2023.

**One sentence:** Open-weights foundation models from 7B to 65B parameters trained exclusively on public data, showing that a 13B model can outperform GPT-3 (175B) — smaller models trained longer on more data beat larger models trained less.

---

## What Problem It Solved

Prior state-of-the-art models (GPT-3, Chinchilla, PaLM) used proprietary training data and were inaccessible to the research community. LLaMA demonstrated that:

1. Public data alone (no proprietary datasets) is sufficient for competitive performance.
2. Smaller models trained for far more tokens than "compute-optimal" are more inference-efficient than larger undertrained models.
3. Open-weights release enables downstream research at a scale previously impossible outside major labs.

The Chinchilla paper (2022) had shown that compute-optimal training requires ~20 tokens per parameter. LLaMA pushed beyond this, trading training compute for inference efficiency — a deliberate choice for models that will be run many times.

---

## Model Sizes

| Model | Params | Context | Training tokens |
|---|---|---|---|
| LLaMA-7B | 7B | 2048 | 1T |
| LLaMA-13B | 13B | 2048 | 1T |
| LLaMA-33B | 33B | 2048 | 1.4T |
| LLaMA-65B | 65B | 2048 | 1.4T |

> [Source: Perplexity research, 2026-05-03] [unverified]

---

## Training Data

All public datasets. No proprietary sources.

| Source | Weight | Size |
|---|---|---|
| CommonCrawl (CCNet) | 67.0% | 3.3 TB |
| C4 | 15.0% | 783 GB |
| GitHub | 4.5% | 328 GB |
| Wikipedia | 4.5% | 83 GB |
| Books (Gutenberg + Books3) | 4.5% | 85 GB |
| ArXiv | 2.5% | 92 GB |
| StackExchange | 2.0% | 78 GB |

Tokeniser: BPE (byte-pair encoding) using the SentencePiece implementation. Vocabulary size: 32,000 tokens.

> [Source: Perplexity research, 2026-05-03] [unverified]

---

## Architecture

Standard autoregressive decoder Transformer, with three departures from the original Vaswani architecture:

### Pre-normalisation (RMSNorm)
Applied layer normalisation before the sublayer inputs rather than after, following GPT-3. Uses RMSNorm (Zhang and Sennrich, 2019) instead of standard LayerNorm — computationally cheaper because it removes the mean-centering operation.

### SwiGLU Activation
Replaced ReLU in the feed-forward sublayer with SwiGLU (from PaLM), which uses a gated linear unit with swish activation:

```
SwiGLU(x, W, V, b, c) = Swish(xW + b) ⊙ (xV + c)
```

The FFN dimension is 2/3 × 4d (rather than 4d) to compensate for the extra parameters in the gating branch. SwiGLU consistently improves downstream performance vs ReLU.

### Rotary Positional Embeddings (RoPE)
Removed absolute positional embeddings and used RoPE (Su et al., 2021) instead. RoPE encodes position by rotating query and key vectors — it generalises better to sequence lengths not seen during training and decays gracefully with distance.

These three choices (RMSNorm + SwiGLU + RoPE) became the de facto standard for all subsequent open-source LLMs. Llama 2, Mistral, DeepSeek, Qwen, and Gemma all use this exact combination.

---

## Benchmark Results

LLaMA-13B outperforms GPT-3 (175B) on most benchmarks despite being 10× smaller. LLaMA-65B is competitive with Chinchilla-70B and PaLM-540B.

| Benchmark | LLaMA-13B | GPT-3 (175B) | LLaMA-65B | Chinchilla-70B |
|---|---|---|---|---|
| MMLU (5-shot) | 46.9 | 43.9 | 63.4 | 67.5 |
| HumanEval (0-shot) | 15.8 | 0.0 | — | — |
| MBPP | 27.8 | — | — | — |
| BIG-bench Hard | — | — | competitive | — |

Note: LLaMA-65B lags behind Chinchilla-70B on MMLU specifically; their overall benchmark suite shows parity. GPT-3 scored 0 on HumanEval because it was not instruction-tuned for code generation.

> [Source: Perplexity research, 2026-05-03] [unverified — verify exact scores from arXiv:2302.13971]

---

## Key Contributions

1. **Inference-optimal training over compute-optimal training.** At inference time, a smaller well-trained model is cheaper than a larger undertrained model. This reframing — optimise for inference cost, not training cost — was influential.
2. **Public data only.** Removed the assumption that frontier models require proprietary data pipelines.
3. **Architecture defaults.** RMSNorm + SwiGLU + RoPE became the standard template for the next three years of open-source LLMs.
4. **Open weights release.** Made large-scale LLM research accessible to universities, independent researchers, and startups. Seeded the entire fine-tuning ecosystem (Alpaca, Vicuna, WizardLM, etc.).

---

## Limitations

- No instruction tuning or RLHF — raw pretraining only. Not suitable for chat out of the box.
- 2048 token context window; short by subsequent standards.
- No commercial licence at release — research-only, which limited deployment.
- Released via controlled access (application required), not fully open; weights leaked within days and spread virally.
- Safety evaluation minimal compared to what Llama 2 would later introduce.

---

## What It Enabled

- **Alpaca (March 2023):** Stanford fine-tuned LLaMA-7B on 52K instruction-following examples for $600. Showed RLHF-quality instruction following was cheap to replicate.
- **Vicuna, WizardLM, Guanaco:** Community fine-tunes demonstrating competitive chat performance.
- **LoRA + QLoRA adoption:** LLaMA's open weights made it the default base model for the PEFT/LoRA ecosystem.
- **Llama 2 (July 2023):** Meta's follow-up addressed the licence, safety, and context length issues.
- **Mistral 7B (September 2023):** Used LLaMA's architecture with sliding window attention; outperformed LLaMA-13B at 7B scale.
- **Llama 3, Gemma, Phi:** All descendants of LLaMA's architectural choices.

---

## Connections

- [[llms/llama-2]] — Model family entity page; covers Llama 2 through Llama 3.x
- [[papers/llama-2]] — The follow-up paper adding RLHF chat models, 2T tokens, and a commercial licence
- [[fine-tuning/lora-qlora]] — LoRA adoption exploded on LLaMA as the default base model
- [[papers/scaling-laws]] — LLaMA's inference-optimal framing directly challenged Chinchilla's compute-optimal prescription
- [[llms/transformer-architecture]] — RMSNorm, SwiGLU, RoPE — LLaMA's architecture choices

## Open Questions

- Was the decision to release weights via controlled access (rather than fully open) a deliberate safety choice, or primarily commercial?
- How much of LLaMA-65B's benchmark gap vs Chinchilla-70B is attributable to architecture differences vs training data quality?

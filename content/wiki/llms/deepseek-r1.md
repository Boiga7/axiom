---
type: entity
category: llms
tags: [deepseek, deepseek-r1, grpo, reasoning, open-weights, china]
sources: []
updated: 2026-05-03
para: resource
tldr: DeepSeek R1 is a 671B MoE reasoning model trained entirely via reinforcement learning (GRPO, no PPO reward model) that matched OpenAI o1 on AIME and MATH-500 at 96% lower API cost with MIT-licensed open weights — the most disruptive open model release since Llama.
---

# DeepSeek R1 / R2

> **TL;DR** DeepSeek R1 is a 671B MoE reasoning model trained entirely via reinforcement learning (GRPO, no PPO reward model) that matched OpenAI o1 on AIME and MATH-500 at 96% lower API cost with MIT-licensed open weights — the most disruptive open model release since Llama.

> [Source: WebSearch / arxiv.org/abs/2501.12948 / GitHub deepseek-ai/DeepSeek-R1, 2026-05-03]

---

## Overview

DeepSeek R1 was released January 20, 2025 by DeepSeek, a Chinese AI lab backed by High-Flyer, a quantitative hedge fund. The release caused immediate global market disruption: Nvidia dropped 17% in a single trading day, erasing $589 billion in market cap — the largest single-day market cap loss in US stock market history at that point.

The disruption had three sources:

1. **Comparable reasoning to o1 at open weights.** R1 matched OpenAI o1-1217 on AIME 2024 (79.8% vs 78%) and MATH-500 (97.3% vs comparable score), while publishing the full model weights under MIT license.
2. **96% cheaper API.** DeepSeek's inference API priced R1 at $0.55/$2.19 per million input/output tokens, versus o1's $15/$60 — a ~27x price differential on input tokens.
3. **No RLHF required.** The training approach (GRPO) achieved frontier reasoning without a reward model, human preference labels, or the standard three-stage RLHF pipeline — potentially invalidating the assumption that human labelling is a prerequisite for aligned reasoning.

---

## Architecture

DeepSeek R1 is built on top of **DeepSeek-V3-Base**, a Mixture-of-Experts (MoE) transformer:

| Property | Value |
|---|---|
| Total parameters | 671 billion |
| Active parameters per token | 37 billion |
| Architecture | MoE (256 routed experts + 1 shared expert, 8 + 1 active per token) |
| Attention | [[llms/multi-head-latent-attention\|Multi-head Latent Attention (MLA)]] |
| Base model | DeepSeek-V3-Base |
| Context window | 128K tokens |

DeepSeek-V3 itself was released December 26, 2024. Its training cost was reported at $5.576 million (2.788M H800 GPU hours), a figure that attracted substantial scepticism but was not independently refuted. R1 is then the reasoning-capable version built on top of V3-Base via reinforcement learning.

The internal chain-of-thought reasoning is emitted inside `<think>...</think>` tags before the final answer. These thinking tokens count toward `max_tokens` — a production footgun (see Common Failure Cases).

---

## Training: GRPO

**GRPO (Group Relative Policy Optimisation)** is the training objective developed at DeepSeek that replaces the standard PPO + reward model pipeline.

### PPO recap (what GRPO replaces)

Standard RLHF with PPO requires:
1. SFT on demonstration data
2. A separate reward model, same size as the policy, trained on human preference pairs
3. PPO RL: maximise reward model score with KL penalty against the SFT model

Problems: the reward model costs as much to train as the policy, is brittle (reward hacking), and requires expensive human preference labels.

### How GRPO works

GRPO eliminates the reward model entirely. For each question:

1. Sample **G outputs** from the current policy (DeepSeek used G=16)
2. Score each output with a **rule-based verifier** (for math: check if the final answer matches; for code: run the test suite)
3. Compute a **group-relative advantage**: for output i in the group, `A_i = (r_i - mean(r)) / std(r)`
4. Update the policy to increase probability of outputs with positive advantage, decrease negative, with a clipped PPO-style ratio and KL penalty against a reference model

The key insight: for domains with verifiable answers (mathematics, code), a rule-based scorer provides a noiseless reward signal without needing a learned reward model. The group normalisation stabilises training without a critic network.

**Training hyperparameters (reported in paper):**
- Learning rate: 3e-6
- KL coefficient: 0.001
- GRPO clip ratio ε: 10
- Sampling temperature: 1.0 for rollout
- AIME 2024 pass@1 improved from 15.6% → 77.9% during RL training

DeepSeek also skipped SFT before RL in an early experiment (DeepSeek-R1-Zero) to test whether RL alone could produce reasoning. It could — but the zero version showed unstable outputs (language mixing, readability issues). The full R1 used a cold-start phase with a small SFT dataset before RL.

See [[fine-tuning/dpo-grpo]] for the full GRPO implementation with TRL code examples.

---

## Benchmark Performance

Performance of R1 at release (January 2025) versus o1-1217:

| Benchmark | DeepSeek R1 | OpenAI o1-1217 | Notes |
|---|---|---|---|
| AIME 2024 | 79.8% | 78.0% | R1 slightly ahead |
| MATH-500 | 97.3% | ~97% | Comparable |
| GPQA Diamond | 71.5% | 75.7% | o1 ahead on knowledge QA |
| SWE-bench Verified | 49.2% | 48.9% | Comparable; R1 slightly ahead |
| Codeforces Elo | ~2029 | — | Expert-to-Candidate Master range |

> [Source: arxiv.org/abs/2501.12948, DataCamp benchmark review, 2026-05-03]

**DeepSeek R1-0528** (May 2025 update) showed significant improvements: AIME 2025 from 70% → 87.5%, GPQA Diamond from 71.5% → 81.0%, SWE-bench Verified from 49.2% → 57.6%.

For comparison context, Claude Opus 4.6 (April 2026) scores 80.8% SWE-bench and 91.3% GPQA Diamond — indicating substantial further progress in the 15 months since R1's release. See [[evals/benchmarks]] for the full current picture.

---

## Distilled Models

DeepSeek released six distilled checkpoints alongside R1, all trained by fine-tuning smaller base models on ~800K samples of R1-generated reasoning traces (SFT on thinking outputs, not RL):

| Model | Base | Size | License |
|---|---|---|---|
| R1-Distill-Qwen-1.5B | Qwen 2.5 | 1.5B | MIT + Apache 2.0 |
| R1-Distill-Qwen-7B | Qwen 2.5 | 7B | MIT + Apache 2.0 |
| R1-Distill-Qwen-14B | Qwen 2.5 | 14B | MIT + Apache 2.0 |
| R1-Distill-Qwen-32B | Qwen 2.5 | 32B | MIT + Apache 2.0 |
| R1-Distill-Llama-8B | Llama 3.1 8B Base | 8B | MIT + Llama 3.1 license |
| R1-Distill-Llama-70B | Llama 3.3 70B Instruct | 70B | MIT + Llama 3.3 license |

The 7B distilled model was reported to be competitive with GPT-4o on math and coding benchmarks. The 70B distilled model approaches the full R1 on many reasoning tasks. Distillation here means supervised fine-tuning on R1's chain-of-thought outputs — the student learns to produce similar reasoning traces without running RL itself.

All distilled models are available at `huggingface.co/deepseek-ai/` (e.g., `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B`).

---

## DeepSeek V3 and R2

**DeepSeek V3** (December 26, 2024) is the base generalist model, not a reasoning model. It predates R1 and serves as R1's base. V3 is competitive with GPT-4o and Claude Sonnet on general tasks. API pricing: $0.27/$1.10 per M input/output tokens.

**DeepSeek R2** is the planned successor to R1, focused on further advancing reasoning. As of mid-2026, R2 has not been released. Reported delays stem from difficulties training on Huawei Ascend chips (due to US export controls on Nvidia hardware), forcing a return to Nvidia hardware for critical training stages. Reports from late 2025 / early 2026 suggest DeepSeek V4 and R2 were both in development, with V4 expected first.

> [Source: WebSearch / Rest of World / meta-intelligence.tech, 2026-05-03] [unverified — release date unconfirmed]

---

## Open Weights and Cost

**License:** MIT. This is significant — MIT allows unrestricted commercial use, modification, and redistribution with no viral clauses. Distilled models retain their base model licenses (Apache 2.0 for Qwen variants; Llama license for Llama variants).

**HuggingFace:** Full 671B weights available at `deepseek-ai/DeepSeek-R1`. The GGUF-quantised versions (for llama.cpp / LM Studio / Ollama) are maintained by the community (Unsloth collection).

**API pricing comparison (at R1 launch, January 2025):**

| Model | Input (per M tokens) | Output (per M tokens) |
|---|---|---|
| DeepSeek R1 | $0.55 | $2.19 |
| OpenAI o1-1217 | $15.00 | $60.00 |
| Price ratio | 27x cheaper | 27x cheaper |

The "96% cheaper" figure is accurate: $0.55 vs $15 is a 96.3% cost reduction on input tokens. The primary reason is inference efficiency from the MoE architecture — only 37B parameters are active per forward pass despite 671B total, giving GPT-4-class quality at near-7B-class inference cost.

**API compatibility:** DeepSeek's API is OpenAI-compatible (uses the Chat Completions format). Use model name `deepseek-reasoner` for R1. See [[llms/model-families]] for the code example.

---

## Key Facts

- Released January 20, 2025; caused Nvidia to drop 17% in one day ($589B market cap loss)
- Architecture: 671B MoE, 37B active parameters per token, built on DeepSeek-V3-Base
- Training: GRPO with rule-based verifiers — no PPO, no reward model, no human preference labels
- AIME 2024: 79.8% (R1) vs 78.0% (o1-1217); MATH-500: 97.3% vs comparable
- API: $0.55/$2.19 per M input/output tokens — 96% cheaper than o1 at launch
- License: MIT for R1 weights; allows unrestricted commercial use
- Distilled models: 6 variants from 1.5B to 70B (Qwen and Llama base families)
- R1's reasoning traces appear inside `<think>` tags and count toward `max_tokens` budget
- DeepSeek-R1-Zero (pure RL, no SFT cold start) showed AIME improving from 15.6% → 77.9% during training

---

## Common Failure Cases

**`max_tokens` exhausted mid-reasoning causes truncated or empty final answers**
Why: R1 emits extended chain-of-thought inside `<think>` blocks before the final answer; these reasoning tokens count against the `max_tokens` budget; if the budget is set for the expected answer length only, the model runs out of tokens before producing a final answer.
Detect: responses arrive with a `<think>` block but no subsequent answer text; reducing `max_tokens` makes the problem worse; the final answer appears truncated mid-sentence.
Fix: set `max_tokens` to reasoning_trace_length + expected_answer_length; use streaming to observe reasoning tokens as they arrive; if you only need the answer (not the reasoning), use DeepSeek V3 instead.

**Instruction following degrades during long reasoning chains**
Why: R1 optimises for arriving at a correct answer via internal exploration; explicit formatting constraints in the user prompt (JSON, specific structure, word limits) compete with the reasoning objective and are sometimes ignored mid-chain.
Detect: structured output requests (e.g., "respond in JSON only") are followed at the start but abandoned in the final answer; the model produces correct reasoning but incorrect output format.
Fix: add output format instructions immediately before the final answer section; use a lightweight post-processing step or a structured output wrapper (see [[python/instructor]]) to enforce format.

**Language mixing in output when input contains multiple languages**
Why: R1-Zero (the pure RL version without SFT cold start) showed a known "language mixing" failure where it would switch languages during reasoning; the full R1 with cold-start SFT substantially reduces but does not eliminate this.
Detect: English-language prompts produce responses with Chinese characters, or bilingual reasoning chains.
Fix: add explicit language instruction ("respond only in English") to the system prompt; use R1 distilled models on Qwen base for better multilingual consistency.

**Context window overflow on long documents combined with extended reasoning**
Why: R1 has a 128K context window, but the reasoning trace itself consumes additional tokens; a 100K-token document + 10K reasoning trace + 5K answer may push the effective limit.
Detect: API returns a context length error or truncates the input silently; long documents combined with complex reasoning tasks fail more than short tasks.
Fix: summarise or chunk long documents before passing to R1; use RAG to extract relevant passages rather than feeding the full document.

---

## Connections

- [[llms/model-families]] — DeepSeek R1 in context of GPT/o-series, Claude, Gemini, Llama, Qwen
- [[landscape/ai-labs]] — DeepSeek lab profile; January 2025 disruption to the competitive landscape
- [[fine-tuning/dpo-grpo]] — GRPO training objective, TRL implementation, comparison to DPO and PPO
- [[evals/benchmarks]] — AIME, MATH-500, SWE-bench Verified, GPQA Diamond methodology
- [[landscape/model-timeline]] — R1 in the chronological model release history
- [[fine-tuning/rlhf-dpo]] — the RLHF pipeline GRPO replaces
- [[infra/inference-serving]] — running R1 locally via llama.cpp (GGUF) or vLLM

---

## Open Questions

- Will DeepSeek R2 maintain the cost-efficiency advantage, or will additional compute requirements close the price gap with o1/o3?
- Can GRPO extend beyond math/code verifiable domains to other reasoning tasks (law, medicine, multi-step planning)?
- Does the 37B active parameter MoE architecture genuinely achieve GPT-4-class quality, or are the benchmarks partially explained by training data overlap with benchmark test sets?
- What is the security surface of hosting R1 weights in an enterprise context — are there embedded behaviours from Chinese regulatory compliance training that affect model outputs on sensitive topics? [unverified]

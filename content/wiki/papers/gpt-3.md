---
type: paper
category: papers
para: resource
tags: [gpt-3, openai, few-shot, scaling, in-context-learning, 2020]
sources: []
updated: 2026-05-01
tldr: Scaling a decoder-only Transformer to 175B parameters with 300B tokens of training data produced a model that could perform new tasks from a handful of examples in the prompt — without any gradient updates.
---

# GPT-3: Language Models are Few-Shot Learners (Brown et al., 2020)

**Citation:** Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., ... & Amodei, D. (2020). Language models are few-shot learners. NeurIPS 2020.

**One sentence:** Scaling a decoder-only Transformer to 175B parameters with 300B tokens of training data produced a model that could perform new tasks from a handful of examples in the prompt — without any gradient updates.

---

## What Problem It Solved

Pre-GPT-3, adapting a language model to a new task required fine-tuning: collecting labelled data, running gradient updates, maintaining a separate checkpoint per task. This was expensive and inflexible.

GPT-3 showed that a large enough model, given a few examples in its context window, could perform competitively on new tasks with zero weight updates. The "programming interface" shifted from fine-tuning to prompting.

---

## Key Contributions

### 1. In-Context Learning (ICL)

Provide examples of the desired behaviour directly in the prompt. The model generalises from those examples without updating its weights.

```
Translate English to French:
  sea otter → loutre de mer
  peppermint → menthe poivrée
  cheese → ?
```

The model outputs "fromage". No fine-tuning required. This is **few-shot learning** (2–5 examples in prompt). Zero-shot omits examples entirely.

### 2. Scale Unlocks Capability

GPT-3 demonstrated that capability is not just a function of architecture — it is a function of scale. Three settings tested:

| Setting | Description | Works well at |
|---|---|---|
| Zero-shot | Just instruction, no examples | Large models only |
| One-shot | One example | Medium+ models |
| Few-shot | 10–100 examples | Consistently good at 175B |

Smaller models (GPT-2, 1.3B) showed poor few-shot generalisation. Performance jumps non-linearly with scale — an early hint at emergent abilities.

### 3. 175B Parameters, 300B Training Tokens

GPT-3 was trained on a mixture of Common Crawl (filtered), WebText2, Books1, Books2, and English Wikipedia. This showed that data quality matters as much as scale — filtered web data outperforms unfiltered.

### 4. Decoder-Only Architecture

GPT-3 is a pure decoder-only Transformer — causal attention masks prevent tokens attending to future positions. Every modern generative LLM (GPT-4, Claude, Llama, Mistral) uses this architecture.

---

## Impact

- Made "prompt engineering" a legitimate discipline
- Demonstrated that a single general model could match fine-tuned task-specific models
- Launched the commercial LLM race (ChatGPT, Claude, Gemini all descend conceptually from this work)
- Revealed in-context learning as an emergent behaviour not present in smaller models
- The scaling recipe (more parameters + more data = more capability) held — and was later refined by Chinchilla

---

## Limitations

- **No weight updates** — ICL is not learning; performance degrades on complex multi-step tasks
- **Context window bound** — can only use as many examples as fit in the context (2,048 tokens in 2020)
- **Hallucination** — the model confabulates factual answers confidently
- **Prompt sensitivity** — performance varies dramatically with example order and phrasing
- **Not instruction-tuned** — raw GPT-3 is hard to interact with conversationally (InstructGPT fixed this)

---

## Key Facts

- 175B parameters; 300B training tokens; 96 attention layers; trained by OpenAI
- Released via API only (not open-sourced); paper published June 2020
- Few-shot GPT-3 matched fine-tuned BERT on SuperGLUE without any fine-tuning
- The direct lineage: GPT-3 → InstructGPT (RLHF) → ChatGPT → GPT-4
- Zero-shot works poorly on GPT-3; few-shot substantially closes the gap

---

## Connections

[[papers/key-papers]] · [[papers/scaling-laws]] · [[papers/rlhf]] · [[llms/transformer-architecture]] · [[prompting/techniques]] · [[llms/model-families]]

---
type: concept
category: llms
para: resource
tags: [foundation-models, llm, pretraining, transfer-learning, gpt, claude, llama, bedrock]
tldr: Foundation models are large neural networks pretrained on massive datasets that can be adapted to many tasks via prompting or fine-tuning — the paradigm shift underlying modern AI engineering.
sources: []
updated: 2026-05-04
---

# Foundation Models

A foundation model is a large neural network pretrained on a massive dataset (typically hundreds of billions to trillions of tokens of text, code, or multimodal content) using self-supervised learning. The pretrained model encodes broad capabilities — language understanding, reasoning, code generation, factual knowledge — that can be adapted to specific downstream tasks with relatively little additional data or compute.

The term was coined by the Stanford Center for Research on Foundation Models (CRFM) in 2021 to describe the paradigm shift where a single large model serves as the foundation for many applications, replacing the earlier pattern of training narrow task-specific models from scratch.

---

## Why Foundation Models Matter

Before foundation models, building a capable NLP system required a dedicated dataset and training run per task: one model for sentiment, one for NER, one for translation. Foundation models break this pattern. A single pretrained model, accessed via prompting or fine-tuned with a small labelled dataset, achieves competitive or state-of-the-art results across dozens of tasks simultaneously.

This unlocks an economics shift: the cost of producing a capable AI system falls from "train a custom model" to "write a prompt" for most use cases. Only at the edges — consistent format, proprietary vocabulary, insufficient prompting — does fine-tuning become necessary.

---

## Key Examples

| Model family | Lab | Modality | Access |
|---|---|---|---|
| Claude (Haiku/Sonnet/Opus) | Anthropic | Text, vision | API, Bedrock |
| GPT-4o, o3 | OpenAI | Text, vision, audio | API |
| Gemini 1.5 Pro/Flash | Google DeepMind | Text, vision, audio | API, Vertex AI |
| Llama 3.x | Meta FAIR | Text | Open weights |
| Mistral Large/Small | Mistral AI | Text | API, open weights |
| Amazon Titan | AWS | Text, embeddings, image | Bedrock only |

---

## Pretraining, Fine-Tuning, Alignment

Foundation models go through three phases:

1. **Pretraining** — self-supervised learning on a large corpus. The model learns to predict the next token. This phase produces the base model with broad capabilities but no particular helpfulness or safety properties.

2. **Instruction fine-tuning (SFT)** — supervised learning on (instruction, response) pairs. The model learns to follow instructions and produce helpful outputs.

3. **Alignment (RLHF, DPO, Constitutional AI)** — the model's outputs are shaped to match human preferences for helpfulness, harmlessness, and honesty.

Consumers of foundation models typically interact with the aligned output of this pipeline, not the raw base model.

---

## Connections

- [[llms/claude]] — Anthropic's Claude family: Haiku, Sonnet, Opus
- [[llms/model-families]] — comparison of model families across labs
- [[landscape/ai-labs]] — the labs that train and release foundation models
- [[fine-tuning/overview]] — when and how to fine-tune a foundation model
- [[prompting/techniques]] — how to get the most from a foundation model without training
- [[rag/overview]] — augmenting foundation models with external knowledge at inference time

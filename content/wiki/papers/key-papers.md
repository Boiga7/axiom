---
type: synthesis
category: papers
tags: [papers, research, foundational, reading-list, llm, transformers]
sources: []
updated: 2026-04-29
para: resource
tldr: Curated reading list for senior AI engineers — 22 papers across architecture, alignment, reasoning, RAG, efficient training, safety, and scaling, with a one-day and one-week priority order.
---

# Key Papers Reading List

> **TL;DR** Curated reading list for senior AI engineers — 22 papers across architecture, alignment, reasoning, RAG, efficient training, safety, and scaling, with a one-day and one-week priority order.

The essential papers for a senior AI engineer. Grouped by area. If you read one paper from each section, you'll have a solid technical foundation.

---

## Foundation: Architecture

| Paper | Year | Read because |
|---|---|---|
| **[[papers/attention-is-all-you-need]]** (Vaswani et al.) | 2017 | Where everything starts. Self-attention, multi-head, positional encoding. |
| **Language Models are Few-Shot Learners** (GPT-3) | 2020 | Scaling laws, in-context learning, emergence at scale. |
| **PaLM: Scaling Language Modeling with Pathways** | 2022 | How to scale; breakthrough-point behaviour. |
| **LLaMA: Open and Efficient Foundation Language Models** | 2023 | Making large models accessible; architecture optimisations. |

---

## Training and Alignment

| Paper | Year | Read because |
|---|---|---|
| **Learning to summarise with human feedback** (Stiennon et al.) | 2020 | First large-scale RLHF demonstration. |
| **Training language models to follow instructions** (InstructGPT) | 2022 | RLHF at scale; the recipe for GPT-3.5 and ChatGPT. |
| **Constitutional AI** (Bai et al., Anthropic) | 2022 | Self-critique for harmlessness; how Claude is trained. |
| **Direct Preference Optimization** (Rafailov et al.) | 2023 | DPO replaces reward model in RLHF. |
| **DeepSeekMath / DeepSeek-R1** | 2024–25 | GRPO: group relative policy optimisation for reasoning. |

---

## Reasoning and Agents

| Paper | Year | Read because |
|---|---|---|
| **Chain-of-Thought Prompting Elicits Reasoning** (Wei et al.) | 2022 | CoT: how to unlock step-by-step reasoning. |
| **ReAct: Synergizing Reasoning and Acting** (Yao et al.) | 2022 | The ReAct pattern every agent loop implements. |
| **Toolformer** (Schick et al., Meta) | 2023 | Teaching LLMs to use tools in pretraining. |
| **SWE-bench** (Jimenez et al.) | 2024 | The benchmark for real-world code; why it matters. |

---

## Retrieval and RAG

| Paper | Year | Read because |
|---|---|---|
| **REALM: Retrieval-Augmented Language Model Pre-Training** | 2020 | RAG foundations. |
| **Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks** (Lewis et al.) | 2020 | The RAG paper. Combines dense retrieval with generation. |
| **From Local to Global: GraphRAG** (Microsoft) | 2024 | Graph-based retrieval for complex questions. |

---

## Efficient Training and Inference

| Paper | Year | Read because |
|---|---|---|
| **LoRA: Low-Rank Adaptation of Large Language Models** (Hu et al.) | 2021 | The dominant fine-tuning method. Understand why it works. |
| **QLoRA: Efficient Finetuning of Quantized LLMs** (Dettmers et al.) | 2023 | Fine-tuning 65B models on 48GB GPU. Made open-source fine-tuning accessible. |
| **Efficient Large Language Model Serving with PagedAttention** (vLLM) | 2023 | How vLLM achieves 24x throughput. |
| **FlashAttention-2** (Dao et al.) | 2023 | Efficient attention that enables long-context models. |

---

## Safety and Interpretability

| Paper | Year | Read because |
|---|---|---|
| **Zoom In: An Introduction to Circuits** (Olah et al.) | 2020 | Foundational circuits work in vision models. |
| **Toy Models of Superposition** (Elhage et al., Anthropic) | 2022 | Why neurons are polysemantic; the superposition hypothesis. |
| **Towards Monosemanticity** (Bricken et al., Anthropic) | 2023 | Sparse autoencoders decompose polysemantic neurons into features. |
| **Scaling Monosemanticity** (Templeton et al., Anthropic) | 2024 | SAEs at frontier model scale; millions of interpretable features. |
| **Evaluating Language Models for Dangerous Capabilities** | 2023+ | How Anthropic evaluates capability-level risks. |

---

## Scaling and Emergence

| Paper | Year | Read because |
|---|---|---|
| **Scaling Laws for Neural Language Models** (Kaplan et al.) | 2020 | How performance scales with parameters, data, compute. |
| **Training Compute-Optimal Large Language Models** (Chinchilla) | 2022 | 20 tokens per parameter rule; fixed Kaplan's overfit finding. |
| **Emergent Abilities of Large Language Models** (Wei et al.) | 2022 | Phase transitions in capability. Controversial but important. |

---

## Reading Strategy

**If you have one day:** Attention Is All You Need, InstructGPT, LoRA, ReAct.

**If you have one week:** Add CoT, Constitutional AI, DPO, QLoRA, SWE-bench, Towards Monosemanticity.

**If you have one month:** Work through the full list. Read the abstract and key experiments first; read the full methodology only if the contribution directly affects your work.

Most papers: read the abstract + figures + conclusion. You can skim the maths and recover the key insight. Only read the full derivation when you need to implement or critique it.

---

## Where to Find Papers

- **Anthropic:** anthropic.com/research
- **ArXiv:** arxiv.org (cs.AI, cs.CL, cs.LG sections)
- **Papers With Code:** paperswithcode.com (benchmarks + implementations)
- **Semantic Scholar:** semanticscholar.org (citations + related work)

---

## Key Facts

- One-day minimum: Attention Is All You Need (2017), InstructGPT (2022), LoRA (2021), ReAct (2022)
- Chinchilla (2022): 20 training tokens per parameter rule — corrected Kaplan's earlier overfit finding
- DeepSeek-R1 (2025): GRPO proved frontier reasoning without human preference labels
- Towards Monosemanticity (2023): SAEs decompose polysemantic neurons into interpretable features
- Reading strategy: abstract + figures + conclusion recovers the key insight; full methodology only when implementing
- Papers With Code: best source for benchmark implementations alongside papers

## Connections

- [[papers/attention-is-all-you-need]] — full treatment of the foundational paper
- [[llms/transformer-architecture]] — architecture in practice
- [[safety/mechanistic-interpretability]] — the interpretability papers in context
- [[fine-tuning/lora-qlora]] — LoRA and QLoRA implementation
- [[fine-tuning/dpo-grpo]] — DPO and GRPO training objectives from the alignment papers

## Open Questions

- Which 2025-2026 papers will prove foundational in retrospect — DeepSeek-R1's GRPO? Scaling Monosemanticity?
- Is the "emergent abilities" framing from Wei et al. (2022) correct, or do emergent capabilities reflect discontinuous evaluation metrics rather than discontinuous model improvements?
- How many of the 22 papers here will still be on the essential reading list in 5 years?

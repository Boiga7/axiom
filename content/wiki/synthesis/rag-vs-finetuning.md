---
type: synthesis
category: synthesis
tags: [rag, fine-tuning, decision-guide, comparison, architecture]
sources: []
updated: 2026-04-29
para: resource
tldr: RAG manages knowledge (external, updateable, citable); fine-tuning shapes behaviour (style, terminology, format) — 57% of LLM-deploying organisations use RAG without fine-tuning; the most powerful pattern combines both.
---

# RAG vs Fine-Tuning

> **TL;DR** RAG manages knowledge (external, updateable, citable); fine-tuning shapes behaviour (style, terminology, format) — 57% of LLM-deploying organisations use RAG without fine-tuning; the most powerful pattern combines both.

The question every AI engineer gets asked. The answer: they solve different problems and often work best together. RAG manages knowledge; fine-tuning shapes behaviour.

---

## The Core Distinction

**RAG (Retrieval-Augmented Generation):** gives the model access to external knowledge at inference time. The model itself doesn't change. The knowledge lives in a vector store.

**Fine-tuning:** changes the model's weights. The model learns new behaviour, style, or domain-specific patterns. The knowledge is encoded in the parameters.

---

## When RAG Is the Right Choice

### Frequently updating knowledge

Company documentation, product catalogs, pricing, news, support tickets — anything that changes weekly or daily. Updating a RAG index takes minutes. Fine-tuning takes hours to days and requires redeployment.

### Long-tail factual knowledge

Facts that appear rarely in training data but matter for accuracy. The model can retrieve the exact text; it can't memorise facts it saw once in fine-tuning.

### Attribution and citation

RAG can show exactly which document supported which claim. Fine-tuned knowledge has no provenance — the model produces outputs it "knows" without being able to cite where.

### Large knowledge corpus

A 10M-document knowledge base can be indexed in a vector store. Fine-tuning on 10M documents requires compute that costs hundreds of thousands of dollars.

### Regulated environments

Audit trails, data residency requirements, right-to-be-forgotten. RAG externalises the knowledge; you can delete a document and it's gone from retrieval immediately.

---

## When Fine-Tuning Is the Right Choice

### Consistent style and format

You need every response to follow a specific format, tone, or style. RAG adds knowledge but doesn't change how the model responds. Fine-tuning trains the style into the weights.

### Domain-specific terminology

The model needs to understand and use jargon correctly ("adjudication", "escrow", "VLAN trunk", "FIX protocol"). RAG can retrieve definitions; fine-tuning makes the model fluent in the domain.

### Behaviours, not facts

"Always respond in Spanish", "never use bullet points", "when the user asks X always confirm Y first". These are behavioural patterns. RAG can't teach behaviour; fine-tuning can.

### Reducing prompt length

A fine-tuned model knows your domain and doesn't need extensive few-shot examples in every prompt. Can cut prompt length by 50-80%.

### Latency-sensitive, no retrieval budget

If you can't afford 100-200ms for retrieval, bake the knowledge into the model. Fine-tuned inference is the same speed regardless of corpus size.

### Structured output compliance

If you need the model to reliably output a specific JSON schema or follow a complex format, fine-tuning on examples of correct outputs is more reliable than prompting.

---

## When to Use Both

The most powerful pattern: fine-tune for behaviour + RAG for knowledge.

```
Fine-tuned layer:
  - Responds in your brand voice
  - Understands domain terminology
  - Follows your output format
  - Knows when to escalate to a human

RAG layer:
  - Current product documentation
  - Policy documents
  - Customer-specific context
  - Real-time data
```

Example: a customer support bot fine-tuned on historical support tickets (learns tone, escalation patterns, domain jargon) + RAG over current product documentation (knows what features exist today).

---

## Decision Matrix

| Question | RAG | Fine-tune | Both |
|---|---|---|---|
| Knowledge changes frequently? | ✓ | | |
| Need citations/attribution? | ✓ | | |
| Need consistent style/tone? | | ✓ | |
| Need domain fluency? | | ✓ | |
| Large knowledge corpus (>100K docs)? | ✓ | | |
| Behavioural patterns to teach? | | ✓ | |
| Need to reduce prompt length? | | ✓ | |
| Best possible quality? | | | ✓ |
| Limited budget/time? | ✓ | | |
| Need both updated knowledge + trained behaviour? | | | ✓ |

---

## Cost Comparison

### RAG operating costs

```
Embedding model:  $0.13/M tokens (text-embedding-3-large)
Vector store:     $0.10/GB/month (Qdrant Cloud)
Reranker:         $2.00/1K searches (Cohere)
LLM call:         $3.00/M input tokens (Claude Sonnet 4.6)

Typical per-query cost:
  Embed query:     $0.00002  (150 tokens)
  Rerank 50 docs:  $0.002
  LLM (10K tokens): $0.03
  Total:           ~$0.032/query
```

### Fine-tuning costs

```
Dataset preparation:  $500-5,000 (labelling, cleaning)
Fine-tuning compute:  $50-500 (Axolotl on Lambda, 7B model, 1-3 hours)
Fine-tuning API:      $3-50 (OpenAI/Anthropic hosted fine-tuning)
Inference (no RAG):   Lower token count → lower per-call cost
```

Fine-tuning has higher upfront cost, potentially lower per-query cost at scale.

---

## Quality Comparison

RAG quality depends on: retrieval precision, chunk quality, reranking.
Fine-tuning quality depends on: dataset quality, objective choice, hyperparameters.

| Metric | RAG | Fine-tuning |
|---|---|---|
| Factual accuracy (recent data) | High | Low (data cutoff) |
| Factual accuracy (static domain) | Medium | High |
| Response consistency | Low-medium | High |
| Hallucination rate | Lower (grounded) | Higher (no grounding) |
| Out-of-domain generalisation | Good (retrieval finds it) | Poor |

---

## The 57% Number

A widely-cited 2024 survey: 57% of organisations deploying LLMs use RAG but do not fine-tune. Fine-tuning is perceived as high-effort, high-risk. RAG is the default because:
1. It's reversible (update index, not model)
2. No ML expertise required
3. Results are explainable (show the retrieved source)

Fine-tuning adoption is growing as tooling (Axolotl, Unsloth, QLoRA) has made it accessible.

---

## Key Facts

- RAG: knowledge lives in vector store; model weights unchanged; update index in minutes
- Fine-tuning: knowledge encoded in weights; no provenance — model can't cite where it learned it
- 57% of LLM-deploying organisations use RAG without fine-tuning (2024 survey)
- Fine-tuning can reduce prompt length by 50-80% by eliminating few-shot examples once behaviour is trained in
- Fine-tuning compute cost: $50-500 for a 7B model on Axolotl on Lambda (1-3 hours)
- RAG per-query cost breakdown: embed ($0.00002) + rerank ($0.002) + LLM 10K tokens ($0.03) ≈ $0.032/query
- RAG hallucination rate: lower (grounded in retrieved text); fine-tuned hallucination rate: higher (no grounding)
- Regulatory/audit use case: RAG wins — delete a document from the index and it's immediately gone from retrieval
- Best pattern: fine-tune for behaviour (tone, format, jargon) + RAG for knowledge (current docs, policies)

## Connections

- [[rag/pipeline]] — full RAG implementation end to end
- [[fine-tuning/decision-framework]] — detailed fine-tuning decision tree
- [[fine-tuning/lora-qlora]] — LoRA and QLoRA; cheapest path to fine-tuning
- [[prompting/techniques]] — always try prompting before either RAG or fine-tuning
- [[synthesis/llm-decision-guide]] — the broader decision tree where RAG vs fine-tuning fits
- [[rag/reranking]] — the single biggest RAG quality improvement after basic retrieval works

## Open Questions

- Does the 57% RAG-only statistic reflect genuine product fit, or are most teams avoiding fine-tuning because the tooling still feels intimidating?
- For the "fine-tune for behaviour + RAG for knowledge" combined pattern, how do you prevent fine-tuning from interfering with the model's ability to follow RAG context faithfully?
- Will Anthropic's hosted fine-tuning API change the economics enough that fine-tuning becomes the first thing teams try rather than the last?

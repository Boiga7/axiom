---
type: paper
category: papers
para: resource
tags: [gpt-4, openai, multimodal, rlhf, safety, capabilities, evaluation, benchmarks]
sources: []
updated: 2026-05-03
tldr: OpenAI (2023) — GPT-4 is a large-scale multimodal model trained with RLHF. Passes the bar exam in the top 10%, demonstrates emergent capabilities, and introduces a systematic safety evaluation methodology with a published system card. The template for how frontier labs now report model capabilities.
---

# GPT-4 Technical Report

> **TL;DR** OpenAI (March 2023) — GPT-4 is a multimodal Transformer fine-tuned with RLHF. Human-level on professional benchmarks (bar exam top 10%, MMLU 86.4%). Introduces the system card as a safety artefact and sets the template for capability evaluation that every frontier lab now follows.

**Authors:** OpenAI
**Published:** March 2023 (arXiv 2303.08774)
**Companion:** GPT-4 System Card (published alongside)

> [Source: arxiv.org/abs/2303.08774, cdn.openai.com/papers/gpt-4.pdf, 2026-05-03]

---

## What GPT-4 Is

A large-scale, multimodal model accepting image and text inputs and producing text outputs. Architecture is not disclosed beyond "Transformer-style, pre-trained to predict the next token." Trained on publicly available data and licensed third-party data, then fine-tuned with RLHF.

The report deliberately omits model size, training compute, and architecture specifics — the first major frontier lab paper to do so explicitly, citing competitive reasons.

---

## Benchmark Performance

| Benchmark | GPT-4 | GPT-3.5 |
|---|---|---|
| Bar Exam (Uniform) | ~90th percentile | ~10th percentile |
| MMLU (5-shot) | 86.4% | 70.0% |
| HumanEval (code) | 67.0% | 48.1% |
| AMC 10 (math) | 30/150 | 10/150 |
| SAT Reading | 710/800 | 670/800 |
| GRE Verbal | 169/170 | 154/170 |
| AP Biology | 5/5 | 4/5 |

[All scores from the report; [unverified] against current model versions which have since surpassed these numbers]

The report notes that GPT-4 is still less capable than humans in many real-world scenarios — emphasising the gap between benchmark performance and practical deployment reliability.

---

## Key Technical Findings

### RLHF improves behaviour, not raw capability

> "RLHF does not improve exam performance."

The capability gains come from pretraining scale. RLHF shapes behaviour — alignment, refusals, tone — but the underlying knowledge and reasoning ability come from pretraining. This is a crucial finding that informed subsequent work on DPO ([[papers/dpo]]) and why preference optimisation methods focus on alignment rather than capability uplift.

### Predictable scaling

GPT-4 was the first model where OpenAI reported being able to *predict* final performance metrics from smaller model checkpoints before completing training — using internal scaling laws. This reduced wasted compute on training runs that underperform.

### Multimodality

GPT-4 accepts image inputs alongside text. The vision capability was not separately announced at launch — it was described in the report but not initially available in the API. Vision was released via GPT-4V in September 2023.

---

## The System Card

Published alongside the technical report, the System Card is the first major example of a frontier lab documenting model risks in a structured format before public release. It covers:

- **Evaluation for dangerous capabilities** — CBRN uplift testing, cyberoffence, persuasion
- **Red teaming** — 50+ domain experts engaged pre-launch to adversarially test the model
- **Harm reduction results** — 82% reduction in responses to requests for disallowed content vs GPT-3.5; 29% more policy-compliant responses on sensitive topics
- **Known limitations** — hallucination, context window limits, overconfidence
- **Residual risks** — acknowledged risks that were not fully mitigated at launch

The System Card format became the template that Anthropic's [[safety/constitutional-ai]] and RSP documentation ([[safety/alignment]]) and Google's model cards build on.

---

## Evaluation Methodology

The report introduces a systematic approach to capability evaluation that is now standard:

1. **Professional exams** — simulate real-world stakes (bar, LSAT, GRE, SAT, AP, medical licensing)
2. **Academic benchmarks** — MMLU, HumanEval, GSM8K, WinoGrande, HellaSwag
3. **Human red teaming** — domain experts testing specific risk areas (biosecurity, cyberoffence, disinformation)
4. **Automated red teaming** — model-generated adversarial prompts at scale
5. **Calibration** — measuring whether the model's confidence matches its accuracy

This five-part structure is now reflected in [[evals/methodology]] and in how Anthropic, Google, and Meta release model evaluations.

---

## Why This Paper Matters

The GPT-4 Technical Report did three things that shaped the field:

1. **Established the capability evaluation template** — professional exams + benchmarks + red teaming. Every major model release since follows this structure.

2. **Normalised the System Card** — publishing a structured risk assessment alongside a model became the expected practice. Without GPT-4's System Card, Anthropic's RSP and Google's model cards might not have emerged in the same form.

3. **Demonstrated architecture opacity as a competitive norm** — by omitting model size and architecture, OpenAI signalled that capability documentation does not require implementation disclosure. This is now standard practice.

---

## Limitations of the Report

- Architecture and scale not disclosed — the report cannot be reproduced or verified
- Benchmark selection is optimised for high scores — tasks where GPT-4 underperforms are not featured
- Reported eval results may not reflect actual API performance at launch (post-training safety fine-tuning may have reduced capabilities shown in evals)
- System Card risks are self-assessed — no independent verification

---

## Connections

- [[papers/rlhf]] — InstructGPT (2022): the RLHF training methodology GPT-4 builds on
- [[papers/scaling-laws]] — Chinchilla (2022): the scaling law understanding that informs GPT-4's training compute allocation
- [[papers/constitutional-ai]] — Anthropic's response to the RLHF safety approach documented here
- [[evals/methodology]] — the evaluation framework this report helped establish as industry standard
- [[evals/benchmarks]] — MMLU, HumanEval, and other benchmarks introduced or popularised by this report
- [[safety/red-teaming]] — the adversarial testing methodology formalised here
- [[llms/model-families]] — GPT-4 in the model lineage context
- [[papers/key-papers]] — reading list context

## Open Questions

- Was the predictive scaling methodology used for GPT-4 published separately, or only described in this report?
- How much did the 82% harm reduction figure change between the report's evaluation and actual API deployment?

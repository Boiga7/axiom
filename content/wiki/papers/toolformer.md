---
type: paper
category: papers
para: resource
tags: [toolformer, meta, tool-use, self-supervised, api-calling, agents, nlp]
sources: []
updated: 2026-05-03
tldr: Schick et al. (Meta, 2023) — language models can teach themselves to call external APIs by self-generating training data. The conceptual origin of tool use in LLMs before ChatGPT plugins or function calling.
---

# Toolformer: Language Models Can Teach Themselves to Use Tools

> **TL;DR** Schick et al. (Meta, 2023) — a model fine-tuned to decide which APIs to call, when to call them, what arguments to pass, and how to incorporate the results. Self-supervised: no task-specific examples needed. The paper that proved tool use could be learned, not just prompted.

**Authors:** Timo Schick, Jane Dwivedi-Yu, Roberto Dessì, Roberta Raileanu, Maria Lomeli, Luke Zettlemoyer, Nicola Cancedda, Thomas Scialom (Meta AI)
**Published:** February 2023 (arXiv 2302.04761)
**Venue:** NeurIPS 2023

> [Source: arxiv.org/abs/2302.04761, ai.meta.com/research/publications/toolformer, 2026-05-03]

---

## The Problem It Solved

Prior to Toolformer, language models could use tools if you demonstrated how in the prompt (few-shot). But this required:
- Task-specific examples for every tool
- Human annotation of when and how to call each API
- The model following a scripted template rather than deciding for itself

Toolformer showed that a model could learn to use tools *autonomously* — deciding when calling a tool is worth it and what arguments to pass — without any task-specific supervision.

---

## Core Contribution

A self-supervised approach to teaching LLMs to call APIs. The model learns to:

1. **Decide** whether a tool call is useful at a given point in the text
2. **Choose** which tool to call
3. **Construct** the correct arguments
4. **Incorporate** the result into the continuing generation

All learned from data the model generates itself — no human annotation of tool calls required.

---

## Method

### Step 1 — Sample candidate tool calls

Given an existing text corpus, use the base LLM to generate candidate API calls at positions where a tool call might be useful.

```
Input text: "The population of Germany is"
Candidate: "The population of Germany is [QA("What is Germany's population?")] ..."
```

### Step 2 — Execute and filter

Execute the candidate API calls. Keep only the ones where the API result actually improves the model's ability to predict the *following* tokens — measured by perplexity reduction.

```
Keep: [QA("What is Germany's population?")] → "83 million"
  → reduces perplexity of "83 million people" from 45 to 3.2

Discard: [Calculator("2+2")] in a text about history
  → no perplexity reduction; model didn't need it
```

### Step 3 — Fine-tune

Fine-tune the base LLM on the filtered dataset of (text + API calls + results). The model learns when tool calls are actually useful, not just when they are syntactically plausible.

---

## Tools Evaluated

| Tool | Purpose |
|---|---|
| Calculator | Arithmetic expressions |
| Wikipedia Search | Factual lookups |
| Q&A system | Open-domain question answering |
| Machine Translation | Language translation |
| Calendar | Current date lookup |

The model learned to use all five. Critically, it learned to *not* call tools when they aren't useful — a key behaviour previous approaches struggled with.

---

## Key Results

- Outperformed GPT-J (6.7B) on a range of downstream tasks using a smaller model, by virtue of tool use
- Calculator use essentially solved arithmetic tasks that the base model failed at
- Wikipedia search substantially improved factual accuracy
- The model knew when *not* to call tools — calling a calculator for creative writing tasks would hurt, and the trained model avoided this

---

## Why This Paper Matters

Toolformer appeared in February 2023 — a month before GPT-4 was released, and before OpenAI launched plugins or function calling. It established the key insight that underpins all subsequent tool use work:

**Tool use is a learnable behaviour, not just a prompting trick.**

Everything that followed — OpenAI function calling, Anthropic tool use, the [[protocols/mcp]] protocol, the [[agents/react-pattern]] loop, [[agents/langgraph]] tool nodes — builds on this foundation. The model needs to decide *whether* to call a tool, *which* tool, and *with what arguments*. Toolformer demonstrated all three could be learned from data.

---

## Limitations

- Self-supervised approach requires running inference to generate training data — expensive at scale
- Relies on a single-turn tool call format; doesn't handle multi-turn or sequential tool chains
- The model is fine-tuned rather than using a general-purpose framework — each new tool set requires new fine-tuning
- Predates the ReAct pattern ([[papers/react]]) and the Thought→Action→Observation loop that handles multi-step reasoning

---

## Connections

- [[papers/react]] — Yao et al. 2022: the Thought/Action/Observation loop that extended Toolformer's single-call idea into multi-step agent reasoning
- [[protocols/mcp]] — the standardised protocol that systematises what Toolformer proved was possible
- [[agents/react-pattern]] — the production implementation of Toolformer's core insight
- [[agents/practical-agent-design]] — tool design principles that descend from this work
- [[protocols/tool-design]] — how to design tools so models use them correctly
- [[papers/key-papers]] — reading list context

## Open Questions

- Would the Toolformer self-supervised approach work for teaching models to use MCP tools without fine-tuning, using DSPy-style optimisation instead?
- Does the perplexity-reduction filtering criterion generalise well to tools that return long or structured outputs (code, JSON) rather than short factual answers?
